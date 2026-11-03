// Contenus courts : paires Undercover, questions "Qui dans l'équipe", catégories du Petit bac.

const undercover = [
  ['Messi', 'Ronaldo'], ['Mbappé', 'Neymar'], ['Penalty', 'Coup franc'], ['Gardien', 'Défenseur'],
  ['Carton jaune', 'Carton rouge'], ['Corner', 'Touche'], ['Vestiaire', 'Douche'], ['Crampons', 'Baskets'],
  ['Arbitre', 'Entraîneur'], ['Stade', 'Gymnase'], ['Ballon d\'Or', 'Coupe du monde'], ['PSG', 'OM'],
  ['Real Madrid', 'Barcelone'], ['Pizza', 'Burger'], ['Kebab', 'Tacos'], ['Train', 'Bus'],
  ['TikTok', 'Instagram'], ['Snapchat', 'WhatsApp'], ['PlayStation', 'Xbox'], ['Netflix', 'YouTube'],
  ['Plage', 'Piscine'], ['Chocolat', 'Bonbon'], ['Coca', 'Ice Tea'], ['Professeur', 'Directeur'],
  ['Chien', 'Chat'], ['Lion', 'Tigre'], ['Hiver', 'Neige'], ['Avion', 'Hélicoptère'],
  ['Football', 'Futsal'], ['Rugby', 'Football américain'], ['Basket', 'Handball'], ['Tennis', 'Ping-pong'],
  ['Strasbourg', 'Colmar'], ['Bretzel', 'Croissant'], ['Choucroute', 'Tarte flambée'], ['Hymne', 'Chant de supporters'],
  ['Capitaine', 'Vice-capitaine'], ['Échauffement', 'Étirements'], ['Mi-temps', 'Prolongation'], ['Hors-jeu', 'Faute'],
  ['Supporter', 'Ultra'], ['Maillot', 'Short'], ['Poteau', 'Barre transversale'], ['Gourde', 'Bouteille'],
  ['Sifflet', 'Drapeau'], ['Dribble', 'Petit pont'], ['Banc de touche', 'Tribune'], ['Ligue des champions', 'Ligue Europa'],
];

const quiEst = [
  'Qui arrive toujours en retard au rendez-vous ?',
  'Qui deviendra pro un jour ?',
  'Qui a la meilleure célébration de but ?',
  'Qui passe le plus de temps sur son téléphone ?',
  'Qui chante le plus fort dans le bus ?',
  'Qui oublie toujours une affaire (crampons, gourde, maillot…) ?',
  'Qui est le plus drôle du vestiaire ?',
  'Qui ferait le meilleur capitaine ?',
  'Qui a la coupe de cheveux la plus stylée ?',
  'Qui mange le plus ?',
  'Qui râle le plus contre l\'arbitre ?',
  'Qui fait le plus de gestes techniques inutiles ?',
  'Qui va s\'endormir en premier dans le train ?',
  'Qui serait le meilleur entraîneur plus tard ?',
  'Qui a la meilleure playlist ?',
  'Qui est le plus fort à EA FC ?',
  'Qui met le plus de temps sous la douche ?',
  'Qui ferait le meilleur streamer ?',
  'Qui garde toujours son calme ?',
  'Qui a la frappe la plus puissante ?',
  'Qui pourrait survivre seul sur une île déserte ?',
  'Qui est le plus motivé à l\'entraînement ?',
  'Qui ferait le meilleur arbitre ?',
  'Qui a le plus de chances de devenir célèbre ?',
  'Qui raconte les pires blagues ?',
  'Qui est le plus stylé en dehors du terrain ?',
  'Qui est le meilleur danseur ?',
  'Qui encourage le plus les autres ?',
  'Qui pourrait jouer à tous les postes ?',
  'Qui ferait le meilleur président du club ?',
  'Qui est le plus superstitieux avant un match ?',
  'Qui est le roi des excuses ?',
  'Qui serait le meilleur commentateur de match ?',
  'Qui a le plus gros appétit au goûter d\'après-match ?',
  'Qui ferait le meilleur prof de sport ?',
  'Qui gagnerait un concours de jongles ?',
];

const petitBac = {
  fixed: ['Joueur de foot', 'Club de foot'],
  pool: ['Pays', 'Ville', 'Prénom', 'Marque', 'Animal', 'Métier', 'Plat ou aliment', 'Chanteur ou rappeur',
    'Objet du sac de sport', 'Entraîneur ou sélectionneur', 'Film ou série', 'Sport (autre que le foot)'],
  letters: 'ABCDEFGHIJLMNOPRSTV'.split(''),
};

module.exports = { undercover, quiEst, petitBac };
