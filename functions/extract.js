export async function onRequestPost(context) {
  try {
    const { images } = await context.request.json(); // آرایه‌ای از عکس‌ها
    const apiKey = context.env.GROQ_API_KEY; 

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "کلید API یافت نشد" }), { status: 500 });
    }

    // پرامپت بسیار سخت‌گیرانه برای جلوگیری از طولانی شدن و توهم
    const systemPrompt = `You are a strict academic proofreader and OCR engine.
Your task is to extract the text exactly as written, with zero additions.
Rules:
1. Extract ALL text and formulas.
2. Fix ONLY spelling and grammar mistakes.
3. DO NOT add new sections, headings, or concepts that are not in the image.
4. DO NOT over-explain. If a formula lacks context, add ONLY a brief 1-sentence inline explanation. Keep it as short as the original.
5. Format math using standard LaTeX ($$...$$ for blocks, $...$ for inline).
6. NO introductory or concluding remarks.
7. Output in Persian.`;

    let finalText = "";

    // پردازش عکس‌ها یکی یکی
    for (let i = 0; i < images.length; i++) {
      const { imageBase64, mimeType } = images[i];

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
                { type: "text", text: `Extract the text from this page (Page ${i + 1}).` },
                { type: "image_url", image_url: { url: `data:${mimeType};base64,${imageBase64}` } }
              ]
            }
          ],
          temperature: 0.0, // صفر برای حداکثر دقت و حداقل خلاقیت
          max_tokens: 2048
        })
      });

      const data = await response.json();

      if (data.error) {
        return new Response(JSON.stringify({ error: data.error.message }), { status: 400 });
      }

      if (data.choices && data.choices.length > 0) {
        finalText += `\n\n--- صفحه ${i + 1} ---\n\n` + data.choices[0].message.content;
      }
    }

    return new Response(JSON.stringify({ text: finalText.trim() }), {
      status: 200, headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: `خطای داخلی: ${error.message}` }), { status: 500 });
  }
}
