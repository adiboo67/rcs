(function () {
  const { esc, attr, timer, waitingNote, avatar } = UI;

  function targets(list, act, selected, extra) {
    return `<div class="names">${list.map(p => `<button class="btn ${selected === p.id ? 'selected' : ''}"
      data-act="${act}" data-arg='${attr(Object.assign({ target: p.id }, extra || {}))}'>${avatar(p.name)}${esc(p.name)}${p.votes ? ` <span class="pill">${p.votes}</span>` : ''}</button>`).join('')}</div>`;
  }

  function roleCard(v) {
    return `<details class="card soft"><summary>${v.me.emoji} Mon rôle : ${esc(v.me.role)}${v.isAlive ? '' : ' (éliminé)'}</summary>
      <p class="small">${esc(v.me.help)}</p></details>`;
  }

  function playersCard(v) {
    return `<div class="card"><h3>Joueurs (${v.aliveCount} en vie)</h3><ul class="list">${v.players.map(p => `<li>
      ${avatar(p.name)}<span class="grow ${p.alive ? '' : 'strike'}">${esc(p.name)}</span>
      ${p.role ? `<span class="pill ${p.alive ? '' : 'bad'}">${p.emoji} ${esc(p.role)}</span>` : ''}</li>`).join('')}</ul></div>`;
  }

  Games.loupgarou = function (v) {
    const alive = v.players.filter(p => p.alive);
    const others = alive.filter(p => !p.me);
    let main = '';

    if (v.phase === 'roles') {
      main = `<div class="card blue banner"><div class="emoji">${v.me.emoji}</div><h2>Tu es ${esc(v.me.role)}</h2>
        <p>${esc(v.me.help)}</p>${timer(v.deadline)}
        <p class="small muted">Cache bien ton écran ! 🤫</p>
        ${v.ready ? '<p><b>Prêt ✅</b></p>' : '<button class="btn light block" data-act="ready">J\'ai compris</button>'}</div>`;
      return main;
    }

    if (v.phase === 'night') {
      main = `<div class="card blue banner"><div class="emoji">🌙</div><h2>Nuit ${v.day}</h2>${timer(v.deadline)}
        <p class="muted">Tout le monde garde le téléphone en main pour ne rien dévoiler.</p></div>`;
      if (v.isAlive && v.me.key === 'loup') {
        main += `<div class="card"><h3>🐺 Qui dévorez-vous ?</h3>
          ${targets(alive.filter(p => !p.role || p.role !== 'Loup-garou'), 'wolf', v.myWolfVote)}
          ${v.wolfVotes.length ? `<hr><p class="small"><b>Votes de la meute :</b><br>${v.wolfVotes.map(w => `${esc(w.wolf)} → ${esc(w.target)}`).join('<br>')}</p>` : ''}</div>`;
      } else if (v.isAlive && v.me.key === 'voyante' && !v.seerDone) {
        main += `<div class="card"><h3>🔮 Qui veux-tu espionner ?</h3>${targets(others, 'seer', null)}</div>`;
      } else {
        main += `<div class="card center muted">${v.isAlive ? 'Fais semblant de jouer… 😴' : 'Tu es éliminé : regarde la partie en silence 👀'}</div>`;
      }
    }

    if (v.phase === 'witch') {
      main = `<div class="card blue banner"><div class="emoji">🌙</div><h2>Nuit ${v.day}</h2>${timer(v.deadline)}</div>`;
      if (v.isAlive && v.me.key === 'sorciere') {
        main += `<div class="card"><h3>🧪 Les loups ont attaqué : ${esc(v.victim || 'personne')}</h3>
          ${v.potions.heal && v.victim ? `<button class="btn ok block" data-act="witch" data-arg='{"save":true}'>💚 Le sauver (potion de vie)</button><div class="spacer"></div>` : ''}
          ${v.potions.kill ? `<p class="small"><b>☠️ Potion de mort :</b> choisis une victime</p>
            <div class="names">${others.map(p => `<button class="btn danger" data-act="witch" data-arg='${attr({ kill: p.id })}'>${esc(p.name)}</button>`).join('')}</div><div class="spacer"></div>` : ''}
          <button class="btn block" data-act="witch">Ne rien faire</button></div>`;
      } else {
        main += `<div class="card center muted">Patiente encore un peu… 😴</div>`;
      }
    }

    if (v.phase === 'dawn' || v.phase === 'verdict') {
      main = `<div class="card blue banner"><div class="emoji">${v.phase === 'dawn' ? '🌅' : '⚖️'}</div>
        ${v.news.map(n => `<p><b>${esc(n)}</b></p>`).join('')}${timer(v.deadline)}</div>`;
    }

    if (v.phase === 'hunter') {
      main = `<div class="card blue banner"><div class="emoji">🎯</div><h2>Le chasseur ${esc(v.hunterName)} va tirer…</h2>${timer(v.deadline)}</div>`;
      if (v.amHunter) main += `<div class="card"><h3>Qui emportes-tu avec toi ?</h3>${targets(others, 'shoot', null)}</div>`;
    }

    if (v.phase === 'day') {
      main = `<div class="card blue"><h2>☀️ Jour ${v.day} : débat !</h2>
        <p class="muted">Discutez à voix haute, puis votez pour éliminer un suspect.</p>${timer(v.deadline)}</div>`;
      main += v.isAlive
        ? `<div class="card"><h3>Ton vote</h3>${targets(others, 'vote', v.myVote)}${waitingNote(v.voted, v.aliveCount, 'ont voté')}</div>`
        : `<div class="card center muted">Tu es éliminé : tu ne votes plus, mais tu peux regarder 👀</div>`;
    }

    if (v.phase === 'end') {
      main = `<div class="card blue banner"><div class="emoji">${v.winner === 'village' ? '🧑‍🌾' : '🐺'}</div>
        <h2>${v.winner === 'village' ? 'Le village gagne !' : 'Les loups gagnent !'}</h2>${timer(v.deadline)}</div>
        <div class="card"><h3>Tous les rôles</h3><ul class="list">${v.allRoles.map(r => `<li>
          <span class="grow ${r.alive ? '' : 'strike'}">${esc(r.name)}</span><span class="pill">${r.emoji} ${esc(r.role)}</span></li>`).join('')}</ul></div>`;
      return main;
    }

    let extra = '';
    if (v.seerLog && v.seerLog.length) {
      extra += `<div class="card"><h3>🔮 Tes visions</h3><ul class="list">${v.seerLog.map(s => `<li><span class="grow">Nuit ${s.night} : ${esc(s.name)}</span><span class="pill">${s.emoji} ${esc(s.role)}</span></li>`).join('')}</ul></div>`;
    }
    if (v.me.key === 'sorciere' && v.potions) {
      extra += `<p class="small muted center">Potions : ${v.potions.heal ? '💚 vie' : '<s>vie</s>'} · ${v.potions.kill ? '☠️ mort' : '<s>mort</s>'}</p>`;
    }
    return main + roleCard(v) + extra + playersCard(v) +
      (v.events.length ? `<details class="card"><summary>📜 Historique</summary><p class="small">${v.events.map(esc).join('<br>')}</p></details>` : '');
  };
})();
