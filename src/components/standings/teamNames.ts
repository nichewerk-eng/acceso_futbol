/**
 * Spanish display names for national teams.
 * Keys are the English / official names returned by the ESPN API.
 * Values are the preferred Spanish names.
 */
export const TEAM_NAME_ES: Record<string, string> = {
  // T
  'Turkey':          'Turquía',
  'Türkiye':         'Turquía',
  // G
  'Germany':         'Alemania',
  // S
  'South Korea':     'Corea del Sur',
  'Switzerland':     'Suiza',
  'Sweden':          'Suecia',
  'Saudi Arabia':    'Arabia Saudita',
  'Senegal':         'Senegal',
  'Scotland':        'Escocia',
  // U
  'United States':   'Estados Unidos',
  'Uzbekistan':      'Uzbekistán',
  // N
  'Netherlands':     'Países Bajos',
  'Holland':         'Países Bajos',
  'Norway':          'Noruega',
  'New Zealand':     'Nueva Zelanda',
  // F
  'France':          'Francia',
  // E
  'England':         'Inglaterra',
  'Egypt':           'Egipto',
  // C
  "Côte d'Ivoire":   'Costa de Marfil',
  'Ivory Coast':     'Costa de Marfil',
  'Croatia':         'Croacia',
  'Cape Verde':      'Cabo Verde',
  // M
  'Morocco':         'Marruecos',
  // B
  'Belgium':         'Bélgica',
  'Bosnia and Herzegovina': 'Bosnia y Herzegovina',
  // I
  'Iran':            'Irán',
  'Iraq':            'Irak',
  // J
  'Japan':           'Japón',
  'Jordan':          'Jordania',
  // A
  'Algeria':         'Argelia',
  // D
  'DR Congo':        'Congo RD',
  'Congo DR':        'Congo RD',
  // P
  'Panama':          'Panamá',
};

/** Returns the Spanish name for a team, or the original name if no override exists. */
export function teamNameEs(name: string): string {
  return TEAM_NAME_ES[name] ?? name;
}
