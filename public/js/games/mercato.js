(function () {
  const { esc, attr, timer, waitingNote, Local } = UI;

  Local.mercPick = d => { Local.mercLot = d.lot; };

  function rating(r) { return `<span class="rating ${r >= 88 ? 'gold' : r >= 80 ? 'silver' : ''}">${r}</span>`; }

  function squad(v) {
    if (!v.squad.length) return '';
    const avg = Math.round(v.squad.reduce((s, p) => s + p.rating, 0) / v.squad.length * 10) / 10;
    return `<div class="card"><div class="row between"><h3>Mon équipe</h3><span class="pill">Note ${avg}</span></div>
      <ul class="list">${v.squad.map(p => `<li>${rating(p.rating)}<span class="grow">${esc(p.name)}<br><span class="small muted">${esc(p.slot)}</span></span>
      <span class="small">${p.district ? '' : p.price + ' M€'}</span></li>`).join('')}</ul></div>`;
  }

  Games.mercato = function (v) {
    const head = `<div class="card blue"><div class="row between"><div><div class="small muted">Manche ${Math.min(v.round, v.rounds)}/${v.rounds}</div>
      <h2>${v.phase === 'sim' ? '🏟️ Championnat' : '🔎 ' + esc(v.slot)}</h2></div>
      <div class="center"><div class="small muted">Budget</div><div class="big">${v.budget} M€</div></div></div>${timer(v.deadline)}</div>`;

    if (v.phase === 'bid') {
      const sel = v.lots.find(l => l.id === Local.mercLot);
      const bidOn = v.myBid && v.myBid.lot != null ? v.lots.find(l => l.id === v.myBid.lot) : null;
      return `${head}
        <div class="card soft small">Une seule enchère secrète par manche. La plus haute gagne. Sans joueur, tu récupères un « joueur de district » (note 62).</div>
        ${v.myBid ? `<div class="card center"><b>${bidOn ? `Ton enchère : ${v.myBid.amount} M€ sur ${esc(bidOn.name)}` : 'Tu passes cette manche'}</b>
          <p class="small muted">Tu peux encore changer d'avis.</p></div>` : ''}
        <div class="card"><ul class="list">${v.lots.map(l => `<li data-local="mercPick" data-arg='${attr({ lot: l.id })}' style="cursor:pointer"
          class="${Local.mercLot === l.id ? 'me' : ''}">${rating(l.rating)}<span class="grow"><b>${esc(l.name)}</b><br>
          <span class="small muted">${esc(l.pos)} · mise min. ${l.base} M€</span></span><span>${Local.mercLot === l.id ? '✅' : '›'}</span></li>`).join('')}</ul></div>
        ${sel ? `<div class="card"><h3>Enchère sur ${esc(sel.name)}</h3><div class="row">
          <input type="number" class="grow" name="amount" data-in="mc" data-keep="mc-${v.round}-${sel.id}" min="${sel.base}" max="${v.budget}" value="${Math.min(v.budget, sel.base)}" inputmode="numeric">
          <span>M€</span><button class="btn primary" data-act="bid" data-form="mc" data-arg='${attr({ lot: sel.id })}'>Enchérir</button></div></div>` : '<p class="center muted small">Touche un joueur pour enchérir.</p>'}
        <button class="btn block" data-act="pass">Passer cette manche</button>
        ${waitingNote(v.bidCount, v.managers, 'ont joué')}${squad(v)}`;
    }

    if (v.phase === 'result') {
      return `${head}<div class="card"><h3>Résultats des enchères</h3>${v.results.length ? `<ul class="list">${v.results.map(r => `<li>
        ${rating(r.rating)}<span class="grow"><b>${esc(r.player)}</b><br><span class="small muted">→ ${esc(r.buyer)} (${r.offers} offre${r.offers > 1 ? 's' : ''})</span></span>
        <span class="pts">${r.price} M€</span></li>`).join('')}</ul>` : '<p class="muted">Aucune vente.</p>'}</div>${squad(v)}`;
    }

    return `${head}<div class="card"><h3>Mes matchs</h3><ul class="list">${v.myMatches.map(m => `<li>
        <span class="grow small">${esc(m.home)}</span><b>${m.ga} - ${m.gb}</b><span class="grow small" style="text-align:right">${esc(m.away)}</span></li>`).join('')}</ul></div>
      <div class="card"><h3>Classement final</h3><ul class="list">${v.table.map(r => `<li class="${r.me ? 'me' : ''}">
        <span class="rank">${r.rank}</span><span class="grow">${esc(r.name)} <span class="small muted">(${r.str})</span></span>
        <span class="small muted">${r.bp}:${r.bc}</span><span class="pts">${r.pts} pts</span></li>`).join('')}</ul></div>${squad(v)}`;
  };
})();
