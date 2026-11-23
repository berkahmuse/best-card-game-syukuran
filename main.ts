// Lantern Row — Festival of Nine Lights: entrypoint.
//
// Running this file is the whole submission step. It stages the game for the
// judge exactly as it sits in this repository:
//
//   1. the playable game (game/index.html plus its ES modules under game/src/)
//      is copied into the output directory untouched, so what the judge opens
//      is byte-for-byte what a player would get locally;
//   2. the four screenshots in screenshots/ follow it (the first by name is
//      the cover the bounty page shows);
//   3. dossier.json is written last, summarising the staged tree for the
//      scorer, via the vendored make.fun library in vendor/makefun-game.ts.
//
// Usage:
//   node main.ts [--out <dir>]
//
// The output directory resolves in this order: the --out flag, then the
// MAKEFUN_OUTPUT_DIR environment variable (what local runs use), then the
// grader's own /output. Node 22 standard library only; no build step.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// The caps below mirror the scorer's gate for this bounty. text_max_bytes is
// the only one that shapes the dossier's bytes; the rest make this program
// refuse a tree the scorer would refuse anyway (too many or too-large
// screenshots, an oversized game/ tree, an over-long path), so a bad entry
// fails here, loudly, instead of at judging time.
const SCORER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
} as const;

// This file lives at the repository root, so its own directory is the anchor
// every relative path below is resolved against — never the caller's cwd.
const repoRoot = fileURLToPath(new URL('.', import.meta.url));

function resolveOutputDir(argv: string[]): string {
  const flagAt = argv.indexOf('--out');
  if (flagAt !== -1) {
    const value = argv[flagAt + 1];
    if (value === undefined || value.startsWith('--')) {
      throw new Error('--out needs a directory path after it');
    }
    return value;
  }
  return process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
}

function stageGame(outDir: string): void {
  const gameSource = join(repoRoot, 'game');
  if (!existsSync(join(gameSource, 'index.html'))) {
    throw new Error('game/index.html is missing — there is no game to hand in');
  }
  cpSync(gameSource, join(outDir, 'game'), { recursive: true });
}

function stageScreenshots(outDir: string): void {
  // The output always gets a screenshots/ folder; the copies land only when
  // this checkout actually carries screenshots to hand over.
  const target = join(outDir, 'screenshots');
  mkdirSync(target, { recursive: true });
  const source = join(repoRoot, 'screenshots');
  if (existsSync(source)) {
    cpSync(source, target, { recursive: true });
  }
}

function writeDossier(outDir: string): void {
  // Built after staging on purpose: the dossier describes the output tree as
  // handed in, so it must be generated from the copies, not the sources.
  const dossier = buildDossier(outDir, SCORER_CAPS);
  writeFileSync(join(outDir, 'dossier.json'), dossier);
}

function main(): void {
  const outDir = resolveOutputDir(process.argv.slice(2));
  mkdirSync(outDir, { recursive: true });
  stageGame(outDir);
  stageScreenshots(outDir);
  writeDossier(outDir);
  console.log(`Lantern Row staged in ${outDir} (game/, screenshots/, dossier.json)`);
}

main();
