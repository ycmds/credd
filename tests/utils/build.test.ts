import * as assert from 'node:assert';
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, test } from 'node:test';
import { build } from '../../src/core/build.js';

describe('build', () => {
  let testDir: string;
  let buildDir: string;
  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'credd-test-'));
    buildDir = join(testDir, 'build');
    await mkdir(testDir, { recursive: true });
  });
  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  test('should build files from config', async () => {
    const configContent = `
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
          name: 'json',
          filename: 'test.json',
          credType: 'secret',
          type: 'json',
          handler: (cnf) => ({ key: 'value', number: 42, cnf }),
        },
        {
          name: 'cjs',
          filename: 'test.js',
          credType: 'secret',
          type: 'cjs',
          handler: (cnf) => ({ key: 'value', number: 42, cnf }),
        },
        {
          name: 'esm',
          filename: 'test.ts',
          credType: 'secret',
          type: 'esm',
          handler: (cnf) => ({ key: 'value', number: 42, cnf }),
        },
        {
          name: 'env',
          filename: 'test.env',
          credType: 'secret',
          type: 'env',
          handler: (cnf) => ({ key: 'value', number: 42, cnf }),
        },
      ],
    };`.trim();
    await writeFile(join(testDir, 'config.js'), configContent);
    const res = await build(testDir, { buildDir });
    console.log('build result', res);

    // Check that build directory was created
    const buildDirExists = await stat(buildDir)
      .then(() => true)
      .catch(() => false);
    assert.ok(buildDirExists, 'Build directory should exist');

    // Check JSON file
    const jsonPath = join(buildDir, 'test.json');
    const jsonExists = await stat(jsonPath)
      .then(() => true)
      .catch(() => false);
    assert.ok(jsonExists, 'JSON file should exist');
    const jsonContent = await readFile(jsonPath, 'utf-8');
    const jsonParsed = JSON.parse(jsonContent);
    assert.strictEqual(jsonParsed.key, 'value');
    assert.strictEqual(jsonParsed.number, 42);
    assert.ok(jsonParsed.cnf, 'JSON should include config');

    // Check CJS file
    const cjsPath = join(buildDir, 'test.js');
    const cjsExists = await stat(cjsPath)
      .then(() => true)
      .catch(() => false);
    assert.ok(cjsExists, 'CJS file should exist');
    const cjsContent = await readFile(cjsPath, 'utf-8');
    assert.ok(cjsContent.includes('module.exports'), 'CJS should use module.exports');
    assert.ok(cjsContent.includes('key:'), 'CJS should contain key');
    assert.ok(cjsContent.includes(': 42'), 'CJS should contain number');

    // Check ESM file
    const esmPath = join(buildDir, 'test.ts');
    const esmExists = await stat(esmPath)
      .then(() => true)
      .catch(() => false);
    assert.ok(esmExists, 'ESM file should exist');
    const esmContent = await readFile(esmPath, 'utf-8');
    assert.ok(esmContent.includes('export default'), 'ESM should use export default');
    assert.ok(esmContent.includes('key:'), 'ESM should contain key');
    assert.ok(esmContent.includes(': 42'), 'ESM should contain number');

    // Check ENV file
    const envPath = join(buildDir, 'test.env');
    const envExists = await stat(envPath)
      .then(() => true)
      .catch(() => false);
    assert.ok(envExists, 'ENV file should exist');
    const envContent = await readFile(envPath, 'utf-8');
    assert.ok(envContent.includes('key=value'), 'ENV should contain key=value');
    assert.ok(envContent.includes('number=42'), 'ENV should contain number=42');
  });

  // test('should handle multiple files', async () => {
  //   const configContent = `module.exports = {
  //     service: {
  //       serviceName: 'github',
  //       token: 'test-token',
  //       projectPath: 'owner/repo',
  //       projectName: 'Test Project',
  //       projectCredsUrl: 'https://github.com/owner/repo',
  //       projectCredsOwner: '@owner',
  //     },
  //     files: [
  //       {
  //         name: 'file1',
  //         filename: 'file1.json',
  //         credType: 'secret',
  //         type: 'json',
  //         handler: () => ({ file: 1 }),
  //       },
  //       {
  //         name: 'file2',
  //         filename: 'file2.json',
  //         credType: 'variable',
  //         type: 'json',
  //         handler: () => ({ file: 2 }),
  //       },
  //     ],
  //   };`;

  //   await writeFile(join(testDir, 'config.js'), configContent);

  //   await build(testDir, { buildDir });

  //   const file1Path = join(buildDir, 'file1.json');
  //   const file2Path = join(buildDir, 'file2.json');

  //   const file1Exists = await stat(file1Path)
  //     .then(() => true)
  //     .catch(() => false);
  //   const file2Exists = await stat(file2Path)
  //     .then(() => true)
  //     .catch(() => false);

  //   assert.ok(file1Exists, 'File1 should exist');
  //   assert.ok(file2Exists, 'File2 should exist');

  //   const content1 = await readFile(file1Path, 'utf-8');
  //   const content2 = await readFile(file2Path, 'utf-8');

  //   assert.strictEqual(JSON.parse(content1).file, 1);
  //   assert.strictEqual(JSON.parse(content2).file, 2);
  // });

  // test('should handle async handler', async () => {
  //   const configContent = `module.exports = {
  //     service: {
  //       serviceName: 'github',
  //       token: 'test-token',
  //       projectPath: 'owner/repo',
  //       projectName: 'Test Project',
  //       projectCredsUrl: 'https://github.com/owner/repo',
  //       projectCredsOwner: '@owner',
  //     },
  //     files: [
  //       {
  //         name: 'async-file',
  //         filename: 'async-file.json',
  //         credType: 'secret',
  //         type: 'json',
  //         handler: async () => {
  //           await new Promise(resolve => setTimeout(resolve, 10));
  //           return { async: true };
  //         },
  //       },
  //     ],
  //   };`;

  //   await writeFile(join(testDir, 'config.js'), configContent);

  //   await build(testDir, { buildDir });

  //   const filePath = join(buildDir, 'async-file.json');
  //   const content = await readFile(filePath, 'utf-8');
  //   assert.strictEqual(JSON.parse(content).async, true);
  // });

  // test('should handle empty files array', async () => {
  //   const configContent = `module.exports = {
  //     service: {
  //       serviceName: 'github',
  //       token: 'test-token',
  //       projectPath: 'owner/repo',
  //       projectName: 'Test Project',
  //       projectCredsUrl: 'https://github.com/owner/repo',
  //       projectCredsOwner: '@owner',
  //     },
  //     files: [],
  //   };`;

  //   await writeFile(join(testDir, 'config.js'), configContent);

  //   await build(testDir, { buildDir });

  //   // Build directory should still be created
  //   const buildDirExists = await stat(buildDir)
  //     .then(() => true)
  //     .catch(() => false);
  //   assert.ok(buildDirExists, 'Build directory should exist');
  // });

  // test('should use custom buildDir when provided', async () => {
  //   const customBuildDir = join(testDir, 'custom-build');
  //   const configContent = `module.exports = {
  //     service: {
  //       serviceName: 'github',
  //       token: 'test-token',
  //       projectPath: 'owner/repo',
  //       projectName: 'Test Project',
  //       projectCredsUrl: 'https://github.com/owner/repo',
  //       projectCredsOwner: '@owner',
  //     },
  //     files: [
  //       {
  //         name: 'custom-file',
  //         filename: 'custom.json',
  //         credType: 'secret',
  //         type: 'json',
  //         handler: () => ({ custom: true }),
  //       },
  //     ],
  //   };`;

  //   await writeFile(join(testDir, 'config.js'), configContent);

  //   await build(testDir, { buildDir: customBuildDir });

  //   const filePath = join(customBuildDir, 'custom.json');
  //   const fileExists = await stat(filePath)
  //     .then(() => true)
  //     .catch(() => false);
  //   assert.ok(fileExists, 'File should be in custom build directory');
  // });
});
