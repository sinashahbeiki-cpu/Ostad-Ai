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

    // پرامپت بسیار سخت‌گیرانه و دقیق برای ریاضیات و حذف مقدمه
    const prompt = `شما یک موتور استخراج متن دقیق هستید. 
متن دست‌نویس داخل تصویر را استخراج کنید. 
قوانین بسیار مهم:
1. هرگز هیچ مقدمه، خوش‌آمدگویی یا توضیح اضافه‌ای ننویسید. فقط و فقط متن داخل تصویر را برگردانید.
2. تمام فرمول‌های ریاضی را با استاندارد LaTeX بنویسید. برای فرمول‌های بزرگ از $$...$$ و برای فرمول‌های درون‌خطی از $...$ استفاده کنید.
3. هیچ کلمه‌ای را حدس نزنید. اگر ناخوانا بود بنویسید [نامشخص].
4. ساختار لیست‌ها و پاراگراف‌ها را دقیقاً حفظ کنید.`;
    
    const imageUrl = `data:${mimeType};base64,${imageBase64}`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "openrouter/free", // استفاده از روتر خودکار
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: imageUrl } }
            ]
          }
        ]
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
