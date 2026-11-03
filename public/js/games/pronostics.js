(function () {
  const { esc } = UI;

  function teams(m) {
    return m.home ? ['RCS Alsace', m.opponent] : [m.opponent, 'RCS Alsace'];
  }

  function betsList(v) {
    if (!v.bets || !v.bets.length) return '<p class="muted">Aucun prono.</p>';
    const rows = v.bets.slice().sort((a, b) => (b.pts || 0) - (a.pts || 0));
    return `<ul class="list">${rows.map(b => `<li><span class="grow">${esc(b.name)}<br><span class="small muted">${b.scorer ? '⚽ ' + esc(b.scorer) : 'pas de buteur'}</span></span>
      <b>${b.h} - ${b.a}</b>${b.pts != null ? `<span class="pts">${b.pts} pts</span>` : ''}</li>`).join('')}</ul>`;
  }

  Games.pronostics = function (v, S) {
    const host = S.me.isHost;
    if (!v.match) {
      return host
        ? `<div class="card"><h2>Créer le match à pronostiquer</h2>
            <label class="field"><span>Adversaire</span><input type="text" name="opponent" data-in="pm" data-keep="pm-opp" placeholder="Ex : FC Mulhouse"></label>
            <label class="field"><span>Lieu</span><select name="where" data-in="pm"><option value="home">À domicile</option><option value="away">À l'extérieur</option></select></label>
            <label class="field"><span>Date (facultatif)</span><input type="text" name="when" data-in="pm" data-keep="pm-when" placeholder="Ex : samedi 15h"></label>
            <button class="btn primary block" data-hostgame="create" data-form="pm">Ouvrir les pronostics</button></div>`
        : '<div class="card soft center"><div class="big">🔮</div><p><b>L\'organisateur prépare le match…</b></p></div>';
    }
    const [h, a] = teams(v.match);
    const head = `<div class="card blue center"><div class="small muted">${esc(v.match.when || 'Prochain match')}</div>
      <h2>${esc(v.match.label)}</h2>${v.result ? `<div class="huge">${v.result.h} - ${v.result.a}</div>
      <p class="small">${v.result.scorers.length ? '⚽ ' + v.result.scorers.map(esc).join(', ') : 'Pas de buteur'}</p>` : ''}
      <p class="small muted">${v.betCount} prono${v.betCount > 1 ? 's' : ''}</p></div>`;

    if (v.result) {
      return `${head}<div class="card"><h3>Points</h3><p class="small muted">Score exact 5 pts · bon résultat 2 pts · buteur trouvé 3 pts</p>${betsList(v)}</div>
        ${host ? '<button class="btn block" data-hostgame="reset" data-confirm="Effacer ce match et en créer un nouveau ?">Nouveau match</button>' : ''}`;
    }
    if (v.open) {
      const b = v.myBet;
      return `${head}<div class="card"><h3>${b ? 'Modifier mon prono' : 'Mon prono'}</h3>
          <div class="grid2"><label class="field"><span>${esc(h)}</span><input type="number" name="h" data-in="pb2" data-keep="pr-h" min="0" max="20" inputmode="numeric" value="${b ? b.h : ''}"></label>
          <label class="field"><span>${esc(a)}</span><input type="number" name="a" data-in="pb2" data-keep="pr-a" min="0" max="20" inputmode="numeric" value="${b ? b.a : ''}"></label></div>
          <label class="field"><span>Un buteur du match (facultatif)</span><input type="text" name="scorer" data-in="pb2" data-keep="pr-s" value="${b ? esc(b.scorer) : ''}" placeholder="Nom du joueur"></label>
          <button class="btn primary block" data-act="bet" data-form="pb2">${b ? 'Mettre à jour' : 'Valider mon prono'}</button>
          ${b ? `<p class="center small">Enregistré : <b>${b.h} - ${b.a}</b>${b.scorer ? ' · ' + esc(b.scorer) : ''} ✅</p>` : ''}</div>
        ${host ? '<button class="btn block" data-hostgame="close" data-confirm="Fermer les pronos ? Plus personne ne pourra parier.">🔒 Fermer les pronos</button>' : ''}
        <p class="small muted center">Score exact 5 pts · bon résultat 2 pts · buteur trouvé 3 pts</p>`;
    }
    return `${head}<div class="card"><h3>Tous les pronos</h3>${betsList(v)}</div>
      ${host ? `<div class="card"><h3>Saisir le résultat final</h3>
        <div class="grid2"><label class="field"><span>${esc(h)}</span><input type="number" name="h" data-in="pr" data-keep="rs-h" min="0" max="20" inputmode="numeric"></label>
        <label class="field"><span>${esc(a)}</span><input type="number" name="a" data-in="pr" data-keep="rs-a" min="0" max="20" inputmode="numeric"></label></div>
        <label class="field"><span>Buteurs (séparés par des virgules)</span><input type="text" name="scorers" data-in="pr" data-keep="rs-s"></label>
        <button class="btn ok block" data-hostgame="result" data-form="pr" data-confirm="Valider le résultat et donner les points ?">✅ Valider le résultat</button>
        <div class="spacer"></div><button class="btn block" data-hostgame="reopen">🔓 Rouvrir les pronos</button></div>`
        : '<div class="card soft center">Pronos fermés. Les points tomberont après le match !</div>'}`;
  };
})();
