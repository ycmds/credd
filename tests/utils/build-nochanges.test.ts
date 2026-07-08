import * as assert from 'node:assert';
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, test } from 'node:test';
import { jsonToFile } from '../../src/lsk4-stringify/index.js';
import { build } from '../../src/core/build.js';

describe('build nochanges - comment-only changes should not rewrite files', () => {
  let testDir: string;
  let buildDir: string;
  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'credd-nochanges-'));
    buildDir = join(testDir, 'build');
    await mkdir(buildDir, { recursive: true });
  });
  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('jsonToFile direct - same data, different comment', () => {
    const formats = ['json', 'cjs', 'esm', 'env', 'yml'] as const;

    for (const format of formats) {
      test(`${format}: should return nochanges when only comment differs`, async () => {
        const ext = { json: 'json', cjs: 'js', esm: 'ts', env: 'env', yml: 'yml' }[format];
        const filepath = join(buildDir, `test.${ext}`);
        const data = { key: 'value', number: 42, nested: { a: 1 } };

        const commentA = `Comment version A\nGenerated: 2024-01-01 00:00:00`;
        const commentB = `Comment version B\nGenerated: 2025-12-31 23:59:59`;

        // First write - creates the file
        const res1 = await jsonToFile(filepath, data, { format, comment: commentA, compare: true });
        assert.strictEqual(res1.status, 'created', `${format}: first write should be "created"`);

        // Verify file exists and has content
        const content1 = await readFile(filepath, 'utf-8');
        assert.ok(content1.length > 0, `${format}: file should have content`);

        // Second write - same data, different comment
        const res2 = await jsonToFile(filepath, data, { format, comment: commentB, compare: true });
        assert.strictEqual(res2.status, 'nochanges', `${format}: same data with different comment should be "nochanges"`);

        // Verify file content was NOT changed (still has old comment)
        const content2 = await readFile(filepath, 'utf-8');
        assert.strictEqual(content1, content2, `${format}: file content should not change`);
      });
    }

    for (const format of formats) {
      test(`${format}: should return updated when data actually changes`, async () => {
        const ext = { json: 'json', cjs: 'js', esm: 'ts', env: 'env', yml: 'yml' }[format];
        const filepath = join(buildDir, `test-change.${ext}`);
        const data1 = { key: 'value', number: 42 };
        const data2 = { key: 'value', number: 99 };
        const comment = `Some comment`;

        const res1 = await jsonToFile(filepath, data1, { format, comment, compare: true });
        assert.strictEqual(res1.status, 'created');

        const res2 = await jsonToFile(filepath, data2, { format, comment, compare: true });
        assert.strictEqual(res2.status, 'updated', `${format}: changed data should be "updated"`);
      });
    }
  });

  describe('build function - double build returns nochanges', () => {
    test('should return nochanges for all file types on second build', async () => {
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
      name: 'json-file',
      filename: 'test.json',
      credType: 'secret',
      type: 'json',
      handler: () => ({ key: 'value', number: 42 }),
    },
    {
      name: 'cjs-file',
      filename: 'test.js',
      credType: 'secret',
      type: 'cjs',
      handler: () => ({ key: 'value', number: 42 }),
    },
    {
      name: 'esm-file',
      filename: 'test.ts',
      credType: 'secret',
      type: 'esm',
      handler: () => ({ key: 'value', number: 42 }),
    },
    {
      name: 'env-file',
      filename: 'test.env',
      credType: 'secret',
      type: 'env',
      handler: () => ({ key: 'value', number: 42 }),
    },
    {
      name: 'yml-file',
      filename: 'test.yml',
      credType: 'secret',
      type: 'yml',
      handler: () => ({ key: 'value', number: 42 }),
    },
  ],
};`.trim();
      await writeFile(join(testDir, 'config.js'), configContent);

      // First build - all files should be created
      const res1 = await build(testDir, { buildDir });
      for (const file of res1.files) {
        assert.strictEqual(file.status, 'created', `${file.name}: first build should be "created"`);
      }

      // Second build - same data, no changes expected
      const res2 = await build(testDir, { buildDir });
      for (const file of res2.files) {
        assert.strictEqual(
          file.status,
          'nochanges',
          `${file.name}: second build with same data should be "nochanges"`,
        );
      }
    });

    test('should return updated when handler data changes between builds', async () => {
      // We can't use a closure in config.js string, so we use a file-based approach
      const configContent1 = `
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
      name: 'json-file',
      filename: 'test.json',
      credType: 'secret',
      type: 'json',
      handler: () => ({ key: 'value', version: 1 }),
    },
  ],
};`.trim();

      const configContent2 = `
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
      name: 'json-file',
      filename: 'test.json',
      credType: 'secret',
      type: 'json',
      handler: () => ({ key: 'value', version: 2 }),
    },
  ],
};`.trim();

      await writeFile(join(testDir, 'config.js'), configContent1);
      const res1 = await build(testDir, { buildDir });
      assert.strictEqual(res1.files[0].status, 'created');

      await writeFile(join(testDir, 'config.js'), configContent2);
      const res2 = await build(testDir, { buildDir });
      assert.strictEqual(res2.files[0].status, 'updated', 'changed data should be "updated"');
    });

    test('file mtime should not change when content is unchanged', async () => {
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
      name: 'json-file',
      filename: 'test.json',
      credType: 'secret',
      type: 'json',
      handler: () => ({ key: 'stable' }),
    },
    {
      name: 'yml-file',
      filename: 'test.yml',
      credType: 'secret',
      type: 'yml',
      handler: () => ({ key: 'stable' }),
    },
    {
      name: 'env-file',
      filename: 'test.env',
      credType: 'secret',
      type: 'env',
      handler: () => ({ key: 'stable' }),
    },
  ],
};`.trim();
      await writeFile(join(testDir, 'config.js'), configContent);

      // First build
      await build(testDir, { buildDir });

      // Record mtimes
      const mtimes: Record<string, number> = {};
      for (const filename of ['test.json', 'test.yml', 'test.env']) {
        const s = await stat(join(buildDir, filename));
        mtimes[filename] = s.mtimeMs;
      }

      // Wait a bit to ensure mtime would change if file is rewritten
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Second build
      const res2 = await build(testDir, { buildDir });

      // Check mtimes haven't changed
      for (const file of res2.files) {
        if (file.status === 'nochanges') {
          const s = await stat(file.filepath);
          const filename = file.filepath.split('/').pop() ?? '';
          assert.strictEqual(
            s.mtimeMs,
            mtimes[filename],
            `${file.name}: mtime should not change when status is nochanges`,
          );
        }
      }
    });
  });

  describe('jsonToFile direct - manually altered comments should not trigger update', () => {
    test('json: manually changed comment in file should not cause update', async () => {
      const filepath = join(buildDir, 'manual.json');
      const data = { greeting: 'hello', count: 5 };

      await jsonToFile(filepath, data, { format: 'json', comment: 'Original comment', compare: true });

      // Manually alter the comment in the JSON file
      const content = await readFile(filepath, 'utf-8');
      const altered = content.replace('Original comment', 'Manually altered comment at 2099-01-01');
      await writeFile(filepath, altered);

      // Write same data - should detect no data change
      const res = await jsonToFile(filepath, data, { format: 'json', comment: 'New comment v3', compare: true });
      assert.strictEqual(res.status, 'nochanges', 'json: manually altered comment should not trigger update');
    });

    test('yml: manually changed comment in file should not cause update', async () => {
      const filepath = join(buildDir, 'manual.yml');
      const data = { greeting: 'hello', count: 5 };

      await jsonToFile(filepath, data, { format: 'yml', comment: 'Original comment', compare: true });

      const content = await readFile(filepath, 'utf-8');
      const altered = content.replace('Original comment', 'Manually altered comment at 2099-01-01');
      await writeFile(filepath, altered);

      const res = await jsonToFile(filepath, data, { format: 'yml', comment: 'New comment v3', compare: true });
      assert.strictEqual(res.status, 'nochanges', 'yml: manually altered comment should not trigger update');
    });

    test('env: manually changed comment in file should not cause update', async () => {
      const filepath = join(buildDir, 'manual.env');
      const data = { greeting: 'hello', count: 5 };

      await jsonToFile(filepath, data, { format: 'env', comment: 'Original comment', compare: true });

      const content = await readFile(filepath, 'utf-8');
      const altered = content.replace('Original comment', 'Manually altered comment at 2099-01-01');
      await writeFile(filepath, altered);

      const res = await jsonToFile(filepath, data, { format: 'env', comment: 'New comment v3', compare: true });
      assert.strictEqual(res.status, 'nochanges', 'env: manually altered comment should not trigger update');
    });

    test('cjs: manually changed comment in file should not cause update', async () => {
      const filepath = join(buildDir, 'manual.js');
      const data = { greeting: 'hello', count: 5 };

      await jsonToFile(filepath, data, { format: 'cjs', comment: 'Original comment', compare: true });

      const content = await readFile(filepath, 'utf-8');
      const altered = content.replace('Original comment', 'Manually altered comment at 2099-01-01');
      await writeFile(filepath, altered);

      const res = await jsonToFile(filepath, data, { format: 'cjs', comment: 'New comment v3', compare: true });
      assert.strictEqual(res.status, 'nochanges', 'cjs: manually altered comment should not trigger update');
    });

    test('esm: manually changed comment in file should not cause update', async () => {
      const filepath = join(buildDir, 'manual.ts');
      const data = { greeting: 'hello', count: 5 };

      await jsonToFile(filepath, data, { format: 'esm', comment: 'Original comment', compare: true });

      const content = await readFile(filepath, 'utf-8');
      const altered = content.replace('Original comment', 'Manually altered comment at 2099-01-01');
      await writeFile(filepath, altered);

      const res = await jsonToFile(filepath, data, { format: 'esm', comment: 'New comment v3', compare: true });
      assert.strictEqual(res.status, 'nochanges', 'esm: manually altered comment should not trigger update');
    });
  });
});
