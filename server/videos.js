// Vidéos YouTube partagées par l'équipe (onglet « Mental »).
// On ne garde que l'identifiant, le titre et la chaîne : les miniatures et le lecteur
// viennent directement de YouTube côté téléphone.

const THEMES = ['dribble', 'but', 'def', 'gk', 'racing', 'mental'];
const MAX_VIDEOS = 60;
const ADD_COOLDOWN = 8000; // un partage toutes les 8 s par joueur
const ID_RE = /^[A-Za-z0-9_-]{11}$/;

// Accepte les liens watch, youtu.be, shorts, live, embed, m.youtube… ou un identifiant seul.
function parseId(raw) {
  const s = String(raw || '').trim().slice(0, 300);
  if (ID_RE.test(s)) return s;
  let u;
  try { u = new URL(/^https?:\/\//i.test(s) ? s : 'https://' + s); } catch (e) { return null; }
  const host = u.hostname.toLowerCase().replace(/^(www|m|music)\./, '');
  let id = null;
  if (host === 'youtu.be') id = u.pathname.split('/')[1];
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    const parts = u.pathname.split('/').filter(Boolean);
    if (parts[0] === 'watch') id = u.searchParams.get('v');
    else if (['shorts', 'live', 'embed', 'v'].includes(parts[0])) id = parts[1];
  }
  return id && ID_RE.test(id) ? id : null;
}

// oEmbed : titre + chaîne, sans clé d'API. 401 = intégration désactivée, 400/404 = privée ou supprimée.
async function lookup(id) {
  const url = 'https://www.youtube.com/oembed?format=json&url=' + encodeURIComponent('https://www.youtube.com/watch?v=' + id);
  let res;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(6000) });
  } catch (e) {
    return { error: 'YouTube ne répond pas, réessaie dans un instant.' };
  }
  if (res.status === 401 || res.status === 403) return { error: 'Cette vidéo ne peut pas être lue en dehors de YouTube.' };
  if (!res.ok) return { error: 'Vidéo introuvable : elle est peut-être privée ou supprimée.' };
  try {
    const j = await res.json();
    return { title: String(j.title || 'Vidéo').slice(0, 120), author: String(j.author_name || '').slice(0, 60) };
  } catch (e) {
    return { error: 'Réponse de YouTube illisible.' };
  }
}

function attach({ socket, state, save, broadcast }) {
  socket.on('video_add', async ({ url, theme } = {}) => {
    const p = state.players[socket.data.pid];
    if (!p) return;
    const id = parseId(url);
    if (!id) return socket.emit('toast', 'Lien YouTube non reconnu.');
    const list = state.videos;
    if (list.some(v => v.id === id)) return socket.emit('toast', 'Cette vidéo est déjà partagée.');
    const now = Date.now();
    if (p.lastVideoAt && now - p.lastVideoAt < ADD_COOLDOWN) return socket.emit('toast', 'Attends quelques secondes avant de partager une autre vidéo.');
    p.lastVideoAt = now;
    const info = await lookup(id);
    if (info.error) return socket.emit('toast', info.error);
    if (list.some(v => v.id === id)) return; // partagée par quelqu'un d'autre pendant la vérification
    list.unshift({
      id,
      title: info.title,
      author: info.author,
      theme: THEMES.includes(theme) ? theme : 'mental',
      by: p.name,
      byId: p.id,
      at: now,
    });
    list.length = Math.min(list.length, MAX_VIDEOS);
    save();
    socket.emit('toast', 'Vidéo partagée avec l\'équipe ✅');
    broadcast();
  });

  socket.on('video_del', ({ id } = {}) => {
    const p = state.players[socket.data.pid];
    if (!p) return;
    const i = state.videos.findIndex(v => v.id === id);
    if (i < 0) return;
    if (!p.isHost && state.videos[i].byId !== p.id) return socket.emit('toast', 'Seul l\'auteur ou l\'organisateur peut la retirer.');
    state.videos.splice(i, 1);
    save();
    broadcast();
  });
}

function publicList(videos) {
  return videos.map(({ id, title, author, theme, by, byId, at }) => ({ id, title, author, theme, by, byId, at }));
}

module.exports = { attach, parseId, publicList, THEMES };
