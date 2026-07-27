/* واجهة المصادقة وحفظ التقدم — تعمل كـ Netlify Function مع تخزين Netlify Blobs */
import { getStore } from '@netlify/blobs';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';

export const config = { path: '/api/*' };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' }
  });
}

function secret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET is not configured');
  return s;
}

function issueToken(uid) {
  return jwt.sign({ uid }, secret(), { expiresIn: '180d' });
}

function uidFromRequest(req) {
  const h = req.headers.get('authorization') || '';
  if (!h.startsWith('Bearer ')) return null;
  try { return jwt.verify(h.slice(7), secret()).uid; }
  catch { return null; }
}

export default async function handler(req) {
  const url = new URL(req.url);
  const route = url.pathname.replace(/\/+$/, '');
  const users = getStore('users');
  const progress = getStore('progress');

  try {
    // فحص الصحة
    if (route === '/api/health') return json({ ok: true });

    // إنشاء حساب جديد
    if (route === '/api/register' && req.method === 'POST') {
      const b = await req.json().catch(() => ({}));
      const name = String(b.name || '').trim().slice(0, 60);
      const email = String(b.email || '').trim().toLowerCase().slice(0, 120);
      const password = String(b.password || '');
      if (!name) return json({ error: 'name_required' }, 400);
      if (!EMAIL_RE.test(email)) return json({ error: 'bad_email' }, 400);
      if (password.length < 6) return json({ error: 'weak_password' }, 400);

      const existing = await users.get(email, { type: 'json' });
      if (existing) return json({ error: 'email_exists' }, 409);

      const user = {
        id: crypto.randomUUID(),
        name,
        email,
        hash: bcrypt.hashSync(password, 10),
        createdAt: new Date().toISOString()
      };
      await users.setJSON(email, user);
      // فهرس معكوس للوصول من المعرف إلى البريد
      await users.setJSON('uid:' + user.id, { email });
      return json({ token: issueToken(user.id), name: user.name, email: user.email });
    }

    // تسجيل الدخول
    if (route === '/api/login' && req.method === 'POST') {
      const b = await req.json().catch(() => ({}));
      const email = String(b.email || '').trim().toLowerCase();
      const password = String(b.password || '');
      const user = await users.get(email, { type: 'json' });
      if (!user || !bcrypt.compareSync(password, user.hash)) {
        return json({ error: 'bad_credentials' }, 401);
      }
      return json({ token: issueToken(user.id), name: user.name, email: user.email });
    }

    // ما يلي يتطلب مصادقة
    const uid = uidFromRequest(req);
    if (!uid) return json({ error: 'unauthorized' }, 401);
    const ref = await users.get('uid:' + uid, { type: 'json' });
    const user = ref ? await users.get(ref.email, { type: 'json' }) : null;
    if (!user) return json({ error: 'unauthorized' }, 401);

    // جلب التقدم
    if (route === '/api/data' && req.method === 'GET') {
      const data = await progress.get(uid, { type: 'json' });
      return json({ name: user.name, email: user.email, data: data || null });
    }

    // حفظ التقدم
    if (route === '/api/data' && req.method === 'PUT') {
      const b = await req.json().catch(() => ({}));
      if (typeof b.data !== 'object' || b.data === null) return json({ error: 'bad_data' }, 400);
      const raw = JSON.stringify(b.data);
      if (raw.length > 300 * 1024) return json({ error: 'too_large' }, 413);
      b.data.updatedAt = new Date().toISOString();
      await progress.setJSON(uid, b.data);
      return json({ ok: true, updatedAt: b.data.updatedAt });
    }

    return json({ error: 'not_found' }, 404);
  } catch (err) {
    console.error('api error:', err);
    return json({ error: 'server_error' }, 500);
  }
}
