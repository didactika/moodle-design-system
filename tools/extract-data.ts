// This file is part of the Didactika Moodle design system.
// Licensed under the GNU General Public License, version 3 or later.

/**
 * Reads, from the same Moodle sources the site draws with, the two tables the Foundations pages need:
 *
 * - `src/data/icons.json`: every icon Moodle maps to Font Awesome (the identifier a plugin writes with `{{#pix}}` or `pix_icon()`,
 *   such as `t/edit`) with the Font Awesome class that each version draws it with, or nothing where a version has no icon for it.
 * - `src/data/tokens.json`: every CSS variable of each version (`--bs-*` and `--mds-*` on Bootstrap 5; `--*` of the root on Bootstrap 4)'s stylesheet, light and dark.
 *
 * Usage: tsx tools/extract-data.ts [--refresh]   (run after tools/build-moodle.ts: it reads vendor/)
 */
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import postcss from 'postcss';
import type {VersionConfig} from './types';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const refresh = process.argv.includes('--refresh');
const versions = JSON.parse(readFileSync(join(root, 'src/data/versions.json'), 'utf8')) as VersionConfig[];
const RAW = 'https://raw.githubusercontent.com/moodle/moodle';

const cached = async(url: string, file: string): Promise<string> => {
    if (existsSync(file) && !refresh) {
        return readFileSync(file, 'utf8');
    }
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`${response.status} ${url}`);
    }
    const text = await response.text();
    mkdirSync(dirname(file), {recursive: true});
    writeFileSync(file, text);
    return text;
};

// ---- icons ----
const icons: Record<string, Record<string, string>> = {};
for (const version of versions) {
    const prefix = version.public ? 'public/' : '';
    const php = await cached(`${RAW}/${version.branch}/${prefix}lib/classes/output/icon_system_fontawesome.php`,
        join(root, 'vendor/moodle', version.id, 'icon_system_fontawesome.php'));
    for (const [, id = '', value = ''] of php.matchAll(/^\s*'([a-z_0-9]+:[^']+)'\s*=>\s*'([^']+)'/gm)) {
        const component = id.split(':')[0];
        if (component !== 'core') {
            continue;
        }
        const name = id.slice('core:'.length);
        (icons[name] ??= {})[version.id] = value.replace(/^fa-/, '');
    }
}
const sorted = Object.fromEntries(Object.keys(icons).sort().map((k) => [k, icons[k]]));
writeFileSync(join(root, 'src/data/icons.json'), JSON.stringify(sorted, null, 1) + '\n');
console.log(`icons: ${Object.keys(sorted).length} Moodle icons`);

// ---- tokens ----
const tokens: Record<string, {light: Record<string, string>; dark: Record<string, string>}> = {};
for (const version of versions) {
    const tree = postcss.parse(readFileSync(join(root, 'vendor/moodle', version.id, 'moodle.css'), 'utf8'));
    const light: Record<string, string> = {};
    const dark: Record<string, string> = {};
    tree.walkRules((rule) => {
        if (rule.parent && rule.parent.type !== 'root') {
            return;
        }
        const target = rule.selectors.some((s) => /\[data-bs-theme="?dark"?\]/.test(s)) && !rule.selectors.some((s) => s.trim() === ':root')
            ? dark : (rule.selectors.some((s) => s.trim() === ':root' || /\[data-bs-theme="?light"?\]/.test(s)) ? light : null);
        if (!target) {
            return;
        }
        rule.walkDecls(version.bootstrap.startsWith('5') ? /^--(bs|mds)-/ : /^--/, (decl) => {
            target[decl.prop] = decl.value.trim();
        });
    });
    tokens[version.id] = {light, dark};
    console.log(`tokens ${version.id}: ${Object.keys(light).length} light, ${Object.keys(dark).length} dark`);
}
writeFileSync(join(root, 'src/data/tokens.json'), JSON.stringify(tokens, null, 1) + '\n');
