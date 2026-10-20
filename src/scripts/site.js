// The behaviour of the documentation site: the selected Moodle version, colour mode and Didactika theme, the examples drawn with the CSS of that
// version, the icons of each version, and an inspector that measures anything inside an example and shows its code.
import './colour.js';
import {DIDACTIKA, styleElements, themeCss, toHex} from './theme.js';

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

// ---------------------------------------------------------------- Bootstrap 5 markup for the versions that have Bootstrap 4
const renamed = {
    'form-select': 'custom-select', 'form-select-sm': 'custom-select-sm', 'form-select-lg': 'custom-select-lg', 'visually-hidden': 'sr-only',
    'form-range': 'custom-range', 'float-end': 'float-right', 'float-start': 'float-left', 'text-end': 'text-right', 'text-start': 'text-left',
    'dropdown-menu-end': 'dropdown-menu-right', 'fw-bold': 'font-weight-bold', 'fw-semibold': 'font-weight-bold', 'fw-normal': 'font-weight-normal',
    'fst-italic': 'font-italic', 'rounded-end': 'rounded-right', 'rounded-start': 'rounded-left', 'text-bg-primary': 'badge-primary',
    'text-bg-secondary': 'badge-secondary', 'text-bg-success': 'badge-success', 'text-bg-danger': 'badge-danger', 'text-bg-warning': 'badge-warning',
    'text-bg-info': 'badge-info', 'text-bg-light': 'badge-light', 'text-bg-dark': 'badge-dark', 'form-label': '', 'form-check-reverse': '',
    'btn-close': 'close', 'g-0': 'no-gutters', 'accordion-button': 'btn btn-link', 'ratio': 'embed-responsive',
};
const toBootstrap4 = (html) => html.replace(/class="([^"]*)"/g, (match, value) => {
    const names = value.split(/\s+/).filter(Boolean).map((name) => {
        if (name in renamed) { return renamed[name]; }
        const spacing = name.match(/^([mp])([se])-((?:sm|md|lg|xl|xxl)-)?(\d|auto)$/);
        if (spacing) { return `${spacing[1]}${spacing[2] === 's' ? 'l' : 'r'}-${spacing[3] || ''}${spacing[4]}`; }
        return name;
    });
    return `class="${[...new Set(names.join(' ').split(/\s+/).filter(Boolean))].join(' ')}"`;
}).replace(/ data-bs-/g, ' data-');

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
    $$('[data-mode]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.mode === (state.mode ?? 'system'))));
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

// ---------------------------------------------------------------- inspector: design and code
const rail = $('#ds-rail') ?? document.createElement('div');
const body = $('#ds-insp-body') ?? document.createElement('div');
const layer = document.body.appendChild(document.createElement('div'));
layer.className = 'ds-layer';
let hoverBox = null;
let selected = null;
let path = [];

const describe = (el) => el.tagName.toLowerCase() + [...el.classList].filter((c) => !c.startsWith('ds-')).map((c) => `.${c}`).join('');
const clearSelection = () => {
    selected = null;
    path = [];
    layer.innerHTML = '';
    rail.dataset.mode = 'toc';
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

const designPane = (el) => {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const sides = (name) => ['Top', 'Right', 'Bottom', 'Left'].map((s) => px(cs[name === 'border' ? `border${s}Width` : `${name}${s}`]));
    const colour = (c) => `<span class="ds-dot" style="background:${c}"></span>${toHex(c)}`;
    const inner = (axis) => {
        const [a, b] = axis === 'w' ? ['Left', 'Right'] : ['Top', 'Bottom'];
        const total = axis === 'w' ? r.width : r.height;
        return Math.round((total - parseFloat(cs[`padding${a}`]) - parseFloat(cs[`padding${b}`]) - parseFloat(cs[`border${a}Width`]) - parseFloat(cs[`border${b}Width`])) * 10) / 10;
    };
    const rows = [
        ['Size', `${Math.round(r.width * 100) / 100} × ${Math.round(r.height * 100) / 100}`],
        ['Display', cs.display + (cs.display.includes('flex') ? ` · gap ${px(cs.columnGap === 'normal' ? '0px' : cs.columnGap)}` : '')],
        ['Font', cs.fontFamily.split(',')[0].replace(/"/g, '')],
        ['Font size', both(cs.fontSize)],
        ['Weight · line', `${cs.fontWeight} · ${px(cs.lineHeight)}`],
        ['Text', colour(cs.color)],
        ['Background', cs.backgroundColor === 'rgba(0, 0, 0, 0)' ? 'none' : colour(cs.backgroundColor)],
        ['Border', `${sides('border').join(' ')} ${cs.borderTopStyle}` + (parseFloat(cs.borderTopWidth) ? ` · ${toHex(cs.borderTopColor)}` : '')],
        ['Radius', [cs.borderTopLeftRadius, cs.borderTopRightRadius, cs.borderBottomRightRadius, cs.borderBottomLeftRadius].map(px).join(' ')],
        ['Shadow', cs.boxShadow === 'none' ? 'none' : cs.boxShadow],
    ];
    return `<div class="ds-box"><span class="l" style="top:.3rem;left:.5rem">margin ${sides('margin').join(' ')}</span>
        <div class="b"><span class="l" style="margin-top:-1.05rem;margin-left:-.6rem">border ${sides('border').join(' ')}</span>
          <div class="p"><span class="l" style="margin-top:-1rem;margin-left:-.6rem">padding ${sides('padding').join(' ')}</span>
            <div class="c">${inner('w')} × ${inner('h')}</div></div></div></div>
      <table class="ds-props">${rows.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('')}</table>`;
};

const inspect = (el, keepPath = false) => {
    selected = el;
    if (!keepPath) {
        path = [];
        for (let node = el; node && !node.classList?.contains('ds-frame'); node = node.parentElement) { path.unshift(node); }
    }
    rail.dataset.mode = 'inspect';
    // Whatever fails while the panel is built must not leave a half-empty panel: say so in it.
    let design = '';
    let code = '';
    try { design = designPane(el); } catch (error) { design = `<p class="ds-insp-empty">${escapeHtml(String(error))}</p>`; }
    try { code = codePane(el); } catch (error) { code = `<p class="ds-insp-empty">${escapeHtml(String(error))}</p>`; }
    body.innerHTML = `<div class="ds-insp-sel">${escapeHtml(describe(el))}</div>
      <div class="ds-itabs" role="tablist"><button type="button" role="tab" data-itab="design" aria-selected="${state.itab === 'design'}">${text.design}</button><button type="button" role="tab" data-itab="code" aria-selected="${state.itab === 'code'}">${text.code}</button></div>
      <div data-ipane="design"${state.itab === 'design' ? '' : ' hidden'}>${design}</div>
      <div data-ipane="code"${state.itab === 'code' ? '' : ' hidden'}>${code}</div>`;
    drawSelection();
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

document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) { return; }
    closeMenus(target.closest('details.ds-dd'));

    const inFrame = target.closest('.ds-frame');
    if (inFrame && target !== inFrame) { event.preventDefault(); inspect(target); return; }

    const itab = target.closest('[data-itab]');
    if (itab) {
        state.itab = itab.dataset.itab;
        $$('[data-itab]', body).forEach((b) => b.setAttribute('aria-selected', String(b === itab)));
        $$('[data-ipane]', body).forEach((p) => { p.hidden = p.dataset.ipane !== state.itab; });
        return;
    }
    const step = target.closest('[data-ipath]');
    if (step) { inspect(path[Number(step.dataset.ipath)], true); return; }
    const code = target.closest('[data-copy-code]');
    if (code) { copy($(code.dataset.copyCode === 'html' ? '#ds-insp-html' : '#ds-insp-css').innerText, code); return; }

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
    const mode = target.closest('[data-mode]');
    if (mode) {
        state.mode = mode.dataset.mode === 'system' ? null : mode.dataset.mode;
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
    if (!target.closest('#ds-rail') && !inFrame) { clearSelection(); }
});
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') { clearSelection(); closeMenus(); }
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
