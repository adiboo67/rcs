// Faits foot servant à générer des questions de quiz (voir quizgen.js).
// "Allemagne" désigne aussi la RFA, comme dans les palmarès officiels de la FIFA.

// [année, pays organisateur, vainqueur, finaliste]
const worldCups = [
  [1930, 'Uruguay', 'Uruguay', 'Argentine'],
  [1934, 'Italie', 'Italie', 'Tchécoslovaquie'],
  [1938, 'France', 'Italie', 'Hongrie'],
  [1950, 'Brésil', 'Uruguay', 'Brésil'],
  [1954, 'Suisse', 'Allemagne', 'Hongrie'],
  [1958, 'Suède', 'Brésil', 'Suède'],
  [1962, 'Chili', 'Brésil', 'Tchécoslovaquie'],
  [1966, 'Angleterre', 'Angleterre', 'Allemagne'],
  [1970, 'Mexique', 'Brésil', 'Italie'],
  [1974, 'Allemagne', 'Allemagne', 'Pays-Bas'],
  [1978, 'Argentine', 'Argentine', 'Pays-Bas'],
  [1982, 'Espagne', 'Italie', 'Allemagne'],
  [1986, 'Mexique', 'Argentine', 'Allemagne'],
  [1990, 'Italie', 'Allemagne', 'Argentine'],
  [1994, 'États-Unis', 'Brésil', 'Italie'],
  [1998, 'France', 'France', 'Brésil'],
  [2002, 'Corée du Sud et Japon', 'Brésil', 'Allemagne'],
  [2006, 'Allemagne', 'Italie', 'France'],
  [2010, 'Afrique du Sud', 'Espagne', 'Pays-Bas'],
  [2014, 'Brésil', 'Allemagne', 'Argentine'],
  [2018, 'Russie', 'France', 'Croatie'],
  [2022, 'Qatar', 'Argentine', 'France'],
];

// [année, score de la finale]
const worldCupFinals = [
  [1998, 'France 3-0 Brésil'], [2002, 'Brésil 2-0 Allemagne'], [2006, '1-1, Italie gagne aux tirs au but'],
  [2010, 'Espagne 1-0 Pays-Bas (prolongation)'], [2014, 'Allemagne 1-0 Argentine (prolongation)'],
  [2018, 'France 4-2 Croatie'], [2022, '3-3, Argentine gagne aux tirs au but'],
];

// [année, meilleur buteur]
const worldCupTopScorers = [
  [1998, 'Davor Šuker'], [2002, 'Ronaldo'], [2006, 'Miroslav Klose'], [2010, 'Thomas Müller'],
  [2014, 'James Rodríguez'], [2018, 'Harry Kane'], [2022, 'Kylian Mbappé'],
];

// [année, organisateur (null si plusieurs pays non listés), vainqueur, finaliste]
const euros = [
  [1960, 'France', 'URSS', 'Yougoslavie'],
  [1964, 'Espagne', 'Espagne', 'URSS'],
  [1968, 'Italie', 'Italie', 'Yougoslavie'],
  [1972, 'Belgique', 'Allemagne', 'URSS'],
  [1976, 'Yougoslavie', 'Tchécoslovaquie', 'Allemagne'],
  [1980, 'Italie', 'Allemagne', 'Belgique'],
  [1984, 'France', 'France', 'Espagne'],
  [1988, 'Allemagne', 'Pays-Bas', 'URSS'],
  [1992, 'Suède', 'Danemark', 'Allemagne'],
  [1996, 'Angleterre', 'Allemagne', 'République tchèque'],
  [2000, 'Belgique et Pays-Bas', 'France', 'Italie'],
  [2004, 'Portugal', 'Grèce', 'Portugal'],
  [2008, 'Autriche et Suisse', 'Espagne', 'Allemagne'],
  [2012, 'Pologne et Ukraine', 'Espagne', 'Italie'],
  [2016, 'France', 'Portugal', 'France'],
  [2020, null, 'Italie', 'Angleterre'],
  [2024, 'Allemagne', 'Espagne', 'Angleterre'],
];

// Coupe des clubs champions / Ligue des champions : [année de la finale, vainqueur]
const championsLeague = [
  [1956, 'Real Madrid'], [1957, 'Real Madrid'], [1958, 'Real Madrid'], [1959, 'Real Madrid'], [1960, 'Real Madrid'],
  [1961, 'Benfica'], [1962, 'Benfica'], [1963, 'AC Milan'], [1964, 'Inter Milan'], [1965, 'Inter Milan'],
  [1966, 'Real Madrid'], [1967, 'Celtic Glasgow'], [1968, 'Manchester United'], [1969, 'AC Milan'], [1970, 'Feyenoord'],
  [1971, 'Ajax Amsterdam'], [1972, 'Ajax Amsterdam'], [1973, 'Ajax Amsterdam'], [1974, 'Bayern Munich'], [1975, 'Bayern Munich'],
  [1976, 'Bayern Munich'], [1977, 'Liverpool'], [1978, 'Liverpool'], [1979, 'Nottingham Forest'], [1980, 'Nottingham Forest'],
  [1981, 'Liverpool'], [1982, 'Aston Villa'], [1983, 'Hambourg SV'], [1984, 'Liverpool'], [1985, 'Juventus'],
  [1986, 'Steaua Bucarest'], [1987, 'FC Porto'], [1988, 'PSV Eindhoven'], [1989, 'AC Milan'], [1990, 'AC Milan'],
  [1991, 'Étoile rouge de Belgrade'], [1992, 'FC Barcelone'], [1993, 'Olympique de Marseille'], [1994, 'AC Milan'], [1995, 'Ajax Amsterdam'],
  [1996, 'Juventus'], [1997, 'Borussia Dortmund'], [1998, 'Real Madrid'], [1999, 'Manchester United'], [2000, 'Real Madrid'],
  [2001, 'Bayern Munich'], [2002, 'Real Madrid'], [2003, 'AC Milan'], [2004, 'FC Porto'], [2005, 'Liverpool'],
  [2006, 'FC Barcelone'], [2007, 'AC Milan'], [2008, 'Manchester United'], [2009, 'FC Barcelone'], [2010, 'Inter Milan'],
  [2011, 'FC Barcelone'], [2012, 'Chelsea'], [2013, 'Bayern Munich'], [2014, 'Real Madrid'], [2015, 'FC Barcelone'],
  [2016, 'Real Madrid'], [2017, 'Real Madrid'], [2018, 'Real Madrid'], [2019, 'Liverpool'], [2020, 'Bayern Munich'],
  [2021, 'Chelsea'], [2022, 'Real Madrid'], [2023, 'Manchester City'], [2024, 'Real Madrid'], [2025, 'Paris Saint-Germain'],
];

// Finalistes perdants de la Ligue des champions : [année, finaliste]
const championsLeagueRunnersUp = [
  [1993, 'AC Milan'], [1994, 'FC Barcelone'], [1995, 'AC Milan'], [1996, 'Ajax Amsterdam'], [1997, 'Juventus'],
  [1998, 'Juventus'], [1999, 'Bayern Munich'], [2000, 'Valence'], [2001, 'Valence'], [2002, 'Bayer Leverkusen'],
  [2003, 'Juventus'], [2004, 'AS Monaco'], [2005, 'AC Milan'], [2006, 'Arsenal'], [2007, 'Liverpool'],
  [2008, 'Chelsea'], [2009, 'Manchester United'], [2010, 'Bayern Munich'], [2011, 'Manchester United'], [2012, 'Bayern Munich'],
  [2013, 'Borussia Dortmund'], [2014, 'Atlético Madrid'], [2015, 'Juventus'], [2016, 'Atlético Madrid'], [2017, 'Juventus'],
  [2018, 'Liverpool'], [2019, 'Tottenham'], [2020, 'Paris Saint-Germain'], [2021, 'Manchester City'], [2022, 'Liverpool'],
  [2023, 'Inter Milan'], [2024, 'Borussia Dortmund'], [2025, 'Inter Milan'],
];

// Ballon d'Or : [année, lauréat] (pas de Ballon d'Or en 2020)
const ballonDor = [
  [1956, 'Stanley Matthews'], [1957, 'Alfredo Di Stéfano'], [1958, 'Raymond Kopa'], [1959, 'Alfredo Di Stéfano'],
  [1960, 'Luis Suárez (Espagne)'], [1961, 'Omar Sívori'], [1962, 'Josef Masopust'], [1963, 'Lev Yachine'],
  [1964, 'Denis Law'], [1965, 'Eusébio'], [1966, 'Bobby Charlton'], [1967, 'Flórián Albert'],
  [1968, 'George Best'], [1969, 'Gianni Rivera'], [1970, 'Gerd Müller'], [1971, 'Johan Cruyff'],
  [1972, 'Franz Beckenbauer'], [1973, 'Johan Cruyff'], [1974, 'Johan Cruyff'], [1975, 'Oleg Blokhine'],
  [1976, 'Franz Beckenbauer'], [1977, 'Allan Simonsen'], [1978, 'Kevin Keegan'], [1979, 'Kevin Keegan'],
  [1980, 'Karl-Heinz Rummenigge'], [1981, 'Karl-Heinz Rummenigge'], [1982, 'Paolo Rossi'], [1983, 'Michel Platini'],
  [1984, 'Michel Platini'], [1985, 'Michel Platini'], [1986, 'Igor Belanov'], [1987, 'Ruud Gullit'],
  [1988, 'Marco van Basten'], [1989, 'Marco van Basten'], [1990, 'Lothar Matthäus'], [1991, 'Jean-Pierre Papin'],
  [1992, 'Marco van Basten'], [1993, 'Roberto Baggio'], [1994, 'Hristo Stoitchkov'], [1995, 'George Weah'],
  [1996, 'Matthias Sammer'], [1997, 'Ronaldo'], [1998, 'Zinédine Zidane'], [1999, 'Rivaldo'],
  [2000, 'Luís Figo'], [2001, 'Michael Owen'], [2002, 'Ronaldo'], [2003, 'Pavel Nedvěd'],
  [2004, 'Andriy Shevchenko'], [2005, 'Ronaldinho'], [2006, 'Fabio Cannavaro'], [2007, 'Kaká'],
  [2008, 'Cristiano Ronaldo'], [2009, 'Lionel Messi'], [2010, 'Lionel Messi'], [2011, 'Lionel Messi'],
  [2012, 'Lionel Messi'], [2013, 'Cristiano Ronaldo'], [2014, 'Cristiano Ronaldo'], [2015, 'Lionel Messi'],
  [2016, 'Cristiano Ronaldo'], [2017, 'Cristiano Ronaldo'], [2018, 'Luka Modrić'], [2019, 'Lionel Messi'],
  [2021, 'Lionel Messi'], [2022, 'Karim Benzema'], [2023, 'Lionel Messi'], [2024, 'Rodri'], [2025, 'Ousmane Dembélé'],
];

// Champions nationaux : [saison, club]
const ligue1 = [
  ['1993-1994', 'Paris Saint-Germain'], ['1994-1995', 'FC Nantes'], ['1995-1996', 'AJ Auxerre'], ['1996-1997', 'AS Monaco'],
  ['1997-1998', 'RC Lens'], ['1998-1999', 'Girondins de Bordeaux'], ['1999-2000', 'AS Monaco'], ['2000-2001', 'FC Nantes'],
  ['2001-2002', 'Olympique lyonnais'], ['2002-2003', 'Olympique lyonnais'], ['2003-2004', 'Olympique lyonnais'], ['2004-2005', 'Olympique lyonnais'],
  ['2005-2006', 'Olympique lyonnais'], ['2006-2007', 'Olympique lyonnais'], ['2007-2008', 'Olympique lyonnais'], ['2008-2009', 'Girondins de Bordeaux'],
  ['2009-2010', 'Olympique de Marseille'], ['2010-2011', 'LOSC Lille'], ['2011-2012', 'Montpellier HSC'], ['2012-2013', 'Paris Saint-Germain'],
  ['2013-2014', 'Paris Saint-Germain'], ['2014-2015', 'Paris Saint-Germain'], ['2015-2016', 'Paris Saint-Germain'], ['2016-2017', 'AS Monaco'],
  ['2017-2018', 'Paris Saint-Germain'], ['2018-2019', 'Paris Saint-Germain'], ['2019-2020', 'Paris Saint-Germain'], ['2020-2021', 'LOSC Lille'],
  ['2021-2022', 'Paris Saint-Germain'], ['2022-2023', 'Paris Saint-Germain'], ['2023-2024', 'Paris Saint-Germain'], ['2024-2025', 'Paris Saint-Germain'],
];
const ligue1Pool = ['Olympique de Marseille', 'Stade Rennais', 'AS Saint-Étienne', 'OGC Nice', 'RC Strasbourg', 'Toulouse FC', 'Stade de Reims', 'FC Metz'];

const premierLeague = [
  ['1992-1993', 'Manchester United'], ['1993-1994', 'Manchester United'], ['1994-1995', 'Blackburn Rovers'], ['1995-1996', 'Manchester United'],
  ['1996-1997', 'Manchester United'], ['1997-1998', 'Arsenal'], ['1998-1999', 'Manchester United'], ['1999-2000', 'Manchester United'],
  ['2000-2001', 'Manchester United'], ['2001-2002', 'Arsenal'], ['2002-2003', 'Manchester United'], ['2003-2004', 'Arsenal'],
  ['2004-2005', 'Chelsea'], ['2005-2006', 'Chelsea'], ['2006-2007', 'Manchester United'], ['2007-2008', 'Manchester United'],
  ['2008-2009', 'Manchester United'], ['2009-2010', 'Chelsea'], ['2010-2011', 'Manchester United'], ['2011-2012', 'Manchester City'],
  ['2012-2013', 'Manchester United'], ['2013-2014', 'Manchester City'], ['2014-2015', 'Chelsea'], ['2015-2016', 'Leicester City'],
  ['2016-2017', 'Chelsea'], ['2017-2018', 'Manchester City'], ['2018-2019', 'Manchester City'], ['2019-2020', 'Liverpool'],
  ['2020-2021', 'Manchester City'], ['2021-2022', 'Manchester City'], ['2022-2023', 'Manchester City'], ['2023-2024', 'Manchester City'],
  ['2024-2025', 'Liverpool'],
];
const premierLeaguePool = ['Tottenham', 'Newcastle', 'Aston Villa', 'Everton'];

const liga = [
  ['2004-2005', 'FC Barcelone'], ['2005-2006', 'FC Barcelone'], ['2006-2007', 'Real Madrid'], ['2007-2008', 'Real Madrid'],
  ['2008-2009', 'FC Barcelone'], ['2009-2010', 'FC Barcelone'], ['2010-2011', 'FC Barcelone'], ['2011-2012', 'Real Madrid'],
  ['2012-2013', 'FC Barcelone'], ['2013-2014', 'Atlético Madrid'], ['2014-2015', 'FC Barcelone'], ['2015-2016', 'FC Barcelone'],
  ['2016-2017', 'Real Madrid'], ['2017-2018', 'FC Barcelone'], ['2018-2019', 'FC Barcelone'], ['2019-2020', 'Real Madrid'],
  ['2020-2021', 'Atlético Madrid'], ['2021-2022', 'Real Madrid'], ['2022-2023', 'FC Barcelone'], ['2023-2024', 'Real Madrid'],
  ['2024-2025', 'FC Barcelone'],
];
const ligaPool = ['Séville FC', 'Valence', 'Athletic Bilbao', 'Real Sociedad', 'Villarreal'];

const serieA = [
  ['2006-2007', 'Inter Milan'], ['2007-2008', 'Inter Milan'], ['2008-2009', 'Inter Milan'], ['2009-2010', 'Inter Milan'],
  ['2010-2011', 'AC Milan'], ['2011-2012', 'Juventus'], ['2012-2013', 'Juventus'], ['2013-2014', 'Juventus'],
  ['2014-2015', 'Juventus'], ['2015-2016', 'Juventus'], ['2016-2017', 'Juventus'], ['2017-2018', 'Juventus'],
  ['2018-2019', 'Juventus'], ['2019-2020', 'Juventus'], ['2020-2021', 'Inter Milan'], ['2021-2022', 'AC Milan'],
  ['2022-2023', 'Naples'], ['2023-2024', 'Inter Milan'], ['2024-2025', 'Naples'],
];
const serieAPool = ['AS Rome', 'Lazio Rome', 'Atalanta Bergame', 'Fiorentina'];

const bundesliga = [
  ['2006-2007', 'VfB Stuttgart'], ['2007-2008', 'Bayern Munich'], ['2008-2009', 'VfL Wolfsburg'], ['2009-2010', 'Bayern Munich'],
  ['2010-2011', 'Borussia Dortmund'], ['2011-2012', 'Borussia Dortmund'], ['2012-2013', 'Bayern Munich'], ['2013-2014', 'Bayern Munich'],
  ['2014-2015', 'Bayern Munich'], ['2015-2016', 'Bayern Munich'], ['2016-2017', 'Bayern Munich'], ['2017-2018', 'Bayern Munich'],
  ['2018-2019', 'Bayern Munich'], ['2019-2020', 'Bayern Munich'], ['2020-2021', 'Bayern Munich'], ['2021-2022', 'Bayern Munich'],
  ['2022-2023', 'Bayern Munich'], ['2023-2024', 'Bayer Leverkusen'], ['2024-2025', 'Bayern Munich'],
];
const bundesligaPool = ['RB Leipzig', 'Schalke 04', 'Eintracht Francfort', 'Werder Brême'];

// Coupe de France : [année, vainqueur]
const coupeDeFrance = [
  [1999, 'FC Nantes'], [2000, 'FC Nantes'], [2001, 'RC Strasbourg'], [2002, 'FC Lorient'], [2003, 'AJ Auxerre'],
  [2004, 'Paris Saint-Germain'], [2005, 'AJ Auxerre'], [2006, 'Paris Saint-Germain'], [2007, 'FC Sochaux'], [2008, 'Olympique lyonnais'],
  [2009, 'EA Guingamp'], [2010, 'Paris Saint-Germain'], [2011, 'LOSC Lille'], [2012, 'Olympique lyonnais'], [2013, 'Girondins de Bordeaux'],
  [2014, 'EA Guingamp'], [2015, 'Paris Saint-Germain'], [2016, 'Paris Saint-Germain'], [2017, 'Paris Saint-Germain'], [2018, 'Paris Saint-Germain'],
  [2019, 'Stade Rennais'], [2020, 'Paris Saint-Germain'], [2021, 'Paris Saint-Germain'], [2022, 'FC Nantes'], [2023, 'Toulouse FC'],
  [2024, 'Paris Saint-Germain'], [2025, 'Paris Saint-Germain'],
];

// [année, vainqueur]
const can = [
  [2006, 'Égypte'], [2008, 'Égypte'], [2010, 'Égypte'], [2012, 'Zambie'], [2013, 'Nigeria'],
  [2015, 'Côte d\'Ivoire'], [2017, 'Cameroun'], [2019, 'Algérie'], [2021, 'Sénégal'], [2023, 'Côte d\'Ivoire'],
];
const canPool = ['Maroc', 'Ghana', 'Tunisie', 'Mali', 'Afrique du Sud', 'Burkina Faso'];

const copaAmerica = [
  [2004, 'Brésil'], [2007, 'Brésil'], [2011, 'Uruguay'], [2015, 'Chili'], [2016, 'Chili'],
  [2019, 'Brésil'], [2021, 'Argentine'], [2024, 'Argentine'],
];
const copaPool = ['Colombie', 'Paraguay', 'Pérou', 'Mexique'];

// [joueur, pays]
const nationalities = [
  ['Zinédine Zidane', 'France'], ['Michel Platini', 'France'], ['Thierry Henry', 'France'], ['Kylian Mbappé', 'France'],
  ['Antoine Griezmann', 'France'], ['N\'Golo Kanté', 'France'], ['Karim Benzema', 'France'], ['Paul Pogba', 'France'],
  ['Olivier Giroud', 'France'], ['Hugo Lloris', 'France'], ['Jean-Pierre Papin', 'France'], ['Raymond Kopa', 'France'],
  ['Éric Cantona', 'France'], ['Franck Ribéry', 'France'], ['Ousmane Dembélé', 'France'], ['William Saliba', 'France'],
  ['Aurélien Tchouaméni', 'France'], ['Eduardo Camavinga', 'France'], ['Mike Maignan', 'France'], ['Lilian Thuram', 'France'],
  ['Pelé', 'Brésil'], ['Ronaldinho', 'Brésil'], ['Kaká', 'Brésil'], ['Neymar', 'Brésil'], ['Romário', 'Brésil'],
  ['Rivaldo', 'Brésil'], ['Cafu', 'Brésil'], ['Roberto Carlos', 'Brésil'], ['Vinícius Jr', 'Brésil'], ['Rodrygo', 'Brésil'],
  ['Casemiro', 'Brésil'], ['Marquinhos', 'Brésil'], ['Thiago Silva', 'Brésil'], ['Alisson', 'Brésil'], ['Ederson', 'Brésil'],
  ['Zico', 'Brésil'], ['Sócrates', 'Brésil'], ['Garrincha', 'Brésil'], ['Raphinha', 'Brésil'],
  ['Lionel Messi', 'Argentine'], ['Diego Maradona', 'Argentine'], ['Alfredo Di Stéfano', 'Argentine'], ['Gabriel Batistuta', 'Argentine'],
  ['Juan Román Riquelme', 'Argentine'], ['Sergio Agüero', 'Argentine'], ['Ángel Di María', 'Argentine'], ['Carlos Tevez', 'Argentine'],
  ['Javier Mascherano', 'Argentine'], ['Lautaro Martínez', 'Argentine'], ['Julián Álvarez', 'Argentine'], ['Emiliano Martínez', 'Argentine'],
  ['Enzo Fernández', 'Argentine'], ['Alexis Mac Allister', 'Argentine'], ['Gonzalo Higuaín', 'Argentine'], ['Javier Zanetti', 'Argentine'],
  ['Mario Kempes', 'Argentine'],
  ['Cristiano Ronaldo', 'Portugal'], ['Luís Figo', 'Portugal'], ['Eusébio', 'Portugal'], ['Bruno Fernandes', 'Portugal'],
  ['Bernardo Silva', 'Portugal'], ['Rúben Dias', 'Portugal'], ['Rafael Leão', 'Portugal'], ['João Félix', 'Portugal'],
  ['Vitinha', 'Portugal'], ['Nuno Mendes', 'Portugal'],
  ['Xavi', 'Espagne'], ['Andrés Iniesta', 'Espagne'], ['Iker Casillas', 'Espagne'], ['Sergio Ramos', 'Espagne'],
  ['Carles Puyol', 'Espagne'], ['Raúl', 'Espagne'], ['David Villa', 'Espagne'], ['Fernando Torres', 'Espagne'],
  ['Sergio Busquets', 'Espagne'], ['Pedri', 'Espagne'], ['Gavi', 'Espagne'], ['Lamine Yamal', 'Espagne'],
  ['Rodri', 'Espagne'], ['Álvaro Morata', 'Espagne'], ['Cesc Fàbregas', 'Espagne'], ['Xabi Alonso', 'Espagne'],
  ['Franz Beckenbauer', 'Allemagne'], ['Gerd Müller', 'Allemagne'], ['Lothar Matthäus', 'Allemagne'], ['Miroslav Klose', 'Allemagne'],
  ['Manuel Neuer', 'Allemagne'], ['Philipp Lahm', 'Allemagne'], ['Bastian Schweinsteiger', 'Allemagne'], ['Thomas Müller', 'Allemagne'],
  ['Toni Kroos', 'Allemagne'], ['Mesut Özil', 'Allemagne'], ['Jamal Musiala', 'Allemagne'], ['Florian Wirtz', 'Allemagne'],
  ['Joshua Kimmich', 'Allemagne'], ['Karl-Heinz Rummenigge', 'Allemagne'],
  ['Andrea Pirlo', 'Italie'], ['Gianluigi Buffon', 'Italie'], ['Francesco Totti', 'Italie'], ['Alessandro Del Piero', 'Italie'],
  ['Paolo Maldini', 'Italie'], ['Roberto Baggio', 'Italie'], ['Fabio Cannavaro', 'Italie'], ['Paolo Rossi', 'Italie'],
  ['Gianluigi Donnarumma', 'Italie'], ['Nicolò Barella', 'Italie'], ['Giorgio Chiellini', 'Italie'], ['Leonardo Bonucci', 'Italie'],
  ['David Beckham', 'Angleterre'], ['Steven Gerrard', 'Angleterre'], ['Frank Lampard', 'Angleterre'], ['Wayne Rooney', 'Angleterre'],
  ['Harry Kane', 'Angleterre'], ['Jude Bellingham', 'Angleterre'], ['Bukayo Saka', 'Angleterre'], ['Phil Foden', 'Angleterre'],
  ['Bobby Charlton', 'Angleterre'], ['Gary Lineker', 'Angleterre'], ['Michael Owen', 'Angleterre'], ['Marcus Rashford', 'Angleterre'],
  ['Cole Palmer', 'Angleterre'],
  ['Johan Cruyff', 'Pays-Bas'], ['Marco van Basten', 'Pays-Bas'], ['Ruud Gullit', 'Pays-Bas'], ['Frank Rijkaard', 'Pays-Bas'],
  ['Dennis Bergkamp', 'Pays-Bas'], ['Arjen Robben', 'Pays-Bas'], ['Robin van Persie', 'Pays-Bas'], ['Wesley Sneijder', 'Pays-Bas'],
  ['Virgil van Dijk', 'Pays-Bas'], ['Frenkie de Jong', 'Pays-Bas'], ['Clarence Seedorf', 'Pays-Bas'],
  ['Kevin De Bruyne', 'Belgique'], ['Eden Hazard', 'Belgique'], ['Thibaut Courtois', 'Belgique'], ['Romelu Lukaku', 'Belgique'],
  ['Vincent Kompany', 'Belgique'],
  ['Luka Modrić', 'Croatie'], ['Davor Šuker', 'Croatie'], ['Joško Gvardiol', 'Croatie'], ['Ivan Rakitić', 'Croatie'], ['Ivan Perišić', 'Croatie'],
  ['Luis Suárez', 'Uruguay'], ['Edinson Cavani', 'Uruguay'], ['Diego Forlán', 'Uruguay'], ['Federico Valverde', 'Uruguay'], ['Darwin Núñez', 'Uruguay'],
  ['Mohamed Salah', 'Égypte'], ['Sadio Mané', 'Sénégal'], ['Kalidou Koulibaly', 'Sénégal'], ['Édouard Mendy', 'Sénégal'],
  ['Didier Drogba', 'Côte d\'Ivoire'], ['Yaya Touré', 'Côte d\'Ivoire'], ['Samuel Eto\'o', 'Cameroun'], ['George Weah', 'Liberia'],
  ['Riyad Mahrez', 'Algérie'], ['Achraf Hakimi', 'Maroc'], ['Yassine Bounou', 'Maroc'], ['Hakim Ziyech', 'Maroc'],
  ['Pierre-Emerick Aubameyang', 'Gabon'], ['Victor Osimhen', 'Nigeria'],
  ['Erling Haaland', 'Norvège'], ['Martin Ødegaard', 'Norvège'], ['Zlatan Ibrahimović', 'Suède'], ['Viktor Gyökeres', 'Suède'],
  ['Alexander Isak', 'Suède'], ['Robert Lewandowski', 'Pologne'], ['Son Heung-min', 'Corée du Sud'], ['Khvicha Kvaratskhelia', 'Géorgie'],
  ['Gheorghe Hagi', 'Roumanie'], ['Hristo Stoitchkov', 'Bulgarie'], ['Pavel Nedvěd', 'République tchèque'], ['Andriy Shevchenko', 'Ukraine'],
  ['Ferenc Puskás', 'Hongrie'], ['Christian Eriksen', 'Danemark'], ['Peter Schmeichel', 'Danemark'], ['David Alaba', 'Autriche'],
  ['Granit Xhaka', 'Suisse'], ['James Rodríguez', 'Colombie'], ['Radamel Falcao', 'Colombie'], ['Carlos Valderrama', 'Colombie'],
  ['Alexis Sánchez', 'Chili'], ['Arturo Vidal', 'Chili'], ['Guillermo Ochoa', 'Mexique'], ['Christian Pulisic', 'États-Unis'],
  ['Kaoru Mitoma', 'Japon'], ['Takefusa Kubo', 'Japon'], ['Gareth Bale', 'Pays de Galles'], ['Ryan Giggs', 'Pays de Galles'],
];

// [club, pays]
const clubCountries = [
  ['Ajax Amsterdam', 'Pays-Bas'], ['PSV Eindhoven', 'Pays-Bas'], ['Feyenoord', 'Pays-Bas'], ['Benfica', 'Portugal'],
  ['FC Porto', 'Portugal'], ['Sporting CP', 'Portugal'], ['Celtic Glasgow', 'Écosse'], ['Rangers', 'Écosse'],
  ['Galatasaray', 'Turquie'], ['Fenerbahçe', 'Turquie'], ['Beşiktaş', 'Turquie'], ['Olympiakos', 'Grèce'],
  ['Panathinaïkos', 'Grèce'], ['Boca Juniors', 'Argentine'], ['River Plate', 'Argentine'], ['Flamengo', 'Brésil'],
  ['Santos', 'Brésil'], ['Palmeiras', 'Brésil'], ['Corinthians', 'Brésil'], ['Al-Nassr', 'Arabie saoudite'],
  ['Al-Hilal', 'Arabie saoudite'], ['Al-Ittihad', 'Arabie saoudite'], ['Inter Miami', 'États-Unis'], ['LA Galaxy', 'États-Unis'],
  ['Club Bruges', 'Belgique'], ['Anderlecht', 'Belgique'], ['Standard de Liège', 'Belgique'], ['Shakhtar Donetsk', 'Ukraine'],
  ['Dynamo Kiev', 'Ukraine'], ['Zénith Saint-Pétersbourg', 'Russie'], ['Spartak Moscou', 'Russie'], ['Étoile rouge de Belgrade', 'Serbie'],
  ['Dinamo Zagreb', 'Croatie'], ['RB Salzbourg', 'Autriche'], ['Rapid Vienne', 'Autriche'], ['Young Boys Berne', 'Suisse'],
  ['FC Bâle', 'Suisse'], ['FC Copenhague', 'Danemark'], ['Malmö FF', 'Suède'], ['Rosenborg', 'Norvège'],
  ['Bodø/Glimt', 'Norvège'], ['Legia Varsovie', 'Pologne'], ['Slavia Prague', 'République tchèque'], ['Sparta Prague', 'République tchèque'],
  ['Ferencváros', 'Hongrie'], ['Steaua Bucarest', 'Roumanie'], ['Wydad Casablanca', 'Maroc'], ['Raja Casablanca', 'Maroc'],
  ['Al Ahly', 'Égypte'], ['Zamalek', 'Égypte'], ['Espérance de Tunis', 'Tunisie'], ['Club América', 'Mexique'],
  ['Peñarol', 'Uruguay'], ['Colo-Colo', 'Chili'], ['Kashima Antlers', 'Japon'], ['Qarabağ', 'Azerbaïdjan'],
  ['Ludogorets', 'Bulgarie'], ['Maccabi Tel-Aviv', 'Israël'], ['APOEL Nicosie', 'Chypre'], ['Napoli', 'Italie'],
];

// [club, ville]
const clubCities = [
  ['Paris Saint-Germain', 'Paris'], ['Olympique de Marseille', 'Marseille'], ['Olympique lyonnais', 'Lyon'], ['LOSC', 'Lille'],
  ['RC Lens', 'Lens'], ['Stade Rennais', 'Rennes'], ['FC Nantes', 'Nantes'], ['Girondins de Bordeaux', 'Bordeaux'],
  ['AS Saint-Étienne', 'Saint-Étienne'], ['OGC Nice', 'Nice'], ['Montpellier HSC', 'Montpellier'], ['Stade de Reims', 'Reims'],
  ['Toulouse FC', 'Toulouse'], ['FC Lorient', 'Lorient'], ['Stade Brestois', 'Brest'], ['Angers SCO', 'Angers'],
  ['AJ Auxerre', 'Auxerre'], ['Le Havre AC', 'Le Havre'], ['FC Metz', 'Metz'], ['RC Strasbourg Alsace', 'Strasbourg'],
  ['AS Nancy-Lorraine', 'Nancy'], ['EA Guingamp', 'Guingamp'], ['SM Caen', 'Caen'], ['Dijon FCO', 'Dijon'],
  ['Clermont Foot', 'Clermont-Ferrand'], ['Amiens SC', 'Amiens'], ['Grenoble Foot 38', 'Grenoble'], ['Nîmes Olympique', 'Nîmes'],
  ['AC Ajaccio', 'Ajaccio'], ['SC Bastia', 'Bastia'], ['Valenciennes FC', 'Valenciennes'], ['ES Troyes AC', 'Troyes'],
  ['FC Annecy', 'Annecy'], ['FC Mulhouse', 'Mulhouse'], ['SR Colmar', 'Colmar'],
  ['Real Madrid', 'Madrid'], ['Atlético Madrid', 'Madrid'], ['FC Barcelone', 'Barcelone'], ['Valence CF', 'Valence'],
  ['Séville FC', 'Séville'], ['Real Betis', 'Séville'], ['Athletic Bilbao', 'Bilbao'], ['Real Sociedad', 'Saint-Sébastien'],
  ['Juventus', 'Turin'], ['Torino', 'Turin'], ['Inter', 'Milan'], ['AC Milan', 'Milan'], ['AS Rome', 'Rome'],
  ['Lazio', 'Rome'], ['Napoli', 'Naples'], ['Fiorentina', 'Florence'], ['Atalanta', 'Bergame'],
  ['Bayern', 'Munich'], ['Borussia Dortmund', 'Dortmund'], ['Schalke 04', 'Gelsenkirchen'], ['Bayer Leverkusen', 'Leverkusen'],
  ['RB Leipzig', 'Leipzig'], ['Eintracht Francfort', 'Francfort'], ['VfB Stuttgart', 'Stuttgart'], ['Hambourg SV', 'Hambourg'],
  ['Werder Brême', 'Brême'], ['SC Fribourg', 'Fribourg-en-Brisgau'], ['Borussia Mönchengladbach', 'Mönchengladbach'],
  ['Arsenal', 'Londres'], ['Chelsea', 'Londres'], ['Tottenham', 'Londres'], ['West Ham', 'Londres'],
  ['Liverpool FC', 'Liverpool'], ['Everton', 'Liverpool'], ['Manchester United', 'Manchester'], ['Manchester City', 'Manchester'],
  ['Newcastle United', 'Newcastle'], ['Aston Villa', 'Birmingham'], ['Leeds United', 'Leeds'],
  ['Ajax', 'Amsterdam'], ['PSV', 'Eindhoven'], ['Feyenoord', 'Rotterdam'], ['Benfica', 'Lisbonne'], ['Sporting CP', 'Lisbonne'],
  ['FC Porto', 'Porto'], ['Celtic', 'Glasgow'], ['Rangers', 'Glasgow'], ['Galatasaray', 'Istanbul'], ['Fenerbahçe', 'Istanbul'],
  ['Boca Juniors', 'Buenos Aires'], ['River Plate', 'Buenos Aires'], ['Anderlecht', 'Bruxelles'], ['Club Bruges', 'Bruges'],
];

// [stade, club]
const stadiums = [
  ['Parc des Princes', 'Paris Saint-Germain'], ['Stade Vélodrome', 'Olympique de Marseille'], ['Groupama Stadium', 'Olympique lyonnais'],
  ['Stade Pierre-Mauroy', 'LOSC Lille'], ['Stade Bollaert-Delelis', 'RC Lens'], ['Roazhon Park', 'Stade Rennais'],
  ['Stade de la Beaujoire', 'FC Nantes'], ['Matmut Atlantique', 'Girondins de Bordeaux'], ['Stade Geoffroy-Guichard', 'AS Saint-Étienne'],
  ['Allianz Riviera', 'OGC Nice'], ['Stade de la Mosson', 'Montpellier HSC'], ['Stade Auguste-Delaune', 'Stade de Reims'],
  ['Stade Francis-Le Blé', 'Stade Brestois'], ['Stade Raymond-Kopa', 'Angers SCO'], ['Stade de l\'Abbé-Deschamps', 'AJ Auxerre'],
  ['Stade Saint-Symphorien', 'FC Metz'], ['Stade de la Meinau', 'RC Strasbourg Alsace'], ['Stade Louis-II', 'AS Monaco'],
  ['Stade du Moustoir', 'FC Lorient'], ['Stade Océane', 'Le Havre AC'], ['Stade Marcel-Picot', 'AS Nancy-Lorraine'],
  ['Stade du Roudourou', 'EA Guingamp'], ['Stade Michel-d\'Ornano', 'SM Caen'], ['Stade de la Licorne', 'Amiens SC'],
  ['Santiago Bernabéu', 'Real Madrid'], ['Camp Nou', 'FC Barcelone'], ['Metropolitano', 'Atlético Madrid'], ['Mestalla', 'Valence CF'],
  ['Ramón Sánchez-Pizjuán', 'Séville FC'], ['San Mamés', 'Athletic Bilbao'], ['Anfield', 'Liverpool'], ['Old Trafford', 'Manchester United'],
  ['Etihad Stadium', 'Manchester City'], ['Emirates Stadium', 'Arsenal'], ['Stamford Bridge', 'Chelsea'], ['St James\' Park', 'Newcastle United'],
  ['Villa Park', 'Aston Villa'], ['Allianz Arena', 'Bayern Munich'], ['Signal Iduna Park', 'Borussia Dortmund'], ['Veltins-Arena', 'Schalke 04'],
  ['BayArena', 'Bayer Leverkusen'], ['Allianz Stadium (Turin)', 'Juventus'], ['Stade Diego-Armando-Maradona', 'Napoli'],
  ['Johan Cruyff Arena', 'Ajax Amsterdam'], ['Philips Stadion', 'PSV Eindhoven'], ['De Kuip', 'Feyenoord'], ['Estádio da Luz', 'Benfica'],
  ['Estádio do Dragão', 'FC Porto'], ['Estádio José Alvalade', 'Sporting CP'], ['Celtic Park', 'Celtic Glasgow'], ['Ibrox', 'Rangers'],
  ['La Bombonera', 'Boca Juniors'], ['El Monumental', 'River Plate'],
];

// [surnom, club ou sélection]
const nicknames = [
  ['les Canaris', 'FC Nantes'], ['les Verts', 'AS Saint-Étienne'], ['les Sang et Or', 'RC Lens'], ['les Dogues', 'LOSC Lille'],
  ['les Girondins', 'Bordeaux'], ['les Aiglons', 'OGC Nice'], ['les Gones', 'Olympique lyonnais'], ['les Phocéens', 'Olympique de Marseille'],
  ['les Merlus', 'FC Lorient'], ['les Crocos', 'Nîmes Olympique'], ['les Grenats', 'FC Metz'], ['les Violets', 'Toulouse FC'],
  ['les Pirates', 'Stade Brestois'], ['les Rouge et Noir', 'Stade Rennais'], ['les Ciel et Marine', 'Le Havre AC'],
  ['les Red Devils', 'Manchester United'], ['les Gunners', 'Arsenal'], ['les Citizens', 'Manchester City'], ['les Spurs', 'Tottenham'],
  ['les Toffees', 'Everton'], ['les Magpies', 'Newcastle United'], ['les Hammers', 'West Ham'], ['les Foxes', 'Leicester City'],
  ['la Vieille Dame', 'Juventus'], ['les Nerazzurri', 'Inter Milan'], ['les Rossoneri', 'AC Milan'], ['les Giallorossi', 'AS Rome'],
  ['les Merengue', 'Real Madrid'], ['les Colchoneros', 'Atlético Madrid'], ['les Blaugrana', 'FC Barcelone'],
  ['les Lions indomptables', 'Cameroun'], ['les Éléphants', 'Côte d\'Ivoire'], ['les Super Eagles', 'Nigeria'], ['les Black Stars', 'Ghana'],
  ['les Pharaons', 'Égypte'], ['les Aigles de Carthage', 'Tunisie'], ['les Bafana Bafana', 'Afrique du Sud'], ['les Three Lions', 'Angleterre'],
  ['la Seleção', 'Brésil'], ['l\'Albiceleste', 'Argentine'], ['la Celeste', 'Uruguay'], ['les Oranje', 'Pays-Bas'],
  ['la Nati', 'Suisse'], ['la Mannschaft', 'Allemagne'], ['les Samouraïs bleus', 'Japon'], ['les Socceroos', 'Australie'],
  ['les Vatreni', 'Croatie'], ['El Tri', 'Mexique'],
];

module.exports = {
  worldCups, worldCupFinals, worldCupTopScorers, euros, championsLeague, championsLeagueRunnersUp, ballonDor,
  ligue1, ligue1Pool, premierLeague, premierLeaguePool, liga, ligaPool, serieA, serieAPool, bundesliga, bundesligaPool,
  coupeDeFrance, can, canPool, copaAmerica, copaPool, nationalities, clubCountries, clubCities, stadiums, nicknames,
};
