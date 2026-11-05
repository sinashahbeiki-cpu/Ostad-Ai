export async function onRequestPost(context) {
  try {
    const { imageBase64, mimeType, problemText, correctSolution } = await context.request.json();
    const apiKey = context.env.GROQ_API_KEY; 

    const prompt = `You are a strict but encouraging university professor grading a student's handwritten solution.
The problem is: ${problemText}
The correct solution path is: ${correctSolution}

Look at the student's handwritten image. Compare it with the correct solution.
Identify exactly where the student made a mistake (algebraic error, wrong formula, calculation mistake, etc.) or confirm if they solved it correctly.
Be concise, output in Persian, and use Markdown for formulas.`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "qwen/qwen3.8-27b", // مدل تصویری
        messages: [
          { 
            role: "user", 
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: `data:${mimeType};base64,${imageBase64}` } }
            ]
          }
        ],
        temperature: 0.1
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    return new Response(JSON.stringify({ feedback: data.choices[0].message.content }), {
      status: 200, headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}