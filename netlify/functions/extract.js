export const handler = async (event, context) => {
  // فقط درخواست‌های POST را قبول می‌کنیم
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { imageBase64, mimeType } = JSON.parse(event.body);
    
    // خواندن کلید از تنظیمات Netlify
    const apiKey = process.env.OPENROUTER_API_KEY; 

    if (!apiKey) {
      return { 
        statusCode: 500, 
        body: JSON.stringify({ error: "کلید OpenRouter در تنظیمات Netlify یافت نشد" }) 
      };
    }

    // دستورالعمل برای هوش مصنوعی
    const prompt = "شما یک استاد دانشگاه هستید. متن دست‌نویس داخل این تصویر را با دقت استخراج کنید. غلط‌های املایی را اصلاح کنید و ساختار پاراگراف‌ها را مرتب کنید. اگر کلمه‌ای ناخوانا بود، به جای حدس زدن، بنویسید [نامشخص]. فرمول‌های ریاضی را حتما با LaTeX بنویسید.";
    
    // تبدیل عکس به فرمت Base64 Data URL
    const imageUrl = `data:${mimeType};base64,${imageBase64}`;

    // درخواست به OpenRouter با استفاده از روتر خودکار مدل‌های رایگان
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "openrouter/free", // استفاده از سیستم خودکار برای انتخاب مدل رایگان
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

    // بررسی خطاهای احتمالی از سمت OpenRouter
    if (data.error) {
      return { 
        statusCode: 400, 
        body: JSON.stringify({ error: data.error.message }) 
      };
    }

    // استخراج متن از پاسخ
    const extractedText = data.choices[0].message.content;

    return {
      statusCode: 200,
      body: JSON.stringify({ text: extractedText })
    };

  } catch (error) {
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: error.message }) 
    };
  }
};
