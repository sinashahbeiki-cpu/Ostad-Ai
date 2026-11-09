// functions/gradeSolution.js
import { verifyAuth } from './_utils/auth.js';
import { callGroq } from './_utils/aiClient.js';
import { validateImage, jsonResponse } from './_utils/validate.js';

const SYSTEM_PROMPT = `You are an expert university professor grading a student's handwritten solution.
Return ONLY valid JSON with this shape: { "feedback": "..." }
The feedback must be detailed, encouraging, and in Persian (Farsi). Include:
1) What the student did correctly.
2) Errors, mistakes, or missing steps.
3) The correct final answer.
Use LaTeX enclosed in $...$ for math. Do not include anything outside the JSON.`;

export async function onRequestPost(context) {
  try {
    const auth = await verifyAuth(context.request, context.env);
    if (!auth.user) return jsonResponse({ error: auth.error }, auth.status);

    const { imageBase64, mimeType, problemText, correctSolution } = await context.request.json();
    const imgVal = validateImage(imageBase64, mimeType);
    if (!imgVal.ok) return jsonResponse({ error: imgVal.error }, imgVal.status);
    if (typeof problemText !== 'string' || problemText.trim().length === 0) return jsonResponse({ error: 'متن مسئله ارسال نشد' }, 400);

    const userContent = [
      { type: 'text', text: `Problem:\n${problemText}\n\nCorrect solution:\n${correctSolution || '(not provided)'}\n\nGrade the attached solution and return JSON.` },
      { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
    ];

    const ai = await callGroq({
      apiKey: context.env.GROQ_API_KEY,
      model: 'qwen/qwen3.8-27b',
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: userContent }],
      temperature: 0.2,
      maxTokens: 900, // 💡 رفع خطای OTPM
      jsonMode: true,
      timeoutMs: 60000,
    });

    if (!ai.ok) return jsonResponse({ error: ai.error }, ai.status);

    let parsed;
    try { parsed = JSON.parse(ai.content); } 
    catch { return jsonResponse({ feedback: ai.content }, 200); }

    return jsonResponse({ feedback: parsed?.feedback || ai.content }, 200);
  } catch (error) {
    return jsonResponse({ error: `خطای داخلی: ${error.message}` }, 500);
  }
}