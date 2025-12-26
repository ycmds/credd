import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Err } from '@lsk4/err';

// Import or require
export async function importRequire(path: string, { removeCache }: { removeCache?: boolean } = {}) {
  // Try to use createRequire for CommonJS modules in ES module context
  try {
    // Use the directory of the current file as the base for require
    const currentFile = fileURLToPath(import.meta.url);
    const currentDir = dirname(currentFile);
    const require = createRequire(`${currentDir}/`);

    // Resolve the path - it might be absolute or relative
    const resolvedPath = resolve(path);
    const res = require(resolvedPath);
    if (removeCache && require.cache) {
      delete require.cache[resolvedPath];
    }
    return res;
  } catch (requireErr: any) {
    const errorCode = Err.getCode(requireErr);
    if (errorCode === 'MODULE_NOT_FOUND' || errorCode === 'ERR_MODULE_NOT_FOUND') {
      // Fall through to try import
    } else {
      // If it's a different error (like syntax error), try import anyway
      // Fall through to import
    }
  }

  // Try import (ES modules)
  try {
    // For ES modules, Node.js import() can handle file paths directly
    // But we need to ensure it's an absolute path
    const importPath = resolve(path);
    const res = await import(importPath);
    // For ES modules, return the module object
    // If it has a default export, we'll handle it in loadConfig
    return res;
  } catch (importErr) {
    const errorCode = Err.getCode(importErr);
    if (errorCode === 'ERR_MODULE_NOT_FOUND') {
      throw new Err(`${path} not found`, importErr);
    }
    throw new Err('importErr', importErr);
  }
}
