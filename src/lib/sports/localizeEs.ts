/**
 * Spanish display names for Sportmonks / ESPN English venue & status strings.
 */

const VENUE_ES: Record<string, string> = {
  'mexico city stadium': 'Estadio Banorte',
  'estadio azteca': 'Estadio Banorte',
  'guadalajara stadium': 'Estadio Akron',
  'estadio akron': 'Estadio Akron',
  'monterrey stadium': 'Estadio BBVA',
  'estadio bbva': 'Estadio BBVA',
  'estadio olímpico de universitario': 'Estadio Olímpico Universitario',
  'estadio olimpico de universitario': 'Estadio Olímpico Universitario',
  'estadio universitario de nuevo león': 'Estadio Universitario',
  'estadio universitario de nuevo leon': 'Estadio Universitario',
  'estadio nuevo corona': 'Estadio Corona',
  'estadio victoria de aguascalientes': 'Estadio Victoria',
  'estadio alfonso lastras ramírez': 'Estadio Alfonso Lastras',
  'estadio alfonso lastras ramirez': 'Estadio Alfonso Lastras',
};

const CITY_ES: Record<string, string> = {
  'mexico city': 'Ciudad de México',
  'ciudad de mexico': 'Ciudad de México',
  'san luis de potosi': 'San Luis Potosí',
  'san luis potosi': 'San Luis Potosí',
  'pachuca de soto': 'Pachuca',
  'toluca de lerdo': 'Toluca',
  'león de los aldamas': 'León',
  'leon de los aldamas': 'León',
  'san nicolás de los garza': 'San Nicolás de los Garza',
  'san nicolas de los garza': 'San Nicolás de los Garza',
  'santiago de querétaro': 'Querétaro',
  'santiago de queretaro': 'Querétaro',
  'aguascalientes': 'Aguascalientes',
  'guadalupe': 'Guadalupe',
  'zapopan': 'Zapopan',
  'torreón': 'Torreón',
  'torreon': 'Torreón',
  'ciudad juárez': 'Ciudad Juárez',
  'ciudad juarez': 'Ciudad Juárez',
};

const STATUS_ES: Record<string, string> = {
  'full time': 'Final',
  ft: 'Final',
  finished: 'Final',
  completed: 'Final',
  'full time -': 'Final',
  'half time': 'Descanso',
  ht: 'Descanso',
  '1st half': '1er tiempo',
  '2nd half': '2º tiempo',
  'not started': 'Próximo',
  ns: 'Próximo',
  postponed: 'Aplazado',
  cancelled: 'Cancelado',
  delayed: 'Retrasado',
  'in play': 'En vivo',
  live: 'En vivo',
  'extra time': 'Tiempo extra',
  pen: 'Penales',
  'penalties': 'Penales',
};

function normKey(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

export function localizeVenue(name?: string | null): string | null {
  if (!name?.trim()) return null;
  const hit = VENUE_ES[normKey(name)];
  return hit ?? name.trim();
}

export function localizeCity(name?: string | null): string | null {
  if (!name?.trim()) return null;
  const hit = CITY_ES[normKey(name)];
  return hit ?? name.trim();
}

export function localizeStatus(label?: string | null, state?: 'pre' | 'in' | 'post'): string {
  if (!label?.trim()) {
    if (state === 'in') return 'En vivo';
    if (state === 'post') return 'Final';
    return 'Próximo';
  }
  const raw = label.trim();
  const key = normKey(raw);
  if (STATUS_ES[key]) return STATUS_ES[key];
  // "Full Time" variants / clock crumbs
  if (/full\s*time/i.test(raw)) return 'Final';
  if (/half\s*time/i.test(raw)) return 'Descanso';
  if (/not\s*started/i.test(raw)) return 'Próximo';
  return raw;
}

export function localizeVenueCity(
  venue?: string | null,
  city?: string | null
): { venue: string | null; city: string | null } {
  const v = localizeVenue(venue);
  let c = localizeCity(city);
  // Avoid "Estadio Banorte · Ciudad de México" duplicating when city equals English Mexico City already mapped
  if (v && c && normKey(v).includes(normKey(c))) c = null;
  return { venue: v, city: c };
}
