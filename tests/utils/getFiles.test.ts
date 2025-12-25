import * as assert from 'node:assert';
import { describe, test, before, after } from 'node:test';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { getFiles } from '../../src/utils/getFiles.js';

describe('getFiles', () => {
  let testDir: string;

  before(async () => {
    testDir = join(tmpdir(), `credd-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
  });

  after(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  test('should return empty array for empty directory', async () => {
    const result = await getFiles(testDir);
    assert(Array.isArray(result));
    assert.strictEqual(result.length, 0);
  });

  test('should return all files recursively', async () => {
    await writeFile(join(testDir, 'file1.txt'), 'content1');
    await writeFile(join(testDir, 'file2.js'), 'content2');
    await mkdir(join(testDir, 'subdir'), { recursive: true });
    await writeFile(join(testDir, 'subdir', 'file3.json'), 'content3');

    const result = await getFiles(testDir);

    assert(Array.isArray(result));
    assert(result.length >= 3);

    const fileNames = result.map((file) => file.name);
    assert(fileNames.includes('file1.txt'));
    assert(fileNames.includes('file2.js'));
    assert(fileNames.includes('file3.json'));
  });

  test('should not include directories in result', async () => {
    await mkdir(join(testDir, 'dir1'), { recursive: true });
    await writeFile(join(testDir, 'file1.txt'), 'content');

    const result = await getFiles(testDir);

    const fileNames = result.map((file) => file.name);
    assert(fileNames.includes('file1.txt'));
    assert(!fileNames.includes('dir1'));
  });

  test('should return files with correct structure', async () => {
    await writeFile(join(testDir, 'test-file.txt'), 'content');

    const result = await getFiles(testDir);

    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].name, 'test-file.txt');
    assert(result[0].dir);
    assert(result[0].filename);
    assert(result[0].filename.includes('test-file.txt'));
  });

  test('should handle nested file structure', async () => {
    await mkdir(join(testDir, 'level1', 'level2'), { recursive: true });
    await writeFile(join(testDir, 'level1', 'level2', 'nested.txt'), 'content');

    const result = await getFiles(testDir);

    const fileNames = result.map((file) => file.name);
    assert(fileNames.includes('nested.txt'));
  });
});

