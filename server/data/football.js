// Joueurs du Mercato (note approximative /100) et compositions célèbres.

const mercato = {
  GB: [
    ['Thibaut Courtois', 90], ['Gianluigi Donnarumma', 89], ['Alisson', 89], ['Jan Oblak', 88],
    ['Ederson', 87], ['Marc-André ter Stegen', 87], ['Mike Maignan', 87], ['Emiliano Martínez', 87],
    ['David Raya', 86], ['Gregor Kobel', 86], ['Manuel Neuer', 85], ['Diogo Costa', 85],
    ['Unai Simón', 85], ['Yann Sommer', 84], ['Guglielmo Vicario', 84], ['Yassine Bounou', 84],
    ['Giorgi Mamardashvili', 84], ['Jordan Pickford', 83], ['André Onana', 83], ['Lucas Chevalier', 82],
    ['Brice Samba', 82], ['Andriy Lunin', 82],
  ],
  DEF: [
    ['Virgil van Dijk', 89], ['William Saliba', 88], ['Rúben Dias', 88], ['Achraf Hakimi', 87],
    ['Antonio Rüdiger', 87], ['Alessandro Bastoni', 87], ['Gabriel Magalhães', 87], ['Trent Alexander-Arnold', 86],
    ['Marquinhos', 86], ['Joško Gvardiol', 86], ['Nuno Mendes', 86], ['Theo Hernández', 85],
    ['Jules Koundé', 85], ['Ibrahima Konaté', 85], ['Ronald Araújo', 85], ['Andrew Robertson', 85],
    ['Dani Carvajal', 85], ['Éder Militão', 85], ['Dayot Upamecano', 84], ['Alphonso Davies', 84],
    ['Willian Pacho', 84], ['Jeremie Frimpong', 84], ['Kyle Walker', 83],
  ],
  MIL: [
    ['Rodri', 91], ['Jude Bellingham', 90], ['Federico Valverde', 89], ['Pedri', 89],
    ['Florian Wirtz', 89], ['Kevin De Bruyne', 88], ['Vitinha', 88], ['Jamal Musiala', 88],
    ['Declan Rice', 87], ['Martin Ødegaard', 87], ['Bruno Fernandes', 87], ['Joshua Kimmich', 87],
    ['Nicolò Barella', 87], ['Cole Palmer', 87], ['Frenkie de Jong', 86], ['João Neves', 86],
    ['Alexis Mac Allister', 86], ['Aurélien Tchouaméni', 85], ['Luka Modrić', 85], ['Eduardo Camavinga', 84],
    ['N\'Golo Kanté', 82], ['Warren Zaïre-Emery', 82],
  ],
  ATT: [
    ['Kylian Mbappé', 92], ['Erling Haaland', 91], ['Mohamed Salah', 90], ['Vinícius Jr', 90],
    ['Harry Kane', 90], ['Ousmane Dembélé', 90], ['Lamine Yamal', 90], ['Raphinha', 88],
    ['Lautaro Martínez', 88], ['Bukayo Saka', 88], ['Khvicha Kvaratskhelia', 87], ['Robert Lewandowski', 87],
    ['Michael Olise', 87], ['Julián Álvarez', 87], ['Alexander Isak', 87], ['Victor Osimhen', 86],
    ['Viktor Gyökeres', 86], ['Lionel Messi', 86], ['Rafael Leão', 85], ['Antoine Griezmann', 85],
    ['Désiré Doué', 85], ['Marcus Thuram', 85], ['Son Heung-min', 84], ['Cristiano Ronaldo', 84],
    ['Rayan Cherki', 84], ['Bradley Barcola', 84],
  ],
};

// lines : du gardien vers l'attaque.
const lineups = [
  {
    title: 'France 1998', sub: 'Finale de la Coupe du monde, 3-0 contre le Brésil',
    lines: [['Barthez'], ['Thuram', 'Lebœuf', 'Desailly', 'Lizarazu'], ['Karembeu', 'Deschamps', 'Petit'], ['Zidane', 'Djorkaeff'], ['Guivarc\'h']],
  },
  {
    title: 'France 2018', sub: 'Finale de la Coupe du monde, 4-2 contre la Croatie',
    lines: [['Lloris'], ['Pavard', 'Varane', 'Umtiti', 'Lucas Hernandez'], ['Kanté', 'Pogba'], ['Mbappé', 'Griezmann', 'Matuidi'], ['Giroud']],
  },
  {
    title: 'Espagne 2010', sub: 'Finale de la Coupe du monde, 1-0 contre les Pays-Bas',
    lines: [['Casillas'], ['Sergio Ramos', 'Piqué', 'Puyol', 'Capdevila'], ['Busquets', 'Xabi Alonso'], ['Pedro', 'Xavi', 'Iniesta'], ['David Villa']],
  },
  {
    title: 'Allemagne 2014', sub: 'Finale de la Coupe du monde, 1-0 contre l\'Argentine',
    lines: [['Neuer'], ['Lahm', 'Boateng', 'Hummels', 'Höwedes'], ['Schweinsteiger', 'Kramer'], ['Müller', 'Kroos', 'Özil'], ['Klose']],
  },
  {
    title: 'Argentine 2022', sub: 'Finale de la Coupe du monde contre la France',
    lines: [['Emiliano Martínez'], ['Molina', 'Romero', 'Otamendi', 'Tagliafico'], ['De Paul', 'Enzo Fernández', 'Mac Allister'], ['Messi', 'Julián Álvarez', 'Di María']],
  },
  {
    title: 'FC Barcelone 2009', sub: 'Finale de la Ligue des champions, 2-0 contre Manchester United',
    lines: [['Valdés'], ['Puyol', 'Piqué', 'Yaya Touré', 'Sylvinho'], ['Xavi', 'Busquets', 'Iniesta'], ['Messi', 'Eto\'o', 'Henry']],
  },
  {
    title: 'FC Barcelone 2011', sub: 'Finale de la Ligue des champions, 3-1 contre Manchester United',
    lines: [['Valdés'], ['Dani Alves', 'Piqué', 'Mascherano', 'Abidal'], ['Xavi', 'Busquets', 'Iniesta'], ['Pedro', 'Messi', 'David Villa']],
  },
  {
    title: 'Real Madrid 2017', sub: 'Finale de la Ligue des champions, 4-1 contre la Juventus',
    lines: [['Keylor Navas'], ['Carvajal', 'Varane', 'Sergio Ramos', 'Marcelo'], ['Modrić', 'Casemiro', 'Kroos'], ['Isco', 'Benzema', 'Cristiano Ronaldo']],
  },
  {
    title: 'Liverpool 2019', sub: 'Finale de la Ligue des champions, 2-0 contre Tottenham',
    lines: [['Alisson'], ['Alexander-Arnold', 'Matip', 'Van Dijk', 'Robertson'], ['Henderson', 'Fabinho', 'Wijnaldum'], ['Salah', 'Firmino', 'Mané']],
  },
  {
    title: 'PSG 2025', sub: 'Finale de la Ligue des champions, 5-0 contre l\'Inter',
    lines: [['Donnarumma'], ['Hakimi', 'Marquinhos', 'Pacho', 'Nuno Mendes'], ['João Neves', 'Vitinha', 'Fabián Ruiz'], ['Doué', 'Dembélé', 'Kvaratskhelia']],
  },
  {
    title: 'OM 1993', sub: 'Finale de la Ligue des champions, 1-0 contre l\'AC Milan',
    lines: [['Barthez'], ['Angloma', 'Boli', 'Desailly', 'Di Meco'], ['Eydelie', 'Deschamps', 'Sauzée'], ['Abedi Pelé', 'Völler', 'Bokšić']],
  },
];

module.exports = { mercato, lineups };
