'use client';

import type { Fixture, Group } from './types';
import { teamNameEs } from './teamNames';

// ── Constants ────────────────────────────────────────────────────────────────
const ORANGE  = '#f07820';
const TEAL    = '#1a7a78';
const BG      = '#030f10';
const WHITE   = '#ffffff';
const W       = 1080;
const H       = 1920;
const SCALE   = 2; // 4K: 2160 × 3840

// Flag emoji map (mirrors StandingsView)
const FLAG: Record<string, string> = {
  MEX: '🇲🇽', KOR: '🇰🇷', CZE: '🇨🇿', RSA: '🇿🇦',
  CAN: '🇨🇦', BIH: '🇧🇦', SUI: '🇨🇭', QAT: '🇶🇦',
  BRA: '🇧🇷', SCO: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', HAI: '🇭🇹', MAR: '🇲🇦',
  PAR: '🇵🇾', TUR: '🇹🇷', AUS: '🇦🇺', USA: '🇺🇸',
  ECU: '🇪🇨', GER: '🇩🇪', CIV: '🇨🇮', CUW: '🇨🇼',
  NED: '🇳🇱', SWE: '🇸🇪', JPN: '🇯🇵', TUN: '🇹🇳',
  BEL: '🇧🇪', IRN: '🇮🇷', EGY: '🇪🇬', NZL: '🇳🇿',
  ESP: '🇪🇸', URU: '🇺🇾', KSA: '🇸🇦', CPV: '🇨🇻',
  NOR: '🇳🇴', FRA: '🇫🇷', SEN: '🇸🇳', IRQ: '🇮🇶',
  ARG: '🇦🇷', AUT: '🇦🇹', ALG: '🇩🇿', JOR: '🇯🇴',
  COL: '🇨🇴', POR: '🇵🇹', UZB: '🇺🇿', COD: '🇨🇩',
  ENG: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', CRO: '🇭🇷', PAN: '🇵🇦', GHA: '🇬🇭',
};
const flag = (abbr: string) => FLAG[abbr] ?? '🏳️';

// ── Helpers ──────────────────────────────────────────────────────────────────
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function fillRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
  color: string,
) {
  ctx.fillStyle = color;
  roundRect(ctx, x, y, w, h, r);
  ctx.fill();
}

// Clamps text to maxWidth using ellipsis
function clampText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  while (text.length > 0 && ctx.measureText(text + '…').width > maxWidth) {
    text = text.slice(0, -1);
  }
  return text + '…';
}

// Column x-centres (logical px within 1080 canvas, left pad = 68)
const COL = {
  pos:  110,  // position circle centre
  flag: 153,  // flag emoji centre — closer to pos circle, more air before name
  team: 214,  // team name left edge — padded away from flag
  pj:   460,
  g:    530,
  e:    598,
  p:    665,
  gf:   732,
  gc:   799,
  gd:   868,
  pts:  972,  // pts badge centre — right edge lands at 1008, inside PAD_R
};
const PAD_L   = 68;
const PAD_R   = 68;
const TABLE_W = W - PAD_L - PAD_R;
const TOP_PAD = 60; // reduced — logo sits close to top edge

// Fixture alignment — both sections use identical x anchors
const FIX_SCORE_X  = W / 2;   // 540 — score / "vs" centred here
const FIX_HOME_R   = 435;     // home name right edge (score gets ~75px breathing room)
const FIX_AWAY_L   = 645;     // away flag left edge (score gets ~75px breathing room)
const FLAG_W       = 38;      // reserved px for flag glyph
const FLAG_GAP     = 10;      // px between flag and name text
const NAME_MAX_H   = 210;     // max name width — home side
const NAME_MAX_A   = 240;     // max name width — away side
const EMOJI_FONT   = '22px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';

// ── Main export ───────────────────────────────────────────────────────────────
export async function downloadGroupImage(
  group: Group,
  pastFixtures: Fixture[],
  upcomingFixtures: Fixture[],
  groupLetter: string,
  tz: string,
): Promise<void> {
  // Ensure web fonts (Oswald etc.) are loaded before drawing
  await document.fonts.ready;

  const canvas = document.createElement('canvas');
  canvas.width  = W * SCALE;
  canvas.height = H * SCALE;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(SCALE, SCALE);

  // ── 1. Background ───────────────────────────────────────────────────────────
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  // ── 2. Top radial glow ─────────────────────────────────────────────────────
  const topGlow = ctx.createRadialGradient(W / 2, -60, 0, W / 2, -60, 560);
  topGlow.addColorStop(0, 'rgba(240,120,32,0.45)');
  topGlow.addColorStop(1, 'rgba(240,120,32,0)');
  ctx.fillStyle = topGlow;
  ctx.fillRect(0, 0, W, 560);

  // ── 3. Left / right edge glow strips ──────────────────────────────────────
  const lStrip = ctx.createLinearGradient(0, 0, 50, 0);
  lStrip.addColorStop(0, 'rgba(240,120,32,0.18)');
  lStrip.addColorStop(1, 'rgba(240,120,32,0)');
  ctx.fillStyle = lStrip;
  ctx.fillRect(0, 0, 50, H);

  const rStrip = ctx.createLinearGradient(W, 0, W - 50, 0);
  rStrip.addColorStop(0, 'rgba(26,122,120,0.18)');
  rStrip.addColorStop(1, 'rgba(26,122,120,0)');
  ctx.fillStyle = rStrip;
  ctx.fillRect(W - 50, 0, 50, H);

  // ── 4. Top logo ────────────────────────────────────────────────────────────
  try {
    const topLogo = await loadImage('/acceso_futbol_logo_logo_transparent_bg.PNG');
    const LOGO_H = 192;
    const LOGO_W = (topLogo.width / topLogo.height) * LOGO_H;
    ctx.globalAlpha = 0.90;
    ctx.drawImage(topLogo, W / 2 - LOGO_W / 2, TOP_PAD + 18, LOGO_W, LOGO_H);
    ctx.globalAlpha = 1;
  } catch {
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.font = 'bold 22px Oswald, "Arial Narrow", Arial, sans-serif';
    ctx.fillText('ACCESO FÚTBOL', W / 2, TOP_PAD + 72);
  }

  // ── 5. "GRUPO X" headline ──────────────────────────────────────────────────
  ctx.fillStyle = WHITE;
  ctx.font = 'bold 118px Oswald, "Arial Narrow", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`GRUPO ${groupLetter}`, W / 2, TOP_PAD + 340);

  // ── 6. "TABLA DE POSICIONES" ───────────────────────────────────────────────
  ctx.fillStyle = ORANGE;
  ctx.font = 'bold 40px Oswald, "Arial Narrow", Arial, sans-serif';
  ctx.fillText('TABLA DE POSICIONES', W / 2, TOP_PAD + 396);

  // ── 7. Matchday subtitle ───────────────────────────────────────────────────
  const matchday = Math.max(...group.entries.map((e) => e.gp), 0);
  ctx.fillStyle = 'rgba(255,255,255,0.40)';
  ctx.font = '26px Oswald, "Arial Narrow", Arial, sans-serif';
  ctx.fillText(`TRAS LA JORNADA ${matchday}`, W / 2, TOP_PAD + 440);

  // ── 8. Header separator bar ────────────────────────────────────────────────
  const sepBar = ctx.createLinearGradient(PAD_L, 0, W - PAD_R, 0);
  sepBar.addColorStop(0,    'rgba(240,120,32,0.9)');
  sepBar.addColorStop(0.45, 'rgba(255,255,255,0.12)');
  sepBar.addColorStop(1,    'rgba(26,122,120,0.9)');
  ctx.fillStyle = sepBar;
  ctx.fillRect(PAD_L, TOP_PAD + 466, TABLE_W, 2);

  // ── 9. Column headers ─────────────────────────────────────────────────────
  const HDR_Y = TOP_PAD + 508;
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.font = 'bold 20px Oswald, "Arial Narrow", Arial, sans-serif';

  ctx.textAlign = 'center';
  ctx.fillText('#',  COL.pos,  HDR_Y);
  ctx.fillText('PJ', COL.pj,   HDR_Y);
  ctx.fillText('G',  COL.g,    HDR_Y);
  ctx.fillText('E',  COL.e,    HDR_Y);
  ctx.fillText('P',  COL.p,    HDR_Y);
  ctx.fillText('GF', COL.gf,   HDR_Y);
  ctx.fillText('GC', COL.gc,   HDR_Y);
  ctx.fillText('DG', COL.gd,   HDR_Y);
  ctx.fillText('PTS', COL.pts, HDR_Y);

  ctx.textAlign = 'left';
  ctx.fillText('EQUIPO', COL.team, HDR_Y);

  // thin divider under headers
  ctx.strokeStyle = 'rgba(255,255,255,0.07)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD_L, TOP_PAD + 522);
  ctx.lineTo(W - PAD_R, TOP_PAD + 522);
  ctx.stroke();

  // ── 10. Team rows ─────────────────────────────────────────────────────────
  const ROW_H     = 120;
  const ROW_START = TOP_PAD + 524;

  group.entries.forEach((entry, idx) => {
    const isFirst = entry.position === 1;
    const isTop2  = entry.position <= 2;
    const ry      = ROW_START + idx * ROW_H;
    const cy      = ry + ROW_H / 2; // vertical centre of row

    // Row tinted background
    if (isFirst) {
      fillRoundRect(ctx, PAD_L, ry, TABLE_W, ROW_H, 0, 'rgba(240,120,32,0.07)');
    } else if (isTop2) {
      fillRoundRect(ctx, PAD_L, ry, TABLE_W, ROW_H, 0, 'rgba(26,122,120,0.05)');
    }

    // Left qualification accent bar
    ctx.fillStyle = isFirst ? ORANGE : isTop2 ? TEAL : 'rgba(255,255,255,0.06)';
    ctx.fillRect(PAD_L, ry, 3, ROW_H);

    // Position circle
    const R = 28;
    ctx.beginPath();
    ctx.arc(COL.pos, cy, R, 0, Math.PI * 2);
    ctx.fillStyle = isFirst
      ? 'rgba(240,120,32,0.22)'
      : isTop2
      ? 'rgba(26,122,120,0.18)'
      : 'rgba(255,255,255,0.06)';
    ctx.fill();

    ctx.fillStyle = isFirst ? ORANGE : isTop2 ? TEAL : 'rgba(255,255,255,0.35)';
    ctx.font = `bold 30px Oswald, "Arial Narrow", Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(String(entry.position), COL.pos, cy + 11);

    // Flag emoji — use emoji-capable font stack
    ctx.font = '46px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(flag(entry.team.abbreviation), COL.flag, cy + 16);

    // Team name
    const nameFont = `${isFirst ? 'bold' : '600'} 34px Oswald, "Arial Narrow", Arial, sans-serif`;
    ctx.font = nameFont;
    ctx.textAlign = 'left';
    ctx.fillStyle = isFirst ? WHITE : 'rgba(255,255,255,0.82)';
    const maxNameW = COL.pj - COL.team - 10;
    const safeName = clampText(ctx, teamNameEs(entry.team.name), maxNameW);
    ctx.fillText(safeName, COL.team, cy + 13);

    // Stat numbers (PJ G E P GF GC)
    ctx.fillStyle = 'rgba(255,255,255,0.50)';
    ctx.font = '30px Oswald, "Arial Narrow", Arial, sans-serif';
    ctx.textAlign = 'center';
    ([
      [COL.pj, entry.gp],
      [COL.g,  entry.w],
      [COL.e,  entry.d],
      [COL.p,  entry.l],
      [COL.gf, entry.gf],
      [COL.gc, entry.ga],
    ] as [number, number][]).forEach(([x, v]) => ctx.fillText(String(v), x, cy + 11));

    // GD — coloured
    const gd = entry.gd;
    ctx.fillStyle = gd.startsWith('+') ? '#4ade80'
      : gd.startsWith('-') ? '#f87171'
      : 'rgba(255,255,255,0.50)';
    ctx.font = 'bold 30px Oswald, "Arial Narrow", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(gd, COL.gd, cy + 11);

    // PTS badge
    const BW = 72, BH = 52;
    const bx = COL.pts - BW / 2;
    const by = cy - BH / 2;

    if (isFirst) {
      // Glowing orange badge for leader
      ctx.shadowColor = 'rgba(240,120,32,0.55)';
      ctx.shadowBlur = 18;
      fillRoundRect(ctx, bx, by, BW, BH, 10, ORANGE);
      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = WHITE;
    } else if (isTop2) {
      fillRoundRect(ctx, bx, by, BW, BH, 10, 'rgba(26,122,120,0.55)');
      ctx.fillStyle = TEAL;
    } else {
      fillRoundRect(ctx, bx, by, BW, BH, 10, 'rgba(255,255,255,0.08)');
      ctx.fillStyle = 'rgba(255,255,255,0.38)';
    }
    ctx.font = 'bold 36px Oswald, "Arial Narrow", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(entry.pts), COL.pts, cy + 14);

    // Row divider (skip after last row)
    if (idx < group.entries.length - 1) {
      ctx.strokeStyle = 'rgba(255,255,255,0.055)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PAD_L + 12, ry + ROW_H);
      ctx.lineTo(W - PAD_R - 12, ry + ROW_H);
      ctx.stroke();
    }
  });

  // ── 11. Legend below table ─────────────────────────────────────────────────
  const TABLE_BOTTOM = ROW_START + group.entries.length * ROW_H;

  // light separator
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD_L, TABLE_BOTTOM + 4);
  ctx.lineTo(W - PAD_R, TABLE_BOTTOM + 4);
  ctx.stroke();

  const LEG_Y = TABLE_BOTTOM + 32;
  function legendDot(cx: number, color: string, label: string) {
    ctx.beginPath();
    ctx.arc(cx, LEG_Y, 7, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.32)';
    ctx.font = '20px Oswald, "Arial Narrow", Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(label, cx + 14, LEG_Y + 7);
  }
  legendDot(PAD_L + 10, ORANGE, 'Líder de grupo');
  legendDot(PAD_L + 240, TEAL,  'Clasifica al R32 (Top 2)');

  // ── 12. Section divider ────────────────────────────────────────────────────
  const SEC_DIVIDER_Y = LEG_Y + 44;
  const divGrad = ctx.createLinearGradient(PAD_L, 0, W - PAD_R, 0);
  divGrad.addColorStop(0,   'rgba(240,120,32,0.6)');
  divGrad.addColorStop(0.5, 'rgba(255,255,255,0.08)');
  divGrad.addColorStop(1,   'rgba(26,122,120,0.6)');
  ctx.fillStyle = divGrad;
  ctx.fillRect(PAD_L, SEC_DIVIDER_Y, TABLE_W, 1.5);

  // ── 13. Fixtures sections ──────────────────────────────────────────────────
  let cursorY = SEC_DIVIDER_Y + 18;

  function drawSectionHeader(label: string, accent: string) {
    fillRoundRect(ctx, PAD_L, cursorY, 6, 34, 3, accent);
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    roundRect(ctx, PAD_L + 14, cursorY, TABLE_W - 14, 34, 6);
    ctx.fill();
    ctx.fillStyle = accent;
    ctx.font = 'bold 18px Oswald, "Arial Narrow", Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(label, PAD_L + 26, cursorY + 23);
    cursorY += 44;
  }

  const FH = 70; // fixture row height — compact

  function drawFixtureRow(f: Fixture, isPast: boolean) {
    const cardH = FH - 6;
    fillRoundRect(ctx, PAD_L, cursorY, TABLE_W, cardH, 8, 'rgba(255,255,255,0.022)');

    const accent = isPast ? ORANGE : TEAL;
    ctx.fillStyle = accent;
    ctx.fillRect(PAD_L, cursorY, 3, cardH);

    const mid = cursorY + cardH / 2;

    // ── helpers for separated flag + name rendering ─────────────────────────
    // Home team: flag sits to the LEFT of the name, name right-aligns to homeR
    function drawHome(name: string, flagEmoji: string, color: string, bold: boolean) {
      const nameFont = `${bold ? 'bold' : '400'} 20px Oswald, "Arial Narrow", Arial, sans-serif`;
      ctx.font = nameFont;
      const nameText = clampText(ctx, name, NAME_MAX_H);
      const nameW    = ctx.measureText(nameText).width;
      const nameX    = FIX_HOME_R - nameW;
      ctx.fillStyle  = color;
      ctx.textAlign  = 'left';
      ctx.fillText(nameText, nameX, mid + 7);
      ctx.font       = EMOJI_FONT;
      ctx.textAlign  = 'center';
      ctx.fillText(flagEmoji, nameX - FLAG_GAP - FLAG_W / 2, mid + 7);
    }

    // Away team: flag sits to the LEFT of the name, both left-align from awayL
    function drawAway(name: string, flagEmoji: string, color: string, bold: boolean) {
      ctx.font       = EMOJI_FONT;
      ctx.textAlign  = 'left';
      ctx.fillStyle  = color;
      ctx.fillText(flagEmoji, FIX_AWAY_L, mid + 7);
      const nameFont = `${bold ? 'bold' : '400'} 20px Oswald, "Arial Narrow", Arial, sans-serif`;
      ctx.font       = nameFont;
      const nameText = clampText(ctx, name, NAME_MAX_A);
      ctx.textAlign  = 'left';
      ctx.fillStyle  = color;
      ctx.fillText(nameText, FIX_AWAY_L + FLAG_W + FLAG_GAP, mid + 7);
    }
    // ────────────────────────────────────────────────────────────────────────

    if (isPast) {
      const dateStr = new Date(f.date).toLocaleDateString('es-MX', {
        day: 'numeric', month: 'short', timeZone: tz,
      });
      ctx.fillStyle = 'rgba(255,255,255,0.20)';
      ctx.font = '14px Oswald, "Arial Narrow", Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(dateStr, PAD_L + 12, cursorY + 16);

      // FT badge
      fillRoundRect(ctx, W - PAD_R - 42, cursorY + 6, 36, 20, 4, 'rgba(255,255,255,0.07)');
      ctx.fillStyle = 'rgba(255,255,255,0.28)';
      ctx.font = 'bold 13px Oswald, "Arial Narrow", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('FT', W - PAD_R - 24, cursorY + 20);

      const homeWin = Number(f.home.score) > Number(f.away.score);
      const awayWin = Number(f.away.score) > Number(f.home.score);

      drawHome(teamNameEs(f.home.name), flag(f.home.abbreviation),
        homeWin ? WHITE : 'rgba(255,255,255,0.45)', homeWin);

      // Score — smaller font leaves more room for names
      ctx.shadowColor = 'rgba(240,120,32,0.38)';
      ctx.shadowBlur = 10;
      ctx.fillStyle = ORANGE;
      ctx.font = 'bold 28px Oswald, "Arial Narrow", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${f.home.score ?? '?'}–${f.away.score ?? '?'}`, FIX_SCORE_X, mid + 10);
      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';

      drawAway(teamNameEs(f.away.name), flag(f.away.abbreviation),
        awayWin ? WHITE : 'rgba(255,255,255,0.45)', awayWin);

    } else {
      const dateStr = new Date(f.date).toLocaleDateString('es-MX', {
        day: 'numeric', month: 'short', timeZone: tz,
      });
      const timeStr = new Date(f.date).toLocaleTimeString('es-MX', {
        hour: '2-digit', minute: '2-digit', hour12: true, timeZone: tz,
      });
      fillRoundRect(ctx, PAD_L + 10, cursorY + 7, 124, 50, 6, 'rgba(26,122,120,0.20)');
      ctx.fillStyle = TEAL;
      ctx.font = 'bold 16px Oswald, "Arial Narrow", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(dateStr, PAD_L + 72, cursorY + 27);
      ctx.fillStyle = 'rgba(26,122,120,0.80)';
      ctx.font = '13px Oswald, "Arial Narrow", Arial, sans-serif';
      ctx.fillText(timeStr, PAD_L + 72, cursorY + 45);

      drawHome(teamNameEs(f.home.name), flag(f.home.abbreviation), 'rgba(255,255,255,0.68)', false);

      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.font = 'bold 20px Oswald, "Arial Narrow", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('vs', FIX_SCORE_X, mid + 7);

      drawAway(teamNameEs(f.away.name), flag(f.away.abbreviation), 'rgba(255,255,255,0.68)', false);
    }

    cursorY += FH;
  }

  // Results
  if (pastFixtures.length > 0) {
    drawSectionHeader('RESULTADOS', ORANGE);
    pastFixtures.forEach((f) => drawFixtureRow(f, true));
    cursorY += 8;
  }

  // Upcoming
  if (upcomingFixtures.length > 0) {
    drawSectionHeader('PRÓXIMOS PARTIDOS', TEAL);
    upcomingFixtures.slice(0, 2).forEach((f) => drawFixtureRow(f, false));
  }

  // ── 14. Footer ────────────────────────────────────────────────────────────
  // Sit at least 60px below last fixture, but never higher than 220px from bottom
  const FOOTER_TOP = Math.max(cursorY + 60, H - 220);

  const footerSep = ctx.createLinearGradient(PAD_L, 0, W - PAD_R, 0);
  footerSep.addColorStop(0,   'rgba(240,120,32,0.5)');
  footerSep.addColorStop(0.5, 'rgba(255,255,255,0.08)');
  footerSep.addColorStop(1,   'rgba(26,122,120,0.5)');
  ctx.fillStyle = footerSep;
  ctx.fillRect(PAD_L, FOOTER_TOP, TABLE_W, 1.5);

  // Acceso Futbol logo
  try {
    const logo = await loadImage('/acceso_futbol_logo_logo_transparent_bg.PNG');
    const LOGO_H = 72;
    const LOGO_W = (logo.width / logo.height) * LOGO_H;
    ctx.globalAlpha = 0.80;
    ctx.drawImage(logo, W / 2 - LOGO_W / 2, FOOTER_TOP + 14, LOGO_W, LOGO_H);
    ctx.globalAlpha = 1;
  } catch {
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.font = 'bold 32px Oswald, "Arial Narrow", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ACCESO FÚTBOL', W / 2, FOOTER_TOP + 56);
  }

  ctx.fillStyle = 'rgba(255,255,255,0.20)';
  ctx.font = '18px Oswald, "Arial Narrow", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('@accesofutbolmx', W / 2, FOOTER_TOP + 130);

  // ── 15. Trigger download ──────────────────────────────────────────────────
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `grupo-${groupLetter.toLowerCase()}-mundial2026.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 'image/png');
}
