(function () {
  const { esc, attr, timer, ranking, avatar, cue } = UI;
  const GOAL = 56;
  const DICE = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

  // Plateau 15 × 15 : parcours commun de 52 cases, en partant de la case de sortie du rouge.
  const PATH = [];
  (function buildPath() {
    const seg = (r0, c0, dr, dc, n) => { for (let i = 0; i < n; i++) PATH.push([r0 + dr * i, c0 + dc * i]); };
    seg(6, 1, 0, 1, 5); seg(5, 6, -1, 0, 6); PATH.push([0, 7]);
    seg(0, 8, 1, 0, 6); seg(6, 9, 0, 1, 6); PATH.push([7, 14]);
    seg(8, 14, 0, -1, 6); seg(9, 8, 1, 0, 6); PATH.push([14, 7]);
    seg(14, 6, -1, 0, 6); seg(8, 5, 0, -1, 6); PATH.push([7, 0]); PATH.push([6, 0]);
  })();
  // Escalier de chaque place (5 cases avant le centre), écuries et coins.
  const STAIRS = [
    [1, 2, 3, 4, 5].map(c => [7, c]),
    [1, 2, 3, 4, 5].map(r => [r, 7]),
    [13, 12, 11, 10, 9].map(c => [7, c]),
    [13, 12, 11, 10, 9].map(r => [r, 7]),
  ];
  const CORNER = [[0, 0], [0, 9], [9, 9], [9, 0]];
  const SEAT_COLOR = ['r', 'g', 'y', 'b'];

  function cellOf(seat, pos, h) {
    if (pos < 0) {
      const [r, c] = CORNER[seat];
      return [r + 1 + (h >> 1) * 3, c + 1 + (h & 1) * 3];
    }
    if (pos <= 50) return PATH[(seat * 13 + pos) % 52];
    if (pos < GOAL) return STAIRS[seat][pos - 51];
    return null;
  }
  const area = (r, c, h, w) => `grid-area:${r + 1}/${c + 1}/span ${h || 1}/span ${w || 1}`;

  function board(v) {
    const used = new Set(v.seats.map(p => p.seat));
    let html = '';
    // Coins (écuries)
    CORNER.forEach(([r, c], seat) => {
      const p = v.seats.find(x => x.seat === seat);
      html += `<div class="pc-stable ${SEAT_COLOR[seat]} ${used.has(seat) ? '' : 'off'}" style="${area(r, c, 6, 6)}">
        <span class="pc-tag">${p ? esc(p.name) : ''}</span></div>`;
    });
    // Parcours
    PATH.forEach(([r, c], i) => {
      const start = i % 13 === 0 ? SEAT_COLOR[i / 13] : '';
      html += `<div class="pc-cell ${start ? 'start ' + start : ''}" style="${area(r, c)}">${start ? '➜' : ''}</div>`;
    });
    STAIRS.forEach((cells, seat) => cells.forEach(([r, c], k) => {
      html += `<div class="pc-cell stair ${SEAT_COLOR[seat]}" style="${area(r, c)}">${k + 1}</div>`;
    }));
    html += `<div class="pc-center" style="${area(6, 6, 3, 3)}">${v.seats.map(p => p.home
      ? `<span class="pc-home ${p.color}">${p.home}</span>` : '').join('')}</div>`;

    // Chevaux, regroupés par case.
    const groups = {};
    for (const p of v.seats) {
      p.horses.forEach((pos, h) => {
        const cell = cellOf(p.seat, pos, h);
        if (!cell) return;
        const k = `${cell[0]}-${cell[1]}-${p.color}`;
        if (!groups[k]) groups[k] = { cell, p, list: [] };
        groups[k].list.push(h);
      });
    }
    const shared = {};
    Object.values(groups).forEach(g => { const k = g.cell.join('-'); shared[k] = (shared[k] || 0) + 1; });
    const seen = {};
    for (const g of Object.values(groups)) {
      const ck = g.cell.join('-');
      const nth = seen[ck] = (seen[ck] || 0) + 1;
      const mine = g.p.me ? v.movable.find(h => g.list.includes(h)) : undefined;
      const can = mine !== undefined;
      const isLast = v.last && v.last.seat === g.p.seat && g.list.includes(v.last.h);
      const offset = shared[ck] > 1 ? `--dx:${nth === 1 ? -18 : 18}%` : '';
      html += `<div class="pc-horse ${g.p.color} ${can ? 'can' : ''} ${isLast ? 'last' : ''}" style="${area(g.cell[0], g.cell[1])};${offset}"
        ${can ? `data-act="move" data-arg='${attr({ h: mine })}'` : ''}>♞${g.list.length > 1 ? `<b>${g.list.length}</b>` : ''}</div>`;
    }
    return `<div class="pc-board">${html}</div>`;
  }

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
        <span class="small muted">${r.home}/${r.total} au centre</span></li>`).join('')}</ul></div>`).join('')}
      <div class="card"><h3>Classement du tournoi</h3>${ranking(v.totals)}</div>
      ${host ? `<div class="stack">
        ${v.canFinale ? '<button class="btn primary block" data-hostgame="finale">🏆 Lancer la finale des gagnants</button>' : ''}
        <button class="btn block" data-hostgame="rematch">🔁 Nouvelle manche pour tous</button>
        <button class="btn ok block" data-hostgame="end">✅ Terminer et donner les points</button></div>`
        : '<p class="center muted">L\'organisateur choisit la suite…</p>'}`;
  }

  Games.chevaux = function (v, S) {
    if (v.phase === 'results') { cue(`pc-results-${v.round}-${v.isFinale ? 'f' : ''}`, 'fanfare'); return results(v, S); }
    if (v.rollId) cue(`pc-roll-${v.table}-${v.round}-${v.rollId}`, v.capture ? 'wrong' : 'draw');
    if (v.myTurn) cue(`pc-turn-${v.deadline}`, 'turn');
    if (v.winner) cue(`pc-win-${v.table}-${v.round}`, v.winner === S.me.name ? 'fanfare' : 'whistle');

    const strip = v.seats.map(p => `<div class="pchip ${p.turn ? 'turn' : ''} ${p.me ? 'me' : ''}">
      <span class="colordot ${p.color}"></span>${avatar(p.name)}${esc(p.name)}${p.away ? ' 📵' : ''}
      <span class="n">${p.home}/${v.horses}</span></div>`).join('');

    const die = `<div class="pc-die ${v.myTurn && v.step === 'roll' ? 'can' : ''}" ${v.myTurn && v.step === 'roll' ? 'data-act="roll"' : ''}>
      ${v.dice ? DICE[v.dice] : '🎲'}</div>`;

    let actions;
    if (v.winner) {
      actions = `<div class="card soft center"><div class="big">🏆 ${esc(v.winner)}</div><p class="muted">En attente des autres tables…</p></div>`;
    } else if (v.myTurn) {
      actions = `<div class="card blue center"><b>${v.step === 'roll' ? 'À toi : lance le dé !' : 'Touche un cheval qui brille'}</b>${timer(v.deadline)}
        ${v.step === 'roll' ? '<button class="btn light block" data-act="roll" style="margin-top:6px">🎲 Lancer le dé</button>' : ''}</div>`;
    } else {
      const turn = v.seats.find(p => p.turn);
      actions = `<div class="card center"><span class="muted">Au tour de</span> <b>${esc(turn ? turn.name : '?')}</b>${timer(v.deadline)}</div>`;
    }

    return `<div class="row between small muted"><span>Table ${v.table}${v.isFinale ? ' · FINALE' : ''} · manche ${v.round}</span>
        <span>Tu es ${esc(v.myColor)}</span></div>
      <div class="players-strip">${strip}</div>
      ${board(v)}
      <div class="pc-bar">${die}<p class="pc-log">${esc(v.log) || '&nbsp;'}</p></div>
      ${actions}
      <div class="spacer"></div>${v.overview.length > 1 ? overview(v) : ''}`;
  };
  Games.chevaux.spectator = v => (v.phase === 'results' ? '' : overview(v));
})();
