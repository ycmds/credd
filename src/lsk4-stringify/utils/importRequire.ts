import { copyFile, unlink } from 'node:fs/promises';
import { createRequire } from 'node:module';

import { Err } from '@lsk4/err';

const nodeRequire = createRequire(import.meta.url);

// NOTE: ESM Import or CJS require
export async function importRequire(path: string, { removeCache }: { removeCache?: boolean } = {}) {
  try {
    const res = nodeRequire(path);
    if (removeCache) delete nodeRequire.cache[nodeRequire.resolve(path)];
    return res;
  } catch (requireErr) {
    if (Err.getCode(requireErr) === 'MODULE_NOT_FOUND') {
      throw new Err(`${path} not found`, requireErr);
    }
    const isTryImport =
      Err.getCode(requireErr).startsWith('Unknown file extension ".ts"') ||
      Err.getCode(requireErr).startsWith('Dynamic require of') ||
      Err.getCode(requireErr).startsWith('require() of ES Module') ||
      Err.getCode(requireErr).startsWith(
        'ReferenceError: module is not defined in ES module scope',
      );
    // console.log({ isTryImport });
    if (isTryImport) {
      try {
        const rand = Date.now() + Math.random();
        const fullpath = removeCache ? `${path}?update=${rand}` : path;
        let res: unknown;
        if (path.endsWith('.ts')) {
          const date = new Date().toISOString().replace(/[^0-9]/g, '');
          const newPath = path.replace(/\.ts$/, `.tmp${date}.mjs`);
          await copyFile(path, newPath);
          try {
            res = await import(newPath);
          } finally {
            unlink(newPath);
          }
        } else {
          res = await import(fullpath);
        }
        return res;
      } catch (importErr) {
        if (Err.getCode(importErr) === 'ERR_MODULE_NOT_FOUND') {
          throw new Err(`${path} not found`, importErr);
        }
        throw new Err('importErr', importErr);
      }
    }
    throw new Err('requireErr', requireErr);
  }
}
