export type GravityClub = {
  id: string;
  name: string;
  abbreviation: string;
  league: 'liga-mx' | 'seleccion';
};

/**
 * Apertura 2026 Liga MX (18 clubs).
 * Abbreviations follow ESPN scoreboard/standings this season.
 */
export const LIGA_MX_CLUBS: GravityClub[] = [
  { id: 'tijuana', name: 'Tijuana', abbreviation: 'TIJ', league: 'liga-mx' },
  { id: 'pumas', name: 'Pumas UNAM', abbreviation: 'UNAM', league: 'liga-mx' },
  { id: 'monterrey', name: 'Monterrey', abbreviation: 'MTY', league: 'liga-mx' },
  { id: 'necaxa', name: 'Necaxa', abbreviation: 'NCX', league: 'liga-mx' },
  { id: 'cruz-azul', name: 'Cruz Azul', abbreviation: 'CAZ', league: 'liga-mx' },
  { id: 'queretaro', name: 'Querétaro', abbreviation: 'QRO', league: 'liga-mx' },
  { id: 'atlas', name: 'Atlas', abbreviation: 'ATS', league: 'liga-mx' },
  { id: 'america', name: 'América', abbreviation: 'AME', league: 'liga-mx' },
  { id: 'atlante', name: 'Atlante', abbreviation: 'ATL', league: 'liga-mx' },
  { id: 'puebla', name: 'Puebla', abbreviation: 'PUE', league: 'liga-mx' },
  { id: 'chivas', name: 'Guadalajara', abbreviation: 'GDL', league: 'liga-mx' },
  { id: 'pachuca', name: 'Pachuca', abbreviation: 'PAC', league: 'liga-mx' },
  { id: 'toluca', name: 'Toluca', abbreviation: 'TOL', league: 'liga-mx' },
  { id: 'leon', name: 'León', abbreviation: 'LEO', league: 'liga-mx' },
  { id: 'san-luis', name: 'Atlético de San Luis', abbreviation: 'ASL', league: 'liga-mx' },
  { id: 'tigres', name: 'Tigres UANL', abbreviation: 'UANL', league: 'liga-mx' },
  { id: 'santos', name: 'Santos', abbreviation: 'SAN', league: 'liga-mx' },
  { id: 'juarez', name: 'FC Juárez', abbreviation: 'JUA', league: 'liga-mx' },
];

export const EL_TRI: GravityClub = {
  id: 'el-tri',
  name: 'Selección Mexicana',
  abbreviation: 'MEX',
  league: 'seleccion',
};
