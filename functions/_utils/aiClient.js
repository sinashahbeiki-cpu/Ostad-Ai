// functions/_utils/aiClient.js
const DEFAULT_TIMEOUT_MS = 60000;

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function callGroq({
  apiKey, model, messages, temperature = 0.2, maxTokens = 900, // کاهش به 900 برای رفع خطای OTPM
  jsonMode = false, timeoutMs = DEFAULT_TIMEOUT_MS,
}) {
  if (!apiKey) return { ok: false, error: 'کلید API یافت نشد', status: 500 };

  const body = { model, messages, temperature, max_tokens: maxTokens };
  if (jsonMode) body.response_format = { type: 'json_object' };

  try {
    const response = await fetchWithTimeout(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
      timeoutMs
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok || data.error) {
      const isRateLimit = response.status === 429 || (data?.error?.message && data.error.message.includes('OTPM'));
      return {
        ok: false,
        error: isRateLimit 
          ? 'محدودیت پردازش در دقیقه (OTPM). لطفاً ۳۰ ثانیه صبر کنید و دوباره تلاش کنید.' 
          : (data?.error?.message || `خطای سرویس AI (HTTP ${response.status})`),
        status: response.status >= 400 ? response.status : 502,
      };
    }

    const content = data?.choices?.[0]?.message?.content;
    if (!content) return { ok: false, error: 'پاسخ خالی از سرویس AI', status: 502 };

    return { ok: true, content, raw: data, error: null, status: 200 };
  } catch (err) {
    if (err.name === 'AbortError') return { ok: false, error: 'زمان پردازش AI به پایان رسید', status: 504 };
    return { ok: false, error: `خطا در ارتباط با AI: ${err.message}`, status: 500 };
  }
}