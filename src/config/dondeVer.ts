import type { Fixture } from '@/lib/sports/types';

/**
 * Stub broadcast layer — replace with real rights data / Sportmonks TV stations
 * when available. Keeps MX + US as first-class product surface.
 */
const DEFAULTS: { mx: string; us: string } = {
  mx: 'Consulta tu cable / streaming local',
  us: 'Univision · TUDN · ViX (según partido)',
};

/** Very light heuristics until a real guide lands. */
export function attachDondeVer(fixture: Fixture): Fixture {
  const venue = `${fixture.venue ?? ''} ${fixture.city ?? ''}`.toLowerCase();
  const inUs =
    venue.includes('houston') ||
    venue.includes('austin') ||
    venue.includes('dallas') ||
    venue.includes('los angeles') ||
    venue.includes('chicago') ||
    venue.includes('united states') ||
    venue.includes('usa');

  return {
    ...fixture,
    dondeVer: inUs
      ? { mx: DEFAULTS.mx, us: 'Evento en EE.UU. · revisa TUDN / local' }
      : { ...DEFAULTS },
  };
}
