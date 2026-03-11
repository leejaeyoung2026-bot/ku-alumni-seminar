/**
 * KU Pharmacy Alumni Seminar — Cloudflare Worker
 *
 * KV Namespace: REGISTRATIONS
 * - key: phone (e.g. "010-1234-5678") → value: JSON registration object
 * - key: "__index__" → value: JSON array of all phones (for listing)
 *
 * Env vars (set in Cloudflare dashboard):
 * - ADMIN_KEY: secret key for admin endpoints (e.g. "my-secret-2026")
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

async function getIndex(kv) {
  const raw = await kv.get('__index__');
  return raw ? JSON.parse(raw) : [];
}

async function saveIndex(kv, index) {
  await kv.put('__index__', JSON.stringify(index));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }

    // ── POST /register ──────────────────────────────────────
    if (path === '/register' && method === 'POST') {
      const body = await request.json();
      const { name, phone, generation, affiliation, dinner } = body;

      if (!name || !phone || !generation || !affiliation || !dinner) {
        return json({ success: false, message: '필수 항목 누락' }, 400);
      }

      const existing = await env.REGISTRATIONS.get(phone);
      if (existing) {
        return json({ success: false, duplicate: true });
      }

      const record = {
        name, phone, generation, affiliation, dinner,
        registeredAt: new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
        updatedAt: '',
      };

      await env.REGISTRATIONS.put(phone, JSON.stringify(record));

      const index = await getIndex(env.REGISTRATIONS);
      index.push(phone);
      await saveIndex(env.REGISTRATIONS, index);

      return json({ success: true });
    }

    // ── GET /lookup?phone=... ────────────────────────────────
    if (path === '/lookup' && method === 'GET') {
      const phone = url.searchParams.get('phone');
      if (!phone) return json({ found: false });

      const raw = await env.REGISTRATIONS.get(phone);
      if (!raw) return json({ found: false });

      return json({ found: true, ...JSON.parse(raw) });
    }

    // ── PUT /update ──────────────────────────────────────────
    if (path === '/update' && method === 'PUT') {
      const body = await request.json();
      const { name, phone, generation, affiliation, dinner } = body;

      const raw = await env.REGISTRATIONS.get(phone);
      if (!raw) return json({ success: false, message: 'not found' }, 404);

      const existing = JSON.parse(raw);
      const record = {
        ...existing,
        name, generation, affiliation, dinner,
        updatedAt: new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
      };

      await env.REGISTRATIONS.put(phone, JSON.stringify(record));
      return json({ success: true });
    }

    // ── GET /admin/list?key=... ──────────────────────────────
    if (path === '/admin/list' && method === 'GET') {
      if (url.searchParams.get('key') !== env.ADMIN_KEY) {
        return json({ error: 'unauthorized' }, 401);
      }

      const index = await getIndex(env.REGISTRATIONS);
      const records = await Promise.all(
        index.map(async phone => {
          const raw = await env.REGISTRATIONS.get(phone);
          return raw ? JSON.parse(raw) : null;
        })
      );

      return json({ success: true, count: records.length, records: records.filter(Boolean) });
    }

    // ── GET /admin/csv?key=... ───────────────────────────────
    if (path === '/admin/csv' && method === 'GET') {
      if (url.searchParams.get('key') !== env.ADMIN_KEY) {
        return new Response('unauthorized', { status: 401 });
      }

      const index = await getIndex(env.REGISTRATIONS);
      const records = await Promise.all(
        index.map(async phone => {
          const raw = await env.REGISTRATIONS.get(phone);
          return raw ? JSON.parse(raw) : null;
        })
      );

      const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
      const header = '이름,연락처,기수,소속,저녁식사,등록일시,수정일시';
      const rows = records.filter(Boolean).map(r =>
        [r.name, r.phone, r.generation, r.affiliation, r.dinner, r.registeredAt, r.updatedAt].map(esc).join(',')
      );
      const csv = '\uFEFF' + [header, ...rows].join('\n'); // BOM for Excel

      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="seminar-registrations.csv"',
          ...CORS,
        },
      });
    }

    // ── GET /admin/delete?key=...&phone=... ──────────────────
    if (path === '/admin/delete' && method === 'GET') {
      if (url.searchParams.get('key') !== env.ADMIN_KEY) {
        return json({ error: 'unauthorized' }, 401);
      }

      const phone = url.searchParams.get('phone');
      if (!phone) return json({ success: false, message: 'phone required' }, 400);

      await env.REGISTRATIONS.delete(phone);
      const index = await getIndex(env.REGISTRATIONS);
      await saveIndex(env.REGISTRATIONS, index.filter(p => p !== phone));

      return json({ success: true });
    }

    // ── GET /stats ──────────────────────────────────────────
    if (path === '/stats' && method === 'GET') {
      const index = await getIndex(env.REGISTRATIONS);
      return json({ count: index.length });
    }

    return json({ error: 'not found' }, 404);
  },
};
