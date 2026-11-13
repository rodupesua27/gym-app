// Avisos de fin de descanso: la app dice "avísame en X s" y un Durable Object
// manda un push (sin contenido) cuando se cumple. Sin servidores de pago.
// Secreto necesario en Cloudflare: VAPID_PRIVATE (la parte privada "d" de la clave, en base64url).

const enc = new TextEncoder();
const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));

// Solo servicios push conocidos (evita que alguien use el Worker para llamar a otras URLs)
const PUSH_HOSTS = ['.push.apple.com', '.googleapis.com', '.push.services.mozilla.com', '.notify.windows.com'];
function goodEndpoint(e) {
  try {
    const u = new URL(e);
    return u.protocol === 'https:' && PUSH_HOSTS.some(h => u.hostname.endsWith(h) || u.hostname === h.slice(1));
  } catch (err) { return false; }
}

export async function vapidHeader(endpoint, env) {
  const pub = unb64u(env.VAPID_PUBLIC);
  const jwk = { kty: 'EC', crv: 'P-256', x: b64u(pub.slice(1, 33)), y: b64u(pub.slice(33, 65)), d: env.VAPID_PRIVATE, ext: true };
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const head = b64u(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const body = b64u(enc.encode(JSON.stringify({
    aud: new URL(endpoint).origin,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: env.VAPID_SUBJECT
  })));
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(head + '.' + body));
  return `vapid t=${head}.${body}.${b64u(sig)}, k=${env.VAPID_PUBLIC}`;
}

export class RestTimer {
  constructor(state, env) { this.state = state; this.env = env; }

  async fetch(req) {
    const path = new URL(req.url).pathname;
    const body = await req.json();
    if (path === '/cancel') {
      await this.state.storage.deleteAlarm();
      await this.state.storage.delete('endpoint');
      await this.state.storage.delete('left');
      return new Response('ok');
    }
    await this.state.storage.put('endpoint', body.endpoint);
    await this.state.storage.put('left', 1); // avisos extra tras el primero
    await this.state.storage.setAlarm(Date.now() + body.seconds * 1000);
    return new Response('ok');
  }

  async alarm() {
    const endpoint = await this.state.storage.get('endpoint');
    if (!endpoint) return;
    const left = (await this.state.storage.get('left')) || 0;
    if (left > 0) {
      await this.state.storage.put('left', left - 1);
      await this.state.storage.setAlarm(Date.now() + 4000); // segundo aviso 4 s después
    } else {
      await this.state.storage.delete('endpoint');
      await this.state.storage.delete('left');
    }
    try {
      await fetch(endpoint, {
        method: 'POST',
        headers: { Authorization: await vapidHeader(endpoint, this.env), TTL: '120', Urgency: 'high' }
      });
    } catch (e) { /* si falla, no pasa nada: la app sigue avisando con sonido si está abierta */ }
  }
}

// Copia en la nube de los datos de la app (una frase secreta = un almacén). Sin cuentas ni servidores de pago.
const jres = (o, st) => new Response(JSON.stringify(o), { status: st || 200, headers: { 'content-type': 'application/json' } });
const cnt = d => (d && Array.isArray(d.sessions) ? d.sessions.length : 0) + (d && Array.isArray(d.body) ? d.body.length : 0);

export class SyncStore {
  constructor(state) { this.state = state; }

  async fetch(req) {
    const st = this.state.storage;
    const cur = (await st.get('cur')) || null;
    const rev = cur ? cur.rev : 0;
    if (req.method === 'GET') return jres({ rev, t: cur ? cur.t : 0, data: cur ? cur.data : null });
    let b;
    try { b = await req.json(); } catch (e) { return jres({ error: 'json' }, 400); }
    if (!b || !b.data || typeof b.data !== 'object' || !Array.isArray(b.data.sessions) || !Array.isArray(b.data.body)) return jres({ error: 'formato' }, 400);
    if ((b.base | 0) !== rev) return jres({ conflict: true, rev, data: cur ? cur.data : null }, 409);
    if (JSON.stringify(b.data).length > 1500000) return jres({ error: 'grande' }, 413);
    // Protección: nunca machacar datos con una copia vacía (lo que pasa si el móvil pierde su almacenamiento).
    if (cur && cnt(cur.data) > 0 && cnt(b.data) === 0) return jres({ error: 'vacio', rev, data: cur.data }, 422);
    if (cur) await st.put('h' + (rev % 3), cur); // últimas 3 versiones
    await st.put('cur', { rev: rev + 1, t: Date.now(), data: b.data });
    return jres({ rev: rev + 1 });
  }
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === '/api/rest' || url.pathname === '/api/cancel') {
      if (req.method !== 'POST') return new Response('método no permitido', { status: 405 });
      let data;
      try { data = await req.json(); } catch (e) { return new Response('json no válido', { status: 400 }); }
      if (!data || !goodEndpoint(data.endpoint)) return new Response('endpoint no válido', { status: 400 });
      const stub = env.REST.get(env.REST.idFromName(data.endpoint));
      const seconds = Math.min(900, Math.max(3, Math.round(Number(data.seconds) || 0)));
      return stub.fetch('https://rest/' + (url.pathname === '/api/cancel' ? 'cancel' : 'set'), {
        method: 'POST',
        body: JSON.stringify({ endpoint: data.endpoint, seconds })
      });
    }
    if (url.pathname === '/api/sync') {
      const id = req.headers.get('x-sync-id') || '';
      if (!/^[a-f0-9]{64}$/.test(id)) return new Response('id no válido', { status: 400 });
      if (req.method !== 'GET' && req.method !== 'PUT') return new Response('método no permitido', { status: 405 });
      const stub = env.SYNC.get(env.SYNC.idFromName(id));
      return stub.fetch('https://sync/', { method: req.method, body: req.method === 'PUT' ? await req.text() : undefined });
    }
    return env.ASSETS.fetch(req);
  }
};
