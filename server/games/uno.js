const { shuffle, splitTables } = require('../util');

const COLORS = ['r', 'y', 'g', 'b'];
const TURN_MS = 25000;
const AWAY_TURN_MS = 6000; // joueur déconnecté (tunnel) : on ne bloque pas la table
const HAND = 7;

function newDeck() {
  const d = [];
  let id = 0;
  for (const c of COLORS) {
    d.push({ id: id++, c, v: '0' });
    for (const v of ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'skip', 'rev', '+2']) {
      d.push({ id: id++, c, v });
      d.push({ id: id++, c, v });
    }
  }
  for (let i = 0; i < 4; i++) {
    d.push({ id: id++, c: 'w', v: 'wild' });
    d.push({ id: id++, c: 'w', v: '+4' });
  }
  return shuffle(d);
}

function cardPoints(card) {
  if (card.c === 'w') return 50;
  if (/^\d$/.test(card.v)) return Number(card.v);
  return 20;
}

function canPlay(card, top, color) {
  return card.c === 'w' || card.c === color || card.v === top.v;
}

module.exports = {
  key: 'uno',
  name: 'Tournoi Uno',
  icon: '🃏',
  desc: 'Uno classique par tables de 4 à 6. Les gagnants de chaque table peuvent jouer une finale.',
  min: 2,
  options: [{ key: 'size', label: 'Joueurs max par table', type: 'number', def: 5, min: 2, max: 8 }],

  create(ctx, ids, opts) {
    const s = {
      phase: 'play', // play | results
      round: 1,
      isFinale: false,
      tables: [],
      totals: {}, // score cumulé sur les manches
      waiting: [], // arrivés en cours de manche
    };
    ids.forEach(id => { s.totals[id] = 0; });

    function makeTable(players, no) {
      const t = {
        no, ids: shuffle(players), hands: {}, draw: newDeck(), discard: [], color: null,
        dir: 1, turn: 0, drawn: null, deadline: 0, timer: null, winner: null, log: 'La partie commence !',
      };
      for (const pid of t.ids) t.hands[pid] = t.draw.splice(0, HAND);
      // Première carte : un chiffre, pour démarrer simplement.
      let i = t.draw.findIndex(c => /^\d$/.test(c.v));
      t.discard.push(t.draw.splice(i, 1)[0]);
      t.color = t.discard[0].c;
      startTurn(t);
      return t;
    }

    function startRound(players, finale) {
      s.tables.forEach(t => ctx.clear(t.timer));
      s.phase = 'play';
      s.isFinale = !!finale;
      s.waiting = [];
      const groups = splitTables(players, opts.size);
      s.tables = groups.map((g, i) => makeTable(g, i + 1));
    }

    function current(t) { return t.ids[t.turn]; }
    function nextIndex(t, steps = 1) {
      const n = t.ids.length;
      return (((t.turn + t.dir * steps) % n) + n) % n;
    }

    function drawCards(t, pid, n) {
      const got = [];
      for (let i = 0; i < n; i++) {
        if (!t.draw.length) {
          const top = t.discard.pop();
          t.draw = shuffle(t.discard.map(c => (c.c === 'w' ? { ...c } : c)));
          t.discard = [top];
        }
        if (!t.draw.length) break;
        const card = t.draw.pop();
        t.hands[pid].push(card);
        got.push(card);
      }
      return got;
    }

    function startTurn(t) {
      ctx.clear(t.timer);
      t.drawn = null;
      const pid = current(t);
      const ms = ctx.isConnected(pid) ? TURN_MS : AWAY_TURN_MS;
      t.deadline = ctx.now() + ms;
      t.timer = ctx.after(ms, () => timeout(t));
    }

    function advance(t, steps = 1) {
      t.turn = nextIndex(t, steps);
      startTurn(t);
    }

    function timeout(t) {
      if (t.winner) return;
      const pid = current(t);
      if (!t.drawn) {
        drawCards(t, pid, 1);
        t.log = `${ctx.name(pid)} a trop attendu : pioche et passe.`;
      } else {
        t.log = `${ctx.name(pid)} passe son tour.`;
      }
      advance(t);
    }

    function finishTable(t, pid) {
      ctx.clear(t.timer);
      t.winner = pid;
      t.log = `🏆 ${ctx.name(pid)} gagne la table ${t.no} !`;
      t.results = t.ids.map(id => {
        const pts = t.hands[id].reduce((sum, c) => sum + cardPoints(c), 0);
        return { pid: id, name: ctx.name(id), cards: t.hands[id].length, pts, score: id === pid ? 1000 : 500 - pts };
      }).sort((a, b) => b.score - a.score);
      for (const r of t.results) s.totals[r.pid] = (s.totals[r.pid] || 0) + r.score;
      if (s.tables.every(x => x.winner)) s.phase = 'results';
    }

    function play(t, pid, data) {
      const hand = t.hands[pid];
      const idx = hand.findIndex(c => c.id === Number(data.card));
      if (idx < 0) return 'Carte introuvable.';
      const card = hand[idx];
      const top = t.discard[t.discard.length - 1];
      if (t.drawn != null && card.id !== t.drawn) return 'Tu ne peux jouer que la carte que tu viens de piocher.';
      if (!canPlay(card, top, t.color)) return 'Cette carte ne peut pas être jouée.';
      if (card.c === 'w' && !COLORS.includes(data.color)) return 'Choisis une couleur.';

      hand.splice(idx, 1);
      t.discard.push(card);
      t.color = card.c === 'w' ? data.color : card.c;
      const name = ctx.name(pid);
      t.log = `${name} joue ${label(card)}${card.c === 'w' ? ' → ' + colorName(t.color) : ''}.`;

      if (hand.length === 0) return finishTable(t, pid);
      if (hand.length === 1) {
        if (data.uno) t.log += ' UNO !';
        else {
          drawCards(t, pid, 2);
          t.log += ` Oubli du UNO : +2 pour ${name} !`;
        }
      }

      const two = t.ids.length === 2;
      if (card.v === 'skip') return advance(t, 2);
      if (card.v === 'rev') {
        if (two) return advance(t, 2);
        t.dir *= -1;
        return advance(t, 1);
      }
      if (card.v === '+2' || card.v === '+4') {
        const victim = t.ids[nextIndex(t, 1)];
        drawCards(t, victim, card.v === '+2' ? 2 : 4);
        t.log += ` ${ctx.name(victim)} pioche ${card.v === '+2' ? 2 : 4} et passe son tour.`;
        return advance(t, 2);
      }
      advance(t, 1);
    }

    function label(card) {
      const names = { skip: 'Passe', rev: 'Inversion', '+2': '+2', wild: 'Joker', '+4': '+4' };
      return (names[card.v] || card.v) + (card.c !== 'w' ? ' ' + colorName(card.c) : '');
    }
    function colorName(c) {
      return { r: 'rouge', y: 'jaune', g: 'vert', b: 'bleu' }[c] || '';
    }

    function tableOf(pid) { return s.tables.find(t => t.ids.includes(pid)); }

    function finalRanking() {
      return Object.entries(s.totals).map(([pid, score]) => ({ pid, score }));
    }

    startRound(ids);

    return {
      addPlayer(pid) {
        if (!(pid in s.totals)) s.totals[pid] = 0;
        if (!s.waiting.includes(pid)) s.waiting.push(pid);
      },
      onAction(pid, act, data) {
        const t = tableOf(pid);
        if (!t || t.winner) return false;
        if (current(t) !== pid) return 'Ce n\'est pas ton tour.';
        if (act === 'play') return play(t, pid, data);
        if (act === 'draw') {
          if (t.drawn != null) return 'Tu as déjà pioché.';
          const [card] = drawCards(t, pid, 1);
          const top = t.discard[t.discard.length - 1];
          if (card && canPlay(card, top, t.color)) {
            t.drawn = card.id;
            t.log = `${ctx.name(pid)} pioche une carte jouable…`;
          } else {
            t.log = `${ctx.name(pid)} pioche et passe.`;
            advance(t);
          }
          return;
        }
        if (act === 'pass') {
          if (t.drawn == null) return 'Pioche d\'abord.';
          t.log = `${ctx.name(pid)} passe.`;
          advance(t);
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
          s.round++;
          const everyone = Object.keys(s.totals).filter(id => ctx.isConnected(id));
          if (everyone.length < 2) return 'Pas assez de joueurs connectés.';
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
        const top = t.discard[t.discard.length - 1];
        const myTurn = !t.winner && current(t) === pid;
        const hand = t.hands[pid].slice().sort((a, b) => (a.c + a.v).localeCompare(b.c + b.v)).map(c => ({
          ...c, ok: myTurn && (t.drawn == null ? canPlay(c, top, t.color) : c.id === t.drawn),
        }));
        const order = [];
        for (let k = 0; k < t.ids.length; k++) {
          const id = t.ids[k];
          order.push({ name: ctx.name(id), count: t.hands[id].length, turn: !t.winner && k === t.turn, me: id === pid, away: !ctx.isConnected(id) });
        }
        return {
          ...base, table: t.no, top, color: t.color, dir: t.dir, hand, myTurn, drawn: t.drawn,
          deadline: t.deadline, log: t.log, order, winner: t.winner ? ctx.name(t.winner) : null,
          tableResults: t.results || null,
        };
      },
    };
  },
};
