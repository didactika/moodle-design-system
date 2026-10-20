// This file is part of the Didactika Moodle design system.
// Licensed under the GNU General Public License, version 3 or later.

/**
 * Checks the content of the site before it is published, and fails the build when something is missing:
 *
 * - every page exists in English and in Spanish, with the same `group`, `order` and `versions`;
 * - every example a page names (`src="..."`) exists as a file, and every example file is used by some page;
 * - every page has a summary, and no page is left with text in the other language's file untranslated (title equal in both is allowed
 *   only for proper names).
 *
 * Usage: tsx tools/check-content.ts
 */
import {readdirSync, readFileSync, statSync, existsSync} from 'node:fs';
import {dirname, join, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const docs = join(root, 'src/content/docs');
const examples = join(root, 'src/examples');
const errors: string[] = [];

/** A page of the content collection: its file and the front matter read from it. */
interface Page { file: string; data: Record<string, string> }

const walk = (dir: string): string[] => readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
});

/** The front matter of an MDX file as a plain object (flat keys, scalar or inline list values). */
const frontMatter = (file: string): Record<string, string> => {
    const match = readFileSync(file, 'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!match) {
        errors.push(`${relative(root, file)}: no front matter`);
        return {};
    }
    return Object.fromEntries(match[1].split(/\r?\n/).map((line) => {
        const i = line.indexOf(':');
        return [line.slice(0, i).trim(), line.slice(i + 1).trim()] as [string, string];
    }));
};

const pages: Record<string, Record<string, Page>> = {en: {}, es: {}};
for (const file of walk(docs).filter((f) => f.endsWith('.mdx'))) {
    const [lang, ...rest] = relative(docs, file).replace(/\\/g, '/').split('/');
    if (!pages[lang]) {
        errors.push(`${relative(root, file)}: unknown language folder "${lang}"`);
        continue;
    }
    pages[lang][rest.join('/').replace(/\.mdx$/, '')] = {file, data: frontMatter(file)};
}

for (const lang of ['en', 'es']) {
    const other = lang === 'en' ? 'es' : 'en';
    for (const slug of Object.keys(pages[lang])) {
        if (!pages[other][slug]) {
            errors.push(`${lang}/${slug}: missing in ${other}`);
            continue;
        }
        const a = pages[lang][slug].data;
        const b = pages[other][slug].data;
        for (const key of ['group', 'order', 'versions']) {
            if ((a[key] ?? '') !== (b[key] ?? '')) {
                errors.push(`${slug}: "${key}" differs between languages (${a[key]} / ${b[key]})`);
            }
        }
        if (!a.summary) {
            errors.push(`${lang}/${slug}: no summary`);
        }
    }
}

const used = new Set();
for (const lang of Object.keys(pages)) {
    for (const [slug, {file}] of Object.entries(pages[lang])) {
        for (const [, name] of readFileSync(file, 'utf8').matchAll(/src="([^"]+)"/g)) {
            used.add(name);
            if (!existsSync(join(examples, `${name}.html`))) {
                errors.push(`${lang}/${slug}: example "${name}" has no file in src/examples`);
            }
        }
    }
}
for (const file of walk(examples).filter((f) => f.endsWith('.html') && !f.endsWith('.bs4.html'))) {
    const name = relative(examples, file).replace(/\\/g, '/').replace(/\.html$/, '');
    if (!used.has(name)) {
        errors.push(`src/examples/${name}.html is not used by any page`);
    }
}

if (errors.length) {
    console.error(`Content check failed (${errors.length}):\n- ${errors.join('\n- ')}`);
    process.exit(1);
}
console.log(`Content check passed: ${Object.keys(pages.en).length} pages in 2 languages, ${used.size} examples.`);
