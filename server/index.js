// Serveur du "Grand Tournoi du Train" — RCS Alsace.
// Une seule salle : tout le monde rejoint, l'organisateur lance les jeux,
// les points de chaque jeu s'ajoutent au classement général.

const path = require('path');
const fs = require('fs');
const http = require('http');
const crypto = require('crypto');
const express = require('express');
const { Server } = require('socket.io');
const { clampInt } = require('./util');

const PORT = process.env.PORT || 3000;
const ADMIN_PIN = String(process.env.ADMIN_PIN || '1234');
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, '..', 'data', 'state.json');
const TIME_SCALE = Number(process.env.TIME_SCALE) || 1; // uniquement pour les tests automatiques

const GAMES = [
  'quiz', 'uno', 'mercato', 'quiest', 'loupgarou', 'undercover',
  'petitbac', 'anecdotes', 'compos', 'tirs', 'pronostics',
].map(k => require('./games/' + k));
const GAME_BY_KEY = Object.fromEntries(GAMES.map(g => [g.key, g]));

// Points du classement général selon la place obtenue dans un jeu.
const RANK_POINTS = [30, 25, 21, 18, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6];
const MIN_POINTS = 5;

// ---------- État persistant ----------

let state = { players: {}, history: [], lastResult: null, store: {} };
try {
  if (fs.existsSync(DATA_FILE)) {
    state = Object.assign(state, JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')));
    for (const p of Object.values(state.players)) p.connected = false;
  }
} catch (e) {
  console.error('Impossible de relire la sauvegarde :', e.message);
}

let saveTimer = null;
function save() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFile(DATA_FILE, JSON.stringify(state), err => err && console.error('Sauvegarde ratée :', err.message));
  }, 1000);
}

// ---------- Jeu en cours ----------

let current = null; // { key, def, game, ctx, ids }

function makeCtx(key) {
  const timers = new Set();
  const ctx = {
    now: () => Date.now(),
    name: pid => (state.players[pid] ? state.players[pid].name : '?'),
    isConnected: pid => !!(state.players[pid] && state.players[pid].connected),
    connectedIds: ids => ids.filter(id => ctx.isConnected(id)),
    store: state.store,
    save,
    update: broadcast,
    after(ms, fn) {
      const t = setTimeout(() => {
        timers.delete(t);
        if (!current || current.ctx !== ctx) return;
        try { fn(); } catch (e) { console.error(`[${key}]`, e); }
        broadcast();
      }, ms * TIME_SCALE);
      timers.add(t);
      return t;
    },
    clear(t) {
      if (t) { clearTimeout(t); timers.delete(t); }
    },
    // ranking : [{ pid, score }] ; null = retour à l'accueil sans points.
    finish(ranking, extra) {
      if (!current || current.ctx !== ctx) return;
      endCurrent(ranking, extra);
    },
    _dispose() {
      for (const t of timers) clearTimeout(t);
      timers.clear();
    },
  };
  return ctx;
}

function startGame(key, options) {
  const def = GAME_BY_KEY[key];
  if (!def) return 'Jeu inconnu';
  const ids = Object.values(state.players).filter(p => p.connected).map(p => p.id);
  if (ids.length < (def.min || 1)) return `Il faut au moins ${def.min} joueurs connectés pour ce jeu.`;
  if (current) stopGame();
  const opts = {};
  for (const o of def.options || []) {
    opts[o.key] = o.type === 'number' ? clampInt(options && options[o.key], o.min, o.max, o.def) : (options && options[o.key]) || o.def;
  }
  const ctx = makeCtx(key);
  current = { key, def, ctx, ids, game: null };
  try {
    current.game = def.create(ctx, ids.slice(), opts);
  } catch (e) {
    console.error(e);
    ctx._dispose();
    current = null;
    return 'Erreur au lancement du jeu';
  }
  state.lastResult = null;
  broadcast();
  return null;
}

function stopGame() {
  if (!current) return;
  current.ctx._dispose();
  current = null;
  broadcast();
}

function endCurrent(ranking, extra) {
  const { def, ctx } = current;
  ctx._dispose();
  current = null;
  if (ranking && ranking.length) {
    const rows = awardByRanking(ranking);
    state.lastResult = { game: def.name, icon: def.icon, rows, extra: extra || null, at: Date.now() };
    state.history.push({ game: def.name, at: Date.now(), podium: rows.slice(0, 3).map(r => r.name) });
  } else {
    state.lastResult = null;
  }
  save();
  broadcast();
}

function awardByRanking(ranking) {
  const sorted = ranking.filter(r => state.players[r.pid]).sort((a, b) => b.score - a.score);
  const rows = [];
  let rank = 0;
  sorted.forEach((r, i) => {
    if (i === 0 || r.score !== sorted[i - 1].score) rank = i;
    const pts = RANK_POINTS[rank] != null ? RANK_POINTS[rank] : MIN_POINTS;
    const p = state.players[r.pid];
    p.score += pts;
    rows.push({ pid: r.pid, name: p.name, place: rank + 1, score: r.score, pts });
  });
  return rows;
}

// ---------- Diffusion de l'état ----------

let broadcastQueued = false;
function broadcast() {
  if (broadcastQueued) return;
  broadcastQueued = true;
  setImmediate(() => {
    broadcastQueued = false;
    const common = commonView();
    for (const socket of server.io.of('/').sockets.values()) {
      const pid = socket.data.pid;
      if (pid && state.players[pid]) socket.emit('state', viewFor(pid, common));
    }
  });
}

function commonView() {
  const players = Object.values(state.players);
  const scoreboard = players
    .map(p => ({ id: p.id, name: p.name, score: p.score, connected: p.connected }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  const catalog = GAMES.map(g => ({ key: g.key, name: g.name, icon: g.icon, desc: g.desc, min: g.min || 1, options: g.options || [] }));
  return { scoreboard, catalog, history: state.history.slice(-12), lastResult: state.lastResult };
}

function viewFor(pid, common) {
  const p = state.players[pid];
  let game = null;
  if (current && current.game) {
    let view;
    try {
      view = current.game.view(pid, !!p.isHost);
    } catch (e) {
      console.error(`[${current.key}] view`, e);
      view = { spectator: true, msg: 'Erreur d\'affichage' };
    }
    game = { key: current.key, name: current.def.name, icon: current.def.icon, view };
  }
  return {
    now: Date.now(),
    me: { id: p.id, name: p.name, score: p.score, isHost: !!p.isHost },
    online: Object.values(state.players).filter(x => x.connected).length,
    game,
    ...common,
  };
}

// ---------- Serveur HTTP + sockets ----------

const app = express();
app.use(express.static(path.join(__dirname, '..', 'public'), { maxAge: 0 }));
app.get('/health', (req, res) => res.json({ ok: true, players: Object.keys(state.players).length }));

const httpServer = http.createServer(app);
const server = { io: new Server(httpServer, { pingInterval: 20000, pingTimeout: 25000 }) };

function cleanName(raw) {
  const name = String(raw || '').replace(/\s+/g, ' ').trim().slice(0, 16);
  return name;
}

function uniqueName(name, exceptId) {
  const taken = new Set(Object.values(state.players).filter(p => p.id !== exceptId).map(p => p.name.toLowerCase()));
  if (!taken.has(name.toLowerCase())) return name;
  for (let i = 2; ; i++) {
    const n = `${name.slice(0, 13)} ${i}`;
    if (!taken.has(n.toLowerCase())) return n;
  }
}

function attach(socket, p) {
  socket.data.pid = p.id;
  p.connected = true;
  socket.emit('welcome', { token: p.token, id: p.id });
  if (current && current.game && current.game.addPlayer && !current.ids.includes(p.id)) {
    current.ids.push(p.id);
    try { current.game.addPlayer(p.id); } catch (e) { console.error(e); }
  }
  broadcast();
}

function refreshConnected(pid) {
  const p = state.players[pid];
  if (!p) return;
  p.connected = [...server.io.of('/').sockets.values()].some(s => s.data.pid === pid);
}

server.io.on('connection', socket => {
  socket.on('hello', ({ token } = {}) => {
    const p = token && Object.values(state.players).find(x => x.token === token);
    if (p) attach(socket, p);
    else socket.emit('need_join');
  });

  socket.on('join', ({ name, pin } = {}) => {
    const clean = cleanName(name);
    if (clean.length < 2) return socket.emit('toast', 'Choisis un pseudo d\'au moins 2 lettres.');
    if (pin && String(pin) !== ADMIN_PIN) return socket.emit('toast', 'Code organisateur incorrect.');
    const id = crypto.randomBytes(6).toString('hex');
    const p = {
      id,
      token: crypto.randomBytes(16).toString('hex'),
      name: uniqueName(clean),
      score: 0,
      isHost: !!pin,
      connected: true,
      joinedAt: Date.now(),
    };
    state.players[id] = p;
    save();
    attach(socket, p);
  });

  socket.on('become_host', ({ pin } = {}) => {
    const p = state.players[socket.data.pid];
    if (!p) return;
    if (String(pin) !== ADMIN_PIN) return socket.emit('toast', 'Code organisateur incorrect.');
    p.isHost = true;
    save();
    socket.emit('toast', 'Tu es organisateur : onglet « Lancer » disponible.');
    broadcast();
  });

  socket.on('leave', () => {
    const pid = socket.data.pid;
    if (pid && state.players[pid]) {
      delete state.players[pid];
      save();
    }
    socket.data.pid = null;
    socket.emit('need_join');
    broadcast();
  });

  socket.on('act', ({ action, data } = {}) => {
    const pid = socket.data.pid;
    if (!pid || !current || !current.game || !current.ids.includes(pid)) return;
    let res;
    try {
      res = current.game.onAction(pid, String(action), data || {});
    } catch (e) {
      console.error(`[${current && current.key}] action`, e);
    }
    if (typeof res === 'string') socket.emit('toast', res);
    if (res !== false) broadcast();
  });

  socket.on('host', ({ action, data } = {}) => {
    const p = state.players[socket.data.pid];
    if (!p || !p.isHost) return socket.emit('toast', 'Réservé à l\'organisateur.');
    data = data || {};
    let err = null;
    switch (action) {
      case 'start': err = startGame(data.key, data); break;
      case 'stop': stopGame(); break;
      case 'resetScores':
        for (const x of Object.values(state.players)) x.score = 0;
        state.history = [];
        state.lastResult = null;
        save();
        break;
      case 'kick':
        if (data.pid && state.players[data.pid] && data.pid !== p.id) {
          for (const s of server.io.of('/').sockets.values()) {
            if (s.data.pid === data.pid) { s.data.pid = null; s.emit('need_join'); }
          }
          delete state.players[data.pid];
          save();
        }
        break;
      case 'game':
        if (current && current.game && current.game.onHost) {
          try { err = current.game.onHost(String(data.type), data); } catch (e) { console.error(e); }
        }
        break;
      default: break;
    }
    if (typeof err === 'string') socket.emit('toast', err);
    broadcast();
  });

  socket.on('disconnect', () => {
    const pid = socket.data.pid;
    if (pid) {
      refreshConnected(pid);
      broadcast();
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`Tournoi du Train prêt sur http://localhost:${PORT} (code organisateur : ${ADMIN_PIN === '1234' ? '1234 par défaut, change-le avec ADMIN_PIN' : 'défini'})`);
});
