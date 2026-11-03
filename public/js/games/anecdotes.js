(function () {
  const { esc, attr, timer, waitingNote, avatar, cue } = UI;

  Games.anecdotes = function (v, S) {
    const head = `<div class="row between small muted"><span>${v.n ? `Anecdote ${v.n}/${v.total}` : 'Écriture'}</span><span>⭐ ${v.myScore}</span></div>`;

    if (v.phase === 'write') {
      return `<div class="card">${head}${timer(v.deadline)}<h2>Écris une anecdote vraie sur toi</h2>
        <p class="small muted">Drôle, surprenante, gentille. Pas de moquerie sur les autres : l'organisateur relit tout avant de jouer.</p>
        ${v.submitted
          ? `<div class="quote">${esc(v.mine)}</div><p class="center"><b>Envoyée ✅</b></p>${waitingNote(v.count, v.players, 'ont envoyé')}`
          : `<textarea name="text" data-in="an" data-live="draft" data-keep="an-text" maxlength="220" placeholder="Ex : J'ai déjà marqué contre mon camp en finale…">${esc(v.mine)}</textarea>
             <div class="spacer"></div><button class="btn primary block" data-act="submit" data-form="an">Envoyer mon anecdote</button>
             ${waitingNote(v.count, v.players, 'ont envoyé')}`}</div>`;
    }

    if (v.phase === 'moderate') {
      if (!S.me.isHost) return `<div class="card soft center"><div class="big">🧐</div><p><b>L'organisateur relit les ${v.total} anecdotes…</b></p></div>`;
      return `<div class="card"><h2>Relecture (${v.list.length})</h2><p class="small muted">Retire celles qui ne sont pas correctes, puis lance le jeu. Les auteurs restent cachés.</p>
        <ul class="list">${v.list.map(a => `<li><span class="grow">${esc(a.text)}</span>
          <button class="btn sm danger" data-hostgame="remove" data-arg='${attr({ k: a.k })}'>Retirer</button></li>`).join('')}</ul>
        <div class="spacer"></div><button class="btn primary block" data-hostgame="launch">▶️ Lancer les devinettes</button></div>`;
    }

    const quote = `<div class="card">${head}${timer(v.deadline)}<div class="quote">« ${esc(v.text)} »</div></div>`;
    if (v.phase === 'guess') {
      if (v.isAuthor) return `${quote}<div class="card soft center"><div class="big">🤫</div><p><b>C'est ton anecdote !</b> Garde ton sérieux…</p>${waitingNote(v.guessCount, v.candidates.length, 'ont voté')}</div>`;
      return `${quote}<h3>Qui a écrit ça ?</h3><div class="names">${v.candidates.map(c => `<button class="btn ${v.myGuess === c.id ? 'selected' : ''}"
        data-act="guess" data-arg='${attr({ target: c.id })}'>${avatar(c.name)}${esc(c.name)}</button>`).join('')}</div>${waitingNote(v.guessCount, v.candidates.length, 'ont voté')}`;
    }
    cue(`an-${v.n}-${v.deadline}`, v.isAuthor ? 'reveal' : v.right ? 'correct' : v.myGuess ? 'wrong' : 'timeout');
    return `${quote}<div class="card blue banner"><div class="small muted">C'était…</div><div style="margin:10px 0 6px">${avatar(v.author, 'lg')}</div><div class="big">${esc(v.author)}</div>
      <p>${v.found} personne${v.found > 1 ? 's ont' : ' a'} trouvé</p>
      ${v.isAuthor ? '<p><b>+1 pt par personne qui s\'est trompée</b></p>' : `<p class="big">${v.right ? '✅ +2' : v.myGuess ? '❌' : '⌛'}</p>`}</div>`;
  };
})();
