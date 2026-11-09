// functions/gradeSolution.js
import { verifyAuth } from './_utils/auth.js';
import { callGroq } from './_utils/aiClient.js';
import { validateImage, jsonResponse } from './_utils/validate.js';

const SYSTEM_PROMPT = `You are an expert university professor grading a student's handwritten solution.
You will be given: the problem statement, the correct solution steps, and an image of the student's handwritten solution.
Return ONLY valid JSON with this shape: { "feedback": "..." }
The feedback must be detailed, encouraging, and in Persian (Farsi). Include:
1) What the student did correctly.
2) Errors, mistakes, or missing steps.
3) The correct final answer.
Use LaTeX enclosed in $...$ for math (e.g., $\\frac{1}{2}$). Do not include anything outside the JSON.`;

export async function onRequestPost(context) {
  try {
    // 1) احراز هویت
    const auth = await verifyAuth(context.request, context.env);
    if (!auth.user) return jsonResponse({ error: auth.error }, auth.status);

    // 2) بدنه
    const { imageBase64, mimeType, problemText, correctSolution } = await context.request.json();

    // 3) اعتبارسنجی
    const imgVal = validateImage(imageBase64, mimeType);
    if (!imgVal.ok) return jsonResponse({ error: imgVal.error }, imgVal.status);

    if (typeof problemText !== 'string' || problemText.trim().length === 0) {
      return jsonResponse({ error: 'متن مسئله ارسال نشد' }, 400);
    }

    // 4) پیام کاربر
    const userContent = [
      {
        type: 'text',
        text: `Problem:\n${problemText}\n\nCorrect solution steps:\n${correctSolution || '(not provided)'}\n\nThe student's handwritten solution is attached. Grade it and return JSON with a "feedback" field.`,
      },
      {
        type: 'image_url',
        image_url: { url: `data:${mimeType};base64,${imageBase64}` },
      },
    ];

    // 5) فراخوانی AI
    const ai = await callGroq({
      apiKey: context.env.GROQ_API_KEY,
      model: 'qwen/qwen3.8-27b',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
      temperature: 0.2,
      maxTokens: 1500,
      jsonMode: true,
      timeoutMs: 60000,
    });

    if (!ai.ok) return jsonResponse({ error: ai.error }, ai.status);

    // 6) پارس (با fallback)
    let parsed;
    try {
      parsed = JSON.parse(ai.content);
    } catch {
      return jsonResponse({ feedback: ai.content }, 200);
    }
    const feedback = typeof parsed?.feedback === 'string' ? parsed.feedback : ai.content;
    return jsonResponse({ feedback }, 200);
  } catch (error) {
    return jsonResponse({ error: `خطای داخلی: ${error.message}` }, 500);
  }
}