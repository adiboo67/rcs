const QUESTIONS = require('../data/quiz');
const { shuffle } = require('../util');

const Q_TIME = 15000;
const R_TIME = 6000;

module.exports = {
  key: 'quiz',
  name: 'Quiz foot',
  icon: '❓',
  desc: 'Tout le monde répond en même temps. Plus tu réponds vite, plus tu gagnes de points.',
  min: 1,
  options: [{ key: 'count', label: 'Nombre de questions', type: 'number', def: 15, min: 5, max: 40 }],

  create(ctx, ids, opts) {
    const qs = shuffle(QUESTIONS).slice(0, opts.count).map(q => {
      const order = shuffle(q.c.map((_, i) => i));
      return { cat: q.cat, q: q.q, c: order.map(i => q.c[i]), a: order.indexOf(q.a) };
    });
    const s = { phase: 'question', i: 0, scores: {}, answers: {}, t0: 0, deadline: 0 };
    ids.forEach(id => { s.scores[id] = 0; });
    let timer = null;

    function ask() {
      s.phase = 'question';
      s.answers = {};
      s.t0 = ctx.now();
      s.deadline = s.t0 + Q_TIME;
      timer = ctx.after(Q_TIME, reveal);
    }

    function reveal() {
      if (s.phase !== 'question') return;
      ctx.clear(timer);
      const q = qs[s.i];
      for (const [pid, a] of Object.entries(s.answers)) {
        a.pts = a.choice === q.a ? Math.round(500 + 500 * Math.max(0, 1 - (a.t - s.t0) / Q_TIME)) : 0;
        s.scores[pid] += a.pts;
      }
      s.phase = 'reveal';
      s.deadline = ctx.now() + R_TIME;
      timer = ctx.after(R_TIME, next);
    }

    function next() {
      ctx.clear(timer);
      s.i++;
      if (s.i >= qs.length) {
        ctx.finish(Object.entries(s.scores).map(([pid, score]) => ({ pid, score })));
        return;
      }
      ask();
    }

    function ranking() {
      return Object.entries(s.scores)
        .map(([pid, score]) => ({ name: ctx.name(pid), score, pid }))
        .sort((a, b) => b.score - a.score);
    }

    ask();

    return {
      addPlayer(pid) {
        if (!(pid in s.scores)) s.scores[pid] = 0;
      },
      onAction(pid, act, data) {
        if (act !== 'answer' || s.phase !== 'question' || s.answers[pid]) return false;
        const choice = parseInt(data.choice, 10);
        if (!(choice >= 0 && choice < 4)) return false;
        s.answers[pid] = { choice, t: ctx.now() };
        const waiting = ctx.connectedIds(Object.keys(s.scores)).filter(id => !s.answers[id]);
        if (!waiting.length) reveal();
      },
      onHost(type) {
        if (type === 'skip') s.phase === 'question' ? reveal() : next();
      },
      view(pid) {
        const q = qs[s.i];
        const mine = s.answers[pid];
        const v = {
          phase: s.phase, n: s.i + 1, total: qs.length, cat: q.cat, q: q.q, choices: q.c,
          deadline: s.deadline, my: mine ? mine.choice : null, myScore: s.scores[pid] || 0,
          answered: Object.keys(s.answers).length, players: Object.keys(s.scores).length,
        };
        if (s.phase === 'reveal') {
          v.correct = q.a;
          v.myPts = mine ? mine.pts : 0;
          v.dist = [0, 1, 2, 3].map(i => Object.values(s.answers).filter(a => a.choice === i).length);
          const r = ranking();
          v.top = r.slice(0, 5);
          v.myRank = r.findIndex(x => x.pid === pid) + 1;
        }
        return v;
      },
    };
  },
};
