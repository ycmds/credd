#!/usr/bin/env node

import { resolve } from 'node:path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import type { Argv } from 'yargs';

import { build } from '../core/build.js';
import { buildDeep } from '../core/buildDeep.js';
import { upload } from '../core/upload.js';
import { uploadDeep } from '../core/uploadDeep.js';
import { log } from '../utils/log.js';

interface CreddArgs {
  dir: string;
  build: boolean;
  upload: boolean;
  recursive: boolean;
  force: boolean;
}

async function main() {
  const argv = (await yargs(hideBin(process.argv))
    .command('$0 <dir>', 'build and/or upload creds', (yargsBuilder: Argv) =>
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
        }),
    )
    .help()
    .parse()) as unknown as CreddArgs;

  const rawDir = (argv.dir as string) || '.';
  const dirname = resolve(process.cwd(), rawDir);
  const { build: isBuild, upload: isUpload, recursive: isDeep, force } = argv;

  if (isDeep) {
    if (isBuild) {
      const res = await buildDeep(dirname, { force, log });
      log.debug('BuildDeep result:', res);
    }
    if (isUpload) {
      const res = await uploadDeep(dirname, { force, log });
      log.debug('UploadDeep result:', res); 
    }
  } else {

    if (isBuild) {
      const res = await build(dirname, { force, log });
      log.debug('Build result:', res);
    }
    if (isUpload) {
      const res = await upload(dirname, { force, log });
      log.debug('Upload result:', res);
    } 
  }
}

main().catch((err) => {
  log.error('Error:', err);
  process.exit(1);
});
