import { readFile, realpath } from 'node:fs/promises';
import { createRequire } from 'node:module';

import { log } from '../utils/log.js';

export async function printInfo() {
  const require = createRequire(import.meta.url);
  const pkgPath = require.resolve('../../package.json');
  const pkg = JSON.parse(await readFile(pkgPath, 'utf8'));

  // Real path of the running binary (symlinks like `npm link` resolved).
  const realBin = await realpath(process.argv[1]).catch(() => process.argv[1]);
  const isLinked = !/[\\/]node_modules[\\/]/.test(pkgPath);
  const isLocal = pkgPath.startsWith(`${process.cwd()}/`);
  const source = isLinked ? 'linked (npm link / dev)' : isLocal ? 'local (node_modules)' : 'global (npm i -g)';

  const pad = (key: string) => `[${key}]`.padEnd(16);
  log.info(`${pad('Name')} ${pkg.name}`);
  log.info(`${pad('Version')} ${pkg.version}`);
  log.info(`${pad('Description')} ${pkg.description}`);
  log.info(`${pad('CWD')} ${process.cwd()}`);
  log.info(`${pad('Bin')} ${process.argv[1]}`);
  log.info(`${pad('Source')} ${source}`);
  if (realBin !== process.argv[1]) {
    log.info(`${pad('Real')} ${realBin}`);
  }
  log.info(`${pad('Platform')} ${process.platform} ${process.arch}`);
  log.info(`${pad('Node')} ${process.version}`);
  if (process.env.NODE_ENV) {
    log.info(`${pad('NODE_ENV')} ${process.env.NODE_ENV}`);
  }
}
