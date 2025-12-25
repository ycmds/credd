import { readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

export async function getFiles(dir: string) {
  // TODO: иногда возвращает странность
  const dirents = await readdir(dir, { withFileTypes: true });
  const files = (await Promise.all(
    dirents.map((dirent) => {
      const filename = resolve(dir, dirent.name);
      return dirent.isDirectory()
        ? getFiles(filename)
        : { name: dirent.name, dir: resolve(dir), filename };
    }),
  )) as any[];
  return files.flat();
}
