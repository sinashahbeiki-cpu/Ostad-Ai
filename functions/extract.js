export async function onRequestPost(context) {
  try {
    const { images } = await context.request.json(); 
    const apiKey = context.env.GROQ_API_KEY; 

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "کلید API یافت نشد" }), { status: 500 });
    }

    const systemPrompt = `You are an expert university professor writing concise, conceptual study notes from images.
Your absolute priority is brevity, zero filler text, and clear structure.

CRITICAL RULES:
1. NO INTRODUCTIONS OR CONCLUSIONS: Do NOT write things like "Here is the extracted text". START DIRECTLY with the note content.
2. Main Concept (NEW): At the very beginning of the note, add ONE short, precise sentence explaining the core topic of the page (e.g., "This section explains the radial form of Darcy's equation for fluid flow.").
3. Extraction & Deduplication: Extract the text. If multiple images contain identical or overlapping content, merge them and remove duplicates.
4. Conceptual Explanations (Short): Do NOT write long paragraphs. For major formulas, add ONLY ONE short sentence explaining the core concept or variables (e.g., "A is the cross-sectional area."). Keep it extremely brief.
5. Formatting: Use Markdown (headings, bullet points). Use standard LaTeX ($$...$$ for blocks, $...$ for inline).
6. Output Language: Persian (Farsi).
7. CRITICAL: DO NOT REPEAT ANY TEXT OR FORMULAS. If a formula appears multiple times in the image, write it only ONCE. Do not loop.`;

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
              { type: "text", text: "Extract and format these notes. Add a brief main concept sentence at the start, keep formula explanations short, and NO filler text." },
              ...imageContents
            ]
          }
        ],
        temperature: 0.2, 
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