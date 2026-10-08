import { defineConfig } from 'vitest/config';

export default defineConfig({
	// n8n-workflow ships source maps that point to files not published on npm; hide those warnings
	logLevel: 'error',
	test: {
		include: ['test/**/*.test.ts'],
		testTimeout: 30_000,
	},
});
