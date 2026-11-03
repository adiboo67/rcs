(function () {
  const { esc, timer, waitingNote, ranking } = UI;

  Games.compos = function (v) {
    const guessing = v.phase === 'guess' && !v.done;
    const lines = v.lines.slice().reverse().map(line => `<div class="line">${line.map(c => {
      if (!c.hidden) return `<div class="slot"><span class="shirt">${esc(c.name)}</span></div>`;
      if (v.phase === 'reveal') {
        return `<div class="slot"><span class="shirt ${c.ok ? 'ok' : 'bad'}">${c.ok ? '✅' : '❌'} ${esc(c.name)}</span>
          <div class="guess">${c.mine ? 'Toi : ' + esc(c.mine) : '—'} · ${c.foundBy} trouvé${c.foundBy > 1 ? 's' : ''}</div></div>`;
      }
      if (guessing) {
        return `<div class="slot"><input type="text" name="slot-${c.slot}" data-in="cp" data-live="draft"
          data-keep="cp-${v.n}-${c.slot}" placeholder="?" autocomplete="off" autocapitalize="words"></div>`;
      }
      return `<div class="slot"><span class="shirt">❔</span></div>`;
    }).join('')}</div>`).join('');

    let foot = '';
    if (v.phase === 'guess') {
      foot = v.done
        ? `<p class="center"><b>Réponses envoyées ✅</b></p>${waitingNote(v.doneCount, v.players, 'ont fini')}`
        : `<button class="btn primary block" data-act="submit" data-form="cp">Valider mes réponses</button>
           <p class="small muted center">Le nom de famille suffit. Les accents ne comptent pas.</p>`;
    } else {
      foot = `<div class="card soft center"><div class="big">+${v.myFound} point${v.myFound > 1 ? 's' : ''}</div></div>
        <div class="card"><h3>Top 5</h3>${ranking(v.top)}</div>`;
    }
    return `<div class="card"><div class="row between small muted"><span>Compo ${v.n}/${v.total}</span><span>⭐ ${v.myScore}</span></div>
        ${timer(v.deadline)}<h2>${esc(v.title)}</h2><p class="muted">${esc(v.sub)}</p></div>
      <div class="pitch"><i class="box top"></i><i class="box bot"></i>${lines}</div><div class="spacer"></div>${foot}`;
  };
})();
