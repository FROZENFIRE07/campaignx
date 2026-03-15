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
 * @param {Object} [cohortSummary] - Lightweight summary info (e.g., topCities, avgs, personalization support)
 */
export async function contentAgent(brief, strategy, cohortSummary = null) {
    const segments = strategy.segments || [];
    const variants = [];

    for (const segment of segments) {

        const localCity = cohortSummary?.topCities?.[0] || 'Maharashtra';
        const supportsPersonalization = cohortSummary?.supportsPersonalization ?? false;
        const nameHint = supportsPersonalization
            ? `- PERSONALIZATION: The cohort has a Full_name field. Start every subject with the first name token {{First_Name}} (our system replaces it at send time). Example: "{{First_Name}}, Earn 1.25% More Returns 💰". This alone adds 8-12% open lift.`
            : `- No name field detected — do NOT add name placeholders.`;

        const systemPrompt = `You are an expert Indian BFSI email copywriter for SuperBFSI's XDeposit term deposit product. Your ONLY goal is to maximize open rate (target: 35%+) and click rate (target: 12%+).

HARD RULES — violating any rule is a FAILURE:
1. SUBJECT LINE: 35-55 characters ONLY. Must contain "1.25%". Max 1 emoji (end of subject only). NO spam trigger words.
${nameHint}
2. BODY: Maximum 200 words. Mobile-first. Must bold **1.25% higher returns**. Must include: "👉 Explore XDeposit: https://superbfsi.com/xdeposit/explore/". Must end with: "Reply for personalized advice — our team responds within 2 hours."
3. EXACTLY 3 VARIANTS (A, B, C):
   - Variant A: Direct benefit + 1.25% + credibility (use name if available)
   - Variant B: Urgency + local city angle ("${localCity}") + limited time feel
   - Variant C: Question format + emoji in subject + emotional hook in body
4. TONE matching: warm/secure for seniors (60+), professional/ROI for high-income, aspirational for young (18-35)
5. Every variant MUST feel written specifically for THIS segment

Output only valid JSON.`;

        const userPrompt = `Campaign Brief: "${brief}"

Target Segment: "${segment.name}" — ${segment.description}
Recommended Tone: ${segment.recommendedTone || 'professional'}
Segment Size: ${segment.count || segment.customerIds?.length || 0} customers
Top City for Local Angle: ${localCity}
Name Personalization Available: ${supportsPersonalization}

Cohort Summary:
${JSON.stringify(cohortSummary, null, 2)}

Create EXACTLY 3 variants (A, B, C). Subject: 35-55 chars with 1.25%${supportsPersonalization ? ' + {{First_Name}} prefix' : ''}. Body: <200 words.

{
  "variants": [
    {
      "variantName": "A",
      "subject": "${supportsPersonalization ? '{{First_Name}}, ' : ''}subject with 1.25% benefit (35-55 chars total)",
      "body": "benefit-led body <200 words, bold 1.25%, CTA, Reply sign-off",
      "tone": "described tone",
      "reasoning": "why Variant A works"
    },
    {
      "variantName": "B",
      "subject": "urgency + ${localCity} angle subject (35-55 chars)",
      "body": "urgency + ${localCity} local body <200 words",
      "tone": "urgent",
      "reasoning": "why Variant B works"
    },
    {
      "variantName": "C",
      "subject": "question format subject with emoji (35-55 chars)",
      "body": "question hook body <200 words with emotional angle",
      "tone": "conversational",
      "reasoning": "why Variant C works"
    }
  ]
}`;

        try {
            const result = await callLLM(systemPrompt, userPrompt, { jsonMode: true, temperature: 0.7 });
            const emailVariants = result.variants || [result];
            const numVariants = Math.max(1, emailVariants.length);
            const ids = segment.customerIds || [];
            const chunkSize = Math.ceil(ids.length / numVariants);

            for (let i = 0; i < numVariants; i++) {
                const v = emailVariants[i];
                if (!v) continue;
                // Trim subject to 55 chars if over limit
                let subject = (v.subject || 'SuperBFSI XDeposit — Earn 1.25% More 💰').substring(0, 55);
                const chunkIds = ids.slice(i * chunkSize, (i + 1) * chunkSize);

                variants.push({
                    subject,
                    body: v.body || '',
                    targetSegment: segment.name,
                    segmentDescription: segment.description,
                    tone: v.tone || segment.recommendedTone,
                    sendTime: segment.recommendedSendTime || '11:00',
                    customerIds: chunkIds,
                    variantName: v.variantName || `Variant-${String.fromCharCode(65 + i)}`,
                    reasoning: v.reasoning || '',
                });
            }
        } catch (err) {
            console.error(`Content generation failed for segment ${segment.name}:`, err);
            // Fallback content
            variants.push({
                subject: 'Earn 1.25% More with XDeposit Today 💰',
                body: `Dear Valued Customer,\n\nWe are excited to offer you **1.25% higher returns** on your savings with SuperBFSI's XDeposit term deposit — the smarter choice for Indian savers.\n\n💡 Why XDeposit?\n- 1.25% above market rates\n- Flexible tenure options\n- Trusted by 50,000+ customers\n\n👉 Explore XDeposit: https://superbfsi.com/xdeposit/explore/\n\nReply for personalized advice — our team responds within 2 hours.\n\nBest regards,\nSuperBFSI Team`,
                targetSegment: segment.name,
                customerIds: segment.customerIds || [],
                variantName: 'A',
                tone: 'professional',
                sendTime: segment.recommendedSendTime || '11:00',
                reasoning: 'Fallback content due to generation error',
            });
        }
    }

    return variants;
}
