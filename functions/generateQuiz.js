export async function onRequestPost(context) {
  try {
    const { notesText, subject } = await context.request.json();
    const apiKey = context.env.GROQ_API_KEY; 

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "کلید API یافت نشد" }), { status: 500 });
    }

    const systemPrompt = `You are an expert university professor. Based on the provided notes, create a study guide and a quiz.
    The subject is: ${subject}.
    You MUST output ONLY a valid JSON object, without any markdown formatting or backticks. Do NOT write anything outside the JSON.
    The JSON must exactly follow this structure:
    {
      "summary": "خلاصه جامع و پایه به پایه به زبان فارسی با استفاده از Markdown و LaTeX",
      "conceptual_questions": [
        {
          "question": "متن سوال مفهومی",
          "options": ["گزینه ۱", "گزینه ۲", "گزینه ۳", "گزینه ۴"],
          "correct_index": 0,
          "explanation": "توضیح اینکه چرا این گزینه درست است"
        }
      ],
      "problem_questions": [
        {
          "question": "متن مسئله یا تمرین (با استفاده از LaTeX)",
          "correct_answer": "پاسخ نهایی و دقیق مسئله",
          "solution_steps": "راه حل تشریحی و گام به گام مسئله",
          "options": ["گزینه ۱", "گزینه ۲", "گزینه ۳", "گزینه ۴"],
          "correct_index": 0,
          "explanation": "توضیح فرمول یا راه حل نهایی"
        }
      ]
    }
    Generate 3 conceptual questions and 3 problem questions.`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b", // مدل جدید و فعال
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Here are the notes:\n\n${notesText}` }
        ],
        temperature: 0.2, 
        max_tokens: 4096,
        response_format: { type: "json_object" } 
      })
    });

    const data = await response.json();
    
    if (data.error) {
      return new Response(JSON.stringify({ error: data.error.message }), { status: 400 });
    }

    return new Response(data.choices[0].message.content, {
      status: 200, headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: `خطای داخلی: ${error.message}` }), { status: 500 });
  }
}