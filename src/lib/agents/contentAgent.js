/**
 * Content Agent — Generates email content variations with AI.
 * 
 * DESIGN: Receives segment metadata (name, description, count, demographic profile)
 * but NEVER raw customer data. Content is tailored based on segment characteristics.
 */

import { callLLM } from './llmService';

/**
 * @param {string} brief - Campaign brief
 * @param {Object} strategy - Strategy with segments (from strategyAgent)
 * @param {Object[]} [segmentProfiles] - Demographic profiles per segment (from ruleEngine.buildSegmentProfile)
 */
export async function contentAgent(brief, strategy, segmentProfiles = []) {
    const segments = strategy.segments || [];
    const variants = [];

    // Build a lookup of segment profiles by name
    const profileMap = {};
    if (Array.isArray(segmentProfiles)) {
        segmentProfiles.forEach((p, i) => {
            const segName = segments[i]?.name;
            if (segName) profileMap[segName] = p;
        });
    }

    for (const segment of segments) {
        const profile = profileMap[segment.name] || null;
        const profileText = profile
            ? `\nSegment Demographics:\n${JSON.stringify(profile.demographics, null, 2)}`
            : '';

        const systemPrompt = `You are an expert email marketing copywriter for SuperBFSI, an Indian BFSI service provider. You create high-converting email campaigns.

RULES:
- Email body can contain: text in English, emojis, and the URL https://superbfsi.com/xdeposit/explore/
- Email subject can contain: text in English only
- Subject max 200 chars, body max 5000 chars
- You decide: font formatting (bold/italic/underline using **bold**, *italic*, __underline__), emoji placement, URL placement
- Match the tone to the target segment
- Always include a clear call to action

Respond in valid JSON format.`;

        const userPrompt = `Campaign Brief: "${brief}"

Target Segment: "${segment.name}" - ${segment.description}
Recommended Tone: ${segment.recommendedTone || 'professional'}
Segment Size: ${segment.count || segment.customerIds?.length || 0} customers${profileText}

Create 2 email variants for A/B testing:
{
  "variants": [
    {
      "variantName": "A",
      "subject": "email subject line",
      "body": "full email body with formatting, emojis where appropriate, and CTA URL",
      "tone": "described tone",
      "reasoning": "why this variant works for this segment"
    },
    {
      "variantName": "B",
      "subject": "different subject line",
      "body": "different body with different approach",
      "tone": "described tone",
      "reasoning": "why this variant is different and what it tests"
    }
  ]
}`;

        try {
            const result = await callLLM(systemPrompt, userPrompt, { jsonMode: true, temperature: 0.8 });
            const emailVariants = result.variants || [result];

            for (const v of emailVariants) {
                // Split customer IDs for A/B test
                const ids = segment.customerIds || [];
                const midpoint = Math.ceil(ids.length / 2);
                const isA = v.variantName === 'A';

                variants.push({
                    subject: v.subject || 'SuperBFSI - Exclusive Offer',
                    body: v.body || '',
                    targetSegment: segment.name,
                    segmentDescription: segment.description,
                    tone: v.tone || segment.recommendedTone,
                    sendTime: segment.recommendedSendTime || '10:00',
                    customerIds: isA ? ids.slice(0, midpoint) : ids.slice(midpoint),
                    variantName: v.variantName || 'A',
                    reasoning: v.reasoning || '',
                });
            }
        } catch (err) {
            console.error(`Content generation failed for segment ${segment.name}:`, err);
            // Fallback content
            variants.push({
                subject: 'SuperBFSI XDeposit - Higher Returns Await! 🏦',
                body: `Dear Valued Customer,\n\nWe are thrilled to introduce **XDeposit** — SuperBFSI's flagship term deposit product offering **1 percentage point higher returns** than competitors! 🎉\n\nDon't miss this opportunity to grow your savings.\n\n👉 Learn more: https://superbfsi.com/xdeposit/explore/\n\nBest regards,\nSuperBFSI Team`,
                targetSegment: segment.name,
                customerIds: segment.customerIds || [],
                variantName: 'A',
                tone: 'professional',
                sendTime: '10:00',
                reasoning: 'Fallback content due to generation error',
            });
        }
    }

    return variants;
}
