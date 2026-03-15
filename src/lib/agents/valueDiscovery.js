/**
 * Value Discovery — Dynamic extraction of valid segmentation values from cohort data.
 *
 * Sits between Schema Analyzer and LLM Strategy/Optimization:
 *
 *   Cohort API → Schema Analyzer → Value Discovery → LLM Strategy → Rule Engine
 *
 * PURPOSE: Prevent the LLM from hallucinating field names or values.
 * Instead of raw stats, this module produces a constrained "menu" of
 * segmentation options the LLM can pick from — every field name, every
 * categorical value, and every numeric bucket comes directly from the data.
 *
 * DESIGN PRINCIPLES:
 * - Nothing is hardcoded. Every value is discovered from the cohort.
 * - If the cohort changes tomorrow, the discovered values change automatically.
 * - Token-efficient: high-cardinality fields are capped, numerics are bucketized.
 * - The LLM becomes a strategist choosing from real options, not a guesser.
 */

import { analyzeSchema, detectIdField } from './schemaAnalyzer';

/** Identity-type fields excluded from segmentation */
const IDENTITY_TYPES = new Set(['id', 'name', 'email', 'phone']);

/** Top-K limit for high-cardinality categorical fields */
const HIGH_CARDINALITY_THRESHOLD = 10;
const TOP_K_VALUES = 8;

/**
 * Discover all valid segmentation values from cohort data.
 *
 * @param {Object[]} cohortData - Full cohort dataset
 * @param {Object} [schema] - Precomputed schema (optional; computed if not provided)
 * @returns {Object} Discovery result with fields, their types, valid values, and buckets
 */
export function discoverSegmentationValues(cohortData, schema = null) {
    if (!cohortData || cohortData.length === 0) {
        return { totalRecords: 0, fields: [], empty: true };
    }

    schema = schema || analyzeSchema(cohortData);
    const idField = detectIdField(schema);
    const discovery = {
        totalRecords: schema.totalRecords,
        idField,
        fields: [],
    };

    for (const [fieldName, detail] of Object.entries(schema.fieldDetails)) {
        // Skip identity fields — not segmentable
        if (IDENTITY_TYPES.has(detail.type)) continue;

        const fieldEntry = {
            name: fieldName,
            type: detail.type,       // 'numeric' | 'categorical'
            semantic: detail.semantic, // 'behavioral' | 'financial' | 'demographic' | 'general'
        };

        if (detail.type === 'categorical') {
            fieldEntry.category = discoverCategoricalValues(detail);
        } else if (detail.type === 'numeric') {
            fieldEntry.numeric = discoverNumericBuckets(detail, fieldName);
        }

        discovery.fields.push(fieldEntry);
    }

    return discovery;
}

/**
 * Discover valid values for a categorical field.
 * Low-cardinality: list all values with counts.
 * High-cardinality: list top-K with counts + summary.
 * Boolean/behavioral: list all values (always ≤3).
 */
function discoverCategoricalValues(detail) {
    const dist = detail.distribution;
    if (!dist) return { values: [], highCardinality: false };

    const allEntries = Object.entries(dist.values || {});
    const uniqueCount = dist.uniqueCount || allEntries.length;
    const highCardinality = uniqueCount > HIGH_CARDINALITY_THRESHOLD;

    // For display: cap at TOP_K for high-cardinality fields
    const displayEntries = highCardinality
        ? allEntries.slice(0, TOP_K_VALUES)
        : allEntries;

    const values = displayEntries.map(([value, count]) => ({ value, count }));
    const totalShown = values.reduce((s, v) => s + v.count, 0);
    const totalAll = allEntries.reduce((s, [, c]) => s + c, 0);

    return {
        values,
        uniqueCount,
        highCardinality,
        ...(highCardinality ? {
            otherCount: uniqueCount - TOP_K_VALUES,
            otherTotal: totalAll - totalShown,
        } : {}),
    };
}

/**
 * Discover meaningful numeric buckets for a field.
 * Uses percentiles (P25, median, P75) from the schema to create
 * data-driven buckets — no hardcoded ranges.
 *
 * For demographic numerics (age, family size): human-readable buckets.
 * For financial numerics (income, credit): quartile-based brackets.
 */
function discoverNumericBuckets(detail, fieldName) {
    const stats = detail.stats;
    if (!stats) return { buckets: [], stats: null };

    const { min, max, p25, p75, mean, median } = stats;

    let buckets;

    if (detail.semantic === 'demographic' && max <= 120) {
        // Age-like or small-range: create human-readable buckets
        buckets = createDemographicBuckets(min, max, p25, median, p75);
    } else if (detail.semantic === 'financial' || (max - min) > 1000) {
        // Income/credit-like: quartile-based brackets
        buckets = createFinancialBuckets(min, max, p25, median, p75);
    } else {
        // General numeric: simple quartile split
        buckets = createQuartileBuckets(min, max, p25, median, p75);
    }

    return {
        range: { min, max },
        mean,
        median,
        buckets,
    };
}

/**
 * Create human-readable demographic buckets (e.g., Age: 18-30, 31-45, 46-60, 61+).
 * Buckets are derived from data percentiles, not hardcoded.
 */
function createDemographicBuckets(min, max, p25, median, p75) {
    // Use percentile boundaries, rounded to nearest 5 for readability
    const round5 = (v) => Math.round(v / 5) * 5;

    const b1End = Math.max(round5(p25), min + 1);
    const b2End = Math.max(round5(median), b1End + 1);
    const b3End = Math.max(round5(p75), b2End + 1);

    const buckets = [];
    buckets.push({ label: `${min}–${b1End}`, range: [min, b1End] });
    if (b1End < b2End) {
        buckets.push({ label: `${b1End + 1}–${b2End}`, range: [b1End + 1, b2End] });
    }
    if (b2End < b3End) {
        buckets.push({ label: `${b2End + 1}–${b3End}`, range: [b2End + 1, b3End] });
    }
    if (b3End < max) {
        buckets.push({ label: `${b3End + 1}+`, range: [b3End + 1, max] });
    }

    return buckets;
}

/**
 * Create financial brackets for wide-range numerics (income, credit score).
 * Labels use "low", "mid", "high", "very high" based on quartiles.
 */
function createFinancialBuckets(min, max, p25, median, p75) {
    return [
        { label: `Low (${min}–${Math.round(p25)})`, range: [min, Math.round(p25)], tag: 'low' },
        { label: `Mid (${Math.round(p25) + 1}–${Math.round(median)})`, range: [Math.round(p25) + 1, Math.round(median)], tag: 'mid' },
        { label: `High (${Math.round(median) + 1}–${Math.round(p75)})`, range: [Math.round(median) + 1, Math.round(p75)], tag: 'high' },
        { label: `Very high (${Math.round(p75) + 1}–${max})`, range: [Math.round(p75) + 1, max], tag: 'very_high' },
    ];
}

/**
 * Fallback: simple quartile buckets for general numerics.
 */
function createQuartileBuckets(min, max, p25, median, p75) {
    return [
        { label: `${min}–${Math.round(p25)}`, range: [min, Math.round(p25)] },
        { label: `${Math.round(p25) + 1}–${Math.round(median)}`, range: [Math.round(p25) + 1, Math.round(median)] },
        { label: `${Math.round(median) + 1}–${Math.round(p75)}`, range: [Math.round(median) + 1, Math.round(p75)] },
        { label: `${Math.round(p75) + 1}–${max}`, range: [Math.round(p75) + 1, max] },
    ];
}

/**
 * Format the discovery result as a compact, constraining prompt for the LLM.
 *
 * The output looks like:
 *
 *   Dataset: 1000 customers
 *
 *   SEGMENTABLE FIELDS (use ONLY these exact field names and values):
 *
 *   "Age" [demographic, numeric]
 *     Buckets: 18–25, 26–40, 41–60, 61+
 *     Range: 18–75, mean=42, median=39
 *
 *   "Gender" [demographic, categorical]
 *     Values: Female (680), Male (320)
 *
 *   "City" [demographic, categorical, 20 unique — showing top 8]
 *     Values: Hyderabad (62), Jaipur (61), ...
 *
 *   BEHAVIORAL SIGNALS (Y/N flags — high engagement priority):
 *     "App_Installed": Y (498), N (502)
 *     "Social_Media_Active": Y (606), N (394)
 *
 * The LLM CANNOT invent values that aren't listed.
 */
export function formatDiscoveryForLLM(discovery) {
    if (discovery.empty) return 'No data available.';

    const lines = [`Dataset: ${discovery.totalRecords} customers\n`];
    lines.push('SEGMENTABLE FIELDS (use ONLY these exact field names and values in your rules):\n');

    const behavioralFields = [];
    const segmentableFields = [];

    for (const field of discovery.fields) {
        if (field.semantic === 'behavioral') {
            behavioralFields.push(field);
        } else {
            segmentableFields.push(field);
        }
    }

    // Non-behavioral fields first
    for (const field of segmentableFields) {
        lines.push(formatFieldForLLM(field));
    }

    // Behavioral signals get a special section (high priority)
    if (behavioralFields.length > 0) {
        lines.push('\n⚡ BEHAVIORAL SIGNALS (Y/N flags — combine these with demographics for highest engagement):');
        for (const field of behavioralFields) {
            const vals = field.category?.values || [];
            const distStr = vals.map(v => `${v.value} (${v.count})`).join(', ');
            lines.push(`  "${field.name}": ${distStr}`);
        }
    }

    lines.push('\nRULES CONSTRAINT:');
    lines.push('• Use ONLY field names listed above (copy-paste exactly, including spaces)');
    lines.push('• For categorical: use ONLY values shown above');
    lines.push('• For numeric: use "between" with bucket ranges shown, or "gte"/"lte" with boundary values');
    lines.push('• "values" MUST be a JSON array: ["Female"], [18, 30], ["Mumbai", "Pune"]');

    return lines.join('\n');
}

/**
 * Format a single field's discovery for the LLM prompt.
 */
function formatFieldForLLM(field) {
    const sem = field.semantic ? `, ${field.semantic}` : '';

    if (field.type === 'numeric' && field.numeric) {
        const n = field.numeric;
        const bucketStr = n.buckets.map(b => b.label).join(' | ');
        return `  "${field.name}" [numeric${sem}]\n` +
            `    Buckets: ${bucketStr}\n` +
            `    Range: ${n.range.min}–${n.range.max}, mean=${n.mean}, median=${n.median}`;
    }

    if (field.type === 'categorical' && field.category) {
        const c = field.category;
        const valStr = c.values.map(v => `${v.value} (${v.count})`).join(', ');
        const cardNote = c.highCardinality
            ? ` [${c.uniqueCount} unique — showing top ${TOP_K_VALUES}]`
            : '';
        let line = `  "${field.name}" [categorical${sem}${cardNote}]\n    Values: ${valStr}`;
        if (c.highCardinality && c.otherCount > 0) {
            line += `\n    + ${c.otherCount} other values (${c.otherTotal} records)`;
        }
        return line;
    }

    return `  "${field.name}" [${field.type}${sem}]`;
}
