import * as assert from 'node:assert';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, test } from 'node:test';

import { loadConfig } from '../../src/utils/loadConfig.js';

describe('loadConfig + require', () => {
  let testDir: string;
  beforeEach(async () => {
    testDir =  await mkdtemp(join(tmpdir(), 'credd-test-'));
    await mkdir(testDir, { recursive: true });
  });
  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  test('should load config.js file', async () => {

    const serviceConfig = `
    module.exports = {
      serviceName: 'github',
      token: 'test-token',
    };
    `.trim();
    await writeFile(join(testDir, 'serviceConfig.js'), serviceConfig);

    const secretsConfig = `
    module.exports = {
        TEST_SECRET: 'secret-value',
    };
    `.trim();
    await writeFile(join(testDir, 'secretsConfig.js'), secretsConfig);  

    const configContent = `
    module.exports = {
      service: require('./serviceConfig.js'),
      secrets: require('./secretsConfig.js'),
    };
    `.trim();
    await writeFile(join(testDir, 'config.js'), configContent);

    const result = await loadConfig(testDir);
    assert.strictEqual(result.path, join(testDir, 'config.js'));
    assert.strictEqual(result.config.service.serviceName, 'github');
    assert.strictEqual(result.config.service.token, 'test-token');
    assert.strictEqual(result.config.secrets.TEST_SECRET, 'secret-value');
  });

});
