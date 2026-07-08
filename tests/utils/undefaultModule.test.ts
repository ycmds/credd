import * as assert from 'node:assert';
import { describe, test } from 'node:test';
import { undefaultModule } from '../../src/lsk4-stringify/utils/undefaultModule.js';

describe('undefaultModule - unwrap ESM default from module shapes', () => {
  const payload = { __debug: true, webserver: { port: 3000 }, proxy: null };

  test('unwraps native import() shape { default }', () => {
    assert.deepStrictEqual(undefaultModule({ default: payload }), payload);
  });

  test('unwraps Node require(esm) interop shape { __esModule, default }', () => {
    // This is the shape that leaked through before the fix and caused false
    // "updated" rewrites on identical .mjs/.cjs content under plain Node 22+.
    assert.deepStrictEqual(undefaultModule({ __esModule: true, default: payload }), payload);
  });

  test('keeps a module with named exports untouched', () => {
    const mod = { __esModule: true, default: payload, extra: 1 };
    assert.deepStrictEqual(undefaultModule(mod), mod);
  });

  test('keeps a plain CJS object untouched', () => {
    const cjs = { a: 1, b: 2 };
    assert.deepStrictEqual(undefaultModule(cjs), cjs);
  });

  test('passes through non-objects', () => {
    assert.strictEqual(undefaultModule(null), null);
    assert.strictEqual(undefaultModule('str'), 'str');
    assert.strictEqual(undefaultModule(42), 42);
  });
});
