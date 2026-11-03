// Copies self-hosted variable fonts from node_modules into src/fonts so next/font/local can preload them.
import { copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'src/fonts');
mkdirSync(out, { recursive: true });

const files = [
  ['fraunces', 'fraunces-latin-full-normal.woff2', 'Fraunces-var.woff2'],
  ['fraunces', 'fraunces-latin-full-italic.woff2', 'Fraunces-var-italic.woff2'],
  ['inter-tight', 'inter-tight-latin-wght-normal.woff2', 'InterTight-var.woff2'],
  ['jetbrains-mono', 'jetbrains-mono-latin-wght-normal.woff2', 'JetBrainsMono-var.woff2'],
];

for (const [pkg, from, to] of files) {
  const src = join(root, 'node_modules/@fontsource-variable', pkg, 'files', from);
  if (!existsSync(src)) { console.warn('missing font', src); continue; }
  copyFileSync(src, join(out, to));
}
console.log('fonts ready');
