const { petitBac } = require('../data/words');
const { shuffle, pick, normalize } = require('../util');

const T = { write: 90000, stop: 6000, validate: 45000, score: 9000 };

module.exports = {
  key: 'petitbac',
  name: 'Petit bac foot',
  icon: '✍️',
  desc: 'Une lettre, 5 catégories. Trouve un mot par catégorie. Le premier qui a tout rempli peut crier STOP. Ensuite, on vote pour refuser les réponses bidon.',
  min: 2,
  options: [{ key: 'rounds', label: 'Nombre de manches', type: 'number', def: 4, min: 1, max: 10 }],

  create(ctx, ids, opts) {
    const letters = shuffle(petitBac.letters);
    const s = {
      round: 0, phase: 'write', letter: '', cats: [], answers: {}, rejects: {}, scores: {},
      roundPts: {}, deadline: 0, stoppedBy: null,
    };
    ids.forEach(id => { s.scores[id] = 0; });
    let timer = null;

    function set(phase, ms, then) {
      ctx.clear(timer);
      s.phase = phase;
      s.deadline = ctx.now() + ms;
      timer = ctx.after(ms, then);
    }

    function write() {
      s.round++;
      s.letter = letters[(s.round - 1) % letters.length];
      s.cats = [...petitBac.fixed, ...shuffle(petitBac.pool).slice(0, 3)];
      s.answers = {};
      s.rejects = {};
      s.stoppedBy = null;
      set('write', T.write, validate);
    }

    function filled(pid) {
      const a = s.answers[pid] || {};
      return s.cats.every((_, i) => String(a[i] || '').trim().length > 1);
    }

    function startsOk(text) {
      return normalize(text).startsWith(s.letter.toLowerCase()) && normalize(text).length > 1;
    }

    function validate() {
      if (s.phase !== 'write' && s.phase !== 'stop') return;
      set('validate', T.validate, score);
    }

    function score() {
      if (s.phase !== 'validate') return;
      ctx.clear(timer);
      const voters = Object.keys(s.scores).length;
      s.roundPts = {};
      for (const pid of Object.keys(s.scores)) s.roundPts[pid] = 0;
      s.cats.forEach((_, ci) => {
        const valid = [];
        for (const pid of Object.keys(s.scores)) {
          const text = String((s.answers[pid] || {})[ci] || '').trim();
          if (!text || !startsOk(text)) continue;
          const rej = (s.rejects[`${pid}:${ci}`] || new Set()).size;
          if (rej * 2 > voters - 1) continue;
          valid.push({ pid, key: normalize(text) });
        }
        for (const v of valid) {
          const same = valid.filter(x => x.key === v.key).length;
          s.roundPts[v.pid] += same > 1 ? 5 : 10;
        }
      });
      for (const [pid, pts] of Object.entries(s.roundPts)) s.scores[pid] += pts;
      set('score', T.score, () => {
        if (s.round >= opts.rounds) ctx.finish(Object.entries(s.scores).map(([pid, score]) => ({ pid, score })));
        else write();
      });
    }

    write();

    return {
      addPlayer(pid) {
        if (!(pid in s.scores)) s.scores[pid] = 0;
      },
      onAction(pid, act, data) {
        if (act === 'draft' && (s.phase === 'write' || s.phase === 'stop')) {
          const ci = parseInt(String(data.field).split('-').pop(), 10);
          if (!(ci >= 0 && ci < s.cats.length)) return false;
          (s.answers[pid] = s.answers[pid] || {})[ci] = String(data.value || '').slice(0, 40);
          return false;
        }
        if (act === 'stop' && s.phase === 'write') {
          const a = (s.answers[pid] = s.answers[pid] || {});
          s.cats.forEach((_, i) => { if (data['cat-' + i] != null) a[i] = String(data['cat-' + i]).slice(0, 40); });
          if (!filled(pid)) return 'Remplis toutes les catégories avant de crier STOP.';
          s.stoppedBy = ctx.name(pid);
          set('stop', T.stop, validate);
          return;
        }
        if (act === 'reject' && s.phase === 'validate') {
          if (data.pid === pid || !(data.pid in s.scores)) return false;
          const key = `${data.pid}:${parseInt(data.ci, 10)}`;
          const set_ = (s.rejects[key] = s.rejects[key] || new Set());
          if (set_.has(pid)) set_.delete(pid);
          else set_.add(pid);
          return;
        }
        return false;
      },
      onHost(type) {
        if (type === 'skip') {
          if (s.phase === 'write' || s.phase === 'stop') validate();
          else if (s.phase === 'validate') score();
        }
      },
      view(pid) {
        const v = {
          phase: s.phase, round: s.round, rounds: opts.rounds, letter: s.letter, cats: s.cats,
          deadline: s.deadline, stoppedBy: s.stoppedBy, myScore: s.scores[pid] || 0,
          mine: s.answers[pid] || {}, me: pid,
        };
        if (s.phase === 'validate' || s.phase === 'score') {
          v.table = s.cats.map((cat, ci) => ({
            cat,
            rows: Object.keys(s.scores).map(id => {
              const text = String((s.answers[id] || {})[ci] || '').trim();
              const rej = s.rejects[`${id}:${ci}`] || new Set();
              return { pid: id, name: ctx.name(id), text, ok: !!text && startsOk(text), rej: rej.size, iRejected: rej.has(pid) };
            }).filter(r => r.text),
          }));
        }
        if (s.phase === 'score') {
          v.roundPts = s.roundPts[pid] || 0;
          v.top = Object.entries(s.scores).map(([id, score]) => ({ name: ctx.name(id), score }))
            .sort((a, b) => b.score - a.score).slice(0, 5);
        }
        return v;
      },
    };
  },
};
