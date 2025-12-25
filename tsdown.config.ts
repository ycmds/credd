import { defineConfig, type Options } from 'tsdown';

export default defineConfig({
  entry: ['src/**/*.ts', 'src/**/*.tsx'],
  format: 'esm',
  outDir: 'lib-tsdown',
  dts: true,
  clean: true,
  sourcemap: true,
} satisfies Options);