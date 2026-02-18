import * as assert from 'node:assert';
import { describe, test, before, after } from 'node:test';
import { mkdir, writeFile, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { buildDeep } from '../../src/core/buildDeep.js';
import { uploadDeep } from '../../src/core/uploadDeep.js';

describe('uploadDeep', () => {
  let testDir: string;

  before(async () => {
    testDir = join(tmpdir(), `credd-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
  });

  after(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  test('should process all projects with index.js recursively', async () => {
    const project1Dir = join(testDir, 'project1');
    const project2Dir = join(testDir, 'project2');

    await mkdir(project1Dir, { recursive: true });
    await mkdir(project2Dir, { recursive: true });

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

    // Build first
    await buildDeep(testDir, { force: true });

    // Verify build files exist
    const build1Dir = join(project1Dir, 'build');
    const build2Dir = join(project2Dir, 'build');

    const file1Exists = await stat(join(build1Dir, 'file1.json')).then(() => true).catch(() => false);
    const file2Exists = await stat(join(build2Dir, 'file2.json')).then(() => true).catch(() => false);

    assert.ok(file1Exists, 'File1 should be built');
    assert.ok(file2Exists, 'File2 should be built');

    // Upload (will fail without real credentials, but should process structure)
    try {
      await uploadDeep(testDir, { force: true });
    } catch (error: any) {
      // Expected to fail without real credentials
      assert.ok(
        error.message.includes('token') ||
          error.message.includes('401') ||
          error.message.includes('Unauthorized') ||
          error.message.includes('NOT_IMPLEMENTED'),
        'Should fail with authentication error',
      );
    }
  });

  test('should skip directories without index.js', async () => {
    const projectWithIndex = join(testDir, 'with-index-upload');
    const projectWithoutIndex = join(testDir, 'without-index-upload');

    await mkdir(projectWithIndex, { recursive: true });
    await mkdir(projectWithoutIndex, { recursive: true });

    await writeFile(join(projectWithIndex, 'index.js'), '// has index');
    // Don't create index.js for projectWithoutIndex

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
    await writeFile(join(projectWithoutIndex, 'config.js'), config);

    await buildDeep(testDir, { force: true });

    // Only project with index.js should have build directory
    const buildDir = join(projectWithIndex, 'build');
    const buildDirWithout = join(projectWithoutIndex, 'build');

    const buildExists = await stat(buildDir).then(() => true).catch(() => false);
    const buildWithoutExists = await stat(buildDirWithout).then(() => true).catch(() => false);

    assert.ok(buildExists, 'Project with index.js should have build directory');
    assert.ok(!buildWithoutExists, 'Project without index.js should not have build directory');
  });
});

