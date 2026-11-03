const { shuffle, plurality, pick } = require('../util');

const T = { roles: 15000, night: 40000, witch: 20000, dawn: 9000, hunter: 20000, day: 120000, verdict: 9000, end: 15000 };

const ROLES = {
  loup: { name: 'Loup-garou', team: 'loups', emoji: '🐺', help: 'Chaque nuit, mets-toi d\'accord avec les autres loups pour éliminer un villageois. Le jour, fais-toi passer pour un innocent.' },
  voyante: { name: 'Voyante', team: 'village', emoji: '🔮', help: 'Chaque nuit, découvre le rôle d\'un joueur. Aide le village sans te faire repérer.' },
  sorciere: { name: 'Sorcière', team: 'village', emoji: '🧪', help: 'Tu as une potion pour sauver la victime des loups et une potion pour éliminer quelqu\'un. Une seule fois chacune.' },
  chasseur: { name: 'Chasseur', team: 'village', emoji: '🎯', help: 'Si tu es éliminé, tu emportes un joueur de ton choix avec toi.' },
  villageois: { name: 'Villageois', team: 'village', emoji: '🧑‍🌾', help: 'Trouve les loups pendant le débat et vote contre eux.' },
};

function wolfCount(n) {
  if (n <= 7) return 1;
  if (n <= 11) return 2;
  if (n <= 17) return 3;
  return 4;
}

module.exports = {
  key: 'loupgarou',
  name: 'Loup-garou du vestiaire',
  icon: '🐺',
  desc: 'Jeu de bluff : les loups se cachent parmi vous. Débattez à voix haute dans le train, votez sur le téléphone.',
  min: 5,
  options: [],

  create(ctx, ids) {
    const deck = [];
    for (let i = 0; i < wolfCount(ids.length); i++) deck.push('loup');
    deck.push('voyante');
    if (ids.length >= 6) deck.push('sorciere');
    if (ids.length >= 8) deck.push('chasseur');
    while (deck.length < ids.length) deck.push('villageois');

    const s = {
      phase: 'roles', day: 0, roles: {}, alive: new Set(ids), deadline: 0,
      wolfVotes: {}, seerDone: false, seerLog: [], victim: null,
      potions: { heal: true, kill: true }, witchSave: false, witchKill: null, witchDone: false,
      dayVotes: {}, events: [], lastNews: [], hunter: null, afterHunter: null, winner: null,
    };
    shuffle(deck).forEach((role, i) => { s.roles[ids[i]] = role; });
    let timer = null;

    const alive = () => [...s.alive];
    const aliveWith = role => alive().filter(id => s.roles[id] === role);

    function setPhase(phase, ms, then) {
      ctx.clear(timer);
      s.phase = phase;
      s.deadline = ctx.now() + ms;
      timer = ctx.after(ms, then);
    }

    function night() {
      s.day++;
      s.wolfVotes = {};
      s.seerDone = aliveWith('voyante').length === 0;
      s.victim = null;
      s.witchSave = false;
      s.witchKill = null;
      setPhase('night', T.night, endNight);
    }

    function maybeEndNight() {
      const wolvesDone = aliveWith('loup').every(id => s.wolfVotes[id]);
      if (wolvesDone && s.seerDone) endNight();
    }

    function endNight() {
      if (s.phase !== 'night') return;
      const res = plurality(s.wolfVotes);
      s.victim = res.winner || pick(alive().filter(id => s.roles[id] !== 'loup'));
      const witch = aliveWith('sorciere')[0];
      if (witch && (s.potions.heal || s.potions.kill)) {
        s.witchDone = false;
        setPhase('witch', T.witch, resolveNight);
      } else {
        resolveNight();
      }
    }

    function resolveNight() {
      const deaths = [];
      if (s.victim && !s.witchSave) deaths.push(s.victim);
      if (s.witchKill && s.alive.has(s.witchKill) && !deaths.includes(s.witchKill)) deaths.push(s.witchKill);
      s.lastNews = deaths.length
        ? deaths.map(id => `${ctx.name(id)} a été retrouvé éliminé ce matin. C'était : ${ROLES[s.roles[id]].emoji} ${ROLES[s.roles[id]].name}.`)
        : ['Miracle : personne n\'a été éliminé cette nuit !'];
      kill(deaths, `Nuit ${s.day}`);
      setPhase('dawn', T.dawn, () => afterDeaths(deaths, day));
    }

    function kill(list, when) {
      for (const id of list) {
        s.alive.delete(id);
        s.events.push(`${when} : ${ctx.name(id)} (${ROLES[s.roles[id]].name})`);
      }
    }

    // Gère le chasseur puis vérifie la victoire avant de continuer.
    function afterDeaths(deaths, then) {
      const hunter = deaths.find(id => s.roles[id] === 'chasseur');
      if (hunter && !s.hunterUsed) {
        s.hunterUsed = true;
        s.hunter = hunter;
        s.afterHunter = then;
        setPhase('hunter', T.hunter, () => hunterShoot(null));
        return;
      }
      if (!checkWin()) then();
    }

    function hunterShoot(target) {
      if (s.phase !== 'hunter') return;
      const t = target && s.alive.has(target) ? target : null;
      if (t) {
        kill([t], 'Tir du chasseur');
        s.lastNews = [`🎯 Le chasseur ${ctx.name(s.hunter)} emporte ${ctx.name(t)} avec lui. C'était : ${ROLES[s.roles[t]].emoji} ${ROLES[s.roles[t]].name}.`];
      } else {
        s.lastNews = [`Le chasseur ${ctx.name(s.hunter)} n'a tiré sur personne.`];
      }
      const then = s.afterHunter;
      s.hunter = null;
      setPhase('dawn', T.dawn, () => { if (!checkWin()) then(); });
    }

    function day() {
      s.dayVotes = {};
      setPhase('day', T.day, endDay);
    }

    function endDay() {
      if (s.phase !== 'day') return;
      const res = plurality(s.dayVotes);
      let deaths = [];
      if (!res.winner || res.tie) {
        s.lastNews = ['Égalité ou aucun vote : personne n\'est éliminé aujourd\'hui.'];
      } else {
        deaths = [res.winner];
        s.lastNews = [`Le village élimine ${ctx.name(res.winner)} (${res.count[res.winner]} votes). C'était : ${ROLES[s.roles[res.winner]].emoji} ${ROLES[s.roles[res.winner]].name}.`];
        kill(deaths, `Jour ${s.day}`);
      }
      setPhase('verdict', T.verdict, () => afterDeaths(deaths, night));
    }

    function checkWin() {
      const wolves = aliveWith('loup').length;
      const others = s.alive.size - wolves;
      if (wolves === 0) s.winner = 'village';
      else if (wolves >= others) s.winner = 'loups';
      if (!s.winner) return false;
      setPhase('end', T.end, () => {
        ctx.finish(ids.map(pid => ({
          pid,
          score: ROLES[s.roles[pid]].team === s.winner ? 2 + (s.alive.has(pid) ? 1 : 0) : 0,
        })), { text: s.winner === 'village' ? 'Victoire du village 🧑‍🌾' : 'Victoire des loups 🐺' });
      });
      return true;
    }

    setPhase('roles', T.roles, night);

    return {
      onAction(pid, act, data) {
        const role = s.roles[pid];
        const isAlive = s.alive.has(pid);
        const target = data.target;
        if (act === 'ready' && s.phase === 'roles') {
          s.ready = s.ready || new Set();
          s.ready.add(pid);
          if (ctx.connectedIds(ids).every(id => s.ready.has(id))) night();
          return;
        }
        if (!isAlive) return false;
        if (s.phase === 'night' && role === 'loup' && act === 'wolf') {
          if (!s.alive.has(target) || s.roles[target] === 'loup') return false;
          s.wolfVotes[pid] = target;
          maybeEndNight();
          return;
        }
        if (s.phase === 'night' && role === 'voyante' && act === 'seer' && !s.seerDone) {
          if (!s.alive.has(target) || target === pid) return false;
          s.seerLog.push({ night: s.day, name: ctx.name(target), role: ROLES[s.roles[target]].name, emoji: ROLES[s.roles[target]].emoji });
          s.seerDone = true;
          maybeEndNight();
          return;
        }
        if (s.phase === 'witch' && role === 'sorciere' && act === 'witch' && !s.witchDone) {
          if (data.save && s.potions.heal) { s.witchSave = true; s.potions.heal = false; }
          if (data.kill && s.potions.kill && s.alive.has(data.kill) && data.kill !== pid) {
            s.witchKill = data.kill;
            s.potions.kill = false;
          }
          s.witchDone = true;
          resolveNight();
          return;
        }
        if (s.phase === 'hunter' && pid === s.hunter && act === 'shoot') return hunterShoot(target);
        if (s.phase === 'day' && act === 'vote') {
          if (!s.alive.has(target) || target === pid) return false;
          s.dayVotes[pid] = target;
          const waiting = ctx.connectedIds(alive()).filter(id => !s.dayVotes[id]);
          if (!waiting.length) endDay();
        }
      },
      onHost(type) {
        if (type === 'skip') {
          if (s.phase === 'day') endDay();
          else if (s.phase === 'night') endNight();
        }
      },
      view(pid) {
        if (!(pid in s.roles)) return { spectator: true, msg: 'Partie de loup-garou en cours. Tu joueras à la prochaine !' };
        const role = s.roles[pid];
        const isAlive = s.alive.has(pid);
        const dead = !isAlive || s.phase === 'end';
        const players = ids.map(id => ({
          id, name: ctx.name(id), alive: s.alive.has(id), me: id === pid,
          role: (!s.alive.has(id) || dead || (role === 'loup' && s.roles[id] === 'loup')) ? ROLES[s.roles[id]].name : null,
          emoji: (!s.alive.has(id) || dead || (role === 'loup' && s.roles[id] === 'loup')) ? ROLES[s.roles[id]].emoji : null,
          votes: s.phase === 'day' ? Object.values(s.dayVotes).filter(t => t === id).length : 0,
        }));
        const v = {
          phase: s.phase, day: s.day, deadline: s.deadline, isAlive, players,
          me: { role: ROLES[role].name, emoji: ROLES[role].emoji, help: ROLES[role].help, key: role },
          news: s.lastNews, events: s.events,
          winner: s.winner, myVote: s.dayVotes[pid] || null,
          voted: Object.keys(s.dayVotes).length, aliveCount: s.alive.size,
          ready: !!(s.ready && s.ready.has(pid)),
        };
        if (role === 'loup') {
          v.wolfVotes = Object.entries(s.wolfVotes).map(([w, t]) => ({ wolf: ctx.name(w), target: ctx.name(t) }));
          v.myWolfVote = s.wolfVotes[pid] || null;
        }
        if (role === 'voyante') {
          v.seerLog = s.seerLog;
          v.seerDone = s.seerDone;
        }
        if (role === 'sorciere') {
          v.potions = s.potions;
          if (s.phase === 'witch') v.victim = s.victim ? ctx.name(s.victim) : null;
        }
        if (s.phase === 'hunter') {
          v.hunterName = ctx.name(s.hunter);
          v.amHunter = pid === s.hunter;
        }
        if (s.phase === 'end') {
          v.allRoles = ids.map(id => ({ name: ctx.name(id), role: ROLES[s.roles[id]].name, emoji: ROLES[s.roles[id]].emoji, alive: s.alive.has(id) }));
        }
        return v;
      },
    };
  },
};
