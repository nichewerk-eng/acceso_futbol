import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ligaMxLogoSrc } from '@/config/ligaMxLogos';

export async function selloCrestSrc(abbr: string, remote?: string): Promise<string | null> {
  const local = ligaMxLogoSrc(abbr);
  if (local) {
    try {
      const bytes = await readFile(join(process.cwd(), 'public', local.replace(/^\//, '')));
      const ext = local.toLowerCase().endsWith('.svg') ? 'svg+xml' : 'png';
      return `data:image/${ext};base64,${Buffer.from(bytes).toString('base64')}`;
    } catch {
      /* fall through */
    }
  }
  if (remote && /^https?:\/\//i.test(remote)) return remote;
  return null;
}

export async function loadSelloFonts() {
  const fontsDir = join(process.cwd(), 'public/fonts');
  const [oswaldBold, bodyRegular] = await Promise.all([
    readFile(join(fontsDir, 'Oswald-Bold.woff')),
    readFile(join(fontsDir, 'NotoSans-Regular.woff')),
  ]);
  return [
    { name: 'AF Body', data: bodyRegular, style: 'normal' as const, weight: 400 as const },
    { name: 'AF Display', data: oswaldBold, style: 'normal' as const, weight: 700 as const },
  ];
}
