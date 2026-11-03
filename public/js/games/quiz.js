(function () {
  const { esc, attr, timer, waitingNote, ranking } = UI;
  const LETTERS = ['A', 'B', 'C', 'D'];

  Games.quiz = function (v) {
    const reveal = v.phase === 'reveal';
    const head = `<div class="row between small muted"><span>Question ${v.n}/${v.total} · ${esc(v.cat)}</span><span>⭐ ${v.myScore}</span></div>`;
    const choices = v.choices.map((c, i) => {
      let cls = '';
      if (reveal && i === v.correct) cls = 'right';
      else if (reveal && i === v.my) cls = 'wrong';
      else if (v.my === i) cls = 'picked';
      const locked = reveal || v.my != null;
      return `<button class="choice ${cls}" ${locked ? 'disabled' : `data-act="answer" data-arg='${attr({ choice: i })}'`}>
        <span class="letter">${LETTERS[i]}</span><span>${esc(c)}</span>${reveal ? `<span class="count">${v.dist[i]}</span>` : ''}</button>`;
    }).join('');

    let foot = '';
    if (!reveal) {
      foot = v.my != null ? `<p class="center"><b>Réponse envoyée ✅</b></p>` : '';
      foot += waitingNote(v.answered, v.players);
    } else {
      const ok = v.my === v.correct;
      foot = `<div class="card ${ok ? 'soft' : ''} center">
          <div class="big">${v.my == null ? '⌛ Trop tard' : ok ? `✅ +${v.myPts}` : '❌ Raté'}</div>
          <p class="muted">Tu es ${v.myRank}${v.myRank === 1 ? 'er' : 'e'}</p></div>
        <div class="card"><h3>Top 5</h3>${ranking(v.top)}</div>`;
    }
    return `<div class="card">${head}${timer(v.deadline)}<h2>${esc(v.q)}</h2></div>
      <div class="choices">${choices}</div><div class="spacer"></div>${foot}`;
  };
})();
