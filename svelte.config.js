//import adapter from '@sveltejs/adapter-auto';
import adapter from '@sveltejs/adapter-static';
const dev = process.env.NODE_ENV === 'development'


/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		// adapter-auto only supports some environments, see https://kit.svelte.dev/docs/adapter-auto for a list.
		// If your environment is not supported or you settled on a specific environment, switch out the adapter.
		// See https://kit.svelte.dev/docs/adapters for more information about adapters.
		//adapter: adapter()
		adapter: adapter({
			fallback: 'index.html',
			pages: 'docs',
			assets: 'docs',
		}),
		paths: {
			base: dev ? '': '/jtr-stats-2023'
		},

	}
};

export default config;
