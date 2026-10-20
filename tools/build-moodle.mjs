// This file is part of the Didactika Moodle design system.
// Licensed under the GNU General Public License, version 3 or later.

/**
 * Prepares the CSS of every Moodle version the site shows.
 *
 * Moodle commits the compiled stylesheet of its Boost theme in every branch (`theme/boost/style/moodle.css`, under `public/` from
 * Moodle 5.1), so the site draws its examples with exactly what a stock site of that version sends to the browser, not with a copy
 * kept by hand. For each version in `src/data/versions.json` this downloads that file once (cached in `vendor/`), points its fonts at
 * local copies, and scopes every rule under `.ds-<id>` so all versions can live in one page and be switched without a reload. Every
 * rule for :hover, :focus and :active also gets a twin for `.ds-is-hover`, `.ds-is-focus` and `.ds-is-active`, so the states of a
 * component can be drawn at rest.
 *
 * Usage: node tools/build-moodle.mjs [--refresh]
 */
import {existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, statSync} from 'node:fs';
import {dirname, join, resolve, basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import postcss from 'postcss';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const refresh = process.argv.includes('--refresh');
const versions = JSON.parse(readFileSync(join(root, 'src/data/versions.json'), 'utf8'));
const RAW = 'https://raw.githubusercontent.com/moodle/moodle';

/** Download a file once and keep it in vendor/. */
const cached = async(url, file) => {
    if (existsSync(file) && !refresh) {
        return readFileSync(file);
    }
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`${response.status} ${url}`);
    }
    const data = Buffer.from(await response.arrayBuffer());
    mkdirSync(dirname(file), {recursive: true});
    writeFileSync(file, data);
    return data;
};

/** Selectors that describe the page itself become the scope; everything else goes under it. */
const pageRoot = /^(:root|html|body|:host)(?=$|[.[:#\s>+~])/;
const colourMode = /^\[data-bs-theme="?(dark|light)"?\]/;

const scopeSelector = (selector, scope) => {
    const s = selector.trim();
    if (pageRoot.test(s)) {
        return s.replace(pageRoot, scope);
    }
    if (colourMode.test(s)) {
        // On the example itself and on anything inside it.
        return `${s.replace(colourMode, (m) => scope + m)}, ${scope} ${s}`;
    }
    return `${scope} ${s}`;
};

const build = async(version) => {
    const scope = `.ds-${version.id}`;
    const out = join(root, 'public/moodle', version.id);
    mkdirSync(join(out, 'fonts'), {recursive: true});

    const prefix = version.branch === 'MOODLE_503_STABLE' || version.public ? 'public/' : '';
    const css = (await cached(`${RAW}/${version.branch}/${prefix}theme/boost/style/moodle.css`,
        join(root, 'vendor/moodle', version.id, 'moodle.css'))).toString('utf8');

    // The fonts the stylesheet asks for. A face whose file is not available here is dropped, so nothing points at a missing URL.
    const available = new Map();
    const font = async(name, url, fromFile) => {
        const target = join(out, 'fonts', basename(name));
        if (fromFile) {
            copyFileSync(fromFile, target);
        } else {
            writeFileSync(target, await cached(url, join(root, 'vendor/moodle', version.id, 'fonts', basename(name))));
        }
        available.set(name, basename(name));
    };
    if (version.icons === 'fa4') {
        await font('fontawesome-webfont.woff2', `${RAW}/${version.branch}/lib/fonts/fontawesome-webfont.woff2`);
    } else if (version.icons === 'fa6' && version.fontsFrom === 'npm') {
        for (const f of ['fa-solid-900', 'fa-regular-400', 'fa-brands-400']) {
            await font(`${f}.woff2`, '', join(root, 'node_modules/@fortawesome/fontawesome-free/webfonts', `${f}.woff2`));
        }
    } else if (version.icons === 'fa6') {
        for (const f of ['fa-solid-900', 'fa-regular-400', 'fa-brands-400']) {
            await font(`${f}.woff2`, `${RAW}/${version.branch}/lib/fonts/${f}.woff2`);
        }
    }
    if (version.noto) {
        for (const f of ['normal-latin', 'normal-latin-ext', 'italic-latin', 'italic-latin-ext']) {
            await font(`noto-sans/noto-sans-${f}.woff2`, `${RAW}/${version.branch}/${prefix}theme/boost/fonts/noto-sans/noto-sans-${f}.woff2`);
        }
    }

    const tree = postcss.parse(css.replace(/\/\*# sourceMappingURL=[^*]*\*\//g, ''));
    tree.walkAtRules('font-face', (rule) => {
        let src = '';
        rule.walkDecls('src', (decl) => {
            src = decl.value;
        });
        const wanted = [...src.matchAll(/\[\[font:[a-z]+\|([^\]]+)\]\]/g)].map((m) => m[1]);
        const hit = wanted.find((name) => available.has(name));
        if (!hit) {
            rule.remove();
            return;
        }
        rule.walkDecls('src', (decl) => decl.remove());
        rule.append({prop: 'src', value: `url("fonts/${hit}") format("woff2")`});
    });
    tree.walkRules((rule) => {
        const parent = rule.parent;
        if (parent && parent.type === 'atrule' && /keyframes$/.test(parent.name)) {
            return;
        }
        const scoped = rule.selectors.map((s) => scopeSelector(s, scope));
        // The same rules for the states that cannot be shown at rest, so a page can draw hover, focus and pressed side by side.
        const forced = scoped.filter((s) => /:(hover|focus-visible|focus|active)/.test(s)).map((s) => s
            .replace(/:hover/g, '.ds-is-hover').replace(/:focus-visible/g, '.ds-is-focus').replace(/:focus/g, '.ds-is-focus')
            .replace(/:active/g, '.ds-is-active'));
        rule.selectors = [...new Set([...scoped, ...forced])];
    });
    writeFileSync(join(out, 'boost.css'), tree.toString());
    return `${version.id}: ${version.label}, ${(statSync(join(out, 'boost.css')).size / 1024).toFixed(0)} KB, ${available.size} font file(s)`;
};

for (const version of versions) {
    console.log(await build(version));
}
