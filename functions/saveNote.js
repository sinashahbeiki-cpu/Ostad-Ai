export async function onRequestPost(context) {
  try {
    const { title, text, image_url, category_id } = await context.request.json();
    
    // خواندن آدرس و کلید دیتابیس از تنظیمات کلودفلر
    const supabaseUrl = context.env.VITE_SUPABASE_URL;
    const supabaseKey = context.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({ error: "تنظیمات دیتابیس در کلودفلر یافت نشد" }), {
        status: 500, headers: { "Content-Type": "application/json" }
      });
    }

    // ارسال درخواست به Supabase از سمت سرور
    const response = await fetch(`${supabaseUrl}/rest/v1/notes`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ title, text, image_url, category_id })
    });

    const data = await response.json();

    if (!response.ok) {
      return new Response(JSON.stringify({ error: data.message || 'خطا در ذخیره‌سازی' }), {
        status: response.status, headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200, headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: `خطای داخلی: ${error.message}` }), {
      status: 500, headers: { "Content-Type": "application/json" }
    });
  }
}
