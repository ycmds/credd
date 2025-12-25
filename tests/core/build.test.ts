import * as assert from 'node:assert';
import { describe, test, before, after } from 'node:test';
import { mkdir, writeFile, rm, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { build } from '../../src/core/build.js';

describe('build', () => {
  let testDir: string;
  let buildDir: string;

  before(async () => {
    testDir = join(tmpdir(), `credd-test-${Date.now()}`);
    buildDir = join(testDir, 'build');
    await mkdir(testDir, { recursive: true });
  });

  after(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  test('should build files from config', async () => {
    const configContent = `module.exports = {
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
          name: 'test-secret',
          filename: 'test-secret.json',
          credType: 'secret',
          type: 'json',
          handler: () => ({ key: 'value', number: 42 }),
        },
      ],
    };`;

    await writeFile(join(testDir, 'config.js'), configContent);

    await build(testDir, { buildDir });

    // Check that build directory was created
    const buildDirExists = await stat(buildDir).then(() => true).catch(() => false);
    assert(buildDirExists, 'Build directory should exist');

    // Check that file was created
    const filePath = join(buildDir, 'test-secret.json');
    const fileExists = await stat(filePath).then(() => true).catch(() => false);
    assert(fileExists, 'Build file should exist');

    // Check file content
    const content = await readFile(filePath, 'utf-8');
    const parsed = JSON.parse(content);
    assert.strictEqual(parsed.key, 'value');
    assert.strictEqual(parsed.number, 42);
  });

  test('should handle multiple files', async () => {
    const configContent = `module.exports = {
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
          name: 'file1',
          filename: 'file1.json',
          credType: 'secret',
          type: 'json',
          handler: () => ({ file: 1 }),
        },
        {
          name: 'file2',
          filename: 'file2.json',
          credType: 'variable',
          type: 'json',
          handler: () => ({ file: 2 }),
        },
      ],
    };`;

    await writeFile(join(testDir, 'config.js'), configContent);

    await build(testDir, { buildDir });

    const file1Path = join(buildDir, 'file1.json');
    const file2Path = join(buildDir, 'file2.json');

    const file1Exists = await stat(file1Path).then(() => true).catch(() => false);
    const file2Exists = await stat(file2Path).then(() => true).catch(() => false);

    assert(file1Exists, 'File1 should exist');
    assert(file2Exists, 'File2 should exist');

    const content1 = await readFile(file1Path, 'utf-8');
    const content2 = await readFile(file2Path, 'utf-8');

    assert.strictEqual(JSON.parse(content1).file, 1);
    assert.strictEqual(JSON.parse(content2).file, 2);
  });

  test('should handle async handler', async () => {
    const configContent = `module.exports = {
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
          name: 'async-file',
          filename: 'async-file.json',
          credType: 'secret',
          type: 'json',
          handler: async () => {
            await new Promise(resolve => setTimeout(resolve, 10));
            return { async: true };
          },
        },
      ],
    };`;

    await writeFile(join(testDir, 'config.js'), configContent);

    await build(testDir, { buildDir });

    const filePath = join(buildDir, 'async-file.json');
    const content = await readFile(filePath, 'utf-8');
    assert.strictEqual(JSON.parse(content).async, true);
  });

  test('should handle empty files array', async () => {
    const configContent = `module.exports = {
      service: {
        serviceName: 'github',
        token: 'test-token',
        projectPath: 'owner/repo',
        projectName: 'Test Project',
        projectCredsUrl: 'https://github.com/owner/repo',
        projectCredsOwner: '@owner',
      },
      files: [],
    };`;

    await writeFile(join(testDir, 'config.js'), configContent);

    await build(testDir, { buildDir });

    // Build directory should still be created
    const buildDirExists = await stat(buildDir).then(() => true).catch(() => false);
    assert(buildDirExists, 'Build directory should exist');
  });

  test('should use custom buildDir when provided', async () => {
    const customBuildDir = join(testDir, 'custom-build');
    const configContent = `module.exports = {
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
          name: 'custom-file',
          filename: 'custom.json',
          credType: 'secret',
          type: 'json',
          handler: () => ({ custom: true }),
        },
      ],
    };`;

    await writeFile(join(testDir, 'config.js'), configContent);

    await build(testDir, { buildDir: customBuildDir });

    const filePath = join(customBuildDir, 'custom.json');
    const fileExists = await stat(filePath).then(() => true).catch(() => false);
    assert(fileExists, 'File should be in custom build directory');
  });
});

