export const handler = async (event, context) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { imageBase64, mimeType } = JSON.parse(event.body);
    const apiKey = process.env.OPENROUTER_API_KEY; 

    if (!apiKey) {
      return { statusCode: 500, body: JSON.stringify({ error: "کلید OpenRouter یافت نشد" }) };
    }

    const prompt = `شما یک موتور استخراج متن دقیق هستید. متن دست‌نویس داخل تصویر را استخراج کنید. 
قوانین بسیار مهم:
1. هرگز هیچ مقدمه یا توضیح اضافه‌ای ننویسید.
2. فرمول‌های ریاضی را دقیقاً با LaTeX بنویسید.
3. کلمات ناخوانا را [نامشخص] بگذارید.`;
    
    const imageUrl = `data:${mimeType};base64,${imageBase64}`;

    // مدل‌های به‌روز و فعال (اکتبر ۲۰۲۶)
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

        if (!data.error && data.choices && data.choices.length > 0) {
          return {
            statusCode: 200,
            body: JSON.stringify({ text: data.choices[0].message.content })
          };
        } else {
          lastError = data.error ? data.error.message : "پاسخ نامعتبر از مدل";
        }
      } catch (err) {
        lastError = err.message;
      }
    }

    return { 
      statusCode: 400, 
      body: JSON.stringify({ error: `همه مدل‌ها با خطا مواجه شدند. آخرین خطا: ${lastError}` }) 
    };

  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
