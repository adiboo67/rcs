// Onglet « Mental » : préparation avant le match.
//  - Méditation : 3 séances de respiration guidée, en plein écran.
//  - Réveil des yeux : saccades, poursuite en 8, vision périphérique (mains), mini-jeu « coin de l'œil ».
//    Il tourne dans une surcouche plein écran, hors de #app, pour ne pas être effacé par les rafraîchissements.
//  - Vidéos : sélection d'actions de joueurs + liens YouTube partagés par l'équipe (js/videos.js).
//  - Radio du monde : stations HTTPS de l'annuaire libre Radio Browser (radio-browser.info),
//    avec un mini-lecteur fixe qui continue de jouer pendant les jeux.

(function () {
  const UI = window.UI;
  const { esc, attr, Local } = UI;
  const sfx = name => UI.sfx(name);

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* navigation privée */ } },
  };
  function vibrate(ms) { if (navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) { /* ignoré */ } } }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  // =====================================================================
  //  Réveil des yeux
  // =====================================================================

  const BEST_KEY = 'rcs_eyes_best';
  const TRIALS = 8;
  const STEPS = [
    { key: 'sacc', name: 'Saccades', dur: 30000, hint: 'Suis la cible avec les yeux. <b>La tête ne bouge pas.</b>' },
    { key: 'pursuit', name: 'Poursuite en 8', dur: 20000, hint: 'Accompagne la cible en douceur, sans jamais la lâcher.' },
    { key: 'hands', name: 'Mains en périphérie', dur: 32000, hint: '' },
    { key: 'game', name: 'Coin de l\'œil', dur: 0, hint: 'Fixe la croix. Un chiffre va apparaître sur un bord.' },
  ];
  // Repères en % de la zone de jeu.
  const PTS = { TL: [10, 10], TR: [90, 10], BL: [10, 90], BR: [90, 90], L: [6, 50], R: [94, 50], T: [50, 7], B: [50, 93] };
  const SACC = ['TL', 'BR', 'TL', 'BR', 'TR', 'BL', 'TR', 'BL', 'L', 'R', 'L', 'R', 'T', 'B', 'T', 'B'];
  const EDGES = ['TL', 'TR', 'BL', 'BR', 'L', 'R', 'T', 'B'];
  const HANDS = [
    { mode: 'wide', text: 'Bras tendus sur les côtés, <b>agite les doigts</b>. Tes yeux restent sur la croix.' },
    { mode: 'inout', text: 'Rapproche <b>lentement</b> les mains vers le centre… puis écarte-les.' },
    { mode: 'vert', text: 'Une main en haut, une main en bas. <b>Tu vois encore tes doigts bouger ?</b>' },
    { mode: 'open', text: 'Ouvre ta vision au maximum : la croix, et tout l\'espace autour. <b>Respire lentement.</b>' },
  ];

  const E = { el: null, step: -1, timers: [], raf: 0, trial: 0, score: 0, digit: 0, phase: '' };

  function later(ms, fn) { E.timers.push(setTimeout(fn, ms)); }
  function clearAll() {
    E.timers.forEach(clearTimeout);
    E.timers = [];
    cancelAnimationFrame(E.raf);
    E.raf = 0;
  }
  const $ = sel => E.el && E.el.querySelector(sel);

  function openEyes() {
    if (!E.el) {
      E.el = document.createElement('div');
      E.el.className = 'eyes';
      E.el.setAttribute('role', 'dialog');
      E.el.setAttribute('aria-label', 'Réveil des yeux');
      E.el.innerHTML = `<div class="eyes-top"><div><div class="eyes-kicker" id="eyesKicker"></div><div class="eyes-title" id="eyesTitle"></div></div>
          <button class="eyes-x" data-local="eyesClose" aria-label="Fermer">✕</button></div>
        <div class="eyes-progress"><i id="eyesBar"></i></div>
        <div class="eyes-stage" id="eyesStage"></div>
        <div class="eyes-hint" id="eyesHint"></div>
        <div class="eyes-actions" id="eyesActions"></div>`;
      document.body.appendChild(E.el);
      document.body.classList.add('eyes-open');
    }
    intro();
  }
  function closeEyes() {
    clearAll();
    if (E.el) E.el.remove();
    E.el = null;
    E.step = -1;
    document.body.classList.remove('eyes-open');
  }

  // Barre de progression : animée sur `dur` ms, ou fixée à `pct` %.
  function frame(kicker, title, dur, pct) {
    $('#eyesKicker').innerHTML = kicker;
    $('#eyesTitle').textContent = title;
    const bar = $('#eyesBar');
    bar.style.animation = 'none';
    void bar.offsetWidth;
    bar.style.width = (dur ? 0 : pct || 0) + '%';
    if (dur) bar.style.animation = `eyesFill ${dur}ms linear forwards`;
  }
  function hint(html) { $('#eyesHint').innerHTML = html; }
  function actions(html) { $('#eyesActions').innerHTML = html; }
  function stage(html, cls) {
    const s = $('#eyesStage');
    s.className = 'eyes-stage ' + (cls || '');
    s.innerHTML = html;
    return s;
  }
  const skipBtn = '<button class="btn sm" data-local="eyesSkip">Passer l\'étape ⏭</button>';

  function intro() {
    clearAll();
    E.step = -1;
    frame('Avant le match · 2 min', 'Réveil des yeux', 0);
    stage(`<div class="eyes-intro">
        <div class="eyes-big">👀</div>
        <ol class="eyes-steps">${STEPS.map((s, i) => `<li><span>${i + 1}</span>${esc(s.name)}<em>${s.dur ? Math.round(s.dur / 1000) + ' s' : TRIALS + ' essais'}</em></li>`).join('')}</ol>
      </div>`, 'center');
    hint('Tiens le téléphone à 30–40 cm, à hauteur des yeux. <b>Tête immobile</b> : seuls les yeux bougent.<br><span class="muted small">Pas de flash. Arrête si la tête te tourne.</span>');
    actions('<button class="btn primary block" data-local="eyesStart">▶ C\'est parti</button>');
  }

  function runStep(i) {
    clearAll();
    E.step = i;
    if (i >= STEPS.length) return done();
    const s = STEPS[i];
    frame(`Étape ${i + 1}/${STEPS.length}`, s.name, s.dur);
    hint(s.hint);
    actions(skipBtn);
    sfx('select');
    vibrate(25);
    ({ sacc: saccades, pursuit, hands, game: gameStart })[s.key]();
    if (s.dur) later(s.dur, () => runStep(i + 1));
  }

  // 1. Saccades : la cible saute d'un repère à l'autre, de plus en plus vite.
  function saccades() {
    stage('<div class="eye-dot" id="eyeDot"></div>');
    const dot = $('#eyeDot');
    const t0 = Date.now();
    let k = 0;
    const jump = () => {
      const p = PTS[SACC[k++ % SACC.length]];
      dot.style.left = p[0] + '%';
      dot.style.top = p[1] + '%';
      dot.classList.remove('pop');
      void dot.offsetWidth;
      dot.classList.add('pop');
      sfx('tap');
      const t = Date.now() - t0;
      later(t < 12000 ? 1000 : t < 22000 ? 760 : 560, jump);
    };
    jump();
  }

  // 2. Poursuite : la cible suit un 8 couché (courbe de Lissajous 1:2).
  function pursuit() {
    const pts = [];
    for (let a = 0; a <= Math.PI * 2 + 0.01; a += 0.06) pts.push(`${(50 + 40 * Math.sin(a)).toFixed(2)},${(50 + 34 * Math.sin(2 * a)).toFixed(2)}`);
    stage(`<svg class="eye-path" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polyline points="${pts.join(' ')}"/></svg>
      <div class="eye-dot" id="eyeDot"></div>`);
    const dot = $('#eyeDot');
    const t0 = performance.now();
    const loop = now => {
      const t = (now - t0) / 1000;
      const a = (Math.PI * 2 * t) / (t < 10 ? 5 : 4); // un tour en 5 s, puis 4 s
      dot.style.left = (50 + 40 * Math.sin(a)) + '%';
      dot.style.top = (50 + 34 * Math.sin(2 * a)) + '%';
      E.raf = requestAnimationFrame(loop);
    };
    E.raf = requestAnimationFrame(loop);
  }

  // 3. Mains en périphérie : consignes chronométrées autour d'une croix fixe.
  function hands() {
    const s = stage('<div class="eye-cross"></div><span class="hand l">🖐️</span><span class="hand r">🖐️</span>', 'hands');
    const per = STEPS[2].dur / HANDS.length;
    HANDS.forEach((h, i) => later(i * per, () => {
      s.dataset.mode = h.mode;
      hint(`<span class="eyes-count">${i + 1}/${HANDS.length}</span> ${h.text}`);
      if (i) { sfx('select'); vibrate(30); }
    }));
  }

  // 4. Coin de l'œil : un chiffre apparaît une seule fois sur un bord, on le retrouve ensuite.
  function gameStart() {
    E.trial = 0;
    E.score = 0;
    trial();
  }
  function trial() {
    if (E.trial >= TRIALS) return done();
    E.trial++;
    E.phase = 'wait';
    frame(`Étape 4/4 · Essai ${E.trial}/${TRIALS}`, 'Coin de l\'œil', 0, (E.trial - 1) / TRIALS * 100);
    stage('<div class="eye-cross"></div><div class="eye-digit" id="eyeDigit"></div>');
    hint('<b>Fixe la croix.</b> Ne cherche pas le chiffre : laisse-le venir à toi.');
    actions(`<div class="eyes-score">✅ ${E.score}/${E.trial - 1}</div>${skipBtn}`);
    later(rand(900, 1700), flash);
  }
  function flash() {
    E.digit = 1 + Math.floor(Math.random() * 9);
    const p = PTS[EDGES[Math.floor(Math.random() * EDGES.length)]];
    const d = $('#eyeDigit');
    d.textContent = E.digit;
    d.style.left = p[0] + '%';
    d.style.top = p[1] + '%';
    d.classList.add('on');
    later(Math.max(220, 500 - E.score * 35), () => {
      d.classList.remove('on');
      E.phase = 'choose';
      const opts = new Set([E.digit]);
      while (opts.size < 4) opts.add(1 + Math.floor(Math.random() * 9));
      hint('Quel chiffre as-tu vu ?');
      actions(`<div class="eyes-choices">${shuffle([...opts]).map(n => `<button class="btn" data-local="eyesPick" data-arg='${attr({ n })}'>${n}</button>`).join('')}</div>`);
    });
  }
  function pick(n) {
    if (E.phase !== 'choose') return;
    E.phase = 'result';
    const ok = n === E.digit;
    if (ok) E.score++;
    sfx(ok ? 'correct' : 'wrong');
    vibrate(ok ? 20 : [40, 40, 40]);
    hint(ok ? '<b class="ok-t">Bien vu !</b>' : `<b class="bad-t">Raté</b>, c'était le <b>${E.digit}</b>.`);
    actions(`<div class="eyes-score">✅ ${E.score}/${E.trial}</div>`);
    later(900, trial);
  }

  function done() {
    clearAll();
    E.step = STEPS.length;
    const best = Math.max(E.score, Number(store.get(BEST_KEY)) || 0);
    const record = E.score > 0 && E.score >= best;
    store.set(BEST_KEY, String(best));
    frame('Terminé', 'Yeux réveillés', 0, 100);
    stage(`<div class="eyes-done"><div class="eyes-big">✅</div>
        <div class="eyes-result"><b>${E.score}</b>/${TRIALS}</div>
        <div class="muted">${record ? '🏆 Nouveau record perso !' : `Record perso : ${best}/${TRIALS}`}</div></div>`, 'center');
    hint('Ta vision est ouverte. Garde ce regard large en entrant sur le terrain.');
    actions('<div class="row"><button class="btn grow" data-local="eyesStart">↻ Refaire</button><button class="btn primary grow" data-local="eyesClose">Terminer</button></div>');
    sfx('fanfare');
  }

  Local.eyesOpen = () => openEyes();
  Local.eyesClose = () => closeEyes();
  Local.eyesStart = () => runStep(0);
  Local.eyesSkip = () => { if (E.step >= 0) runStep(E.step + 1); };
  Local.eyesPick = d => pick(Number(d.n));

  // =====================================================================
  //  Méditation : 3 séances guidées (inspire 4 s / expire 6 s)
  // =====================================================================

  const IN_MS = 4000;
  const OUT_MS = 6000;
  const SESSIONS = {
    respirer: { name: 'Respirer', icon: '🌬️', dur: 120000, desc: 'Juste le souffle, rien d\'autre.', cues: [] },
    poser: {
      name: 'Se poser', icon: '🪷', dur: 300000, desc: 'Le souffle, avec quelques repères pour relâcher le corps.',
      cues: [[20, 'Relâche les épaules.'], [60, 'Desserre la mâchoire.'], [100, 'Écoute ton souffle, sans le forcer.'],
        [140, 'Sens tes pieds posés au sol.'], [180, 'Une pensée arrive ? Laisse-la passer, reviens au souffle.'],
        [225, 'Relâche le front et les yeux.'], [265, 'Profite encore de quelques respirations.']],
    },
    match: {
      name: 'Avant le match', icon: '⚽', dur: 180000, desc: 'Se calmer, puis se projeter sur sa première action.',
      cues: [[0, 'Respire calmement. Laisse le trajet derrière toi.'], [60, 'Chaque expiration fait redescendre la pression.'],
        [120, 'Pense à ta première action du match : un contrôle propre, une passe simple.'],
        [160, 'Tu es prêt. Garde ce calme en entrant sur le terrain.']],
    },
  };

  const M = { el: null, key: '', timers: [], tick: 0, t0: 0, cue: -1 };
  const $m = sel => M.el && M.el.querySelector(sel);
  const mmss = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

  function meditClear() {
    M.timers.forEach(clearTimeout);
    M.timers = [];
    clearInterval(M.tick);
  }
  function meditOpen(key) {
    const s = SESSIONS[key];
    if (!s) return;
    meditClose(true);
    M.key = key;
    M.el = document.createElement('div');
    M.el.className = 'eyes medit';
    M.el.setAttribute('role', 'dialog');
    M.el.setAttribute('aria-label', 'Méditation : ' + s.name);
    M.el.innerHTML = `<div class="eyes-top"><div><div class="eyes-kicker" id="mKicker">Méditation</div><div class="eyes-title">${esc(s.name)}</div></div>
        <button class="eyes-x" data-local="meditClose" aria-label="Arrêter">✕</button></div>
      <div class="eyes-progress"><i id="mBar"></i></div>
      <div class="eyes-stage center" id="mStage"><div class="breath" id="mBreath"><div class="breath-ring" id="mRing"></div><div class="breath-core"><b id="mPhase">Prêt</b><span id="mSec"></span></div></div></div>
      <div class="eyes-hint" id="mHint">${esc(s.desc)}</div>
      <div class="eyes-actions"><div class="eyes-score" id="mLeft">${mmss(s.dur)}</div></div>`;
    document.body.appendChild(M.el);
    document.body.classList.add('eyes-open');
    duckRadio(true);
    sfx('bell');
    M.timers.push(setTimeout(() => meditRun(s), 1800));
  }
  function meditRun(s) {
    M.t0 = Date.now();
    M.cue = -1;
    const bar = $m('#mBar');
    bar.style.animation = `eyesFill ${s.dur}ms linear forwards`;
    breathe(s);
    M.tick = setInterval(() => {
      const t = Date.now() - M.t0;
      $m('#mLeft').textContent = mmss(s.dur - t);
      const i = s.cues.reduce((acc, c, k) => (t >= c[0] * 1000 ? k : acc), -1);
      if (i !== M.cue && i >= 0) {
        M.cue = i;
        const h = $m('#mHint');
        h.classList.remove('fade');
        void h.offsetWidth;
        h.textContent = s.cues[i][1];
        h.classList.add('fade');
      }
      if (t >= s.dur) meditDone(s);
    }, 250);
  }
  // Un cycle : le cercle grossit pendant l'inspiration, se vide pendant l'expiration.
  function breathe(s) {
    const b = $m('#mBreath');
    const phase = (inhale, ms) => {
      if (!M.el || Date.now() - M.t0 >= s.dur) return;
      $m('#mRing').style.transitionDuration = ms + 'ms';
      b.classList.toggle('in', inhale);
      $m('#mPhase').textContent = inhale ? 'Inspire' : 'Expire';
      const end = Date.now() + ms;
      const sec = $m('#mSec');
      const count = () => { if (M.el) sec.textContent = Math.max(1, Math.ceil((end - Date.now()) / 1000)); };
      count();
      for (let k = 1000; k < ms; k += 1000) M.timers.push(setTimeout(count, k));
      if (inhale) vibrate(40);
      M.timers.push(setTimeout(() => phase(!inhale, inhale ? OUT_MS : IN_MS), ms));
    };
    phase(true, IN_MS);
  }
  function meditDone(s) {
    meditClear();
    const b = $m('#mBreath');
    $m('#mRing').style.transitionDuration = '1500ms';
    b.classList.remove('in');
    $m('#mKicker').textContent = 'Terminé';
    $m('#mPhase').textContent = '✓';
    $m('#mSec').textContent = '';
    $m('#mBar').style.animation = 'none';
    $m('#mBar').style.width = '100%';
    $m('#mHint').textContent = M.key === 'match' ? 'Tu es prêt. Bon match !' : 'Séance terminée. Garde ce calme avec toi.';
    M.el.querySelector('.eyes-actions').innerHTML = `<div class="row"><button class="btn grow" data-local="meditOpen" data-arg='${attr({ k: M.key })}'>↻ Refaire</button>
      <button class="btn primary grow" data-local="meditClose">Terminer</button></div>`;
    sfx('bell');
    vibrate([60, 80, 60]);
    duckRadio(false);
  }
  function meditClose(silent) {
    meditClear();
    if (M.el) {
      M.el.remove();
      M.el = null;
      if (!E.el) document.body.classList.remove('eyes-open');
      if (!silent) duckRadio(false);
    }
  }
  // Pendant la séance, la radio passe en fond (sans effet sur iPhone, qui ignore le volume web).
  function duckRadio(on) {
    try { audio.volume = on ? 0.2 : 1; } catch (e) { /* ignoré */ }
  }

  Local.meditOpen = d => meditOpen(d.k);
  Local.meditClose = () => meditClose();

  function meditCardHtml() {
    return `<article class="gtile ftile" style="--a:#8f8bff;--b:#3a2f9e">
      <div class="gcover" aria-hidden="true"><span class="gcat">Calme</span><span class="gbreath"></span><span class="gemoji">🧘</span></div>
      <div class="gbody">
        <h3>Méditation</h3>
        <p class="gdesc">Inspire 4 secondes, expire 6 secondes : le rythme qui fait redescendre la pression. Ferme les yeux, le téléphone vibre à chaque inspiration.</p>
        <div class="msessions">${Object.entries(SESSIONS).map(([k, s]) => `
          <button class="msession" data-local="meditOpen" data-arg='${attr({ k })}'>
            <span class="mico">${s.icon}</span><span class="rtxt"><b>${esc(s.name)}</b><span>${esc(s.desc)}</span></span>
            <span class="mdur">${s.dur / 60000} min</span></button>`).join('')}</div>
      </div></article>`;
  }

  // =====================================================================
  //  Radio du monde
  // =====================================================================

  const API = ['https://de1.api.radio-browser.info', 'https://de2.api.radio-browser.info', 'https://all.api.radio-browser.info'];
  const FAV_KEY = 'rcs_radio_favs';
  const MOODS = [
    { k: 'top', i: '🔥', l: 'Populaires' },
    { k: 'hiphop', i: '🎤', l: 'Rap' },
    { k: 'afrobeats', i: '🌍', l: 'Afro' },
    { k: 'dance', i: '🪩', l: 'Dance' },
    { k: 'pop', i: '⚡', l: 'Hits' },
    { k: 'chillout', i: '🧘', l: 'Calme' },
    { k: 'sport', i: '⚽', l: 'Sport' },
    { k: 'fav', i: '★', l: 'Favoris' },
  ];
  const COUNTRIES = [
    ['FR', 'France'], ['MA', 'Maroc'], ['DZ', 'Algérie'], ['TN', 'Tunisie'], ['SN', 'Sénégal'], ['CI', 'Côte d\'Ivoire'],
    ['CM', 'Cameroun'], ['ML', 'Mali'], ['CD', 'RD Congo'], ['NG', 'Nigeria'], ['GH', 'Ghana'], ['BR', 'Brésil'],
    ['AR', 'Argentine'], ['ES', 'Espagne'], ['PT', 'Portugal'], ['IT', 'Italie'], ['DE', 'Allemagne'], ['GB', 'Royaume-Uni'],
    ['BE', 'Belgique'], ['NL', 'Pays-Bas'], ['CH', 'Suisse'], ['TR', 'Turquie'], ['US', 'États-Unis'], ['JM', 'Jamaïque'], ['JP', 'Japon'],
  ];
  const COUNTRY_FR = Object.fromEntries(COUNTRIES);

  const R = Local.radio = {
    mood: 'top', country: '', q: '', list: null, loading: false, error: '',
    current: null, status: 'idle', req: 0, cache: {},
  };
  let favs = [];
  try { favs = JSON.parse(store.get(FAV_KEY) || '[]'); } catch (e) { favs = []; }
  const byId = {};
  favs.forEach(s => { byId[s.stationuuid] = s; });

  const https = u => typeof u === 'string' && /^https:\/\//i.test(u);
  function flag(cc) {
    if (!/^[A-Za-z]{2}$/.test(cc || '')) return '🌐';
    return String.fromCodePoint(...cc.toUpperCase().split('').map(c => 127397 + c.charCodeAt(0)));
  }
  function slim(s) {
    return {
      stationuuid: s.stationuuid, name: String(s.name || 'Radio').trim(), url_resolved: s.url_resolved,
      favicon: https(s.favicon) ? s.favicon : '', countrycode: s.countrycode || '', country: s.country || '',
      tags: String(s.tags || ''), bitrate: Number(s.bitrate) || 0,
    };
  }
  // Les flux HLS (.m3u8) ne passent pas partout dans <audio> : on les écarte.
  const playable = s => https(s.url_resolved) && !s.hls && !/\.m3u8(\?|$)/i.test(s.url_resolved);

  async function api(path) {
    for (const host of API) {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 8000);
        const res = await fetch(host + path, { signal: ctrl.signal });
        clearTimeout(t);
        if (res.ok) return await res.json();
      } catch (e) { /* serveur suivant */ }
    }
    throw new Error('Annuaire des radios injoignable');
  }

  function queryKey() { return [R.mood, R.country, R.q].join('|'); }
  async function loadStations() {
    if (R.mood === 'fav') { R.list = favs.slice(); R.error = ''; R.loading = false; return; }
    const key = queryKey();
    if (R.cache[key]) { R.list = R.cache[key]; R.error = ''; return; }
    const id = ++R.req;
    R.loading = true;
    R.error = '';
    const p = new URLSearchParams({ hidebroken: 'true', is_https: 'true', order: 'clickcount', reverse: 'true', limit: '80' });
    if (R.mood !== 'top') p.set('tag', R.mood);
    if (R.country) p.set('countrycode', R.country);
    if (R.q) p.set('name', R.q);
    try {
      const data = await api('/json/stations/search?' + p);
      if (id !== R.req) return;
      const seen = new Set();
      const list = data.filter(playable).map(slim).filter(s => {
        const k = s.name.toLowerCase();
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      }).slice(0, 30);
      list.forEach(s => { byId[s.stationuuid] = s; });
      R.cache[key] = list;
      R.list = list;
    } catch (e) {
      if (id !== R.req) return;
      R.list = [];
      R.error = 'Impossible de charger les radios. Vérifie la connexion (le réseau du train coupe parfois).';
    }
    R.loading = false;
    refresh();
  }
  function reload() { R.list = null; loadStations(); }

  // ---------- Lecture ----------

  const audio = new Audio();
  audio.preload = 'none';
  const setStatus = st => { R.status = st; refresh(); };
  audio.addEventListener('playing', () => setStatus('playing'));
  audio.addEventListener('waiting', () => { if (R.current) setStatus('loading'); });
  // Pause venue de l'extérieur (écran verrouillé, casque) : les pauses de l'app passent par toggle().
  audio.addEventListener('pause', () => { if (R.current && R.status === 'playing') setStatus('paused'); });
  audio.addEventListener('error', () => { if (R.current && audio.getAttribute('src')) setStatus('error'); });

  function play(s) {
    R.current = s;
    R.status = 'loading';
    audio.src = s.url_resolved;
    audio.play().catch(err => { if (R.current === s && (!err || err.name !== 'AbortError')) setStatus('error'); });
    // Compte l'écoute dans l'annuaire (usage demandé par Radio Browser), sans attendre la réponse.
    fetch(API[0] + '/json/url/' + encodeURIComponent(s.stationuuid)).catch(() => {});
    if ('mediaSession' in navigator && window.MediaMetadata) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: s.name, artist: (COUNTRY_FR[s.countrycode] || s.country || 'Radio du monde') + ' · Centre de formation',
          artwork: s.favicon ? [{ src: s.favicon, sizes: '96x96' }] : [],
        });
        navigator.mediaSession.setActionHandler('play', () => toggle());
        navigator.mediaSession.setActionHandler('pause', () => toggle());
        navigator.mediaSession.setActionHandler('stop', () => stop());
      } catch (e) { /* non pris en charge */ }
    }
    refresh();
  }
  function toggle() {
    if (!R.current) return;
    if (R.status === 'paused' || R.status === 'error') return play(R.current);
    audio.pause();
    setStatus('paused');
  }
  function stop() {
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    R.current = null;
    R.status = 'idle';
    refresh();
  }

  Local.radioMood = d => { R.mood = d.k; reload(); };
  Local.radioSearch = d => { R.q = String(d.q || '').trim().slice(0, 40); if (R.mood === 'fav') R.mood = 'top'; reload(); };
  Local.radioClear = () => { R.q = ''; const el = document.querySelector('[data-keep="radio-q"]'); if (el) el.value = ''; reload(); };
  Local.radioPlay = d => {
    const s = byId[d.id];
    if (!s) return;
    if (R.current && R.current.stationuuid === s.stationuuid && R.status !== 'error') toggle();
    else play(s);
  };
  Local.radioToggle = () => toggle();
  Local.radioStop = () => stop();
  Local.radioFav = d => {
    const s = byId[d.id];
    if (!s) return;
    const i = favs.findIndex(f => f.stationuuid === s.stationuuid);
    if (i >= 0) favs.splice(i, 1);
    else favs.unshift(s);
    favs = favs.slice(0, 30);
    store.set(FAV_KEY, JSON.stringify(favs));
    if (R.mood === 'fav') R.list = favs.slice();
  };
  document.addEventListener('change', e => {
    if (e.target && e.target.name === 'radio-country') {
      R.country = e.target.value;
      if (R.mood === 'fav') R.mood = 'top';
      reload();
      UI.rerender();
    }
  });

  // ---------- Affichage ----------

  function logo(s, cls) {
    return `<span class="${cls || 'rlogo'}"><span class="rflag">${flag(s.countrycode)}</span>${s.favicon
      ? `<img src="${esc(s.favicon)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}</span>`;
  }
  const EQ = '<span class="eq" aria-hidden="true"><i></i><i></i><i></i></span>';
  const STATUS = { loading: 'Connexion…', playing: 'En direct', paused: 'En pause', error: 'Station indisponible' };

  function stationHtml(s) {
    const cur = R.current && R.current.stationuuid === s.stationuuid;
    const fav = favs.some(f => f.stationuuid === s.stationuuid);
    const tags = s.tags.split(',').map(t => t.trim()).filter(Boolean).slice(0, 2).join(' · ');
    const meta = [COUNTRY_FR[s.countrycode] || s.country, tags, s.bitrate ? s.bitrate + ' kbps' : ''].filter(Boolean).join(' · ');
    const state = cur ? (R.status === 'playing' ? EQ : R.status === 'error' ? '⚠️' : R.status === 'loading' ? '<span class="spin"></span>' : '▶') : '▶';
    return `<li class="rst ${cur ? 'on ' + R.status : ''}">
      <button class="rplay" data-local="radioPlay" data-arg='${attr({ id: s.stationuuid })}' aria-label="Écouter ${esc(s.name)}">
        ${logo(s)}<span class="rtxt"><b>${esc(s.name)}</b><span>${esc(meta)}</span></span><span class="rstate">${state}</span></button>
      <button class="rfav ${fav ? 'on' : ''}" data-local="radioFav" data-arg='${attr({ id: s.stationuuid })}' aria-label="${fav ? 'Retirer des favoris' : 'Ajouter aux favoris'}">${fav ? '★' : '☆'}</button></li>`;
  }

  function radioHtml() {
    if (R.list == null && !R.loading) loadStations();
    let body;
    if (R.loading || R.list == null) body = '<div class="rempty"><span class="spin"></span> Recherche des stations…</div>';
    else if (R.error) body = `<div class="rempty">${esc(R.error)}<br><button class="btn sm" data-local="radioMood" data-arg='${attr({ k: R.mood })}'>Réessayer</button></div>`;
    else if (!R.list.length) body = `<div class="rempty">${R.mood === 'fav' ? 'Pas encore de favoris : touche ☆ à côté d\'une station.' : 'Aucune station trouvée. Essaie un autre pays ou un autre style.'}</div>`;
    else body = `<ul class="rlist">${R.list.map(stationHtml).join('')}</ul>`;
    return `<article class="gtile ftile" style="--a:#ff5a8a;--b:#6a35d6">
      <div class="gcover" aria-hidden="true"><span class="gcat">Ambiance</span><span class="gwave">${'<i></i>'.repeat(24)}</span><span class="gemoji">📻</span></div>
      <div class="gbody">
        <h3>Radio du monde</h3>
        <p class="gdesc">Des milliers de stations en direct. Choisis ton son pour te mettre dans ta bulle : calme pour te poser, rap ou afro pour monter en pression.</p>
        <div class="rchips" role="tablist">${MOODS.map(m => `<button class="rchip ${R.mood === m.k ? 'on' : ''}" data-local="radioMood" data-arg='${attr({ k: m.k })}'>${m.i} ${m.l}</button>`).join('')}</div>
        <div class="rfilters">
          <select name="radio-country" aria-label="Pays">${[['', '🌐 Tous les pays']].concat(COUNTRIES.map(([c, n]) => [c, flag(c) + ' ' + n]))
            .map(([c, n]) => `<option value="${c}" ${R.country === c ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select>
          <div class="rsearch"><input type="text" name="q" data-in="radio" data-keep="radio-q" maxlength="40" placeholder="Nom d'une station" value="${esc(R.q)}" enterkeyhint="search">
            ${R.q ? '<button class="rclear" data-local="radioClear" aria-label="Effacer">✕</button>' : ''}
            <button class="btn sm" data-local="radioSearch" data-form="radio" aria-label="Chercher">🔎</button></div>
        </div>
        ${body}
        <p class="rsrc">Stations issues de l'annuaire libre radio-browser.info</p>
      </div></article>`;
  }

  function eyesCardHtml() {
    const best = Number(store.get(BEST_KEY)) || 0;
    return `<article class="gtile ftile" style="--a:#3ee0c8;--b:#0b6fa8">
      <div class="gcover" aria-hidden="true"><span class="gcat">Échauffement</span><span class="geyes"><i></i><i></i><i></i><i></i></span><span class="gemoji">👀</span></div>
      <div class="gbody">
        <h3>Réveil des yeux</h3>
        <p class="gdesc">L'échauffement visuel des pros : saccades vers les coins, poursuite, vision périphérique avec les mains, puis un test « coin de l'œil ». Le stress rétrécit le champ de vision : on le rouvre avant d'entrer sur le terrain.</p>
        <div class="gstats"><span><i>⏱</i>~2 min</span><span><i>🎯</i>4 étapes</span>${best ? `<span><i>🏆</i>Record ${best}/${TRIALS}</span>` : ''}</div>
        <div class="gactions"><button class="btn block glaunch" data-local="eyesOpen">▶ Commencer</button></div>
      </div></article>`;
  }

  function tabHtml(S) {
    return `<div class="games-head"><div><div class="kicker">Avant le match</div><h2>Concentration</h2></div><span class="pill">Solo · sans points</span></div>
      <div class="games focus">${meditCardHtml()}${eyesCardHtml()}${window.Videos ? window.Videos.cardHtml(S) : ''}${radioHtml()}</div>`;
  }

  // ---------- Mini-lecteur fixe ----------

  const bar = document.createElement('div');
  bar.id = 'radiobar';
  bar.hidden = true;
  document.body.appendChild(bar);
  function renderBar() {
    const s = R.current;
    document.body.classList.toggle('has-radio', !!s);
    bar.hidden = !s;
    if (!s) { bar.innerHTML = ''; return; }
    const playing = R.status === 'playing';
    bar.className = R.status;
    bar.innerHTML = `${logo(s, 'rlogo sm')}<div class="rtxt"><b>${esc(s.name)}</b><span>${playing ? EQ : ''}${STATUS[R.status] || ''}</span></div>
      <button class="rbtn" data-local="radioToggle" aria-label="${playing || R.status === 'loading' ? 'Pause' : 'Lecture'}">${playing || R.status === 'loading' ? '⏸' : '▶'}</button>
      <button class="rbtn ghost" data-local="radioStop" aria-label="Arrêter la radio">✕</button>`;
  }
  function refresh() {
    renderBar();
    if (document.querySelector('.rlist, .rempty')) UI.rerender();
  }

  window.Focus = {
    tabHtml,
    // Un jeu démarre : on ferme l'exercice pour laisser place au jeu (la radio continue).
    onGame() { if (E.el) closeEyes(); if (M.el) meditClose(); if (window.Videos) window.Videos.close(); },
  };
})();
