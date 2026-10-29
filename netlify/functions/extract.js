export const handler = async (event, context) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { imageBase64, mimeType } = JSON.parse(event.body);
    // این خط برای OpenRouter تغییر کرده
    const apiKey = process.env.OPENROUTER_API_KEY; 

    if (!apiKey) {
      return { statusCode: 500, body: JSON.stringify({ error: "کلید OpenRouter یافت نشد" }) };
    }

    const prompt = "شما یک استاد دانشگاه هستید. متن دست‌نویس داخل این تصویر را با دقت استخراج کنید. غلط‌های املایی را اصلاح کنید. اگر کلمه‌ای ناخوانا بود، بنویسید [نامشخص]. فرمول‌های ریاضی را با LaTeX بنویسید.";
    const imageUrl = `data:${mimeType};base64,${imageBase64}`;

    // اینجا به OpenRouter وصل میشیم
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-exp:free",
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
