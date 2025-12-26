import * as assert from 'node:assert';
import { describe, test, before, after } from 'node:test';
import { mkdir, writeFile, rm, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { build } from '../../src/core/build.js';
import { buildDeep } from '../../src/core/buildDeep.js';

describe('Integration: Fixture-based tests', () => {
  let fixturesDir: string;
  let testProjectDir: string;

  before(async () => {
    fixturesDir = join(tmpdir(), `credd-fixtures-${Date.now()}`);
    testProjectDir = join(fixturesDir, 'test-project');
    await mkdir(fixturesDir, { recursive: true });
    await mkdir(testProjectDir, { recursive: true });
  });

  after(async () => {
    await rm(fixturesDir, { recursive: true, force: true });
  });

  test('should work with test-project fixture structure', async () => {
    // Create fixture similar to creds/tests2/test-project
    const configContent = `const path = require('path');

    module.exports = {
      service: {
        serviceName: 'github',
        token: 'TOKEN',
        projectPath: 'user/repo',
        projectName: 'Test Project',
        projectCredsUrl: 'https://github.com/user/repo',
        projectCredsOwner: '@user',
      },
      secrets: {
        very_secret: 'foo',
      },
      variables: {
        not_very_secret: 'variable',
      },
      files: [
        {
          credType: 'secret',
          name: 'test_secret',
          filename: 'test_secret.js',
          type: 'js',
          handler: (config) => require(path.join(__dirname, config.filename)),
        },
        {
          credType: 'variable',
          name: 'test_variable',
          filename: 'test_variable.js',
          type: 'js',
          handler: (config) => require(path.join(__dirname, config.filename)),
        },
      ],
    };`;

    await writeFile(join(testProjectDir, 'config.js'), configContent);
    await writeFile(
      join(testProjectDir, 'test_secret.js'),
      `module.exports = { AWS_S3_TOKEN: 'QWERTY' };`,
    );
    await writeFile(
      join(testProjectDir, 'test_variable.js'),
      `module.exports = { DOCKER_REGISTRY: 'registry.docker.com' };`,
    );

    const buildDir = join(testProjectDir, 'build');

    await build(testProjectDir, { buildDir, force: true });

    // Verify build output
    const secretFile = join(buildDir, 'test_secret.js');
    const variableFile = join(buildDir, 'test_variable.js');

    const secretExists = await stat(secretFile).then(() => true).catch(() => false);
    const variableExists = await stat(variableFile).then(() => true).catch(() => false);

    assert.ok(secretExists, 'test_secret.js should be built');
    assert.ok(variableExists, 'test_variable.js should be built');

    // Check content
    const secretContent = await readFile(secretFile, 'utf-8');
    const variableContent = await readFile(variableFile, 'utf-8');

    assert.ok(secretContent.includes('AWS_S3_TOKEN'), 'Secret file should contain AWS_S3_TOKEN');
    assert.ok(
      variableContent.includes('DOCKER_REGISTRY'),
      'Variable file should contain DOCKER_REGISTRY',
    );
  });

  test('should handle buildDeep with multiple projects', async () => {
    // Create multiple project directories
    const project1Dir = join(fixturesDir, 'project1');
    const project2Dir = join(fixturesDir, 'project2');

    await mkdir(project1Dir, { recursive: true });
    await mkdir(project2Dir, { recursive: true });

    // Create index.js files (required for buildDeep)
    await writeFile(join(project1Dir, 'index.js'), '// project1');
    await writeFile(join(project2Dir, 'index.js'), '// project2');

    // Create configs
    const config1 = `module.exports = {
      service: {
        serviceName: 'github',
        token: 'token1',
        projectPath: 'owner/repo1',
        projectName: 'Project 1',
        projectCredsUrl: 'https://github.com/owner/repo1',
        projectCredsOwner: '@owner',
      },
      files: [
        {
          name: 'file1',
          filename: 'file1.json',
          credType: 'secret',
          type: 'json',
          handler: () => ({ project: 1 }),
        },
      ],
    };`;

    const config2 = `module.exports = {
      service: {
        serviceName: 'github',
        token: 'token2',
        projectPath: 'owner/repo2',
        projectName: 'Project 2',
        projectCredsUrl: 'https://github.com/owner/repo2',
        projectCredsOwner: '@owner',
      },
      files: [
        {
          name: 'file2',
          filename: 'file2.json',
          credType: 'variable',
          type: 'json',
          handler: () => ({ project: 2 }),
        },
      ],
    };`;

    await writeFile(join(project1Dir, 'config.js'), config1);
    await writeFile(join(project2Dir, 'config.js'), config2);

    await buildDeep(fixturesDir, { force: true });

    // Verify both projects were built
    const build1Dir = join(project1Dir, 'build');
    const build2Dir = join(project2Dir, 'build');

    const file1Exists = await stat(join(build1Dir, 'file1.json')).then(() => true).catch(() => false);
    const file2Exists = await stat(join(build2Dir, 'file2.json')).then(() => true).catch(() => false);

    assert.ok(file1Exists, 'Project 1 should be built');
    assert.ok(file2Exists, 'Project 2 should be built');
  });

  test('should handle nested directory structure', async () => {
    const nestedDir = join(fixturesDir, 'nested', 'deep', 'project');
    await mkdir(nestedDir, { recursive: true });
    await writeFile(join(nestedDir, 'index.js'), '// nested project');

    const configContent = `module.exports = {
      service: {
        serviceName: 'github',
        token: 'token',
        projectPath: 'owner/nested',
        projectName: 'Nested Project',
        projectCredsUrl: 'https://github.com/owner/nested',
        projectCredsOwner: '@owner',
      },
      files: [
        {
          name: 'nested-file',
          filename: 'nested.json',
          credType: 'secret',
          type: 'json',
          handler: () => ({ nested: true }),
        },
      ],
    };`;

    await writeFile(join(nestedDir, 'config.js'), configContent);

    await buildDeep(fixturesDir, { force: true });

    const buildDir = join(nestedDir, 'build');
    const fileExists = await stat(join(buildDir, 'nested.json')).then(() => true).catch(() => false);

    assert.ok(fileExists, 'Nested project should be built');
  });
});

