export async function onRequestPost(context) {
  try {
    const { images } = await context.request.json(); 
    const apiKey = context.env.GROQ_API_KEY; 

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "کلید API یافت نشد" }), { status: 500 });
    }

    // پرامپت اصلاح‌شده: بدون مقدمه، مفهومی و بسیار خلاصه
    const systemPrompt = `You are an expert university professor writing concise, conceptual study notes from images.
Your absolute priority is brevity, zero filler text, and clear structure.

CRITICAL RULES:
1. NO INTRODUCTIONS OR CONCLUSIONS: Do NOT write things like "Here is the extracted text", "I have analyzed the images", or "I hope this helps". START DIRECTLY with the first heading or formula. If you include any conversational filler, you fail the task.
2. Extraction & Deduplication: Extract the text. If multiple images contain identical or overlapping content, merge them and remove duplicates.
3. Conceptual Explanations (Short): Do NOT write long paragraphs. For major formulas, add ONLY ONE short sentence explaining the core concept or variables (e.g., "A is the cross-sectional area."). Keep it extremely brief.
4. Formatting: Use Markdown (headings, bullet points). Use standard LaTeX ($$...$$ for blocks, $...$ for inline).
5. Output Language: Persian (Farsi).

Output example of what is EXPECTED:
## معادله دارسی
رابطه بین دبی و فشار:
$$ Q = kA \frac{dp}{dr} $$
در اینجا \( k \) نفوذپذیری و \( A \) سطح مقطع است.

Output example of what is FORBIDDEN (Do NOT do this):
"بفرمایید، من تصاویر شما را بررسی کردم. در این جزوه معادله دارسی آمده است که..."`;

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
              { type: "text", text: "Extract and format these notes following the strict rules. No introductions, keep explanations conceptual and short." },
              ...imageContents
            ]
          }
        ],
        temperature: 0.1, 
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