import { existsSync } from 'node:fs';

import { Err } from '@lsk4/err';

import { importRequire } from './importRequire.js';

export async function loadConfig(dirname: string) {
  const path = `${dirname}/config.js`;
  if (!existsSync(path)) {
    throw new Err('CONFIG_NOT_FOUND', `config.js not found at ${path}`);
  }
  const res = await importRequire(path);
  return { path, config: res.default || res };
}
