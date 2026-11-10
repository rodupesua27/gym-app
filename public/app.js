(function () {
  'use strict';

  const ROUTINES = window.ROUTINES || [];
  const K = { s: 'gym.sessions', a: 'gym.active', b: 'gym.body', d: 'gym.diet', p: 'gym.profile', n: 'gym.push' };

  const load = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

  let sessions = load(K.s, []);
  let active = load(K.a, null);
  let body = load(K.b, []);
  let diet = load(K.d, {});
  let profile = load(K.p, { h: 178 });
  let pushEndpoint = load(K.n, null);
  const PUSH_KEY = 'BAwEpOB4wZkmNCi6MFGQ6c-h5a0pcmzeeR35j66aXUAv56GxPI9nsaxT_atsS0z0YiVkTBuR3XUm93APsTLfJHY';
  let bmetric = 'kg', bAll = false, bDraft = null;
  let tab = 'registrar';
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

  const setVol = s => (s.t === 'N' ? (num(s.kg) || 0) * (num(s.reps) || 0) : 0);
  const volOf = (exs, onlyDone) => {
    let v = 0;
    exs.forEach(e => e.sets.forEach(s => { if (!onlyDone || s.done) v += setVol(s); }));
    return v;
  };

  const ICON = {
    registrar: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"/></svg>',
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
    persist(); tab = 'registrar'; render();
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

  function startRest(sec) {
    active.rest = { end: Date.now() + sec * 1000, total: sec };
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

  async function addExercise() {
    const names = [...new Set([
      ...ROUTINES.flatMap(r => r.exercises.map(e => e.name)),
      ...sessions.flatMap(s => s.exercises.map(e => e.name))
    ])].sort();
    const v = await sheet(
      `<h3>Añadir ejercicio</h3><input id="newex" list="exlist" placeholder="Nombre del ejercicio" autocomplete="off">` +
      `<datalist id="exlist">${names.map(n => `<option value="${esc(n)}">`).join('')}</datalist>`,
      [{ label: 'Cancelar', v: null }, { label: 'Añadir', cls: 'accent', v: o => o.querySelector('#newex').value.trim() }]
    );
    if (v) { active.exercises.push(mkEx(v, 3, 0, '', 90)); persist(); render(); }
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
    const prs = [];
    exs.forEach(e => {
      const best = Math.max(0, ...e.sets.filter(s => s.t === 'N').map(s => s.kg));
      let hist = 0, had = false;
      sessions.forEach(ss => ss.exercises.forEach(x => {
        if (x.name === e.name) x.sets.forEach(s => { if (s.t === 'N') { had = true; hist = Math.max(hist, s.kg); } });
      }));
      if (had && best > hist) prs.push(`${e.name} · ${kgTxt(best)} kg`);
    });
    const ses = { id: active.id, routineId: active.routineId, name: active.name, start: active.start, end, exercises: exs, cardio };
    sessions.push(ses); save(K.s, sessions);
    active = null; persist(); tab = 'registrar'; render();
    const nsets = exs.reduce((n, e) => n + e.sets.length, 0);
    await sheet(
      `<h3>¡Entrenamiento guardado!</h3><p>${dur((end - ses.start) / 1000)} · ${cardio ? 'Cardio ✓ · ' : ''}${thousands(volOf(exs, false))} kg · ${nsets} series</p>` +
      (prs.length ? `<p><b>Récords nuevos</b><br>${prs.map(esc).join('<br>')}</p>` : ''),
      [{ label: 'Genial', cls: 'accent', v: true }]
    );
  }

  // ---------- vistas ----------
  function viewRegistrar() {
    if (active) return viewActive();
    const now = new Date();
    const mon = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
    const days = [...Array(7)].map((_, i) => new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + i));
    const set = new Set(sessions.map(s => isoDay(s.start)));
    const cnt = days.filter(d => set.has(isoDay(d))).length;
    const L = 'LMXJVSD';
    const recent = sessions.slice(-3).reverse();
    return `<h1>Registrar</h1>
      <h2 style="margin-top:0">Elige una rutina</h2>
      ${ROUTINES.map(r => `<button class="card" data-act="start" data-id="${r.id}"><b>${esc(r.name)} · ${esc(r.short)}</b>
        <span class="sub">${r.day ? esc(r.day) + ' · ' : ''}${r.exercises.slice(0, 4).map(e => esc(e.name.replace(/ \(.*\)/, ''))).join(' · ')}…</span></button>`).join('')}
      <button class="card dashed" data-act="start" data-id="free">+ Sesión libre</button>
      <h2>Esta semana <span style="float:right;text-transform:none;letter-spacing:0">${cnt} entrenos</span></h2>
      <div class="week">${days.map((d, i) => `<div class="day ${set.has(isoDay(d)) ? 'on' : ''} ${isoDay(d) === isoDay(Date.now()) ? 'today' : ''}">${L[i]}<b>${d.getDate()}</b></div>`).join('')}</div>
      <h2>Últimas sesiones</h2>
      ${recent.length ? recent.map(s => `<div class="sess"><div class="row between"><div><b>${esc(s.name)}</b><br><small>${dShort(s.start)} · ${s.exercises.length} ejercicios · ${Math.round((s.end - s.start) / 60000)} min</small></div><span class="pill">${sessPill(s)}</span></div></div>`).join('') : '<p class="muted">Todavía no has registrado ningún entrenamiento.</p>'}`;
  }

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
        const phReps = p ? p.reps : (ex.reps || '');
        return `<div class="set ${s.done ? 'done' : ''}" data-e="${ei}" data-s="${si}">
          <button class="tp ${s.t === 'W' ? 'w' : ''}" data-act="toggleType" title="Calentamiento / normal">${label}</button>
          <div class="pv">${p ? kgTxt(p.kg) + ' × ' + p.reps : '–'}</div>
          <input inputmode="decimal" data-f="kg" placeholder="${esc(phKg)}" value="${esc(s.kg)}" aria-label="kg">
          <input inputmode="numeric" data-f="reps" placeholder="${esc(phReps)}" value="${esc(s.reps)}" aria-label="repeticiones">
          <button class="ck" data-act="check" aria-label="Completar serie">${ICON.check}</button>
        </div>`;
      }).join('');
      return `<section class="ex" data-e="${ei}">
        <div class="exh"><button class="exth" data-act="exinfo" data-ex="${esc(ex.name)}">${thumb(ex.name, 'th')}</button><div style="flex:1;min-width:0"><b>${esc(ex.name)}</b><small>${ex.reps ? ex.reps + ' reps · ' : ''}descanso ${dur(ex.rest)}</small></div><span class="ecnt" id="ec${ei}">${ex.sets.filter(s => s.done).length}/${ex.sets.length}</span></div>
        <div class="cols"><span>Serie</span><span>Anterior</span><span>Kg</span><span>Reps</span><span></span></div>
        ${rows}
        <div class="exf" data-e="${ei}">
          <button class="btn small" data-act="addSet">+ Serie</button>
          <button class="btn small" data-act="delSet">− Serie</button>
          <button class="btn small danger" data-act="delEx">Quitar</button>
        </div>
      </section>`;
    }).join('');
    return `<div class="ahead"><div><div class="atitle">${esc(active.name)}</div>
        <div class="asub"><span id="elapsed">${dur((Date.now() - active.start) / 1000)}</span> · <span id="vol">${thousands(volOf(active.exercises, true))}</span> kg · <span id="nsets">${done}</span>/${total} series · <span id="ppct">${total ? Math.round(done * 100 / total) : 0} %</span></div></div>
        <button class="btn accent" data-act="finish">Terminar</button>
        <div class="pbar"><i id="pbar" style="width:${total ? Math.round(done * 100 / total) : 0}%"></i></div></div>
      ${exs || '<p class="muted">Sesión libre: añade tu primer ejercicio.</p>'}
      <button class="btn full" data-act="addEx">+ Añadir ejercicio</button>
      ${active.cardio ? '<div style="height:14px"></div>' + cardioCard(active.cardio, true) : ''}
      <button class="btn full danger" style="margin-top:10px" data-act="cancel">Cancelar entrenamiento</button>`;
  }

  // ---------- ejercicios: miniaturas y detalle ----------
  let openR = null;
  const exInfo = n => (window.EXINFO || {})[n] || null;
  const imgSrc = (i, k) => `/img/ex/${encodeURIComponent(i.img)}/${k}.jpg`;
  const thumb = (n, cls) => {
    const i = exInfo(n);
    return i && i.img ? `<img class="${cls}" loading="lazy" alt="" src="${imgSrc(i, 0)}">`
             : `<div class="${cls} ph">${ICON.registrar}</div>`;
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
    let best = 0;
    sessions.forEach(s => s.exercises.forEach(e => {
      if (e.name === name) e.sets.forEach(x => { if (x.t === 'N' && x.kg > best) best = x.kg; });
    }));
    const last = le ? le.sets.filter(s => s.t === 'N').map(s => `${kgTxt(s.kg)}×${s.reps}`).join(' · ') : '';
    return sheet(
      `<h3>${esc(name)}</h3>
       ${i && i.img ? `<div class="flip"><img src="${imgSrc(i, 0)}" alt=""><img src="${imgSrc(i, 1)}" alt=""></div>` : ''}
       ${i ? `<div class="mchips" style="margin-top:12px">${i.m.map(m => `<span class="mchip on">${esc(m)}</span>`).join('')}${i.s.map(m => `<span class="mchip">${esc(m)}</span>`).join('')}</div>` : ''}
       <div class="exstats"><div><small>Mejor peso</small><b>${best ? kgTxt(best) + ' kg' : '–'}</b></div>
       <div><small>Última vez</small><b>${esc(last || '–')}</b></div></div>`,
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
          ${open ? `<div class="elist">${r.exercises.map(e => {
            const i = exInfo(e.name);
            return `<button class="erow" data-act="exinfo" data-ex="${esc(e.name)}">${thumb(e.name, 'th')}
              <div class="en"><b>${esc(e.name)}</b><small>${i ? esc(i.m.join(', ')) : ''}</small></div>
              <span class="es">${e.sets} × ${esc(e.reps)}${e.warmup ? `<small><br>${e.warmup} calent.</small>` : ''}</span></button>`;
          }).join('')}</div>`
          : `<div class="strip">${r.exercises.slice(0, 7).map(e => thumb(e.name, 'sth')).join('')}</div>`}
          ${r.cardio ? cardioCard(r.cardio, false) : ''}
          <button class="btn accent full" data-act="start" data-id="${r.id}">Empezar rutina</button>
        </section>`;
      }).join('')}
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
    return `<h1>Progreso</h1>
      <h2 style="margin-top:0">Medidas corporales</h2>
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
        <p class="muted" style="margin:10px 0 0"><small>Cambia la fecha para meter pesos de semanas o meses atrás. Si ya hay un registro ese día, se reemplaza. Mejor en ayunas y en la misma báscula.</small></p>
      </section>
      <div class="chips" style="margin-top:14px">${avail.map(m => `<button class="chip ${m.k === bmetric ? 'on' : ''}" data-act="bmetric" data-k="${m.k}">${m.n}</button>`).join('')}</div>
      <div class="row between" style="margin-bottom:8px"><span><b style="font-size:22px">${lastV !== null ? bfmt(lastV, cur.u) : '–'}</b> <small class="muted">${cur.n}</small></span>
        <small class="muted">${delta !== null ? (delta > 0 ? '+' : '') + bfmt(delta, cur.u) + ' desde ' + dShort(prevB[0].ts) : ''}${bmetric === 'kg' && avg ? ` · media ${last7.length}: ${kgTxt(avg)} kg` : ''}</small></div>
      ${chart(bmetric)}
      <h2>Registros</h2>
      ${list.length ? list.map(bodyRow).join('') : '<p class="muted">Todavía no hay registros.</p>'}
      ${body.length > 8 ? `<button class="btn full" style="margin-top:8px" data-act="bAll">${bAll ? 'Ver menos' : 'Ver todos (' + body.length + ')'}</button>` : ''}
      <h2>Historial</h2>
      ${sessions.length ? sessions.slice().reverse().map(s => `<button class="sess" data-act="openSession" data-id="${s.id}">
        <div class="row between"><div><b>${esc(s.name)}</b><br><small>${dShort(s.start)} · ${Math.round((s.end - s.start) / 60000)} min</small></div><span class="pill">${sessPill(s)}</span></div>
        ${openId === s.id ? `<div class="detail">${s.cardio ? `<div><b>Cardio · ${esc(s.cardio.title)}</b><br><span class="muted">${s.cardio.min} min</span></div>` : ''}${s.exercises.map(e => `<div><b>${esc(e.name)}</b><br><span class="muted">${e.sets.map(x => (x.t === 'W' ? 'C ' : '') + kgTxt(x.kg) + '×' + x.reps).join(' · ')}</span></div>`).join('')}
        <span class="btn small danger" data-act="delSession" data-id="${s.id}">Borrar sesión</span></div>` : ''}</button>`).join('') : '<p class="muted">Aquí aparecerán tus entrenamientos.</p>'}
      <h2>Copia de seguridad</h2>
      <p class="muted"><small>Tus datos viven en este móvil. Exporta una copia de vez en cuando.</small></p>
      <div class="row"><button class="btn" data-act="export">Exportar</button><label class="btn" for="imp">Importar</label><input type="file" id="imp" accept="application/json" hidden></div>`;
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
  function dietTotals(day) {
    const D = window.DIET || { slots: [], options: [] };
    let eaten = 0, prot = 0, plan = 0;
    D.slots.forEach(s => {
      const c = day[s.id];
      if (!c) return;
      const o = D.options.find(x => x.id === c.opt);
      if (!o) return;
      const k = o.kcal + (c.oil || 0) * OIL_KCAL;
      plan += k;
      if (c.done) { eaten += k; prot += o.p; }
    });
    return { eaten, prot, plan };
  }
  function mealCard(slot, o, c) {
    const k = o.kcal + (c.oil || 0) * OIL_KCAL;
    return `<div class="meal ${c.done ? 'done' : ''}">
      <div class="row between"><b>${esc(o.name)}</b><span class="pill">${thousands(k)} kcal</span></div>
      <small>${o.p} g proteína · ${o.min} min${c.oil ? ' · +' + c.oil + ' cda aceite' : ''}</small>
      <ul>${o.ingredients.map(i => `<li>${esc(i)}</li>`).join('')}</ul>
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
    const T = window.DIET_TARGET || { kcal: 2900, protein: 120 };
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
        <div class="row between" style="margin-top:10px"><span>${Math.round(tot.prot)} <small>/ ${T.protein} g proteína</small></span></div>
        <div class="bar"><div style="width:${ppct}%"></div></div>
      </div>
      ${meals}
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
    $tabs.innerHTML = ['registrar', 'rutinas', 'progreso', 'dieta'].map(t =>
      `<button class="${tab === t ? 'on' : ''}" data-act="tab" data-t="${t}">${ICON[t]}<span>${t[0].toUpperCase() + t.slice(1)}</span></button>`).join('');
    let html = '';
    if (active && tab !== 'registrar') {
      html += `<button class="banner" data-act="tab" data-t="registrar"><span>Entrenamiento en curso</span><span>Volver →</span></button>`;
    }
    html += tab === 'registrar' ? viewRegistrar() : tab === 'rutinas' ? viewRutinas() : tab === 'dieta' ? viewDieta() : viewProgreso();
    $view.innerHTML = html;
    renderRest();
    keepAwake();
  }

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

    if (a === 'tab') { tab = t.dataset.t; render(); window.scrollTo(0, 0); }
    else if (a === 'start') {
      if (active) { tab = 'registrar'; render(); return; }
      startFrom(t.dataset.id === 'free' ? null : ROUTINES.find(r => r.id === t.dataset.id));
      window.scrollTo(0, 0);
    }
    else if (a === 'toggleType') { const s = active.exercises[ei].sets[si]; s.t = s.t === 'W' ? 'N' : 'W'; persist(); render(); }
    else if (a === 'check') {
      const ex = active.exercises[ei], s = ex.sets[si];
      if (s.done) { s.done = false; persist(); render(); return; }
      const p = prevOf(ex, si);
      if (s.kg === '' && p) s.kg = String(p.kg);
      if (s.reps === '' && p) s.reps = String(p.reps);
      if (isNaN(num(s.reps))) { t.classList.add('err'); setTimeout(() => t.classList.remove('err'), 400); return; }
      if (s.kg === '') s.kg = '0';
      s.done = true;
      startRest(s.t === 'W' ? Math.min(ex.rest, 60) : ex.rest);
      ensureAudio(); persist(); render();
    }
    else if (a === 'addSet') { active.exercises[ei].sets.push({ t: 'N', kg: '', reps: '', done: false }); persist(); render(); }
    else if (a === 'delSet') { const ss = active.exercises[ei].sets; if (ss.length > 1) ss.pop(); persist(); render(); }
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
    else if (a === 'openSession') { const id = +t.dataset.id; openId = openId === id ? null : id; render(); }
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
    else if (a === 'bmetric') { bmetric = t.dataset.k; render(); }
    else if (a === 'bAll') { bAll = !bAll; render(); }
    else if (a === 'openBody') {
      const b = body.find(x => String(x.ts) === t.dataset.ts);
      if (!b) return;
      const rows = BM.map(m => { const v = bval(b, m.k); return v !== null ? `<div class="row between" style="padding:6px 0;border-bottom:1px solid var(--line)"><span class="muted">${m.n}</span><b>${bfmt(v, m.u)}</b></div>` : ''; }).join('');
      const r = await sheet(`<h3>${dShort(b.ts)} ${new Date(b.ts).getFullYear()}</h3>${rows}`,
        [{ label: 'Borrar', v: 'del' }, { label: 'Editar', v: 'edit' }, { label: 'Cerrar', cls: 'accent', v: false }]);
      if (r === 'del') { body = body.filter(x => x !== b); save(K.b, body); render(); }
      else if (r === 'edit') { bDraft = b; render(); window.scrollTo(0, 0); }
    }
    else if (a === 'toggleR') { openR = openR === t.dataset.id ? null : t.dataset.id; render(); }
    else if (a === 'exinfo') exSheet(t.dataset.ex);
    else if (a === 'dietPick') {
      const day = dayDiet(), sl = t.dataset.slot;
      if (day[sl] && day[sl].opt === t.dataset.opt) return;
      day[sl] = { opt: t.dataset.opt, done: false, oil: 0 };
      saveDiet(); render();
    }
    else if (a === 'dietDone') {
      const c = dayDiet()[t.dataset.slot];
      if (c) { c.done = !c.done; saveDiet(); render(); }
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
      if (left <= 0) { active.rest = null; pushCancel(); persist(); beep(); renderRest(); }
      else {
        const tx = document.getElementById('restTxt'); if (tx) tx.textContent = dur(left);
        const f = document.getElementById('restFill'); if (f) f.style.width = (100 * left / active.rest.total) + '%';
      }
    }
  }, 500);

  ['gesturestart', 'gesturechange', 'gestureend'].forEach(g => document.addEventListener(g, e => e.preventDefault()));
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).catch(() => {});
  render();
})();
