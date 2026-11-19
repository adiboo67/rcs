// Serveur du "Centre de formation" — RCS Alsace.
// Plusieurs salons indépendants : chaque groupe a son code de salon, ses joueurs,
// son organisateur, son jeu en cours et son classement général.

const path = require('path');
const fs = require('fs');
const http = require('http');
const os = require('os');
const crypto = require('crypto');
const express = require('express');
const { Server } = require('socket.io');
const QRCode = require('qrcode');
const { clampInt } = require('./util');
const Videos = require('./videos');

const PORT = process.env.PORT || 3000;
const ADMIN_PIN = String(process.env.ADMIN_PIN || '1234');
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, '..', 'data', 'state.json');
const TIME_SCALE = Number(process.env.TIME_SCALE) || 1; // uniquement pour les tests automatiques
const DEFAULT_ROOM = 'RCS'; // salon historique, toujours disponible
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // sans 0/O ni 1/I/L, faciles à dicter

const GAMES = [
  'quiz', 'uno', 'mercato', 'quiest', 'loupgarou', 'undercover',
  'petitbac', 'anecdotes', 'compos', 'tirs', 'pronostics', 'chevaux',
].map(k => require('./games/' + k));
const GAME_BY_KEY = Object.fromEntries(GAMES.map(g => [g.key, g]));

// Points du classement général selon la place obtenue dans un jeu.
const RANK_POINTS = [30, 25, 21, 18, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6];
const MIN_POINTS = 5;

// ---------- État persistant ----------

function emptyRoom(code) {
  return { code, players: {}, history: [], lastResult: null, store: {}, videos: [], createdAt: Date.now() };
}

let data = { rooms: {} };
try {
  if (fs.existsSync(DATA_FILE)) {
    const raw = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    // Ancienne sauvegarde à salle unique : elle devient le salon par défaut.
    if (raw.rooms) data = raw;
    else if (raw.players) data.rooms[DEFAULT_ROOM] = Object.assign(emptyRoom(DEFAULT_ROOM), raw, { code: DEFAULT_ROOM });
  }
} catch (e) {
  console.error('Impossible de relire la sauvegarde :', e.message);
}
for (const s of Object.values(data.rooms)) {
  for (const p of Object.values(s.players)) p.connected = false;
  if (!Array.isArray(s.videos)) s.videos = [];
  if (!s.store) s.store = {};
}
if (!data.rooms[DEFAULT_ROOM]) data.rooms[DEFAULT_ROOM] = emptyRoom(DEFAULT_ROOM);

let saveTimer = null;
function save() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFile(DATA_FILE, JSON.stringify(data), err => err && console.error('Sauvegarde ratée :', err.message));
  }, 1000);
}

// ---------- Salons ----------

// Partie « vivante » d'un salon (non sauvegardée) : jeu en cours et diffusion.
const live = {}; // code -> { s, current, queued }

function room(code) {
  if (!code || !data.rooms[code]) return null;
  if (!live[code]) live[code] = { s: data.rooms[code], current: null, queued: false };
  return live[code];
}

function cleanCode(raw) {
  return String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
}

function newCode() {
  for (;;) {
    let c = '';
    for (let i = 0; i < 4; i++) c += CODE_CHARS[crypto.randomInt(CODE_CHARS.length)];
    if (!data.rooms[c]) return c;
  }
}

// ---------- Jeu en cours ----------

function makeCtx(R, key) {
  const timers = new Set();
  const ctx = {
    now: () => Date.now(),
    name: pid => (R.s.players[pid] ? R.s.players[pid].name : '?'),
    isConnected: pid => !!(R.s.players[pid] && R.s.players[pid].connected),
    connectedIds: ids => ids.filter(id => ctx.isConnected(id)),
    store: R.s.store,
    save,
    update: () => broadcast(R),
    after(ms, fn) {
      const t = setTimeout(() => {
        timers.delete(t);
        if (!R.current || R.current.ctx !== ctx) return;
        try { fn(); } catch (e) { console.error(`[${R.s.code}/${key}]`, e); }
        broadcast(R);
      }, ms * TIME_SCALE);
      timers.add(t);
      return t;
    },
    clear(t) {
      if (t) { clearTimeout(t); timers.delete(t); }
    },
    // ranking : [{ pid, score }] ; null = retour à l'accueil sans points.
    finish(ranking, extra) {
      if (!R.current || R.current.ctx !== ctx) return;
      endCurrent(R, ranking, extra);
    },
    _dispose() {
      for (const t of timers) clearTimeout(t);
      timers.clear();
    },
  };
  return ctx;
}

function startGame(R, key, options) {
  const def = GAME_BY_KEY[key];
  if (!def) return 'Jeu inconnu';
  const ids = Object.values(R.s.players).filter(p => p.connected).map(p => p.id);
  if (ids.length < (def.min || 1)) return `Il faut au moins ${def.min} joueurs connectés pour ce jeu.`;
  if (R.current) stopGame(R);
  const opts = {};
  for (const o of def.options || []) {
    opts[o.key] = o.type === 'number' ? clampInt(options && options[o.key], o.min, o.max, o.def) : (options && options[o.key]) || o.def;
  }
  const ctx = makeCtx(R, key);
  R.current = { key, def, ctx, ids, game: null };
  try {
    R.current.game = def.create(ctx, ids.slice(), opts);
  } catch (e) {
    console.error(e);
    ctx._dispose();
    R.current = null;
    return 'Erreur au lancement du jeu';
  }
  R.s.lastResult = null;
  broadcast(R);
  return null;
}

function stopGame(R) {
  if (!R.current) return;
  R.current.ctx._dispose();
  R.current = null;
  broadcast(R);
}

function endCurrent(R, ranking, extra) {
  const { def, ctx } = R.current;
  ctx._dispose();
  R.current = null;
  if (ranking && ranking.length) {
    const rows = awardByRanking(R, ranking);
    R.s.lastResult = { game: def.name, icon: def.icon, rows, extra: extra || null, at: Date.now() };
    R.s.history.push({ game: def.name, at: Date.now(), podium: rows.slice(0, 3).map(r => r.name) });
  } else {
    R.s.lastResult = null;
  }
  save();
  broadcast(R);
}

function awardByRanking(R, ranking) {
  const players = R.s.players;
  const sorted = ranking.filter(r => players[r.pid]).sort((a, b) => b.score - a.score);
  const rows = [];
  let rank = 0;
  sorted.forEach((r, i) => {
    if (i === 0 || r.score !== sorted[i - 1].score) rank = i;
    const pts = RANK_POINTS[rank] != null ? RANK_POINTS[rank] : MIN_POINTS;
    const p = players[r.pid];
    p.score += pts;
    rows.push({ pid: r.pid, name: p.name, place: rank + 1, score: r.score, pts });
  });
  return rows;
}

// ---------- Diffusion de l'état ----------

function socketsOf(R) {
  return [...server.io.of('/').sockets.values()].filter(s => s.data.room === R.s.code);
}

function broadcast(R) {
  if (!R || R.queued) return;
  R.queued = true;
  setImmediate(() => {
    R.queued = false;
    const common = commonView(R);
    for (const socket of socketsOf(R)) {
      const pid = socket.data.pid;
      if (pid && R.s.players[pid]) socket.emit('state', viewFor(R, pid, common));
    }
  });
}

const CATALOG = GAMES.map(g => ({ key: g.key, name: g.name, icon: g.icon, desc: g.desc, min: g.min || 1, options: g.options || [] }));

function commonView(R) {
  const s = R.s;
  const scoreboard = Object.values(s.players)
    .map(p => ({ id: p.id, name: p.name, score: p.score, connected: p.connected }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  return { room: s.code, scoreboard, catalog: CATALOG, history: s.history.slice(-12), lastResult: s.lastResult, videos: Videos.publicList(s.videos) };
}

function viewFor(R, pid, common) {
  const p = R.s.players[pid];
  const current = R.current;
  let game = null;
  if (current && current.game) {
    let view;
    try {
      view = current.game.view(pid, !!p.isHost);
    } catch (e) {
      console.error(`[${R.s.code}/${current.key}] view`, e);
      view = { spectator: true, msg: 'Erreur d\'affichage' };
    }
    game = { key: current.key, name: current.def.name, icon: current.def.icon, view };
  }
  return {
    now: Date.now(),
    me: { id: p.id, name: p.name, score: p.score, isHost: !!p.isHost },
    online: Object.values(R.s.players).filter(x => x.connected).length,
    game,
    ...common,
  };
}

// ---------- Serveur HTTP + sockets ----------

const app = express();
app.set('trust proxy', true); // Render / tunnel : garde le vrai https et le vrai domaine
app.use(express.static(path.join(__dirname, '..', 'public'), { maxAge: 0 }));
app.get('/health', (req, res) => res.json({
  ok: true,
  rooms: Object.keys(data.rooms).length,
  players: Object.values(data.rooms).reduce((n, s) => n + Object.keys(s.players).length, 0),
}));

// Lien à partager (+ QR code en SVG). En local, « localhost » est remplacé par l'IP du réseau
// pour que les téléphones branchés sur le même Wi-Fi puissent rejoindre.
function lanAddress() {
  for (const list of Object.values(os.networkInterfaces())) {
    for (const i of list || []) if (i.family === 'IPv4' && !i.internal) return i.address;
  }
  return null;
}
app.get('/api/share', async (req, res) => {
  let host = req.get('host') || `localhost:${PORT}`;
  const [hostname, port] = host.split(':');
  if (['localhost', '127.0.0.1', '[::1]'].includes(hostname)) {
    const ip = lanAddress();
    if (ip) host = ip + (port ? ':' + port : '');
  }
  const code = cleanCode(req.query.salle);
  const url = `${req.protocol}://${host}/${code && data.rooms[code] ? '?salle=' + code : ''}`;
  try {
    const svg = await QRCode.toString(url, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#00284f', light: '#ffffff' } });
    res.json({ url, svg });
  } catch (e) {
    res.status(500).json({ url, svg: null });
  }
});

const httpServer = http.createServer(app);
const server = { io: new Server(httpServer, { pingInterval: 20000, pingTimeout: 25000 }) };

function cleanName(raw) {
  const name = String(raw || '').replace(/\s+/g, ' ').trim().slice(0, 16);
  return name;
}

function uniqueName(R, name, exceptId) {
  const taken = new Set(Object.values(R.s.players).filter(p => p.id !== exceptId).map(p => p.name.toLowerCase()));
  if (!taken.has(name.toLowerCase())) return name;
  for (let i = 2; ; i++) {
    const n = `${name.slice(0, 13)} ${i}`;
    if (!taken.has(n.toLowerCase())) return n;
  }
}

function attach(socket, R, p) {
  socket.data.room = R.s.code;
  socket.data.pid = p.id;
  p.connected = true;
  socket.emit('welcome', { token: p.token, id: p.id, room: R.s.code });
  const current = R.current;
  if (current && current.game && current.game.addPlayer && !current.ids.includes(p.id)) {
    current.ids.push(p.id);
    try { current.game.addPlayer(p.id); } catch (e) { console.error(e); }
  }
  broadcast(R);
}

function refreshConnected(R, pid) {
  const p = R.s.players[pid];
  if (!p) return;
  p.connected = socketsOf(R).some(s => s.data.pid === pid);
}

function findByToken(token) {
  if (!token) return null;
  for (const s of Object.values(data.rooms)) {
    const p = Object.values(s.players).find(x => x.token === token);
    if (p) return { R: room(s.code), p };
  }
  return null;
}

server.io.on('connection', socket => {
  const mine = () => room(socket.data.room);
  Videos.attach({ socket, room: () => (mine() ? mine().s : null), save, broadcast: () => broadcast(mine()) });

  // room : salon demandé par le lien ouvert (?salle=…). Un autre salon que le sien = nouvelle inscription.
  socket.on('hello', ({ token, room: wanted } = {}) => {
    const found = findByToken(token);
    const code = cleanCode(wanted);
    if (found && (!code || code === found.R.s.code)) attach(socket, found.R, found.p);
    else socket.emit('need_join');
  });

  // room : code du salon à rejoindre ; create : true pour ouvrir un nouveau salon.
  socket.on('join', ({ name, pin, room: code, create } = {}) => {
    const clean = cleanName(name);
    if (clean.length < 2) return socket.emit('toast', 'Choisis un pseudo d\'au moins 2 lettres.');
    if (pin && String(pin) !== ADMIN_PIN) return socket.emit('toast', 'Code organisateur incorrect.');
    let R;
    if (create) {
      const c = newCode();
      data.rooms[c] = emptyRoom(c);
      R = room(c);
    } else {
      R = room(cleanCode(code) || DEFAULT_ROOM);
      if (!R) return socket.emit('toast', 'Salon introuvable : vérifie le code.');
    }
    const id = crypto.randomBytes(6).toString('hex');
    const p = {
      id,
      token: crypto.randomBytes(16).toString('hex'),
      name: uniqueName(R, clean),
      score: 0,
      isHost: !!pin || !!create, // celui qui ouvre un salon en est l'organisateur
      connected: true,
      joinedAt: Date.now(),
    };
    R.s.players[id] = p;
    save();
    attach(socket, R, p);
    if (create) socket.emit('toast', `Salon ${R.s.code} créé : partage ce code avec ton groupe.`);
  });

  socket.on('become_host', ({ pin } = {}) => {
    const R = mine();
    const p = R && R.s.players[socket.data.pid];
    if (!p) return;
    if (String(pin) !== ADMIN_PIN) return socket.emit('toast', 'Code organisateur incorrect.');
    p.isHost = true;
    save();
    socket.emit('toast', 'Tu es organisateur : onglet « Lancer un jeu » disponible.');
    broadcast(R);
  });

  socket.on('leave', () => {
    const R = mine();
    const pid = socket.data.pid;
    if (R && pid && R.s.players[pid]) {
      delete R.s.players[pid];
      save();
    }
    socket.data.pid = null;
    socket.data.room = null;
    socket.emit('need_join');
    broadcast(R);
  });

  socket.on('act', ({ action, data: payload } = {}) => {
    const R = mine();
    const pid = socket.data.pid;
    const current = R && R.current;
    if (!pid || !current || !current.game || !current.ids.includes(pid)) return;
    let res;
    try {
      res = current.game.onAction(pid, String(action), payload || {});
    } catch (e) {
      console.error(`[${R.s.code}/${current.key}] action`, e);
    }
    if (typeof res === 'string') socket.emit('toast', res);
    if (res !== false) broadcast(R);
  });

  socket.on('host', ({ action, data: payload } = {}) => {
    const R = mine();
    const p = R && R.s.players[socket.data.pid];
    if (!p || !p.isHost) return socket.emit('toast', 'Réservé à l\'organisateur.');
    payload = payload || {};
    let err = null;
    switch (action) {
      case 'start': err = startGame(R, payload.key, payload); break;
      case 'stop': stopGame(R); break;
      case 'resetScores':
        for (const x of Object.values(R.s.players)) x.score = 0;
        R.s.history = [];
        R.s.lastResult = null;
        save();
        break;
      case 'kick':
        if (payload.pid && R.s.players[payload.pid] && payload.pid !== p.id) {
          for (const s of socketsOf(R)) {
            if (s.data.pid === payload.pid) { s.data.pid = null; s.data.room = null; s.emit('need_join'); }
          }
          delete R.s.players[payload.pid];
          save();
        }
        break;
      case 'game':
        if (R.current && R.current.game && R.current.game.onHost) {
          try { err = R.current.game.onHost(String(payload.type), payload); } catch (e) { console.error(e); }
        }
        break;
      default: break;
    }
    if (typeof err === 'string') socket.emit('toast', err);
    broadcast(R);
  });

  socket.on('disconnect', () => {
    const R = mine();
    const pid = socket.data.pid;
    if (R && pid) {
      refreshConnected(R, pid);
      broadcast(R);
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`Centre de formation prêt sur http://localhost:${PORT} (code organisateur : ${ADMIN_PIN === '1234' ? '1234 par défaut, change-le avec ADMIN_PIN' : 'défini'})`);
});
