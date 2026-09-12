import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { j8HandPlan, J8_EPISODE_ID } from '../src/lib/toma/video/plans/j8-2026-09-11';
import type { TomaVideoPlan, TomaVideoRecord } from '../src/lib/toma/video/types';

const episodeId = process.argv[2] || J8_EPISODE_ID;
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

async function fetchRemotePlan(): Promise<TomaVideoPlan | null> {
  const url = `${origin}/api/toma/video/${encodeURIComponent(episodeId)}`;
  console.log('fetching plan', url);
  const res = await fetch(url);
  if (!res.ok) {
    console.error('remote plan', res.status, (await res.text().catch(() => '')).slice(0, 200));
    return null;
  }
  const rec = (await res.json()) as TomaVideoRecord;
  if (!rec?.plan?.scenes?.length) return null;
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

async function loadPlan(): Promise<TomaVideoPlan> {
  try {
    const rec = JSON.parse(await readFile(planPath, 'utf8')) as { plan?: TomaVideoPlan };
    if (rec?.plan?.scenes) return rec.plan;
  } catch {
    /* remote / hand */
  }
  if (episodeId === J8_EPISODE_ID) {
    const hand = j8HandPlan(
      audioOverride || `${origin}/api/toma/audio/${encodeURIComponent(J8_EPISODE_ID)}`
    );
    return hand;
  }
  const remote = await fetchRemotePlan();
  if (remote) return remote;
  throw new Error(
    `No plan for ${episodeId}. Tried ${planPath} and ${origin}/api/toma/video/${episodeId}`
  );
}

async function main() {
  await mkdir(localDir, { recursive: true });
  const plan = await loadPlan();
  if (audioOverride) plan.audioSrc = audioOverride;
  else if (plan.audioSrc?.startsWith('/')) plan.audioSrc = `${origin}${plan.audioSrc}`;

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
