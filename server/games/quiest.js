const { quiEst } = require('../data/words');
const { shuffle } = require('../util');

const VOTE_TIME = 25000;
const REVEAL_TIME = 8000;

module.exports = {
  key: 'quiest',
  name: 'Qui dans l\'équipe… ?',
  icon: '🫵',
  desc: 'Une question, tout le monde vote pour quelqu\'un. Tu marques si tu votes comme la majorité. Les votes restent anonymes.',
  min: 3,
  options: [{ key: 'count', label: 'Nombre de questions', type: 'number', def: 10, min: 3, max: 30 }],

  create(ctx, ids, opts) {
    const qs = shuffle(quiEst).slice(0, opts.count);
    const s = { i: 0, phase: 'vote', votes: {}, scores: {}, deadline: 0, top: [] };
    ids.forEach(id => { s.scores[id] = 0; });
    let timer = null;

    function vote() {
      s.phase = 'vote';
      s.votes = {};
      s.deadline = ctx.now() + VOTE_TIME;
      timer = ctx.after(VOTE_TIME, reveal);
    }

    function reveal() {
      if (s.phase !== 'vote') return;
      ctx.clear(timer);
      const count = {};
      for (const t of Object.values(s.votes)) count[t] = (count[t] || 0) + 1;
      const max = Math.max(0, ...Object.values(count));
      const winners = Object.keys(count).filter(t => count[t] === max);
      for (const [voter, target] of Object.entries(s.votes)) {
        if (winners.includes(target)) s.scores[voter] += 1;
      }
      s.top = Object.entries(count).sort((a, b) => b[1] - a[1]).slice(0, 3)
        .map(([pid, n]) => ({ name: ctx.name(pid), n, pid }));
      s.winners = winners;
      s.phase = 'reveal';
      s.deadline = ctx.now() + REVEAL_TIME;
      timer = ctx.after(REVEAL_TIME, next);
    }

    function next() {
      ctx.clear(timer);
      s.i++;
      if (s.i >= qs.length) {
        ctx.finish(Object.entries(s.scores).map(([pid, score]) => ({ pid, score })));
        return;
      }
      vote();
    }

    vote();

    return {
      addPlayer(pid) {
        if (!(pid in s.scores)) s.scores[pid] = 0;
      },
      onAction(pid, act, data) {
        if (act !== 'vote' || s.phase !== 'vote') return false;
        if (!(data.target in s.scores) || data.target === pid) return false;
        s.votes[pid] = data.target;
        const waiting = ctx.connectedIds(Object.keys(s.scores)).filter(id => !s.votes[id]);
        if (!waiting.length) reveal();
      },
      onHost(type) {
        if (type === 'skip') s.phase === 'vote' ? reveal() : next();
      },
      view(pid) {
        const v = {
          phase: s.phase, n: s.i + 1, total: qs.length, q: qs[s.i], deadline: s.deadline,
          my: s.votes[pid] || null, myScore: s.scores[pid] || 0,
          voted: Object.keys(s.votes).length, players: Object.keys(s.scores).length,
          candidates: Object.keys(s.scores).filter(id => id !== pid)
            .map(id => ({ id, name: ctx.name(id) })).sort((a, b) => a.name.localeCompare(b.name)),
        };
        if (s.phase === 'reveal') {
          v.top = s.top;
          v.gotIt = !!(s.votes[pid] && s.winners.includes(s.votes[pid]));
        }
        return v;
      },
    };
  },
};
