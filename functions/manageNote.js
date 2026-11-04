export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const { action, id, title, text, image_url, category_id } = body;
    
    const supabaseUrl = context.env.VITE_SUPABASE_URL;
    const supabaseKey = context.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({ error: "تنظیمات دیتابیس یافت نشد" }), { status: 500 });
    }

    let url = `${supabaseUrl}/rest/v1/notes`;
    let method = 'POST';
    let payload = null;

    if (action === 'update') {
      url += `?id=eq.${id}`;
      method = 'PATCH';
      payload = { title, text };
    } else if (action === 'delete') {
      url += `?id=eq.${id}`;
      method = 'DELETE';
    } else {
      // حالت ذخیره جدید: فقط اطلاعات مورد نیاز رو می‌فرستیم (بدون action)
      method = 'POST';
      payload = { title, text, image_url, category_id }; 
    }

    const response = await fetch(url, {
      method: method,
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: payload ? JSON.stringify(payload) : undefined
    });

    if (!response.ok) {
      const err = await response.text();
      return new Response(JSON.stringify({ error: err }), { status: response.status });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
