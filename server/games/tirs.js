const { shuffle, pick } = require('../util');

const CHOOSE_MS = 6000;
const SHOW_MS = 2600;
const ROUND_PAUSE = 6000;
const DIRS = ['L', 'C', 'R'];

module.exports = {
  key: 'tirs',
  name: 'Tirs au but éclair',
  icon: '🥅',
  desc: 'Duels en 1 contre 1 : 5 tirs chacun. Tireur et gardien choisissent gauche, centre ou droite en même temps. Le vainqueur passe au tour suivant.',
  min: 2,
  options: [],

  create(ctx, ids) {
    const s = { round: 0, phase: 'duels', duels: [], bye: null, depth: {}, champion: null, deadline: 0 };
    ids.forEach(id => { s.depth[id] = 0; });
    let pauseTimer = null;

    function roundName(n) {
      if (n === 2) return 'Finale';
      if (n <= 4) return 'Demi-finales';
      if (n <= 8) return 'Quarts de finale';
      if (n <= 16) return 'Huitièmes de finale';
      return 'Premier tour';
    }

    function startRound(players) {
      s.round++;
      s.phase = 'duels';
      const list = shuffle(players);
      s.bye = list.length % 2 ? list.pop() : null;
      if (s.bye) s.depth[s.bye]++;
      s.title = roundName(list.length);
      s.duels = [];
      for (let i = 0; i < list.length; i += 2) {
        const d = { no: i / 2 + 1, a: list[i], b: list[i + 1], ga: 0, gb: 0, na: 0, nb: 0, kick: 0, choices: {}, last: null, winner: null, timer: null, deadline: 0, phase: 'choose' };
        s.duels.push(d);
        nextKick(d, true);
      }
    }

    const shooter = d => (d.kick % 2 === 0 ? d.a : d.b);
    const keeper = d => (d.kick % 2 === 0 ? d.b : d.a);

    function nextKick(d, first) {
      ctx.clear(d.timer);
      if (!first) d.kick++;
      d.choices = {};
      d.phase = 'choose';
      const away = !ctx.isConnected(d.a) || !ctx.isConnected(d.b);
      const ms = away ? 2500 : CHOOSE_MS;
      d.deadline = ctx.now() + ms;
      d.timer = ctx.after(ms, () => resolveKick(d));
    }

    function resolveKick(d) {
      if (d.phase !== 'choose' || d.winner) return;
      ctx.clear(d.timer);
      const sh = shooter(d), kp = keeper(d);
      const shot = d.choices[sh] || pick(DIRS);
      const dive = d.choices[kp] || pick(DIRS);
      const goal = shot !== dive;
      if (sh === d.a) { d.na++; if (goal) d.ga++; } else { d.nb++; if (goal) d.gb++; }
      d.last = { shooter: ctx.name(sh), keeper: ctx.name(kp), shot, dive, goal };
      d.phase = 'show';
      const w = decided(d);
      d.deadline = ctx.now() + SHOW_MS;
      d.timer = ctx.after(SHOW_MS, () => {
        if (w) return finishDuel(d, w);
        nextKick(d);
      });
    }

    function decided(d) {
      const { ga, gb, na, nb } = d;
      if (na <= 5 && nb <= 5) {
        if (ga + (5 - na) < gb) return d.b;
        if (gb + (5 - nb) < ga) return d.a;
        if (na === 5 && nb === 5 && ga !== gb) return ga > gb ? d.a : d.b;
        if (!(na === 5 && nb === 5)) return null;
      }
      if (na === nb && ga !== gb) return ga > gb ? d.a : d.b;
      if (na >= 10 && nb >= 10) return pick([d.a, d.b]);
      return null;
    }

    function finishDuel(d, w) {
      ctx.clear(d.timer);
      d.winner = w;
      d.phase = 'done';
      s.depth[w]++;
      if (s.duels.every(x => x.winner)) {
        const next = s.duels.map(x => x.winner);
        if (s.bye) next.push(s.bye);
        if (next.length === 1) {
          s.champion = next[0];
          s.depth[next[0]] += 2;
          s.phase = 'champion';
          s.deadline = ctx.now() + 10000;
          pauseTimer = ctx.after(10000, () => ctx.finish(Object.entries(s.depth).map(([pid, score]) => ({ pid, score })),
            { text: `Champion des tirs au but : ${ctx.name(s.champion)}` }));
          return;
        }
        s.phase = 'pause';
        s.deadline = ctx.now() + ROUND_PAUSE;
        pauseTimer = ctx.after(ROUND_PAUSE, () => startRound(next));
      }
    }

    function duelView(d, pid) {
      return {
        no: d.no, a: ctx.name(d.a), b: ctx.name(d.b), ga: d.ga, gb: d.gb, na: d.na, nb: d.nb,
        winner: d.winner ? ctx.name(d.winner) : null, phase: d.phase, deadline: d.deadline, last: d.last,
        mine: d.a === pid || d.b === pid,
        role: d.phase === 'choose' ? (shooter(d) === pid ? 'shooter' : keeper(d) === pid ? 'keeper' : null) : null,
        shooterName: ctx.name(shooter(d)), keeperName: ctx.name(keeper(d)),
        chosen: d.choices[pid] || null,
      };
    }

    startRound(ids);

    return {
      onAction(pid, act, data) {
        if (act !== 'choose' || !DIRS.includes(data.dir)) return false;
        const d = s.duels.find(x => !x.winner && (x.a === pid || x.b === pid));
        if (!d || d.phase !== 'choose' || d.choices[pid]) return false;
        d.choices[pid] = data.dir;
        if (d.choices[shooter(d)] && d.choices[keeper(d)]) resolveKick(d);
      },
      onHost() {},
      view(pid) {
        const mine = s.duels.find(x => x.a === pid || x.b === pid);
        return {
          phase: s.phase, round: s.round, title: s.title, deadline: s.deadline,
          bye: s.bye === pid ? true : s.bye ? ctx.name(s.bye) : null,
          inGame: pid in s.depth,
          mine: mine ? duelView(mine, pid) : null,
          duels: s.duels.map(d => duelView(d, pid)),
          champion: s.champion ? ctx.name(s.champion) : null,
        };
      },
    };
  },
};
