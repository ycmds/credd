import { Err } from '@lsk4/err';

// Import or require
export async function importRequire(path: string, { removeCache }: { removeCache?: boolean } = {}) {
  // Check if require is available (CommonJS context)
  const hasRequire = typeof require !== 'undefined' && typeof require.resolve === 'function';
  
  if (hasRequire) {
    try {
      const res = require(path);
      if (removeCache) delete require.cache[require.resolve(path)];
      return res;
    } catch (requireErr) {
      if (Err.getCode(requireErr) === 'MODULE_NOT_FOUND') {
        throw new Err(`${path} not found`, requireErr);
      }
      const errorMessage = String(requireErr);
      const isTryImport =
        Err.getCode(requireErr).startsWith('Dynamic require of') ||
        Err.getCode(requireErr).startsWith(
          'ReferenceError: module is not defined in ES module scope',
        ) ||
        errorMessage.includes('require is not defined') ||
        errorMessage.includes('require is not a function');
      if (isTryImport) {
        // Fall through to import
      } else {
        throw new Err('requireErr', requireErr);
      }
    }
  }

  // Try import (ES modules)
  try {
    const res = await import(path);
    // TODO: remove cache
    return res;
  } catch (importErr) {
    if (Err.getCode(importErr) === 'ERR_MODULE_NOT_FOUND') {
      throw new Err(`${path} not found`, importErr);
    }
    throw new Err('importErr', importErr);
  }
}
