/**
 * Rule Engine — Executes LLM-generated segmentation rules on stored cohort data LOCALLY.
 * 
 * The LLM never sees raw customer data. Instead it outputs structured rules like:
 *   { field: "Age", operator: "between", values: [25, 40] }
 * 
 * This engine evaluates those rules against the actual data and returns customer IDs.
 * 
 * Supported operators:
 *   equals, not_equals, in, not_in,
 *   between, not_between, gt, gte, lt, lte,
 *   contains, not_contains
 * 
 * Rules within a segment are combined with AND logic.
 * Segments are made mutually exclusive in execution order to avoid duplicate sends.
 */

import { detectIdField, analyzeSchema } from './schemaAnalyzer';

/**
 * Build a map from normalized (lowercased, no separators) field names to
 * actual cohort field names. This allows the rule engine to tolerate LLM
 * output that uses slightly different casing or separators than the real
 * cohort fields (e.g. "Monthly_Income" vs "monthly_income" vs "Income").
 *
 * Returns a function: resolveField(llmFieldName) → actualFieldName | null
 */
function buildFieldResolver(cohortFields) {
    // Exact lookup (fastest path)
    const exactSet = new Set(cohortFields);

    // Normalized lookup: strip underscores/spaces/hyphens and lowercase
    const normalize = (name) => name.toLowerCase().replace(/[_\-\s]+/g, '');
    const normalizedMap = new Map(); // normalized → actual
    for (const f of cohortFields) {
        normalizedMap.set(normalize(f), f);
    }

    // Substring containment cache: for LLM shortening like "Income" → "Monthly_Income"
    const lowerFields = cohortFields.map(f => ({ lower: f.toLowerCase(), actual: f }));

    return function resolveField(llmField) {
        // 1. Exact match
        if (exactSet.has(llmField)) return llmField;

        // 2. Normalized match (case + separator insensitive)
        const norm = normalize(llmField);
        if (normalizedMap.has(norm)) return normalizedMap.get(norm);

        // 3. Case-insensitive exact match
        const lower = llmField.toLowerCase();
        const ciMatch = lowerFields.find(f => f.lower === lower);
        if (ciMatch) return ciMatch.actual;

        // 4. Substring containment: LLM used a shorter name that is contained
        //    in (or contains) an actual field name
        //    e.g. "Income" matches "Monthly_Income", "CreditScore" matches "Credit_score"
        const substringMatch = lowerFields.find(f =>
            f.lower.includes(norm) || norm.includes(normalize(f.actual))
        );
        if (substringMatch) return substringMatch.actual;

        // No match found
        return null;
    };
}

/**
 * Evaluate a single rule against a customer record.
 * @param {Object} record - A customer object
 * @param {Object} rule - { field, operator, values }
 * @returns {boolean}
 */
function evaluateRule(record, rule) {
    const { field, operator, values } = rule;
    const rawVal = record[field];
    if (rawVal === undefined || rawVal === null) return false;

    const numVal = Number(rawVal);
    const strVal = String(rawVal).toLowerCase().trim();

    switch (operator) {
        case 'equals':
        case 'eq':
            return strVal === String(values[0]).toLowerCase().trim();

        case 'not_equals':
        case 'neq':
            return strVal !== String(values[0]).toLowerCase().trim();

        case 'in':
            return values.map(v => String(v).toLowerCase().trim()).includes(strVal);

        case 'not_in':
            return !values.map(v => String(v).toLowerCase().trim()).includes(strVal);

        case 'between':
            if (isNaN(numVal) || values.length < 2) return false;
            return numVal >= Number(values[0]) && numVal <= Number(values[1]);

        case 'not_between':
            if (isNaN(numVal) || values.length < 2) return false;
            return numVal < Number(values[0]) || numVal > Number(values[1]);

        case 'gt':
            return !isNaN(numVal) && numVal > Number(values[0]);

        case 'gte':
            return !isNaN(numVal) && numVal >= Number(values[0]);

        case 'lt':
            return !isNaN(numVal) && numVal < Number(values[0]);

        case 'lte':
            return !isNaN(numVal) && numVal <= Number(values[0]);

        case 'contains':
            return strVal.includes(String(values[0]).toLowerCase().trim());

        case 'not_contains':
            return !strVal.includes(String(values[0]).toLowerCase().trim());

        default:
            // Fallback: try string equality
            console.warn(`[RULE-ENGINE] Unknown operator "${operator}", falling back to equals`);
            return strVal === String(values[0]).toLowerCase().trim();
    }
}

/**
 * Normalize rules from LLM output. The LLM may use different formats:
 * - { field, operator, values: [...] }
 * - { field, operator, value: "x" }  (single value)
 * - { field: "Age", op: "between", values: [18, 30] }  (short form)
 * - { "Age": "18-30" }  (legacy compact form)
 */
function normalizeRule(rule) {
    // Already normalized
    if (rule.field && (rule.operator || rule.op) && (rule.values || rule.value !== undefined)) {
        let values = rule.values ?? [rule.value];

        // LLMs (especially smaller models) may output values as a non-array:
        //   "values": "Female"  or  "values": 750  or  "values": "41-65"
        // Ensure values is always an array.
        if (!Array.isArray(values)) {
            const valStr = String(values);
            const op = rule.operator || rule.op;

            // "41-65" string for a between operator → parse into [41, 65]
            if ((op === 'between' || op === 'not_between') && /^\d+\s*[-–]\s*\d+$/.test(valStr)) {
                const parts = valStr.split(/[-–]/).map(s => Number(s.trim()));
                values = parts;
            } else {
                values = [values];
            }
        }

        return {
            field: rule.field,
            operator: rule.operator || rule.op,
            values,
        };
    }

    // Legacy compact form: { "Age": "18-30", "Gender": "Male" }
    // Convert each key-value pair into a rule
    const rules = [];
    for (const [field, value] of Object.entries(rule)) {
        if (['field', 'operator', 'op', 'values', 'value'].includes(field)) continue;

        const valStr = String(value);

        // Detect range: "18-30", "18–30"
        const rangeMatch = valStr.match(/^(\d+)\s*[-–]\s*(\d+)$/);
        if (rangeMatch) {
            rules.push({ field, operator: 'between', values: [Number(rangeMatch[1]), Number(rangeMatch[2])] });
            continue;
        }

        // Detect comparison: ">50", ">=60", "<25", "<=30"
        const cmpMatch = valStr.match(/^([<>]=?)\s*(\d+)$/);
        if (cmpMatch) {
            const opMap = { '>': 'gt', '>=': 'gte', '<': 'lt', '<=': 'lte' };
            rules.push({ field, operator: opMap[cmpMatch[1]], values: [Number(cmpMatch[2])] });
            continue;
        }

        // Detect multi-value: "Male|Female" or "Delhi, Mumbai"
        if (valStr.includes('|') || (valStr.includes(',') && !valStr.match(/^\d/))) {
            const options = valStr.split(/[|,]/).map(s => s.trim());
            rules.push({ field, operator: 'in', values: options });
            continue;
        }

        // Default: equals
        rules.push({ field, operator: 'equals', values: [value] });
    }

    return rules.length === 1 ? rules[0] : rules;
}

/**
 * Execute segmentation rules on the full cohort dataset.
 * 
 * @param {Object[]} segments - Array of segment definitions from the LLM, each with:
 *   { name, description, rules: [...], recommendedTone, recommendedSendTime, priority }
 * @param {Object[]} cohortData - Full cohort dataset
 * @param {string} idField - The field name used as customer ID (auto-detected if not provided)
 * @returns {Object[]} Segments with customerIds populated
 */
export function executeSegmentationRules(segments, cohortData, idField = null) {
    if (!cohortData || cohortData.length === 0) return segments;

    // Auto-detect the ID field from schema if not provided
    if (!idField) {
        const schema = analyzeSchema(cohortData);
        idField = detectIdField(schema);
    }

    // Build a field resolver from actual cohort field names so that LLM-generated
    // rule field names that differ in casing/separators/abbreviation still match.
    const cohortFields = cohortData[0] ? Object.keys(cohortData[0]) : [];
    const resolveField = buildFieldResolver(cohortFields);

    const assignedIds = new Set();

    for (const segment of segments) {
        // Normalize rules from various LLM output formats
        let rules = segment.rules || segment.criteria || [];

        // If rules is an object (legacy criteria format), convert it
        if (!Array.isArray(rules)) {
            const normalized = normalizeRule(rules);
            rules = Array.isArray(normalized) ? normalized : [normalized];
        } else {
            rules = rules.flatMap(r => {
                const normalized = normalizeRule(r);
                return Array.isArray(normalized) ? normalized : [normalized];
            });
        }

        // Resolve LLM field names to actual cohort field names
        let unresolvedFields = [];
        rules = rules.map(rule => {
            const resolved = resolveField(rule.field);
            if (resolved && resolved !== rule.field) {
                console.log(`[RULE-ENGINE] Field resolved: "${rule.field}" → "${resolved}"`);
                return { ...rule, field: resolved };
            }
            if (!resolved) {
                unresolvedFields.push(rule.field);
            }
            return rule;
        });

        if (unresolvedFields.length > 0) {
            console.warn(`[RULE-ENGINE] Segment "${segment.name}": unresolved fields: ${unresolvedFields.join(', ')} (available: ${cohortFields.join(', ')})`);
        }

        // Drop rules with unresolvable fields so the segment isn't emptied by a
        // single bad field name — remaining rules can still match customers.
        const validRules = rules.filter(rule => {
            const exists = resolveField(rule.field) !== null;
            if (!exists) {
                console.warn(`[RULE-ENGINE] Dropping unresolvable rule for field "${rule.field}" in segment "${segment.name}"`);
            }
            return exists;
        });

        // Log the actual rules being evaluated for debugging
        for (const rule of validRules) {
            const sampleVal = cohortData[0]?.[rule.field];
            console.log(`[RULE-ENGINE]   Rule: ${rule.field} ${rule.operator} ${JSON.stringify(rule.values)} (sample data: ${JSON.stringify(sampleVal)})`);
        }

        // Filter cohort by ALL valid rules (AND logic), excluding IDs already assigned
        // to previous segments so each customer is targeted once.
        const matched = cohortData.filter(record => {
            const recordId = record[idField];
            if (assignedIds.has(recordId)) return false;
            if (validRules.length === 0) return false; // Don't match everyone if all rules were dropped
            return validRules.every(rule => evaluateRule(record, rule));
        });

        segment.customerIds = matched.map(r => r[idField]);
        segment.customerIds.forEach(id => assignedIds.add(id));
        segment.count = segment.customerIds.length;

        console.log(`[RULE-ENGINE] Segment "${segment.name}": ${rules.length} rules (${validRules.length} valid) → ${segment.count} matches`);
    }

    // Distribute unassigned customers — capped at 10% of total cohort to avoid diluting targeting
    const unassigned = cohortData
        .filter(r => !assignedIds.has(r[idField]))
        .map(r => r[idField]);

    if (unassigned.length > 0 && segments.length > 0) {
        const maxDistributable = Math.floor(cohortData.length * 0.10); // hard cap: 10%
        const toDistribute = unassigned.slice(0, maxDistributable);
        const skipped = unassigned.length - toDistribute.length;

        if (skipped > 0) {
            console.log(`[RULE-ENGINE] ${unassigned.length} unassigned — distributing only ${toDistribute.length} (10% cap). Skipping ${skipped} to preserve targeting quality.`);
        } else {
            console.log(`[RULE-ENGINE] ${unassigned.length} unassigned customers — distributing proportionally (within 10% cap)`);
        }

        const totalAssigned = segments.reduce((sum, s) => sum + (s.customerIds?.length || 0), 0);
        let distributed = 0;
        segments.forEach((seg, i) => {
            const proportion = totalAssigned > 0
                ? (seg.customerIds.length / totalAssigned)
                : (1 / segments.length);
            const share = i === segments.length - 1
                ? toDistribute.length - distributed
                : Math.round(proportion * toDistribute.length);

            const chunk = toDistribute.slice(distributed, distributed + share);
            seg.customerIds = [...seg.customerIds, ...chunk];
            seg.count = seg.customerIds.length;
            distributed += share;
        });
    }

    return segments;
}

/**
 * Build a demographic profile for a segment (for content agent).
 * Returns summary stats about the customers in a segment WITHOUT raw data.
 */
export function buildSegmentProfile(segment, cohortData, schema) {
    const idField = detectIdField(schema);
    const segmentIds = new Set(segment.customerIds || []);
    const segmentRecords = cohortData.filter(r => segmentIds.has(r[idField]));

    if (segmentRecords.length === 0) {
        return { count: 0, demographics: {} };
    }

    const profile = {
        count: segmentRecords.length,
        demographics: {},
    };

    for (const [field, detail] of Object.entries(schema.fieldDetails)) {
        if (detail.type === 'id' || detail.type === 'email') continue;

        const vals = segmentRecords.map(r => r[field]).filter(v => v !== null && v !== undefined && v !== '');

        if (detail.type === 'numeric') {
            const nums = vals.map(Number).filter(n => !isNaN(n)).sort((a, b) => a - b);
            if (nums.length > 0) {
                const sum = nums.reduce((a, b) => a + b, 0);
                profile.demographics[field] = {
                    min: nums[0],
                    max: nums[nums.length - 1],
                    mean: Math.round((sum / nums.length) * 100) / 100,
                };
            }
        } else {
            // Categorical: top values
            const counts = {};
            vals.forEach(v => { counts[String(v)] = (counts[String(v)] || 0) + 1; });
            const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
            profile.demographics[field] = Object.fromEntries(top);
        }
    }

    return profile;
}
