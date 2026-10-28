import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveDondeVer, setDondeVerOverlay } from '@/config/dondeVer';
import { buildSnapshot, parseCsv } from './sheet';

describe('donde-ver sheet', () => {
  it('parses quoted commas', () => {
    const rows = parseCsv('Jornada,Local,Visita,MX,US\n14,MTY,GDL,"Canal 5, TUDN","TUDN, ViX"\n');
    assert.equal(rows[1]?.[3], 'Canal 5, TUDN');
  });

  it('sheet match beats home-club defaults; empty cell falls through', () => {
    const snap = buildSnapshot(
      [
        'Jornada,Local,Visita,MX,US',
        '14,Monterrey,Chivas,"Canal 5, TUDN, ViX, LayVTime","TUDN, Univision, ViX"',
        '14,Toluca,Tijuana,,ViX',
      ].join('\n'),
      'Club,MX,US\nGDL,Prime Video,"Telemundo, Universo"\n'
    );
    assert.equal(snap.rows.matches, 2);
    assert.deepEqual(snap.errors, []);
    setDondeVerOverlay(snap);
    const mty = resolveDondeVer({
      date: '2026-10-25T01:00:00Z',
      jornada: 'Jornada 14',
      league: 'liga-mx',
      home: { abbreviation: 'MTY' },
      away: { abbreviation: 'GDL' },
    } as Parameters<typeof resolveDondeVer>[0]);
    assert.deepEqual(mty.mxChannels, ['canal-5', 'tudn', 'vix', 'layvtime']);
    assert.equal(mty.us, 'TUDN · Univision · ViX');

    const tol = resolveDondeVer({
      date: '2026-10-25T03:00:00Z',
      jornada: 'Jornada 14',
      league: 'liga-mx',
      home: { abbreviation: 'TOL' },
      away: { abbreviation: 'TIJ' },
    } as Parameters<typeof resolveDondeVer>[0]);
    // MX empty → GUIDE or home-club (Toluca hosts: ViX). US from the sheet.
    assert.ok(tol.mxChannels.includes('vix'));
    assert.deepEqual(tol.usChannels, ['vix']);
    setDondeVerOverlay(null);
  });

  it('joins MX 1 / MX 2 dropdown slots', () => {
    const snap = buildSnapshot(
      [
        'Jornada,Local,Visita,MX 1,MX 2,MX 3,US 1,US 2',
        '14,MTY,GDL,Canal 5,TUDN,,TUDN,Ninguno',
      ].join('\n'),
      'Club,MX 1,US 1\nGDL,Prime Video,Telemundo\n'
    );
    assert.deepEqual(snap.errors, []);
    setDondeVerOverlay(snap);
    const d = resolveDondeVer({
      date: '2026-10-25T01:00:00Z',
      jornada: 'Jornada 14',
      league: 'liga-mx',
      home: { abbreviation: 'MTY' },
      away: { abbreviation: 'GDL' },
    } as Parameters<typeof resolveDondeVer>[0]);
    assert.deepEqual(d.mxChannels, ['canal-5', 'tudn']);
    assert.deepEqual(d.usChannels, ['tudn']);
    setDondeVerOverlay(null);
  });

  it('matches a makeup by Fecha even if the fixture jornada differs', () => {
    const snap = buildSnapshot(
      [
        'Jornada,Fecha,Local,Visita,MX 1,MX 2,MX 3,MX 4,US 1,US 2',
        '7,2026-10-28,AME,TIJ,Canal 5,TUDN,ViX,LayVTime,TUDN,ViX',
      ].join('\n'),
      'Club,MX 1,US 1,US 2,US 3\nAME,Canal 5,TUDN,Univision,ViX\n'
    );
    assert.deepEqual(snap.errors, []);
    setDondeVerOverlay(snap);
    const d = resolveDondeVer({
      date: '2026-10-29T03:00:00Z',
      jornada: 'Jornada 15',
      league: 'liga-mx',
      home: { abbreviation: 'AME' },
      away: { abbreviation: 'TIJ' },
    } as Parameters<typeof resolveDondeVer>[0]);
    assert.deepEqual(d.mxChannels, ['canal-5', 'tudn', 'vix', 'layvtime']);
    assert.deepEqual(d.usChannels, ['tudn', 'vix']);
    setDondeVerOverlay(null);
  });

  it('dash means no channels on that side', () => {
    const snap = buildSnapshot(
      'Jornada,Local,Visita,MX,US\n14,MTY,GDL,-,TUDN\n',
      ''
    );
    setDondeVerOverlay(snap);
    const d = resolveDondeVer({
      date: '2026-10-25T01:00:00Z',
      jornada: 'Jornada 14',
      league: 'liga-mx',
      home: { abbreviation: 'MTY' },
      away: { abbreviation: 'GDL' },
    } as Parameters<typeof resolveDondeVer>[0]);
    assert.deepEqual(d.mxChannels, []);
    assert.deepEqual(d.usChannels, ['tudn']);
    setDondeVerOverlay(null);
  });
});
