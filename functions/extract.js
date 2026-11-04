export async function onRequestPost(context) {
  try {
    const { images } = await context.request.json(); 
    const apiKey = context.env.GROQ_API_KEY; 

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "کلید API یافت نشد" }), { status: 500 });
    }

    // پرامپت فوق سخت‌گیرانه برای حذف تکرار و جلوگیری از طولانی شدن
    const systemPrompt = `You are a strict and highly precise OCR engine.
You are given multiple images. These images MIGHT be overlapping photos of the SAME blackboard, or different pages.
Your strict rules:
1. Extract ALL handwritten text and formulas.
2. DEDUPLICATE: If images contain the same content (e.g., overlapping photos of one board), merge them and DO NOT repeat sentences.
3. BE CONCISE: DO NOT add any explanations, introductions, or extra concepts. Only output what is actually written.
4. Fix ONLY obvious spelling mistakes. Do NOT re-write or over-explain the professor's notes.
5. Format using Markdown and standard LaTeX ($$...$$ for block math, $...$ for inline).
6. Output language: Persian.`;

    // آماده‌سازی آرایه عکس‌ها برای ارسال یکجا
    const imageContents = images.map(img => ({
      type: "image_url",
      image_url: { url: `data:${img.mimeType};base64,${img.imageBase64}` }
    }));

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "qwen/qwen3.8-27b",
        messages: [
          { role: "system", content: systemPrompt },
          { 
            role: "user", 
            content: [
              { type: "text", text: "Here are the images. Extract, deduplicate, and format the text." },
              ...imageContents // ارسال همه عکس‌ها در یک درخواست
            ]
          }
        ],
        temperature: 0.0, // دمای صفر برای اینکه حتی یک کلمه هم از خودش اضافه نکند
        max_tokens: 4096
      })
    });

    const data = await response.json();

    if (data.error) {
      return new Response(JSON.stringify({ error: data.error.message }), { status: 400 });
    }

    return new Response(JSON.stringify({ text: data.choices[0].message.content }), {
      status: 200, headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: `خطای داخلی: ${error.message}` }), { status: 500 });
  }
}