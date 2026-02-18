import * as assert from 'node:assert';
import { describe, test, before, after } from 'node:test';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { getDirs } from '../../src/utils/getDirs.js';

describe('getDirs', () => {
  let testDir: string;

  before(async () => {
    testDir = join(tmpdir(), `credd-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
  });

  after(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  test('should return empty array for empty directory', async () => {
    const result = await getDirs(testDir);
    assert.ok(Array.isArray(result));
    assert.strictEqual(result.length, 0);
  });

  test('should return all subdirectories recursively', async () => {
    // Create directory structure:
    // testDir/
    //   dir1/
    //   dir2/
    //     subdir1/
    //   dir3/

    await mkdir(join(testDir, 'dir1'), { recursive: true });
    await mkdir(join(testDir, 'dir2'), { recursive: true });
    await mkdir(join(testDir, 'dir2', 'subdir1'), { recursive: true });
    await mkdir(join(testDir, 'dir3'), { recursive: true });

    const result = await getDirs(testDir);

    assert.ok(Array.isArray(result));
    assert.ok(result.length >= 3);

    const dirNames = result.map((dir) => dir.name);
    assert.ok(dirNames.includes('dir1'));
    assert.ok(dirNames.includes('dir2'));
    assert.ok(dirNames.includes('dir3'));
    assert.ok(dirNames.includes('subdir1'));
  });

  test('should not include files in result', async () => {
    await mkdir(join(testDir, 'dir1'), { recursive: true });
    await writeFile(join(testDir, 'file1.txt'), 'content');

    const result = await getDirs(testDir);

    const dirNames = result.map((dir) => dir.name);
    assert.ok(dirNames.includes('dir1'));
    assert.ok(!dirNames.includes('file1.txt'));
  });

  test('should return directories with correct structure', async () => {
    await mkdir(join(testDir, 'test-dir'), { recursive: true });

    const result = await getDirs(testDir);

    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].name, 'test-dir');
    assert.ok(result[0].dir);
    assert.ok(result[0].filename);
    assert.ok(result[0].filename.includes('test-dir'));
  });

  test('should handle nested directory structure', async () => {
    await mkdir(join(testDir, 'level1', 'level2', 'level3'), { recursive: true });

    const result = await getDirs(testDir);

    const dirNames = result.map((dir) => dir.name);
    assert.ok(dirNames.includes('level1'));
    assert.ok(dirNames.includes('level2'));
    assert.ok(dirNames.includes('level3'));
  });
});

