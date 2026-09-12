import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { sampleNewsPlan } from '../src/lib/news/video/planScenes';
import type { NewsVideoPlan } from '../src/lib/news/video/types';

const episodeId = process.argv[2] || 'news-brief-sample';
const audioFlag = process.argv.find((a) => a.startsWith('--audio='));
const audioOverride = audioFlag?.slice('--audio='.length);

const root = process.cwd();
const localDir = path.join(root, '.toma-local');
const planPath = path.join(localDir, `${episodeId}.video.json`);
const outPath = path.join(localDir, `${episodeId}.mp4`);
const entry = path.join(root, 'src/remotion/index.ts');

async function loadPlan(): Promise<NewsVideoPlan> {
  try {
    const rec = JSON.parse(await readFile(planPath, 'utf8')) as { plan?: NewsVideoPlan };
    if (rec?.plan?.scenes) return rec.plan;
  } catch {
    /* sample */
  }
  if (episodeId === 'news-brief-sample' || episodeId.startsWith('news-brief-')) {
    // Prefer stored plan for real ids; sample only for explicit sample id.
    if (episodeId === 'news-brief-sample') return sampleNewsPlan(audioOverride);
  }
  throw new Error(
    `No plan at ${planPath}. POST /api/news/video/${episodeId} first, or open the news page.`
  );
}

async function main() {
  await mkdir(localDir, { recursive: true });
  const plan = await loadPlan();
  if (audioOverride) plan.audioSrc = audioOverride;

  console.log('news-render', {
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
    id: 'NewsVideo',
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
    videoUrl: `/api/news/video/${encodeURIComponent(episodeId)}/file`,
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
