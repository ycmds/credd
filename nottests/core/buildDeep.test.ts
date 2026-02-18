import * as assert from 'node:assert';
import { describe, test, before, after } from 'node:test';
import { mkdir, writeFile, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { buildDeep } from '../../src/core/buildDeep.js';

describe('buildDeep', () => {
  let testDir: string;

  before(async () => {
    testDir = join(tmpdir(), `credd-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
  });

  after(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  test('should build all projects with index.js recursively', async () => {
    const project1Dir = join(testDir, 'project1');
    const project2Dir = join(testDir, 'project2');

    await mkdir(project1Dir, { recursive: true });
    await mkdir(project2Dir, { recursive: true });

    // Create index.js files (required for buildDeep)
    await writeFile(join(project1Dir, 'index.js'), '// project1');
    await writeFile(join(project2Dir, 'index.js'), '// project2');

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

    await buildDeep(testDir, { force: true });

    const build1Dir = join(project1Dir, 'build');
    const build2Dir = join(project2Dir, 'build');

    const file1Exists = await stat(join(build1Dir, 'file1.json')).then(() => true).catch(() => false);
    const file2Exists = await stat(join(build2Dir, 'file2.json')).then(() => true).catch(() => false);

    assert.ok(file1Exists, 'Project 1 should be built');
    assert.ok(file2Exists, 'Project 2 should be built');
  });

  test('should skip directories without index.js', async () => {
    const projectWithIndex = join(testDir, 'with-index');
    const projectWithoutIndex = join(testDir, 'without-index');

    await mkdir(projectWithIndex, { recursive: true });
    await mkdir(projectWithoutIndex, { recursive: true });

    await writeFile(join(projectWithIndex, 'index.js'), '// has index');
    await writeFile(join(projectWithoutIndex, 'config.js'), 'module.exports = {};');

    const config = `module.exports = {
      service: {
        serviceName: 'github',
        token: 'token',
        projectPath: 'owner/repo',
        projectName: 'Project',
        projectCredsUrl: 'https://github.com/owner/repo',
        projectCredsOwner: '@owner',
      },
      files: [
        {
          name: 'file',
          filename: 'file.json',
          credType: 'secret',
          type: 'json',
          handler: () => ({ built: true }),
        },
      ],
    };`;

    await writeFile(join(projectWithIndex, 'config.js'), config);

    await buildDeep(testDir, { force: true });

    const buildDir = join(projectWithIndex, 'build');
    const fileExists = await stat(join(buildDir, 'file.json')).then(() => true).catch(() => false);

    assert.ok(fileExists, 'Project with index.js should be built');

    // Project without index.js should not have build directory
    const buildDirWithout = join(projectWithoutIndex, 'build');
    const buildDirExists = await stat(buildDirWithout).then(() => true).catch(() => false);
    assert.ok(!buildDirExists, 'Project without index.js should not be built');
  });

  test('should handle errors gracefully', async () => {
    const project1Dir = join(testDir, 'error-project1');
    const project2Dir = join(testDir, 'error-project2');

    await mkdir(project1Dir, { recursive: true });
    await mkdir(project2Dir, { recursive: true });

    await writeFile(join(project1Dir, 'index.js'), '// project1');
    await writeFile(join(project2Dir, 'index.js'), '// project2');

    // Valid config
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

    // Invalid config (missing service)
    const config2 = `module.exports = {
      files: [],
    };`;

    await writeFile(join(project1Dir, 'config.js'), config1);
    await writeFile(join(project2Dir, 'config.js'), config2);

    // Should not throw, but log errors
    await buildDeep(testDir, { force: true });

    // Project 1 should still be built
    const build1Dir = join(project1Dir, 'build');
    const file1Exists = await stat(join(build1Dir, 'file1.json')).then(() => true).catch(() => false);
    assert.ok(file1Exists, 'Valid project should still be built despite errors in other projects');
  });
});

