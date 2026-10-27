import {defineConfig} from 'astro/config';
import mdx from '@astrojs/mdx';
import {siteAddress} from './tools/github';

// The site is static and published with GitHub Pages. Its address is read from the repository (not written here): the custom domain of
// public/CNAME if there is one, or https://<owner>.github.io/<repository>/. Languages are routes of our own (src/pages/[lang]/...) because
// every page exists in both and the content decides the navigation.
const {site, base} = siteAddress();

export default defineConfig({
    site,
    base,
    trailingSlash: 'always',
    integrations: [mdx()],
    build: {format: 'directory'},
    // Code in the pages: one theme for each colour mode, picked by the CSS of the site (src/styles/site.css).
    markdown: {shikiConfig: {themes: {light: 'github-light', dark: 'github-dark'}, defaultColor: false}},
    // The preview is also opened from containers (Selenium) through host.docker.internal.
    vite: {preview: {allowedHosts: true}},
});
