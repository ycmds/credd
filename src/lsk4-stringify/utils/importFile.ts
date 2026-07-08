import { existsSync as exists } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { fromPairs } from '@lsk4/algos';
import { Err } from '@lsk4/err';
import { lazyLog } from '@lsk4/log';
import yaml from 'js-yaml';

import { getFileFormat } from './getFileFormat.js';
import { guessFileFormat } from './guessFileFormat.js';
import { importRequire } from './importRequire.js';
import { undefaultModule } from './undefaultModule.js';

function parseEnvValue(value: string): unknown {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 'null') return null;
  if (value === 'undefined') return undefined;
  if (value !== '' && !Number.isNaN(Number(value))) return Number(value);
  return value;
}

export type ImportFileOptions = {
  format?: string;
  undefault?: boolean;
};

export async function importFile(
  filename: string,
  { format: initFormat, undefault = true }: ImportFileOptions = {},
) {
  const format = initFormat ? getFileFormat(initFormat) : guessFileFormat(filename);
  if (!format) throw new Err('cantGuessFormat', { data: { filename } });
  if (!exists(filename)) return null;
  try {
    if (format === 'cjs' || format === 'esm') {
      const data = await importRequire(filename, { removeCache: true });
      // Unwrap the ESM default export. Node's require(esm) (Node 22+) returns a
      // CJS-interop wrapper `{ __esModule: true, default: {...} }`, while a native
      // dynamic import()/tsx returns a plain `{ default: {...} }`. Both must unwrap
      // to `.default`; otherwise the wrapper leaks through and causes false
      // "updated" rewrites on identical content.
      return undefault ? undefaultModule(data) : data;
    }
    const str = (await readFile(filename)).toString();
    // if (format === 'sh') {
    //   const raw = readFile(filename);
    //   return raw.toString().split('\n').map((a) => {
    //     const s = a.trim();
    //     if (s[0] === '#') return null;
    //     return s;
    //   }).join('\n');
    // }
    if (format === 'json') {
      const raw = JSON.parse(str);
      delete raw.__comment__;
      return raw;
    }
    if (format === 'env') {
      if (!str) return [];
      const keyvalues = String(str)
        .split('\n')
        .map((a) => {
          const s = a.trim();
          if (s[0] === '#') return null;
          if (s.indexOf('=') === -1) return null;
          const delimiter = s.indexOf('=');
          const key = s.substr(0, delimiter);
          if (!key) return null;
          const value = s.substr(delimiter + 1);
          return [key, parseEnvValue(value)];
        })
        .filter(Boolean) as [string, unknown][];
      // console.log({ str, keyvalues });
      return fromPairs(keyvalues);
    }
    if (format === 'yml') {
      return yaml.load(str);
    }
    throw new Err('incorrectFormat', { data: { format } });
  } catch (err) {
    // TODO: обработать ошибку если
    lazyLog('stringify').trace('importFile error', err, { filename, format });
    return null;
  }
}

export default importFile;
