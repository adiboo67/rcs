# Le Grand Tournoi du Train — RCS Alsace

Application web de jeux multijoueurs en temps réel pour le voyage en train de l'équipe.
Aucune installation sur les téléphones : un lien (ou un QR code) suffit, sur Android comme sur iPhone.

## Les 11 jeux

| Jeu | Joueurs | Principe |
|---|---|---|
| ❓ Quiz foot | 1+ | 79 questions, plus on répond vite, plus on marque |
| 🃏 Tournoi Uno | 2+ | Tables de 5, puis finale des gagnants de table |
| 💰 Mercato | 2+ | 100 M€ pour acheter 5 stars aux enchères secrètes, puis championnat simulé |
| 🫵 Qui dans l'équipe… ? | 3+ | Vote anonyme, point si on vote comme la majorité |
| 🐺 Loup-garou du vestiaire | 5+ | Loups, voyante, sorcière, chasseur. Débat à voix haute, vote sur le téléphone |
| 🕵️ Undercover | 3+ | Mot secret, indices, votes. Tables de 8 |
| ✍️ Petit bac foot | 2+ | Une lettre, 5 catégories, STOP, votes pour refuser les réponses bidon |
| 🤫 Anecdotes anonymes | 3+ | Chacun écrit une anecdote, l'organisateur relit, tout le monde devine l'auteur |
| 👻 Les compos fantômes | 1+ | 11 compositions célèbres, retrouver les 4 joueurs cachés |
| 🥅 Tirs au but éclair | 2+ | Duels à élimination directe, gauche / centre / droite |
| 🔮 Pronostics | 1+ | Pari sur le prochain match du RCS Alsace, points après le match |

Chaque jeu rapporte des points au **classement général** selon la place (30, 25, 21, 18…, minimum 5).
Un tableau **Joueurs contre Dirigeants** compare la moyenne de points de chaque camp.

## Lancer en local

```bash
npm install
npm start
```

Puis ouvrir http://localhost:3000.

Réglages (variables d'environnement) :

- `PORT` : port du serveur (3000 par défaut).
- `ADMIN_PIN` : code organisateur. **À changer** : par défaut `1234`.

Les scores et les pronostics sont sauvegardés dans `data/state.json` : un redémarrage du serveur ne les efface pas.

## Pendant le voyage

1. L'organisateur ouvre le lien, choisit son pseudo et entre le code organisateur.
2. Les autres ouvrent le même lien et choisissent pseudo + camp (Joueur ou Dirigeant).
3. Sur iPhone : Partager → « Sur l'écran d'accueil ». Sur Android : menu ⋮ → « Ajouter à l'écran d'accueil ».
4. L'organisateur lance un jeu dans l'onglet « 🛠️ Lancer » : il s'affiche chez tout le monde.
5. Boutons organisateur pendant un jeu : ⏭ Passer (étape suivante) et ⏹ Arrêter (sans points).

Coupure de réseau (tunnel) : le téléphone se reconnecte tout seul et retrouve sa partie.
Un joueur déconnecté ne bloque personne : son tour est passé automatiquement.

Planning conseillé pour 3 heures :

- Quiz foot : 30 min.
- Mercato : 20 min.
- Qui dans l'équipe… ? : 15 min.
- Tournoi Uno : 45 min.
- Undercover ou Petit bac : 20 min.
- Anecdotes anonymes : 15 min.
- Loup-garou : 25 min.
- Tirs au but éclair : 10 min.
- Pronostics : à la fin.

## Mettre en ligne gratuitement (Render)

1. Sur https://render.com, se connecter avec le compte GitHub.
2. New → Blueprint, choisir le dépôt `rcs` : Render lit `render.yaml`.
3. Saisir un code organisateur pour `ADMIN_PIN`, puis Apply.
4. Partager l'adresse `https://….onrender.com` à l'équipe.

Limites de l'offre gratuite :

- Le serveur s'endort après 15 min sans visite : ouvrir le lien 2 minutes avant le départ.
- Les scores et pronostics sont effacés à chaque redémarrage : saisir le résultat des pronostics le jour même.

Autre hébergeur : n'importe quel hébergement **Node.js** avec un seul processus (VPS, Hostinger Business/Cloud). Démarrage : `npm start`.

## Structure

- `server/index.js` : serveur, salle unique, classement, sauvegarde.
- `server/games/*.js` : logique de chaque jeu (le serveur décide de tout, les téléphones affichent).
- `server/data/*.js` : questions, mots, joueurs du mercato, compositions. Facile à enrichir.
- `public/` : l'interface mobile (HTML, CSS, JavaScript sans framework).
