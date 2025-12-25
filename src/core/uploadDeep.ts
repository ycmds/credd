import { existsSync } from 'node:fs';

import { Err } from '@lsk4/err';
import type { ILogger } from '@lsk4/log';
import { map, mapSeries } from 'fishbird';

import { getDirs } from '../utils/getDirs.js';
import { log } from '../utils/log.js';
import { upload } from './upload.js';

type UploadDeepOptions = {
  buildDir?: string;
  log?: ILogger;
  force?: boolean;
};

export async function uploadDeep(dirname: string, options: UploadDeepOptions = {}) {
  const rawFiles = await getDirs(dirname);
  const files = (
    await map(rawFiles, async (rawFile: any) => {
      const { filename } = rawFile;
      if (!(await existsSync(`${filename}/index.js`))) return null;
      return rawFile;
    })
  ).filter(Boolean);
  return mapSeries(files, async ({ filename }) => {
    await upload(filename, options).catch((err) => {
      log.error(`Build error ${filename}: `, Err.getMessage(err));
      log.error(err);
    });
  });
}
