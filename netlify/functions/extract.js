export const handler = async (event, context) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { imageBase64, mimeType } = JSON.parse(event.body);
    const apiKey = process.env.OPENROUTER_API_KEY; 

    if (!apiKey) {
      return { statusCode: 500, body: JSON.stringify({ error: "کلید OpenRouter در تنظیمات Netlify یافت نشد" }) };
    }

    const prompt = `شما یک موتور استخراج متن دقیق هستید. متن دست‌نویس داخل تصویر را استخراج کنید. 
قوانین بسیار مهم:
1. هرگز هیچ مقدمه یا توضیح اضافه‌ای ننویسید.
2. فرمول‌های ریاضی را دقیقاً با LaTeX بنویسید (برای فرمول‌های بزرگ از $$...$$ و برای درون‌خطی از $...$).
3. کلمات ناخوانا را [نامشخص] بگذارید.`;
    
    const imageUrl = `data:${mimeType};base64,${imageBase64}`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        // لیست مدل‌های پشتیبان (اگر اولی خطا داد، خودکار میره سراغ دومی و...)
        models: [
          "nvidia/nemotron-nano-12b-v2-vl:free",
          "google/gemma-3-27b-it:free",
          "meta-llama/llama-3.2-11b-vision-instruct:free"
        ],
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: imageUrl } }
            ]
          }
        ],
        max_tokens: 2000
      })
    });

    const data = await response.json();

    if (data.error) {
      return { statusCode: 400, body: JSON.stringify({ error: data.error.message }) };
    }

    const extractedText = data.choices[0].message.content;

    return {
      statusCode: 200,
      body: JSON.stringify({ text: extractedText })
    };

  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
