export async function onRequestPost(context) {
  try {
    const { imageBase64, mimeType } = await context.request.json();
    const apiKey = context.env.GROQ_API_KEY; 

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "کلید GROQ_API_KEY در تنظیمات کلودفلر یافت نشد" }), {
        status: 500, headers: { "Content-Type": "application/json" }
      });
    }

    // پرامپت انگلیسی دقیق و ساختاریافته برای بالاترین دقت
    const systemPrompt = `You are an expert university professor and academic editor.
Your task is to extract, correct, and perfectly structure handwritten academic notes from the provided image.

Follow these strict rules:
1. Accurate Extraction: Extract all text and mathematical formulas accurately from the image.
2. Correction & Completion: Fix grammatical and spelling errors. If a sentence or formula is incomplete, use your advanced academic knowledge to complete it logically so the note is flawless.
3. Structuring: Format the output as professional lecture notes using Markdown (use headings, bullet points, and clear paragraphs).
4. Math Formatting: Use standard LaTeX for all math. Use \`$$...$$\` for block equations and \`$...$\` for inline math. Ensure equations are separated properly from RTL text.
5. No Filler Text: DO NOT write any introductory or concluding remarks (e.g., "Here is the extracted text"). Start directly with the note content.
6. Output Language: The final output MUST be in Persian (Farsi), except for standard mathematical notations and LaTeX.`;

    const userPrompt = "Please extract, correct, and structure these handwritten notes according to your system instructions.";

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "qwen/qwen3.8-27b",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: [
              { type: "text", text: userPrompt },
              { type: "image_url", image_url: { url: `data:${mimeType};base64,${imageBase64}` } }
            ]
          }
        ],
        temperature: 0.1, // دمای پایین برای جلوگیری از توهم و افزایش دقت
        max_tokens: 4096
      })
    });

    const data = await response.json();

    if (data.error) {
      return new Response(JSON.stringify({ error: data.error.message }), {
        status: 400, headers: { "Content-Type": "application/json" }
      });
    }

    const extractedText = data.choices[0].message.content;

    return new Response(JSON.stringify({ text: extractedText }), {
      status: 200, headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: `خطای داخلی: ${error.message}` }), {
      status: 500, headers: { "Content-Type": "application/json" }
    });
  }
}
