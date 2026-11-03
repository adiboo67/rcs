(function () {
  const { esc, attr, timer, waitingNote, avatar } = UI;
  const ROLE = { civil: '😇 Civil', under: '🕵️ Undercover', white: '👻 Mr White' };

  function overview(v) {
    if (v.overview.length < 2) return '';
    return `<details class="card"><summary>Les autres tables</summary><ul class="list">${v.overview.map(t => `<li>
      <span class="grow">Table ${t.no}</span><span class="small muted">${t.phase === 'end' ? 'terminée' : t.alive + '/' + t.n + ' en vie'}</span></li>`).join('')}</ul></details>`;
  }

  function wordCard(v) {
    return `<div class="card blue center"><div class="small muted">Table ${v.table}${v.round ? ' · tour ' + v.round : ''}</div>
      ${v.isWhite ? '<div class="big">👻 Tu es Mr White</div><p class="small muted">Tu n\'as pas de mot. Écoute les indices et bluffe !</p>'
        : `<div class="small muted">Ton mot secret</div><div class="big">${esc(v.word)}</div>`}
      ${timer(v.deadline)}</div>`;
  }

  function clues(v) {
    if (!v.history.length) return '';
    return v.history.map((round, i) => `<div class="card"><h3>Indices du tour ${i + 1}</h3><ul class="list">${round.map(c => `<li>
      <span class="grow">${esc(c.name)}</span><b>${esc(c.clue)}</b></li>`).join('')}</ul></div>`).reverse().join('');
  }

  Games.undercover = function (v) {
    let main = wordCard(v);
    if (v.phase === 'word') {
      main += '<div class="card soft center"><p><b>Mémorise ton mot.</b> Tu ne sais pas si tu es civil ou undercover !</p></div>';
    }
    if (v.phase === 'clue') {
      if (v.isAlive && !v.myClue) {
        main += `<div class="card"><h3>Donne un indice en un mot</h3>
          <p class="small muted">Assez précis pour les tiens, assez flou pour les intrus.</p>
          <div class="row"><input type="text" class="grow" name="clue" data-in="uc" data-keep="uc-${v.table}-${v.round}" maxlength="24" autocomplete="off" placeholder="Un seul mot">
          <button class="btn primary" data-act="clue" data-form="uc">Envoyer</button></div></div>`;
      } else {
        main += `<div class="card center">${v.myClue ? `Ton indice : <b>${esc(v.myClue)}</b>` : 'Tu es éliminé 👀'}${waitingNote(v.clueCount, v.aliveCount, 'indices reçus')}</div>`;
      }
    }
    if (v.phase === 'vote') {
      main += v.isAlive
        ? `<div class="card"><h3>Qui est l'intrus ?</h3><div class="names">${v.players.filter(p => p.alive && !p.me).map(p => `
            <button class="btn ${v.myVote === p.id ? 'selected' : ''}" data-act="vote" data-arg='${attr({ target: p.id })}'>${avatar(p.name)}${esc(p.name)}</button>`).join('')}</div>
            ${waitingNote(v.voteCount, v.aliveCount, 'ont voté')}</div>`
        : '<div class="card center muted">Tu es éliminé : regarde la suite 👀</div>';
    }
    if (v.phase === 'reveal') main += `<div class="card soft center"><p class="big">${esc(v.news)}</p></div>`;
    if (v.phase === 'white') {
      main += `<div class="card soft center"><p><b>${esc(v.news)}</b></p></div>`;
      main += v.amGuesser
        ? `<div class="card"><h3>👻 Dernière chance : quel est le mot des civils ?</h3>
            <div class="row"><input type="text" class="grow" name="word" data-in="ucw" data-keep="ucw" autocomplete="off">
            <button class="btn primary" data-act="guess" data-form="ucw">Deviner</button></div></div>`
        : '<div class="card center muted">Mr White tente de deviner le mot…</div>';
    }
    if (v.phase === 'end') {
      const label = { civil: 'Les civils gagnent 😇', impostors: 'Les intrus gagnent 🕵️', white: 'Mr White gagne 👻' }[v.winner];
      main = `<div class="card blue banner"><div class="emoji">🏁</div><h2>${label}</h2>
        <p>Mot des civils : <b>${esc(v.words.civil)}</b> · Mot undercover : <b>${esc(v.words.under)}</b></p>
        <p class="big">+${v.myScore} pt${v.myScore > 1 ? 's' : ''}</p><p class="small muted">En attente des autres tables…</p></div>`;
    }
    const players = `<div class="card"><h3>Table ${v.table}</h3><ul class="list">${v.players.map(p => `<li>
      ${avatar(p.name)}<span class="grow ${p.alive ? '' : 'strike'}">${esc(p.name)}</span>${p.role ? `<span class="pill">${ROLE[p.role]}</span>` : ''}</li>`).join('')}</ul></div>`;
    return main + clues(v) + players + overview(v);
  };
  Games.undercover.spectator = overview;
})();
