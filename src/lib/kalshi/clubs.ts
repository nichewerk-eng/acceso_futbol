/** Kalshi Liga MX team codes ↔ AF club ids. */

export const CLUB_ID_TO_KALSHI: Record<string, string> = {
  america: 'AME',
  atlante: 'ALA',
  atlas: 'ATL',
  chivas: 'CDG',
  'cruz-azul': 'CRA',
  juarez: 'JUA',
  leon: 'LEO',
  monterrey: 'MON',
  necaxa: 'NCX',
  pachuca: 'PAC',
  puebla: 'PUE',
  pumas: 'PUM',
  queretaro: 'QUE',
  'san-luis': 'ASL',
  santos: 'SLA',
  tigres: 'TIG',
  tijuana: 'TIJ',
  toluca: 'TOL',
};

export const KALSHI_TO_CLUB_ID: Record<string, string> = Object.fromEntries(
  Object.entries(CLUB_ID_TO_KALSHI).map(([id, code]) => [code, id])
);
