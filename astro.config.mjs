import {defineConfig} from 'astro/config';
import mdx from '@astrojs/mdx';

// The site is static and published with GitHub Pages under /moodle-design-system/. Languages are routes of our own
// (src/pages/[lang]/...) because every page exists in both and the content decides the navigation.
export default defineConfig({
    site: 'https://didactika.github.io',
    base: '/moodle-design-system',
    trailingSlash: 'always',
    integrations: [mdx()],
    build: {format: 'directory'},
    // The preview is also opened from containers (Selenium) through host.docker.internal.
    vite: {preview: {allowedHosts: true}},
});
