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
 *   between, gt, gte, lt, lte,
 *   contains, not_contains
 * 
 * Rules within a segment are combined with AND logic.
 * Multiple segments can overlap; unassigned customers are distributed proportionally.
 */

import { detectIdField, analyzeSchema } from './schemaAnalyzer';

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
        return {
            field: rule.field,
            operator: rule.operator || rule.op,
            values: rule.values || [rule.value],
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

        // Filter cohort by ALL rules (AND logic)
        const matched = cohortData.filter(record => {
            return rules.every(rule => evaluateRule(record, rule));
        });

        segment.customerIds = matched.map(r => r[idField]);
        segment.customerIds.forEach(id => assignedIds.add(id));
        segment.count = segment.customerIds.length;

        console.log(`[RULE-ENGINE] Segment "${segment.name}": ${rules.length} rules → ${segment.count} matches`);
    }

    // Distribute unassigned customers proportionally across segments
    const unassigned = cohortData
        .filter(r => !assignedIds.has(r[idField]))
        .map(r => r[idField]);

    if (unassigned.length > 0 && segments.length > 0) {
        console.log(`[RULE-ENGINE] ${unassigned.length} unassigned customers — distributing proportionally`);
        const totalAssigned = segments.reduce((sum, s) => sum + (s.customerIds?.length || 0), 0);

        let distributed = 0;
        segments.forEach((seg, i) => {
            // Proportional share based on existing segment size, with minimum 1 per segment
            const proportion = totalAssigned > 0
                ? (seg.customerIds.length / totalAssigned)
                : (1 / segments.length);
            const share = i === segments.length - 1
                ? unassigned.length - distributed  // Last segment gets remainder
                : Math.round(proportion * unassigned.length);

            const chunk = unassigned.slice(distributed, distributed + share);
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
