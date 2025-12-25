import * as assert from 'node:assert';
import { describe, test, before, after } from 'node:test';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { createService } from '../../src/core/createService.js';
import { GithubService } from '../../src/services/GithubService.js';
import { GitlabService } from '../../src/services/GitlabService.js';

describe('createService', () => {
  let testDir: string;

  before(async () => {
    testDir = join(tmpdir(), `credd-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
  });

  after(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  test('should create GithubService for github serviceName', async () => {
    const configContent = `module.exports = {
      service: {
        serviceName: 'github',
        token: 'github-token',
        projectPath: 'owner/repo',
        projectName: 'Test Project',
        projectCredsUrl: 'https://github.com/owner/repo',
        projectCredsOwner: '@owner',
      },
    };`;

    await writeFile(join(testDir, 'config.js'), configContent);

    const service = await createService(testDir);

    assert(service instanceof GithubService);
    assert.strictEqual(service.getProjectPath(), 'owner/repo');
  });

  test('should create GitlabService for gitlab serviceName', async () => {
    const configContent = `module.exports = {
      service: {
        serviceName: 'gitlab',
        token: 'gitlab-token',
        projectId: '123',
        projectPath: 'group/project',
        server: 'gitlab.com',
        projectName: 'Test Project',
        projectCredsUrl: 'https://gitlab.com/group/project',
        projectCredsOwner: '@group',
      },
    };`;

    await writeFile(join(testDir, 'config.js'), configContent);

    const service = await createService(testDir);

    assert(service instanceof GitlabService);
    assert.strictEqual(service.getProjectPath(), 'group/project');
    assert.strictEqual(service.getProjectId(), '123');
  });

  test('should throw error when serviceName is missing', async () => {
    const configContent = `module.exports = {
      service: {
        token: 'token',
        projectPath: 'owner/repo',
      },
    };`;

    await writeFile(join(testDir, 'config.js'), configContent);

    await assert.rejects(
      async () => {
        await createService(testDir);
      },
      (error: any) => {
        return error.code === '!serviceName' || error.message.includes('serviceName');
      },
    );
  });

  test('should throw error for incorrect serviceName', async () => {
    const configContent = `module.exports = {
      service: {
        serviceName: 'unknown',
        token: 'token',
        projectPath: 'owner/repo',
      },
    };`;

    await writeFile(join(testDir, 'config.js'), configContent);

    await assert.rejects(
      async () => {
        await createService(testDir);
      },
      (error: any) => {
        return error.code === 'incorrect serviceName' || error.message.includes('serviceName');
      },
    );
  });

  test('should pass force option to service', async () => {
    const configContent = `module.exports = {
      service: {
        serviceName: 'github',
        token: 'github-token',
        projectPath: 'owner/repo',
        projectName: 'Test Project',
        projectCredsUrl: 'https://github.com/owner/repo',
        projectCredsOwner: '@owner',
      },
    };`;

    await writeFile(join(testDir, 'config.js'), configContent);

    const service = await createService(testDir, { force: true });

    assert(service instanceof GithubService);
    assert.strictEqual(service.force, true);
  });
});

