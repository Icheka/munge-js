import { readdirSync } from 'fs';
import { defineConfig } from 'tsup';

const src = readdirSync('./src');

export default defineConfig(() => ({
  entry: src.map((file) => `src/${file}`),
  splitting: false,
  sourcemap: true,
  clean: true,
  dts: true,
  bundle: false,
  treeshake: true,
  target: ['node18', 'esnext']
}));
