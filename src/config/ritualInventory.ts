/**
 * Native ritual ad slots — aligned with media kit packages.
 * Set sponsor names when sold; empty = Acceso house / open inventory.
 */
export type RitualSlot = {
  id: string;
  placement: 'jornada' | 'donde-ver' | 'radio' | 'moment' | 'share-frame';
  label: string;
  sponsor?: string;
  line: string;
  href?: string;
};

export const ritualInventory: RitualSlot[] = [
  {
    id: 'jornada-presenter',
    placement: 'jornada',
    label: 'Presentador de jornada',
    sponsor: undefined,
    line: 'Inventario abierto — patrocina la jornada con Acceso.',
    href: '/mediakit',
  },
  {
    id: 'donde-ver',
    placement: 'donde-ver',
    label: 'Dónde ver',
    sponsor: undefined,
    line: 'Espacio nativo MX ↔ US · telco / streaming.',
    href: '/mediakit',
  },
  {
    id: 'radio-sting',
    placement: 'radio',
    label: 'Acceso Radio',
    sponsor: undefined,
    line: 'Presentado por — abierto a marca presentadora.',
    href: '/mediakit',
  },
  {
    id: 'moment-native',
    placement: 'moment',
    label: 'Momento patrocinado',
    sponsor: undefined,
    line: 'Integra tu marca en la toma editorial Acceso.',
    href: '/mediakit',
  },
];

export function slot(placement: RitualSlot['placement']): RitualSlot | undefined {
  return ritualInventory.find((s) => s.placement === placement);
}
