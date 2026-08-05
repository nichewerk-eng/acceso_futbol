/**
 * Curated Acceso show seeds per club so the pulse wall never feels empty.
 * TikTok ids are optional; YouTube uses public watch URLs.
 */

export type ClubShowClip = {
  id: string;
  clubId: string;
  kind: 'tiktok' | 'youtube' | 'blog';
  title: string;
  url: string;
  /** Platform video id when embeddable */
  videoId?: string;
  publishedAt?: string;
};

export const CLUB_SHOW_CLIPS: ClubShowClip[] = [
  {
    id: 'america-banorte-take',
    clubId: 'america',
    kind: 'blog',
    title: 'América golea 3-0… y el Banorte a medias',
    url: '/momento/america-santos-j3-banorte',
    publishedAt: '2026-08-02T23:00:00-06:00',
  },
  {
    id: 'america-refuerzos',
    clubId: 'america',
    kind: 'blog',
    title: 'Dos desconocidos en seis días: el América de la calculadora',
    url: '/momento/america-refuerzos-cerrillo-perea',
    publishedAt: '2026-08-02T18:00:00-06:00',
  },
  {
    id: 'clasico-heat',
    clubId: 'america',
    kind: 'blog',
    title: 'Cuando se enfrentan América y Chivas, el país se detiene',
    url: '/momento/clasico-heat',
  },
  {
    id: 'clasico-heat-chivas',
    clubId: 'chivas',
    kind: 'blog',
    title: 'Cuando se enfrentan América y Chivas, el país se detiene',
    url: '/momento/clasico-heat',
  },
  {
    id: 'el-tri-apertura',
    clubId: 'el-tri',
    kind: 'blog',
    title: 'El Apertura ya es el show principal',
    url: '/momento/apertura-pulso',
  },
  {
    id: 'austin-bridge-tri',
    clubId: 'el-tri',
    kind: 'blog',
    title: 'Liga MX en Austin no fue un accidente',
    url: '/momento/austin-bridge',
  },
];

export function showClipsForClub(clubId: string): ClubShowClip[] {
  return CLUB_SHOW_CLIPS.filter((c) => c.clubId === clubId);
}
