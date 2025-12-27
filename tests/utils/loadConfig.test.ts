import * as assert from 'node:assert';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, test } from 'node:test';

import { loadConfig } from '../../src/utils/loadConfig.js';

describe('loadConfig', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'credd-test-'));
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  test('should load config.js file', async () => {
    const configContent = `
    module.exports = {
      service: {
        serviceName: 'github',
        token: 'test-token',
        projectPath: 'owner/repo',
      },
      secrets: {
        TEST_SECRET: 'secret-value',
      },
    };
    `.trim();
    await writeFile(join(testDir, 'config.js'), configContent);
    const result = await loadConfig(testDir);
    assert.strictEqual(result.path, join(testDir, 'config.js'));
    assert.strictEqual(result.config.service.serviceName, 'github');
    assert.strictEqual(result.config.service.token, 'test-token');
    assert.strictEqual(result.config.secrets.TEST_SECRET, 'secret-value');
  });

  test('should handle ES module default export', async () => {
    const configContent = `
    export default {
      service: {
        serviceName: 'gitlab',
        token: 'gitlab-token',
        projectPath: 'group/project',
        projectId: '123',
        server: 'gitlab.com',
      },
    };
    `.trim();

    await writeFile(join(testDir, 'config.js'), configContent);

    const result = await loadConfig(testDir);

    assert.strictEqual(result.config.service.serviceName, 'gitlab');
    assert.strictEqual(result.config.service.projectId, '123');
  });

  test('should throw error when config.js does not exist', async () => {
    const nonExistentDir = join(tmpdir(), `credd-test-nonexistent-${Date.now()}`);

    await assert.rejects(
      async () => {
        await loadConfig(nonExistentDir);
      },
      (error: any) => {
        return error.code === 'CONFIG_NOT_FOUND' || error.message.includes('not found');
      },
    );
  });

  test('should load config with files array', async () => {
    const configContent = `
    module.exports = {
      service: {
        serviceName: 'github',
        token: 'test-token',
        projectPath: 'owner/repo',
      },
      files: [
        {
          name: 'test-file',
          filename: 'test.js',
          credType: 'secret',
          handler: () => ({ key: 'value' }),
        },
      ],
    };
    `.trim();

    await writeFile(join(testDir, 'config.js'), configContent);

    const result = await loadConfig(testDir);

    assert.ok(Array.isArray(result.config.files));
    assert.strictEqual(result.config.files.length, 1);
    assert.strictEqual(result.config.files[0].name, 'test-file');
  });

  test('should handle corrupted/invalid JS file with error', async () => {
    const corruptedContent = `
    module.exports = {
      service: {
        serviceName: 'github',
        token: 'test-token',
      invalid syntax here !!!
    };
    `.trim();

    await writeFile(join(testDir, 'config.js'), corruptedContent);

    await assert.rejects(
      async () => {
        await loadConfig(testDir);
      },
      (error: any) => {
        return (
          error instanceof SyntaxError ||
          error.message.includes('Unexpected') ||
          error.message.includes('syntax')
        );
      },
    );
  });
});
