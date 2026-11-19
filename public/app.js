(function () {
  'use strict';

  let reorderMode = false;
  let drag = null;
  document.addEventListener('pointerdown', e => {
    const h = e.target.closest && e.target.closest('[data-drag]');
    if (!h || !reorderMode || !active) return;
    e.preventDefault();
    const sec = h.closest('section.ex');
    const from = +sec.dataset.e;
    const rects = [...document.querySelectorAll('section.ex[data-e]')].map(s => s.getBoundingClientRect());
    drag = { from, to: from, sec, y0: e.clientY, rects };
    sec.classList.add('dragging');
  }, { passive: false });
  document.addEventListener('pointermove', e => {
    if (!drag) return;
    const dy = e.clientY - drag.y0;
    drag.sec.style.transform = `translateY(${dy}px)`;
    const r = drag.rects[drag.from];
    const center = r.top + r.height / 2 + dy;
    drag.to = drag.rects.filter((q, i) => i !== drag.from && q.top + q.height / 2 < center).length;
  });
  const endDrag = () => {
    if (!drag) return;
    const { from, to } = drag;
    drag = null;
    if (to !== from && active) {
      const [moved] = active.exercises.splice(from, 1);
      active.exercises.splice(to, 0, moved);
      persist();
    }
    render();
  };
  document.addEventListener('pointerup', endDrag);
  document.addEventListener('pointercancel', endDrag);

  let ROUTINES = window.ROUTINES || [];
  try { if (ROUTINES.length) localStorage.setItem('gym.routinesCache', JSON.stringify(ROUTINES)); else ROUTINES = JSON.parse(localStorage.getItem('gym.routinesCache') || '[]'); } catch (e) {}
  const ALT = {};
  // Zona concreta de cada ejercicio: solo los que comparten grupo Y zona aparecen como «Recomendado».
  const ZONE = {
    'Press de banca inclinado (mancuerna)': 'pecho superior', 'Aperturas en polea de abajo arriba': 'pecho superior',
    'Mariposa (Pec Deck)': 'pecho medio', 'Cables cruzados (de arriba abajo)': 'pecho inferior',
    'Elevación lateral (cable)': 'hombro lateral', 'Elevación lateral sentado en polea': 'hombro lateral', 'Elevación lateral y frontal con mancuerna': 'hombro lateral',
    'Elevación frontal con barra (cable)': 'hombro frontal',
    'Pájaro en polea (deltoides posterior)': 'hombro posterior', 'Aperturas inversas en polea': 'hombro posterior', 'Face pull en polea': 'hombro posterior',
    'Rotación externa en polea': 'manguito',
    'Jalón al pecho (cable)': 'dorsal vertical', 'Jalón al pecho agarre invertido (cable)': 'dorsal vertical', 'Jalón al pecho a un brazo': 'dorsal vertical',
    'Remo sentado (máquina)': 'espalda horizontal', 'Remo inclinado (barra)': 'espalda horizontal', 'Remo en máquina (iso)': 'espalda horizontal',
    'Jalón de tríceps con barra V (polea)': 'tríceps jalón', 'Jalón de tríceps con cuerda': 'tríceps jalón',
    'Extensión de tríceps por encima de la cabeza (cable)': 'tríceps extensión', 'Patada de tríceps con mancuerna': 'tríceps extensión',
    'Extensión de pierna': 'cuádriceps aislado', 'Press de piernas': 'cuádriceps compuesto',
    'Curl de bíceps (mancuerna)': 'bíceps curl', 'Curl de bíceps inclinado (mancuerna)': 'bíceps inclinado', 'Curl martillo (mancuerna)': 'bíceps martillo', 'Curl predicador (máquina)': 'bíceps predicador'
  };
  const groupOf = n => { const i = (window.EXINFO || {})[n]; return i && i.m && i.m[0] ? i.m[0] : null; };
  const allNames = [...new Set(ROUTINES.flatMap(r => r.exercises.map(e => e.name)))];
  const candidatesOf = base => allNames.filter(n => n !== base && groupOf(n) && groupOf(n) === groupOf(base))
    .sort((a, b) => (isRec(base, a) ? 0 : 1) - (isRec(base, b) ? 0 : 1));
  const isRec = (base, n) => !!ZONE[base] && ZONE[base] === ZONE[n];
  ROUTINES.forEach(r => r.exercises.forEach(e => { if (e.alt) ALT[e.name] = e.alt; }));
  const K = { s: 'gym.sessions', a: 'gym.active', b: 'gym.body', d: 'gym.diet', p: 'gym.profile', n: 'gym.push' };

  const load = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
  const save = (k, v, quiet) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} if (!quiet && SYNCED.indexOf(k) >= 0) syncSoon(); };
  // ---------- copia en la nube ----------
  const SYNCED = ['gym.sessions', 'gym.body', 'gym.diet', 'gym.profile'];
  const SYNC = { id: load('gym.syncid', null), rev: load('gym.syncrev', 0), dirty: load('gym.syncdirty', false), t: load('gym.synct', 0), msg: '', busy: false, timer: null };

  let sessions = load(K.s, []);
  // Nombres antiguos de las sesiones de cardio.
  sessions.forEach(s => { s.name = String(s.name).replace('Cardio 1 · abdomen y cinta', 'Abdomen y cinta').replace('Cardio 2 · abdomen y comba', 'Abdomen y comba'); });
  sessions.sort((a, b) => a.start - b.start);
  let active = load(K.a, null);
  let body = load(K.b, []);
  let diet = load(K.d, {});
  let profile = load(K.p, { h: 178 });
  let pushEndpoint = load(K.n, null);
  const PUSH_KEY = 'BAwEpOB4wZkmNCi6MFGQ6c-h5a0pcmzeeR35j66aXUAv56GxPI9nsaxT_atsS0z0YiVkTBuR3XUm93APsTLfJHY';
  let bmetric = 'kg', bAll = false, bDraft = null;
  let tab = 'registro';
  let lastTab = null;
  let overview = false;
  let openId = null;

  const $view = document.getElementById('view');
  const $rest = document.getElementById('restbar');
  const $tabs = document.getElementById('tabs');

  // ---------- utilidades ----------
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const num = v => { const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : NaN; };
  const pad = n => (n < 10 ? '0' : '') + n;
  const dur = sec => {
    sec = Math.max(0, Math.round(sec));
    const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60;
    return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
  };
  const thousands = n => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const kgTxt = n => (Math.round(n * 100) / 100).toString().replace('.', ',');
  const dShort = ts => new Date(ts).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  const isoDay = ts => { const d = new Date(ts); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const persist = () => save(K.a, active);

  const setVol = s => (num(s.kg) || 0) * (num(s.reps) || 0);
  const volOf = (exs, onlyDone) => {
    let v = 0;
    exs.forEach(e => e.sets.forEach(s => { if (!onlyDone || s.done) v += setVol(s); }));
    return v;
  };

  const ICON = {
    registro: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"/></svg>',
    rutinas: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h10"/></svg>',
    progreso: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l6-6 4 4 8-8M15 7h6v6"/></svg>',
    dieta: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3v6a3 3 0 0 0 6 0V3M8 3v18M17 3c-2.2 1.6-3 4.2-3 8h3v10"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'
  };

  // ---------- datos previos ----------
  function lastEx(name) {
    for (let i = sessions.length - 1; i >= 0; i--) {
      const e = sessions[i].exercises.find(x => x.name === name);
      if (e) return e;
    }
    return null;
  }
  const lowReps = r => { const m = String(r || '').match(/\d+/); return m ? m[0] : ''; };
  function prevOf(ex, si) {
    const le = lastEx(ex.name);
    if (!le) return null;
    const t = ex.sets[si].t;
    let k = 0;
    for (let i = 0; i < si; i++) if (ex.sets[i].t === t) k++;
    return le.sets.filter(s => s.t === t)[k] || null;
  }

  // ---------- audio y pantalla ----------
  let actx = null;
  function ensureAudio() {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === 'suspended') actx.resume();
    } catch (e) {}
  }
  function beep() {
    ensureAudio();
    try {
      if (actx) [0, 0.25, 0.5].forEach(d => {
        const o = actx.createOscillator(), g = actx.createGain();
        o.frequency.value = 880; g.gain.value = 0.15;
        o.connect(g); g.connect(actx.destination);
        o.start(actx.currentTime + d); o.stop(actx.currentTime + d + 0.15);
      });
    } catch (e) {}
    try { if (navigator.vibrate) navigator.vibrate([200, 100, 200]); } catch (e) {}
  }
  let wl = null;
  async function keepAwake() {
    try {
      if (active && 'wakeLock' in navigator && !wl) {
        wl = await navigator.wakeLock.request('screen');
        wl.addEventListener('release', () => { wl = null; });
      }
    } catch (e) {}
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') keepAwake(); });

  // ---------- hojas modales ----------
  function sheet(html, buttons) {
    return new Promise(resolve => {
      const o = document.createElement('div');
      o.className = 'overlay';
      o.innerHTML = `<div class="sheet">${html}<div class="sheet-btns">${buttons.map((b, i) =>
        `<button class="btn ${b.cls || ''}" data-i="${i}">${esc(b.label)}</button>`).join('')}</div></div>`;
      o.addEventListener('click', ev => {
        const b = ev.target.closest('button[data-i]');
        if (b) {
          const bt = buttons[+b.dataset.i];
          const val = typeof bt.v === 'function' ? bt.v(o) : bt.v;
          document.body.removeChild(o);
          resolve(val);
        } else if (ev.target === o) {
          document.body.removeChild(o);
          resolve(null);
        }
      });
      document.body.appendChild(o);
      const inp = o.querySelector('input');
      if (inp) inp.focus();
    });
  }

  // ---------- entrenamiento ----------
  function mkEx(name, n, w, reps, rest) {
    const sets = [];
    for (let i = 0; i < n; i++) sets.push({ t: i < w ? 'W' : 'N', kg: '', reps: '', done: false });
    return { name, reps: reps || '', rest: rest || 90, sets };
  }
  function startFrom(r) {
    active = {
      id: Date.now(), routineId: r ? r.id : null,
      name: r ? `${r.name} · ${r.short}` : 'Sesión libre',
      start: Date.now(), rest: null,
      cardio: r && r.cardio ? { title: r.cardio.title, min: r.cardio.min, tip: r.cardio.tip, blocks: r.cardio.blocks, done: false } : null,
      exercises: r ? r.exercises.map(e => mkEx(e.name, e.sets, e.warmup || 0, e.reps, e.rest)) : []
    };
    persist(); tab = 'registro'; render();
  }
  // ---------- aviso de descanso (push) ----------
  // Se programa 2 s más tarde: si la app está abierta, cancela antes de que llegue el aviso.
  function pushPost(path, sec) {
    if (!pushEndpoint || typeof fetch !== 'function') return;
    try {
      fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ endpoint: pushEndpoint, seconds: sec }) }).catch(() => {});
    } catch (e) {}
  }
  const pushRest = sec => pushPost('/api/rest', Math.max(3, Math.round(sec) + 2));
  const pushCancel = () => pushPost('/api/cancel', 3);
  const b64ToBytes = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
  const pushState = () => {
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) return 'unsupported';
    if (Notification.permission === 'denied') return 'denied';
    return pushEndpoint && Notification.permission === 'granted' ? 'on' : 'off';
  };

  function startRest(sec, key) {
    active.rest = { end: Date.now() + sec * 1000, total: sec, key };
    pushRest(sec);
  }
  function pendingSets() {
    return active.exercises.reduce((n, e) => n + e.sets.filter(s => !s.done).length, 0);
  }
  function updateStats() {
    if (!active) return;
    const v = document.getElementById('vol');
    const n = document.getElementById('nsets');
    if (v) v.textContent = thousands(volOf(active.exercises, true));
    const tot = active.exercises.reduce((c, e) => c + e.sets.length, 0);
    const dn = active.exercises.reduce((c, e) => c + e.sets.filter(s => s.done).length, 0);
    if (n) n.textContent = dn;
    const pct = tot ? Math.round(dn * 100 / tot) : 0;
    const bar = document.getElementById('pbar'), pt = document.getElementById('ppct');
    if (bar) bar.style.width = pct + '%';
    if (pt) pt.textContent = pct + ' %';
    active.exercises.forEach((e, i) => {
      const c = document.getElementById('ec' + i);
      if (c) c.textContent = e.sets.filter(s => s.done).length + '/' + e.sets.length;
    });
  }

  const sha = async txt => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('gym-app:' + txt)))).map(b => b.toString(16).padStart(2, '0')).join('');
  const snap = () => ({ v: 2, sessions, body, diet, profile });
  const hasData = d => d && ((d.sessions || []).length + (d.body || []).length) > 0;
  function syncSoon() {
    SYNC.dirty = true; try { localStorage.setItem('gym.syncdirty', 'true'); } catch (e) {}
    if (!SYNC.id) return;
    clearTimeout(SYNC.timer); SYNC.timer = setTimeout(syncNow, 2000);
  }
  function applyRemote(d) {
    sessions = d.sessions || []; body = d.body || [];
    if (d.diet && typeof d.diet === 'object') diet = d.diet;
    if (d.profile && typeof d.profile === 'object') profile = d.profile;
    sessions.forEach(s => { s.name = String(s.name).replace('Cardio 1 · abdomen y cinta', 'Abdomen y cinta').replace('Cardio 2 · abdomen y comba', 'Abdomen y comba'); });
    save(K.s, sessions, true); save(K.b, body, true); save(K.d, diet, true); save(K.p, profile, true);
  }
  function mergeRemote(d) {
    const ids = new Set(sessions.map(x => x.id));
    sessions = sessions.concat((d.sessions || []).filter(x => !ids.has(x.id))).sort((a, b) => a.start - b.start);
    const ts = new Set(body.map(x => x.ts));
    body = body.concat((d.body || []).filter(x => !ts.has(x.ts))).sort((a, b) => a.ts - b.ts);
    diet = Object.assign({}, d.diet || {}, diet);
    profile = Object.assign({}, d.profile || {}, profile);
    save(K.s, sessions, true); save(K.b, body, true); save(K.d, diet, true); save(K.p, profile, true);
  }
  async function syncCall(method, payload) {
    const r = await fetch('/api/sync', { method, headers: { 'content-type': 'application/json', 'x-sync-id': SYNC.id }, body: payload ? JSON.stringify(payload) : undefined, cache: 'no-store' });
    let j = null; try { j = await r.json(); } catch (e) {}
    return { st: r.status, j };
  }
  async function syncNow() {
    if (!SYNC.id || SYNC.busy || typeof fetch !== 'function') return;
    SYNC.busy = true;
    try {
      for (let i = 0; i < 3; i++) {
        const g = await syncCall('GET');
        if (g.st !== 200 || !g.j) throw new Error('get');
        const rd = g.j.data;
        if (g.j.rev > SYNC.rev && hasData(rd)) {
          if (!hasData(snap())) { applyRemote(rd); SYNC.dirty = false; }                 // móvil vacío: recuperar de la nube
          else if (SYNC.dirty || SYNC.rev === 0) { mergeRemote(rd); SYNC.dirty = true; } // cambios en los dos lados: unir
          else { applyRemote(rd); SYNC.dirty = false; }
        }
        SYNC.rev = g.j.rev;
        if (!SYNC.dirty) break;
        if (!hasData(snap())) break;                         // nunca subir una copia vacía
        const p = await syncCall('PUT', { base: SYNC.rev, data: snap() });
        if (p.st === 200) { SYNC.rev = p.j.rev; SYNC.dirty = false; SYNC.t = Date.now(); break; }
        if (p.st !== 409) throw new Error('put');
      }
      SYNC.msg = '';
    } catch (e) { SYNC.msg = 'Sin conexión: se reintentará'; }
    try { localStorage.setItem('gym.syncrev', JSON.stringify(SYNC.rev)); localStorage.setItem('gym.syncdirty', JSON.stringify(SYNC.dirty)); localStorage.setItem('gym.synct', JSON.stringify(SYNC.t)); } catch (e) {}
    SYNC.busy = false;
    // Con una pantalla a pantalla completa abierta no se redibuja por debajo (provocaba parpadeos en las fotos).
    if (!active && !document.querySelector('.fpage') && !(document.activeElement && document.activeElement.tagName === 'INPUT')) render();
  }
  async function syncSetup() {
    const v = await sheet('<h3>Copia en la nube</h3><p class="muted">Elige una frase secreta de 4 palabras o más. Con ella recuperas tus datos en cualquier móvil. Guárdala: si la pierdes, no se puede recuperar.</p><input id="sph" type="text" autocomplete="off" autocapitalize="none" placeholder="frase secreta" style="width:100%;margin-top:10px">',
      [{ label: 'Cancelar', v: null }, { label: 'Activar', cls: 'accent', v: o => o.querySelector('#sph').value }]);
    if (v === null) return;
    const phrase = String(v).trim().toLowerCase().replace(/\s+/g, ' ');
    if (phrase.length < 16) { await sheet('<h3>Frase demasiado corta</h3><p class="muted">Usa al menos 16 caracteres (por ejemplo, 4 palabras).</p>', [{ label: 'Vale', cls: 'accent', v: true }]); return; }
    SYNC.id = await sha(phrase); SYNC.rev = 0; SYNC.dirty = true;
    try { localStorage.setItem('gym.syncid', JSON.stringify(SYNC.id)); } catch (e) {}
    render(); await syncNow();
  }

  function swapPage(base, cur, list, planOf, isRecFn) {
    return new Promise(resolve => {
      const o = document.createElement('div');
      o.className = 'fpage';
      const row = (n, tag) => {
        const i = exInfo(n);
        const label = n === cur ? '✓ Actual' : (isRecFn(base, n) ? 'Recomendado' : tag);
        return `<button class="swr ${n === cur ? 'sel' : ''} ${isRecFn(base, n) && n !== cur ? 'rec' : ''}" data-n="${esc(n)}">
          <div class="swt"><div class="en"><b>${esc(n)}</b><small>${i ? esc(i.m.join(', ')) : ''}</small>
          <span class="plan">${esc(planOf(n))}</span></div>
          <span class="es">${label}</span></div>
          ${i && i.img ? `<div class="swi"><img loading="lazy" alt="" src="${imgSrc(i, 0)}"><img loading="lazy" alt="" src="${imgSrc(i, 1)}"></div>` : ''}</button>`;
      };
      o.innerHTML = `<div class="fhead"><button class="btn small" data-close="1">‹ Volver</button><b>Cambiar ejercicio</b></div>
        <p class="muted" style="margin:6px 4px 12px"><small>Elige un sustituto. La sesión guarda el que elijas.</small></p>
        <h2>Original</h2>${row(base, 'Elegir')}
        <h2>Mismo grupo: ${esc(groupOf(base) || '')}</h2>${list.map(n => row(n, 'Elegir')).join('')}`;
      const done = v => { document.body.removeChild(o); resolve(v); };
      o.addEventListener('touchmove', ev => { if (o.scrollHeight <= o.clientHeight + 1) ev.preventDefault(); }, { passive: false });
      o.addEventListener('click', ev => {
        const b = ev.target.closest('button');
        if (!b) return;
        if (b.dataset.close) done(null);
        else if (b.dataset.n) done(b.dataset.n);
      });
      document.body.appendChild(o);
    });
  }

  function sessionPage(id) {
    const s = sessions.find(x => x.id === id);
    if (!s) return;
    const o = document.createElement('div');
    const min = Math.round((s.end - s.start) / 60000);
    const date = new Date(s.start).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
    const prevS = sessions.filter(x => x.start < s.start).sort((x, y) => y.start - x.start);
    const prevSet = (e, si) => {
      const pe = prevS.map(x => x.exercises.find(y => y.name === e.name)).find(Boolean);
      if (!pe) return null;
      const t = e.sets[si].t; let k = 0;
      for (let i = 0; i < si; i++) if (e.sets[i].t === t) k++;
      return pe.sets.filter(y => y.t === t)[k] || null;
    };
    const nsets = s.exercises.reduce((n, e) => n + e.sets.length, 0);
    const filled = x => x.kg !== '' && x.reps !== '' && x.kg != null && x.reps != null;
    o.className = 'fpage sp';
    o.innerHTML = `<div class="ahead"><div style="min-width:0"><div class="atitle" style="font-size:17px">${esc(s.name)}</div>
        <div class="asub" style="font-size:13px">${esc(date)}</div></div><button class="btn small" data-close="1">Volver</button></div>
      <p class="muted" style="margin:0 4px 14px"><small data-psum>${min} min · ${thousands(volOf(s.exercises, false))} kg · ${nsets} series</small></p>
      ${s.cardio ? `<section class="ccard"><div class="row between"><b>${esc(s.cardio.title)}</b><span class="pill">${s.cardio.min} min</span></div></section>` : ''}
      ${s.exercises.map((ex, ei) => { const cnt = { W: 0, N: 0 }; return `<section class="ex" data-ei="${ei}">
        <div class="exh"><span class="exth">${thumb(ex.name, 'th')}</span><div style="flex:1;min-width:0"><b>${esc(ex.name)}</b>${ex.reps ? `<small>${ex.reps} reps · descanso ${dur(ex.rest)}</small>` : ''}</div><span class="xmv"><button class="btn small" data-pmove="${ei}" data-d="-1" aria-label="Subir ejercicio">↑</button><button class="btn small" data-pmove="${ei}" data-d="1" aria-label="Bajar ejercicio">↓</button></span><span class="ecnt">${ex.sets.filter(filled).length}/${ex.sets.length}</span></div>
        <div class="cols"><span>Serie</span><span>Anterior</span><span>Kg</span><span>Reps</span><span></span></div>
        ${ex.sets.map((x, si) => { const idx = cnt[x.t]++; const p = prevSet(ex, si); return `<div class="set ${filled(x) ? 'done' : ''}" data-ei="${ei}" data-si="${si}">
          <button class="tp ${x.t === 'W' ? 'w' : ''}" data-ptype="1" style="display:flex;align-items:center;justify-content:center" aria-label="Cambiar tipo de serie">${x.t === 'W' ? 'C' : idx + 1}</button>
          <div class="pv">${p ? kgTxt(p.kg) + ' × ' + p.reps : '–'}</div>
          <input data-f="kg" inputmode="decimal" value="${esc(x.kg)}" placeholder="" aria-label="kg"><input data-f="reps" inputmode="numeric" value="${esc(x.reps)}" placeholder="" aria-label="repeticiones">
          <span class="ck" style="display:flex;align-items:center;justify-content:center">${ICON.check}</span></div>`; }).join('')}<div class="xsetbtns"><button class="btn small" data-padd="${ei}">+ Serie</button><button class="btn small" data-pdel="${ei}">− Serie</button></div></section>`; }).join('')}
      <button class="btn full" style="margin-top:18px" data-addpast="1">+ Añadir ejercicio</button>
      <div style="margin-top:56px;padding-top:24px;border-top:1px solid var(--line)"><button class="btn danger full" data-del="1">Borrar sesión</button></div>`;
    o.addEventListener('touchmove', ev => { if (o.scrollHeight <= o.clientHeight + 1) ev.preventDefault(); }, { passive: false });
    // iOS coloca el cursor al final después de enfocar, así que se selecciona con un pequeño retraso.
    o.addEventListener('focusin', ev => { const el = ev.target; if (el.matches && el.matches('input[data-f]')) setTimeout(() => el.select(), 60); });
    // Mantiene al día la línea de resumen (minutos · kg · series) al editar.
    const updSum = () => {
      const el = o.querySelector('[data-psum]');
      if (el) el.textContent = `${min} min · ${thousands(volOf(s.exercises, false))} kg · ${s.exercises.reduce((n, e) => n + e.sets.length, 0)} series`;
    };
    o.addEventListener('input', ev => {
      const inp = ev.target.closest && ev.target.closest('input[data-f]');
      if (!inp) return;
      const row = inp.closest('.set');
      const set = s.exercises[+row.dataset.ei].sets[+row.dataset.si];
      const v = inp.value.trim().replace(',', '.');
      set[inp.dataset.f] = v === '' || isNaN(+v) ? '' : +v;
      if (set.kg !== '' && set.reps !== '') set.done = true;
      save(K.s, sessions);
      updSum();
      row.classList.toggle('done', filled(set));
      const cnt = row.closest('.ex').querySelector('.ecnt');
      cnt.textContent = s.exercises[+row.dataset.ei].sets.filter(filled).length + '/' + s.exercises[+row.dataset.ei].sets.length;
    });
    o.addEventListener('click', async ev => {
      const b = ev.target.closest('button');
      if (!b) return;
      if (b.dataset.close) { document.body.removeChild(o); render(); }
      else if (b.dataset.ptype !== undefined || b.dataset.padd !== undefined || b.dataset.pdel !== undefined) {
        // Todo se actualiza en el mismo DOM (sin redibujar la página, que recargaba las fotos y parpadeaba).
        const sec = b.closest('.ex');
        const ei = +sec.dataset.ei;
        const ex = s.exercises[ei];
        if (b.dataset.ptype !== undefined) { const st = ex.sets[+b.closest('.set').dataset.si]; st.t = st.t === 'W' ? 'N' : 'W'; }
        else if (b.dataset.padd !== undefined) {
          ex.sets.push({ t: 'N', kg: '', reps: '', done: false });
          sec.querySelector('.xsetbtns').insertAdjacentHTML('beforebegin', `<div class="set" data-ei="${ei}" data-si="${ex.sets.length - 1}"><button class="tp" data-ptype="1" style="display:flex;align-items:center;justify-content:center" aria-label="Cambiar tipo de serie">${ex.sets.length}</button><div class="pv">–</div><input data-f="kg" inputmode="decimal" value="" placeholder="" aria-label="kg"><input data-f="reps" inputmode="numeric" value="" placeholder="" aria-label="repeticiones"><span class="ck" style="display:flex;align-items:center;justify-content:center">${ICON.check}</span></div>`);
        } else {
          if (ex.sets.length <= 1) return;
          ex.sets.pop();
          const rows = sec.querySelectorAll('.set');
          rows[rows.length - 1].remove();
        }
        save(K.s, sessions);
        // Recalcula numeración, anterior, contador del ejercicio y resumen en el mismo DOM.
        const cnt = { W: 0, N: 0 };
        const rows = sec.querySelectorAll('.set');
        ex.sets.forEach((x, si) => {
          const idx = cnt[x.t]++;
          const r = rows[si];
          r.dataset.si = si;
          const btn = r.querySelector('[data-ptype]');
          btn.textContent = x.t === 'W' ? 'C' : idx + 1;
          btn.classList.toggle('w', x.t === 'W');
          const p = prevSet(ex, si);
          r.querySelector('.pv').textContent = p ? kgTxt(p.kg) + ' × ' + p.reps : '–';
        });
        sec.querySelector('.ecnt').textContent = ex.sets.filter(filled).length + '/' + ex.sets.length;
        updSum();
      }
      else if (b.dataset.pmove !== undefined) {
        const i = +b.dataset.pmove, d = +b.dataset.d, j = i + d;
        if (j < 0 || j >= s.exercises.length) return;
        [s.exercises[i], s.exercises[j]] = [s.exercises[j], s.exercises[i]];
        save(K.s, sessions);
        const secs = o.querySelectorAll('section.ex');
        if (d < 0) secs[j].parentNode.insertBefore(secs[i], secs[j]);
        else secs[j].parentNode.insertBefore(secs[j], secs[i]);
        // Renumerar índices en el DOM para que las filas sigan apuntando al ejercicio correcto.
        o.querySelectorAll('section.ex').forEach((el, k) => {
          el.dataset.ei = k;
          el.querySelectorAll('.set').forEach(r => { r.dataset.ei = k; });
          el.querySelectorAll('[data-pmove]').forEach(x => { x.dataset.pmove = k; });
        });
      }
      else if (b.dataset.addpast) {
        const added = await addExercise(s);
        if (added) { document.body.removeChild(o); sessionPage(id); }
      }
      else if (b.dataset.del) {
        const ok = await sheet('<h3>Borrar sesión</h3><p class="muted">No se puede deshacer.</p>', [{ label: 'No', v: false }, { label: 'Borrar', cls: 'accent', v: true }]);
        if (ok) { sessions = sessions.filter(x => x.id !== id); save(K.s, sessions); document.body.removeChild(o); render(); }
      }
    });
    // Fotos sin carga diferida: al añadir o quitar series cambia la altura y iOS volvía a cargar las fotos lazy (parpadeo).
    o.querySelectorAll('img[loading]').forEach(i => i.removeAttribute('loading'));
    document.body.appendChild(o);
    return o;
  }

  // Registrar un entreno de un día pasado: eliges rutina y fecha, luego rellenas los pesos en la pantalla de sesión.
  function pastAdd() {
    const o = document.createElement('div');
    o.className = 'fpage sp';
    const today = isoDay(new Date());
    o.innerHTML = `<div class="ahead"><div style="min-width:0"><div class="atitle" style="font-size:17px">Registrar entreno pasado</div></div><button class="btn small" data-close="1">Cancelar</button></div>
      <section class="card" style="cursor:default"><small class="muted">Fecha</small><input type="date" data-pdate value="${today}" max="${today}" style="width:100%;margin-top:6px"></section>
      ${ROUTINES.map(r => `<button class="swr" data-rid="${esc(r.id)}"><div class="en"><b>${esc(r.name)} · ${esc(r.short)}</b><small>${esc(r.day || '')}</small></div></button>`).join('')}
      <button class="swr" data-rid="free"><div class="en"><b>Sesión libre</b></div></button>`;
    o.addEventListener('click', ev => {
      const b = ev.target.closest('button');
      if (!b) return;
      if (b.dataset.close) { document.body.removeChild(o); return; }
      const date = o.querySelector('[data-pdate]').value;
      if (!date) return;
      const r = b.dataset.rid === 'free' ? null : ROUTINES.find(x => x.id === b.dataset.rid);
      const start = new Date(date + 'T18:00:00').getTime();
      const ses = {
        id: start + Math.floor(Math.random() * 1000), routineId: r ? r.id : null,
        name: r ? `${r.name} · ${r.short}` : 'Sesión libre', start, end: start + 60 * 60000,
        cardio: r && r.cardio ? { title: r.cardio.title, min: r.cardio.min, tip: r.cardio.tip, blocks: r.cardio.blocks, done: true } : null,
        exercises: r ? r.exercises.map(e => mkEx(e.name, e.sets, e.warmup || 0, e.reps, e.rest)) : []
      };
      sessions.push(ses);
      sessions.sort((a, b) => a.start - b.start); // siempre ordenadas por fecha del entreno, no por orden de alta
      save(K.s, sessions);
      document.body.removeChild(o);
      render();
      sessionPage(ses.id);
    });
    document.body.appendChild(o);
  }

  async function addExercise(target) {
    const ses = target || active;
    const catalog = Object.keys(window.EXINFO || {});
    const extra = [...new Set([
      ...ROUTINES.flatMap(r => r.exercises.map(e => e.name)),
      ...sessions.flatMap(s => s.exercises.map(e => e.name))
    ])].filter(n => !catalog.includes(n));
    const all = [...catalog, ...extra];
    const fold = t => String(t).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const v = await new Promise(resolve => {
      const o = document.createElement('div');
      o.className = 'fpage xpick';
      const groups = {};
      all.forEach(n => { const g = groupOf(n) || 'Otros'; (groups[g] = groups[g] || []).push(n); });
      const row = n => {
        const i = exInfo(n);
        return `<button class="xrow" data-n="${esc(n)}" data-f="${esc(fold(n))}">${thumb(n, 'th')}<span class="xtx"><b>${esc(n)}</b><small>${i ? esc(i.m.join(', ')) : ''}</small></span></button>`;
      };
      const body = Object.keys(groups).sort((x, y) => x.localeCompare(y, 'es')).map(g =>
        `<div class="egrp" data-grp><h2>${esc(g)}</h2>${groups[g].sort((x, y) => x.localeCompare(y, 'es')).map(row).join('')}</div>`).join('');
      o.innerHTML = `<div class="xtop"><div class="xhead"><button class="btn small" data-close="1">‹ Volver</button><b>Añadir ejercicio</b></div>
        <div class="xsearch"><input id="exsearch" type="search" placeholder="Buscar ejercicio" autocomplete="off" enterkeyhint="search"></div></div>
        <div id="exlistwrap">${body}</div>`;
      const inp = o.querySelector('#exsearch');
      inp.addEventListener('input', () => {
        const q = fold(inp.value.trim());
        o.querySelectorAll('.xrow').forEach(b => { b.style.display = !q || b.dataset.f.includes(q) ? '' : 'none'; });
        o.querySelectorAll('.egrp').forEach(g => { g.style.display = [...g.querySelectorAll('.xrow')].some(b => b.style.display !== 'none') ? '' : 'none'; });
      });
      const done = v => { document.body.removeChild(o); resolve(v); };
      o.addEventListener('click', ev => {
        const b = ev.target.closest('button');
        if (!b) return;
        if (b.dataset.close) done(null);
        else if (b.dataset.n) done(b.dataset.n);
      });
      document.body.appendChild(o);
    });
    if (v) {
      ses.exercises.push(mkEx(v, 3, 0, '', 90));
      if (ses === active) { persist(); render(); } else save(K.s, sessions);
    }
    return v;
  }

  // Récords como en Hevy: peso máximo, 1RM estimado (Epley) y mejor serie (kg × reps).
  const epley = (kg, reps) => (reps > 0 ? kg * (1 + reps / 30) : 0);
  // Récords de una sesión frente a las sesiones anteriores a ella (así el historial sale igual siempre)
  function prsOf(ses) {
    const prev = sessions.filter(x => x.id !== ses.id && x.start < ses.start);
    const out = [];
    ses.exercises.forEach(e => {
      const sets = e.sets.filter(s => s.t === 'N');
      if (!sets.length) return;
      let n = 0, hk = 0, hv = 0;
      prev.forEach(p => p.exercises.forEach(x => {
        if (x.name !== e.name) return;
        x.sets.forEach(s => {
          if (s.t !== 'N') return;
          const kg = +s.kg || 0, reps = +s.reps || 0;
          n++; hk = Math.max(hk, kg); hv = Math.max(hv, kg * reps);
        });
      }));
      if (!n) return;
      const kg = Math.max(0, ...sets.map(s => +s.kg || 0));
      const vol = Math.max(0, ...sets.map(s => (+s.kg || 0) * (+s.reps || 0)));
      const lines = [];
      if (kg > hk) lines.push(`Mayor peso: ${kgTxt(kg)} kg`);
      if (vol > hv) lines.push(`Mayor volumen en una serie: ${thousands(vol)} kg`);
      if (lines.length) out.push({ name: e.name, lines });
    });
    return out;
  }
  function recordsOf(name) {
    const r = { n: 0, kg: 0, rm: 0, vol: 0 };
    sessions.forEach(ss => ss.exercises.forEach(x => {
      if (x.name !== name) return;
      x.sets.forEach(s => {
        if (s.t !== 'N') return;
        const kg = +s.kg || 0, reps = +s.reps || 0;
        r.n++; r.kg = Math.max(r.kg, kg); r.rm = Math.max(r.rm, epley(kg, reps)); r.vol = Math.max(r.vol, kg * reps);
      });
    }));
    return r;
  }
  const TROPHY = '<svg class="trf" fill="#7b1e2b" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h10v3a5 5 0 0 1-10 0V4zM4 5h3v2a4 4 0 0 1-3-2zm13 0h3a4 4 0 0 1-3 2V5zM10.5 14h3v3h2.5v2h-8v-2h2.5v-3z"/></svg>';
  // Sonido de celebración: arpegio ascendente corto (distinto del aviso de fin de descanso).
  function celebrate() {
    ensureAudio();
    const play = () => {
      try {
        if (actx) [523, 659, 784, 1047].forEach((f, i) => {
          const o = actx.createOscillator(), g = actx.createGain();
          o.type = 'triangle'; o.frequency.value = f; g.gain.value = 0.12;
          o.connect(g); g.connect(actx.destination);
          o.start(actx.currentTime + i * 0.11); o.stop(actx.currentTime + i * 0.11 + 0.2);
        });
      } catch (e) {}
    };
    // iOS puede dejar el contexto suspendido/interrumpido: lo reanudamos y luego sonamos
    if (actx && actx.state !== 'running') { try { actx.resume().then(play, play); } catch (e) { play(); } }
    else play();
    try { if (navigator.vibrate) navigator.vibrate([60, 40, 60]); } catch (e) {}
  }
  function showRecord(name, lines) {
    const d = document.createElement('div');
    d.className = 'recbanner';
    d.innerHTML = `<b>🏆 Récord · ${esc(name)}</b><small>${lines.map(esc).join(' · ')}</small>`;
    document.body.appendChild(d);
    let timers = [];
    const close = () => { timers.forEach(clearTimeout); d.classList.add('out'); setTimeout(() => d.remove(), 400); };
    timers.push(setTimeout(close, 3100));
    let y0 = null;
    d.addEventListener('touchstart', ev => { y0 = ev.touches[0].clientY; timers.forEach(clearTimeout); timers = []; }, { passive: true });
    d.addEventListener('touchmove', ev => { if (y0 !== null && ev.touches[0].clientY - y0 < -15) { y0 = null; close(); } }, { passive: true });
    d.addEventListener('click', close);
  }
  async function finish() {
    const pending = pendingSets();
    const ok = await sheet(
      `<h3>Terminar entrenamiento</h3><p class="muted">${pending ? pending + ' series sin completar no se guardarán.' : '¿Guardar el entrenamiento?'}${active.cardio && !active.cardio.done ? ' El cardio no está marcado como hecho.' : ''}</p>`,
      [{ label: 'Seguir', v: false }, { label: 'Terminar', cls: 'accent', v: true }]
    );
    if (!ok) return;
    // Como en Hevy: si el entreno es muy largo, confirmar la duración y poder corregirla
    let endMs = Date.now();
    if (endMs - active.start >= 150 * 60000) {
      const tot = Math.round((endMs - active.start) / 60000);
      const r = await sheet(
        `<h3>¿Seguro que ha durado ${Math.floor(tot / 60)} h ${tot % 60} min?</h3>
         <p class="muted">Es un entrenamiento muy largo. Si te dejaste el cronómetro en marcha, corrige la duración.</p>
         <div class="grid2"><label class="fl"><small class="muted">Horas</small><input id="dh" inputmode="numeric" value="${Math.floor(tot / 60)}"></label>
         <label class="fl"><small class="muted">Minutos</small><input id="dm" inputmode="numeric" value="${tot % 60}"></label></div>`,
        [{ label: 'Seguir entrenando', v: null },
         { label: 'Guardar', cls: 'accent', v: o => ({ h: num(o.querySelector('#dh').value), m: num(o.querySelector('#dm').value) }) }]
      );
      if (!r) return;
      const mins = (isNaN(r.h) ? 0 : r.h) * 60 + (isNaN(r.m) ? 0 : r.m);
      if (mins >= 1 && mins <= tot) endMs = active.start + mins * 60000;
    }
    pushCancel();
    const exs = active.exercises.map(e => ({
      name: e.name,
      sets: e.sets.filter(s => s.done).map(s => ({ t: s.t, kg: num(s.kg) || 0, reps: num(s.reps) }))
    })).filter(e => e.sets.length);
    const cardio = active.cardio && active.cardio.done ? { title: active.cardio.title, min: active.cardio.min } : null;
    if (!exs.length && !cardio) { active = null; persist(); render(); return; }

    const end = endMs;
    const ses = { id: active.id, routineId: active.routineId, name: active.name, start: active.start, end, exercises: exs, cardio };
    const prs = prsOf(ses);
    sessions.push(ses); save(K.s, sessions);
    active = null; overview = false; persist(); tab = 'registro'; render();
    const nsets = exs.reduce((n, e) => n + e.sets.length, 0);
    await sheet(
      `<h3>¡Entrenamiento guardado!</h3><p>${dur((end - ses.start) / 1000)} · ${cardio ? 'Cardio ✓ · ' : ''}${thousands(volOf(exs, false))} kg · ${nsets} series</p>` +
      (prs.length ? `<div class="prsum"><b>Récords de esta sesión</b>${prs.map(p => `<div class="prx"><span>${TROPHY}${esc(p.name)}</span><small class="muted">${p.lines.map(esc).join(' · ')}</small></div>`).join('')}</div>` : ''),
      [{ label: 'Genial', cls: 'accent', v: true }]
    );
  }

  // ---------- vistas ----------
  // Rango de fuerza. Cada ejercicio se compara con la tabla publicada de StrengthLevel (hombres, 1RM / peso corporal):
  // [principiante, novato, intermedio, avanzado, élite]. Solo cuentan ejercicios con tabla del mismo tipo de equipo.
  // 1RM = fórmula de Epley con series de 1 a 12 repeticiones; mancuernas = peso de UNA mancuerna.
  // Percentiles de gimnasio de esos niveles: 5 / 20 / 50 / 80 / 95 %. Se reparten así en la escala Valorant:
  // principiante = Bronce 2, novato = Plata 2, intermedio = Oro 2, avanzado = Diamante 2, élite = Inmortal 1, Radiante = 30 % por encima de élite.
  const STD = {
    'Press de banca inclinado (mancuerna)': [0.25, 0.35, 0.50, 0.65, 0.85],
    // Hombros: tabla de elevación lateral con mancuerna de StrengthLevel (hombres) usada como referencia aproximada para las variantes en polea
    'Elevación lateral (cable)': [0.05, 0.10, 0.20, 0.30, 0.45],
    'Elevación frontal con barra (cable)': [0.05, 0.11, 0.21, 0.32, 0.48],
    'Pájaro en polea (deltoides posterior)': [0.05, 0.10, 0.20, 0.30, 0.45],
    'Aperturas inversas en polea': [0.05, 0.10, 0.20, 0.30, 0.45],
    'Jalón al pecho (cable)': [0.50, 0.75, 1.00, 1.50, 1.75],
    'Extensión de pierna': [0.50, 1.00, 1.25, 1.75, 2.50],
    'Curl de bíceps (mancuerna)': [0.10, 0.15, 0.30, 0.40, 0.55],
    'Remo inclinado (barra)': [0.50, 0.75, 1.00, 1.50, 1.75],
    'Jalón de tríceps con cuerda': [0.20, 0.35, 0.60, 0.85, 1.15],
    'Jalón de tríceps con barra V (polea)': [0.25, 0.45, 0.70, 1.05, 1.40],
    'Jalón al pecho agarre invertido (cable)': [0.50, 0.75, 1.00, 1.50, 1.75],
    'Curl martillo (mancuerna)': [0.10, 0.20, 0.30, 0.40, 0.55],
    'Encogimiento de hombros (mancuerna)': [0.20, 0.35, 0.55, 0.80, 1.10],
    // Las tablas de máquina/polea vienen en kg absolutos (comunidad, ~77 kg de media): se pasan a ratio dividiendo entre 77.
    'Extensión de tríceps por encima de la cabeza (cable)': [0.16, 0.31, 0.53, 0.81, 1.12],
    'Aducción de cadera (máquina)': [0.42, 0.83, 1.42, 2.17, 3.03],
    'Abducción de cadera (máquina)': [0.39, 0.77, 1.31, 1.99, 2.77],
    'Mariposa (Pec Deck)': [0.44, 0.74, 1.13, 1.61, 2.16],
    'Curl de pierna acostado (máquina)': [0.3, 0.52, 0.83, 1.21, 1.64],
    'Remo sentado (máquina)': [0.49, 0.84, 1.31, 1.87, 2.51],
    'Abdominal corto con cable': [0.23, 0.55, 1.0, 1.58, 2.27],
    'Hiperextensión lumbar': [0.39, 0.87, 1.56, 2.44, 3.48],
    'Cables cruzados (de arriba abajo)': [0.06, 0.23, 0.51, 0.88, 1.34]
  };
  const LV = [1.5, 2.5, 3.5, 5.5, 7];
  function vOf(r, st) {
    if (r <= 0) return 0;
    if (r <= st[0]) return r / st[0] * LV[0];
    for (let k = 0; k < 4; k++) if (r <= st[k + 1]) return LV[k] + (r - st[k]) / (st[k + 1] - st[k]) * (LV[k + 1] - LV[k]);
    return Math.min(8, 7 + (r - st[4]) / (st[4] * 0.3));
  }
  function rmOf(name, at) {
    let m = 0;
    sessions.forEach(ss => ss.exercises.forEach(x => {
      if (x.name !== name || (at && ss.start > at)) return;
      x.sets.forEach(s => { const kg = +s.kg || 0, reps = +s.reps || 0; if (s.t === 'N' && kg > 0 && reps >= 1 && reps <= 12) m = Math.max(m, epley(kg, reps)); });
    }));
    return m;
  }
  const TIERS = ['Hierro', 'Bronce', 'Plata', 'Oro', 'Platino', 'Diamante', 'Ascendente', 'Inmortal'];
  const TCOL = ['#8a8f98', '#b07a4a', '#b9c2cc', '#e2b43c', '#4fc3c7', '#8f7cf0', '#7b1e2b', '#e5484d', '#ffd86b'];
  function tierOf(v) {
    if (v >= 8) return { i: 8, name: 'Radiante', sub: 3, pct: 1 };
    v = Math.max(0, v) + 1e-9;
    const i = Math.floor(v), sub = Math.min(2, Math.floor((v - i) * 3));
    return { i, name: TIERS[i] + ' ' + (sub + 1), sub: sub + 1, pct: (v - i) * 3 - sub };
  }
  // Insignia propia (escudo con galones); no copia ningún icono existente.
  function badge(t) {
    const c = TCOL[t.i];
    const mark = t.i === 8
      ? `<path d="M32 22l4 9 10 1-7.5 6.5 2.3 9.7L32 43l-8.8 5.2 2.3-9.7L18 32l10-1z" fill="${c}"/>`
      : [...Array(t.sub)].map((_, k) => `<path d="M21 ${44 - k * 8}l11 -7 11 7" fill="none" stroke="${c}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`).join('');
    return `<svg class="bdg" viewBox="0 0 64 72"><path d="M32 4l24 8v22c0 15-10 26-24 34C18 60 8 49 8 34V12z" fill="#14161a" stroke="${c}" stroke-width="3"/><path d="M32 10l18 6v18c0 11-7 20-18 26-11-6-18-15-18-26V16z" fill="${c}" opacity=".12"/>${mark}</svg>`;
  }
  function rankCard() {
    const head = '<section class="card rank" style="cursor:default"><b class="rk-t">Rango de fuerza</b> <small class="muted">Comparación estimada con gente de tu mismo peso</small>';
    const last = body.length ? body.slice().sort((x, y) => x.ts - y.ts)[body.length - 1] : null;
    const bw = last ? +last.kg : 0;
    if (!(bw > 20)) return head + '<small class="muted">Anota tu peso en Progreso para calcular tu rango.</small></section>';
    const vs = [], vg = [];
    Object.keys(STD).forEach(n => { const rm = rmOf(n); if (rm) { const r = rm / bw; vs.push(vOf(r, STD[n])); vg.push(vOf(r * 1.2, STD[n])); } });
    if (vs.length < 2) return head + '<small class="muted">Registra series (de 1 a 12 reps) en al menos 2 ejercicios con tabla (jalón, press inclinado, extensión de pierna, curl, remo, tríceps, mariposa, aductores…).</small></section>';
    const avg = a => a.reduce((x, y) => x + y, 0) / a.length;
    const g = tierOf(avg(vs)), a = tierOf(avg(vg));
    const half = (t, lbl) => `<div class="rk">${badge(t)}<small class="muted">${lbl}</small><b style="color:${TCOL[t.i]}">${t.name}</b><div class="rkbar"><i style="width:${Math.round(t.pct * 100)}%;background:${TCOL[t.i]}"></i></div></div>`;
    return head + `<div class="rk2">${half(a, 'Gente en general')}${half(g, 'Gente de gimnasio')}</div></section>`;
  }


  // ---------- Tu cuerpo: figura 3D (gira arrastrando) + radar de fuerza ----------
  const AXES = [['Core', 0], ['Hombros', 60], ['Brazos', 120], ['Piernas', 180], ['Espalda', 240], ['Pecho', 300]];
  const AXOF = { Pecho: 'Pecho', Serrato: 'Pecho', Dorsales: 'Espalda', 'Espalda media': 'Espalda', Trapecio: 'Espalda', Lumbares: 'Espalda',
    Hombros: 'Hombros', 'Bíceps': 'Brazos', 'Tríceps': 'Brazos', Antebrazos: 'Brazos', Abdominales: 'Core',
    'Cuádriceps': 'Piernas', Isquios: 'Piernas', Abductores: 'Piernas', Aductores: 'Piernas', 'Glúteos': 'Piernas', Gemelos: 'Piernas' };
  // Nivel de fuerza (0-8, misma escala que el rango) por zona: media de los ejercicios con tabla de esa zona.
  function zoneScores(at) {
    const bs = body.slice().sort((x, y) => x.ts - y.ts);
    const last = at ? (bs.filter(b => b.ts <= at).pop() || bs[0]) : bs[bs.length - 1];
    const bw = last ? +last.kg : 0;
    const acc = {};
    if (bw > 20) Object.keys(STD).forEach(n => {
      const rm = rmOf(n, at), z = AXOF[groupOf(n)];
      if (rm && z) (acc[z] = acc[z] || []).push(vOf(rm / bw, STD[n]));
    });
    const out = {};
    AXES.forEach(([z]) => { out[z] = acc[z] ? acc[z].reduce((a, b) => a + b, 0) / acc[z].length : null; });
    return out;
  }
  function radarSvg(sc, prev) {
    const cx = 100, cy = 95, R = 62, MAX = 8;
    const pt = (deg, r) => { const a = deg * Math.PI / 180; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; };
    const poly = r => AXES.map(([, d]) => pt(d, r).join(',')).join(' ');
    let g = [1, 2, 3, 4].map(k => `<polygon points="${poly(R * k / 4)}" fill="none" stroke="#2a2a2e" stroke-width="1"/>`).join('');
    g += AXES.map(([, d]) => { const [x, y] = pt(d, R); return `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="#2a2a2e" stroke-width="1"/>`; }).join('');
    const poly2 = o => AXES.map(([z, d]) => pt(d, R * Math.min(1, Math.max(0.04, (o[z] || 0) / MAX))).join(',')).join(' ');
    if (prev) g += `<polygon points="${poly2(prev)}" fill="rgba(200,200,210,.14)" stroke="#a9a9b3" stroke-width="2" stroke-linejoin="round"/>`;
    g += `<polygon points="${poly2(sc)}" fill="rgba(123,30,43,.5)" stroke="#cc4560" stroke-width="2" stroke-linejoin="round"/>`;
    g += AXES.map(([z, d]) => { const [x, y] = pt(d, R + 16); const anc = Math.abs(Math.cos(d * Math.PI / 180)) < .2 ? 'middle' : Math.cos(d * Math.PI / 180) > 0 ? 'start' : 'end'; const dx = anc === 'start' ? -8 : anc === 'end' ? 8 : 0;
      return `<text x="${x + dx}" y="${y + 4}" text-anchor="${anc}" font-size="11" fill="#9a9aa2">${z}</text>`; }).join('');
    return `<svg viewBox="-16 0 232 190" class="radar" aria-label="Fuerza por zona">${g}</svg>`;
  }
  function bodyCard() {
    const sc = zoneScores();
    const any = AXES.some(([z]) => sc[z] != null);
    const order = ['Pecho', 'Espalda', 'Hombros', 'Brazos', 'Core', 'Piernas'];
    const bars = order.map(z => { const pc = sc[z] == null ? 0 : Math.round(Math.min(1, sc[z] / 8) * 100);
      return `<div class="zb"><div class="zt"><span>${z}</span><b>${sc[z] == null ? '–' : pc + ' %'}</b></div><div class="zbar"><i style="width:${pc}%"></i></div></div>`; }).join('');
    return `<section class="card bodyc" style="cursor:default"><b class="rk-t">Tu cuerpo</b>
      <div class="bgrid"><div class="chart bfig" id="bodyhost"></div><div class="zbars">${bars}</div></div>
      ${any ? '' : '<small class="muted">Anota tu peso en Progreso y registra series (1–12 reps) para ver tu fuerza por zona.</small>'}<small class="muted bcred">Modelo: Diego Luján García (CC BY 4.0)</small></section>`;
  }
  // Figura hecha con elipsoides; cada pieza pertenece a una zona y se tiñe según su nivel.
  const BODY = (() => {
    const P = [];
    const add = (c, r, z, rz, dim) => P.push({ c, r, z: z || null, rz: rz || 0, dim: !!dim });
    const two = f => { f(1); f(-1); };
    // cabeza y cuello
    add([0, 1.71, 0], [.078, .1, .09], null, 0, 1); add([0, 1.645, .03], [.055, .045, .055], null, 0, 1);
    two(g => add([g * .032, 1.575, 0], [.03, .065, .035], null, g * .1, 1));
    // trapecio
    two(g => add([g * .075, 1.525, -.03], [.1, .04, .055], 'Espalda', -g * .3));
    add([0, 1.39, -.07], [.095, .15, .03], 'Espalda');
    // tronco base
    add([0, 1.26, 0], [.15, .29, .07]);
    // pecho y serrato
    two(g => { add([g * .085, 1.41, .045], [.098, .07, .05], 'Pecho', -g * .12); add([g * .155, 1.29, .03], [.028, .075, .05], 'Pecho'); });
    // abdominales (tableta) y oblicuos
    two(g => { [1.26, 1.18, 1.10].forEach(y => add([g * .033, y, .07], [.03, .036, .025], 'Core')); add([g * .125, 1.17, .03], [.04, .105, .055], 'Core', g * .15); });
    // espalda: dorsales, espalda media, lumbares
    two(g => { add([g * .115, 1.28, -.055], [.075, .15, .04], 'Espalda', g * .22); add([g * .04, 1.07, -.06], [.035, .1, .035], 'Espalda'); });
    // hombros (deltoides) y brazos
    two(g => { add([g * .215, 1.455, .005], [.062, .075, .068], 'Hombros'); add([g * .2, 1.445, -.045], [.045, .06, .042], 'Hombros');
      add([g * .258, 1.32, .028], [.04, .1, .04], 'Brazos', g * .08); add([g * .27, 1.31, -.03], [.04, .1, .036], 'Brazos', g * .08);
      add([g * .297, 1.085, .008], [.04, .125, .04], 'Brazos', g * .05); add([g * .325, .89, .01], [.032, .05, .022], null, 0, 1); });
    // cadera y glúteos
    add([0, .975, 0], [.15, .075, .085]);
    two(g => add([g * .078, .935, -.07], [.085, .085, .07], 'Piernas'));
    // piernas
    two(g => { add([g * .09, .74, .035], [.062, .21, .058], 'Piernas'); add([g * .14, .74, 0], [.043, .19, .05], 'Piernas', g * .03);
      add([g * .055, .62, .04], [.045, .1, .045], 'Piernas'); add([g * .095, .74, -.05], [.068, .2, .05], 'Piernas');
      add([g * .045, .78, 0], [.04, .17, .05], 'Piernas'); add([g * .09, .52, .02], [.045, .04, .045], null, 0, 1);
      add([g * .085, .335, -.04], [.052, .14, .05], 'Piernas'); add([g * .095, .31, .03], [.033, .14, .033], 'Piernas');
      add([g * .09, .04, .05], [.045, .035, .09], null, 0, 1); });
    return P;
  })();
  let bodyRot = 0.5;
  function drawBody(cv, sc) {
    const ctx = cv.getContext('2d'), W = cv.width, H = cv.height, k = H / 1.9;
    ctx.clearRect(0, 0, W, H);
    const cs = Math.cos(bodyRot), sn = Math.sin(bodyRot);
    const quads = [], NU = 14, NV = 9;
    BODY.forEach(pt => {
      const v = pt.z && sc[pt.z] != null ? Math.min(1, sc[pt.z] / 8) : 0;
      const t = .25 + .75 * v, base = pt.dim ? [92, 92, 100] : pt.z && sc[pt.z] != null ? [132 + (204 - 132) * t, 132 + (69 - 132) * t, 140 + (96 - 140) * t] : [132, 132, 140];
      const cz = Math.cos(pt.rz), sz = Math.sin(pt.rz);
      const vert = (i, j) => {
        const th = Math.PI * i / NV, ph = 2 * Math.PI * j / NU;
        let x = pt.r[0] * Math.sin(th) * Math.cos(ph), y = pt.r[1] * Math.cos(th), z = pt.r[2] * Math.sin(th) * Math.sin(ph);
        const nx0 = x / pt.r[0] ** 2, ny0 = y / pt.r[1] ** 2, nz0 = z / pt.r[2] ** 2;
        const x1 = x * cz - y * sz, y1 = x * sz + y * cz;
        const n1x = nx0 * cz - ny0 * sz, n1y = nx0 * sz + ny0 * cz;
        const X = x1 + pt.c[0], Y = y1 + pt.c[1], Z = z + pt.c[2];
        const nl = Math.hypot(n1x, n1y, nz0) || 1;
        return { x: X * cs + Z * sn, y: Y, z: -X * sn + Z * cs, nx: (n1x * cs + nz0 * sn) / nl, ny: n1y / nl, nz: (-n1x * sn + nz0 * cs) / nl };
      };
      const grid = [];
      for (let i = 0; i <= NV; i++) { grid.push([]); for (let j = 0; j <= NU; j++) grid[i].push(vert(i, j)); }
      for (let i = 0; i < NV; i++) for (let j = 0; j < NU; j++) {
        const a = grid[i][j], b = grid[i + 1][j], c = grid[i + 1][j + 1], d = grid[i][j + 1];
        const nz = (a.nz + b.nz + c.nz + d.nz) / 4;
        if (nz < -0.05) continue;
        const nx = (a.nx + b.nx + c.nx + d.nx) / 4, ny = (a.ny + b.ny + c.ny + d.ny) / 4;
        const lum = .22 + .78 * Math.max(0, nx * -.35 + ny * .45 + nz * .82);
        quads.push({ z: (a.z + b.z + c.z + d.z) / 4, p: [a, b, c, d], col: `rgb(${base.map(q => Math.round(q * lum)).join(',')})` });
      }
    });
    quads.sort((a, b) => a.z - b.z);
    ctx.lineWidth = .7; ctx.lineJoin = 'round';
    quads.forEach(q => {
      ctx.beginPath();
      q.p.forEach((v, n) => { const px = W / 2 + v.x * k, py = H - 8 - v.y * k; n ? ctx.lineTo(px, py) : ctx.moveTo(px, py); });
      ctx.closePath(); ctx.fillStyle = q.col; ctx.strokeStyle = q.col; ctx.fill(); ctx.stroke();
    });
  }
  // ---- Visor 3D propio (WebGL, sin librerías): modelo en body.bin, gris teñido de granate por zona ----
  let bodyCv = null, bodyG = null, bodyMode = null, bodyVel = 0, bodyRaf = 0, bodyLoad = null, bodySc = {};
  const ZORD = ['Pecho', 'Espalda', 'Hombros', 'Brazos', 'Core', 'Piernas'];
  const BODY_VS = 'attribute vec3 aPos;attribute vec3 aNor;attribute vec3 aW0;attribute vec3 aW1;uniform vec3 uExt;uniform vec3 uCen;uniform vec3 uL0;uniform vec3 uL1;uniform float uRot;uniform float uAsp;varying vec3 vN;varying float vT;void main(){vec3 p=aPos*uExt+uCen;float c=cos(uRot),s=sin(uRot);vec3 q=vec3(p.x*c+p.z*s,p.y,-p.x*s+p.z*c);vN=vec3(aNor.x*c+aNor.z*s,aNor.y,-aNor.x*s+aNor.z*c);vT=dot(aW0,uL0)+dot(aW1,uL1);gl_Position=vec4(q.x/(0.99*uAsp),(q.y-0.9)/0.99,-q.z*0.5,1.0);}';
  const BODY_FS = 'precision mediump float;varying vec3 vN;varying float vT;void main(){vec3 n=normalize(vN);vec3 L=normalize(vec3(-0.35,0.45,0.82));float d=max(dot(n,L),0.0);float w=max(dot(n,L)*0.5+0.5,0.0);float rim=pow(1.0-max(n.z,0.0),3.0);vec3 base=mix(vec3(0.52,0.52,0.56),vec3(0.88,0.12,0.28),clamp(vT,0.0,1.0));vec3 col=base*(0.2+0.62*d+0.24*w)+vec3(0.9,0.9,1.0)*rim*0.16+vec3(1.0)*pow(max(dot(reflect(-L,n),vec3(0.0,0.0,1.0)),0.0),24.0)*0.1;gl_FragColor=vec4(col,1.0);}';
  function bodyGL(buf) {
    const gl = bodyCv.getContext('webgl2', { antialias: true }) || bodyCv.getContext('webgl', { antialias: true });
    if (!gl) throw new Error('sin webgl');
    gl.getExtension('OES_element_index_uint');
    const dv = new DataView(buf);
    if (dv.getUint32(0, false) !== 0x424f4459) throw new Error('modelo');
    const nv = dv.getUint32(4, true), nt = dv.getUint32(8, true);
    const ext = [0, 1, 2].map(i => dv.getFloat32(16 + i * 4, true)), cen = [0, 1, 2].map(i => dv.getFloat32(28 + i * 4, true));
    let o = 40;
    const pos = new Int16Array(buf, o, nv * 3); o += nv * 6;
    const nor = new Int8Array(buf, o, nv * 4); o += nv * 4;
    const wts = new Uint8Array(buf, o, nv * 6); o += nv * 6;
    const idx = new Uint32Array(buf, o, nt * 3);
    const sh = (t, src) => { const x = gl.createShader(t); gl.shaderSource(x, src); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error('shader'); return x; };
    const pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, BODY_VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, BODY_FS)); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error('link');
    gl.useProgram(pr);
    const buffer = (target, data) => { const b = gl.createBuffer(); gl.bindBuffer(target, b); gl.bufferData(target, data, gl.STATIC_DRAW); return b; };
    const attr = (name, data, size, type, norm, stride, off) => {
      buffer(gl.ARRAY_BUFFER, data);
      const l = gl.getAttribLocation(pr, name); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, size, type, norm, stride, off);
    };
    attr('aPos', pos, 3, gl.SHORT, true, 6, 0);
    attr('aNor', nor, 3, gl.BYTE, true, 4, 0);
    buffer(gl.ARRAY_BUFFER, wts);
    ['aW0', 'aW1'].forEach((nm, k) => { const l = gl.getAttribLocation(pr, nm); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, 3, gl.UNSIGNED_BYTE, true, 6, k * 3); });
    buffer(gl.ELEMENT_ARRAY_BUFFER, idx);
    const u = {}; ['uExt', 'uCen', 'uL0', 'uL1', 'uRot', 'uAsp'].forEach(k => { u[k] = gl.getUniformLocation(pr, k); });
    gl.uniform3f(u.uExt, ext[0], ext[1], ext[2]); gl.uniform3f(u.uCen, cen[0], cen[1], cen[2]);
    gl.enable(gl.DEPTH_TEST); gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK);
    return { gl, u, n: nt * 3 };
  }
  function bodyPaint() {
    if (!bodyCv) return;
    if (bodyMode === 'gl' && bodyG) {
      const { gl, u, n } = bodyG;
      const L = ZORD.map(z => bodySc[z] == null ? 0 : .22 + .78 * Math.pow(Math.min(1, bodySc[z] / 6), .75));
      gl.viewport(0, 0, bodyCv.width, bodyCv.height);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.uniform1f(u.uRot, bodyRot); gl.uniform1f(u.uAsp, bodyCv.width / bodyCv.height);
      gl.uniform3f(u.uL0, L[0], L[1], L[2]); gl.uniform3f(u.uL1, L[3], L[4], L[5]);
      gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_INT, 0);
    } else if (bodyMode === '2d') drawBody(bodyCv, bodySc);
  }
  const bodyRedraw = () => { if (!bodyRaf) bodyRaf = requestAnimationFrame(() => { bodyRaf = 0; bodyPaint(); }); };
  function bodySetup() {
    bodyCv = document.createElement('canvas');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    bodyCv.width = Math.round(176 * dpr); bodyCv.height = Math.round(340 * dpr);
    bodyCv.style.width = '176px'; bodyCv.style.height = '340px';
    let x0 = null, lx = 0, lt = 0;
    bodyCv.addEventListener('pointerdown', e => { x0 = lx = e.clientX; lt = Date.now(); bodyVel = 0; try { bodyCv.setPointerCapture(e.pointerId); } catch (_) {} });
    bodyCv.addEventListener('pointermove', e => {
      if (x0 === null) return;
      const dx = (e.clientX - lx) * 0.012; bodyRot += dx; bodyVel = dx; lx = e.clientX; lt = Date.now(); bodyRedraw();
    });
    const up = () => {
      if (x0 === null) return; x0 = null;
      if (Date.now() - lt > 80) bodyVel = 0;
      const spin = () => { if (Math.abs(bodyVel) < 0.0006 || !bodyCv.isConnected) return; bodyRot += bodyVel; bodyVel *= 0.94; bodyPaint(); requestAnimationFrame(spin); };
      requestAnimationFrame(spin);
    };
    bodyCv.addEventListener('pointerup', up); bodyCv.addEventListener('pointercancel', up);
    bodyLoad = fetch('body.bin?v=1').then(r => r.ok ? r.arrayBuffer() : Promise.reject(new Error('red')))
      .then(buf => { bodyG = bodyGL(buf); bodyMode = 'gl'; })
      .catch(() => { try { if (bodyCv.getContext('2d')) bodyMode = '2d'; } catch (_) {} })
      .then(bodyRedraw);
  }
  function initBody() {
    const host = document.getElementById('bodyhost');
    if (!host) return;
    bodySc = zoneScores();
    if (!bodyCv) bodySetup();
    host.appendChild(bodyCv);
    bodyRedraw();
  }

  function viewRegistro() {
    if (active && !overview) return viewActive();
    const now = new Date();
    const todayIso = isoDay(now);
    const mon = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
    const days = [...Array(7)].map((_, i) => new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + i));
    const set = new Set([...sessions.map(s => isoDay(s.start)), ...(active ? [isoDay(active.start)] : [])]);
    const weekIso = days.map(isoDay);
    const L = 'LMXJVSD';
    const thisMonth = sessions.filter(x => { const d = new Date(x.start); return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth(); }).length;
    const recent = sessions.slice(-3).reverse();
    // Racha: días seguidos con entreno, contando desde hoy (o desde ayer si hoy aún no).
    const dayMs = 86400000;
    const streakFrom = (ts) => { let n = 0; while (set.has(isoDay(ts - n * dayMs))) n++; return n; };
    const cur = streakFrom(now.getTime()) || streakFrom(now.getTime() - dayMs);
    const ds = [...set].sort();
    let best = 0, run = 0, prev = null;
    ds.forEach(k => {
      const t = new Date(k + 'T12:00:00').getTime();
      run = prev !== null && t - prev <= dayMs * 1.5 ? run + 1 : 1;
      prev = t; best = Math.max(best, run);
    });
    // Calendario del mes (de lunes a domingo); se puede cambiar de mes con las flechas.
    const calBase = calM || new Date(now.getFullYear(), now.getMonth(), 1);
    const calFirst = new Date(calBase.getFullYear(), calBase.getMonth(), 1);
    const calOff = (calFirst.getDay() + 6) % 7;
    const calDim = new Date(calBase.getFullYear(), calBase.getMonth() + 1, 0).getDate();
    const calN = Math.ceil((calOff + calDim) / 7) * 7;
    const cal = [...Array(calN)].map((_, i) => new Date(calFirst.getFullYear(), calFirst.getMonth(), 1 - calOff + i));
    const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const calLabel = `${MESES[calFirst.getMonth()]} ${calFirst.getFullYear()}`;
    return `<h1>Registro</h1>
      <section class="card wk" style="cursor:default">
        <div class="wk-top"><div><small class="muted">Racha</small><br><b>${cur}</b></div>
          <div style="text-align:right"><small class="muted">Entrenos mes</small><br><b>${thisMonth}</b></div></div>
        <div class="week" style="margin-top:14px">${days.map((d, i) => `<div class="wd"><small>${L[i]}</small><span class="dot ${set.has(weekIso[i]) ? 'on' : ''} ${weekIso[i] === todayIso ? 'today' : ''}"><b>${d.getDate()}</b></span></div>`).join('')}</div>
        <div class="calslide"><div class="calhead"><b>${calLabel}</b></div>
        <div class="cal">${cal.map(d => `<i class="${d.getMonth() !== calFirst.getMonth() ? 'out' : ''} ${set.has(isoDay(d)) ? 'on' : ''} ${isoDay(d) === todayIso ? 'today' : ''}" title="${isoDay(d)}"></i>`).join('')}</div></div>
      </section>
      ${SYNC.id ? '' : '<button class="btn full" style="margin-top:12px" data-act="syncSetup">Activar copia en la nube (para no perder tus datos)</button>'}
      ${rankCard()}
      ${bodyCard()}
      <h2>Últimas sesiones</h2>
      ${recent.length ? recent.map(s => `<button class="sess" data-act="openSession" data-id="${s.id}"><div class="row between"><div><b>${esc(s.name)}</b><br><small>${dShort(s.start)} · ${s.exercises.length} ejercicios · ${Math.round((s.end - s.start) / 60000)} min</small></div><span class="pill">${sessPill(s)}</span></div>${prLine(s)}</button>`).join('') : '<p class="muted">Todavía no has registrado ningún entrenamiento.</p>'}`;
  }

  // Una fila por tipo de récord: nombre corto (sin paréntesis) y solo el tipo
  const prLine = s => {
    const rows = [];
    prsOf(s).forEach(x => {
      // Nombre corto: sin paréntesis ni palabras de enlace, máximo 3 palabras
      const short = x.name.replace(/\s*\(.*?\)/g, '').split(/\s+/).filter(w => !/^(de|del|la|el|en|por|con|y|a|al)$/i.test(w)).slice(0, 3).join(' ');
      x.lines.forEach(l => rows.push(`<span>${TROPHY}<em>${esc(short)}</em><small class="muted">${l.startsWith('Mayor peso') ? 'Mayor peso' : 'Mayor volumen'} · ${esc(l.split(': ').slice(1).join(': '))}</small></span>`));
    });
    return rows.length ? `<div class="prline">${rows.join('')}</div>` : '';
  };
  const sessPill = s => { const v = volOf(s.exercises, false); return s.cardio ? (v > 0 ? 'Cardio · ' + thousands(v) + ' kg' : 'Cardio') : thousands(v) + ' kg'; };

  function cardioCard(c, live) {
    return `<section class="ccard ${live && c.done ? 'done' : ''}"><div class="row between"><b>${esc(c.title)}</b><span class="pill">${c.min} min</span></div>
      <div class="cblocks">${c.blocks.map(b => `<div class="cb"><span>${esc(b.name)}<small>${esc(b.desc)}</small></span><b>${b.min} min</b></div>`).join('')}</div>
      ${c.tip ? `<p class="muted" style="margin:10px 0 0"><small>${esc(c.tip)}</small></p>` : ''}
      ${live ? `<button class="btn ${c.done ? '' : 'accent'} full" style="margin-top:12px" data-act="cardioDone">${c.done ? '✓ Cardio hecho (toca para desmarcar)' : 'Marcar cardio como hecho'}</button>` : ''}</section>`;
  }

  function viewActive() {
    const total = active.exercises.reduce((n, e) => n + e.sets.length, 0);
    const done = total - pendingSets();
    const exs = active.exercises.map((ex, ei) => {
      const cnt = { W: 0, N: 0 };
      const rows = ex.sets.map((s, si) => {
        const idx = cnt[s.t]++;
        const p = prevOf(ex, si);
        const label = s.t === 'W' ? 'C' : idx + 1;
        const phKg = p ? kgTxt(p.kg) : '';
        const phReps = p ? p.reps : lowReps(ex.reps);
        return `<div class="set ${s.done ? 'done' : ''}" data-e="${ei}" data-s="${si}">
          <button class="tp ${s.t === 'W' ? 'w' : ''}" data-act="toggleType" title="Calentamiento / normal">${label}${s.rec ? TROPHY : ''}</button>
          <div class="pv">${p ? kgTxt(p.kg) + ' × ' + p.reps : '–'}</div>
          <input inputmode="decimal" data-f="kg" placeholder="${esc(phKg)}" value="${esc(s.kg)}" aria-label="kg">
          <input inputmode="numeric" data-f="reps" placeholder="${esc(phReps)}" value="${esc(s.reps)}" aria-label="repeticiones">
          <button class="ck" data-act="check" aria-label="Completar serie">${ICON.check}</button>
        </div>`;
      }).join('');
      return `<section class="ex" data-e="${ei}">
        <div class="exh">${reorderMode ? `<span class="dragh" data-drag="1" aria-label="Arrastrar para reordenar">≡</span>` : ''}<button class="exth" data-act="exinfo" data-ex="${esc(ex.name)}">${thumb(ex.name, 'th')}</button><div style="flex:1;min-width:0"><b>${esc(ex.name)}</b><small>${ex.reps ? ex.reps + ' reps · ' : ''}descanso ${dur(ex.rest)}</small></div><span class="ecnt" id="ec${ei}">${ex.sets.filter(s => s.done).length}/${ex.sets.length}</span></div>
        <div class="cols"><span>Serie</span><span>Anterior</span><span>Kg</span><span>Reps</span><span></span></div>
        ${rows}
        <div class="exf" data-e="${ei}">
          <button class="btn small" data-act="addSet">+ Serie</button>
          <button class="btn small" data-act="delSet">− Serie</button>
          <button class="btn small danger" data-act="delEx">Quitar</button>
        </div>
        <button class="btn full" style="margin-top:8px" data-act="reorder">${reorderMode ? 'Listo' : 'Reordenar'}</button>
        ${candidatesOf(ex.orig || ex.name).length ? `<button class="btn full" style="margin-top:8px" data-act="swapEx" data-e="${ei}">Cambiar ejercicio</button>` : ''}
      </section>`;
    }).join('');
    return `<div class="ahead fixtop"><div><div class="atitle">${esc(active.name)}</div>
        <div class="asub"><span id="elapsed">${dur((Date.now() - active.start) / 1000)}</span> · <span id="vol">${thousands(volOf(active.exercises, true))}</span> kg · <span id="nsets">${done}</span>/${total} series · <span id="ppct">${total ? Math.round(done * 100 / total) : 0} %</span></div></div>
        <button class="btn accent" data-act="finish">Terminar</button>
        <div class="pbar"><i id="pbar" style="width:${total ? Math.round(done * 100 / total) : 0}%"></i></div></div>
      <div class="ahead-sp"></div>
      ${exs || '<p class="muted">Sesión libre: añade tu primer ejercicio.</p>'}
      <button class="btn full" data-act="addEx">+ Añadir ejercicio</button>
      ${active.cardio ? '<div style="height:14px"></div>' + cardioCard(active.cardio, true) : ''}
      <button class="btn full danger" style="margin-top:10px" data-act="cancel">Cancelar entrenamiento</button>`;
  }

  // ---------- ejercicios: miniaturas y detalle ----------
  let openR = null;
  const exInfo = n => (window.EXINFO || {})[n] || null;
  const imgSrc = (i, k) => `/img/ex/${encodeURIComponent(i.img)}/${k}.${i.ext || 'jpg'}`;
  const thumb = (n, cls) => {
    const i = exInfo(n);
    return i && i.img ? `<img class="${cls}" loading="lazy" alt="" src="${imgSrc(i, 0)}">`
             : `<div class="${cls} ph">${ICON.registro}</div>`;
  };
  function routineMuscles(r) {
    const m = {};
    r.exercises.forEach(e => {
      const i = exInfo(e.name);
      if (!i) return;
      const w = e.sets - (e.warmup || 0);
      i.m.forEach(x => { m[x] = (m[x] || 0) + w; });
    });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }
  const routineMin = r => Math.round((r.exercises.reduce((s, e) => s + e.sets * (45 + e.rest), 0) / 60 + (r.cardio ? r.cardio.min : 0)) / 5) * 5;

  function exSheet(name) {
    const i = exInfo(name);
    const le = lastEx(name);
    const rec = recordsOf(name);
    const best = rec.kg;
    const last = le ? le.sets.filter(s => s.t === 'N').map(s => `${kgTxt(s.kg)}×${s.reps}`).join(' · ') : '';
    return sheet(
      `<h3>${esc(name)}</h3>
       ${i && i.img ? `<div class="flip"><img src="${imgSrc(i, 0)}" alt=""><img src="${imgSrc(i, 1)}" alt=""></div>` : ''}
       ${i ? `<div class="mchips" style="margin-top:12px">${i.m.map(m => `<span class="mchip on">${esc(m)}</span>`).join('')}${i.s.map(m => `<span class="mchip">${esc(m)}</span>`).join('')}</div>` : ''}
       <div class="exstats"><div><small>Mejor peso</small><b>${best ? kgTxt(best) + ' kg' : '–'}</b></div>
       <div><small>Última vez</small><b>${esc(last || '–')}</b></div>
       <div><small>Mejor serie</small><b>${rec.vol ? thousands(rec.vol) + ' kg' : '–'}</b></div></div>`,
      [{ label: 'Cerrar', cls: 'accent', v: true }]
    );
  }

  function pushCard() {
    const st = pushState();
    const txt = { on: 'Activado: te avisaré cuando acabe el descanso aunque tengas el móvil bloqueado.',
      off: 'Recibe una notificación cuando acabe el descanso, sin tener que mirar la app.',
      denied: 'Los avisos están bloqueados. Actívalos en Ajustes del iPhone → Notificaciones → esta app.',
      unsupported: 'Abre la app desde el icono de la pantalla de inicio para poder activar los avisos.' }[st];
    return `<section class="card"><b style="font-size:17px">Aviso de descanso</b><p class="muted" style="margin:6px 0 10px"><small>${txt}</small></p>
      ${st === 'on' ? '<button class="btn small danger" data-act="pushOff">Desactivar</button>'
        : st === 'off' ? '<button class="btn accent full" data-act="pushOn">Activar avisos</button>' : ''}</section>`;
  }

  function viewRutinas() {
    return `<h1>Rutinas</h1>
      <p class="muted"><small>Para cambiar una rutina, dímelo en el chat con Claude y se actualiza al reabrir la app. Versión ${esc(window.ROUTINES_VERSION || '')}</small></p>
      ${ROUTINES.map(r => {
        const open = openR === r.id;
        const series = r.exercises.reduce((n, e) => n + e.sets, 0);
        const mus = routineMuscles(r).slice(0, 4);
        return `<section class="rcard">
          <div class="rhead" data-act="toggleR" data-id="${r.id}">
            <div class="badge">${esc(r.badge || r.id.replace(/\D/g, ''))}</div>
            <div class="rt"><b>${esc(r.short)}</b><small>${r.day ? esc(r.day) + ' · ' : ''}${r.exercises.length} ejercicios · ${series} series · ~${routineMin(r)} min</small></div>
            <span class="chev">${open ? '▾' : '▸'}</span>
          </div>
          <div class="mchips">${mus.map(([m, n]) => `<span class="mchip">${esc(m)} <b>${n}</b></span>`).join('')}</div>
          ${open ? `<section class="ccard rbox"><div class="elist">${r.exercises.map(e => {
            const i = exInfo(e.name);
            return `<button class="erow" data-act="exinfo" data-ex="${esc(e.name)}">${thumb(e.name, 'th')}
              <div class="en"><b>${esc(e.name)}</b><small>${i ? esc(i.m.join(', ')) : ''}</small></div>
              <span class="es">${e.sets} × ${esc(e.reps)}${e.warmup ? `<small><br>${e.warmup} calent.</small>` : ''}</span></button>`;
          }).join('')}</div></section>
          ${r.cardio ? cardioCard(r.cardio, false) : ''}`
          : ''}
          <button class="btn accent full" data-act="start" data-id="${r.id}">Empezar rutina</button>
        </section>`;
      }).join('')}
      <button class="card dashed" data-act="start" data-id="free">+ Sesión libre</button>
      ${pushCard()}`;
  }

  const BM = [
    { k: 'kg', n: 'Peso', u: 'kg' }, { k: 'f', n: '% grasa', u: '%' }, { k: 'fm', n: 'Masa grasa', u: 'kg' },
    { k: 'ffm', n: 'Masa libre de grasa', u: 'kg' }, { k: 'wat', n: 'Agua corporal', u: '%' },
    { k: 'wk', n: 'Masa de agua', u: 'kg' }, { k: 'w', n: 'Cintura', u: 'cm' }
  ];
  const nv = v => (v === null || v === undefined || isNaN(v)) ? null : v;
  function bval(b, k) {
    if (k === 'fm') { if (nv(b.fm) !== null) return b.fm; return nv(b.f) !== null ? b.kg * b.f / 100 : null; }
    if (k === 'ffm') {
      if (nv(b.ffm) !== null) return b.ffm;
      const fm = bval(b, 'fm'); return fm !== null ? b.kg - fm : null;
    }
    if (k === 'wk') { if (nv(b.wk) !== null) return b.wk; return nv(b.wat) !== null ? b.kg * b.wat / 100 : null; }
    if (k === 'wat') { if (nv(b.wat) !== null) return b.wat; return nv(b.wk) !== null ? b.wk / b.kg * 100 : null; }
    return nv(b[k]);
  }
  const bfmt = (v, u) => kgTxt(Math.round(v * 10) / 10) + (u ? ' ' + u : '');
  const bUnit = k => BM.find(m => m.k === k).u;

  function chart(k) {
    const pts = body.map(b => ({ t: b.ts, v: bval(b, k) })).filter(p => p.v !== null).slice(-40);
    if (pts.length < 2) return '<p class="muted">Añade al menos 2 registros de esta medida para ver la gráfica.</p>';
    const vs = pts.map(p => p.v);
    const pad2 = (Math.max(...vs) - Math.min(...vs)) * 0.15 || 0.3;
    const mn = Math.min(...vs) - pad2, mx = Math.max(...vs) + pad2;
    const t0 = pts[0].t, t1 = pts[pts.length - 1].t || 1;
    const W = 320, H = 120;
    const x = t => 12 + (t1 === t0 ? 0 : (t - t0) / (t1 - t0)) * (W - 24);
    const y = v => H - 12 - (v - mn) * (H - 24) / (mx - mn);
    const d = pts.map((p, i) => (i ? 'L' : 'M') + x(p.t).toFixed(1) + ' ' + y(p.v).toFixed(1)).join(' ');
    const u = bUnit(k);
    return `<svg viewBox="0 0 ${W} ${H}" class="chart"><path d="${d}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
      ${pts.map(p => `<circle cx="${x(p.t).toFixed(1)}" cy="${y(p.v).toFixed(1)}" r="3" fill="var(--accent)"/>`).join('')}</svg>
      <div class="row between muted"><small>${dShort(t0)}</small><small>mín ${bfmt(Math.min(...vs), u)} · máx ${bfmt(Math.max(...vs), u)}</small><small>${dShort(t1)}</small></div>`;
  }

  const bField = (id, label, v, ph) => `<label class="fl"><small class="muted">${label}</small><input class="t" id="${id}" inputmode="decimal" placeholder="${ph || ''}" value="${nv(v) !== null ? String(v).replace('.', ',') : ''}"></label>`;

  function bodyRow(b) {
    const ex = [['f', '% grasa'], ['fm', 'grasa'], ['w', 'cintura']].map(([k, n]) => {
      const v = bval(b, k); return v !== null ? `${bfmt(v, bUnit(k))} ${n}` : '';
    }).filter(Boolean).join(' · ');
    return `<button class="brow" data-act="openBody" data-ts="${b.ts}"><div class="row between"><span>${dShort(b.ts)} ${new Date(b.ts).getFullYear()}</span><b>${kgTxt(b.kg)} kg</b></div>${ex ? `<small class="muted">${ex}</small>` : ''}</button>`;
  }

  // Comparación de fuerza por zona con tu yo de hace 1, 3 o 9 meses
  let cmpM = 1, histOpen = false, calM = null;
  function radarCard() {
    const now = zoneScores();
    const atD = new Date(); atD.setMonth(atD.getMonth() - cmpM);
    const at = cmpM ? atD.getTime() : 0;
    const hasPrev = cmpM && sessions.some(x => x.start <= at);
    const prev = hasPrev ? zoneScores(at) : null;
    const lbl = cmpM === 1 ? 'Hace 1 mes' : 'Hace ' + cmpM + ' meses';
    const chips = [1, 3, 9].map(m => `<button class="chip ${m === cmpM ? 'on' : ''}" data-act="cmp" data-m="${m}">${m === 1 ? '1 mes' : m + ' meses'}</button>`).join('');
    return `<h2>Fuerza por zona</h2><section class="card radcard" style="cursor:default">
      <small class="muted">Compárate con tu yo de hace…</small>
      <div class="chips" style="margin:8px 0 4px">${chips}</div>
      ${radarSvg(now, prev)}
      <div class="rleg"><span><i style="background:#cc4560"></i>Ahora</span>${cmpM ? `<span><i style="background:#a9a9b3"></i>${lbl}</span>` : ''}</div>
      ${cmpM && !hasPrev ? `<small class="muted">Todavía no hay entrenos de ${lbl.toLowerCase()} para comparar.</small>` : ''}</section>`;
  }

  function bHead(k) {
    const cur = BM.find(m => m.k === k);
    const lastB = body.length ? body[body.length - 1] : null;
    const lastV = lastB ? bval(lastB, k) : null;
    const prevB = body.filter(b => bval(b, k) !== null);
    const delta = prevB.length > 1 ? bval(prevB[prevB.length - 1], k) - bval(prevB[0], k) : null;
    const last7 = body.slice(-7);
    const avg = last7.length ? last7.reduce((a, b) => a + b.kg, 0) / last7.length : null;
    return `<div class="row between" style="margin-bottom:8px"><span><b style="font-size:22px">${lastV !== null ? bfmt(lastV, cur.u) : '–'}</b> <small class="muted">${cur.n}</small></span>
      <small class="muted">${delta !== null ? (delta > 0 ? '+' : '') + bfmt(delta, cur.u) + ' desde ' + dShort(prevB[0].ts) : ''}${k === 'kg' && avg ? ` · media ${last7.length}: ${kgTxt(avg)} kg` : ''}</small></div>`;
  }
  function statsPage() {
    const o = document.createElement('div');
    o.className = 'fpage sp pin';
    let m = 'kg';
    const avail = BM.filter(x => body.some(b => bval(b, x.k) !== null));
    const draw = () => {
      o.innerHTML = `<div class="ahead"><div style="min-width:0"><div class="atitle" style="font-size:17px">Estadísticas</div>
        <div class="asub" style="font-size:13px">Medidas corporales</div></div><button class="btn small" data-close="1">Volver</button></div>
        <div class="chips" style="margin:6px 0 14px">${avail.map(x => `<button class="chip ${x.k === m ? 'on' : ''}" data-k="${x.k}">${x.n}</button>`).join('')}</div>
        ${bHead(m)}${chart(m)}`;
    };
    o.addEventListener('click', ev => {
      const b = ev.target.closest('button');
      if (!b) return;
      if (b.dataset.close) { o.classList.remove('pin'); o.classList.add('pout'); setTimeout(() => { if (o.parentNode) document.body.removeChild(o); render(); }, 280); }
      else if (b.dataset.k) { m = b.dataset.k; draw(); }
    });
    draw();
    document.body.appendChild(o);
  }

  function viewProgreso() {
    const last7 = body.slice(-7);
    const avg = last7.length ? last7.reduce((a, b) => a + b.kg, 0) / last7.length : null;
    const lastB = body.length ? body[body.length - 1] : null;
    const firstB = body.length ? body[0] : null;
    const h = profile.h;
    const imc = lastB && h ? lastB.kg / Math.pow(h / 100, 2) : null;
    const d = bDraft || {};
    const dDay = d.ts ? isoDay(d.ts) : isoDay(Date.now());
    const avail = BM.filter(m => body.some(b => bval(b, m.k) !== null));
    if (!avail.some(m => m.k === bmetric)) bmetric = 'kg';
    const cur = BM.find(m => m.k === bmetric);
    const lastV = lastB ? bval(lastB, bmetric) : null;
    const prevB = body.filter(b => bval(b, bmetric) !== null);
    const delta = prevB.length > 1 ? bval(prevB[prevB.length - 1], bmetric) - bval(prevB[0], bmetric) : null;
    const list = bAll ? body.slice().reverse() : body.slice(-8).reverse();
    let nextW = '';
    if (lastB) {
      const ld = new Date(lastB.ts); ld.setHours(0, 0, 0, 0);
      const nd = new Date(ld); nd.setMonth(nd.getMonth() + 1);
      const t0 = new Date(); t0.setHours(0, 0, 0, 0);
      const dd = Math.round((nd - t0) / 86400000);
      const fd = nd.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
      nextW = `<div class="nextw"><div class="row between"><small class="muted">Próximo pesaje</small><small class="nwd">${dd > 1 ? 'en ' + dd + ' días' : dd === 1 ? 'mañana' : dd === 0 ? 'hoy' : 'toca ya · hace ' + (-dd) + (dd === -1 ? ' día' : ' días')}</small></div><b>${fd}</b></div>`;
    }
    return `<h1>Progreso</h1>
      <h2 style="margin-top:0">Medidas corporales</h2>
      ${nextW}
      <section class="card">
        <div class="grid2">
          <label class="fl"><small class="muted">Fecha</small><input class="t" type="date" id="bdate" value="${dDay}" max="${isoDay(Date.now())}"></label>
          ${bField('bkg', 'Peso (kg) *', d.kg, 'Obligatorio')}
        </div>
        <div class="grid2" style="margin-top:8px">
          <label class="fl"><small class="muted">Altura (cm), fija</small><input class="t" id="hcm" inputmode="decimal" value="${h ? String(h).replace('.', ',') : ''}"></label>
          <div class="fl"><small class="muted">IMC</small><div class="imc">${imc ? kgTxt(Math.round(imc * 10) / 10) : '–'}</div></div>
        </div>
        <details ${bDraft ? 'open' : ''} style="margin-top:10px"><summary>Más medidas (opcional)</summary>
          <div class="grid2" style="margin-top:8px">
            ${bField('bf', '% grasa corporal', d.f)}
            ${bField('bfm', 'Masa grasa (kg)', d.fm)}
            ${bField('bffm', 'Masa libre de grasa (kg)', d.ffm)}
            ${bField('bwat', 'Agua corporal (%)', d.wat)}
            ${bField('bwk', 'Masa de agua (kg)', d.wk)}
            ${bField('bw', 'Cintura (cm)', d.w)}
          </div>
          <p class="muted" style="margin:8px 0 0"><small>Si pones el peso y el % de grasa, la masa grasa y la masa libre de grasa se calculan solas; con el % de agua, la masa de agua.</small></p>
        </details>
        <button class="btn accent full" style="margin-top:12px" data-act="saveBody">${bDraft ? 'Guardar cambios' : 'Guardar'}</button>
        ${bDraft ? '<button class="btn full" style="margin-top:8px" data-act="cancelBody">Cancelar edición</button>' : ''}
      </section>
      <button class="chartbtn" data-act="openStats" style="margin-top:14px">${bHead('kg')}${chart('kg')}</button>
      ${radarCard()}
      <h2>Registros</h2>
      ${list.length ? list.map(bodyRow).join('') : '<p class="muted">Todavía no hay registros.</p>'}
      ${body.length > 8 ? `<button class="btn full" style="margin-top:8px" data-act="bAll">${bAll ? 'Ver menos' : 'Ver todos (' + body.length + ')'}</button>` : ''}
      <button class="hhead" data-act="toggleHist"><h2>Historial${sessions.length ? ' (' + sessions.length + ')' : ''}</h2><span class="harrow ${histOpen ? 'open' : ''}">⌄</span></button>
      ${histOpen ? `<div class="hbody">${`
      <button class="btn full" style="margin-bottom:10px" data-act="pastAdd">+ Registrar entreno pasado</button>
      ${sessions.length ? sessions.slice().reverse().map(s => `<button class="sess" data-act="openSession" data-id="${s.id}">
        <div class="row between"><div><b>${esc(s.name)}</b><br><small>${dShort(s.start)} · ${Math.round((s.end - s.start) / 60000)} min</small></div><span class="pill">${sessPill(s)}</span></div>${prLine(s)}</button>`).join('') : '<p class="muted">Aquí aparecerán tus entrenamientos.</p>'}`}</div>` : ''}
      <h2>Copia en la nube</h2>
      ${SYNC.id ? `<p class="muted"><small>${SYNC.msg || (SYNC.dirty ? 'Pendiente de subir…' : SYNC.t ? 'Última copia: ' + new Date(SYNC.t).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Activada')}</small></p><div class="row"><button class="btn" data-act="syncNow">Sincronizar ahora</button></div>`
        : '<p class="muted"><small>Sin activar: tus datos solo viven en este móvil.</small></p><div class="row"><button class="btn accent" data-act="syncSetup">Activar copia en la nube</button></div>'}`;
  }

  // ---------- dieta ----------
  const OIL_KCAL = 120;
  function dayDiet() {
    const k = isoDay(Date.now());
    if (!diet[k]) diet[k] = {};
    return diet[k];
  }
  function saveDiet() {
    const ks = Object.keys(diet).sort();
    while (ks.length > 60) delete diet[ks.shift()];
    save(K.d, diet);
  }
  function optVals(o, c) {
    const skip = c.skip || [];
    if (!o.kc) return { k: o.kcal + (c.oil || 0) * OIL_KCAL, p: o.p };
    let k = 0, p = 0;
    o.kc.forEach((v, i) => { if (!skip.includes(i)) { k += v; p += o.pr[i]; } });
    return { k: k + (c.oil || 0) * OIL_KCAL, p };
  }
  function dietTotals(day) {
    const D = window.DIET || { slots: [], options: [] };
    let eaten = 0, prot = 0, plan = 0, planP = 0;
    D.slots.forEach(s => {
      const c = day[s.id];
      if (!c) return;
      const o = D.options.find(x => x.id === c.opt);
      if (!o) return;
      const v = optVals(o, c);
      plan += v.k;
      planP += v.p;
      if (c.done) { eaten += v.k; prot += v.p; }
    });
    return { eaten, prot, plan, planP };
  }
  function mealCard(slot, o, c) {
    const v = optVals(o, c);
    return `<div class="meal ${c.done ? 'done' : ''}">
      <div class="row between"><b>${esc(o.name)}</b><span class="pill">${thousands(v.k)} kcal</span></div>
      <small>${v.p} g proteína · ${o.min} min${c.oil ? ' · +' + c.oil + ' cda aceite' : ''}</small>
      <ul class="ings">${o.ingredients.map((i, n) => { const off = (c.skip || []).includes(n); return `<li><button class="ing ${off ? 'off' : ''}" data-act="dietIng" data-slot="${slot}" data-i="${n}"><span class="ck2">${off ? '' : '✓'}</span><span>${esc(i)}</span></button></li>`; }).join('')}</ul>
      ${(c.skip || []).length ? `<p class="muted"><small>Sin: ${(c.skip || []).map(n => esc(o.ingredients[n].replace(/\s*\(.*\)$/, ''))).join(', ')}. Kcal y proteína ya descontadas.</small></p>` : ''}
      <details><summary class="muted">Cómo se hace</summary><p>${esc(o.steps)}</p></details>
      ${o.note ? `<p class="muted"><small>${esc(o.note)}</small></p>` : ''}
      <div class="row">
        <div class="row" style="gap:6px">
          <button class="btn small" data-act="dietOil" data-slot="${slot}" data-d="-1">−</button>
          <small>aceite ${c.oil || 0} cda</small>
          <button class="btn small" data-act="dietOil" data-slot="${slot}" data-d="1">+</button>
        </div>
        <button class="btn small ${c.done ? '' : 'accent'}" style="margin-left:auto" data-act="dietDone" data-slot="${slot}">${c.done ? '✓ Comido' : 'Marcar comido'}</button>
      </div></div>`;
  }
  function viewDieta() {
    const D = window.DIET;
    const T = window.DIET_TARGET || { kcal: 2700, protein: 120 };
    if (!D) return '<h1>Dieta</h1><p class="muted">No hay datos de dieta.</p>';
    const day = dayDiet();
    const tot = dietTotals(day);
    const pct = Math.min(100, 100 * tot.eaten / T.kcal);
    const ppct = Math.min(100, 100 * tot.prot / T.protein);
    const meals = D.slots.map(s => {
      const opts = D.options.filter(o => o.slot === s.id);
      const c = day[s.id];
      const sel = c ? opts.find(o => o.id === c.opt) : null;
      return `<h2>${esc(s.name)}</h2>
        <div class="chips">${opts.map(o => `<button class="chip ${sel && sel.id === o.id ? 'on' : ''}" data-act="dietPick" data-slot="${s.id}" data-opt="${o.id}">${esc(o.short)}</button>`).join('')}</div>
        ${sel ? mealCard(s.id, sel, c) : '<p class="muted"><small>Elige una opción.</small></p>'}`;
    }).join('');
    return `<h1>Dieta</h1>
      <div class="card" style="cursor:default">
        <div class="row between"><b style="margin:0">${thousands(tot.eaten)} <small>/ ${thousands(T.kcal)} kcal</small></b><small>plan del día: ${thousands(tot.plan)}</small></div>
        <div class="bar"><div style="width:${pct}%"></div></div>
        <div class="row between" style="margin-top:10px"><span>${Math.round(tot.prot)} <small>/ ${T.protein} g proteína</small></span><small>plan del día: ${Math.round(tot.planP)} g</small></div>
        <div class="bar"><div style="width:${ppct}%"></div></div>
      </div>
      ${meals}
      <p class="muted" style="margin-top:16px"><small>Suplementos: creatina todos los días (sin kcal). La proteína del yogur ya va contada en el desayuno de yogur.</small></p>
      <p class="muted" style="margin-top:20px"><small>Cifras aproximadas. Si en 3 semanas el peso no sube, sumamos aceite o mantequilla. Para cambiar el menú, dímelo en el chat.</small></p>`;
  }

  function renderRest() {
    if (active && active.rest) {
      const left = Math.max(0, (active.rest.end - Date.now()) / 1000);
      $rest.innerHTML = `<div class="rest"><div class="rest-fill" id="restFill" style="width:${100 * left / active.rest.total}%"></div>
        <span id="restTxt">${dur(left)}</span>
        <button class="btn" data-act="restm">−15</button><button class="btn" data-act="restp">+15</button><button class="btn" data-act="restskip">Saltar</button></div>`;
    } else $rest.innerHTML = '';
  }

  function render() {
    if (!active) overview = false;
    const order = ['registro', 'rutinas', 'dieta', 'progreso'];
    if (!$tabs.querySelector('.ind')) $tabs.insertAdjacentHTML('afterbegin', '<i class="ind"></i>');
    $tabs.querySelectorAll('button').forEach(b => b.remove());
    $tabs.insertAdjacentHTML('beforeend', order.map(t =>
      `<button class="${tab === t ? 'on' : ''}" data-act="tab" data-t="${t}">${ICON[t]}<span>${t[0].toUpperCase() + t.slice(1)}</span></button>`).join(''));
    $tabs.style.setProperty('--ti', order.indexOf(tab));
    let html = '';
    if (active && (tab !== 'registro' || overview)) {
      html += `<div class="bsticky"><button class="banner" data-act="backActive"><span>Entrenamiento en curso</span><span>Volver →</span></button></div>`;
    }
    html += tab === 'registro' ? viewRegistro() : tab === 'rutinas' ? viewRutinas() : tab === 'dieta' ? viewDieta() : viewProgreso();
    const old = $view.innerHTML, oldTab = lastTab;
    $view.innerHTML = html;
    initBody();
    if (tab !== lastTab) {
      if (oldTab !== null && old && $view.parentNode && $view.getBoundingClientRect) {
        const r = $view.getBoundingClientRect(), g = document.createElement('div');
        g.className = 'ghost';
        g.style.cssText = `top:${r.top}px;left:${r.left}px;width:${r.width}px;--gdir:${order.indexOf(tab) > order.indexOf(oldTab) ? -1 : 1};--dur:${Math.abs(order.indexOf(tab) - order.indexOf(oldTab)) > 1 ? '.38s' : '.52s'}`;
        g.innerHTML = old;
        $view.parentNode.appendChild(g);
        setTimeout(() => g.remove(), 560);
      }
      const from = order.indexOf(lastTab), to = order.indexOf(tab), jump = Math.abs(to - from);
      $view.style.setProperty('--dir', lastTab === null || to > from ? 1 : -1);
      $view.style.setProperty('--dur', jump > 1 ? '.38s' : '.52s');
      lastTab = tab;
      $view.classList.remove('enter'); void $view.offsetWidth; $view.classList.add('enter');
    }
    renderRest();
    keepAwake();
  }

  const toTop = () => { try { document.body.scrollTop = 0; window.scrollTo(0, 0); } catch (e) {} };

  // ---------- arrastrar el calendario del registro para cambiar de mes (desliza como las pestañas) ----------
  (function () {
    let sx = 0, sy = 0, on = false, el = null, dx = 0, busy = false;
    const grid = () => document.querySelector('.calslide');
    document.addEventListener('touchstart', ev => {
      if (busy) return;
      on = !!(ev.target.closest && ev.target.closest('.calslide'));
      if (!on) return;
      sx = ev.touches[0].clientX; sy = ev.touches[0].clientY; dx = 0; el = grid();
      if (el) el.style.transition = 'none';
    }, { passive: true });
    document.addEventListener('touchmove', ev => {
      if (!on || !el) return;
      const t = ev.touches[0];
      dx = t.clientX - sx;
      if (Math.abs(dx) < Math.abs(t.clientY - sy) * 1.2 && Math.abs(dx) < 10) return;
      el.style.transform = `translateX(${dx}px)`;
    }, { passive: true });
    const shift = (dir) => {
      const n = new Date();
      const b = calM || new Date(n.getFullYear(), n.getMonth(), 1);
      calM = new Date(b.getFullYear(), b.getMonth() + dir, 1);
    };
    document.addEventListener('touchend', () => {
      if (!on || !el) return;
      on = false;
      const old = el; el = null;
      const dir = dx < 0 ? 1 : -1;
      if (Math.abs(dx) < 50) { // no llega al umbral: vuelve a su sitio
        old.style.transition = 'transform .2s ease';
        old.style.transform = 'translateX(0)';
        return;
      }
      busy = true;
      const w = old.offsetWidth;
      old.style.transition = 'transform .22s ease, opacity .22s ease';
      old.style.transform = `translateX(${dir > 0 ? -w : w}px)`;
      old.style.opacity = '0';
      setTimeout(() => {
        shift(dir);
        render();
        const next = grid();
        if (next) {
          // entra por el lado contrario y se desliza a su sitio
          next.style.transition = 'none';
          next.style.transform = `translateX(${dir > 0 ? w : -w}px)`;
          next.style.opacity = '0';
          void next.offsetWidth;
          next.style.transition = 'transform .22s ease, opacity .22s ease';
          next.style.transform = 'translateX(0)';
          next.style.opacity = '1';
        }
        busy = false;
      }, 230);
    }, { passive: true });
  })();

  // ---------- deslizar para cambiar de pestaña ----------
  (function () {
    const ORDER = ['registro', 'rutinas', 'dieta', 'progreso'];
    let sx = 0, sy = 0, st = 0, ok = false;
    document.addEventListener('touchstart', ev => {
      const t = ev.touches[0];
      sx = t.clientX; sy = t.clientY; st = Date.now();
      const el = ev.target;
      ok = !(el.closest && el.closest('input, textarea, select, .fpage, .overlay, .sheet, .calslide, .chart')) && !document.querySelector('.fpage, .overlay');
    }, { passive: true });
    const go = (x, y) => {
      if (!ok) return;
      const dx = x - sx, dy = y - sy;
      if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.2 || Date.now() - st > 900) return;
      ok = false;
      const i = ORDER.indexOf(tab), n = i + (dx < 0 ? 1 : -1);
      if (n < 0 || n >= ORDER.length) return;
      tab = ORDER[n]; render(); toTop();
    };
    document.addEventListener('touchmove', ev => { const t = ev.touches[0]; go(t.clientX, t.clientY); }, { passive: true });
    document.addEventListener('touchend', () => { ok = false; }, { passive: true });
    document.addEventListener('touchcancel', () => { ok = false; }, { passive: true });
  })();

  // ---------- eventos ----------
  $view.addEventListener('input', ev => {
    const el = ev.target;
    if (!active || !el.dataset || !el.dataset.f) return;
    const row = el.closest('.set');
    if (!row) return;
    active.exercises[+row.dataset.e].sets[+row.dataset.s][el.dataset.f] = el.value;
    persist(); updateStats();
  });
  $view.addEventListener('change', ev => {
    if (ev.target.id === 'hcm') { const hh = num(ev.target.value); if (hh > 100 && hh < 250) { profile.h = hh; save(K.p, profile); render(); } return; }
    if (ev.target.id !== 'imp' || !ev.target.files[0]) return;
    const rd = new FileReader();
    rd.onload = async () => {
      try {
        const d = JSON.parse(rd.result);
        if (!Array.isArray(d.sessions) || !Array.isArray(d.body)) throw new Error('formato');
        const ok = await sheet('<h3>Importar copia</h3><p class="muted">Se reemplazarán los datos actuales de este móvil.</p>',
          [{ label: 'Cancelar', v: false }, { label: 'Importar', cls: 'accent', v: true }]);
        if (!ok) return;
        sessions = d.sessions; body = d.body;
        if (d.diet && typeof d.diet === 'object') diet = d.diet;
        if (d.profile && typeof d.profile === 'object') { profile = d.profile; save(K.p, profile); }
        save(K.s, sessions); save(K.b, body); save(K.d, diet); render();
      } catch (e) {
        await sheet('<h3>Archivo no válido</h3><p class="muted">No parece una copia de esta app.</p>', [{ label: 'Vale', cls: 'accent', v: true }]);
      }
    };
    rd.readAsText(ev.target.files[0]);
  });

  document.addEventListener('click', async ev => {
    const t = ev.target.closest('[data-act]');
    if (!t) return;
    const a = t.dataset.act;
    const wrap = t.closest('[data-e]');
    const ei = wrap ? +wrap.dataset.e : -1;
    const si = t.closest('.set') ? +t.closest('.set').dataset.s : -1;

    if (a === 'tab') { tab = t.dataset.t; overview = !!active && tab === 'registro'; render(); toTop(); }
    else if (a === 'overview') { overview = true; render(); toTop(); }
    else if (a === 'backActive') { overview = false; tab = 'registro'; render(); toTop(); }
    else if (a === 'start') {
      if (active) { tab = 'registro'; overview = false; render(); return; }
      startFrom(t.dataset.id === 'free' ? null : ROUTINES.find(r => r.id === t.dataset.id));
      toTop();
    }
    else if (a === 'toggleType') { const s = active.exercises[ei].sets[si]; s.t = s.t === 'W' ? 'N' : 'W'; persist(); render(); }
    else if (a === 'check') {
      const ex = active.exercises[ei], s = ex.sets[si];
      if (s.done) {
        s.done = false; delete s.rec;
        if (active.rest && active.rest.key === ei + '-' + si) { active.rest = null; pushCancel(); }
        persist(); render(); return;
      }
      const p = prevOf(ex, si);
      if (s.kg === '' && p) s.kg = String(p.kg);
      if (s.reps === '') s.reps = p ? String(p.reps) : lowReps(ex.reps);
      if (isNaN(num(s.reps))) { t.classList.add('err'); setTimeout(() => t.classList.remove('err'), 400); return; }
      if (s.kg === '') s.kg = '0';
      s.done = true;
      if (s.t === 'N') {
        const h = recordsOf(ex.name);
        const others = active.exercises.filter(x => x.name === ex.name).flatMap(x => x.sets).filter(x => x !== s && x.done && x.t === 'N');
        const hKg = Math.max(h.kg, ...others.map(x => num(x.kg) || 0));
        const hVol = Math.max(h.vol, ...others.map(x => (num(x.kg) || 0) * (num(x.reps) || 0)));
        const kg = num(s.kg) || 0, vol = kg * (num(s.reps) || 0);
        const had = h.n > 0 || others.length > 0;
        const lines = [];
        if (had && kg > hKg) lines.push(`Peso máximo ${kgTxt(kg)} kg`);
        if (had && vol > hVol) lines.push(`Mejor serie ${thousands(vol)} kg`);
        if (lines.length) { s.rec = true; showRecord(ex.name, lines); celebrate(); }
      }
      startRest(s.t === 'W' ? Math.min(ex.rest, 60) : ex.rest, ei + '-' + si);
      ensureAudio(); persist(); render();
    }
    else if (a === 'addSet') { active.exercises[ei].sets.push({ t: 'N', kg: '', reps: '', done: false }); persist(); render(); }
    else if (a === 'delSet') { const ss = active.exercises[ei].sets; if (ss.length > 1) ss.pop(); persist(); render(); }
    else if (a === 'swapEx') {
      const ex = active.exercises[ei], base = ex.orig || ex.name, list = candidatesOf(base);
      const op = ex.origPlan || { n: ex.sets.length, w: ex.sets.filter(x => x.t === 'W').length, reps: ex.reps, rest: ex.rest };
      const AP = window.ALT_PLAN || {};
      const txt = n => n === base ? `${op.n - op.w} series × ${op.reps || '–'} reps${op.w ? ' + ' + op.w + ' calent.' : ''}` : (AP[n] ? `${AP[n].sets} series × ${AP[n].reps} reps` : '');
      const pick = await swapPage(base, ex.name, list, txt, isRec);
      if (pick && pick !== ex.name) {
        if (!ex.origPlan) ex.origPlan = op;
        const np = pick === base ? { n: op.n, w: op.w, reps: op.reps, rest: op.rest } : (AP[pick] ? { n: AP[pick].sets, w: 0, reps: AP[pick].reps, rest: AP[pick].rest } : null);
        ex.name = pick;
        if (pick === base) { delete ex.orig; delete ex.origPlan; } else ex.orig = base;
        if (np) {
          ex.reps = np.reps; ex.rest = np.rest;
          if (!ex.sets.some(x => x.done)) ex.sets = mkEx(pick, np.n, np.w, np.reps, np.rest).sets;
        }
        persist(); render();
      }
    }
    else if (a === 'reorder') {
      reorderMode = !reorderMode;
      render();
    }
    else if (a === 'moveEx') {
      const j = ei + (+t.dataset.d);
      if (j >= 0 && j < active.exercises.length) {
        [active.exercises[ei], active.exercises[j]] = [active.exercises[j], active.exercises[ei]];
        persist(); render();
      }
    }
    else if (a === 'delEx') {
      const ok = await sheet(`<h3>Quitar ejercicio</h3><p class="muted">${esc(active.exercises[ei].name)}</p>`, [{ label: 'No', v: false }, { label: 'Quitar', cls: 'accent', v: true }]);
      if (ok) { active.exercises.splice(ei, 1); persist(); render(); }
    }
    else if (a === 'addEx') addExercise();
    else if (a === 'finish') finish();
    else if (a === 'cancel') {
      const ok = await sheet('<h3>Cancelar entrenamiento</h3><p class="muted">Se perderá todo lo que has anotado.</p>', [{ label: 'Seguir', v: false }, { label: 'Cancelar', cls: 'accent', v: true }]);
      if (ok) { pushCancel(); active = null; persist(); render(); }
    }
    else if (a === 'pushOn') {
      try {
        if (pushState() === 'unsupported') return render();
        const perm = await Notification.requestPermission();
        if (perm !== 'granted') return render();
        const reg = await navigator.serviceWorker.ready;
        const sub = (await reg.pushManager.getSubscription()) || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(PUSH_KEY) });
        pushEndpoint = sub.endpoint; save(K.n, pushEndpoint); render();
      } catch (e) {
        await sheet('<h3>No se pudieron activar</h3><p class="muted">Comprueba que abres la app desde el icono de la pantalla de inicio y que los avisos están permitidos.</p>', [{ label: 'Vale', cls: 'accent', v: true }]);
      }
    }
    else if (a === 'pushOff') {
      try { const reg = await navigator.serviceWorker.ready; const sub = await reg.pushManager.getSubscription(); if (sub) await sub.unsubscribe(); } catch (e) {}
      pushCancel(); pushEndpoint = null; save(K.n, null); render();
    }
    else if (a === 'cardioDone') { active.cardio.done = !active.cardio.done; persist(); render(); }
    else if (a === 'restm') { active.rest.end = Math.max(Date.now() + 1000, active.rest.end - 15000); pushRest((active.rest.end - Date.now()) / 1000); persist(); renderRest(); }
    else if (a === 'restp') { active.rest.end += 15000; active.rest.total += 15; pushRest((active.rest.end - Date.now()) / 1000); persist(); renderRest(); }
    else if (a === 'restskip') { active.rest = null; pushCancel(); persist(); renderRest(); }
    else if (a === 'openSession') sessionPage(+t.dataset.id);
    else if (a === 'pastAdd') pastAdd();
    else if (a === 'syncSetup') syncSetup();
    else if (a === 'syncNow') { SYNC.dirty = true; syncNow(); }
    else if (a === 'delSession') {
      ev.stopPropagation();
      const id = +t.dataset.id;
      const ok = await sheet('<h3>Borrar sesión</h3><p class="muted">No se puede deshacer.</p>', [{ label: 'No', v: false }, { label: 'Borrar', cls: 'accent', v: true }]);
      if (ok) { sessions = sessions.filter(s => s.id !== id); save(K.s, sessions); openId = null; render(); }
    }
    else if (a === 'saveBody') {
      const g = id => num(document.getElementById(id).value);
      const kg = g('bkg');
      if (isNaN(kg) || kg < 20 || kg > 300) { document.getElementById('bkg').focus(); return; }
      const dv = document.getElementById('bdate').value;
      const today = isoDay(Date.now());
      const day = dv && dv <= today ? dv : today;
      const e = { ts: day === today ? Date.now() : new Date(day + 'T12:00:00').getTime(), kg };
      [['f', 'bf'], ['fm', 'bfm'], ['ffm', 'bffm'], ['wat', 'bwat'], ['wk', 'bwk'], ['w', 'bw']]
        .forEach(([k, id]) => { const v = g(id); if (!isNaN(v)) e[k] = v; });
      const hh = g('hcm'); if (!isNaN(hh) && hh > 100 && hh < 250) { profile.h = hh; save(K.p, profile); }
      body = body.filter(b => isoDay(b.ts) !== day);
      body.push(e);
      body.sort((x, y) => x.ts - y.ts);
      bDraft = null;
      save(K.b, body); render();
    }
    else if (a === 'cancelBody') { bDraft = null; render(); }
    else if (a === 'openStats') statsPage();
    else if (a === 'toggleHist') { histOpen = !histOpen; render(); }
    else if (a === 'bAll') { bAll = !bAll; render(); }
    else if (a === 'cmp') { const m = +t.dataset.m; cmpM = cmpM === m ? 0 : m; render(); }
    else if (a === 'openBody') {
      const b = body.find(x => String(x.ts) === t.dataset.ts);
      if (!b) return;
      const rows = BM.map(m => { const v = bval(b, m.k); return v !== null ? `<div class="row between" style="padding:6px 0;border-bottom:1px solid var(--line)"><span class="muted">${m.n}</span><b>${bfmt(v, m.u)}</b></div>` : ''; }).join('');
      const r = await sheet(`<h3>${dShort(b.ts)} ${new Date(b.ts).getFullYear()}</h3>${rows}`,
        [{ label: 'Borrar', v: 'del' }, { label: 'Editar', v: 'edit' }, { label: 'Cerrar', cls: 'accent', v: false }]);
      if (r === 'del') { body = body.filter(x => x !== b); save(K.b, body); render(); }
      else if (r === 'edit') { bDraft = b; render(); toTop(); }
    }
    else if (a === 'toggleR') { openR = openR === t.dataset.id ? null : t.dataset.id; render(); }
    else if (a === 'exinfo') exSheet(t.dataset.ex);
    else if (a === 'dietPick') {
      const day = dayDiet(), sl = t.dataset.slot;
      if (day[sl] && day[sl].opt === t.dataset.opt) return;
      day[sl] = { opt: t.dataset.opt, done: false, oil: 0, skip: [] };
      saveDiet(); render();
    }
    else if (a === 'dietDone') {
      const c = dayDiet()[t.dataset.slot];
      if (c) { c.done = !c.done; saveDiet(); render(); }
    }
    else if (a === 'dietIng') {
      const c = dayDiet()[t.dataset.slot];
      if (c) {
        const n = +t.dataset.i;
        c.skip = c.skip || [];
        c.skip = c.skip.includes(n) ? c.skip.filter(x => x !== n) : [...c.skip, n];
        saveDiet(); render();
      }
    }
    else if (a === 'dietOil') {
      const c = dayDiet()[t.dataset.slot];
      if (c) { c.oil = Math.max(0, Math.min(4, (c.oil || 0) + (+t.dataset.d))); saveDiet(); render(); }
    }
    else if (a === 'export') {
      const blob = new Blob([JSON.stringify({ v: 2, sessions, body, diet, profile })], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `gym-copia-${isoDay(Date.now())}.json`;
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
    }
  });

  // ---------- temporizadores ----------
  setInterval(() => {
    if (!active) return;
    const el = document.getElementById('elapsed');
    if (el) el.textContent = dur((Date.now() - active.start) / 1000);
    if (active.rest) {
      const left = (active.rest.end - Date.now()) / 1000;
      if (left <= 0) {
        // Solo pitar si el descanso acaba mientras estás mirando la app; si ya había acabado (la app estaba cerrada o en segundo plano), en silencio
        const late = -left * 1000;
        active.rest = null; pushCancel(); persist();
        if (late < 2500) beep();
        renderRest();
      }
      else {
        const tx = document.getElementById('restTxt'); if (tx) tx.textContent = dur(left);
        const f = document.getElementById('restFill'); if (f) f.style.width = (100 * left / active.rest.total) + '%';
      }
    }
  }, 500);

  ['gesturestart', 'gesturechange', 'gestureend'].forEach(g => document.addEventListener(g, e => e.preventDefault()));
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).catch(() => {});
  render();
  syncNow();
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') syncNow(); });
})();
