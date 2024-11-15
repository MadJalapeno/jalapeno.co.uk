import path from 'path';
import { fileURLToPath } from 'url';
import tailwind from '@astrojs/tailwind';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

import { defineConfig } from 'astro/config';
import { build } from 'astro';

// https://astro.build/config

export default defineConfig({


  integrations: [tailwind({
    applyBaseStyles: false
  }),
],  

  build: {
    inlineStylesheets: 'never',
  },


  compressHTML: false, // Prevents minification in dev

});