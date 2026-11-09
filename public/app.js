(function () {
  'use strict';

  const ROUTINES = window.ROUTINES || [];
  const K = { s: 'gym.sessions', a: 'gym.active', b: 'gym.body', d: 'gym.diet' };

  const load = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

  let sessions = load(K.s, []);
  let active = load(K.a, null);
  let body = load(K.b, []);
  let diet = load(K.d, {});
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
      exercises: r ? r.exercises.map(e => mkEx(e.name, e.sets, e.warmup || 0, e.reps, e.rest)) : []
    };
    persist(); tab = 'registrar'; render();
  }
  function startRest(sec) {
    active.rest = { end: Date.now() + sec * 1000, total: sec };
  }
  function pendingSets() {
    return active.exercises.reduce((n, e) => n + e.sets.filter(s => !s.done).length, 0);
  }
  function updateStats() {
    if (!active) return;
    const v = document.getElementById('vol');
    const n = document.getElementById('nsets');
    if (v) v.textContent = thousands(volOf(active.exercises, true));
    if (n) n.textContent = active.exercises.reduce((c, e) => c + e.sets.filter(s => s.done).length, 0);
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
      `<h3>Terminar entrenamiento</h3><p class="muted">${pending ? pending + ' series sin completar no se guardarán.' : '¿Guardar el entrenamiento?'}</p>`,
      [{ label: 'Seguir', v: false }, { label: 'Terminar', cls: 'accent', v: true }]
    );
    if (!ok) return;
    const exs = active.exercises.map(e => ({
      name: e.name,
      sets: e.sets.filter(s => s.done).map(s => ({ t: s.t, kg: num(s.kg) || 0, reps: num(s.reps) }))
    })).filter(e => e.sets.length);
    if (!exs.length) { active = null; persist(); render(); return; }

    const end = Date.now();
    const prs = [];
    exs.forEach(e => {
      const best = Math.max(0, ...e.sets.filter(s => s.t === 'N').map(s => s.kg));
      let hist = 0, had = false;
      sessions.forEach(ss => ss.exercises.forEach(x => {
        if (x.name === e.name) x.sets.forEach(s => { if (s.t === 'N') { had = true; hist = Math.max(hist, s.kg); } });
      }));
      if (had && best > hist) prs.push(`${e.name} · ${kgTxt(best)} kg`);
    });
    const ses = { id: active.id, routineId: active.routineId, name: active.name, start: active.start, end, exercises: exs };
    sessions.push(ses); save(K.s, sessions);
    active = null; persist(); tab = 'registrar'; render();
    const nsets = exs.reduce((n, e) => n + e.sets.length, 0);
    await sheet(
      `<h3>¡Entrenamiento guardado!</h3><p>${dur((end - ses.start) / 1000)} · ${thousands(volOf(exs, false))} kg · ${nsets} series</p>` +
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
        <span class="sub">${r.exercises.slice(0, 4).map(e => esc(e.name.replace(/ \(.*\)/, ''))).join(' · ')}…</span></button>`).join('')}
      <button class="card dashed" data-act="start" data-id="free">+ Sesión libre</button>
      <h2>Esta semana <span style="float:right;text-transform:none;letter-spacing:0">${cnt} entrenos</span></h2>
      <div class="week">${days.map((d, i) => `<div class="day ${set.has(isoDay(d)) ? 'on' : ''} ${isoDay(d) === isoDay(Date.now()) ? 'today' : ''}">${L[i]}<b>${d.getDate()}</b></div>`).join('')}</div>
      <h2>Últimas sesiones</h2>
      ${recent.length ? recent.map(s => `<div class="sess"><div class="row between"><div><b>${esc(s.name)}</b><br><small>${dShort(s.start)} · ${s.exercises.length} ejercicios · ${Math.round((s.end - s.start) / 60000)} min</small></div><span class="pill">${thousands(volOf(s.exercises, false))} kg</span></div></div>`).join('') : '<p class="muted">Todavía no has registrado ningún entrenamiento.</p>'}`;
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
        <div class="exh"><button class="exth" data-act="exinfo" data-ex="${esc(ex.name)}">${thumb(ex.name, 'th')}</button><div><b>${esc(ex.name)}</b><small>${ex.reps ? ex.reps + ' reps · ' : ''}descanso ${dur(ex.rest)}</small></div></div>
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
        <div class="asub"><span id="elapsed">${dur((Date.now() - active.start) / 1000)}</span> · <span id="vol">${thousands(volOf(active.exercises, true))}</span> kg · <span id="nsets">${done}</span>/${total} series</div></div>
        <button class="btn accent" data-act="finish">Terminar</button></div>
      ${exs || '<p class="muted">Sesión libre: añade tu primer ejercicio.</p>'}
      <button class="btn full" data-act="addEx">+ Añadir ejercicio</button>
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
  const routineMin = r => Math.round(r.exercises.reduce((s, e) => s + e.sets * (45 + e.rest), 0) / 60 / 5) * 5;

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

  function viewRutinas() {
    return `<h1>Rutinas</h1>
      <p class="muted"><small>Para cambiar una rutina, dímelo en el chat con Claude y se actualiza al reabrir la app. Versión ${esc(window.ROUTINES_VERSION || '')}</small></p>
      ${ROUTINES.map(r => {
        const open = openR === r.id;
        const series = r.exercises.reduce((n, e) => n + e.sets, 0);
        const mus = routineMuscles(r).slice(0, 4);
        return `<section class="rcard">
          <div class="rhead" data-act="toggleR" data-id="${r.id}">
            <div class="badge">${esc(r.id.replace(/\D/g, ''))}</div>
            <div class="rt"><b>${esc(r.short)}</b><small>${r.exercises.length} ejercicios · ${series} series · ~${routineMin(r)} min</small></div>
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
          <button class="btn accent full" data-act="start" data-id="${r.id}">Empezar rutina</button>
        </section>`;
      }).join('')}`;
  }

  function chart() {
    const pts = body.slice(-30);
    if (pts.length < 2) return '<p class="muted">Añade al menos 2 pesos para ver la gráfica.</p>';
    const ks = pts.map(p => p.kg);
    const mn = Math.min(...ks) - 0.3, mx = Math.max(...ks) + 0.3;
    const W = 320, H = 110;
    const x = i => 10 + i * (W - 20) / (pts.length - 1);
    const y = k => H - 10 - (k - mn) * (H - 20) / (mx - mn);
    const d = pts.map((p, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p.kg).toFixed(1)).join(' ');
    return `<svg viewBox="0 0 ${W} ${H}" class="chart"><path d="${d}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
      ${pts.map((p, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(p.kg).toFixed(1)}" r="3" fill="var(--accent)"/>`).join('')}</svg>
      <div class="row between muted"><small>mín ${kgTxt(Math.min(...ks))} kg</small><small>máx ${kgTxt(Math.max(...ks))} kg</small></div>`;
  }

  function viewProgreso() {
    const last7 = body.slice(-7);
    const avg = last7.length ? last7.reduce((a, b) => a + b.kg, 0) / last7.length : null;
    const list = body.slice(-6).reverse();
    return `<h1>Progreso</h1>
      <h2 style="margin-top:0">Peso corporal</h2>
      <div class="form"><input class="t" id="bkg" inputmode="decimal" placeholder="Peso (kg)"><input class="t" id="bw" inputmode="decimal" placeholder="Cintura (cm)"><button class="btn accent" data-act="saveBody">Guardar</button></div>
      <p class="muted" style="margin:8px 0 14px"><small>Mejor siempre en ayunas, en la misma báscula.${avg ? ` Media últimas ${last7.length}: <b style="color:var(--text)">${kgTxt(avg)} kg</b>` : ''}</small></p>
      ${chart()}
      ${list.map(b => `<div class="row between" style="padding:6px 2px;border-bottom:1px solid var(--line)"><span>${dShort(b.ts)}</span><span>${kgTxt(b.kg)} kg${b.w ? ' · ' + kgTxt(b.w) + ' cm' : ''}</span></div>`).join('')}
      <h2>Historial</h2>
      ${sessions.length ? sessions.slice().reverse().map(s => `<button class="sess" data-act="openSession" data-id="${s.id}">
        <div class="row between"><div><b>${esc(s.name)}</b><br><small>${dShort(s.start)} · ${Math.round((s.end - s.start) / 60000)} min</small></div><span class="pill">${thousands(volOf(s.exercises, false))} kg</span></div>
        ${openId === s.id ? `<div class="detail">${s.exercises.map(e => `<div><b>${esc(e.name)}</b><br><span class="muted">${e.sets.map(x => (x.t === 'W' ? 'C ' : '') + kgTxt(x.kg) + '×' + x.reps).join(' · ')}</span></div>`).join('')}
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
      if (ok) { active = null; persist(); render(); }
    }
    else if (a === 'restm') { active.rest.end = Math.max(Date.now() + 1000, active.rest.end - 15000); persist(); renderRest(); }
    else if (a === 'restp') { active.rest.end += 15000; active.rest.total += 15; persist(); renderRest(); }
    else if (a === 'restskip') { active.rest = null; persist(); renderRest(); }
    else if (a === 'openSession') { const id = +t.dataset.id; openId = openId === id ? null : id; render(); }
    else if (a === 'delSession') {
      ev.stopPropagation();
      const id = +t.dataset.id;
      const ok = await sheet('<h3>Borrar sesión</h3><p class="muted">No se puede deshacer.</p>', [{ label: 'No', v: false }, { label: 'Borrar', cls: 'accent', v: true }]);
      if (ok) { sessions = sessions.filter(s => s.id !== id); save(K.s, sessions); openId = null; render(); }
    }
    else if (a === 'saveBody') {
      const kg = num(document.getElementById('bkg').value);
      if (isNaN(kg)) return;
      const w = num(document.getElementById('bw').value);
      const day = isoDay(Date.now());
      body = body.filter(b => isoDay(b.ts) !== day);
      body.push({ ts: Date.now(), kg, w: isNaN(w) ? null : w });
      body.sort((x, y) => x.ts - y.ts);
      save(K.b, body); render();
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
      const blob = new Blob([JSON.stringify({ v: 1, sessions, body, diet })], { type: 'application/json' });
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
      if (left <= 0) { active.rest = null; persist(); beep(); renderRest(); }
      else {
        const tx = document.getElementById('restTxt'); if (tx) tx.textContent = dur(left);
        const f = document.getElementById('restFill'); if (f) f.style.width = (100 * left / active.rest.total) + '%';
      }
    }
  }, 500);

  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
  render();
})();
