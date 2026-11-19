const { shuffle, splitTables } = require('../util');

// Jeu des petits chevaux, par tables de 2 à 4.
// Position d'un cheval (relative à sa couleur) :
//   -1 = à l'écurie, 0..50 = sur le parcours, 51..55 = escalier, 56 = arrivé au centre.
const TRACK = 52; // cases du parcours commun
const LAST_TRACK = 50; // dernière case du parcours avant l'escalier
const GOAL = 56;
const COLORS = ['r', 'g', 'y', 'b'];
const TURN_MS = 20000;
const AWAY_TURN_MS = 4000;
const COLOR_NAME = { r: 'rouge', g: 'vert', y: 'jaune', b: 'bleu' };

module.exports = {
  key: 'chevaux',
  name: 'Petits chevaux',
  icon: '🐴',
  desc: 'Le jeu de plateau classique par tables de 2 à 4 : sors tes chevaux avec un 6, mange ceux des autres et ramène-les tous au centre.',
  min: 2,
  options: [
    { key: 'size', label: 'Joueurs max par table', type: 'number', def: 4, min: 2, max: 4 },
    { key: 'horses', label: 'Chevaux par joueur', type: 'number', def: 2, min: 1, max: 4 },
  ],

  create(ctx, ids, opts) {
    const HORSES = opts.horses || 2;
    const s = {
      phase: 'play', // play | results
      round: 1,
      isFinale: false,
      tables: [],
      totals: {},
    };
    ids.forEach(id => { s.totals[id] = 0; });

    function makeTable(players, no) {
      const t = {
        no, ids: shuffle(players), horses: {}, turn: 0, step: 'roll', dice: null, sixes: 0,
        rollId: 0, last: null, deadline: 0, timer: null, winner: null, results: null,
        log: 'La course commence ! Il faut un 6 pour sortir un cheval.',
      };
      for (const pid of t.ids) t.horses[pid] = Array(HORSES).fill(-1);
      startTurn(t);
      return t;
    }

    function startRound(players, finale) {
      s.tables.forEach(t => ctx.clear(t.timer));
      s.phase = 'play';
      s.isFinale = !!finale;
      // Tables équilibrées d'au plus 4 joueurs (4 couleurs).
      const groups = splitTables(players, Math.min(4, opts.size || 4));
      s.tables = groups.map((g, i) => makeTable(g, i + 1));
    }

    function current(t) { return t.ids[t.turn]; }
    function seatOf(t, pid) { return t.ids.indexOf(pid); }
    function absSquare(seat, pos) { return (seat * 13 + pos) % TRACK; }

    function startTurn(t) {
      ctx.clear(t.timer);
      t.step = 'roll';
      const pid = current(t);
      const ms = ctx.isConnected(pid) ? TURN_MS : AWAY_TURN_MS;
      t.deadline = ctx.now() + ms;
      t.timer = ctx.after(ms, () => timeout(t));
    }

    function nextPlayer(t) {
      t.sixes = 0;
      t.turn = (t.turn + 1) % t.ids.length;
      startTurn(t);
    }

    function legalMoves(t, pid, d) {
      const moves = [];
      t.horses[pid].forEach((pos, h) => {
        if (pos === -1) { if (d === 6) moves.push({ h, from: -1, to: 0 }); return; }
        if (pos < GOAL && pos + d <= GOAL) moves.push({ h, from: pos, to: pos + d });
      });
      return moves;
    }

    // Chevaux adverses qui seraient renvoyés à l'écurie par ce déplacement.
    function victims(t, pid, to) {
      if (to > LAST_TRACK) return [];
      const sq = absSquare(seatOf(t, pid), to);
      const out = [];
      for (const other of t.ids) {
        if (other === pid) continue;
        const seat = seatOf(t, other);
        t.horses[other].forEach((pos, h) => {
          if (pos >= 0 && pos <= LAST_TRACK && absSquare(seat, pos) === sq) out.push({ pid: other, h });
        });
      }
      return out;
    }

    function roll(t, pid) {
      const d = 1 + Math.floor(Math.random() * 6);
      t.dice = d;
      t.rollId++;
      if (d === 6) t.sixes++;
      const moves = legalMoves(t, pid, d);
      const name = ctx.name(pid);
      if (!moves.length) {
        t.last = null;
        if (d === 6 && t.sixes < 3) {
          t.log = `${name} fait 6 mais ne peut pas bouger : il rejoue.`;
          startTurn(t);
        } else {
          t.log = `${name} fait ${d} : aucun cheval ne peut avancer.`;
          nextPlayer(t);
        }
        return;
      }
      // Un seul choix possible (ou plusieurs chevaux au même endroit) : on joue tout seul.
      const froms = new Set(moves.map(m => m.from));
      if (froms.size === 1) { move(t, pid, moves[0]); return; }
      t.step = 'move';
      t.log = `${name} fait ${d} : choisis un cheval.`;
    }

    function move(t, pid, m) {
      const name = ctx.name(pid);
      const d = t.dice;
      const caught = victims(t, pid, m.to);
      for (const v of caught) t.horses[v.pid][v.h] = -1;
      t.horses[pid][m.h] = m.to;
      t.last = { pid, h: m.h };
      if (m.from === -1) t.log = `${name} sort un cheval !`;
      else if (m.to === GOAL) t.log = `${name} ramène un cheval au centre ! 🏁`;
      else t.log = `${name} avance de ${d}.`;
      if (caught.length) {
        const who = [...new Set(caught.map(v => ctx.name(v.pid)))].join(', ');
        t.log += ` Il renvoie ${caught.length > 1 ? 'des chevaux' : 'un cheval'} de ${who} à l'écurie ! 💥`;
        t.capture = t.rollId;
      }
      if (t.horses[pid].every(p => p === GOAL)) { finishTable(t, pid); return; }
      if (d === 6 && t.sixes < 3) {
        t.log += ' 6 : il rejoue !';
        startTurn(t);
      } else {
        nextPlayer(t);
      }
    }

    // Choix automatique : manger > arriver > sortir > avancer le cheval le plus avancé.
    function bestMove(t, pid, moves) {
      const score = m => (victims(t, pid, m.to).length ? 1000 : 0) + (m.to === GOAL ? 500 : 0)
        + (m.from === -1 ? 300 : 0) + m.to;
      return moves.slice().sort((a, b) => score(b) - score(a))[0];
    }

    function timeout(t) {
      if (t.winner) return;
      const pid = current(t);
      const name = ctx.name(pid);
      if (t.step === 'roll') {
        roll(t, pid);
        if (t.step !== 'move' || current(t) !== pid) { t.log = `⏱ ${t.log}`; return; }
      }
      const moves = legalMoves(t, pid, t.dice);
      if (!moves.length) { nextPlayer(t); return; }
      move(t, pid, bestMove(t, pid, moves));
      t.log = `⏱ ${name} a trop attendu. ${t.log}`;
    }

    function progress(t, pid) {
      return t.horses[pid].reduce((sum, p) => sum + (p < 0 ? 0 : p), 0);
    }

    function finishTable(t, winner) {
      ctx.clear(t.timer);
      t.winner = winner;
      t.log = `${ctx.name(winner)} a ramené tous ses chevaux ! 🏆`;
      const others = t.ids.filter(id => id !== winner).sort((a, b) => progress(t, b) - progress(t, a));
      t.results = [winner, ...others].map(id => ({
        name: ctx.name(id), home: t.horses[id].filter(p => p === GOAL).length, total: HORSES,
      }));
      s.totals[winner] += 1000;
      for (const id of others) s.totals[id] += progress(t, id) * 2;
      if (s.tables.every(x => x.winner)) s.phase = 'results';
    }

    function tableOf(pid) { return s.tables.find(t => t.ids.includes(pid)); }

    function finalRanking() {
      return Object.entries(s.totals).map(([pid, score]) => ({ pid, score }));
    }

    startRound(ids);

    return {
      addPlayer(pid) {
        if (!(pid in s.totals)) s.totals[pid] = 0;
      },
      onAction(pid, act, data) {
        const t = tableOf(pid);
        if (!t || t.winner) return false;
        if (current(t) !== pid) return 'Ce n\'est pas ton tour.';
        if (act === 'roll') {
          if (t.step !== 'roll') return 'Choisis d\'abord un cheval.';
          roll(t, pid);
          return;
        }
        if (act === 'move') {
          if (t.step !== 'move') return 'Lance d\'abord le dé.';
          const h = Number(data && data.h);
          const m = legalMoves(t, pid, t.dice).find(x => x.h === h);
          if (!m) return 'Ce cheval ne peut pas bouger.';
          move(t, pid, m);
          return;
        }
        return false;
      },
      onHost(type) {
        if (type === 'finale') {
          const winners = s.tables.filter(t => t.winner).map(t => t.winner);
          if (winners.length < 2) return 'Il faut au moins 2 gagnants de table pour une finale.';
          for (const w of winners) s.totals[w] += 1000; // les finalistes passent devant les autres
          s.round++;
          startRound(winners, true);
          return;
        }
        if (type === 'rematch') {
          const everyone = Object.keys(s.totals).filter(id => ctx.isConnected(id));
          if (everyone.length < 2) return 'Pas assez de joueurs connectés.';
          s.round++;
          startRound(everyone, false);
          return;
        }
        if (type === 'end') ctx.finish(finalRanking());
      },
      view(pid) {
        const t = tableOf(pid);
        const overview = s.tables.map(x => ({
          no: x.no, n: x.ids.length, winner: x.winner ? ctx.name(x.winner) : null,
          turn: x.winner ? null : ctx.name(current(x)),
        }));
        const base = { phase: s.phase, round: s.round, isFinale: s.isFinale, overview };
        if (s.phase === 'results') {
          base.results = s.tables.map(x => ({ no: x.no, rows: x.results || [] }));
          base.canFinale = s.tables.filter(x => x.winner).length >= 2 && !s.isFinale;
          base.totals = Object.entries(s.totals).map(([id, score]) => ({ name: ctx.name(id), score }))
            .sort((a, b) => b.score - a.score).slice(0, 10);
          return base;
        }
        if (!t) return { ...base, spectator: true, msg: s.isFinale ? 'Finale en cours entre les gagnants de table.' : 'Tu joueras à la prochaine manche.' };
        const myTurn = !t.winner && current(t) === pid;
        const movable = myTurn && t.step === 'move' ? legalMoves(t, pid, t.dice).map(m => m.h) : [];
        const seats = t.ids.map((id, k) => ({
          name: ctx.name(id), color: COLORS[k], seat: k, me: id === pid, away: !ctx.isConnected(id),
          turn: !t.winner && k === t.turn, horses: t.horses[id].slice(),
          home: t.horses[id].filter(p => p === GOAL).length,
        }));
        const last = t.last ? { seat: seatOf(t, t.last.pid), h: t.last.h } : null;
        return {
          ...base, table: t.no, seats, horses: HORSES, myTurn, step: t.step, dice: t.dice, rollId: t.rollId,
          capture: t.capture === t.rollId, movable, last, deadline: t.deadline, log: t.log,
          myColor: COLOR_NAME[COLORS[seatOf(t, pid)]], winner: t.winner ? ctx.name(t.winner) : null,
        };
      },
    };
  },
};
