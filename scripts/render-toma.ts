import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { j8HandPlan, J8_EPISODE_ID } from '../src/lib/toma/video/plans/j8-2026-09-11';
import type { TomaVideoPlan } from '../src/lib/toma/video/types';

const episodeId = process.argv[2] || J8_EPISODE_ID;
const audioFlag = process.argv.find((a) => a.startsWith('--audio='));
const audioOverride = audioFlag?.slice('--audio='.length);

const root = process.cwd();
const localDir = path.join(root, '.toma-local');
const planPath = path.join(localDir, `${episodeId}.video.json`);
const outPath = path.join(localDir, `${episodeId}.mp4`);
const entry = path.join(root, 'src/remotion/index.ts');

async function loadPlan(): Promise<TomaVideoPlan> {
  try {
    const rec = JSON.parse(await readFile(planPath, 'utf8')) as { plan?: TomaVideoPlan };
    if (rec?.plan) return rec.plan;
  } catch {
    /* seed j8 */
  }
  if (episodeId === J8_EPISODE_ID) return j8HandPlan(audioOverride);
  throw new Error(
    `No plan at ${planPath}. POST /api/toma/video/${episodeId} first, or open the episode page.`
  );
}

async function main() {
  await mkdir(localDir, { recursive: true });
  const plan = await loadPlan();
  if (audioOverride) plan.audioSrc = audioOverride;

  console.log('toma-render', {
    episodeId,
    duration: plan.durationSeconds,
    scenes: plan.scenes.length,
    audioSrc: plan.audioSrc,
  });

  const bundled = await bundle({
    entryPoint: entry,
    webpackOverride: (config) => ({
      ...config,
      resolve: {
        ...config.resolve,
        alias: {
          ...(config.resolve?.alias as Record<string, string> | undefined),
          '@': path.join(root, 'src'),
        },
      },
    }),
  });

  const composition = await selectComposition({
    serveUrl: bundled,
    id: 'TomaVideo',
    inputProps: { plan },
  });

  await renderMedia({
    composition,
    serveUrl: bundled,
    codec: 'h264',
    outputLocation: outPath,
    inputProps: { plan },
  });

  const rec = {
    episodeId,
    plan,
    videoUrl: `/api/toma/video/${encodeURIComponent(episodeId)}/file`,
    renderedAt: new Date().toISOString(),
    contentType: 'video/mp4',
  };
  await writeFile(planPath, JSON.stringify(rec, null, 2));
  console.log('wrote', outPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
