#!/usr/bin/env node

import { resolve } from 'node:path';
import type { Argv } from 'yargs';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { build } from '../core/build.js';
import { buildDeep } from '../core/buildDeep.js';
import { printBuildResult } from '../core/printBuildResult.js';
import { printInfo } from '../core/printInfo.js';
import { upload } from '../core/upload.js';
import { uploadDeep } from '../core/uploadDeep.js';
import { log } from '../utils/log.js';

interface CreddArgs {
  _: string[];
  dir: string;
  build: boolean;
  upload: boolean;
  recursive: boolean;
  force: boolean;
  why: boolean;
}

async function main() {
  const argv = (await yargs(hideBin(process.argv))
    .command('info', 'get info about credd and current environment', () => {})
    .command('$0 [dir]', 'build and/or upload creds', (yargsBuilder: Argv) =>
      yargsBuilder
        .positional('dir', {
          describe: 'Directory with config.js',
          type: 'string',
          default: '.',
        })
        .options({
          build: {
            alias: ['b'],
            describe: 'build creds',
            type: 'boolean',
            default: true,
          },
          upload: {
            alias: ['u'],
            describe: 'upload creds',
            type: 'boolean',
            default: false,
          },
          recursive: {
            alias: ['r'],
            describe: 'find in subdirs',
            type: 'boolean',
            default: false,
          },
          force: {
            alias: ['f'],
            describe: 'force to run',
            type: 'boolean',
            default: false,
          },
          why: {
            describe: 'add a redacted "Why updated" line to rewritten files (key + type, no values)',
            type: 'boolean',
            default: false,
          },
        }),
    )
    .help()
    .parse()) as unknown as CreddArgs;

  const command = argv._?.[0];
  if (command === 'info') {
    await printInfo();
    return;
  }
  if (command) {
    log.error(`Unknown command: "${command}". Run "credd --help" for available commands.`);
    process.exit(1);
  }

  const rawDir = (argv.dir as string) || '.';
  const dirname = resolve(process.cwd(), rawDir);
  const { build: isBuild, upload: isUpload, recursive: isDeep, force, why } = argv;

  if (isDeep) {
    if (isBuild) {
      const res = await buildDeep(dirname, { force, why, log });
      log.debug('BuildDeep result:', res.length);
      res.forEach(printBuildResult);
    }
    if (isUpload) {
      const res = await uploadDeep(dirname, { force, log });
      log.debug('UploadDeep result:', res);
    }
  } else {
    if (isBuild) {
      const res = await build(dirname, { force, why, log });
      printBuildResult(res);
    }
    if (isUpload) {
      const res = await upload(dirname, { force, log });
      log.debug('Upload result:', res);
    }
  }
}

main().catch((err) => {
  if (err?.code === 'CONFIG_NOT_FOUND') {
    log.error(`config.js not found at: ${err.message?.split(' at ')?.[1] || 'unknown path'}`);
    log.error('Make sure you are running credd from a directory with config.js or pass the correct path: credd <dir>');
  } else {
    log.error(err?.message || err);
  }
  process.exit(1);
});
