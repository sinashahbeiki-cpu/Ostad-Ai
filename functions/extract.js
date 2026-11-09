// functions/extract.js
import { verifyAuth } from './_utils/auth.js';
import { callGroq } from './_utils/aiClient.js';
import { validateImages, jsonResponse } from './_utils/validate.js';

const SYSTEM_PROMPT = `You are an expert university professor writing concise, conceptual study notes from images.
1. NO INTRODUCTIONS OR CONCLUSIONS. START DIRECTLY with content.
2. Main Concept: At the very beginning, add ONE short, precise sentence explaining the core topic.
3. Extraction & Deduplication: Extract text. If multiple images contain identical content, merge and remove duplicates.
4. Conceptual Explanations: Do NOT write long paragraphs. For major formulas, add ONLY ONE short sentence explaining the concept.
5. Formatting: Use Markdown. Use standard LaTeX ($$...$$ for blocks, $...$ for inline).
6. Output Language: Persian (Farsi).
7. CRITICAL: DO NOT REPEAT ANY TEXT OR FORMULAS. If a formula appears multiple times, write it ONLY ONCE.`;

export async function onRequestPost(context) {
  try {
    // 1) احراز هویت
    const auth = await verifyAuth(context.request, context.env);
    if (!auth.user) return jsonResponse({ error: auth.error }, auth.status);

    // 2) بدنه
    const { images } = await context.request.json();

    // 3) اعتبارسنجی
    const validation = validateImages(images);
    if (!validation.ok) return jsonResponse({ error: validation.error }, validation.status);

    // 4) ساخت پیام
    const imageContents = images.map(img => ({
      type: 'image_url',
      image_url: { url: `data:${img.mimeType};base64,${img.imageBase64}` },
    }));

    // 5) فراخوانی AI
    const ai = await callGroq({
      apiKey: context.env.GROQ_API_KEY,
      model: 'qwen/qwen3.8-27b',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Extract and format these notes.' },
            ...imageContents,
          ],
        },
      ],
      temperature: 0.2,
      maxTokens: 4096,
      timeoutMs: 90000,
    });

    if (!ai.ok) return jsonResponse({ error: ai.error }, ai.status);
    return jsonResponse({ text: ai.content }, 200);
  } catch (error) {
    return jsonResponse({ error: `خطای داخلی: ${error.message}` }, 500);
  }
}