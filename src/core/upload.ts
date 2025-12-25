import { readFile } from 'node:fs/promises';

import type { ILogger } from '@lsk4/log';
import { map } from 'fishbird';

import type { CredsService } from '../types.js';
import { createService } from './createService.js';

type UploadOptions = {
  buildDir?: string;
  log?: ILogger;
} & Partial<CredsService>;

export async function upload(serviceDirname: string, options: UploadOptions) {
  const buildDirDir = options.buildDir || `${serviceDirname}/build`;

  const service = await createService(serviceDirname, options);

  const rawFiles = service.getFiles();
  const variables = service.getVariables();
  const secrets = service.getSecrets();
  const hooks = service.getHooks();

  const files = await map(rawFiles, async (fileOptions: any) => {
    const { filename } = fileOptions;
    const content = await readFile(`${buildDirDir}/${filename}`).then((f) => f.toString());
    return {
      ...fileOptions,
      content,
    };
  });
  await service.uploadAll({
    files,
    variables,
    secrets,
    hooks,
  });
}
