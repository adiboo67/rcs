// Onglet « Mental » : vidéos d'actions de joueurs.
//  - Une sélection fixe (chaînes officielles : Ligue 1, Premier League, clubs).
//  - Les liens YouTube partagés par l'équipe, gardés sur le serveur (state.videos).
// Le lecteur s'ouvre dans une surcouche plein écran, hors de #app, pour ne pas être
// rechargé à chaque rafraîchissement. Rien ne se charge depuis YouTube avant le clic,
// à part les miniatures (≈ 10 Ko chacune) : le réseau du train coupe souvent.

(function () {
  const UI = window.UI;
  const { esc, attr, Local } = UI;

  const THEMES = [
    { k: 'all', i: '🔥', l: 'Tout' },
    { k: 'team', i: '👥', l: 'L\'équipe' },
    { k: 'dribble', i: '⚡', l: 'Dribbles' },
    { k: 'but', i: '🎯', l: 'Finition' },
    { k: 'def', i: '🛡️', l: 'Défense' },
    { k: 'gk', i: '🧤', l: 'Gardiens' },
    { k: 'racing', i: '🔵', l: 'Racing' },
    { k: 'mental', i: '🧠', l: 'Mental' },
  ];
  const THEME = Object.fromEntries(THEMES.map(t => [t.k, t]));
  // Thèmes proposés quand on partage une vidéo.
  const SHARE_THEMES = THEMES.filter(t => t.k !== 'all' && t.k !== 'team');

  // Vérifiées via oEmbed (intégration autorisée) en novembre 2026.
  const CURATED = [
    { id: 'CoP-v7WFO1s', theme: 'dribble', title: 'Les plus beaux gestes techniques du PSG en Ligue 1', author: 'PSG' },
    { id: 'Ql-2UXVhTqc', theme: 'dribble', title: 'Ousmane Dembélé : ses dribbles les plus fous', author: 'PSG' },
    { id: 'GTd0ygptkJE', theme: 'dribble', title: '1 heure de dribbles et de gestes en Premier League', author: 'Premier League' },
    { id: '8sxOGAH9G5A', theme: 'but', title: 'Buts mythiques, une touche de plus à chaque fois', author: 'Premier League' },
    { id: 'hNx8caoGXV0', theme: 'but', title: 'Les plus beaux buts de l\'extérieur du pied', author: 'Premier League' },
    { id: 'wpcKyur-kbI', theme: 'but', title: 'Les meilleurs buts de la saison 2024/25', author: 'Premier League' },
    { id: 'wX1TSamowx4', theme: 'def', title: 'L\'art de défendre : tacles, duels et retours', author: 'PSG' },
    { id: '04Q6ybR1bLc', theme: 'def', title: 'Sergio Ramos : tacles et contres', author: 'Real Madrid' },
    { id: 'DiMktLepK8E', theme: 'def', title: 'Top 10 des tacles de la saison', author: 'Bundesliga' },
    { id: 'IFC53SnHN-s', theme: 'gk', title: 'Les plus beaux arrêts de la saison en Ligue 1', author: 'Ligue 1' },
    { id: 'MsNE5AM8Im4', theme: 'gk', title: 'Les meilleurs arrêts de 2020 à 2025', author: 'Premier League' },
    { id: 'W0gD87VWE5Q', theme: 'gk', title: '1 heure d\'arrêts de gardiens', author: 'Premier League' },
    { id: 'glnmIOXTYD4', theme: 'racing', title: 'Le plus beau but de la saison du Racing', author: 'RC Strasbourg Alsace' },
    { id: 'lD7zd-sGXeE', theme: 'racing', title: 'Racing – Paris SG : le top buts', author: 'RC Strasbourg Alsace' },
    { id: 'zJXZDDQOu_0', theme: 'racing', title: 'Top 3 buts du Racing, mi-saison 2019-20', author: 'Ligue 1' },
  ];

  const V = Local.videos = { filter: 'all', adding: false, theme: 'dribble', el: null, cur: null, list: [], pausedRadio: false };
  const thumb = id => `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;
  const watchUrl = id => `https://www.youtube.com/watch?v=${id}`;

  function items(S) {
    const shared = (S && S.videos) || [];
    const all = shared.map(v => Object.assign({ shared: true }, v)).concat(CURATED.filter(c => !shared.some(v => v.id === c.id)));
    if (V.filter === 'all') return all;
    if (V.filter === 'team') return all.filter(v => v.shared);
    return all.filter(v => v.theme === V.filter);
  }

  // ---------- Lecteur plein écran ----------

  function open(v) {
    if (!v) return;
    V.cur = v;
    const radio = Local.radio;
    if (!V.el) {
      V.el = document.createElement('div');
      V.el.className = 'eyes vplayer';
      V.el.setAttribute('role', 'dialog');
      document.body.appendChild(V.el);
      document.body.classList.add('eyes-open');
      // La radio et la vidéo ne jouent pas en même temps : on la relance à la fermeture.
      if (radio && radio.status === 'playing') { Local.radioToggle(); V.pausedRadio = true; }
    }
    const t = THEME[v.theme] || THEME.mental;
    const i = V.list.findIndex(x => x.id === v.id);
    const next = V.list.length > 1 ? V.list[(i + 1) % V.list.length] : null;
    V.el.setAttribute('aria-label', 'Vidéo : ' + v.title);
    V.el.innerHTML = `<div class="eyes-top"><div class="vhead"><div class="eyes-kicker">${t.i} ${esc(t.l)}</div><div class="vtitle">${esc(v.title)}</div></div>
        <button class="eyes-x" data-local="vidClose" aria-label="Fermer">✕</button></div>
      <div class="vframe"><iframe src="https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1&playsinline=1&rel=0"
        title="${esc(v.title)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>
      <div class="vmeta">${esc(v.author || '')}${v.shared ? ` · partagée par <b>${esc(v.by)}</b>` : ''}</div>
      <div class="vtip">Regarde d'abord en entier. Ensuite, revois le geste et imagine-toi le faire : même appui, même regard, même timing.</div>
      <div class="vactions">
        <a class="btn sm" href="${watchUrl(v.id)}" target="_blank" rel="noopener">YouTube ↗</a>
        ${next ? `<button class="btn sm primary" data-local="vidPlay" data-arg='${attr({ id: next.id })}'>Suivante ⏭</button>` : ''}
      </div>`;
  }

  function close() {
    if (!V.el) return;
    V.el.remove();
    V.el = null;
    V.cur = null;
    document.body.classList.remove('eyes-open');
    if (V.pausedRadio && Local.radio && Local.radio.status === 'paused') Local.radioToggle();
    V.pausedRadio = false;
  }

  Local.vidPlay = d => open(V.list.find(v => v.id === d.id));
  Local.vidClose = () => close();
  Local.vidFilter = d => { V.filter = d.k; };
  Local.vidAdding = () => { V.adding = !V.adding; };
  Local.vidTheme = d => { V.theme = d.k; };
  Local.vidShare = d => {
    const url = String(d.url || '').trim();
    if (!url) return;
    UI.emit('video_add', { url, theme: V.theme });
    const el = document.querySelector('[data-keep="vid-url"]');
    if (el) el.value = '';
    V.adding = false;
    V.filter = 'team';
  };
  Local.vidDel = d => UI.emit('video_del', { id: d.id });

  // ---------- Carte ----------

  function itemHtml(v, S) {
    const t = THEME[v.theme] || THEME.mental;
    const canDel = v.shared && S && S.me && (S.me.isHost || S.me.id === v.byId);
    return `<li class="vitem">
      <button class="vplay" data-local="vidPlay" data-arg='${attr({ id: v.id })}' aria-label="Regarder ${esc(v.title)}">
        <span class="vthumb"><img src="${thumb(v.id)}" alt="" loading="lazy" referrerpolicy="no-referrer"><span class="vbadge">${t.i}</span><span class="vico" aria-hidden="true">▶</span></span>
        <span class="vtxt"><b>${esc(v.title)}</b><span>${v.shared ? `👥 ${esc(v.by)}` : esc(v.author)}</span></span></button>
      ${canDel ? `<button class="vdel" data-local="vidDel" data-arg='${attr({ id: v.id })}' data-confirm="Retirer cette vidéo pour toute l'équipe ?" aria-label="Retirer">✕</button>` : ''}
    </li>`;
  }

  function cardHtml(S) {
    const shared = (S && S.videos) || [];
    if (V.filter === 'team' && !shared.length) V.filter = 'all'; // la puce « L'équipe » disparaît quand la liste est vide
    V.list = items(S);
    const chips = THEMES.filter(t => t.k !== 'team' || shared.length).map(t =>
      `<button class="rchip ${V.filter === t.k ? 'on' : ''}" data-local="vidFilter" data-arg='${attr({ k: t.k })}'>${t.i} ${esc(t.l)}${t.k === 'team' ? ` <i class="vcount">${shared.length}</i>` : ''}</button>`).join('');
    const body = V.list.length
      ? `<ul class="vgrid">${V.list.map(v => itemHtml(v, S)).join('')}</ul>`
      : `<div class="rempty">Aucune vidéo dans cette catégorie pour l'instant.<br>Partage la première !</div>`;
    const form = V.adding ? `<div class="vform">
        <input type="url" name="url" data-in="vid" data-keep="vid-url" maxlength="300" inputmode="url" autocomplete="off" placeholder="Colle un lien YouTube" enterkeyhint="send">
        <div class="vthemes">${SHARE_THEMES.map(t => `<button class="rchip ${V.theme === t.k ? 'on' : ''}" data-local="vidTheme" data-arg='${attr({ k: t.k })}'>${t.i} ${esc(t.l)}</button>`).join('')}</div>
        <div class="row"><button class="btn sm" data-local="vidAdding">Annuler</button><button class="btn sm primary grow" data-local="vidShare" data-form="vid">Partager</button></div>
      </div>` : `<button class="btn block vaddbtn" data-local="vidAdding">➕ Partager une vidéo YouTube</button>`;
    return `<article class="gtile ftile" style="--a:#ff4d5e;--b:#8a1030">
      <div class="gcover" aria-hidden="true"><span class="gcat">Inspiration</span><span class="gfilm"><i></i><i></i><i></i></span><span class="gemoji">🎬</span></div>
      <div class="gbody">
        <h3>Vidéos d'actions</h3>
        <p class="gdesc">Regarde les meilleurs le faire avant de le faire toi-même : voir un geste prépare le cerveau à le reproduire. Partage aussi tes vidéos préférées avec l'équipe.</p>
        <div class="rchips" role="tablist">${chips}</div>
        ${body}
        ${form}
        <p class="rsrc">Vidéos lues depuis YouTube · les miniatures se chargent seulement quand l'onglet est ouvert</p>
      </div></article>`;
  }

  window.Videos = { cardHtml, close };
})();
