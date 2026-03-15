/**
 * Schema Analyzer — Dynamically inspects any dataset and extracts ONLY metadata.
 * 
 * Raw customer data NEVER leaves this module. The LLM only sees:
 * - Field names and detected types
 * - Numeric fields: min, max, mean, median, stddev, percentiles
 * - Categorical fields: value distribution (label → count)
 * - ID/email fields: count only (no values)
 * 
 * This makes the system fully adaptive to any cohort schema changes,
 * token-efficient, and privacy-respecting.
 */

/**
 * Detect the type of a field from its values.
 * Returns: 'id' | 'name' | 'email' | 'phone' | 'numeric' | 'categorical'
 * 
 * Identity types ('id', 'name', 'email', 'phone') are excluded from
 * segmentation logic — they are contact/identifier fields.
 */
function detectFieldType(fieldName, values) {
    const nameLower = fieldName.toLowerCase();

    // ID fields — any field ending in _id, or exactly 'id'
    if (/(_id|^id)$/i.test(fieldName)) return 'id';
    if (nameLower === 'id' || nameLower === '_id') return 'id';
    // Also detect if all values look like structured IDs (e.g. CUST001, USR_123)
    const idSample = values.slice(0, 30).filter(Boolean);
    if (idSample.length > 0 && idSample.every(v => /^[A-Z]{2,}[_-]?\d+$/i.test(String(v)))) {
        return 'id';
    }

    // Name fields — Full_name, first_name, last_name, name, etc.
    if (/^(full_?name|first_?name|last_?name|name|display_?name|username)$/i.test(fieldName)) return 'name';

    // Email fields — by name or by content pattern
    if (/email/i.test(fieldName)) return 'email';
    const emailSample = values.slice(0, 20).filter(Boolean);
    if (emailSample.length > 0 && emailSample.every(v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v)))) {
        return 'email';
    }

    // Phone fields
    if (/phone|mobile|tel/i.test(fieldName)) return 'phone';

    // Numeric: if most non-empty values parse as numbers
    const nonEmpty = values.filter(v => v !== null && v !== undefined && v !== '');
    if (nonEmpty.length === 0) return 'categorical';
    const numericCount = nonEmpty.filter(v => !isNaN(Number(v))).length;
    if (numericCount / nonEmpty.length > 0.8) return 'numeric';

    return 'categorical';
}

/** Identity-type fields — should never be used in segmentation logic */
const IDENTITY_TYPES = new Set(['id', 'name', 'email', 'phone']);

/**
 * Compute numeric statistics for a field.
 */
function numericStats(values) {
    const nums = values
        .map(v => Number(v))
        .filter(n => !isNaN(n))
        .sort((a, b) => a - b);

    if (nums.length === 0) return null;

    const sum = nums.reduce((a, b) => a + b, 0);
    const mean = sum / nums.length;
    const median = nums.length % 2 === 0
        ? (nums[nums.length / 2 - 1] + nums[nums.length / 2]) / 2
        : nums[Math.floor(nums.length / 2)];

    const variance = nums.reduce((acc, n) => acc + (n - mean) ** 2, 0) / nums.length;
    const stddev = Math.sqrt(variance);

    const percentile = (p) => {
        const idx = Math.ceil((p / 100) * nums.length) - 1;
        return nums[Math.max(0, idx)];
    };

    return {
        min: nums[0],
        max: nums[nums.length - 1],
        mean: Math.round(mean * 100) / 100,
        median,
        stddev: Math.round(stddev * 100) / 100,
        p25: percentile(25),
        p75: percentile(75),
        count: nums.length,
    };
}

/**
 * Compute value distribution for a categorical field.
 */
function categoricalDistribution(values) {
    const counts = {};
    for (const v of values) {
        const key = String(v ?? '').trim();
        if (key === '') continue;
        counts[key] = (counts[key] || 0) + 1;
    }

    // Sort by count descending
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const uniqueCount = sorted.length;

    // If too many unique values, show top 20 + summary
    if (uniqueCount <= 30) {
        return { values: Object.fromEntries(sorted), uniqueCount };
    }

    return {
        values: Object.fromEntries(sorted.slice(0, 20)),
        uniqueCount,
        note: `Showing top 20 of ${uniqueCount} unique values`,
    };
}

/**
 * Analyze a dataset and return ONLY schema-level metadata.
 * 
 * @param {Object[]} data - The raw dataset (array of records)
 * @returns {Object} Schema metadata suitable for LLM consumption
 */
export function analyzeSchema(data) {
    if (!data || data.length === 0) {
        return { totalRecords: 0, fields: [], fieldDetails: {}, empty: true };
    }

    const fieldNames = Object.keys(data[0]);
    const fieldDetails = {};

    for (const field of fieldNames) {
        const values = data.map(r => r[field]);
        const type = detectFieldType(field, values);
        const nonNullCount = values.filter(v => v !== null && v !== undefined && v !== '').length;

        const detail = {
            type,
            nonNullCount,
            nullCount: data.length - nonNullCount,
        };

        if (type === 'numeric') {
            detail.stats = numericStats(values);
        } else if (type === 'categorical') {
            detail.distribution = categoricalDistribution(values);
        } else if (IDENTITY_TYPES.has(type)) {
            detail.uniqueCount = new Set(values.filter(Boolean)).size;
        }

        fieldDetails[field] = detail;
    }

    return {
        totalRecords: data.length,
        fields: fieldNames,
        fieldDetails,
    };
}

/**
 * Format schema metadata as a concise text block for LLM prompts.
 * Keeps it human-readable and compact.
 */
export function formatSchemaForLLM(schema) {
    if (schema.empty) return 'No data available.';

    const lines = [`Dataset: ${schema.totalRecords} records, ${schema.fields.length} fields\n`];

    for (const [field, detail] of Object.entries(schema.fieldDetails)) {
        if (IDENTITY_TYPES.has(detail.type)) {
            lines.push(`• ${field} [${detail.type}, identifier]: ${detail.uniqueCount} unique values (excluded from segmentation)`);
            continue;
        }

        if (detail.type === 'numeric') {
            const s = detail.stats;
            lines.push(`• ${field} [numeric]: range ${s.min}–${s.max}, mean=${s.mean}, median=${s.median}, stddev=${s.stddev}, P25=${s.p25}, P75=${s.p75}`);
            continue;
        }

        // Categorical
        const dist = detail.distribution;
        const valEntries = Object.entries(dist.values || {});
        const distStr = valEntries.map(([k, v]) => `${k}(${v})`).join(', ');
        lines.push(`• ${field} [categorical, ${dist.uniqueCount} unique]: ${distStr}`);
        if (dist.note) lines.push(`  (${dist.note})`);
    }

    return lines.join('\n');
}

/**
 * Detect the primary ID field from a schema.
 * Used by all modules that need to reference customer IDs.
 * @param {Object} schema - Schema from analyzeSchema()
 * @returns {string} The field name used as the primary identifier
 */
export function detectIdField(schema) {
    // Prefer a field with 'id' type whose name contains 'customer'
    for (const [field, detail] of Object.entries(schema.fieldDetails || {})) {
        if (detail.type === 'id' && /customer/i.test(field)) return field;
    }
    // Next: any 'id' type field
    for (const [field, detail] of Object.entries(schema.fieldDetails || {})) {
        if (detail.type === 'id') return field;
    }
    // Fallback: first field
    return schema.fields?.[0] || 'id';
}

/**
 * Check if a field is an identity/contact field (should be excluded from segmentation).
 */
export function isIdentityField(fieldDetail) {
    return IDENTITY_TYPES.has(fieldDetail?.type);
}
