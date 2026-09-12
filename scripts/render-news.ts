import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { sampleNewsPlan } from '../src/lib/news/video/planScenes';
import type { NewsVideoPlan, NewsVideoRecord } from '../src/lib/news/video/types';

const episodeId = process.argv[2] || 'news-brief-sample';
const audioFlag = process.argv.find((a) => a.startsWith('--audio='));
const originFlag = process.argv.find((a) => a.startsWith('--origin='));
const audioOverride = audioFlag?.slice('--audio='.length);
const origin = (originFlag?.slice('--origin='.length) || 'https://www.accesofutbol.com').replace(
  /\/$/,
  ''
);

const root = process.cwd();
const localDir = path.join(root, '.toma-local');
const planPath = path.join(localDir, `${episodeId}.video.json`);
const outPath = path.join(localDir, `${episodeId}.mp4`);
const entry = path.join(root, 'src/remotion/index.ts');

async function fetchRemotePlan(): Promise<NewsVideoPlan | null> {
  const url = `${origin}/api/news/video/${encodeURIComponent(episodeId)}`;
  console.log('fetching plan', url);
  const res = await fetch(url);
  if (!res.ok) {
    console.error('remote plan', res.status, (await res.text().catch(() => '')).slice(0, 200));
    return null;
  }
  const rec = (await res.json()) as NewsVideoRecord;
  if (!rec?.plan?.scenes?.length) return null;
  // Absolute audio for headless Chrome
  if (rec.plan.audioSrc?.startsWith('/')) {
    rec.plan.audioSrc = `${origin}${rec.plan.audioSrc}`;
  } else if (!rec.plan.audioSrc && rec.plan.audioUrl) {
    rec.plan.audioSrc = rec.plan.audioUrl.startsWith('http')
      ? rec.plan.audioUrl
      : `${origin}${rec.plan.audioUrl}`;
  }
  await writeFile(planPath, JSON.stringify(rec, null, 2));
  return rec.plan;
}

async function loadPlan(): Promise<NewsVideoPlan> {
  try {
    const rec = JSON.parse(await readFile(planPath, 'utf8')) as { plan?: NewsVideoPlan };
    if (rec?.plan?.scenes) return rec.plan;
  } catch {
    /* try remote / sample */
  }

  if (episodeId === 'news-brief-sample') {
    return sampleNewsPlan(audioOverride);
  }

  const remote = await fetchRemotePlan();
  if (remote) return remote;

  throw new Error(
    `No plan for ${episodeId}. Tried ${planPath} and ${origin}/api/news/video/${episodeId}`
  );
}

async function main() {
  await mkdir(localDir, { recursive: true });
  const plan = await loadPlan();
  if (audioOverride) plan.audioSrc = audioOverride;
  else if (plan.audioSrc?.startsWith('/')) plan.audioSrc = `${origin}${plan.audioSrc}`;

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
