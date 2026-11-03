const { normalize, nameMatches } = require('../util');

// Les pronostics sont sauvegardés : on peut parier dans le train et saisir le résultat après le match.
module.exports = {
  key: 'pronostics',
  name: 'Pronostics du prochain match',
  icon: '🔮',
  desc: 'Pariez sur le prochain match du RCS Alsace : score exact (5 pts), bon résultat (2 pts), buteur trouvé (3 pts). Les points tombent quand le résultat est saisi.',
  min: 1,
  options: [],

  create(ctx) {
    const st = ctx.store;
    if (!st.pronos) st.pronos = { match: null, bets: {}, open: false, result: null };
    const P = st.pronos;

    function points(bet, res) {
      let pts = 0;
      const sign = (h, a) => Math.sign(h - a);
      if (bet.h === res.h && bet.a === res.a) pts += 5;
      else if (sign(bet.h, bet.a) === sign(res.h, res.a)) pts += 2;
      if (bet.scorer && res.scorers.some(sc => nameMatches(bet.scorer, sc) || normalize(sc) === normalize(bet.scorer))) pts += 3;
      return pts;
    }

    const score = v => {
      const n = parseInt(v, 10);
      return Number.isNaN(n) ? null : Math.max(0, Math.min(20, n));
    };

    return {
      addPlayer() {},
      onAction(pid, act, data) {
        if (act !== 'bet' || !P.match || !P.open) return false;
        const h = score(data.h), a = score(data.a);
        if (h == null || a == null) return 'Indique les deux scores.';
        P.bets[pid] = { h, a, scorer: String(data.scorer || '').trim().slice(0, 30), name: ctx.name(pid) };
        ctx.save();
      },
      onHost(type, data) {
        if (type === 'create') {
          const opp = String(data.opponent || '').trim().slice(0, 40);
          if (!opp) return 'Indique l\'adversaire.';
          const home = data.where !== 'away';
          st.pronos = Object.assign(P, {
            match: { opponent: opp, home, label: home ? `RCS Alsace – ${opp}` : `${opp} – RCS Alsace`, when: String(data.when || '').slice(0, 40) },
            bets: {}, open: true, result: null,
          });
        }
        if (type === 'close') P.open = false;
        if (type === 'reopen' && P.match && !P.result) P.open = true;
        if (type === 'result' && P.match) {
          const h = score(data.h), a = score(data.a);
          if (h == null || a == null) return 'Indique le score final.';
          const scorers = String(data.scorers || '').split(',').map(x => x.trim()).filter(Boolean);
          P.result = { h, a, scorers };
          P.open = false;
          const rows = Object.entries(P.bets).map(([pid, bet]) => ({ pid, score: points(bet, P.result) }));
          ctx.save();
          if (rows.length) ctx.finish(rows, { text: `${P.match.label} : ${h}-${a}` });
        }
        if (type === 'reset') {
          st.pronos = Object.assign(P, { match: null, bets: {}, open: false, result: null });
        }
        if (type === 'end') ctx.finish(null);
        ctx.save();
      },
      view(pid) {
        return {
          match: P.match, open: P.open, result: P.result,
          myBet: P.bets[pid] || null,
          bets: (!P.open || P.result) ? Object.entries(P.bets).map(([id, b]) => ({
            name: b.name, h: b.h, a: b.a, scorer: b.scorer, pts: P.result ? points(b, P.result) : null,
          })) : null,
          betCount: Object.keys(P.bets).length,
        };
      },
    };
  },
};
