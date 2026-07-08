// import { isEqual } from '@lskjs/algos';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { Err } from '@lsk4/err';
import { lazyLog } from '@lsk4/log';

import { jsonToString } from './jsonToString.js';
import type { FileFormat } from './types.js';
import { getDiffReason } from './utils/getDiffReason.js';
import { getFileFormat } from './utils/getFileFormat.js';
import { guessFileFormat } from './utils/guessFileFormat.js';
import { importFile } from './utils/importFile.js';

export type JsonToFileOptions = {
  format?: FileFormat;
  comment?: string;
  compare?: boolean;
  why?: boolean;
};

export type JsonToFileResult = {
  status: 'created' | 'updated' | 'nochanges';
};

export async function jsonToFile(
  filename: string,
  json: Record<string, unknown> | string,
  { format: initFormat, comment = '', compare = true, why = false }: JsonToFileOptions = {},
) {
  const format = initFormat ? getFileFormat(initFormat) : guessFileFormat(filename);
  if (!format) throw new Err('cantGuessFormat', { data: { filename } });
  const isExists = existsSync(filename);
  let whyReason = '';
  if (compare && isExists && typeof json !== 'string') {
    try {
      const data = await importFile(filename, { format });
      if (data != null) {
        // Compare the SERIALIZED body (no comment/date), NOT the parsed objects:
        // importFile round-trips lossily (e.g. env coerces "3000"→3000, objects→
        // "[object Object]"), so an object compare reports false "updated" and the
        // file gets rewritten with only a fresh Date line. Both bodies go through
        // the same serializer, so this comparison is exact.
        const bodyNew = jsonToString(json, { format });
        const bodyOld = jsonToString(data, { format });
        if (bodyNew === bodyOld) {
          return { status: 'nochanges' };
        }
        // --why: explain WHY we rewrite (redacted — key + type, never values).
        if (why) whyReason = getDiffReason(json, data, format);
      }
    } catch (err) {
      lazyLog('stringify').trace('jsonToFile compare error', err);
    }
  }
  await mkdir(path.dirname(filename), { recursive: true });

  const finalComment = whyReason ? `${comment}\nWhy updated: ${whyReason}`.trim() : comment;
  await writeFile(filename, jsonToString(json, { format, comment: finalComment }));
  return { status: isExists ? 'updated' : 'created' };
}

export default jsonToFile;
