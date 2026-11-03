(function () {
  const { esc, attr, timer } = UI;
  const DIR = { L: '⬅️', C: '⬆️', R: '➡️' };
  const DIR_NAME = { L: 'Gauche', C: 'Centre', R: 'Droite' };

  function score(d) {
    return `<div class="scoreline"><span class="grow" style="text-align:right">${esc(d.a)}</span>
      <span class="sc">${d.ga} - ${d.gb}</span><span class="grow">${esc(d.b)}</span></div>
      <p class="center small muted">Tirs : ${d.na} - ${d.nb}${d.na >= 5 && d.nb >= 5 ? ' · mort subite' : ''}</p>`;
  }

  function duelsList(v) {
    return `<div class="card"><h3>${esc(v.title || 'Duels')}</h3><ul class="list">${v.duels.map(d => `<li class="${d.mine ? 'me' : ''}">
      <span class="grow small">${esc(d.a)} <b>${d.ga} - ${d.gb}</b> ${esc(d.b)}</span>
      ${d.winner ? `<span class="pill ok">🏆 ${esc(d.winner)}</span>` : '<span class="pill">en cours</span>'}</li>`).join('')}</ul>
      ${v.bye && v.bye !== true ? `<p class="small muted">Qualifié d'office : ${esc(v.bye)}</p>` : ''}</div>`;
  }

  Games.tirs = function (v) {
    if (v.phase === 'champion') {
      return `<div class="card blue banner"><div class="emoji">🏆</div><h2>${esc(v.champion)}</h2><p>Champion des tirs au but !</p>${timer(v.deadline)}</div>${duelsList(v)}`;
    }
    if (v.phase === 'pause') {
      return `<div class="card blue banner"><div class="emoji">⏱️</div><h2>Tour suivant…</h2>${timer(v.deadline)}</div>${duelsList(v)}`;
    }
    if (v.bye === true) {
      return `<div class="card soft center"><div class="big">🎟️</div><p><b>Qualifié d'office pour le tour suivant !</b></p></div>${duelsList(v)}`;
    }
    const d = v.mine;
    if (!d || d.winner) {
      const top = d && d.winner
        ? `<div class="card soft center"><p><b>Duel terminé : ${esc(d.winner)} passe au tour suivant.</b></p>${score(d)}</div>`
        : '<div class="card soft center">Tu es éliminé : regarde la suite du tournoi 👀</div>';
      return top + duelsList(v);
    }

    let action = '';
    if (d.phase === 'choose') {
      if (d.role) {
        const shooter = d.role === 'shooter';
        action = `<div class="card blue center"><h2>${shooter ? '⚽ Tu tires !' : '🧤 Tu es dans les cages !'}</h2>
          <p class="muted">${shooter ? 'Choisis où tirer' : 'Choisis où plonger'}</p>${timer(d.deadline)}
          ${d.chosen ? `<p class="big">${DIR[d.chosen]} ${DIR_NAME[d.chosen]}</p><p class="small muted">En attente de l'adversaire…</p>`
            : `<div class="dirs">${['L', 'C', 'R'].map(x => `<button class="btn light" data-act="choose" data-arg='${attr({ dir: x })}'>${DIR[x]}<small>${DIR_NAME[x]}</small></button>`).join('')}</div>`}</div>`;
      }
    } else if (d.phase === 'show' && d.last) {
      const l = d.last;
      action = `<div class="card blue center"><div class="goal-wrap"><div class="goal"><span>${l.shot === 'L' ? '⚽' : ''}${l.dive === 'L' ? '🧤' : ''}</span>
        <span>${l.shot === 'C' ? '⚽' : ''}${l.dive === 'C' ? '🧤' : ''}</span><span>${l.shot === 'R' ? '⚽' : ''}${l.dive === 'R' ? '🧤' : ''}</span></div></div>
        <div class="huge" style="margin-top:12px">${l.goal ? 'BUT ! 🎉' : 'ARRÊT ! 🧤'}</div>
        <p class="small muted">${esc(l.shooter)} tire ${DIR_NAME[l.shot].toLowerCase()}, ${esc(l.keeper)} plonge ${DIR_NAME[l.dive].toLowerCase()}</p></div>`;
    }
    return `<div class="card"><div class="small muted center">${esc(v.title)}</div>${score(d)}</div>${action}${duelsList(v)}`;
  };
})();
