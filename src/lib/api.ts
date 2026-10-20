import {getCollection} from 'astro:content';
import versions from '../data/versions.json';
import {toBootstrap4} from './bootstrap4.js';

/** The version of the shape of the JSON. It changes only when a field is removed or changes meaning; adding fields does not change it. */
export const SCHEMA = 1;

export const json = (data: unknown) => new Response(JSON.stringify(data, null, 2) + '\n', {headers: {'Content-Type': 'application/json; charset=utf-8'}});

export const urls = (site: URL | undefined) => {
    const base = import.meta.env.BASE_URL.replace(/\/$/, '');
    const root = new URL(base + '/', site ?? 'https://didactika.github.io').href.replace(/\/$/, '');
    return {root, abs: (path: string) => root + path};
};

/** Every page of the site, with both languages joined under the slug. */
export const pages = async(site: URL | undefined) => {
    const {abs} = urls(site);
    const entries = await getCollection('docs');
    const slugs = [...new Set(entries.map((e) => e.id.split('/').slice(1).join('/')))].sort();
    return slugs.map((slug) => {
        const en = entries.find((e) => e.id === `en/${slug}`);
        const es = entries.find((e) => e.id === `es/${slug}`);
        const data = (en ?? es)!.data;
        return {
            id: slug,
            group: data.group,
            order: data.order,
            versions: data.versions ?? versions.map((v) => v.id),
            title: {en: en?.data.title ?? null, es: es?.data.title ?? null},
            summary: {en: en?.data.summary ?? null, es: es?.data.summary ?? null},
            url: {en: abs(`/en/${slug}/`), es: abs(`/es/${slug}/`)},
            api: abs(`/api/pages/${slug}.json`),
            examples: [...new Set([...(en?.body ?? '').matchAll(/src="([^"]+)"/g)].map((m) => m[1]))],
            body: {en: en?.body ?? null, es: es?.body ?? null},
        };
    });
};

const sources = import.meta.glob('../examples/**/*.html', {query: '?raw', import: 'default', eager: true}) as Record<string, string>;
/** The markup of an example with each icon as the call a Moodle template makes. */
const mustache = (html: string) => html.replace(/<i [^>]*data-pix="([^"]*)"[^>]*><\/i>/g, '{{#pix}}$1, core{{/pix}}');
const iconsOf = (html: string) => [...html.matchAll(/data-pix="([^"]*)"/g)].map((m) => m[1]);

/** Every example of the site grouped by component, in Bootstrap 5 and in Bootstrap 4, with the Moodle icon calls. */
export const components = async(site: URL | undefined) => {
    const {abs} = urls(site);
    const titles: Record<string, Record<string, string>> = {en: {}, es: {}};
    const pageOf: Record<string, string> = {};
    for (const entry of await getCollection('docs')) {
        const [lang, ...rest] = entry.id.split('/');
        for (const m of (entry.body ?? '').matchAll(/<Example\s+title="([^"]+)"\s+src="([^"]+)"/g)) { titles[lang][m[2]] = m[1]; pageOf[m[2]] = rest.join('/'); }
    }
    const groups = new Map<string, unknown[]>();
    for (const [file, html] of Object.entries(sources).sort()) {
        const m = file.match(/\.\.\/examples\/([^/]+)\/([^/]+?)(\.bs4)?\.html$/);
        if (!m || m[3]) { continue; }
        const id = `${m[1]}/${m[2]}`;
        const bs4 = sources[`../examples/${id}.bs4.html`] ?? toBootstrap4(html);
        groups.set(m[1], [...(groups.get(m[1]) ?? []), {
            id,
            title: {en: titles.en[id] ?? null, es: titles.es[id] ?? null},
            page: pageOf[id] ?? null,
            icons: iconsOf(html),
            bootstrap5: {html: html.trim(), mustache: mustache(html).trim()},
            bootstrap4: {html: bs4.trim(), mustache: mustache(bs4).trim()},
        }]);
    }
    return [...groups].map(([id, examples]) => ({id, api: abs(`/api/components/${id}.json`), page: (examples[0] as {page: string | null}).page, examples}));
};
