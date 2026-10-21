import {defineConfig} from 'astro/config';
import mdx from '@astrojs/mdx';
import {repositoryId} from './tools/github';

// The site is static and published with GitHub Pages under https://<owner>.github.io/<repository>/, both read from the repository (not written
// here). Languages are routes of our own (src/pages/[lang]/...) because every page exists in both and the content decides the navigation.
const {owner, name} = repositoryId();

export default defineConfig({
    site: `https://${owner}.github.io`,
    base: `/${name}`,
    trailingSlash: 'always',
    integrations: [mdx()],
    build: {format: 'directory'},
    // Code in the pages: one theme for each colour mode, picked by the CSS of the site (src/styles/site.css).
    markdown: {shikiConfig: {themes: {light: 'github-light', dark: 'github-dark'}, defaultColor: false}},
    // The preview is also opened from containers (Selenium) through host.docker.internal.
    vite: {preview: {allowedHosts: true}},
});
