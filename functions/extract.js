export async function onRequestPost(context) {
  try {
    const { imageBase64, mimeType } = await context.request.json();
    const apiKey = context.env.GROQ_API_KEY; 

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "کلید GROQ_API_KEY در تنظیمات کلودفلر یافت نشد" }), {
        status: 500, headers: { "Content-Type": "application/json" }
      });
    }

    const prompt = `شما یک موتور استخراج متن دقیق هستید. متن دست‌نویس داخل تصویر را استخراج کنید. 
قوانین: 1. هیچ مقدمه‌ای ننویسید. 2. فرمول‌ها را با LaTeX بنویسید. 3. کلمات ناخوانا را [نامشخص] بگذارید.`;

    // ✅ استفاده از مدل جدید و جایگزین: Llama 4 Scout
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: `data:${mimeType};base64,${imageBase64}` } }
            ]
          }
        ],
        temperature: 0.1,
        max_tokens: 2048
      })
    });

    const data = await response.json();

    if (data.error) {
      return new Response(JSON.stringify({ error: data.error.message }), {
        status: 400, headers: { "Content-Type": "application/json" }
      });
    }

    const extractedText = data.choices[0].message.content;

    return new Response(JSON.stringify({ text: extractedText }), {
      status: 200, headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: `خطای داخلی: ${error.message}` }), {
      status: 500, headers: { "Content-Type": "application/json" }
    });
  }
}
