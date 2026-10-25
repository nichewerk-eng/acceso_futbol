import { NextResponse } from 'next/server';
import {
  dondeVerSheetId,
  dondeVerSheetStatus,
  ensureDondeVerSheet,
  refreshDondeVerSheet,
} from '@/lib/dondeVer/sheet';

export const dynamic = 'force-dynamic';

let lastForced = 0;

/**
 * Google Sheet "Dónde ver" status. `?refresh=1` re-reads the sheet now
 * (at most every 10s) instead of waiting for the 30s cycle.
 */
export async function GET(req: Request) {
  if (!dondeVerSheetId()) {
    return NextResponse.json({ configured: false, note: 'Set DONDE_VER_SHEET_ID.' });
  }
  const force = new URL(req.url).searchParams.get('refresh') === '1';
  const now = Date.now();
  const snap =
    force && now - lastForced > 10_000
      ? ((lastForced = now), await refreshDondeVerSheet())
      : await ensureDondeVerSheet();
  const { ageMs } = dondeVerSheetStatus();

  return NextResponse.json(
    {
      configured: true,
      ok: snap?.ok ?? false,
      fetchedAt: snap ? new Date(snap.fetchedAt).toISOString() : null,
      ageSec: ageMs != null ? Math.round(ageMs / 1000) : null,
      rows: snap?.rows ?? null,
      errors: snap?.errors ?? [],
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
