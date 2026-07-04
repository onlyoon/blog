// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [
      tailwindcss(),
    ],
  },
  integrations: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: ['blog.memlet.com',  'code.memlet.com'],
  },
  i18n: {
    defaultLocale: 'kr',
    locales: ['kr', 'en', 'cn'],
    routing: {
      prefixDefaultLocale: true,
    },
  },
});
