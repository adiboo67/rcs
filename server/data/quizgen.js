// Transforme les faits de quizfacts.js en questions à 4 choix.
// Les mauvaises réponses sont tirées parmi des réponses du même type (pays, clubs, joueurs, années).
const F = require('./quizfacts');

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const uniq = arr => [...new Set(arr)];

// `wrong` : réponses fausses possibles ; on retire toujours la bonne réponse et `exclude`.
function q(cat, question, answer, wrong, exclude) {
  const banned = new Set([answer, ...(exclude || [])].map(String));
  const pool = uniq(wrong.map(String)).filter(w => !banned.has(w));
  if (pool.length < 3) return null;
  return { cat, q: question, c: [String(answer), ...shuffle(pool).slice(0, 3)], a: 0 };
}

const out = [];
const add = x => { if (x) out.push(x); };

// ---------- Coupe du monde ----------
const wcCountries = uniq(F.worldCups.flatMap(([, host, w, r]) => [w, r, host]).filter(c => !c.includes(' et ')));
const wcHosts = uniq(F.worldCups.map(w => w[1]));
for (const [year, host, winner, runnerUp] of F.worldCups) {
  add(q('Coupe du monde', `Qui a remporté la Coupe du monde ${year} ?`, winner, wcCountries, [runnerUp]));
  add(q('Coupe du monde', `Quel pays a perdu la finale de la Coupe du monde ${year} ?`, runnerUp, wcCountries, [winner]));
  add(q('Coupe du monde', `Quel pays a organisé la Coupe du monde ${year} ?`, host, [...wcHosts, 'Portugal', 'Canada', 'Belgique'], []));
}
// Article et accord pour chaque pays champion du monde.
const WC_ART = {
  Uruguay: ["l'Uruguay", 'il'], Italie: ["l'Italie", 'elle'], Allemagne: ["l'Allemagne", 'elle'], Brésil: ['le Brésil', 'il'],
  Angleterre: ["l'Angleterre", 'elle'], Argentine: ["l'Argentine", 'elle'], France: ['la France', 'elle'], Espagne: ["l'Espagne", 'elle'],
};
for (const country of uniq(F.worldCups.map(w => w[2]))) {
  const [art, pron] = WC_ART[country];
  const years = F.worldCups.filter(w => w[2] === country).map(w => w[0]);
  const others = F.worldCups.filter(w => w[2] !== country).map(w => w[0]);
  add(q('Coupe du monde', `En quelle année ${art} a-t-${pron} gagné sa première Coupe du monde ?`, years[0], others));
  add(q('Coupe du monde', `Combien de Coupes du monde ${art} a-t-${pron} gagnées ?`, years.length, ['1', '2', '3', '4', '5', '6']));
}
const wcFinalScores = F.worldCupFinals.map(f => f[1]);
for (const [year, score] of F.worldCupFinals) {
  add(q('Coupe du monde', `Quel a été le résultat de la finale de la Coupe du monde ${year} ?`, score, wcFinalScores));
}
const wcScorers = F.worldCupTopScorers.map(s => s[1]).concat(['Lionel Messi', 'Thierry Henry', 'Cristiano Ronaldo', 'Antoine Griezmann']);
for (const [year, player] of F.worldCupTopScorers) {
  add(q('Coupe du monde', `Qui a été le meilleur buteur de la Coupe du monde ${year} ?`, player, wcScorers));
}

// ---------- Euro ----------
const euroCountries = uniq(F.euros.flatMap(([, , w, r]) => [w, r]));
const euroHosts = uniq(F.euros.map(e => e[1]).filter(Boolean));
for (const [year, host, winner, runnerUp] of F.euros) {
  add(q('Euro', `Qui a remporté l'Euro ${year} ?`, winner, euroCountries, [runnerUp]));
  add(q('Euro', `Quel pays a perdu la finale de l'Euro ${year} ?`, runnerUp, euroCountries, [winner]));
  if (host) add(q('Euro', `Quel pays a organisé l'Euro ${year} ?`, host, euroHosts));
}

// ---------- Ligue des champions ----------
const clClubs = uniq([...F.championsLeague.map(c => c[1]), ...F.championsLeagueRunnersUp.map(c => c[1]), 'Atlético Madrid', 'Arsenal', 'Tottenham']);
for (const [year, club] of F.championsLeague) {
  const label = year < 1993 ? 'la Coupe des clubs champions' : 'la Ligue des champions';
  const runnerUp = (F.championsLeagueRunnersUp.find(r => r[0] === year) || [])[1];
  add(q('Coupes d\'Europe', `Qui a remporté ${label} ${year} ?`, club, clClubs, runnerUp ? [runnerUp] : []));
}
for (const [year, club] of F.championsLeagueRunnersUp) {
  const winner = F.championsLeague.find(c => c[0] === year)[1];
  add(q('Coupes d\'Europe', `Quel club a perdu la finale de la Ligue des champions ${year} (contre ${winner}) ?`, club, clClubs, [winner]));
}

// ---------- Ballon d'Or ----------
const bdNames = uniq(F.ballonDor.map(b => b[1]));
for (const [year, player] of F.ballonDor) {
  add(q('Ballon d\'Or', `Qui a gagné le Ballon d'Or ${year} ?`, player, bdNames));
}
for (const player of bdNames) {
  const n = F.ballonDor.filter(b => b[1] === player).length;
  if (n >= 2) add(q('Ballon d\'Or', `Combien de Ballons d'Or ${player} a-t-il gagnés ?`, n, ['1', '2', '3', '4', '5', '6', '7', '8', '9'].filter(x => x !== String(n))));
}

// ---------- Championnats ----------
const leagues = [
  ['Ligue 1', 'champion de France', F.ligue1, F.ligue1Pool],
  ['Premier League', 'champion d\'Angleterre', F.premierLeague, F.premierLeaguePool],
  ['Liga', 'champion d\'Espagne', F.liga, F.ligaPool],
  ['Serie A', 'champion d\'Italie', F.serieA, F.serieAPool],
  ['Bundesliga', 'champion d\'Allemagne', F.bundesliga, F.bundesligaPool],
];
for (const [cat, title, seasons, extra] of leagues) {
  const pool = uniq([...seasons.map(s => s[1]), ...extra]);
  for (const [season, club] of seasons) add(q(cat, `Quel club a été ${title} en ${season} ?`, club, pool));
}

// ---------- Coupes nationales et continentales ----------
const cdfPool = uniq([...F.coupeDeFrance.map(c => c[1]), 'Olympique de Marseille', 'AS Monaco', 'RC Lens', 'Montpellier HSC']);
for (const [year, club] of F.coupeDeFrance) add(q('Coupe de France', `Qui a remporté la Coupe de France ${year} ?`, club, cdfPool));
const canAll = uniq([...F.can.map(c => c[1]), ...F.canPool]);
for (const [year, country] of F.can) {
  const label = year === 2023 ? 'la CAN 2023 (jouée début 2024)' : year === 2021 ? 'la CAN 2021 (jouée début 2022)' : `la CAN ${year}`;
  add(q('Afrique', `Qui a remporté ${label} ?`, country, canAll));
}
const copaAll = uniq([...F.copaAmerica.map(c => c[1]), ...F.copaPool]);
for (const [year, country] of F.copaAmerica) add(q('Amérique du Sud', `Qui a remporté la Copa América ${year} ?`, country, copaAll));

// ---------- Joueurs, clubs, stades, surnoms ----------
const countries = uniq(F.nationalities.map(n => n[1]));
for (const [player, country] of F.nationalities) add(q('Joueurs', `De quel pays est ${player} ?`, country, countries));
const clubCountryPool = uniq(F.clubCountries.map(c => c[1]).concat(['France', 'Espagne', 'Angleterre', 'Allemagne']));
for (const [club, country] of F.clubCountries) add(q('Clubs du monde', `Dans quel pays joue le club ${club} ?`, country, clubCountryPool));
const cities = uniq(F.clubCities.map(c => c[1]));
for (const [club, city] of F.clubCities) add(q('Clubs', `Dans quelle ville joue ${club} ?`, city, cities));
const stadiumClubs = uniq(F.stadiums.map(s => s[1]));
for (const [stadium, club] of F.stadiums) add(q('Stades', `Quel club joue à domicile dans ce stade : ${stadium} ?`, club, stadiumClubs));
const nickTargets = uniq(F.nicknames.map(n => n[1]));
for (const [nick, target] of F.nicknames) add(q('Surnoms', `Qui surnomme-t-on « ${nick} » ?`, target, nickTargets));

module.exports = out;
