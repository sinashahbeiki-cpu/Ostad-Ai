// functions/_utils/validate.js
export const LIMITS = {
  MAX_IMAGES: 5,
  MAX_IMAGE_BYTES: 8 * 1024 * 1024,
  MAX_TOTAL_IMAGE_BYTES: 25 * 1024 * 1024,
  MAX_NOTES_TEXT_LENGTH: 15000,
};

function base64Bytes(b64) { return Math.floor((b64.length * 3) / 4); }

export function validateImages(images) {
  if (!Array.isArray(images) || images.length === 0) return { ok: false, error: 'حداقل یک عکس لازم است', status: 400 };
  if (images.length > LIMITS.MAX_IMAGES) return { ok: false, error: `حداکثر ${LIMITS.MAX_IMAGES} عکس مجاز است`, status: 400 };

  let totalBytes = 0;
  for (const img of images) {
    if (!img || typeof img.imageBase64 !== 'string' || typeof img.mimeType !== 'string') return { ok: false, error: 'ساختار عکس نامعتبر است', status: 400 };
    if (!img.mimeType.startsWith('image/')) return { ok: false, error: 'فقط فایل تصویری مجاز است', status: 400 };
    const size = base64Bytes(img.imageBase64);
    if (size > LIMITS.MAX_IMAGE_BYTES) return { ok: false, error: 'حجم یک عکس بیش از حد مجاز است', status: 400 };
    totalBytes += size;
  }
  if (totalBytes > LIMITS.MAX_TOTAL_IMAGE_BYTES) return { ok: false, error: 'حجم کل عکس‌ها بیش از حد مجاز است', status: 400 };
  return { ok: true, error: null, status: 200 };
}

export function validateImage(imageBase64, mimeType) {
  if (typeof imageBase64 !== 'string' || imageBase64.length === 0) return { ok: false, error: 'تصویر ارسال نشد', status: 400 };
  if (typeof mimeType !== 'string' || !mimeType.startsWith('image/')) return { ok: false, error: 'فرمت تصویر نامعتبر است', status: 400 };
  if (base64Bytes(imageBase64) > LIMITS.MAX_IMAGE_BYTES) return { ok: false, error: 'حجم تصویر بیش از حد مجاز است', status: 400 };
  return { ok: true, error: null, status: 200 };
}

export function validateNotesText(text) {
  if (typeof text !== 'string' || text.trim().length === 0) return { ok: false, error: 'متن جزوات خالی است', status: 400, text: '' };
  let safe = text;
  let truncated = false;
  if (safe.length > LIMITS.MAX_NOTES_TEXT_LENGTH) {
    safe = safe.slice(0, LIMITS.MAX_NOTES_TEXT_LENGTH);
    truncated = true;
  }
  return { ok: true, error: null, status: 200, text: safe, truncated };
}

export function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { 'Content-Type': 'application/json' } });
}