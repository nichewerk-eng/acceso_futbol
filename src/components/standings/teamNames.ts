/**
 * Spanish display names for national teams.
 * Keys are the English / official names returned by the ESPN API.
 * Values are the correct Spanish names used in Mexican/Latin American sports media.
 */
export const TEAM_NAME_ES: Record<string, string> = {
  // ── A ──────────────────────────────────────────────────────────────────────
  'Algeria':                    'Argelia',
  // ── B ──────────────────────────────────────────────────────────────────────
  'Belgium':                    'Bélgica',
  'Bosnia and Herzegovina':     'Bosnia y Herzegovina',
  'Bosnia Herzegovina':         'Bosnia y Herzegovina',
  'Brazil':                     'Brasil',
  // ── C ──────────────────────────────────────────────────────────────────────
  'Canada':                     'Canadá',
  'Cape Verde':                 'Cabo Verde',
  'Côte d\'Ivoire':             'Costa de Marfil',
  'Ivory Coast':                'Costa de Marfil',
  'Croatia':                    'Croacia',
  'Curacao':                    'Curazao',
  'Curaçao':                    'Curazao',
  'Czech Republic':             'República Checa',
  'Czechia':                    'República Checa',
  'Congo DR':                   'Congo RD',
  'DR Congo':                   'Congo RD',
  'Democratic Republic of Congo': 'Congo RD',
  // ── E ──────────────────────────────────────────────────────────────────────
  'Egypt':                      'Egipto',
  'England':                    'Inglaterra',
  // ── F ──────────────────────────────────────────────────────────────────────
  'France':                     'Francia',
  // ── G ──────────────────────────────────────────────────────────────────────
  'Germany':                    'Alemania',
  // ── H ──────────────────────────────────────────────────────────────────────
  'Haiti':                      'Haití',
  'Holland':                    'Países Bajos',
  // ── I ──────────────────────────────────────────────────────────────────────
  'Iran':                       'Irán',
  'Iraq':                       'Irak',
  // ── J ──────────────────────────────────────────────────────────────────────
  'Japan':                      'Japón',
  'Jordan':                     'Jordania',
  // ── M ──────────────────────────────────────────────────────────────────────
  'Mexico':                     'México',
  'Morocco':                    'Marruecos',
  // ── N ──────────────────────────────────────────────────────────────────────
  'Netherlands':                'Países Bajos',
  'New Zealand':                'Nueva Zelanda',
  'Norway':                     'Noruega',
  // ── P ──────────────────────────────────────────────────────────────────────
  'Panama':                     'Panamá',
  // ── S ──────────────────────────────────────────────────────────────────────
  'Saudi Arabia':               'Arabia Saudita',
  'Scotland':                   'Escocia',
  'Senegal':                    'Senegal',
  'South Africa':               'Sudáfrica',
  'South Korea':                'Corea del Sur',
  'Spain':                      'España',
  'Sweden':                     'Suecia',
  'Switzerland':                'Suiza',
  // ── T ──────────────────────────────────────────────────────────────────────
  'Tunisia':                    'Túnez',
  'Turkey':                     'Turquía',
  'Türkiye':                    'Turquía',
  // ── U ──────────────────────────────────────────────────────────────────────
  'United States':              'Estados Unidos',
  'USA':                        'Estados Unidos',
  'Uzbekistan':                 'Uzbekistán',
};

/** Returns the Spanish name for a team, or the original name if no override exists. */
export function teamNameEs(name: string): string {
  return TEAM_NAME_ES[name] ?? name;
}
