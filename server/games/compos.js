const { lineups } = require('../data/football');
const { shuffle, nameMatches } = require('../util');

const GUESS_TIME = 75000;
const REVEAL_TIME = 10000;
const HIDDEN = 4;

module.exports = {
  key: 'compos',
  name: 'Les compos fantômes',
  icon: '👻',
  desc: 'Une composition célèbre s\'affiche avec 4 joueurs cachés. Retrouve leurs noms (le nom de famille suffit).',
  min: 1,
  options: [{ key: 'count', label: 'Nombre de compos', type: 'number', def: 5, min: 2, max: 11 }],

  create(ctx, ids, opts) {
    const rounds = shuffle(lineups).slice(0, opts.count).map(l => {
      const flat = l.lines.flat();
      return { ...l, flat, hidden: shuffle(flat.map((_, i) => i)).slice(0, HIDDEN).sort((a, b) => a - b) };
    });
    const s = { i: 0, phase: 'guess', guesses: {}, done: {}, scores: {}, found: {}, deadline: 0 };
    ids.forEach(id => { s.scores[id] = 0; });
    let timer = null;

    function guess() {
      s.phase = 'guess';
      s.guesses = {};
      s.done = {};
      s.found = {};
      s.deadline = ctx.now() + GUESS_TIME;
      timer = ctx.after(GUESS_TIME, reveal);
    }

    function reveal() {
      if (s.phase !== 'guess') return;
      ctx.clear(timer);
      const r = rounds[s.i];
      for (const pid of Object.keys(s.scores)) {
        const g = s.guesses[pid] || {};
        s.found[pid] = r.hidden.filter(slot => g[slot] && nameMatches(g[slot], r.flat[slot]));
        s.scores[pid] += s.found[pid].length;
      }
      s.phase = 'reveal';
      s.deadline = ctx.now() + REVEAL_TIME;
      timer = ctx.after(REVEAL_TIME, next);
    }

    function next() {
      ctx.clear(timer);
      s.i++;
      if (s.i >= rounds.length) {
        ctx.finish(Object.entries(s.scores).map(([pid, score]) => ({ pid, score })));
        return;
      }
      guess();
    }

    guess();

    return {
      addPlayer(pid) {
        if (!(pid in s.scores)) s.scores[pid] = 0;
      },
      onAction(pid, act, data) {
        if (s.phase !== 'guess') return false;
        const r = rounds[s.i];
        if (act === 'draft') {
          const slot = parseInt(String(data.field).split('-').pop(), 10);
          if (!r.hidden.includes(slot)) return false;
          (s.guesses[pid] = s.guesses[pid] || {})[slot] = String(data.value || '').slice(0, 40);
          return false;
        }
        if (act === 'submit') {
          const g = (s.guesses[pid] = s.guesses[pid] || {});
          for (const slot of r.hidden) {
            if (data['slot-' + slot] != null) g[slot] = String(data['slot-' + slot]).slice(0, 40);
          }
          s.done[pid] = true;
          const waiting = ctx.connectedIds(Object.keys(s.scores)).filter(id => !s.done[id]);
          if (!waiting.length) reveal();
        }
      },
      onHost(type) {
        if (type === 'skip') s.phase === 'guess' ? reveal() : next();
      },
      view(pid) {
        const r = rounds[s.i];
        let k = 0;
        const lines = r.lines.map(line => line.map(name => {
          const slot = k++;
          const hidden = r.hidden.includes(slot);
          const cell = { slot, hidden };
          if (!hidden || s.phase === 'reveal') cell.name = name;
          if (hidden && s.phase === 'reveal') {
            cell.ok = (s.found[pid] || []).includes(slot);
            cell.mine = (s.guesses[pid] || {})[slot] || '';
            cell.foundBy = Object.values(s.found).filter(f => f.includes(slot)).length;
          }
          return cell;
        }));
        return {
          phase: s.phase, n: s.i + 1, total: rounds.length, title: r.title, sub: r.sub, lines,
          deadline: s.deadline, done: !!s.done[pid], myScore: s.scores[pid] || 0,
          doneCount: Object.keys(s.done).length, players: Object.keys(s.scores).length,
          myFound: s.phase === 'reveal' ? (s.found[pid] || []).length : null,
          top: Object.entries(s.scores).map(([id, score]) => ({ name: ctx.name(id), score }))
            .sort((a, b) => b.score - a.score).slice(0, 5),
        };
      },
    };
  },
};
