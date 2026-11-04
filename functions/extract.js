export async function onRequestPost(context) {
  try {
    const { images } = await context.request.json(); 
    const apiKey = context.env.GROQ_API_KEY; 

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "کلید API یافت نشد" }), { status: 500 });
    }

    // پرامپت بهینه: نه خیلی طولانی، نه خیلی خلاصه. با توضیح فرمول‌ها.
    const systemPrompt = `You are an expert university professor creating high-quality, structured study notes from handwritten images.
Your goal is to extract the text, deduplicate, and organize it into a clear, educational note with brief formula explanations.

Strict Rules:
1. Extraction & Deduplication: Extract the text accurately. If images show the same content (overlapping blackboard photos), merge them and remove duplicates.
2. Structuring: Use Markdown headings, bullet points, and clear paragraphs.
3. Formula Explanations (CRUCIAL): Do NOT just list formulas. Add a brief, precise explanation for the major formulas. Explain what the variables represent (e.g., "r is radius, h is height") and the logic of the steps (e.g., "Substituting the area of a cylinder A = 2πrh into the equation").
4. Conciseness with Value: Keep it concise. DO NOT invent outside information or write long introductions. Just ensure the explanation is complete enough to understand the math.
5. Math Formatting: Use standard LaTeX ($$...$$ for blocks, $...$ for inline).
6. Output Language: Persian (Farsi).`;

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
              { type: "text", text: "Here are the images. Extract, deduplicate, and format the text with brief formula explanations." },
              ...imageContents
            ]
          }
        ],
        temperature: 0.2, // دمای کمی بالاتر برای اینکه بتواند توضیح آموزشی بنویسد
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
