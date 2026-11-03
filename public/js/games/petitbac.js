(function () {
  const { esc, attr, timer, ranking } = UI;

  Games.petitbac = function (v) {
    const head = `<div class="card blue center"><div class="small muted">Manche ${v.round}/${v.rounds} · ⭐ ${v.myScore}</div>
      <div class="huge">${esc(v.letter)}</div>${timer(v.deadline)}</div>`;

    if (v.phase === 'write' || v.phase === 'stop') {
      const fields = v.cats.map((c, i) => `<label class="field"><span>${esc(c)}</span>
        <input type="text" name="cat-${i}" data-in="pb" data-live="draft" data-keep="pb-${v.round}-${i}"
          value="${esc(v.mine[i] || '')}" autocomplete="off" autocapitalize="words" placeholder="${esc(v.letter)}…"></label>`).join('');
      return `${head}${v.phase === 'stop' ? `<div class="card soft center"><b>🛑 STOP crié par ${esc(v.stoppedBy)} ! Dernières secondes…</b></div>` : ''}
        <div class="card">${fields}
        ${v.phase === 'write' ? '<button class="btn primary block" data-act="stop" data-form="pb">🛑 STOP ! (tout est rempli)</button>' : ''}</div>`;
    }

    const table = v.table.map((cat, ci) => `<div class="card"><h3>${esc(cat.cat)}</h3>
      ${cat.rows.length ? `<ul class="list">${cat.rows.map(r => `<li>
        <span class="grow"><b class="${r.ok ? '' : 'strike'}">${esc(r.text)}</b> <span class="small muted">${esc(r.name)}</span></span>
        ${!r.ok ? '<span class="pill bad">mauvaise lettre</span>'
          : r.pid === v.me ? (r.rej ? `<span class="pill bad">👎 ${r.rej}</span>` : '')
          : v.phase === 'validate' ? `<button class="btn sm ${r.iRejected ? 'danger selected' : ''}" data-act="reject" data-arg='${attr({ pid: r.pid, ci })}'>👎 ${r.rej || ''}</button>`
          : r.rej ? `<span class="pill bad">👎 ${r.rej}</span>` : ''}
      </li>`).join('')}</ul>` : '<p class="muted small">Personne.</p>'}</div>`).join('');

    if (v.phase === 'validate') {
      return `${head}<div class="card soft"><b>Vérification</b><p class="small">Appuie sur 👎 pour refuser une réponse bidon. Refusée si plus de la moitié des joueurs votent contre.</p></div>${table}`;
    }
    return `${head}<div class="card soft center"><div class="big">+${v.roundPts} pts</div>
      <p class="small muted">10 pts si tu es seul à avoir trouvé, 5 pts si d'autres ont le même mot.</p></div>
      <div class="card"><h3>Top 5</h3>${ranking(v.top)}</div>${table}`;
  };
})();
