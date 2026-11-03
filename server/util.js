// Petits outils partagés par tous les jeux.

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Minuscules, sans accents, sans espaces ni ponctuation : "Lebœuf" -> "leboeuf".
function normalize(s) {
  return String(s || '')
    .replace(/œ/gi, 'oe').replace(/æ/gi, 'ae')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]/g, '');
}

function levenshtein(a, b) {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

// Accepte le nom complet, un morceau du nom (>= 4 lettres) ou une petite faute de frappe.
function nameMatches(guess, name) {
  const g = normalize(guess);
  if (g.length < 3) return false;
  const targets = [normalize(name)];
  for (const part of String(name).split(/[\s\-']+/)) {
    const p = normalize(part);
    if (p.length >= 4) targets.push(p);
  }
  return targets.some(t => t === g || (t.length >= 5 && levenshtein(t, g) <= 1));
}

// Répartit les joueurs en tables équilibrées d'au plus `max` personnes.
function splitTables(ids, max) {
  const list = shuffle(ids);
  const n = Math.max(1, Math.ceil(list.length / max));
  const tables = Array.from({ length: n }, () => []);
  list.forEach((id, i) => tables[i % n].push(id));
  return tables;
}

// Majorité relative ; égalité tranchée au hasard. Renvoie null s'il n'y a aucun vote.
function plurality(votes) {
  const count = {};
  for (const target of Object.values(votes)) {
    if (target != null) count[target] = (count[target] || 0) + 1;
  }
  const entries = Object.entries(count);
  if (!entries.length) return { winner: null, count, tie: false };
  const max = Math.max(...entries.map(e => e[1]));
  const top = entries.filter(e => e[1] === max).map(e => e[0]);
  return { winner: pick(top), count, tie: top.length > 1, top };
}

function clampInt(v, min, max, def) {
  const n = parseInt(v, 10);
  if (Number.isNaN(n)) return def;
  return Math.max(min, Math.min(max, n));
}

module.exports = { shuffle, pick, normalize, levenshtein, nameMatches, splitTables, plurality, clampInt };
