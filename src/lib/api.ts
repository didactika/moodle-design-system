import {getCollection} from 'astro:content';
import versions from '../data/versions.json';

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
            code: data.code ?? null,
            group: data.group,
            order: data.order,
            versions: data.versions ?? versions.map((v) => v.id),
            title: {en: en?.data.title ?? null, es: es?.data.title ?? null},
            summary: {en: en?.data.summary ?? null, es: es?.data.summary ?? null},
            url: {en: abs(`/en/${slug}/`), es: abs(`/es/${slug}/`)},
            api: abs(`/api/pages/${slug}.json`),
            body: {en: en?.body ?? null, es: es?.body ?? null},
        };
    });
};
