import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	test: {
		expect: {
			requireAssertions: true
		},
		coverage: {
			enabled: false,
			provider: 'v8',
			reporter: ['text', 'json', 'html', 'lcov'],
			reportsDirectory: './coverage',
			include: ['src/**/*.{js,ts,svelte}'],
			exclude: [
				'src/**/*.{test,spec}.{js,ts}',
				'src/**/*.svelte.{test,spec}.{js,ts}',
				'src/**/*.d.ts',
				'src/app.html',
				'src/hooks.*',
				'src/lib/vitest-examples/**',
				'src/lib/server/infras/db/schema/**',
				'src/lib/server/infras/db/testing.ts',
				'src/lib/server/services/study-set/study-set.testing.ts',
				'src/lib/components/ui/**'
			]
		},
		maxConcurrency: 20,
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
