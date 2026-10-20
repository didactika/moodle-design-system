// The colour page: every colour of the selected Moodle version (its theme colours, Bootstrap's palette with its scales, the grays, the
// subtle and emphasis tones, Moodle 5.3's own scales) next to Didactika's, with its contrast and a format that can be switched, and a lab
// where a theme colour can be changed and seen on real components. Everything reads from the stylesheet of the selected version.

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const readJson = (id) => { const node = document.getElementById(id); return node ? JSON.parse(node.textContent) : null; };

const tokens = readJson('ds-tokens-data');
const labText = readJson('ds-lab-text');
if (tokens || labText) {
    const state = {format: 'hex', version: document.documentElement.dataset.version, dark: false, lab: null};

    // ---------------------------------------------------------------- colour maths
    const parse = (value) => {
        const m = String(value).match(/rgba?\(([\d.]+)[, ]+([\d.]+)[, ]+([\d.]+)(?:[,/ ]+([\d.]+))?\)/);
        if (m) { return {r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4]}; }
        const h = String(value).trim().replace('#', '');
        const full = h.length === 3 ? h.split('').map((x) => x + x).join('') : h;
        if (/^[0-9a-f]{6}([0-9a-f]{2})?$/i.test(full)) {
            return {r: parseInt(full.slice(0, 2), 16), g: parseInt(full.slice(2, 4), 16), b: parseInt(full.slice(4, 6), 16), a: full.length === 8 ? parseInt(full.slice(6), 16) / 255 : 1};
        }
        return null;
    };
    const hex = ({r, g, b}) => `#${[r, g, b].map((x) => Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, '0')).join('')}`;
    const hsl = ({r, g, b}) => {
        const [R, G, B] = [r, g, b].map((x) => x / 255);
        const max = Math.max(R, G, B);
        const min = Math.min(R, G, B);
        const l = (max + min) / 2;
        const d = max - min;
        const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
        let h = 0;
        if (d !== 0) { h = max === R ? ((G - B) / d) % 6 : max === G ? (B - R) / d + 2 : (R - G) / d + 4; }
        return `hsl(${Math.round((h * 60 + 360) % 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%)`;
    };
    const format = (c) => {
        if (state.format === 'rgb') { return `rgb(${Math.round(c.r)} ${Math.round(c.g)} ${Math.round(c.b)})`; }
        if (state.format === 'hsl') { return hsl(c); }
        return hex(c);
    };
    const mix = (a, b, weight) => ({r: a.r * weight + b.r * (1 - weight), g: a.g * weight + b.g * (1 - weight), b: a.b * weight + b.b * (1 - weight), a: 1});
    const WHITE = {r: 255, g: 255, b: 255, a: 1};
    const BLACK = {r: 0, g: 0, b: 0, a: 1};
    // Bootstrap's own functions: a tint mixes with white and a shade with black, by the weight of the white or black.
    const tint = (c, w) => mix(WHITE, c, w / 100);
    const shade = (c, w) => mix(BLACK, c, w / 100);
    const lum = ({r, g, b}) => {
        const f = (x) => { const v = x / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
    /** The text colour that reads best on a background, with its contrast ratio. */
    const onColour = (bg) => {
        const w = contrast(WHITE, bg);
        const k = contrast({r: 33, g: 37, b: 41, a: 1}, bg);
        return w >= k ? {ink: '#fff', ratio: w} : {ink: '#212529', ratio: k};
    };
    const grade = (ratio) => (ratio >= 7 ? 'AAA' : ratio >= 4.5 ? 'AA' : ratio >= 3 ? 'AA large' : '·');

    // ---------------------------------------------------------------- reading the selected version
    const scope = () => $('[data-colour-scope]') ?? document.body;
    const resolve = (cssValue) => {
        const probe = document.createElement('i');
        probe.style.cssText = `position:absolute;visibility:hidden;color:${cssValue}`;
        scope().appendChild(probe);
        const value = getComputedStyle(probe).color;
        probe.remove();
        return parse(value);
    };
    const token = (names) => { const set = tokens[state.version].light; const hit = names.find((n) => n in set); return hit ? {name: hit, c: resolve(`var(${hit})`)} : null; };
    const bs5 = () => !(state.version === 'v41' || state.version === 'v45');
    const pre = () => (bs5() ? '--bs-' : '--');
    const ROLES = ['primary', 'secondary', 'success', 'info', 'warning', 'danger', 'light', 'dark'];
    const HUES = ['blue', 'indigo', 'purple', 'pink', 'red', 'orange', 'yellow', 'green', 'teal', 'cyan'];
    const GRAYS = {100: '#f8f9fa', 200: '#e9ecef', 300: '#dee2e6', 400: '#ced4da', 500: '#adb5bd', 600: '#6c757d', 700: '#495057', 800: '#343a40', 900: '#212529'};

    // ---------------------------------------------------------------- Didactika's colours (the logo and didactika.org)
    const TEAL = {50: '#f0fdfa', 100: '#ccfbf1', 200: '#99f6e4', 300: '#5eead4', 400: '#2dd4bf', 500: '#14b8a6', 600: '#0d9488', 700: '#0f766e', 800: '#115e59', 900: '#134e4a', 950: '#042f2e'};
    const BRAND = [['logo', '#00555a'], ...Object.entries(TEAL).map(([k, v]) => [`teal-${k}`, v]), ['emerald-600', '#059669'], ['emerald-700', '#047857'], ['cyan-500', '#06b6d4'], ['slate-50', '#f8fafc'], ['slate-600', '#475569'], ['slate-900', '#0f172a']];
    const PROPOSAL = {primary: '#0f766e', secondary: '#475569', success: '#15803d', info: '#0e7490', warning: '#b45309', danger: '#b91c1c'};

    // ---------------------------------------------------------------- swatches
    const swatch = (name, c, extra = '') => {
        const text = onColour(c);
        const value = format(c);
        return `<button type="button" class="ds-sw" data-copy="${value}" title="${value}">
            <span class="c" style="background:${hex(c)};color:${text.ink}"><span class="aa">Aa</span><span class="k">${text.ratio.toFixed(1)} ${grade(text.ratio)}</span></span>
            <span class="m"><b>${name}</b><code>${value}</code>${extra}</span></button>`;
    };
    const scaleStrip = (name, base) => {
        const steps = [[100, tint(base, 80)], [200, tint(base, 60)], [300, tint(base, 40)], [400, tint(base, 20)], [500, base], [600, shade(base, 20)], [700, shade(base, 40)], [800, shade(base, 60)], [900, shade(base, 80)]];
        return `<div class="ds-scale-row"><h4>${name}</h4><div class="ds-scale2">${steps.map(([n, c]) => {
            const t = onColour(c);
            return `<button type="button" class="ds-step" data-copy="${format(c)}" style="background:${hex(c)};color:${t.ink}" title="${name}-${n} · ${format(c)} · ${t.ratio.toFixed(1)}:1"><b>${n}</b><span>${format(c)}</span></button>`;
        }).join('')}</div></div>`;
    };

    const sections = {
        brand: () => `<div class="ds-sws">${BRAND.map(([n, v]) => swatch(n, parse(v))).join('')}</div>`,
        proposal: () => `<div class="ds-sws">${Object.entries(PROPOSAL).map(([n, v]) => swatch(n, parse(v))).join('')}</div>`,
        theme: () => `<div class="ds-sws">${ROLES.map((r) => token([`${pre()}${r}`])).filter(Boolean).map((t) => swatch(t.name, t.c)).join('')}</div>`,
        surface: () => {
            const names = bs5()
                ? ['body-color', 'body-bg', 'emphasis-color', 'secondary-color', 'secondary-bg', 'tertiary-color', 'tertiary-bg', 'border-color', 'link-color', 'link-hover-color'].map((n) => `--bs-${n}`)
                : ['--font-family-sans-serif'].slice(0, 0);
            return names.length ? `<div class="ds-sws">${names.map((n) => token([n])).filter(Boolean).map((t) => swatch(t.name, t.c)).join('')}</div>` : '';
        },
        subtle: () => {
            if (!bs5()) { return `<p class="ds-nodark">${labText.only5}</p>`; }
            return `<div class="ds-sws">${['primary', 'secondary', 'success', 'info', 'warning', 'danger'].flatMap((r) => [`--bs-${r}-bg-subtle`, `--bs-${r}-border-subtle`, `--bs-${r}-text-emphasis`]).map((n) => token([n])).filter(Boolean).map((t) => swatch(t.name, t.c)).join('')}</div>`;
        },
        palette: () => {
            const bases = HUES.map((h) => [h, token([`${pre()}${h}`])]).filter(([, t]) => t);
            const sws = `<div class="ds-sws">${[...bases.map(([h, t]) => swatch(t.name, t.c)), ...['black', 'white'].map((n) => token([`${pre()}${n}`])).filter(Boolean).map((t) => swatch(t.name, t.c))].join('')}</div>`;
            return bs5() ? sws + bases.map(([h, t]) => scaleStrip(h, t.c)).join('') : sws + `<p class="ds-nodark">${labText.noScales}</p>`;
        },
        grays: () => {
            const live = bs5() ? Object.keys(GRAYS).map((n) => token([`--bs-gray-${n}`])) : [];
            const list = Object.entries(GRAYS).map(([n, v], i) => (live[i] ? [`gray-${n}`, live[i].c] : [`gray-${n}`, parse(v)]));
            const extra = ['gray', 'gray-dark'].map((n) => token([`${pre()}${n}`])).filter(Boolean).map((t) => [t.name.replace(pre(), ''), t.c]);
            return `<div class="ds-sws">${[...list, ...extra].map(([n, c]) => swatch(n, c)).join('')}</div>`;
        },
        scale: () => {
            const set = tokens[state.version].light;
            const hues = [...new Set(Object.keys(set).filter((n) => /^--mds-color-[a-z]+-\d+$/.test(n)).map((n) => n.split('-')[3]))];
            if (!hues.length) { return `<p class="ds-nodark">${labText.noMds}</p>`; }
            return hues.map((hue) => {
                const steps = Object.keys(set).filter((n) => new RegExp(`^--mds-color-${hue}-\\d+$`).test(n)).sort((a, b) => +a.split('-').pop() - +b.split('-').pop());
                return `<div class="ds-scale-row"><h4>${hue}</h4><div class="ds-scale2">${steps.map((n) => {
                    const c = resolve(`var(${n})`);
                    const t = onColour(c);
                    return `<button type="button" class="ds-step" data-copy="${format(c)}" style="background:${hex(c)};color:${t.ink}" title="${n} · ${format(c)} · ${t.ratio.toFixed(1)}:1"><b>${n.split('-').pop()}</b><span>${format(c)}</span></button>`;
                }).join('')}</div></div>`;
            }).join('');
        },
    };

    const renderSections = () => {
        $$('[data-colours]').forEach((host) => { host.innerHTML = sections[host.dataset.colours]?.() ?? ''; });
    };

    // ---------------------------------------------------------------- the lab
    const ink = (c) => (onColour(c).ink === '#fff' ? '#fff' : '#212529');
    const rgbList = (c) => `${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)}`;
    const labCss = (colours) => {
        const five = bs5();
        const rules = [];
        for (const [role, value] of Object.entries(colours)) {
            const c = parse(value);
            if (!c) { continue; }
            const T = ink(c);
            const hover = shade(c, 15);
            const active = shade(c, 20);
            const border = shade(c, 20);
            const soft = tint(c, 80);
            const softBorder = tint(c, 60);
            const deep = shade(c, 60);
            if (five) {
                rules.push(`.ds-lab .btn-${role}{--bs-btn-color:${T};--bs-btn-bg:${hex(c)};--bs-btn-border-color:${hex(c)};--bs-btn-hover-color:${ink(hover)};--bs-btn-hover-bg:${hex(hover)};--bs-btn-hover-border-color:${hex(border)};--bs-btn-focus-shadow-rgb:${rgbList(mix(c, parse(T), 0.85))};--bs-btn-active-color:${ink(active)};--bs-btn-active-bg:${hex(active)};--bs-btn-active-border-color:${hex(shade(c, 25))};--bs-btn-disabled-color:${T};--bs-btn-disabled-bg:${hex(c)};--bs-btn-disabled-border-color:${hex(c)}}`);
                rules.push(`.ds-lab .btn-outline-${role}{--bs-btn-color:${hex(c)};--bs-btn-border-color:${hex(c)};--bs-btn-hover-color:${T};--bs-btn-hover-bg:${hex(c)};--bs-btn-hover-border-color:${hex(c)};--bs-btn-focus-shadow-rgb:${rgbList(c)};--bs-btn-active-color:${T};--bs-btn-active-bg:${hex(c)};--bs-btn-active-border-color:${hex(c)};--bs-btn-disabled-color:${hex(c)};--bs-btn-disabled-border-color:${hex(c)}}`);
                rules.push(`.ds-lab .alert-${role}{--bs-alert-color:${hex(deep)};--bs-alert-bg:${hex(soft)};--bs-alert-border-color:${hex(softBorder)}}`);
            } else {
                rules.push(`.ds-lab .btn-${role}{color:${T};background-color:${hex(c)};border-color:${hex(c)}}.ds-lab .btn-${role}:hover,.ds-lab .btn-${role}.ds-is-hover{color:${ink(hover)};background-color:${hex(hover)};border-color:${hex(border)}}.ds-lab .btn-${role}:focus,.ds-lab .btn-${role}.ds-is-focus{box-shadow:0 0 0 .2rem rgba(${rgbList(mix(c, parse(T), 0.85))},.5)}.ds-lab .btn-${role}:active,.ds-lab .btn-${role}.ds-is-active{color:${ink(active)};background-color:${hex(active)};border-color:${hex(shade(c, 25))}}`);
                rules.push(`.ds-lab .btn-outline-${role}{color:${hex(c)};border-color:${hex(c)}}.ds-lab .btn-outline-${role}:hover,.ds-lab .btn-outline-${role}.ds-is-hover{color:${T};background-color:${hex(c)};border-color:${hex(c)}}.ds-lab .btn-outline-${role}:focus{box-shadow:0 0 0 .2rem rgba(${rgbList(c)},.5)}`);
                rules.push(`.ds-lab .alert-${role}{color:${hex(deep)};background-color:${hex(soft)};border-color:${hex(softBorder)}}`);
            }
            rules.push(`.ds-lab .text-${role}{color:${hex(c)}!important}.ds-lab .bg-${role}{background-color:${hex(c)}!important;color:${T}}.ds-lab .border-${role}{border-color:${hex(c)}!important}`);
            if (role === 'primary') {
                rules.push(`.ds-lab a:not(.btn){color:${hex(c)}}.ds-lab .progress-bar{background-color:${hex(c)}}.ds-lab .list-group-item.active{background-color:${hex(c)};border-color:${hex(c)};color:${T}}.ds-lab .form-control:focus,.ds-lab .custom-select:focus,.ds-lab .form-select:focus{border-color:${hex(tint(c, 50))};box-shadow:0 0 0 .25rem rgba(${rgbList(c)},.25)}.ds-lab .form-check-input:checked{background-color:${hex(c)};border-color:${hex(c)}}.ds-lab .nav-pills .nav-link.active{background-color:${hex(c)};color:${T}}`);
            }
        }
        return rules.join('\n');
    };
    const labOutput = (colours) => {
        const scss = Object.entries(colours).map(([r, v]) => `$${r}: ${v};`).join('\n');
        const css = `:root {\n${Object.entries(colours).map(([r, v]) => `  --bs-${r}: ${v};\n  --bs-${r}-rgb: ${rgbList(parse(v))};`).join('\n')}\n}`;
        return {scss, css};
    };
    const renderLab = () => {
        const lab = $('[data-lab]');
        if (!lab) { return; }
        let style = $('#ds-lab-style');
        if (!style) { style = document.createElement('style'); style.id = 'ds-lab-style'; document.head.appendChild(style); }
        style.textContent = labCss(state.lab);
        const out = labOutput(state.lab);
        $('[data-lab-scss]').textContent = out.scss;
        $('[data-lab-css]').textContent = out.css;
        $$('[data-lab-role]').forEach((input) => {
            const role = input.dataset.labRole;
            if (input.type === 'color' && input.value !== state.lab[role]) { input.value = state.lab[role]; }
            if (input.type === 'text' && document.activeElement !== input) { input.value = state.lab[role]; }
        });
        $$('[data-lab-ratio]').forEach((el) => {
            const c = parse(state.lab[el.dataset.labRatio]);
            const t = onColour(c);
            el.textContent = `${t.ratio.toFixed(1)}:1 ${grade(t.ratio)}`;
            el.dataset.pass = t.ratio >= 4.5 ? 'yes' : 'no';
        });
    };
    const presets = () => readJson('ds-lab-presets');
    const setPreset = (name) => {
        const all = presets();
        const stock = {};
        for (const role of ['primary', 'secondary', 'success', 'info', 'warning', 'danger']) {
            const t = token([`${pre()}${role}`]);
            stock[role] = t ? hex(t.c) : '#0f6cbf';
        }
        state.lab = name === 'stock' ? stock : {...stock, ...all[name]};
        $$('[data-lab-preset]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.labPreset === name)));
        renderLab();
    };

    // ---------------------------------------------------------------- wiring
    document.addEventListener('ds:render', (event) => {
        state.version = event.detail.version;
        state.dark = event.detail.dark;
        renderSections();
        if ($('[data-lab]')) { if (!state.lab) { setPreset('stock'); } else { renderLab(); } }
    });
    document.addEventListener('click', (event) => {
        const target = event.target instanceof Element ? event.target : null;
        if (!target) { return; }
        const fmt = target.closest('[data-colour-format]');
        if (fmt) {
            state.format = fmt.dataset.colourFormat;
            $$('[data-colour-format]').forEach((b) => b.setAttribute('aria-pressed', String(b === fmt)));
            renderSections();
            return;
        }
        const preset = target.closest('[data-lab-preset]');
        if (preset) { setPreset(preset.dataset.labPreset); return; }
        const copy = target.closest('.ds-sw, .ds-step, [data-lab-copy]');
        if (copy) {
            const value = copy.matches('[data-lab-copy]') ? $(copy.dataset.labCopy).textContent : copy.dataset.copy;
            const done = () => { copy.classList.add('is-copied'); setTimeout(() => copy.classList.remove('is-copied'), 900); };
            try { navigator.clipboard.writeText(value).then(done, () => {}); } catch (error) { /* the value stays readable */ }
        }
    });
    document.addEventListener('input', (event) => {
        const input = event.target;
        if (!(input instanceof HTMLInputElement) || !input.dataset.labRole) { return; }
        const value = input.value.trim();
        if (!parse(value) || (input.type === 'text' && !/^#[0-9a-f]{6}$/i.test(value))) { return; }
        state.lab = {...state.lab, [input.dataset.labRole]: value.toLowerCase()};
        $$('[data-lab-preset]').forEach((b) => b.setAttribute('aria-pressed', 'false'));
        renderLab();
    });
}
