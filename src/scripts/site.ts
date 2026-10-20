// The behaviour of the documentation site: the selected Moodle version, colour mode and Didactika theme, the examples drawn with the CSS of that
// version, the icons of each version, and an inspector that measures anything inside an example and shows its code.
import './colour';
import {$, $$, readJson} from './dom';
import {DIDACTIKA, contrast, grade, hex, parse, styleElements, themeCss, toHex} from './theme';
import type {Rgba} from './theme';
import {toBootstrap4} from '../lib/bootstrap4';

/** One Moodle version as `Base.astro` embeds it in the page. */
interface VersionInfo { id: string; moodle: string; label: string; bootstrap: string; icons: string; darkMode: boolean; support: string }
/** What the page embeds for the scripts: the versions, the language and every text of the interface. */
interface Config { versions: VersionInfo[]; lang: string; ui: Record<string, string> }
type Mode = 'light' | 'dark';
type InspectorTab = 'design' | 'code' | 'edit';
type Direction = 'up' | 'prev' | 'next' | 'down';
/** Moodle icon id -> version id -> the Font Awesome name that version draws it with. */
type IconMap = Record<string, Record<string, string>>;
/** An element of an example that the inspector has edited remembers what it changed. */
type Editable = HTMLElement & {_dsEdits?: Record<string, string>};
type Disableable = HTMLElement & {disabled: boolean};

const escapeHtml = (value: string): string => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const canDisable = (el: HTMLElement): el is Disableable => 'disabled' in el;
/** A computed style or an inline style read and written by property name. */
const named = (style: CSSStyleDeclaration): Record<string, string> => style as unknown as Record<string, string>;

const config = readJson<Config>('ds-config') as Config;
const text = config.ui;
const root = document.documentElement;
const state: {version: string; mode: Mode | null; brand: boolean; itab: InspectorTab} = {
    version: root.dataset.version ?? (config.versions[0] as VersionInfo).id,
    mode: (root.dataset.theme as Mode | undefined) || null,
    brand: root.dataset.brand === '1',
    itab: 'design',
};
const versionOf = (id: string): VersionInfo => {
    const found = config.versions.find((v) => v.id === id);
    if (!found) { throw new Error(`Unknown Moodle version: ${id}`); }
    return found;
};
const store = (key: string, value: string | null): void => {
    try { if (value === null) { localStorage.removeItem(key); } else { localStorage.setItem(key, value); } } catch (error) { /* optional */ }
};
const styles = styleElements();

// ---------------------------------------------------------------- icons: the Moodle icon id of a pix icon, drawn with the Font Awesome of the version
let iconMap: IconMap | null = null;
const iconClass = (pix: string, version: VersionInfo): string | null => {
    const value = iconMap?.[pix]?.[version.id];
    if (!value) { return null; }
    if (version.icons === 'fa4') { return `fa fa-${value}`; }
    return /^(regular|brands) /.test(value) ? `fa-${value}` : `fa-solid fa-${value}`;
};
const drawIcons = (scope: ParentNode, version: VersionInfo): void => {
    $$('[data-pix]', scope).forEach((icon) => {
        const pix = icon.dataset.pix ?? '';
        const classes = iconClass(pix, version);
        icon.className = `icon fa-fw ${classes ?? 'ds-icon-missing'}`;
        icon.title = classes ? '' : `${pix}: ${text.unavailable}`;
    });
};

// ---------------------------------------------------------------- code view
const pretty = (html: string): string => {
    const lines: string[] = [];
    let depth = 0;
    let line = '';
    const inline = /^<\/?(i|span|b|strong|code|small|em|abbr|kbd|a|label)\b/;
    const flush = (): void => { if (line.trim()) { lines.push('  '.repeat(Math.max(depth, 0)) + line.trim()); } line = ''; };
    for (const token of html.replace(/>\s+</g, '><').split(/(<[^>]+>)/).filter((t) => t.trim() !== '')) {
        if (!token.startsWith('<') || inline.test(token)) { line += token; continue; }
        if (token.startsWith('</')) { flush(); depth -= 1; lines.push('  '.repeat(Math.max(depth, 0)) + token); continue; }
        flush();
        lines.push('  '.repeat(depth) + token);
        if (!/\/>$/.test(token) && !/^<(input|img|br|hr|meta|link)\b/.test(token)) { depth += 1; }
    }
    flush();
    const joined: string[] = [];
    for (let i = 0; i < lines.length; i += 1) {
        const [a, b, c] = [lines[i] as string, lines[i + 1], lines[i + 2]];
        if (b !== undefined && c !== undefined && /^\s*<(?!\/)[^>]+>$/.test(a) && !/^\s*</.test(b) && /^\s*<\//.test(c)) {
            joined.push(a + b.trim() + c.trim());
            i += 2;
        } else {
            joined.push(a);
        }
    }
    return joined.join('\n');
};
/** One pass over the tags: the name, then each attribute, so the markup added for the colours is never read again. */
const highlight = (code: string): string => escapeHtml(code).replace(/&lt;(\/?)([\w-]+)([\s\S]*?)(\/?)&gt;/g, (_match: string, slash: string, name: string, attrs: string, self: string) => {
    const marked = attrs.replace(/([\w:-]+)(?:(=)("[^"]*"))?/g, (_m: string, n: string, eq: string | undefined, v: string | undefined) => `<span class="tok-a">${n}</span>${eq ?? ''}${v === undefined ? '' : `<span class="tok-v">${v}</span>`}`);
    return `&lt;${slash}<span class="tok-t">${name}</span>${marked}${self}&gt;`;
});

// ---------------------------------------------------------------- examples
const frames = $$('.ds-frame[data-example]');
frames.forEach((frame) => { frame.dataset.source = frame.innerHTML; });
const bs5 = (): boolean => versionOf(state.version).bootstrap.startsWith('5');

const whenStyled = (callback: () => void): void => {
    const link = $<HTMLLinkElement>(`[data-version-css="${state.version}"]`);
    if (!link || link.sheet) { callback(); } else { link.addEventListener('load', callback, {once: true}); }
};

const applyBrand = (): void => {
    styles.brand.textContent = state.brand ? themeCss(DIDACTIKA, '.ds-v-scope.ds-themed', bs5()) : '';
    $$('.ds-v-scope').forEach((el) => el.classList.toggle('ds-themed', state.brand));
    $$('[data-brand-toggle]').forEach((b) => b.setAttribute('aria-pressed', String(state.brand)));
    root.dataset.brand = state.brand ? '1' : '0';
};

const apply = (): void => {
    const version = versionOf(state.version);
    const dark = state.mode ? state.mode === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.version = state.version;
    $$<HTMLLinkElement>('[data-version-css]').forEach((link) => { link.media = link.dataset.versionCss === state.version ? 'all' : 'not all'; });
    const label = $('#ds-version-label');
    if (label) { label.innerHTML = version.label.replace(/^Moodle /, '<span class="ds-vl">Moodle </span>'); }
    $$('#ds-version [data-version]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.version === state.version)));
    $$('[data-pick-version]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.pickVersion === state.version)));
    $$('[data-set-mode]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.setMode === (state.mode ?? 'system'))));
    $$('.ds-vb').forEach((b) => b.classList.toggle('is-current', (b.dataset.v ?? '').split(' ').includes(state.version)));
    if (state.mode) { root.dataset.theme = state.mode; } else { delete root.dataset.theme; }

    $$('.ds-v-scope').forEach((el) => {
        config.versions.forEach((v) => el.classList.toggle(`ds-${v.id}`, v.id === state.version));
        if (version.darkMode) { el.setAttribute('data-bs-theme', dark ? 'dark' : 'light'); } else { el.removeAttribute('data-bs-theme'); }
    });
    frames.forEach((frame) => {
        const source = frame.dataset.source ?? '';
        const shown = version.bootstrap.startsWith('4') ? (frame.dataset.sourceBs4 ?? toBootstrap4(source)) : source;
        frame.innerHTML = shown;
        const block = frame.closest('.ds-example');
        const note = block?.querySelector<HTMLElement>('.ds-nodark');
        if (note) { note.hidden = version.darkMode || !dark; }
        // The code shows the Moodle call for an icon, not the Font Awesome class that one version draws it with.
        const code = block?.querySelector('.ds-source code');
        if (code) { code.innerHTML = highlight(pretty(shown.replace(/<i [^>]*data-pix="([^"]*)"[^>]*><\/i>/g, '{{#pix}}$1, core{{/pix}}'))); }
    });
    const node = $('#ds-icons-data');
    if (node?.textContent && !iconMap) { iconMap = JSON.parse(node.textContent) as IconMap; }
    drawIcons(document, version);
    applyBrand();
    $$('.ds-toc a').forEach((a) => {
        const heading = document.getElementById(decodeURIComponent((a.getAttribute('href') ?? '#').slice(1)));
        const item = a.closest('li');
        if (item) { item.hidden = !heading || heading.getClientRects().length === 0; }
    });
    // Everything that is read from the CSS waits until the stylesheet of the version is there.
    whenStyled(() => {
        renderMeasures();
        renderIcons();
        document.dispatchEvent(new CustomEvent('ds:render', {detail: {version: state.version, dark: version.darkMode && dark}}));
    });
    clearSelection();
};

// ---------------------------------------------------------------- sizes, measured from the CSS of the version
const px = (v: string): string => (v === '0px' ? '0' : v);
const both = (v: string): string => (v.endsWith('px') && parseFloat(v) !== 0 ? `${v} · ${+(parseFloat(v) / 16).toFixed(4)}rem` : px(v));
const MEASURES: Record<string, (cs: CSSStyleDeclaration, el: HTMLElement) => string> = {
    Height: (_cs, el) => `${Math.round(el.getBoundingClientRect().height * 100) / 100}px`,
    Padding: (cs) => [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft].map(px).join(' '),
    'Font size': (cs) => both(cs.fontSize),
    'Line height': (cs) => px(cs.lineHeight),
    Weight: (cs) => cs.fontWeight,
    Family: (cs) => (cs.fontFamily.split(',')[0] ?? '').replace(/"/g, ''),
    Radius: (cs) => px(cs.borderTopLeftRadius),
    Border: (cs) => `${px(cs.borderTopWidth)} ${cs.borderTopStyle}`,
    Shadow: (cs) => (cs.boxShadow === 'none' ? 'none' : cs.boxShadow),
    Gap: (cs) => px(cs.columnGap && cs.columnGap !== 'normal' ? cs.columnGap : '0px'),
};
const renderMeasures = (): void => {
    $$('[data-measure-table]').forEach((host) => {
        const example = $(`[data-example="${host.dataset.measureTable}"]`);
        const props = (host.dataset.props ?? '').split(',');
        const rows = example ? $$('[data-measure]', example).map((el) => {
            const cs = getComputedStyle(el);
            return `<tr><td><b>${escapeHtml(el.dataset.measure ?? '')}</b></td>${props.map((p) => `<td class="num">${MEASURES[p]?.(cs, el) ?? ''}</td>`).join('')}</tr>`;
        }) : [];
        host.innerHTML = rows.length
            ? `<div class="ds-table-wrap"><table><thead><tr><th></th>${props.map((p) => `<th>${p}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>` : '';
    });
};

// ---------------------------------------------------------------- icon grid: only the icons the selected version has
const renderIcons = (): void => {
    const host = $('[data-icon-grid]');
    const map = iconMap;
    if (!host || !map) { return; }
    const version = versionOf(state.version);
    const nameIn = (id: string): string => map[id]?.[state.version] ?? '';
    const query = ($<HTMLInputElement>('#ds-icon-filter')?.value || '').trim().toLowerCase();
    const ids = Object.keys(map);
    const here = ids.filter((id) => nameIn(id));
    const shown = here.filter((id) => !query || id.includes(query) || nameIn(id).includes(query));
    host.innerHTML = shown.map((id) => {
        const classes = iconClass(id, version);
        return `<button type="button" class="ds-icon" data-copy-id="${id}" title="${id}"><i class="icon ${classes}" aria-hidden="true"></i><span class="n">${id}</span><span class="c">${nameIn(id)}</span></button>`;
    }).join('');
    const meta = $('#ds-icon-meta');
    if (meta) { meta.textContent = `${query ? `${shown.length} / ` : ''}${here.length} ${text.inVersion} · ${ids.length} ${text.inTotal}`; }
};

// ---------------------------------------------------------------- inspector: design, code and edit
const rail = $('#ds-rail') ?? document.createElement('div');
const body = $('#ds-insp-body') ?? document.createElement('div');
const layer = document.body.appendChild(document.createElement('div'));
layer.className = 'ds-layer';
let hoverBox: HTMLElement | null = null;
let selected: Editable | null = null;
let path: Editable[] = [];

const describe = (el: Element): string => el.tagName.toLowerCase() + [...el.classList].filter((c) => !c.startsWith('ds-')).map((c) => `.${c}`).join('');
const inFrame = (el: Element | null): boolean => Boolean(el && el.closest('.ds-frame') && !el.classList.contains('ds-frame'));
const clearSelection = (): void => {
    selected = null;
    path = [];
    layer.innerHTML = '';
    rail.dataset.rail = 'toc';
    body.innerHTML = `<p class="ds-insp-empty">${text.inspectHint}</p>`;
};
const drawSelection = (): void => {
    layer.innerHTML = '';
    if (!selected || !document.contains(selected)) { return; }
    const r = selected.getBoundingClientRect();
    const cs = named(getComputedStyle(selected));
    // The marks stay inside the canvas of the example: when the element scrolls out of it, they go with it.
    const area = (selected.closest('.ds-canvas') || document.body).getBoundingClientRect();
    layer.style.clipPath = `inset(${Math.max(area.top, 0)}px ${Math.max(innerWidth - area.right, 0)}px ${Math.max(innerHeight - area.bottom, 0)}px ${Math.max(area.left, 0)}px)`;
    const add = (cls: string, x: number, y: number, w: number, h: number): HTMLElement => {
        const d = document.createElement('div');
        d.className = cls;
        Object.assign(d.style, {left: `${x}px`, top: `${y}px`, width: `${Math.max(w, 0)}px`, height: `${Math.max(h, 0)}px`});
        layer.appendChild(d);
        return d;
    };
    const sides = ['Top', 'Right', 'Bottom', 'Left'];
    const [pt, pr, pb, pl] = sides.map((s) => parseFloat(cs[`padding${s}`] as string)) as [number, number, number, number];
    const [bt, br, bb, bl] = sides.map((s) => parseFloat(cs[`border${s}Width`] as string)) as [number, number, number, number];
    const [mt, mr, mb, ml] = sides.map((s) => Math.max(parseFloat(cs[`margin${s}`] as string) || 0, 0)) as [number, number, number, number];
    // margin, padding, then the box and its size
    add('ds-sel-mar', r.left - ml, r.top - mt, r.width + ml + mr, mt);
    add('ds-sel-mar', r.left - ml, r.bottom, r.width + ml + mr, mb);
    add('ds-sel-mar', r.left - ml, r.top, ml, r.height);
    add('ds-sel-mar', r.right, r.top, mr, r.height);
    add('ds-sel-pad', r.left + bl, r.top + bt, r.width - bl - br, pt);
    add('ds-sel-pad', r.left + bl, r.bottom - bb - pb, r.width - bl - br, pb);
    add('ds-sel-pad', r.left + bl, r.top + bt + pt, pl, r.height - bt - bb - pt - pb);
    add('ds-sel-pad', r.right - br - pr, r.top + bt + pt, pr, r.height - bt - bb - pt - pb);
    add('ds-sel-box', r.left, r.top, r.width, r.height);
    const tag = add('ds-sel-tag', r.left, Math.max(r.top - 18, 60), 0, 0);
    tag.style.width = tag.style.height = 'auto';
    tag.textContent = `${Math.round(r.width * 10) / 10} × ${Math.round(r.height * 10) / 10}`;
};

/** The HTML of an element as a plugin would write it: without the attributes and classes of this site, icons as Moodle calls. */
const cleanHtml = (el: HTMLElement): string => {
    const clone = el.cloneNode(true) as HTMLElement;
    if (clone.matches('[data-pix]')) { return `{{#pix}}${clone.dataset.pix}, core{{/pix}}`; }
    $$('[data-pix]', clone).forEach((node) => node.replaceWith(document.createTextNode(`{{#pix}}${node.dataset.pix}, core{{/pix}}`)));
    [clone, ...$$('*', clone)].forEach((node) => {
        [...node.attributes].forEach((a) => { if (/^data-(measure|example|source|pix|copy|lab|colour|bs-theme)/.test(a.name)) { node.removeAttribute(a.name); } });
        const kept = (node.getAttribute('class') ?? '').split(/\s+/).filter((c) => c && !c.startsWith('ds-'));
        if (kept.length) { node.setAttribute('class', kept.join(' ')); } else { node.removeAttribute('class'); }
    });
    return clone.outerHTML;
};

/** A rule of the stylesheets of the page that matches an element, with the sheet it comes from. */
interface MatchedRule { from: string; parts: string[]; style: CSSStyleDeclaration }

/** The rules of the stylesheets of the page that match an element, in the order the cascade reads them (the last one wins). */
const matchedRules = (el: HTMLElement): MatchedRule[] => {
    const version = versionOf(state.version);
    const sources: [CSSStyleSheet, string][] = [];
    [...document.styleSheets].forEach((sheet) => {
        const node = sheet.ownerNode as HTMLElement | null;
        if (!node) { return; }
        if (node.dataset?.versionCss === state.version) { sources.push([sheet, version.label]); }
        if (node.id === 'ds-brand-style') { sources.push([sheet, text.brandTheme as string]); }
        if (node.id === 'ds-lab-style') { sources.push([sheet, 'Lab']); }
    });
    const out: MatchedRule[] = [];
    const walk = (rules: CSSRuleList, from: string): void => {
        for (const rule of rules) {
            if (rule instanceof CSSStyleRule) {
                const parts = rule.selectorText.split(/,\s*(?=\.ds-v)/).filter((s) => {
                    if (/\.ds-is-(hover|focus|active)/.test(s) && !/ds-is-/.test(el.className)) { return false; }
                    try { return el.matches(s); } catch (error) { return false; }
                });
                if (parts.length) { out.push({from, parts, style: rule.style}); }
            } else if (rule instanceof CSSMediaRule) {
                if (matchMedia(rule.conditionText ?? rule.media.mediaText).matches) { walk(rule.cssRules, from); }
            } else if (rule instanceof CSSSupportsRule) {
                if (CSS.supports(rule.conditionText)) { walk(rule.cssRules, from); }
            } else if ('cssRules' in rule && !(rule instanceof CSSKeyframesRule) && !(rule instanceof CSSFontFaceRule)) {
                walk((rule as CSSGroupingRule).cssRules, from);
            }
        }
    };
    sources.forEach(([sheet, from]) => { try { walk(sheet.cssRules, from); } catch (error) { /* a sheet from another origin cannot be read */ } });
    return out.reverse();
};
const stripScope = (selector: string): string => selector.replace(/\.ds-v\d+\.ds-(themed|lab)\s?|\.ds-v-scope\.ds-(themed|lab)\s?|\.ds-v\d+\s?/g, '').trim() || ':scope';

const codePane = (el: HTMLElement): string => {
    const rules = matchedRules(el);
    const classes = [...el.classList].filter((c) => !c.startsWith('ds-'));
    const owns = (c: string): number => rules.filter((r) => r.parts.some((p) => new RegExp(`\\.${c.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}(?![\\w-])`).test(p))).length;
    // The last levels only: a long chain of plain divs says nothing, and a step can be clicked to select it.
    const from = Math.max(path.length - 4, 0);
    const chain = (from ? '<span>…</span>' : '') + path.slice(from).map((node, i) => `<button type="button" data-ipath="${from + i}" class="${node === el ? 'is-here' : ''}">${escapeHtml(describe(node))}</button>`).join('<span>›</span>');
    const html = pretty(cleanHtml(el)).split('\n');
    const htmlShown = html.slice(0, 60).join('\n') + (html.length > 60 ? `\n… ${html.length - 60} ${text.moreLines}` : '');
    const decl = (style: CSSStyleDeclaration): string => {
        const items: string[] = [];
        for (let i = 0; i < style.length; i += 1) {
            const prop = style[i] as string;
            items.push(`<span class="p">${escapeHtml(prop)}</span>: <span class="v">${escapeHtml(style.getPropertyValue(prop))}</span>${style.getPropertyPriority(prop) ? ' !important' : ''};`);
        }
        return items.slice(0, 14).join('<br>') + (items.length > 14 ? `<br><em>+${items.length - 14}</em>` : '');
    };
    const css = rules.slice(0, 60).map((r) => `<div class="ds-rule-css"><div class="s">${escapeHtml(r.parts.map(stripScope).join(', '))}<span class="f">${escapeHtml(r.from)}</span></div><div class="d">${decl(r.style)}</div></div>`).join('');
    return `<div class="ds-chain">${chain}</div>
      <h3>${text.htmlHeading}<button type="button" class="ds-mini" data-copy-code="html">${text.copy}</button></h3>
      <pre class="ds-source ds-insp-pre"><code id="ds-insp-html">${highlight(htmlShown)}</code></pre>
      <h3>${text.classesHeading}</h3>
      <div class="ds-class-list">${classes.length ? classes.map((c) => `<span class="ds-class"><b>.${escapeHtml(c)}</b><i>${owns(c)}</i></span>`).join('') : `<span class="ds-insp-empty">${text.noClasses}</span>`}</div>
      <h3>${text.cssHeading} · ${rules.length}<button type="button" class="ds-mini" data-copy-code="css">${text.copy}</button></h3>
      <div class="ds-css-list" id="ds-insp-css">${css || `<p class="ds-insp-empty">${text.noRules}</p>`}${rules.length > 60 ? `<p class="ds-insp-empty">… ${rules.length - 60} ${text.moreRules}</p>` : ''}</div>`;
};

/** The colour an element is really drawn on: the first ancestor with an opaque background. */
const backdrop = (el: HTMLElement): Rgba => {
    for (let node: HTMLElement | null = el; node; node = node.parentElement) {
        const c = parse(getComputedStyle(node).backgroundColor);
        if (c && c.a > 0.99) { return c; }
    }
    return {r: 255, g: 255, b: 255, a: 1};
};
const ARIA_ROLES: Record<string, string> = {a: 'link', button: 'button', select: 'combobox', textarea: 'textbox', ul: 'list', ol: 'list', li: 'listitem', table: 'table', nav: 'navigation', img: 'img', h1: 'heading', h2: 'heading', h3: 'heading', h4: 'heading', h5: 'heading', h6: 'heading', progress: 'progressbar'};
const INPUT_ROLES: Record<string, string> = {checkbox: 'checkbox', radio: 'radio', range: 'slider', submit: 'button', button: 'button'};
const roleOf = (el: HTMLElement): string => {
    const explicit = el.getAttribute('role');
    if (explicit) { return explicit; }
    if (el.tagName === 'INPUT') { return INPUT_ROLES[(el as HTMLInputElement).type] ?? 'textbox'; }
    if (el.tagName === 'A' && !el.hasAttribute('href')) { return 'generic'; }
    return ARIA_ROLES[el.tagName.toLowerCase()] ?? 'generic';
};
const nameOf = (el: HTMLElement): string => (el.getAttribute('aria-label') || (el as HTMLInputElement).labels?.[0]?.textContent || el.getAttribute('title') || el.getAttribute('placeholder') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60);

const designPane = (el: HTMLElement): string => {
    const cs = getComputedStyle(el);
    const values = named(cs);
    const r = el.getBoundingClientRect();
    const round = (v: string | number): number => Math.round(parseFloat(String(v)) * 10) / 10 || 0;
    const four = (name: string): number[] => ['Top', 'Right', 'Bottom', 'Left'].map((s) => round(values[name === 'border' ? `border${s}Width` : `${name}${s}`] as string));
    const inner = (axis: 'w' | 'h'): number => {
        const [x, y] = axis === 'w' ? ['Left', 'Right'] : ['Top', 'Bottom'];
        const total = axis === 'w' ? r.width : r.height;
        return Math.round((total - parseFloat(values[`padding${x}`] as string) - parseFloat(values[`padding${y}`] as string) - parseFloat(values[`border${x}Width`] as string) - parseFloat(values[`border${y}Width`] as string)) * 10) / 10;
    };
    const ring = (cls: string, label: string, v: number[], content: string): string => `<div class="bm ${cls}"><span class="k">${label}</span><b class="t">${v[0]}</b><b class="r">${v[1]}</b><b class="b">${v[2]}</b><b class="l">${v[3]}</b>${content}</div>`;
    const box = ring('bm-margin', 'margin', four('margin'), ring('bm-border', 'border', four('border'), ring('bm-padding', 'padding', four('padding'), `<div class="bm-content">${inner('w')} × ${inner('h')}</div>`)));

    const dot = (c: string): string => `<span class="ds-dot" style="background:${c}"></span>`;
    const row = (k: string, v: string, copyValue: string): string => `<div class="ds-prop"><span>${k}</span><button type="button" class="ds-val" data-copy-id="${escapeHtml(copyValue)}" title="${text.copy}">${v}</button></div>`;
    const group = (title: string | undefined, rows: string[]): string => `<section class="ds-pgroup"><h3>${title}</h3>${rows.join('')}</section>`;
    const ink = parse(cs.color);
    const ratio = ink ? contrast(ink, backdrop(el)) : 0;
    const focusable = el.matches('a[href], button, input, select, textarea, [tabindex]') && !(canDisable(el) && el.disabled);
    const bg = cs.backgroundColor === 'rgba(0, 0, 0, 0)' ? null : cs.backgroundColor;
    const radius = [cs.borderTopLeftRadius, cs.borderTopRightRadius, cs.borderBottomRightRadius, cs.borderBottomLeftRadius].map(px).join(' ');
    const border = parseFloat(cs.borderTopWidth) ? `${px(cs.borderTopWidth)} ${cs.borderTopStyle} ${toHex(cs.borderTopColor)}` : 'none';
    const fontFamily = (cs.fontFamily.split(',')[0] ?? '').replace(/"/g, '');
    return `<div class="ds-bm" aria-label="Box model">${box}</div>
      ${group(text.groupLayout, [
        row('Size', `${round(r.width)} × ${round(r.height)}`, `${round(r.width)}px ${round(r.height)}px`),
        row('Display', cs.display + (cs.display.includes('flex') ? ` · gap ${px(cs.columnGap === 'normal' ? '0px' : cs.columnGap)}` : ''), cs.display),
      ])}
      ${group(text.groupType, [
        row('Font', escapeHtml(fontFamily), fontFamily),
        row('Size', both(cs.fontSize), cs.fontSize),
        row('Weight · line', `${cs.fontWeight} · ${px(cs.lineHeight)}`, `${cs.fontWeight}`),
        row('Text', `${dot(cs.color)}${toHex(cs.color)}`, toHex(cs.color)),
      ])}
      ${group(text.groupFill, [row('Background', bg ? `${dot(bg)}${toHex(bg)}` : 'none', bg ? toHex(bg) : 'none')])}
      ${group(text.groupStroke, [row('Border', escapeHtml(border), border), row('Radius', radius, radius)])}
      ${group(text.groupEffects, [row('Shadow', cs.boxShadow === 'none' ? 'none' : escapeHtml(cs.boxShadow), cs.boxShadow)])}
      <section class="ds-pgroup"><h3>${text.a11y}</h3>
        <div class="ds-prop"><span>${text.a11yRole}</span><span class="ds-chipx">${roleOf(el)}</span></div>
        <div class="ds-prop"><span>${text.a11yName}</span><span class="ds-val-text">${escapeHtml(nameOf(el)) || '—'}</span></div>
        <div class="ds-prop"><span>${text.a11yFocus}</span><span class="ds-chipx" data-pass="${focusable ? 'yes' : 'no'}">${focusable ? text.yes : text.no}</span></div>
        <div class="ds-prop"><span>${text.a11yContrast}</span>${(el.textContent ?? '').trim() ? `<span class="ds-ratio" data-pass="${ratio >= 4.5 ? 'yes' : 'no'}">${ratio.toFixed(1)}:1 ${grade(ratio)}</span>` : '<span class="ds-val-text">—</span>'}</div>
      </section>`;
};

// What can be changed on an element, and how the value is read from and written to it.
type EditKind = 'colour' | 'weight' | 'px';
const EDITS: [string, string, EditKind][] = [
    ['color', 'textColour', 'colour'],
    ['backgroundColor', 'background', 'colour'],
    ['fontSize', 'fontSize', 'px'],
    ['fontWeight', 'weight', 'weight'],
    ['borderRadius', 'radius', 'px'],
    ['padding', 'padding', 'px'],
    ['borderWidth', 'borderWidth', 'px'],
];
const kebab = (prop: string): string => prop.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
const STATES: [string, string][] = [['ds-is-hover', 'stateHover'], ['ds-is-focus', 'stateFocus'], ['ds-is-active', 'statePressed']];

const editPane = (el: Editable): string => {
    const values = named(getComputedStyle(el));
    const field = ([prop, label, kind]: [string, string, EditKind]): string => {
        const value = values[prop] as string;
        let input: string;
        if (kind === 'colour') {
            const c = parse(value);
            input = `<input type="color" data-edit="${prop}" value="${c ? hex(c) : '#000000'}" aria-label="${text[label]}">`;
        } else if (kind === 'weight') {
            input = `<select data-edit="${prop}" aria-label="${text[label]}">${[300, 400, 500, 600, 700].map((w) => `<option value="${w}"${String(w) === String(parseInt(value, 10)) ? ' selected' : ''}>${w}</option>`).join('')}</select>`;
        } else {
            input = `<input type="number" min="0" step="1" data-edit="${prop}" value="${Math.round(parseFloat(value) || 0)}" aria-label="${text[label]}"><span class="u">px</span>`;
        }
        return `<label>${text[label]}</label><span class="ctl">${input}</span>`;
    };
    const disabled = canDisable(el) ? el.disabled : el.classList.contains('disabled');
    return `<h3>${text.states}</h3>
      <div class="ds-states">${STATES.map(([cls, key]) => `<label class="ds-statechip"><input type="checkbox" data-state="${cls}"${el.classList.contains(cls) ? ' checked' : ''}>${text[key]}</label>`).join('')}<label class="ds-statechip"><input type="checkbox" data-state="disabled"${disabled ? ' checked' : ''}>${text.stateDisabled}</label></div>
      <h3>${text.editHeading}<button type="button" class="ds-mini" data-edit-reset>${text.reset}</button></h3>
      <div class="ds-edit-grid">${EDITS.map(field).join('')}</div>
      <h3>${text.changes}<button type="button" class="ds-mini" data-copy-code="edit">${text.copy}</button></h3>
      <pre class="ds-source ds-insp-pre"><code id="ds-insp-edit">${editOutput(el)}</code></pre>`;
};
const editOutput = (el: Editable): string => {
    const set = el._dsEdits ?? {};
    const lines = Object.entries(set).map(([prop, value]) => `  ${kebab(prop)}: ${value};`);
    return lines.length ? escapeHtml(`${describe(el)} {\n${lines.join('\n')}\n}`) : `<span class="ds-insp-empty">${text.noChanges}</span>`;
};
const applyEdit = (el: Editable, prop: string, value: string, kind: EditKind | undefined): void => {
    const css = kind === 'px' ? `${value}px` : value;
    named(el.style)[prop] = css;
    el._dsEdits = {...(el._dsEdits ?? {}), [prop]: css};
};
const resetEdits = (el: Editable): void => {
    Object.keys(el._dsEdits ?? {}).forEach((prop) => { named(el.style)[prop] = ''; });
    el._dsEdits = {};
    STATES.forEach(([cls]) => el.classList.remove(cls));
    if (canDisable(el)) { el.disabled = false; } else { el.classList.remove('disabled'); }
};

const inspect = (el: Editable, keepPath = false): void => {
    selected = el;
    if (!keepPath) {
        path = [];
        for (let node: Editable | null = el; node && !node.classList?.contains('ds-frame'); node = node.parentElement) { path.unshift(node); }
    }
    rail.dataset.rail = 'inspect';
    // Whatever fails while the panel is built must not leave a half-empty panel: say so in it.
    const build = (fn: (target: Editable) => string): string => { try { return fn(el); } catch (error) { return `<p class="ds-insp-empty">${escapeHtml(String(error))}</p>`; } };
    const tabs: [InspectorTab, string | undefined][] = [['design', text.design], ['code', text.code], ['edit', text.edit]];
    const move = (to: Direction, label: string, tip: string | undefined, ok: boolean): string => `<button type="button" data-inav="${to}" title="${tip}" aria-label="${tip}"${ok ? '' : ' disabled'}>${label}</button>`;
    const parent = Boolean(el.parentElement && inFrame(el.parentElement));
    const child = el.firstElementChild;
    body.innerHTML = `<div class="ds-insp-head"><div class="ds-insp-id"><b class="tag">${escapeHtml(el.tagName.toLowerCase())}</b><span class="cls">${escapeHtml([...el.classList].filter((c) => !c.startsWith('ds-')).map((c) => `.${c}`).join('')) || '—'}</span></div>
        <div class="ds-inav">${move('up', '↑', text.navParent, parent)}${move('prev', '←', text.navPrev, Boolean(el.previousElementSibling))}${move('next', '→', text.navNext, Boolean(el.nextElementSibling))}${move('down', '↓', text.navChild, Boolean(child))}</div></div>
      <div class="ds-itabs" role="tablist">${tabs.map(([id, label]) => `<button type="button" role="tab" data-itab="${id}" aria-selected="${state.itab === id}">${label}</button>`).join('')}</div>
      <div data-ipane="design"${state.itab === 'design' ? '' : ' hidden'}>${build(designPane)}</div>
      <div data-ipane="code"${state.itab === 'code' ? '' : ' hidden'}>${build(codePane)}</div>
      <div data-ipane="edit"${state.itab === 'edit' ? '' : ' hidden'}>${build(editPane)}</div>`;
    drawSelection();
};

/** Move the selection to the parent, a sibling or the first child. */
const go = (to: Direction): void => {
    if (!selected) { return; }
    const next = {up: selected.parentElement, prev: selected.previousElementSibling, next: selected.nextElementSibling, down: selected.firstElementChild}[to] as Editable | null;
    if (next && inFrame(next)) { inspect(next); }
};

// ---------------------------------------------------------------- wiring
const closeMenus = (except?: Element | null): void => { $$<HTMLDetailsElement>('details.ds-dd[open]').forEach((d) => { if (d !== except) { d.open = false; } }); };
const copy = async(value: string, el: Element): Promise<boolean> => {
    try { await navigator.clipboard.writeText(value); el.classList.add('is-copied'); setTimeout(() => el.classList.remove('is-copied'), 900); return true; } catch (error) { return false; }
};

document.addEventListener('mousemove', (event) => {
    const el = event.target instanceof Element ? event.target.closest('.ds-frame *') : null;
    if (!hoverBox) { hoverBox = document.body.appendChild(document.createElement('div')); hoverBox.className = 'ds-hover-box'; }
    if (!el) { hoverBox.hidden = true; return; }
    const r = el.getBoundingClientRect();
    Object.assign(hoverBox.style, {left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px`});
    hoverBox.hidden = false;
});

const MODES = ['light', 'dark', 'system'];
const EDIT_KIND: Record<string, EditKind> = Object.fromEntries(EDITS.map(([prop, , kind]) => [prop, kind]));
const COPIES: Record<string, string> = {html: '#ds-insp-html', css: '#ds-insp-css', edit: '#ds-insp-edit'};

document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) { return; }
    closeMenus(target.closest('details.ds-dd'));

    // An element of an example is selected; everything else on a click is about the page.
    const frame = target.closest('.ds-frame');
    if (frame && target !== frame) { event.preventDefault(); inspect(target as Editable); return; }

    const itab = target.closest<HTMLElement>('[data-itab]');
    if (itab) {
        state.itab = itab.dataset.itab as InspectorTab;
        $$('[data-itab]', body).forEach((b) => b.setAttribute('aria-selected', String(b === itab)));
        $$('[data-ipane]', body).forEach((p) => { p.hidden = p.dataset.ipane !== state.itab; });
        return;
    }
    const move = target.closest<HTMLElement>('[data-inav]');
    if (move) { go(move.dataset.inav as Direction); return; }
    const step = target.closest<HTMLElement>('[data-ipath]');
    if (step) { const node = path[Number(step.dataset.ipath)]; if (node) { inspect(node, true); } return; }
    if (target.closest('[data-edit-reset]') && selected) { resetEdits(selected); inspect(selected, true); return; }
    const code = target.closest<HTMLElement>('[data-copy-code]');
    if (code) { copy($(COPIES[code.dataset.copyCode ?? ''] ?? '')?.innerText ?? '', code); return; }

    const tab = target.closest<HTMLElement>('[data-tab]');
    if (tab) {
        const block = tab.closest('.ds-example') ?? document;
        $$('[data-tab]', block).forEach((b) => b.setAttribute('aria-selected', String(b === tab)));
        $$('[data-pane]', block).forEach((p) => { p.hidden = p.dataset.pane !== tab.dataset.tab; });
        return;
    }
    const icon = target.closest<HTMLElement>('[data-copy-id]');
    if (icon) { copy(icon.dataset.copyId ?? '', icon); return; }
    const copyBtn = target.closest<HTMLElement>('.ds-copy');
    if (copyBtn && !copyBtn.dataset.labCopy) {
        const node = copyBtn.parentElement?.querySelector('code');
        const label = copyBtn.textContent;
        copy(node?.textContent ?? '', copyBtn).then((ok) => { if (ok) { copyBtn.textContent = text.copied ?? ''; setTimeout(() => { copyBtn.textContent = label; }, 1200); } });
        return;
    }

    const pick = target.closest<HTMLElement>('#ds-version [data-version], [data-pick-version]');
    if (pick) {
        state.version = pick.dataset.version ?? pick.dataset.pickVersion ?? state.version;
        store('ds-version', state.version);
        apply();
        return;
    }
    // The buttons of the colour mode carry data-set-mode: the side panel has a data-rail of its own, so nothing else can be taken for one.
    const mode = target.closest<HTMLElement>('[data-set-mode]');
    if (mode && MODES.includes(mode.dataset.setMode ?? '')) {
        state.mode = mode.dataset.setMode === 'system' ? null : mode.dataset.setMode as Mode;
        store('ds-mode', state.mode);
        apply();
        return;
    }
    if (target.closest('[data-brand-toggle]')) {
        state.brand = !state.brand;
        store('ds-brand', state.brand ? '1' : '0');
        apply();
        return;
    }
    if (!target.closest('#ds-rail') && !frame) { clearSelection(); }
});

// Edit the selected element and force its states.
document.addEventListener('input', (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement || input instanceof HTMLSelectElement) || !selected || !input.matches('[data-edit]')) { return; }
    const prop = input.dataset.edit ?? '';
    applyEdit(selected, prop, input.value, EDIT_KIND[prop]);
    const output = $('#ds-insp-edit');
    if (output) { output.innerHTML = editOutput(selected); }
    drawSelection();
});
document.addEventListener('change', (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || !selected || !input.matches('[data-state]')) { return; }
    const flag = input.dataset.state ?? '';
    if (flag === 'disabled') {
        if (canDisable(selected)) { selected.disabled = input.checked; } else { selected.classList.toggle('disabled', input.checked); }
    } else {
        selected.classList.toggle(flag, input.checked);
    }
    drawSelection();
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') { clearSelection(); closeMenus(); return; }
    // With something selected the arrows walk the tree: up to the parent, down to the first child, sideways between siblings.
    const keys: Record<string, Direction> = {ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'prev', ArrowRight: 'next'};
    const typing = event.target instanceof Element && event.target.closest('input, select, textarea, [contenteditable]');
    const direction = keys[event.key];
    if (selected && direction && !typing && !event.altKey && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        go(direction);
    }
});
document.addEventListener('submit', (event) => {
    if (event.target instanceof Element && event.target.closest('.ds-frame')) { event.preventDefault(); }
}, true);
// Capture: the canvas of an example scrolls on its own, and that does not bubble to the window.
window.addEventListener('scroll', () => { drawSelection(); if (hoverBox) { hoverBox.hidden = true; } }, {passive: true, capture: true});
window.addEventListener('resize', () => { drawSelection(); renderMeasures(); });
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (!state.mode) { apply(); } });
$('#ds-icon-filter')?.addEventListener('input', renderIcons);

$('#ds-find')?.addEventListener('input', (event) => {
    const q = (event.target as HTMLInputElement).value.trim().toLowerCase();
    $$('#ds-nav a[data-find]').forEach((a) => { a.hidden = q !== '' && !(a.dataset.find ?? '').includes(q); });
    $$('#ds-nav [data-group]').forEach((g) => { g.hidden = $$('a', g).every((a) => a.hidden); });
});
const menu = $('#ds-menu');
const nav = $('#ds-nav');
menu?.addEventListener('click', () => {
    if (!nav) { return; }
    const open = !nav.classList.contains('is-open');
    nav.classList.toggle('is-open', open);
    menu.setAttribute('aria-expanded', String(open));
});
nav?.addEventListener('click', (event) => { if (event.target instanceof Element && event.target.closest('a')) { nav.classList.remove('is-open'); menu?.setAttribute('aria-expanded', 'false'); } });

const headings = $$('.ds-article h2[id], .ds-article h3[id]');
if (headings.length) {
    const spy = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) { $$('.ds-toc a').forEach((a) => a.setAttribute('aria-current', String(a.getAttribute('href') === `#${entry.target.id}`))); }
        });
    }, {rootMargin: '-15% 0px -75% 0px'});
    headings.forEach((h) => spy.observe(h));
}

apply();
