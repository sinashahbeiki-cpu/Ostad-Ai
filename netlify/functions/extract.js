export const handler = async (event, context) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { imageBase64, mimeType } = JSON.parse(event.body);
    
    // خواندن کلید از تنظیمات Netlify
    const apiKey = process.env.OPENROUTER_API_KEY; 

    if (!apiKey) {
      return { statusCode: 500, body: JSON.stringify({ error: "کلید API در تنظیمات Netlify یافت نشد" }) };
    }

    const prompt = "شما یک استاد دانشگاه هستید. متن دست‌نویس داخل این تصویر را با دقت استخراج کنید. غلط‌های املایی را اصلاح کنید و ساختار پاراگراف‌ها را مرتب کنید. اگر کلمه‌ای ناخوانا بود، به جای حدس زدن، بنویسید [نامشخص]. فرمول‌های ریاضی را حتما با LaTeX بنویسید.";
    
    // تبدیل عکس به فرمت قابل ارسال
    const imageUrl = `data:${mimeType};base64,${imageBase64}`;

    // استفاده از یک مدل تصویری قدرتمند و رایگان
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "qwen/qwen-2-vl-7b-instruct:free", 
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

    // بررسی خطاهای احتمالی
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
