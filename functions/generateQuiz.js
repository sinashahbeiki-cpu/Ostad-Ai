// functions/generateQuiz.js
import { verifyAuth } from './_utils/auth.js';
import { callGroq } from './_utils/aiClient.js';
import { validateNotesText, jsonResponse } from './_utils/validate.js';

const SYSTEM_PROMPT = `You are an expert professor. Create a study guide and quiz.
Output ONLY valid JSON with this exact shape:
{ "summary": "...", "conceptual_questions": [{ "question": "...", "options": ["A","B","C","D"], "correct_index": 0, "explanation": "..." }], "problem_questions": [{ "question": "...", "correct_answer": "...", "solution_steps": "...", "options": ["A","B","C","D"], "correct_index": 0, "explanation": "..." }] }
RULES:
- Return AT LEAST 3 conceptual_questions and AT LEAST 2 problem_questions.
- Every "options" array MUST have exactly 4 non-empty strings.
- "correct_index" MUST be an integer 0-3.
- "explanation" is required for every question.
- "correct_answer" and "solution_steps" are required for every problem_question.
- CRITICAL LATEX RULE: Write math enclosed in $...$. Use double backslashes for commands (e.g., $\\frac{1}{2}$).
- Output in Persian (Farsi).`;

function normalizeQuiz(parsed) {
  const summary = typeof parsed?.summary === 'string' ? parsed.summary : '';
  const conceptual = Array.isArray(parsed?.conceptual_questions) ? parsed.conceptual_questions : [];
  const problems = Array.isArray(parsed?.problem_questions) ? parsed.problem_questions : [];

  const cleanMCQ = (q, withSolution) => {
    if (!q || typeof q.question !== 'string') return null;
    const options = Array.isArray(q.options) ? q.options.slice(0, 4) : [];
    if (options.length !== 4 || options.some(o => typeof o !== 'string')) return null;
    const correctIndex =
      Number.isInteger(q.correct_index) && q.correct_index >= 0 && q.correct_index < 4
        ? q.correct_index
        : 0;
    const base = {
      question: q.question,
      options,
      correct_index: correctIndex,
      explanation: typeof q.explanation === 'string' ? q.explanation : '',
    };
    if (withSolution) {
      base.correct_answer = typeof q.correct_answer === 'string' ? q.correct_answer : '';
      base.solution_steps = typeof q.solution_steps === 'string' ? q.solution_steps : '';
    }
    return base;
  };

  return {
    summary,
    conceptual_questions: conceptual.map(q => cleanMCQ(q, false)).filter(Boolean),
    problem_questions: problems.map(q => cleanMCQ(q, true)).filter(Boolean),
  };
}

export async function onRequestPost(context) {
  try {
    // 1) احراز هویت
    const auth = await verifyAuth(context.request, context.env);
    if (!auth.user) return jsonResponse({ error: auth.error }, auth.status);

    // 2) بدنه
    const { notesText, subject } = await context.request.json();

    // 3) اعتبارسنجی و کوتاه‌سازی
    const validation = validateNotesText(notesText);
    if (!validation.ok) return jsonResponse({ error: validation.error }, validation.status);

    // 4) فراخوانی AI
    const ai = await callGroq({
      apiKey: context.env.GROQ_API_KEY,
      model: 'openai/gpt-oss-120b',
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT + (subject ? `\nSubject: ${subject}` : ''),
        },
        { role: 'user', content: validation.text },
      ],
      temperature: 0.2,
      maxTokens: 4096,
      jsonMode: true,
      timeoutMs: 90000,
    });

    if (!ai.ok) return jsonResponse({ error: ai.error }, ai.status);

    // 5) پارس و نرمال‌سازی
    let parsed;
    try {
      parsed = JSON.parse(ai.content);
    } catch {
      return jsonResponse({ error: 'پاسخ AI قابل تحلیل نبود (JSON نامعتبر)' }, 502);
    }

    const quiz = normalizeQuiz(parsed);
    if (quiz.conceptual_questions.length === 0 && quiz.problem_questions.length === 0) {
      return jsonResponse({ error: 'AI نتوانست سوال معتبری بسازد. لطفاً دوباره تلاش کنید.' }, 502);
    }

    return jsonResponse({ ...quiz, _truncated: validation.truncated }, 200);
  } catch (error) {
    return jsonResponse({ error: `خطای داخلی: ${error.message}` }, 500);
  }
}