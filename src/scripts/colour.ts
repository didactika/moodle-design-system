// The colour page: every colour of the selected Moodle version (its theme colours, Bootstrap's palette with its scales, the grays, the subtle and
// emphasis tones, Moodle 5.3's own scales) and Didactika's brand colours, each with its contrast, in a format that can be switched and copied,
// and a lab where a theme colour can be changed and seen on real components. Everything reads from the stylesheet of the selected version.
import brand from '../data/brand.json';
import {DIDACTIKA, ROLES, grade, hex, onColour, parse, shade, styleElements, themeCss, tint} from './theme';
import type {Colours, Rgba, Role} from './theme';
import {$, $$, present, readJson} from './dom';

/** The CSS variables of every Moodle version, light and dark, as `tools/extract-data.ts` wrote them. */
type Tokens = Record<string, {light: Record<string, string>; dark?: Record<string, string>}>;
type Format = 'hex' | 'rgb' | 'hsl';
interface State { format: Format; version: string; lab: Colours; preset: string }
type Step = [string | number, Rgba];

const tokens = readJson<Tokens>('ds-tokens-data');
if (tokens) {
    const state: State = {format: 'hex', version: document.documentElement.dataset.version ?? 'v53', lab: {...DIDACTIKA}, preset: 'stock'};

    // ---------------------------------------------------------------- formats
    const hsl = ({r, g, b}: Rgba): string => {
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
    const format = (c: Rgba): string => {
        if (state.format === 'rgb') { return `rgb(${Math.round(c.r)} ${Math.round(c.g)} ${Math.round(c.b)})`; }
        if (state.format === 'hsl') { return hsl(c); }
        return hex(c);
    };

    // ---------------------------------------------------------------- reading the selected version
    const scope = (): HTMLElement => $('[data-colour-scope]') ?? document.body;
    const resolve = (cssValue: string): Rgba => {
        const probe = document.createElement('i');
        probe.style.cssText = `position:absolute;visibility:hidden;color:${cssValue}`;
        scope().appendChild(probe);
        const value = getComputedStyle(probe).color;
        probe.remove();
        return parse(value) as Rgba;
    };
    const token = (names: string[]): {name: string; c: Rgba} | null => { const set = tokens[state.version].light; const hit = names.find((n) => n in set); return hit ? {name: hit, c: resolve(`var(${hit})`)} : null; };
    const bs5 = () => !(state.version === 'v41' || state.version === 'v45');
    const pre = () => (bs5() ? '--bs-' : '--');
    const THEME = ['primary', 'secondary', 'success', 'info', 'warning', 'danger', 'light', 'dark'];
    const HUES = ['blue', 'indigo', 'purple', 'pink', 'red', 'orange', 'yellow', 'green', 'teal', 'cyan'];
    const GRAYS: Record<string, string> = {100: '#f8f9fa', 200: '#e9ecef', 300: '#dee2e6', 400: '#ced4da', 500: '#adb5bd', 600: '#6c757d', 700: '#495057', 800: '#343a40', 900: '#212529'};

    // ---------------------------------------------------------------- Didactika's colours (the logo and didactika.org)
    const BRAND: [string, string][] = [['logo', brand.logo], ...Object.entries(brand.teal).map(([k, v]): [string, string] => [`teal-${k}`, v]), ...Object.entries(brand.extra)];

    // ---------------------------------------------------------------- swatches
    const swatch = (name: string, c: Rgba): string => {
        const text = onColour(c);
        const value = format(c);
        return `<button type="button" class="ds-sw" data-copy="${value}" title="${value}">
            <span class="c" style="background:${hex(c)};color:${text.ink}"><span class="aa">Aa</span><span class="k">${text.ratio.toFixed(1)} ${grade(text.ratio)}</span></span>
            <span class="m"><b>${name}</b><code>${value}</code></span></button>`;
    };
    const scaleRow = (name: string, steps: Step[]): string => `<div class="ds-scale-row"><h4>${name}</h4><div class="ds-scale2">${steps.map(([n, c]) => {
        const t = onColour(c);
        return `<button type="button" class="ds-step" data-copy="${format(c)}" style="background:${hex(c)};color:${t.ink}" title="${name}-${n} · ${format(c)} · ${t.ratio.toFixed(1)}:1"><b>${n}</b><span>${format(c)}</span></button>`;
    }).join('')}</div></div>`;
    const scaleOf = (base: Rgba): Step[] => [[100, tint(base, 80)], [200, tint(base, 60)], [300, tint(base, 40)], [400, tint(base, 20)], [500, base], [600, shade(base, 20)], [700, shade(base, 40)], [800, shade(base, 60)], [900, shade(base, 80)]];

    const sections: Record<string, () => string> = {
        brand: () => `<div class="ds-sws">${BRAND.map(([n, v]) => swatch(n, parse(v) as Rgba)).join('')}</div>`,
        theme: () => `<div class="ds-sws">${THEME.map((r) => token([`${pre()}${r}`])).filter(present).map((t) => swatch(t.name, t.c)).join('')}</div>`,
        surface: () => {
            if (!bs5()) { return ''; }
            const names = ['body-color', 'body-bg', 'emphasis-color', 'secondary-color', 'secondary-bg', 'tertiary-color', 'tertiary-bg', 'border-color', 'link-color', 'link-hover-color'].map((n) => `--bs-${n}`);
            return `<div class="ds-sws">${names.map((n) => token([n])).filter(present).map((t) => swatch(t.name, t.c)).join('')}</div>`;
        },
        subtle: () => {
            if (!bs5()) { return ''; }
            const names = ['primary', 'secondary', 'success', 'info', 'warning', 'danger'].flatMap((r) => [`--bs-${r}-bg-subtle`, `--bs-${r}-border-subtle`, `--bs-${r}-text-emphasis`]);
            return `<div class="ds-sws">${names.map((n) => token([n])).filter(present).map((t) => swatch(t.name, t.c)).join('')}</div>`;
        },
        palette: () => {
            const bases = HUES.map((h) => token([`${pre()}${h}`])).filter(present);
            const bw = ['black', 'white'].map((n) => token([`${pre()}${n}`])).filter(present);
            const sws = `<div class="ds-sws">${[...bases, ...bw].map((t) => swatch(t.name, t.c)).join('')}</div>`;
            return bs5() ? sws + bases.map((t) => scaleRow(t.name.replace('--bs-', ''), scaleOf(t.c))).join('') : sws;
        },
        grays: () => {
            const list = Object.entries(GRAYS).map(([n, v]): [string, Rgba] => { const t = bs5() ? token([`--bs-gray-${n}`]) : null; return [`gray-${n}`, t ? t.c : parse(v) as Rgba]; });
            const extra = ['gray', 'gray-dark'].map((n) => token([`${pre()}${n}`])).filter((t): t is {name: string; c: Rgba} => t !== null).map((t): [string, Rgba] => [t.name.replace(pre(), ''), t.c]);
            return `<div class="ds-sws">${[...list, ...extra].map(([n, c]) => swatch(n, c)).join('')}</div>`;
        },
        scale: () => {
            const set = tokens[state.version].light;
            const hues = [...new Set(Object.keys(set).filter((n) => /^--mds-color-[a-z]+-\d+$/.test(n)).map((n) => n.split('-')[3] as string))];
            if (!hues.length) { return ''; }
            return hues.map((hue) => {
                const steps = Object.keys(set).filter((n) => new RegExp(`^--mds-color-${hue}-\\d+$`).test(n)).sort((a, b) => Number(a.split('-').pop()) - Number(b.split('-').pop()));
                return scaleRow(hue, steps.map((n): Step => [n.split('-').pop() as string, resolve(`var(${n})`)]));
            }).join('');
        },
    };
    const renderSections = () => { $$('[data-colours]').forEach((host) => { host.innerHTML = sections[host.dataset.colours ?? '']?.() ?? ''; }); };

    // ---------------------------------------------------------------- the lab
    const labOutput = (colours: Colours) => ({
        scss: Object.entries(colours).map(([r, v]) => `$${r}: ${v};`).join('\n'),
        css: `:root {\n${Object.entries(colours).map(([r, v]) => `  --bs-${r}: ${v};\n  --bs-${r}-rgb: ${Math.round((parse(v) as Rgba).r)}, ${Math.round((parse(v) as Rgba).g)}, ${Math.round((parse(v) as Rgba).b)};`).join('\n')}\n}`,
    });
    const renderLab = () => {
        const lab = $('[data-lab]');
        if (!lab) { return; }
        styleElements().lab.textContent = themeCss(state.lab, '.ds-v-scope.ds-lab', bs5());
        const out = labOutput(state.lab);
        const scssBox = $('[data-lab-scss]');
        const cssBox = $('[data-lab-css]');
        if (scssBox) { scssBox.textContent = out.scss; }
        if (cssBox) { cssBox.textContent = out.css; }
        $$<HTMLInputElement>('[data-lab-role]').forEach((input) => {
            const role = input.dataset.labRole as Role;
            if (input.type === 'color' && input.value !== state.lab[role]) { input.value = state.lab[role]; }
            if (input.type === 'text' && document.activeElement !== input) { input.value = state.lab[role]; }
        });
        $$('[data-lab-ratio]').forEach((el) => {
            const t = onColour(parse(state.lab[el.dataset.labRatio as Role]) as Rgba);
            el.textContent = `${t.ratio.toFixed(1)}:1 ${grade(t.ratio)}`;
            el.dataset.pass = t.ratio >= 4.5 ? 'yes' : 'no';
        });
    };
    const presets = (): Record<string, Partial<Colours>> => readJson<Record<string, Partial<Colours>>>('ds-lab-presets') ?? {};
    const setPreset = (name: string): void => {
        state.preset = name;
        const current: Partial<Colours> = {};
        for (const role of ROLES) { const t = token([`${pre()}${role}`]); current[role] = t ? hex(t.c) : DIDACTIKA[role]; }
        state.lab = {...DIDACTIKA, ...current, ...(name === 'stock' ? {} : presets()[name])};
        $$('[data-lab-preset]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.labPreset === name)));
        renderLab();
    };

    // ---------------------------------------------------------------- wiring
    document.addEventListener('ds:render', (event) => {
        state.version = (event as CustomEvent<{version: string}>).detail.version;
        renderSections();
        if ($('[data-lab]')) {
            // The current theme follows the version and the Didactika switch; a preset or a colour of your own stays until it is changed.
            if (state.preset === 'stock') { setPreset('stock'); } else { renderLab(); }
        }
    });
    document.addEventListener('click', (event) => {
        const target = event.target instanceof Element ? event.target : null;
        if (!target) { return; }
        const fmt = target.closest<HTMLElement>('[data-colour-format]');
        if (fmt) {
            state.format = fmt.dataset.colourFormat as Format;
            $$('[data-colour-format]').forEach((b) => b.setAttribute('aria-pressed', String(b === fmt)));
            renderSections();
            return;
        }
        const preset = target.closest<HTMLElement>('[data-lab-preset]');
        if (preset) { setPreset(preset.dataset.labPreset ?? 'stock'); return; }
        const copy = target.closest<HTMLElement>('.ds-sw, .ds-step, [data-lab-copy]');
        if (copy) {
            const value = (copy.matches('[data-lab-copy]') ? $(copy.dataset.labCopy ?? '')?.textContent : copy.dataset.copy) ?? '';
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
        state.preset = 'own';
        $$('[data-lab-preset]').forEach((b) => b.setAttribute('aria-pressed', 'false'));
        renderLab();
    });
}
