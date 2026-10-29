export async function onRequestPost(context) {
  try {
    const { imageBase64, mimeType } = await context.request.json();
    const apiKey = context.env.OPENROUTER_API_KEY; 

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "کلید OPENROUTER_API_KEY در تنظیمات کلودفلر یافت نشد" }), {
        status: 500, headers: { "Content-Type": "application/json" }
      });
    }

    const prompt = `شما یک موتور استخراج متن دقیق هستید. متن دست‌نویس داخل تصویر را استخراج کنید. 
قوانین: 1. هیچ مقدمه‌ای ننویسید. 2. فرمول‌ها را با LaTeX بنویسید. 3. کلمات ناخوانا را [نامشخص] بگذارید.`;
    
    const imageUrl = `data:${mimeType};base64,${imageBase64}`;
    
    // مدل‌های به‌روز و فعال
    const modelsToTry = [
      "google/gemma-4-31b-it:free",
      "google/gemma-4-26b-a4b-it:free",
      "nvidia/nemotron-nano-12b-v2-vl:free"
    ];

    let lastError = null;

    for (const modelName of modelsToTry) {
      try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: modelName,
            messages: [{ role: "user", content: [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: imageUrl } }] }],
            max_tokens: 2000
          })
        });

        const data = await response.json();

        if (!data.error && data.choices && data.choices.length > 0) {
          return new Response(JSON.stringify({ text: data.choices[0].message.content }), {
            status: 200, headers: { "Content-Type": "application/json" }
          });
        } else {
          lastError = data.error ? data.error.message : "پاسخ نامعتبر";
        }
      } catch (err) {
        lastError = err.message;
      }
    }

    return new Response(JSON.stringify({ error: `خطا از سمت OpenRouter: ${lastError}` }), {
      status: 400, headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: `خطای داخلی سرور: ${error.message}` }), {
      status: 500, headers: { "Content-Type": "application/json" }
    });
  }
}
