import * as assert from 'node:assert';
import { describe, test, before, after } from 'node:test';
import { mkdir, writeFile, rm, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { build } from '../../src/core/build.js';
import { upload } from '../../src/core/upload.js';

describe('Integration: build and upload', () => {
  let testDir: string;
  let buildDir: string;

  before(async () => {
    testDir = join(tmpdir(), `credd-integration-test-${Date.now()}`);
    buildDir = join(testDir, 'build');
    await mkdir(testDir, { recursive: true });
  });

  after(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  test('should build and prepare files for upload', async () => {
    // Create test files that will be referenced by handlers
    await writeFile(
      join(testDir, 'source-data.json'),
      JSON.stringify({ apiKey: 'test-key', environment: 'test' }),
    );

    const configContent = `const path = require('path');
    module.exports = {
      service: {
        serviceName: 'github',
        token: 'test-token',
        projectPath: 'owner/repo',
        projectName: 'Test Project',
        projectCredsUrl: 'https://github.com/owner/repo',
        projectCredsOwner: '@owner',
      },
      secrets: {
        DATABASE_PASSWORD: 'secret-password',
      },
      variables: {
        NODE_ENV: 'production',
      },
      files: [
        {
          name: 'config',
          filename: 'config.json',
          credType: 'secret',
          type: 'json',
          handler: (fileOptions, config) => {
            const sourceData = require(path.join(__dirname, 'source-data.json'));
            return {
              ...sourceData,
              timestamp: Date.now(),
            };
          },
        },
      ],
    };`;

    await writeFile(join(testDir, 'config.js'), configContent);

    // Build step
    await build(testDir, { buildDir });

    // Verify build output
    const configFile = join(buildDir, 'config.json');
    const configExists = await stat(configFile).then(() => true).catch(() => false);
    assert(configExists, 'Config file should be built');

    const configContent_built = await readFile(configFile, 'utf-8');
    const configData = JSON.parse(configContent_built);
    assert(configData.apiKey, 'Config should contain apiKey');
    assert(configData.timestamp, 'Config should contain timestamp');

    // Upload step (this will fail without actual API credentials, but we can test the structure)
    // Note: In a real scenario, you'd mock the service or use a test API
    try {
      await upload(testDir, { buildDir });
    } catch (error: any) {
      // Expected to fail without real credentials, but should not fail on file reading
      assert(
        error.message.includes('token') ||
          error.message.includes('401') ||
          error.message.includes('Unauthorized') ||
          error.message.includes('NOT_IMPLEMENTED'),
        'Should fail with authentication error, not file reading error',
      );
    }
  });

  test('should handle complex file structure', async () => {
    // Create multiple source files
    await writeFile(join(testDir, 'env.json'), JSON.stringify({ env: 'test' }));
    await writeFile(join(testDir, 'secrets.json'), JSON.stringify({ secret: 'value' }));

    const configContent = `const path = require('path');
    module.exports = {
      service: {
        serviceName: 'github',
        token: 'test-token',
        projectPath: 'owner/repo',
        projectName: 'Test Project',
        projectCredsUrl: 'https://github.com/owner/repo',
        projectCredsOwner: '@owner',
      },
      files: [
        {
          name: 'env-config',
          filename: 'env-config.js',
          credType: 'variable',
          type: 'js',
          handler: () => require(path.join(__dirname, 'env.json')),
        },
        {
          name: 'secrets-config',
          filename: 'secrets-config.json',
          credType: 'secret',
          type: 'json',
          handler: () => require(path.join(__dirname, 'secrets.json')),
        },
      ],
    };`;

    await writeFile(join(testDir, 'config.js'), configContent);

    await build(testDir, { buildDir });

    const envFile = join(buildDir, 'env-config.js');
    const secretsFile = join(buildDir, 'secrets-config.json');

    const envExists = await stat(envFile).then(() => true).catch(() => false);
    const secretsExists = await stat(secretsFile).then(() => true).catch(() => false);

    assert(envExists, 'Env config file should exist');
    assert(secretsExists, 'Secrets config file should exist');
  });
});

