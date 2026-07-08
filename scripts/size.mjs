#!/usr/bin/env node
// Меряет минимальный размер кода пакета (min + gzip), без зависимостей.
// Зависимости externalized — считается только код credd, как он попадёт в бандл.
// Результат используется в бейдже README. Запуск: `npm run test:size`.
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const entry = join(root, 'lib', 'index.mjs');
const esbuild = join(root, 'node_modules', '.bin', 'esbuild');
const LIMIT_KB = Number(process.env.SIZE_LIMIT_KB || 6);

if (!existsSync(entry)) {
  console.log('skip size: lib не собран (нет lib/index.mjs)');
  process.exit(0);
}

const min = execFileSync(
  esbuild,
  [entry, '--bundle', '--minify', '--platform=node', '--format=esm', '--packages=external'],
  { maxBuffer: 1 << 26 },
);
const gzip = gzipSync(min, { level: 9 });

const kb = (n) => `${(n / 1024).toFixed(1)} kB`;
console.log(`min:      ${kb(min.length)}`);
console.log(`min+gzip: ${kb(gzip.length)}  (бейдж README)`);

if (gzip.length / 1024 > LIMIT_KB) {
  console.error(`\n✗ min+gzip ${kb(gzip.length)} превышает лимит ${LIMIT_KB} kB — обнови бейдж в README`);
  process.exit(1);
}
