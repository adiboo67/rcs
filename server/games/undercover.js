const { undercover } = require('../data/words');
const { shuffle, splitTables, plurality, pick, normalize } = require('../util');

const T = { word: 12000, clue: 45000, vote: 60000, reveal: 8000, white: 25000, end: 12000 };

function roleCounts(n) {
  return { under: n >= 7 ? 2 : 1, white: n >= 6 ? 1 : 0 };
}

module.exports = {
  key: 'undercover',
  name: 'Undercover',
  icon: '🕵️',
  desc: 'Chacun reçoit un mot secret. Les undercovers ont un mot proche, Mr White n\'en a pas. Donne un indice, puis votez pour éliminer les intrus.',
  min: 3,
  options: [{ key: 'size', label: 'Joueurs max par table', type: 'number', def: 8, min: 3, max: 12 }],

  create(ctx, ids, opts) {
    const pairs = shuffle(undercover);
    const tables = splitTables(ids, opts.size).map((players, i) => makeTable(players, i + 1, pairs[i % pairs.length]));
    const s = { phase: 'play', results: null };

    function makeTable(players, no, pair) {
      const [civil, under] = Math.random() < 0.5 ? pair : [pair[1], pair[0]];
      const { under: nu, white: nw } = roleCounts(players.length);
      const order = shuffle(players);
      const roles = {};
      order.forEach((pid, i) => { roles[pid] = i < nu ? 'under' : i < nu + nw ? 'white' : 'civil'; });
      const t = {
        no, ids: players, roles, words: { civil, under }, alive: new Set(players), phase: 'word',
        deadline: 0, timer: null, clues: {}, history: [], votes: {}, news: '', winner: null, round: 0,
        whiteGuesser: null,
      };
      set(t, 'word', T.word, () => clues(t));
      return t;
    }

    function set(t, phase, ms, then) {
      ctx.clear(t.timer);
      t.phase = phase;
      t.deadline = ctx.now() + ms;
      t.timer = ctx.after(ms, then);
    }

    function clues(t) {
      t.round++;
      t.clues = {};
      set(t, 'clue', T.clue, () => vote(t));
    }

    function vote(t) {
      if (t.phase !== 'clue') return;
      t.history.push([...t.alive].map(id => ({ name: ctx.name(id), clue: t.clues[id] || '…' })));
      t.votes = {};
      set(t, 'vote', T.vote, () => endVote(t));
    }

    function endVote(t) {
      if (t.phase !== 'vote') return;
      const res = plurality(t.votes);
      if (!res.winner || res.tie) {
        t.news = 'Égalité : personne n\'est éliminé. Nouveau tour d\'indices !';
        return set(t, 'reveal', T.reveal, () => clues(t));
      }
      const out = res.winner;
      t.alive.delete(out);
      const r = t.roles[out];
      const label = r === 'civil' ? 'civil 😇' : r === 'under' ? 'UNDERCOVER 🕵️' : 'MR WHITE 👻';
      t.news = `${ctx.name(out)} est éliminé : c'était un ${label}.`;
      if (r === 'white') {
        t.whiteGuesser = out;
        return set(t, 'white', T.white, () => whiteGuess(t, ''));
      }
      set(t, 'reveal', T.reveal, () => next(t));
    }

    function whiteGuess(t, word) {
      if (t.phase !== 'white') return;
      if (word && normalize(word) === normalize(t.words.civil)) {
        t.news = `👻 ${ctx.name(t.whiteGuesser)} a trouvé le mot « ${t.words.civil} » : Mr White gagne !`;
        return end(t, 'white');
      }
      t.news = `${ctx.name(t.whiteGuesser)} a proposé « ${word || '…'} » : raté !`;
      set(t, 'reveal', T.reveal, () => next(t));
    }

    function next(t) {
      const alive = [...t.alive];
      const civils = alive.filter(id => t.roles[id] === 'civil').length;
      const impostors = alive.length - civils;
      if (impostors === 0) return end(t, 'civil');
      if (civils <= impostors) return end(t, 'impostors');
      clues(t);
    }

    function end(t, winner) {
      ctx.clear(t.timer);
      t.phase = 'end';
      t.winner = winner;
      t.scores = {};
      for (const id of t.ids) {
        const r = t.roles[id];
        let score = 0;
        if (winner === 'civil' && r === 'civil') score = 2;
        if (winner === 'impostors' && r !== 'civil') score = 2;
        if (winner === 'white' && r === 'white') score = 4;
        if (score && t.alive.has(id)) score += 1;
        t.scores[id] = score;
      }
      if (tables.every(x => x.phase === 'end')) {
        s.phase = 'done';
        ctx.after(T.end, finishAll);
      }
    }

    function finishAll() {
      const ranking = [];
      for (const t of tables) for (const id of t.ids) ranking.push({ pid: id, score: t.scores ? t.scores[id] : 0 });
      ctx.finish(ranking);
    }

    const tableOf = pid => tables.find(t => t.ids.includes(pid));

    return {
      onAction(pid, act, data) {
        const t = tableOf(pid);
        if (!t || !t.alive.has(pid) && !(t.phase === 'white' && pid === t.whiteGuesser)) return false;
        if (act === 'clue' && t.phase === 'clue') {
          const clue = String(data.clue || '').trim().split(/\s+/)[0].slice(0, 24);
          if (!clue) return 'Écris un mot.';
          if (t.roles[pid] !== 'white' && normalize(clue) === normalize(t.words[t.roles[pid]])) return 'Tu ne peux pas donner ton mot !';
          t.clues[pid] = clue;
          if (ctx.connectedIds([...t.alive]).every(id => t.clues[id])) vote(t);
          return;
        }
        if (act === 'vote' && t.phase === 'vote') {
          if (!t.alive.has(data.target) || data.target === pid) return false;
          t.votes[pid] = data.target;
          if (ctx.connectedIds([...t.alive]).every(id => t.votes[id])) endVote(t);
          return;
        }
        if (act === 'guess' && t.phase === 'white' && pid === t.whiteGuesser) return whiteGuess(t, String(data.word || ''));
        return false;
      },
      onHost(type) {
        if (type === 'skip') {
          for (const t of tables) {
            if (t.phase === 'clue') vote(t);
            else if (t.phase === 'vote') endVote(t);
          }
        }
        if (type === 'end') finishAll();
      },
      view(pid) {
        const overview = tables.map(t => ({ no: t.no, n: t.ids.length, alive: t.alive.size, phase: t.phase, winner: t.winner }));
        const t = tableOf(pid);
        if (!t) return { spectator: true, msg: 'Partie en cours. Tu joueras à la prochaine !', overview };
        const role = t.roles[pid];
        const over = t.phase === 'end';
        return {
          phase: t.phase, table: t.no, round: t.round, deadline: t.deadline, overview,
          word: role === 'white' ? null : t.words[role],
          isWhite: role === 'white', isAlive: t.alive.has(pid), amGuesser: t.whiteGuesser === pid,
          news: t.news, history: t.history,
          myClue: t.clues[pid] || null, myVote: t.votes[pid] || null,
          clueCount: Object.keys(t.clues).length, voteCount: Object.keys(t.votes).length, aliveCount: t.alive.size,
          players: t.ids.map(id => ({
            id, name: ctx.name(id), alive: t.alive.has(id), me: id === pid,
            role: !t.alive.has(id) || over ? t.roles[id] : null,
          })),
          winner: t.winner, words: over ? t.words : null, myScore: over ? t.scores[pid] : null,
        };
      },
    };
  },
};
