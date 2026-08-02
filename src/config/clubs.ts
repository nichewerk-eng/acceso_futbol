export type GravityClub = {
  id: string;
  name: string;
  abbreviation: string;
  league: 'liga-mx' | 'seleccion';
};

/** Deduped Liga MX set for gravity onboarding (no duplicate Chivas/Guadalajara). */
export const LIGA_MX_CLUBS: GravityClub[] = [
  { id: 'america', name: 'Club América', abbreviation: 'AME', league: 'liga-mx' },
  { id: 'chivas', name: 'Chivas', abbreviation: 'CHI', league: 'liga-mx' },
  { id: 'tigres', name: 'Tigres UANL', abbreviation: 'TIG', league: 'liga-mx' },
  { id: 'monterrey', name: 'Monterrey', abbreviation: 'MTY', league: 'liga-mx' },
  { id: 'cruz-azul', name: 'Cruz Azul', abbreviation: 'CAZ', league: 'liga-mx' },
  { id: 'pumas', name: 'Pumas UNAM', abbreviation: 'PUM', league: 'liga-mx' },
  { id: 'toluca', name: 'Toluca', abbreviation: 'TOL', league: 'liga-mx' },
  { id: 'santos', name: 'Santos Laguna', abbreviation: 'SAN', league: 'liga-mx' },
  { id: 'atlas', name: 'Atlas', abbreviation: 'ATL', league: 'liga-mx' },
  { id: 'pachuca', name: 'Pachuca', abbreviation: 'PAC', league: 'liga-mx' },
  { id: 'tijuana', name: 'Xolos Tijuana', abbreviation: 'TIJ', league: 'liga-mx' },
  { id: 'leon', name: 'León', abbreviation: 'LEO', league: 'liga-mx' },
  { id: 'necaxa', name: 'Necaxa', abbreviation: 'NEC', league: 'liga-mx' },
  { id: 'juarez', name: 'FC Juárez', abbreviation: 'JUA', league: 'liga-mx' },
  { id: 'mazatlan', name: 'Mazatlán FC', abbreviation: 'MAZ', league: 'liga-mx' },
  { id: 'queretaro', name: 'Querétaro', abbreviation: 'QRO', league: 'liga-mx' },
  { id: 'puebla', name: 'Puebla', abbreviation: 'PUE', league: 'liga-mx' },
  { id: 'san-luis', name: 'Atlético San Luis', abbreviation: 'ASL', league: 'liga-mx' },
];

export const EL_TRI: GravityClub = {
  id: 'el-tri',
  name: 'Selección Mexicana',
  abbreviation: 'MEX',
  league: 'seleccion',
};
