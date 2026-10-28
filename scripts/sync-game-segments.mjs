#!/usr/bin/env node
/** Synchronize ONLY shared CSS and motion blocks in the eight authored scenes.
 * No browser or runtime imports. Does not regenerate copy, media, trims or markup.
 * node scripts/sync-game-segments.mjs --check     (read-only source drift test)
 * node scripts/sync-game-segments.mjs --patch     (print a V4A patch)
 * node scripts/sync-game-segments.mjs --write     (explicitly synchronize blocks)
 * Keep scene markup editable; never use the historical build-composition generator.
 * Canonical assets are build-time partials, not runtime <link>/<script> dependencies:
 * this avoids template/shadow bundling and async registration differences.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const games = ['block', 'chromatic', 'rally', 'orb', 'float', 'serpent', 'brika', 'aim'];
const css = readFileSync(resolve(root, 'assets/game-segment.css'), 'utf8').trim();
const motion = readFileSync(resolve(root, 'assets/game-segment.js'), 'utf8').trim();
const mode = process.argv[2] || '--check';
if (!['--check', '--patch', '--write'].includes(mode)) throw new Error('Use --check, --patch or --write');
const changes = [];
for (const game of games) {
  const file = `compositions/${game}.html`;
  const before = readFileSync(resolve(root, file), 'utf8');
  const duration = game === 'aim' ? 15 : 9;
  const js = motion.replaceAll('__GAME__', game).replaceAll('__DURATION__', String(duration));
  let after = before;
  for (const [name, content] of [['styles', `<style>\n${css}\n</style>`], ['motion', `<script>\n${js}\n</script>`]]) {
    const start = `<!-- game-segment:${name}:start -->`;
    const end = `<!-- game-segment:${name}:end -->`;
    const a = after.indexOf(start), b = after.indexOf(end);
    if (a < 0 || b < a) throw new Error(`${file}: missing shared ${name} markers; refusing legacy regeneration`);
    after = after.slice(0, a) + `${start}\n${content}\n${end}` + after.slice(b + end.length);
  }
  if (before !== after) changes.push({file, before, after});
}
if (mode === '--patch') {
  console.log('*** Begin Patch');
  for (const {file, before, after} of changes) {
    console.log(`*** Update File: ${file}\n@@`);
    console.log(before.trimEnd().split('\n').map(line => '-' + line).join('\n'));
    console.log(after.trimEnd().split('\n').map(line => '+' + line).join('\n'));
  }
  console.log('*** End Patch');
} else if (mode === '--write') {
  for (const {file, after} of changes) writeFileSync(resolve(root, file), after);
  console.log(`Synchronized ${changes.length} gameplay scenes; authored markup and media untouched.`);
} else {
  if (changes.length) {
    console.error('Shared gameplay source drift: ' + changes.map(c => c.file).join(', '));
    process.exitCode = 1;
  } else console.log('All eight gameplay scenes match shared CSS and seek-safe motion sources.');
}
