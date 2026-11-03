(function () {
  const { esc, attr, timer, ranking, avatar, Local, send } = UI;
  const SYMBOL = { skip: '⊘', rev: '⇄', '+2': '+2', wild: '★', '+4': '+4' };
  const COLOR_NAME = { r: 'Rouge', y: 'Jaune', g: 'Vert', b: 'Bleu' };

  function card(c, extra, attrs) {
    const sym = SYMBOL[c.v] || esc(c.v);
    return `<div class="ucard ${c.c} ${extra || ''}" ${attrs || ''}><span class="face"></span><span class="oval"></span>
      <span class="ix tl">${sym}</span><span class="val">${sym}</span><span class="ix br">${sym}</span></div>`;
  }
  function back(attrs) {
    return `<div class="ucard back big" ${attrs || ''}><span class="face"></span><span class="oval"></span><span class="val">RCS</span></div>`;
  }

  Local.unoPlay = d => {
    if (d.wild) { Local.unoWild = d.card; return; }
    send('play', { card: d.card, uno: !!Local.unoArmed });
    Local.unoArmed = false;
  };
  Local.unoColor = d => {
    send('play', { card: Local.unoWild, color: d.color, uno: !!Local.unoArmed });
    Local.unoWild = null;
    Local.unoArmed = false;
  };
  Local.unoCancel = () => { Local.unoWild = null; };
  Local.unoToggle = () => { Local.unoArmed = !Local.unoArmed; };

  function overview(v) {
    return `<div class="card"><h3>Tables ${v.isFinale ? '(finale)' : ''}</h3><ul class="list">${v.overview.map(t => `<li>
      <span class="grow">Table ${t.no} · ${t.n} joueurs</span>
      <span class="small">${t.winner ? '🏆 ' + esc(t.winner) : '▶️ ' + esc(t.turn)}</span></li>`).join('')}</ul></div>`;
  }

  function results(v, S) {
    const host = S.me.isHost;
    return `<div class="card blue center"><div class="big">🏁 Fin de la manche ${v.round}</div>
        <p class="muted">${v.isFinale ? 'Finale terminée !' : 'Toutes les tables ont un gagnant.'}</p></div>
      ${v.results.map(t => `<div class="card"><h3>Table ${t.no}</h3><ul class="list">${t.rows.map((r, i) => `<li>
        <span class="rank">${i === 0 ? '🏆' : i + 1}</span><span class="grow">${esc(r.name)}</span>
        <span class="small muted">${r.cards} carte${r.cards > 1 ? 's' : ''}</span></li>`).join('')}</ul></div>`).join('')}
      <div class="card"><h3>Classement du tournoi</h3>${ranking(v.totals)}</div>
      ${host ? `<div class="stack">
        ${v.canFinale ? '<button class="btn primary block" data-hostgame="finale">🏆 Lancer la finale des gagnants</button>' : ''}
        <button class="btn block" data-hostgame="rematch">🔁 Nouvelle manche pour tous</button>
        <button class="btn ok block" data-hostgame="end">✅ Terminer et donner les points</button></div>`
        : '<p class="center muted">L\'organisateur choisit la suite…</p>'}`;
  }

  Games.uno = function (v, S) {
    if (v.phase === 'results') return results(v, S);
    const strip = v.order.map(p => `<div class="pchip ${p.turn ? 'turn' : ''} ${p.me ? 'me' : ''}">
      ${avatar(p.name)}${esc(p.name)}${p.away ? ' 📵' : ''} <span class="n">${p.count}</span></div>`).join('');
    const dir = v.dir === 1 ? '↻' : '↺';
    const center = `<div class="uno-center">
      ${back(v.myTurn && v.drawn == null ? 'data-act="draw"' : '')}
      ${card(v.top, 'big')}
      <div class="center"><span class="colordot ${v.color}"></span><div class="small muted">${COLOR_NAME[v.color]}</div><div class="big">${dir}</div></div></div>`;

    let actions = '';
    if (v.winner) {
      actions = `<div class="card soft center"><div class="big">🏆 ${esc(v.winner)}</div><p class="muted">En attente des autres tables…</p></div>`;
    } else if (v.myTurn) {
      const two = v.hand.length === 2;
      actions = `<div class="card blue center"><b>À toi de jouer !</b>${timer(v.deadline)}
        <div class="row" style="justify-content:center;margin-top:4px">
          ${v.drawn == null ? '<button class="btn light" data-act="draw">Piocher</button>' : '<button class="btn light" data-act="pass">Passer</button>'}
          ${two ? `<button class="btn ${Local.unoArmed ? 'ok' : 'light'}" data-local="unoToggle">${Local.unoArmed ? 'UNO ! ✅' : 'Dire UNO'}</button>` : ''}
        </div>${two && !Local.unoArmed ? '<p class="small">Il te reste 2 cartes : dis UNO avant de jouer, sinon +2 !</p>' : ''}</div>`;
    } else {
      const turn = v.order.find(p => p.turn);
      actions = `<div class="card center"><span class="muted">Au tour de</span> <b>${esc(turn ? turn.name : '?')}</b>${timer(v.deadline)}</div>`;
    }

    const hand = v.hand.map(c => c.ok
      ? card(c, 'ok', `data-local="unoPlay" data-arg='${attr({ card: c.id, wild: c.c === 'w' })}'`)
      : card(c, v.myTurn ? 'dim' : '')).join('');

    const picker = Local.unoWild != null && v.myTurn ? `<div class="overlay"><div class="sheet"><h3>Choisis la couleur</h3>
      <div class="colors">${['r', 'y', 'g', 'b'].map(c => `<button class="btn ${c}" data-local="unoColor" data-arg='${attr({ color: c })}'>${COLOR_NAME[c]}</button>`).join('')}</div>
      <div class="spacer"></div><button class="btn block" data-local="unoCancel">Annuler</button></div></div>` : '';
    if (!v.myTurn) Local.unoWild = null;

    return `<div class="row between small muted"><span>Table ${v.table}${v.isFinale ? ' · FINALE' : ''} · manche ${v.round}</span><span>${v.hand.length} cartes</span></div>
      <div class="players-strip">${strip}</div>${center}
      <p class="uno-log">${esc(v.log) || '&nbsp;'}</p><div class="uno-table-end"></div>${actions}
      <div class="hand">${hand}</div>${picker}
      <div class="spacer"></div>${v.overview.length > 1 ? overview(v) : ''}`;
  };
  Games.uno.spectator = v => (v.phase === 'results' ? '' : overview(v));
})();
