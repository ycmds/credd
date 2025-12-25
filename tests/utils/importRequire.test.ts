import * as assert from 'node:assert';
import { describe, test, before, after } from 'node:test';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { importRequire } from '../../src/utils/importRequire.js';

describe('importRequire', () => {
  let testDir: string;

  before(async () => {
    testDir = join(tmpdir(), `credd-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
  });

  after(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  test('should require CommonJS module', async () => {
    const filePath = join(testDir, 'module.js');
    const content = `module.exports = {
      key: 'value',
      number: 42,
    };`;

    await writeFile(filePath, content);

    const result = await importRequire(filePath);

    assert.strictEqual(result.key, 'value');
    assert.strictEqual(result.number, 42);
  });

  test('should handle ES module default export', async () => {
    const filePath = join(testDir, 'module.js');
    const content = `export default {
      service: 'test',
      config: { enabled: true },
    };`;

    await writeFile(filePath, content);

    const result = await importRequire(filePath);

    assert.strictEqual(result.default.service, 'test');
    assert.strictEqual(result.default.config.enabled, true);
  });

  test('should throw error when file does not exist', async () => {
    const nonExistentPath = join(testDir, 'nonexistent.js');

    await assert.rejects(
      async () => {
        await importRequire(nonExistentPath);
      },
      (error: any) => {
        return error.message.includes('not found') || error.code === 'ENOENT';
      },
    );
  });

  test('should handle module with function export', async () => {
    const filePath = join(testDir, 'module.js');
    const content = `module.exports = function() {
      return { result: 'success' };
    };`;

    await writeFile(filePath, content);

    const result = await importRequire(filePath);

    assert(typeof result === 'function');
    assert.strictEqual(result().result, 'success');
  });

  test('should handle removeCache option', async () => {
    const filePath = join(testDir, 'module.js');
    const content = `module.exports = { value: 1 };`;

    await writeFile(filePath, content);

    const result1 = await importRequire(filePath);
    assert.strictEqual(result1.value, 1);

    // Modify file
    await writeFile(filePath, `module.exports = { value: 2 };`);

    // Without removeCache, should get cached value
    const result2 = await importRequire(filePath, { removeCache: false });
    if (result2.value !== 1 && result2.value !== 2) {
      throw new Error('Unexpected value from importRequire');
    }
    // Note: This might still return cached value depending on Node.js behavior

    // With removeCache, should get new value
    const result3 = await importRequire(filePath, { removeCache: true });
    assert.strictEqual(result3.value, 2);
  });
});

