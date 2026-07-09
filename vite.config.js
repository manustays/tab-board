import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
	base: './',
	plugins: [
		preact(),
		VitePWA({
			registerType: 'autoUpdate',
			manifest: false, // use public/manifest.webmanifest
			workbox: {
				globPatterns: ['**/*.{js,css,html,woff2,png}'],
				navigateFallback: 'index.html',
			},
		}),
	],
	test: {
		environment: 'jsdom',
		globals: true,
		setupFiles: ['./src/test-setup.js'],
	},
});
