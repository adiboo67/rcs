(function () {
  const { esc, attr, timer, waitingNote, avatar, cue } = UI;

  Games.quiest = function (v) {
    const head = `<div class="card blue"><div class="row between small muted"><span>Question ${v.n}/${v.total}</span><span>⭐ ${v.myScore}</span></div>
      ${timer(v.deadline)}<h2>${esc(v.q)}</h2></div>`;
    if (v.phase === 'vote') {
      return `${head}<p class="muted small center">Vote anonyme. Tu gagnes 1 point si tu votes comme la majorité.</p>
        <div class="names">${v.candidates.map(c => `<button class="btn ${v.my === c.id ? 'selected' : ''}"
          data-act="vote" data-arg='${attr({ target: c.id })}'>${avatar(c.name)}${esc(c.name)}</button>`).join('')}</div>
        ${waitingNote(v.voted, v.players, 'ont voté')}`;
    }
    cue(`qi-${v.n}-${v.deadline}`, v.gotIt ? 'correct' : v.my ? 'wrong' : 'timeout');
    const max = v.top.length ? v.top[0].n : 1;
    return `${head}<div class="card"><h3>Le vestiaire a parlé 🗳️</h3>
      <div class="bars">${v.top.map((t, i) => `<div class="bar"><div class="fill" style="width:${Math.max(35, (t.n / max) * 100)}%">
        ${['🥇', '🥈', '🥉'][i]} ${esc(t.name)} · ${t.n} vote${t.n > 1 ? 's' : ''}</div></div>`).join('') || '<p class="muted">Aucun vote.</p>'}</div></div>
      <div class="card soft center"><div class="big">${v.gotIt ? '✅ +1' : v.my ? '❌ 0' : '⌛'}</div>
      <p class="muted">${v.gotIt ? 'Tu as voté comme la majorité !' : v.my ? 'Pas comme la majorité cette fois.' : 'Tu n\'as pas voté.'}</p></div>`;
  };
})();
