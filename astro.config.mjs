// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://wilsondancefactory.se',
  // Same URLs as the old WordPress site: every page ends with a slash.
  trailingSlash: 'always',
  build: { format: 'directory' },
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/tack/'),
    }),
  ],
});
