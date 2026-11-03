const { shuffle } = require('../util');

const T = { write: 150000, guess: 25000, reveal: 8000 };

module.exports = {
  key: 'anecdotes',
  name: 'Anecdotes anonymes',
  icon: '🤫',
  desc: 'Chacun écrit une anecdote vraie sur lui. L\'organisateur relit, puis tout le monde devine qui l\'a écrite.',
  min: 3,
  options: [{ key: 'max', label: 'Anecdotes max à jouer', type: 'number', def: 15, min: 3, max: 40 }],

  create(ctx, ids, opts) {
    const s = { phase: 'write', texts: {}, list: [], i: 0, guesses: {}, scores: {}, deadline: 0 };
    ids.forEach(id => { s.scores[id] = 0; });
    let timer = null;

    function set(phase, ms, then) {
      ctx.clear(timer);
      s.phase = phase;
      s.deadline = ms ? ctx.now() + ms : 0;
      if (ms) timer = ctx.after(ms, then);
    }

    function moderate() {
      if (s.phase !== 'write') return;
      s.list = shuffle(Object.entries(s.texts).filter(([, t]) => t.trim().length >= 5)
        .map(([author, text], k) => ({ k, author, text: text.trim() })));
      set('moderate', 0);
    }

    function guess() {
      s.guesses = {};
      set('guess', T.guess, reveal);
    }

    function reveal() {
      if (s.phase !== 'guess') return;
      const a = s.list[s.i];
      for (const [pid, target] of Object.entries(s.guesses)) {
        if (target === a.author) s.scores[pid] += 2;
        else s.scores[a.author] += 1;
      }
      set('reveal', T.reveal, next);
    }

    function next() {
      s.i++;
      if (s.i >= s.list.length) {
        ctx.finish(Object.entries(s.scores).map(([pid, score]) => ({ pid, score })));
        return;
      }
      guess();
    }

    set('write', T.write, moderate);

    return {
      onAction(pid, act, data) {
        if (!(pid in s.scores)) return false;
        if (act === 'draft' && s.phase === 'write') {
          s.texts[pid] = String(data.value || '').slice(0, 220);
          return false;
        }
        if (act === 'submit' && s.phase === 'write') {
          s.texts[pid] = String(data.text || '').slice(0, 220);
          if (s.texts[pid].trim().length < 5) return 'Ton anecdote est trop courte.';
          s.submitted = s.submitted || new Set();
          s.submitted.add(pid);
          if (ctx.connectedIds(ids).every(id => s.submitted.has(id))) moderate();
          return;
        }
        if (act === 'guess' && s.phase === 'guess') {
          const a = s.list[s.i];
          if (pid === a.author || !(data.target in s.scores)) return false;
          s.guesses[pid] = data.target;
          const waiting = ctx.connectedIds(ids).filter(id => id !== a.author && !s.guesses[id]);
          if (!waiting.length) reveal();
          return;
        }
        return false;
      },
      onHost(type, data) {
        if (type === 'skip') {
          if (s.phase === 'write') moderate();
          else if (s.phase === 'guess') reveal();
          else if (s.phase === 'reveal') next();
        }
        if (type === 'remove' && s.phase === 'moderate') {
          s.list = s.list.filter(a => a.k !== Number(data.k));
        }
        if (type === 'launch' && s.phase === 'moderate') {
          s.list = s.list.slice(0, opts.max);
          if (!s.list.length) return 'Aucune anecdote à jouer.';
          s.i = 0;
          guess();
        }
      },
      view(pid, isHost) {
        if (!(pid in s.scores)) return { spectator: true, msg: 'Les anecdotes sont en cours. Tu joueras à la prochaine !' };
        const v = {
          phase: s.phase, deadline: s.deadline, myScore: s.scores[pid],
          submitted: !!(s.submitted && s.submitted.has(pid)), count: s.submitted ? s.submitted.size : 0,
          players: ids.length, mine: s.texts[pid] || '',
        };
        if (s.phase === 'moderate') {
          v.total = s.list.length;
          if (isHost) v.list = s.list.map(a => ({ k: a.k, text: a.text }));
        }
        if (s.phase === 'guess' || s.phase === 'reveal') {
          const a = s.list[s.i];
          v.n = s.i + 1;
          v.total = s.list.length;
          v.text = a.text;
          v.isAuthor = a.author === pid;
          v.myGuess = s.guesses[pid] || null;
          v.guessCount = Object.keys(s.guesses).length;
          const authors = [...new Set(s.list.map(x => x.author))];
          v.candidates = authors.filter(id => id !== pid).map(id => ({ id, name: ctx.name(id) }))
            .sort((x, y) => x.name.localeCompare(y.name));
          if (s.phase === 'reveal') {
            v.author = ctx.name(a.author);
            v.right = s.guesses[pid] === a.author;
            v.found = Object.values(s.guesses).filter(t => t === a.author).length;
          }
        }
        return v;
      },
    };
  },
};
