// The behaviour of the documentation site: the selected Moodle version, colour mode and Didactika theme, the examples drawn with the CSS of that
// version, the icons of each version, and an inspector that measures anything inside an example and shows its code.
import './colour.js';
import {DIDACTIKA, contrast, grade, hex, parse, styleElements, themeCss, toHex} from './theme.js';
import {toBootstrap4} from '../lib/bootstrap4.js';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const escapeHtml = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const config = JSON.parse($('#ds-config').textContent);
const text = config.ui;
const root = document.documentElement;
const state = {version: root.dataset.version, mode: root.dataset.theme || null, brand: root.dataset.brand === '1', itab: 'design'};
const versionOf = (id) => config.versions.find((v) => v.id === id);
const store = (key, value) => {
    try { if (value === null) { localStorage.removeItem(key); } else { localStorage.setItem(key, value); } } catch (error) { /* optional */ }
};
const styles = styleElements();

// ---------------------------------------------------------------- icons: the Moodle icon id of a pix icon, drawn with the Font Awesome of the version
let iconMap = null;
const iconClass = (pix, version) => {
    const value = iconMap?.[pix]?.[version.id];
    if (!value) { return null; }
    if (version.icons === 'fa4') { return `fa fa-${value}`; }
    return /^(regular|brands) /.test(value) ? `fa-${value}` : `fa-solid fa-${value}`;
};
const drawIcons = (scope, version) => {
    $$('[data-pix]', scope).forEach((icon) => {
        const classes = iconClass(icon.dataset.pix, version);
        icon.className = `icon fa-fw ${classes ?? 'ds-icon-missing'}`;
        icon.title = classes ? '' : `${icon.dataset.pix}: ${text.unavailable}`;
    });
};

// ---------------------------------------------------------------- code view
const pretty = (html) => {
    const lines = [];
    let depth = 0;
    let line = '';
    const inline = /^<\/?(i|span|b|strong|code|small|em|abbr|kbd|a|label)\b/;
    const flush = () => { if (line.trim()) { lines.push('  '.repeat(Math.max(depth, 0)) + line.trim()); } line = ''; };
    for (const token of html.replace(/>\s+</g, '><').split(/(<[^>]+>)/).filter((t) => t.trim() !== '')) {
        if (!token.startsWith('<') || inline.test(token)) { line += token; continue; }
        if (token.startsWith('</')) { flush(); depth -= 1; lines.push('  '.repeat(Math.max(depth, 0)) + token); continue; }
        flush();
        lines.push('  '.repeat(depth) + token);
        if (!/\/>$/.test(token) && !/^<(input|img|br|hr|meta|link)\b/.test(token)) { depth += 1; }
    }
    flush();
    const joined = [];
    for (let i = 0; i < lines.length; i += 1) {
        const [a, b, c] = [lines[i], lines[i + 1], lines[i + 2]];
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
const highlight = (code) => escapeHtml(code).replace(/&lt;(\/?)([\w-]+)([\s\S]*?)(\/?)&gt;/g, (match, slash, name, attrs, self) => {
    const marked = attrs.replace(/([\w:-]+)(?:(=)("[^"]*"))?/g, (m, n, eq, v) => `<span class="tok-a">${n}</span>${eq ?? ''}${v === undefined ? '' : `<span class="tok-v">${v}</span>`}`);
    return `&lt;${slash}<span class="tok-t">${name}</span>${marked}${self}&gt;`;
});

// ---------------------------------------------------------------- examples
const frames = $$('.ds-frame[data-example]');
frames.forEach((frame) => { frame.dataset.source = frame.innerHTML; });
const bs5 = () => versionOf(state.version).bootstrap.startsWith('5');

const whenStyled = (callback) => {
    const link = $(`[data-version-css="${state.version}"]`);
    if (!link || link.sheet) { callback(); } else { link.addEventListener('load', callback, {once: true}); }
};

const applyBrand = () => {
    styles.brand.textContent = state.brand ? themeCss(DIDACTIKA, '.ds-v-scope.ds-themed', bs5()) : '';
    $$('.ds-v-scope').forEach((el) => el.classList.toggle('ds-themed', state.brand));
    $$('[data-brand-toggle]').forEach((b) => b.setAttribute('aria-pressed', String(state.brand)));
    root.dataset.brand = state.brand ? '1' : '0';
};

const apply = () => {
    const version = versionOf(state.version);
    const dark = state.mode ? state.mode === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.version = state.version;
    $$('[data-version-css]').forEach((link) => { link.media = link.dataset.versionCss === state.version ? 'all' : 'not all'; });
    $('#ds-version-label').innerHTML = version.label.replace(/^Moodle /, '<span class="ds-vl">Moodle </span>');
    $$('#ds-version [data-version]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.version === state.version)));
    $$('[data-pick-version]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.pickVersion === state.version)));
    $$('[data-set-mode]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.setMode === (state.mode ?? 'system'))));
    $$('.ds-vb').forEach((b) => b.classList.toggle('is-current', b.dataset.v === state.version));
    if (state.mode) { root.dataset.theme = state.mode; } else { delete root.dataset.theme; }

    $$('.ds-v-scope').forEach((el) => {
        config.versions.forEach((v) => el.classList.toggle(`ds-${v.id}`, v.id === state.version));
        if (version.darkMode) { el.setAttribute('data-bs-theme', dark ? 'dark' : 'light'); } else { el.removeAttribute('data-bs-theme'); }
    });
    frames.forEach((frame) => {
        const source = frame.dataset.source;
        const shown = version.bootstrap.startsWith('4') ? (frame.dataset.sourceBs4 ?? toBootstrap4(source)) : source;
        frame.innerHTML = shown;
        const block = frame.closest('.ds-example');
        const note = block?.querySelector('.ds-nodark');
        if (note) { note.hidden = version.darkMode || !dark; }
        // The code shows the Moodle call for an icon, not the Font Awesome class that one version draws it with.
        const code = block?.querySelector('.ds-source code');
        if (code) { code.innerHTML = highlight(pretty(shown.replace(/<i [^>]*data-pix="([^"]*)"[^>]*><\/i>/g, '{{#pix}}$1, core{{/pix}}'))); }
    });
    const node = $('#ds-icons-data');
    if (node && !iconMap) { iconMap = JSON.parse(node.textContent); }
    drawIcons(document, version);
    applyBrand();
    // Everything that is read from the CSS waits until the stylesheet of the version is there.
    whenStyled(() => {
        renderMeasures();
        renderIcons();
        document.dispatchEvent(new CustomEvent('ds:render', {detail: {version: state.version, dark: version.darkMode && dark}}));
    });
    clearSelection();
};

// ---------------------------------------------------------------- sizes, measured from the CSS of the version
const px = (v) => (v === '0px' ? '0' : v);
const both = (v) => (v.endsWith('px') && parseFloat(v) !== 0 ? `${v} · ${+(parseFloat(v) / 16).toFixed(4)}rem` : px(v));
const MEASURES = {
    Height: (cs, el) => `${Math.round(el.getBoundingClientRect().height * 100) / 100}px`,
    Padding: (cs) => [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft].map(px).join(' '),
    'Font size': (cs) => both(cs.fontSize),
    'Line height': (cs) => px(cs.lineHeight),
    Weight: (cs) => cs.fontWeight,
    Family: (cs) => cs.fontFamily.split(',')[0].replace(/"/g, ''),
    Radius: (cs) => px(cs.borderTopLeftRadius),
    Border: (cs) => `${px(cs.borderTopWidth)} ${cs.borderTopStyle}`,
    Shadow: (cs) => (cs.boxShadow === 'none' ? 'none' : cs.boxShadow),
    Gap: (cs) => px(cs.columnGap && cs.columnGap !== 'normal' ? cs.columnGap : '0px'),
};
const renderMeasures = () => {
    $$('[data-measure-table]').forEach((host) => {
        const example = $(`[data-example="${host.dataset.measureTable}"]`);
        const props = host.dataset.props.split(',');
        const rows = example ? $$('[data-measure]', example).map((el) => {
            const cs = getComputedStyle(el);
            return `<tr><td><b>${escapeHtml(el.dataset.measure)}</b></td>${props.map((p) => `<td class="num">${MEASURES[p](cs, el)}</td>`).join('')}</tr>`;
        }) : [];
        host.innerHTML = rows.length
            ? `<div class="ds-table-wrap"><table><thead><tr><th></th>${props.map((p) => `<th>${p}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>` : '';
    });
};

// ---------------------------------------------------------------- icon grid: only the icons the selected version has
const renderIcons = () => {
    const host = $('[data-icon-grid]');
    if (!host || !iconMap) { return; }
    const version = versionOf(state.version);
    const query = ($('#ds-icon-filter')?.value || '').trim().toLowerCase();
    const ids = Object.keys(iconMap);
    const here = ids.filter((id) => iconMap[id][state.version]);
    const shown = here.filter((id) => !query || id.includes(query) || iconMap[id][state.version].includes(query));
    host.innerHTML = shown.map((id) => {
        const classes = iconClass(id, version);
        return `<button type="button" class="ds-icon" data-copy-id="${id}" title="${id}"><i class="icon ${classes}" aria-hidden="true"></i><span class="n">${id}</span><span class="c">${iconMap[id][state.version]}</span></button>`;
    }).join('');
    const meta = $('#ds-icon-meta');
    if (meta) { meta.textContent = `${query ? `${shown.length} / ` : ''}${here.length} ${text.inVersion} · ${ids.length} ${text.inTotal}`; }
};

// ---------------------------------------------------------------- inspector: design, code and edit
const rail = $('#ds-rail') ?? document.createElement('div');
const body = $('#ds-insp-body') ?? document.createElement('div');
const layer = document.body.appendChild(document.createElement('div'));
layer.className = 'ds-layer';
let hoverBox = null;
let selected = null;
let path = [];

const describe = (el) => el.tagName.toLowerCase() + [...el.classList].filter((c) => !c.startsWith('ds-')).map((c) => `.${c}`).join('');
const inFrame = (el) => Boolean(el && el.closest('.ds-frame') && !el.classList.contains('ds-frame'));
const clearSelection = () => {
    selected = null;
    path = [];
    layer.innerHTML = '';
    rail.dataset.rail = 'toc';
    body.innerHTML = `<p class="ds-insp-empty">${text.inspectHint}</p>`;
};
const drawSelection = () => {
    layer.innerHTML = '';
    if (!selected || !document.contains(selected)) { return; }
    const r = selected.getBoundingClientRect();
    const cs = getComputedStyle(selected);
    // The marks stay inside the canvas of the example: when the element scrolls out of it, they go with it.
    const area = (selected.closest('.ds-canvas') || document.body).getBoundingClientRect();
    layer.style.clipPath = `inset(${Math.max(area.top, 0)}px ${Math.max(innerWidth - area.right, 0)}px ${Math.max(innerHeight - area.bottom, 0)}px ${Math.max(area.left, 0)}px)`;
    const add = (cls, x, y, w, h) => {
        const d = document.createElement('div');
        d.className = cls;
        Object.assign(d.style, {left: `${x}px`, top: `${y}px`, width: `${Math.max(w, 0)}px`, height: `${Math.max(h, 0)}px`});
        layer.appendChild(d);
        return d;
    };
    const [pt, pr, pb, pl] = ['Top', 'Right', 'Bottom', 'Left'].map((s) => parseFloat(cs[`padding${s}`]));
    const [bt, br, bb, bl] = ['Top', 'Right', 'Bottom', 'Left'].map((s) => parseFloat(cs[`border${s}Width`]));
    const [mt, mr, mb, ml] = ['Top', 'Right', 'Bottom', 'Left'].map((s) => Math.max(parseFloat(cs[`margin${s}`]) || 0, 0));
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
const cleanHtml = (el) => {
    const clone = el.cloneNode(true);
    if (clone.matches('[data-pix]')) { return `{{#pix}}${clone.dataset.pix}, core{{/pix}}`; }
    $$('[data-pix]', clone).forEach((node) => node.replaceWith(document.createTextNode(`{{#pix}}${node.dataset.pix}, core{{/pix}}`)));
    [clone, ...$$('*', clone)].forEach((node) => {
        [...node.attributes].forEach((a) => { if (/^data-(measure|example|source|pix|copy|lab|colour|bs-theme)/.test(a.name)) { node.removeAttribute(a.name); } });
        const kept = (node.getAttribute('class') ?? '').split(/\s+/).filter((c) => c && !c.startsWith('ds-'));
        if (kept.length) { node.setAttribute('class', kept.join(' ')); } else { node.removeAttribute('class'); }
    });
    return clone.outerHTML;
};

/** The rules of the stylesheets of the page that match an element, in the order the cascade reads them (the last one wins). */
const matchedRules = (el) => {
    const version = versionOf(state.version);
    const sources = [];
    [...document.styleSheets].forEach((sheet) => {
        const node = sheet.ownerNode;
        if (!node) { return; }
        if (node.dataset?.versionCss === state.version) { sources.push([sheet, version.label]); }
        if (node.id === 'ds-brand-style') { sources.push([sheet, text.brandTheme]); }
        if (node.id === 'ds-lab-style') { sources.push([sheet, 'Lab']); }
    });
    const out = [];
    const walk = (rules, from) => {
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
            } else if (rule.cssRules && !(rule instanceof CSSKeyframesRule) && !(rule instanceof CSSFontFaceRule)) {
                walk(rule.cssRules, from);
            }
        }
    };
    sources.forEach(([sheet, from]) => { try { walk(sheet.cssRules, from); } catch (error) { /* a sheet from another origin cannot be read */ } });
    return out.reverse();
};
const stripScope = (selector) => selector.replace(/\.ds-v\d+\.ds-(themed|lab)\s?|\.ds-v-scope\.ds-(themed|lab)\s?|\.ds-v\d+\s?/g, '').trim() || ':scope';

const codePane = (el) => {
    const rules = matchedRules(el);
    const classes = [...el.classList].filter((c) => !c.startsWith('ds-'));
    const owns = (c) => rules.filter((r) => r.parts.some((p) => new RegExp(`\\.${c.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}(?![\\w-])`).test(p))).length;
    // The last levels only: a long chain of plain divs says nothing, and a step can be clicked to select it.
    const from = Math.max(path.length - 4, 0);
    const chain = (from ? '<span>…</span>' : '') + path.slice(from).map((node, i) => `<button type="button" data-ipath="${from + i}" class="${node === el ? 'is-here' : ''}">${escapeHtml(describe(node))}</button>`).join('<span>›</span>');
    const html = pretty(cleanHtml(el)).split('\n');
    const htmlShown = html.slice(0, 60).join('\n') + (html.length > 60 ? `\n… ${html.length - 60} ${text.moreLines}` : '');
    const decl = (style) => {
        const items = [];
        for (let i = 0; i < style.length; i += 1) { items.push(`<span class="p">${escapeHtml(style[i])}</span>: <span class="v">${escapeHtml(style.getPropertyValue(style[i]))}</span>${style.getPropertyPriority(style[i]) ? ' !important' : ''};`); }
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
const backdrop = (el) => {
    for (let node = el; node; node = node.parentElement) {
        const c = parse(getComputedStyle(node).backgroundColor);
        if (c && c.a > 0.99) { return c; }
    }
    return {r: 255, g: 255, b: 255, a: 1};
};
const ROLES = {a: 'link', button: 'button', select: 'combobox', textarea: 'textbox', ul: 'list', ol: 'list', li: 'listitem', table: 'table', nav: 'navigation', img: 'img', h1: 'heading', h2: 'heading', h3: 'heading', h4: 'heading', h5: 'heading', h6: 'heading', progress: 'progressbar'};
const roleOf = (el) => el.getAttribute('role') || (el.tagName === 'INPUT' ? ({checkbox: 'checkbox', radio: 'radio', range: 'slider', submit: 'button', button: 'button'}[el.type] ?? 'textbox') : (el.tagName === 'A' && !el.hasAttribute('href') ? 'generic' : (ROLES[el.tagName.toLowerCase()] ?? 'generic')));
const nameOf = (el) => (el.getAttribute('aria-label') || el.labels?.[0]?.textContent || el.getAttribute('title') || el.getAttribute('placeholder') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60);

const designPane = (el) => {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const round = (v) => Math.round(parseFloat(v) * 10) / 10 || 0;
    const four = (name) => ['Top', 'Right', 'Bottom', 'Left'].map((s) => round(cs[name === 'border' ? `border${s}Width` : `${name}${s}`]));
    const inner = (axis) => {
        const [x, y] = axis === 'w' ? ['Left', 'Right'] : ['Top', 'Bottom'];
        const total = axis === 'w' ? r.width : r.height;
        return Math.round((total - parseFloat(cs[`padding${x}`]) - parseFloat(cs[`padding${y}`]) - parseFloat(cs[`border${x}Width`]) - parseFloat(cs[`border${y}Width`])) * 10) / 10;
    };
    const ring = (cls, label, v, content) => `<div class="bm ${cls}"><span class="k">${label}</span><b class="t">${v[0]}</b><b class="r">${v[1]}</b><b class="b">${v[2]}</b><b class="l">${v[3]}</b>${content}</div>`;
    const box = ring('bm-margin', 'margin', four('margin'), ring('bm-border', 'border', four('border'), ring('bm-padding', 'padding', four('padding'), `<div class="bm-content">${inner('w')} × ${inner('h')}</div>`)));

    const dot = (c) => `<span class="ds-dot" style="background:${c}"></span>`;
    const row = (k, v, copyValue) => `<div class="ds-prop"><span>${k}</span><button type="button" class="ds-val" data-copy-id="${escapeHtml(copyValue)}" title="${text.copy}">${v}</button></div>`;
    const group = (title, rows) => `<section class="ds-pgroup"><h3>${title}</h3>${rows.join('')}</section>`;
    const ink = parse(cs.color);
    const ratio = ink ? contrast(ink, backdrop(el)) : 0;
    const focusable = el.matches('a[href], button, input, select, textarea, [tabindex]') && !el.disabled;
    const bg = cs.backgroundColor === 'rgba(0, 0, 0, 0)' ? null : cs.backgroundColor;
    const radius = [cs.borderTopLeftRadius, cs.borderTopRightRadius, cs.borderBottomRightRadius, cs.borderBottomLeftRadius].map(px).join(' ');
    const border = parseFloat(cs.borderTopWidth) ? `${px(cs.borderTopWidth)} ${cs.borderTopStyle} ${toHex(cs.borderTopColor)}` : 'none';
    const fontFamily = cs.fontFamily.split(',')[0].replace(/"/g, '');
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
        <div class="ds-prop"><span>${text.a11yContrast}</span>${el.textContent.trim() ? `<span class="ds-ratio" data-pass="${ratio >= 4.5 ? 'yes' : 'no'}">${ratio.toFixed(1)}:1 ${grade(ratio)}</span>` : '<span class="ds-val-text">—</span>'}</div>
      </section>`;
};

// What can be changed on an element, and how the value is read from and written to it.
const EDITS = [
    ['color', 'textColour', 'colour'],
    ['backgroundColor', 'background', 'colour'],
    ['fontSize', 'fontSize', 'px'],
    ['fontWeight', 'weight', 'weight'],
    ['borderRadius', 'radius', 'px'],
    ['padding', 'padding', 'px'],
    ['borderWidth', 'borderWidth', 'px'],
];
const kebab = (prop) => prop.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
const STATES = [['ds-is-hover', 'stateHover'], ['ds-is-focus', 'stateFocus'], ['ds-is-active', 'statePressed']];

const editPane = (el) => {
    const cs = getComputedStyle(el);
    const field = ([prop, label, kind]) => {
        const value = cs[prop];
        let input;
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
    const disabled = 'disabled' in el ? el.disabled : el.classList.contains('disabled');
    return `<h3>${text.states}</h3>
      <div class="ds-states">${STATES.map(([cls, key]) => `<label class="ds-statechip"><input type="checkbox" data-state="${cls}"${el.classList.contains(cls) ? ' checked' : ''}>${text[key]}</label>`).join('')}<label class="ds-statechip"><input type="checkbox" data-state="disabled"${disabled ? ' checked' : ''}>${text.stateDisabled}</label></div>
      <h3>${text.editHeading}<button type="button" class="ds-mini" data-edit-reset>${text.reset}</button></h3>
      <div class="ds-edit-grid">${EDITS.map(field).join('')}</div>
      <h3>${text.changes}<button type="button" class="ds-mini" data-copy-code="edit">${text.copy}</button></h3>
      <pre class="ds-source ds-insp-pre"><code id="ds-insp-edit">${editOutput(el)}</code></pre>`;
};
const editOutput = (el) => {
    const set = el._dsEdits ?? {};
    const lines = Object.entries(set).map(([prop, value]) => `  ${kebab(prop)}: ${value};`);
    return lines.length ? escapeHtml(`${describe(el)} {\n${lines.join('\n')}\n}`) : `<span class="ds-insp-empty">${text.noChanges}</span>`;
};
const applyEdit = (el, prop, value, kind) => {
    const css = kind === 'px' ? `${value}px` : value;
    el.style[prop] = css;
    el._dsEdits = {...(el._dsEdits ?? {}), [prop]: css};
};
const resetEdits = (el) => {
    Object.keys(el._dsEdits ?? {}).forEach((prop) => { el.style[prop] = ''; });
    el._dsEdits = {};
    STATES.forEach(([cls]) => el.classList.remove(cls));
    if ('disabled' in el) { el.disabled = false; } else { el.classList.remove('disabled'); }
};

const inspect = (el, keepPath = false) => {
    selected = el;
    if (!keepPath) {
        path = [];
        for (let node = el; node && !node.classList?.contains('ds-frame'); node = node.parentElement) { path.unshift(node); }
    }
    rail.dataset.rail = 'inspect';
    // Whatever fails while the panel is built must not leave a half-empty panel: say so in it.
    const build = (fn) => { try { return fn(el); } catch (error) { return `<p class="ds-insp-empty">${escapeHtml(String(error))}</p>`; } };
    const tabs = [['design', text.design], ['code', text.code], ['edit', text.edit]];
    const move = (to, label, tip, ok) => `<button type="button" data-inav="${to}" title="${tip}" aria-label="${tip}"${ok ? '' : ' disabled'}>${label}</button>`;
    const parent = el.parentElement && inFrame(el.parentElement);
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
const go = (to) => {
    if (!selected) { return; }
    const next = {up: selected.parentElement, prev: selected.previousElementSibling, next: selected.nextElementSibling, down: selected.firstElementChild}[to];
    if (next && inFrame(next)) { inspect(next); }
};

// ---------------------------------------------------------------- wiring
const closeMenus = (except) => { $$('details.ds-dd[open]').forEach((d) => { if (d !== except) { d.open = false; } }); };
const copy = async(value, el) => {
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
const EDIT_KIND = Object.fromEntries(EDITS.map(([prop, , kind]) => [prop, kind]));
const COPIES = {html: '#ds-insp-html', css: '#ds-insp-css', edit: '#ds-insp-edit'};

document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) { return; }
    closeMenus(target.closest('details.ds-dd'));

    // An element of an example is selected; everything else on a click is about the page.
    const frame = target.closest('.ds-frame');
    if (frame && target !== frame) { event.preventDefault(); inspect(target); return; }

    const itab = target.closest('[data-itab]');
    if (itab) {
        state.itab = itab.dataset.itab;
        $$('[data-itab]', body).forEach((b) => b.setAttribute('aria-selected', String(b === itab)));
        $$('[data-ipane]', body).forEach((p) => { p.hidden = p.dataset.ipane !== state.itab; });
        return;
    }
    const move = target.closest('[data-inav]');
    if (move) { go(move.dataset.inav); return; }
    const step = target.closest('[data-ipath]');
    if (step) { inspect(path[Number(step.dataset.ipath)], true); return; }
    if (target.closest('[data-edit-reset]') && selected) { resetEdits(selected); inspect(selected, true); return; }
    const code = target.closest('[data-copy-code]');
    if (code) { copy($(COPIES[code.dataset.copyCode]).innerText, code); return; }

    const tab = target.closest('[data-tab]');
    if (tab) {
        const block = tab.closest('.ds-example');
        $$('[data-tab]', block).forEach((b) => b.setAttribute('aria-selected', String(b === tab)));
        $$('[data-pane]', block).forEach((p) => { p.hidden = p.dataset.pane !== tab.dataset.tab; });
        return;
    }
    const icon = target.closest('[data-copy-id]');
    if (icon) { copy(icon.dataset.copyId, icon); return; }
    const copyBtn = target.closest('.ds-copy');
    if (copyBtn && !copyBtn.dataset.labCopy) {
        const node = copyBtn.parentElement.querySelector('code');
        const label = copyBtn.textContent;
        copy(node.textContent, copyBtn).then((ok) => { if (ok) { copyBtn.textContent = text.copied; setTimeout(() => { copyBtn.textContent = label; }, 1200); } });
        return;
    }

    const pick = target.closest('#ds-version [data-version], [data-pick-version]');
    if (pick) {
        state.version = pick.dataset.version ?? pick.dataset.pickVersion;
        store('ds-version', state.version);
        apply();
        return;
    }
    // The buttons of the colour mode carry data-set-mode: the side panel has a data-rail of its own, so nothing else can be taken for one.
    const mode = target.closest('[data-set-mode]');
    if (mode && MODES.includes(mode.dataset.setMode)) {
        state.mode = mode.dataset.setMode === 'system' ? null : mode.dataset.setMode;
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
    if (!(input instanceof HTMLElement) || !selected || !input.matches('[data-edit]')) { return; }
    const prop = input.dataset.edit;
    applyEdit(selected, prop, input.value, EDIT_KIND[prop]);
    $('#ds-insp-edit').innerHTML = editOutput(selected);
    drawSelection();
});
document.addEventListener('change', (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || !selected || !input.matches('[data-state]')) { return; }
    const flag = input.dataset.state;
    if (flag === 'disabled') {
        if ('disabled' in selected) { selected.disabled = input.checked; } else { selected.classList.toggle('disabled', input.checked); }
    } else {
        selected.classList.toggle(flag, input.checked);
    }
    drawSelection();
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') { clearSelection(); closeMenus(); return; }
    // With something selected the arrows walk the tree: up to the parent, down to the first child, sideways between siblings.
    const keys = {ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'prev', ArrowRight: 'next'};
    const typing = event.target instanceof Element && event.target.closest('input, select, textarea, [contenteditable]');
    if (selected && keys[event.key] && !typing && !event.altKey && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        go(keys[event.key]);
    }
});
document.addEventListener('submit', (event) => {
    if (event.target.closest('.ds-frame')) { event.preventDefault(); }
}, true);
// Capture: the canvas of an example scrolls on its own, and that does not bubble to the window.
window.addEventListener('scroll', () => { drawSelection(); if (hoverBox) { hoverBox.hidden = true; } }, {passive: true, capture: true});
window.addEventListener('resize', () => { drawSelection(); renderMeasures(); });
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (!state.mode) { apply(); } });
$('#ds-icon-filter')?.addEventListener('input', renderIcons);

$('#ds-find')?.addEventListener('input', (event) => {
    const q = event.target.value.trim().toLowerCase();
    $$('#ds-nav a[data-find]').forEach((a) => { a.hidden = q !== '' && !a.dataset.find.includes(q); });
    $$('#ds-nav [data-group]').forEach((g) => { g.hidden = $$('a', g).every((a) => a.hidden); });
});
const menu = $('#ds-menu');
const nav = $('#ds-nav');
menu?.addEventListener('click', () => { const open = !nav.classList.contains('is-open'); nav.classList.toggle('is-open', open); menu.setAttribute('aria-expanded', String(open)); });
nav?.addEventListener('click', (event) => { if (event.target.closest('a')) { nav.classList.remove('is-open'); menu?.setAttribute('aria-expanded', 'false'); } });

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
