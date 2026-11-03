const { mercato } = require('../data/football');
const { shuffle } = require('../util');

const BUDGET = 100;
const BID_TIME = 45000;
const RESULT_TIME = 9000;
const SIM_TIME = 30000;
const SLOTS = [
  { pos: 'GB', label: 'Gardien' },
  { pos: 'DEF', label: 'Défenseur' },
  { pos: 'MIL', label: 'Milieu' },
  { pos: 'ATT', label: 'Attaquant' },
  { pos: 'JOKER', label: 'Joker (tous postes)' },
];
const DISTRICT = 62;

const basePrice = rating => Math.max(1, Math.round((rating - 72) * 1.3));

function poisson(lambda) {
  const L = Math.exp(-lambda);
  let k = 0, p = 1;
  do { k++; p *= Math.random(); } while (p > L && k < 10);
  return k - 1;
}

module.exports = {
  key: 'mercato',
  name: 'Mercato',
  icon: '💰',
  desc: '100 M€ de budget pour recruter 5 stars aux enchères secrètes (une enchère par manche). Ensuite, l\'app fait jouer un championnat entre vos équipes.',
  min: 2,
  options: [],

  create(ctx, ids) {
    const pools = {};
    let uid = 0;
    for (const [pos, list] of Object.entries(mercato)) {
      pools[pos] = shuffle(list.map(([name, rating]) => ({ id: uid++, name, rating, pos, base: basePrice(rating) })));
    }
    const s = {
      round: 0, phase: 'bid', lots: [], bids: {}, budget: {}, squad: {}, results: [], deadline: 0,
      table: [], matches: [],
    };
    ids.forEach(id => { s.budget[id] = BUDGET; s.squad[id] = []; });
    let timer = null;

    const managers = () => Object.keys(s.budget);
    const lotCount = () => Math.max(3, Math.ceil(managers().length * 0.7));

    function set(phase, ms, then) {
      ctx.clear(timer);
      s.phase = phase;
      s.deadline = ctx.now() + ms;
      timer = ctx.after(ms, then);
    }

    function openRound() {
      const slot = SLOTS[s.round];
      const n = lotCount();
      if (slot.pos === 'JOKER') {
        const rest = shuffle([...pools.GB.slice(0, 3), ...pools.DEF, ...pools.MIL, ...pools.ATT]);
        s.lots = rest.sort((a, b) => b.rating - a.rating).slice(0, n * 2);
        s.lots = shuffle(s.lots).slice(0, n).sort((a, b) => b.rating - a.rating);
      } else {
        s.lots = pools[slot.pos].splice(0, n).sort((a, b) => b.rating - a.rating);
      }
      s.bids = {};
      set('bid', BID_TIME, resolve);
    }

    function resolve() {
      if (s.phase !== 'bid') return;
      const slot = SLOTS[s.round];
      s.results = [];
      const won = new Set();
      for (const lot of s.lots) {
        const offers = Object.entries(s.bids)
          .filter(([, b]) => b.lot === lot.id)
          .sort((a, b) => b[1].amount - a[1].amount || a[1].t - b[1].t);
        if (!offers.length) continue;
        const [pid, b] = offers[0];
        s.budget[pid] -= b.amount;
        s.squad[pid].push({ ...lot, slot: slot.label, price: b.amount });
        won.add(pid);
        s.results.push({ player: lot.name, rating: lot.rating, buyer: ctx.name(pid), price: b.amount, offers: offers.length });
        for (const pos of Object.keys(pools)) pools[pos] = pools[pos].filter(p => p.id !== lot.id);
      }
      for (const pid of managers()) {
        if (!won.has(pid)) s.squad[pid].push({ name: 'Joueur de district', rating: DISTRICT, slot: slot.label, price: 0, district: true });
      }
      set('result', RESULT_TIME, () => {
        s.round++;
        if (s.round >= SLOTS.length) simulate();
        else openRound();
      });
    }

    function strength(pid) {
      const sq = s.squad[pid];
      return sq.reduce((sum, p) => sum + p.rating, 0) / sq.length;
    }

    function simulate() {
      const teams = shuffle(managers());
      const rows = {};
      for (const pid of teams) rows[pid] = { pid, name: 'FC ' + ctx.name(pid), str: Math.round(strength(pid) * 10) / 10, j: 0, pts: 0, bp: 0, bc: 0 };
      // Méthode du cercle : chaque équipe joue au plus 5 matchs.
      const list = teams.length % 2 ? [...teams, null] : teams.slice();
      const rounds = Math.min(5, list.length - 1);
      s.matches = [];
      for (let r = 0; r < rounds; r++) {
        for (let i = 0; i < list.length / 2; i++) {
          const a = list[i], b = list[list.length - 1 - i];
          if (!a || !b) continue;
          const diff = (rows[a].str - rows[b].str) / 6;
          const ga = poisson(1.35 * Math.exp(diff));
          const gb = poisson(1.35 * Math.exp(-diff));
          s.matches.push({ a, b, ga, gb });
          for (const [x, gf, ga_] of [[a, ga, gb], [b, gb, ga]]) {
            rows[x].j++;
            rows[x].bp += gf;
            rows[x].bc += ga_;
            rows[x].pts += gf > ga_ ? 3 : gf === ga_ ? 1 : 0;
          }
        }
        list.splice(1, 0, list.pop());
      }
      s.table = Object.values(rows).sort((x, y) => y.pts - x.pts || (y.bp - y.bc) - (x.bp - x.bc) || y.bp - x.bp);
      set('sim', SIM_TIME, () => {
        ctx.finish(s.table.map(r => ({ pid: r.pid, score: r.pts * 10000 + (r.bp - r.bc + 100) * 100 + r.bp })),
          { text: `Champion : ${s.table[0].name}` });
      });
    }

    openRound();

    return {
      onAction(pid, act, data) {
        if (!(pid in s.budget) || s.phase !== 'bid') return false;
        if (act === 'pass') {
          s.bids[pid] = { lot: null, amount: 0, t: ctx.now() };
        } else if (act === 'bid') {
          const lot = s.lots.find(l => l.id === Number(data.lot));
          const amount = parseInt(data.amount, 10);
          if (!lot) return 'Joueur introuvable.';
          if (!(amount >= lot.base)) return `L'enchère minimum pour ${lot.name} est ${lot.base} M€.`;
          if (amount > s.budget[pid]) return `Tu n'as que ${s.budget[pid]} M€.`;
          s.bids[pid] = { lot: lot.id, amount, t: ctx.now() };
        } else {
          return false;
        }
        if (ctx.connectedIds(managers()).every(id => s.bids[id])) resolve();
      },
      onHost(type) {
        if (type === 'skip' && s.phase === 'bid') resolve();
      },
      view(pid) {
        if (!(pid in s.budget)) return { spectator: true, msg: 'Le mercato a déjà commencé. Tu joueras au prochain !' };
        const slot = SLOTS[Math.min(s.round, SLOTS.length - 1)];
        const myBid = s.bids[pid] || null;
        const v = {
          phase: s.phase, round: s.round + 1, rounds: SLOTS.length, slot: slot.label, deadline: s.deadline,
          budget: s.budget[pid], squad: s.squad[pid], myBid,
          lots: s.lots.map(l => ({ id: l.id, name: l.name, rating: l.rating, base: l.base, pos: l.pos })),
          bidCount: Object.keys(s.bids).length, managers: managers().length,
        };
        if (s.phase === 'result') v.results = s.results;
        if (s.phase === 'sim') {
          v.table = s.table.map((r, i) => ({ ...r, rank: i + 1, me: r.pid === pid, pid: undefined }));
          v.myMatches = s.matches.filter(m => m.a === pid || m.b === pid).map(m => ({
            home: 'FC ' + ctx.name(m.a), away: 'FC ' + ctx.name(m.b), ga: m.ga, gb: m.gb,
          }));
        }
        return v;
      },
    };
  },
};
