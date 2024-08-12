import { defineConfig } from 'tsup';

export default defineConfig({
	entry: ['src/index.ts'],
	format: 'esm',
	minify: true,
	banner: { js: 'import{createRequire as __cR}from "module";const require=__cR(import.meta.url);' },
});
