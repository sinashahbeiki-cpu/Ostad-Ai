// functions/_utils/auth.js
export async function verifyAuth(request, env) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { user: null, token: null, error: 'توکن احراز هویت یافت نشد', status: 401 };
  }

  const token = authHeader.slice(7).trim();
  if (!token) return { user: null, token: null, error: 'توکن خالی است', status: 401 };
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    return { user: null, token: null, error: 'تنظیمات سرور ناقص است', status: 500 };
  }

  try {
    const res = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': env.SUPABASE_ANON_KEY,
      },
    });

    if (!res.ok) return { user: null, token: null, error: 'توکن نامعتبر یا منقضی شده', status: 401 };
    const user = await res.json();
    if (!user || !user.id) return { user: null, token: null, error: 'کاربر معتبر نیست', status: 401 };

    return { user, token, error: null, status: 200 };
  } catch (err) {
    return { user: null, token: null, error: `خطا در احراز هویت: ${err.message}`, status: 500 };
  }
}