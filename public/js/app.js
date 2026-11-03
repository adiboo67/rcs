// Cœur de l'interface : connexion, accueil, classement, panneau organisateur.
// Chaque jeu enregistre son rendu dans window.Games[clé] = (view, state) => html.

(function () {
  const app = document.getElementById('app');
  const statusEl = document.getElementById('status');
  const toastEl = document.getElementById('toast');
  const TOKEN_KEY = 'rcs_train_token';
  const SKIPPABLE = ['quiz', 'quiest', 'compos', 'loupgarou', 'undercover', 'petitbac', 'mercato', 'anecdotes'];

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* navigation privée */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* navigation privée */ } },
  };

  let socket = null;
  let S = null; // dernier état reçu du serveur
  let offset = 0; // heure serveur - heure locale
  let connected = false;
  let needJoin = false;
  let lastHtml = '';
  const totals = {}; // durée initiale de chaque minuteur
  const Local = { hubTab: 'classement' };

  // ---------- Outils pour les jeux ----------

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function attr(obj) { return esc(JSON.stringify(obj)); }
  function serverNow() { return Date.now() + offset; }
  function timer(deadline) {
    if (!deadline) return '';
    if (!totals[deadline]) totals[deadline] = Math.max(1000, deadline - serverNow());
    return `<div class="row between small muted"><span>Temps restant</span><span class="cd" data-cd="${deadline}"></span></div>
      <div class="timer"><div class="timer-bar" data-bar="${deadline}"></div></div>`;
  }
  function medal(place) { return ['🥇', '🥈', '🥉'][place - 1] || place; }
  function waitingNote(done, total, label) {
    return `<p class="center muted small">${done}/${total} ${label || 'ont répondu'}</p>`;
  }
  function ranking(rows, opts) {
    opts = opts || {};
    if (!rows || !rows.length) return '<p class="muted">Personne pour l\'instant.</p>';
    return `<ul class="list">${rows.map((r, i) => `<li class="${S && r.name === S.me.name ? 'me' : ''}">
      <span class="rank">${medal(r.place || i + 1)}</span><span class="grow">${esc(r.name)}</span>
      <span class="pts">${esc(r.score)}${opts.unit ? ' ' + opts.unit : ''}</span></li>`).join('')}</ul>`;
  }

  window.UI = { esc, attr, timer, medal, waitingNote, ranking, Local, rerender: () => render(true), serverNow, send };
  window.Games = window.Games || {};

  // ---------- Connexion ----------

  function start() {
    socket = io({ transports: ['websocket', 'polling'], reconnectionDelayMax: 3000 });
    socket.on('connect', () => {
      connected = true;
      socket.emit('hello', { token: store.get(TOKEN_KEY) });
      render();
    });
    socket.on('disconnect', () => { connected = false; renderStatus(); });
    socket.on('welcome', ({ token }) => { store.set(TOKEN_KEY, token); needJoin = false; });
    socket.on('need_join', () => { S = null; needJoin = true; store.del(TOKEN_KEY); render(); });
    socket.on('state', st => {
      offset = st.now - Date.now();
      S = st;
      render();
    });
    socket.on('toast', toast);
    setInterval(tick, 250);
    document.addEventListener('click', onClick);
    document.addEventListener('input', onInput);
    document.addEventListener('keydown', onKey);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') { keepAwake(); if (!socket.connected) socket.connect(); }
    });
  }

  function send(action, data) { socket.emit('act', { action, data: data || {} }); }

  let toastTimer = null;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastEl.hidden = true; }, 2800);
  }

  // Garde l'écran allumé pendant les jeux (quand le navigateur le permet).
  let wakeLock = null;
  async function keepAwake() {
    try {
      if ('wakeLock' in navigator && !wakeLock) {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => { wakeLock = null; });
      }
    } catch (e) { /* refusé : pas grave */ }
  }

  // ---------- Événements ----------

  function collect(form) {
    const data = {};
    document.querySelectorAll(`[data-in="${form}"]`).forEach(el => {
      if (el.type === 'checkbox') data[el.name] = el.checked;
      else if (el.type === 'radio') { if (el.checked) data[el.name] = el.value; }
      else data[el.name] = el.value;
    });
    return data;
  }

  function onClick(e) {
    const el = e.target.closest('[data-act],[data-host],[data-hostgame],[data-local]');
    if (!el || el.disabled || el.classList.contains('disabled')) return;
    if (el.dataset.confirm && !window.confirm(el.dataset.confirm)) return;
    keepAwake();
    let arg = {};
    try { arg = el.dataset.arg ? JSON.parse(el.dataset.arg) : {}; } catch (err) { arg = {}; }
    const data = Object.assign({}, el.dataset.form ? collect(el.dataset.form) : {}, arg);
    if (navigator.vibrate) { try { navigator.vibrate(12); } catch (err) { /* ignoré */ } }
    if (el.dataset.local) {
      const fn = Local[el.dataset.local];
      if (typeof fn === 'function') fn(data, el);
      render(true);
      return;
    }
    if (el.dataset.act) send(el.dataset.act, data);
    if (el.dataset.host) socket.emit('host', { action: el.dataset.host, data });
    if (el.dataset.hostgame) socket.emit('host', { action: 'game', data: Object.assign({ type: el.dataset.hostgame }, data) });
  }

  const liveTimers = {};
  function onInput(e) {
    const el = e.target;
    if (!el.dataset || !el.dataset.live) return;
    clearTimeout(liveTimers[el.name]);
    liveTimers[el.name] = setTimeout(() => send(el.dataset.live, { field: el.name, value: el.value }), 350);
  }

  function onKey(e) {
    if (e.key !== 'Enter' || e.target.tagName === 'TEXTAREA') return;
    const form = e.target.dataset && e.target.dataset.in;
    if (!form) return;
    e.preventDefault();
    const btn = document.querySelector(`[data-form="${form}"].primary, [data-form="${form}"]`);
    if (btn) btn.click();
  }

  // ---------- Rendu ----------

  function patch(html, force) {
    if (!force && html === lastHtml) return;
    lastHtml = html;
    const keep = {};
    app.querySelectorAll('[data-keep]').forEach(el => { keep[el.dataset.keep] = el.value; });
    const active = document.activeElement;
    const focusKey = active && active.dataset ? active.dataset.keep : null;
    let sel = null;
    if (focusKey) { try { sel = [active.selectionStart, active.selectionEnd]; } catch (e) { sel = null; } }
    app.innerHTML = html;
    app.querySelectorAll('[data-keep]').forEach(el => {
      if (keep[el.dataset.keep] != null && keep[el.dataset.keep] !== '') el.value = keep[el.dataset.keep];
    });
    if (focusKey) {
      const el = app.querySelector(`[data-keep="${focusKey}"]`);
      if (el) {
        el.focus({ preventScroll: true });
        if (sel) { try { el.setSelectionRange(sel[0], sel[1]); } catch (e) { /* champ number */ } }
      }
    }
    tick();
  }

  function renderStatus() {
    const dot = `<span class="dot ${connected ? '' : 'off'}" title="${connected ? 'Connecté' : 'Reconnexion…'}"></span>`;
    if (!S || !S.me) { statusEl.innerHTML = `<span class="chip">${dot}${connected ? 'En ligne' : 'Hors ligne'}</span>`; return; }
    statusEl.innerHTML = `<span class="chip">${dot}${S.online} 👥</span><span class="chip">⭐ ${S.me.score}</span>`;
  }

  function render(force) {
    renderStatus();
    if (!S || !S.me) {
      if (needJoin) return patch(joinHtml(), force);
      return patch(`<div class="card center muted">${connected ? 'Chargement…' : 'Connexion au serveur… (tunnel ?)'}</div>`, force);
    }
    if (S.game) return patch(gameHtml(), force);
    patch(hubHtml(), force);
  }

  function tick() {
    const now = serverNow();
    document.querySelectorAll('[data-cd]').forEach(el => {
      const left = Math.max(0, Number(el.dataset.cd) - now);
      el.textContent = Math.ceil(left / 1000) + ' s';
    });
    document.querySelectorAll('[data-bar]').forEach(el => {
      const d = Number(el.dataset.bar);
      const left = Math.max(0, d - now);
      const pct = Math.min(100, (left / (totals[d] || left || 1)) * 100);
      el.style.width = pct + '%';
      el.classList.toggle('low', left < 5000);
    });
  }

  // ---------- Écran d'arrivée ----------

  Local.join = () => {
    const d = collect('join');
    socket.emit('join', { name: d.name, pin: d.pin || undefined });
  };

  function joinHtml() {
    return `<div class="join-hero"><img src="logo.webp" alt="Logo RC Strasbourg Alsace">
        <h1>Centre de formation</h1>
        <p class="muted">RCS Alsace · 11 jeux · 1 classement</p></div>
      <div class="card">
        <label class="field"><span>Ton pseudo</span>
          <input type="text" name="name" data-in="join" data-keep="join-name" maxlength="16" autocomplete="nickname" placeholder="Ex : Yanis 10"></label>
        <details><summary>Je suis l'organisateur</summary>
          <label class="field"><span>Code organisateur</span>
          <input type="password" name="pin" data-in="join" data-keep="join-pin" inputmode="numeric" placeholder="Code"></label></details>
        <div class="spacer"></div>
        <button class="btn primary block" data-local="join" data-form="join">C'est parti ! 🚆</button>
      </div>`;
  }

  // ---------- Accueil ----------

  Local.tab = d => { Local.hubTab = d.tab; Local.tabChosen = true; };
  Local.becomeHost = () => {
    const pin = window.prompt('Code organisateur :');
    if (pin) socket.emit('become_host', { pin });
  };
  Local.leave = () => { socket.emit('leave'); store.del(TOKEN_KEY); };

  // ---------- Partage du lien (QR code) ----------

  let share = null; // { url, svg } fourni par le serveur
  let shareLoading = false;
  function loadShare() {
    if (share || shareLoading) return;
    shareLoading = true;
    fetch('/api/share').then(r => r.json()).then(d => { share = d; render(true); })
      .catch(() => { share = { url: location.origin + '/', svg: null }; render(true); })
      .finally(() => { shareLoading = false; });
  }
  Local.openShare = () => { Local.hubTab = 'orga'; Local.tabChosen = true; };
  Local.copyLink = () => {
    const url = share ? share.url : location.origin + '/';
    const done = () => toast('Lien copié ✅');
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(url).then(done, () => window.prompt('Copie le lien :', url));
    else window.prompt('Copie le lien :', url);
  };
  Local.shareLink = () => {
    const url = share ? share.url : location.origin + '/';
    navigator.share({ title: 'Centre de formation — RCS Alsace', text: 'Rejoins les jeux du train 🚆', url }).catch(() => { /* annulé */ });
  };

  function shareHtml() {
    loadShare();
    const url = share ? share.url : '';
    return `<div class="card center"><h3>📲 Faire rejoindre les joueurs</h3>
      <p class="muted small">Ils scannent ce QR code avec l'appareil photo de leur téléphone.</p>
      <div class="qr">${share && share.svg ? share.svg : `<span class="muted small">${share ? 'QR code indisponible' : 'Chargement…'}</span>`}</div>
      ${url ? `<p class="qr-url"><b>${esc(url)}</b></p>` : ''}
      <div class="row" style="justify-content:center">
        <button class="btn sm" data-local="copyLink">📋 Copier le lien</button>
        ${navigator.share ? '<button class="btn sm primary" data-local="shareLink">📤 Partager</button>' : ''}
      </div></div>`;
  }

  function hubHtml() {
    const me = S.me;
    let html = '';
    if (S.lastResult) html += resultHtml(S.lastResult);
    html += `<div class="card soft center"><div class="big">⏳</div>
      <p><b>${me.isHost ? 'Choisis un jeu dans l\'onglet « Les jeux » et lance-le.' : 'L\'organisateur va lancer le prochain jeu.'}</b></p>
      <p class="muted small">Garde l'appli ouverte : le jeu s'affichera tout seul.</p>
      ${me.isHost ? '<button class="btn sm" data-local="openShare">📲 QR code pour inviter</button>' : '<button class="btn sm" data-local="becomeHost">🔑 Je suis l\'organisateur</button>'}</div>`;
    const tabs = [['classement', '🏆 Classement'], ['jeux', me.isHost ? '🎮 Lancer un jeu' : '🎮 Les jeux']];
    if (me.isHost) tabs.push(['orga', '🛠️ Gérer']);
    if (me.isHost && !Local.tabChosen) Local.hubTab = 'jeux';
    if (!tabs.some(t => t[0] === Local.hubTab)) Local.hubTab = 'classement';
    html += `<div class="seg" style="margin-bottom:14px">${tabs.map(([k, l]) =>
      `<button class="btn sm ${Local.hubTab === k ? 'selected' : ''}" data-local="tab" data-arg='${attr({ tab: k })}'>${l}</button>`).join('')}</div>`;
    if (Local.hubTab === 'classement') html += standingsHtml();
    if (Local.hubTab === 'jeux') {
      if (!me.isHost) {
        html += `<div class="card soft center"><p class="small">Seul l'organisateur peut lancer un jeu.</p>
          <button class="btn primary" data-local="becomeHost">🔑 Entrer le code organisateur</button></div>`;
      }
      html += catalogHtml(me.isHost);
    }
    if (Local.hubTab === 'orga' && me.isHost) html += shareHtml() + adminHtml();
    html += `<div class="row between small muted" style="margin-top:20px">
      <span>Connecté : <b>${esc(me.name)}</b></span>
      <span class="row">${me.isHost ? '<span class="pill">Organisateur</span>' : '<button class="btn sm" data-local="becomeHost">Organisateur</button>'}
      <button class="btn sm danger" data-local="leave" data-confirm="Quitter ? Tes points seront perdus.">Quitter</button></span></div>`;
    return html;
  }

  function resultHtml(r) {
    const top = r.rows.slice(0, 3);
    const order = [top[1], top[0], top[2]];
    const mine = r.rows.find(x => x.pid === S.me.id);
    return `<div class="card blue">
      <div class="row between"><h2>${esc(r.icon)} ${esc(r.game)}</h2><span class="pill gold">Résultats</span></div>
      ${r.extra && r.extra.text ? `<p><b>${esc(r.extra.text)}</b></p>` : ''}
      <div class="podium">${order.map((x, i) => x ? `<div class="step p${[2, 1, 3][i]}">
        <div class="medal">${medal(x.place)}</div><div class="nm">${esc(x.name)}</div><div class="small">+${x.pts} pts</div></div>` : '<div></div>').join('')}</div>
      ${mine ? `<p class="center">Toi : <b>${mine.place}${mine.place === 1 ? 'er' : 'e'}</b> → <b>+${mine.pts} points</b></p>` : ''}
      <details><summary style="color:#fff">Tout le classement du jeu</summary>
        <ul class="list">${r.rows.map(x => `<li><span class="rank" style="color:#fff">${x.place}</span><span class="grow">${esc(x.name)}</span><span class="small">${esc(x.score)}</span><b>+${x.pts}</b></li>`).join('')}</ul>
      </details></div>`;
  }

  function standingsHtml() {
    let html = `<div class="card"><h3>🏆 Classement général</h3><ul class="list">${S.scoreboard.map((p, i) => `
      <li class="${p.id === S.me.id ? 'me' : ''}"><span class="rank">${medal(i + 1)}</span>
      <span class="grow">${esc(p.name)}${p.connected ? '' : ' <span class="small muted">· 📵</span>'}</span>
      <span class="pts">${p.score}</span></li>`).join('')}</ul></div>`;
    if (S.history.length) {
      html += `<div class="card"><h3>📜 Jeux déjà joués</h3><ul class="list">${S.history.slice().reverse().map(h =>
        `<li><span class="grow">${esc(h.game)}</span><span class="small muted">🥇 ${esc(h.podium[0] || '-')}</span></li>`).join('')}</ul></div>`;
    }
    return html;
  }

  function catalogHtml(host) {
    return S.catalog.map(g => `<div class="card"><div class="gamecard"><div class="ico">${g.icon}</div>
      <div class="grow"><h3>${esc(g.name)}</h3><p class="muted small">${esc(g.desc)}</p>
      ${host ? `${g.options.map(o => `<label class="field"><span>${esc(o.label)}</span>
          <input type="number" name="${o.key}" data-in="opt-${g.key}" value="${o.def}" min="${o.min}" max="${o.max}"></label>`).join('')}
        <button class="btn primary block" data-host="start" data-form="opt-${g.key}" data-arg='${attr({ key: g.key })}'
          ${S.online < g.min ? 'disabled' : ''}>▶️ Lancer pour tout le monde</button>
        ${S.online < g.min ? `<p class="small muted">Minimum ${g.min} joueurs connectés.</p>` : ''}` : `<span class="pill">${g.min > 1 ? g.min + ' joueurs min.' : 'Dès 1 joueur'}</span>`}
      </div></div></div>`).join('');
  }

  function adminHtml() {
    return `<div class="card"><h3>👥 Participants (${S.scoreboard.length})</h3><ul class="list">${S.scoreboard.map(p => `
      <li><span class="grow">${esc(p.name)} ${p.connected ? '' : '<span class="small muted">· hors ligne</span>'}</span>
      ${p.id === S.me.id ? '' : `<button class="btn sm danger" data-host="kick" data-arg='${attr({ pid: p.id })}' data-confirm="Retirer ${esc(p.name)} ?">Retirer</button>`}</li>`).join('')}</ul>
      <hr><button class="btn danger block" data-host="resetScores" data-confirm="Remettre tous les scores à zéro ?">Remettre les scores à zéro</button></div>`;
  }

  // ---------- Écran de jeu ----------

  function gameHtml() {
    const g = S.game;
    const host = S.me.isHost;
    let body;
    if (g.view && g.view.spectator) {
      body = `<div class="card soft center"><div class="big">👀</div><p><b>${esc(g.view.msg || 'Partie en cours')}</b></p></div>`;
      const fn = window.Games[g.key];
      if (fn && fn.spectator) body += fn.spectator(g.view, S);
    } else {
      const fn = window.Games[g.key];
      try {
        body = fn ? fn(g.view, S) : '<p>Jeu inconnu.</p>';
      } catch (e) {
        console.error(e);
        body = '<div class="card">Erreur d\'affichage. Patiente quelques secondes…</div>';
      }
    }
    return `<div class="gamebar"><div class="title">${g.icon} ${esc(g.name)}</div>
      ${host ? `<div class="hostbar">
        ${SKIPPABLE.includes(g.key) ? '<button class="btn sm" data-hostgame="skip">⏭ Passer</button>' : ''}
        <button class="btn sm danger" data-host="stop" data-confirm="Arrêter le jeu pour tout le monde (sans points) ?">⏹</button></div>` : ''}
    </div>${body}`;
  }

  UI.start = start;
})();
