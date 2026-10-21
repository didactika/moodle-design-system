// Colour maths and the CSS of a theme, shared by the colour page (the lab) and the switch of the header that puts Didactika's colours on every
// example. A theme here is the six roles of Bootstrap (primary to danger); the rest follows from them the way Bootstrap derives it.

import brand from '../data/brand.json';

/** A colour as the maths of this file handles it: channels from 0 to 255 and an alpha from 0 to 1. */
export interface Rgba { r: number; g: number; b: number; a: number }
export type Role = 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'danger' | 'light' | 'dark';
export type Colours = Record<Role, string>;

export const ROLES: Role[] = ['primary', 'secondary', 'success', 'info', 'warning', 'danger', 'light', 'dark'];

/** Didactika's roles (src/data/brand.json). Each reaches AA (4.5:1) with white text. */
export const DIDACTIKA: Colours = brand.roles as Colours;

export const parse = (value: string): Rgba | null => {
    const m = String(value).match(/rgba?\(([\d.]+)[, ]+([\d.]+)[, ]+([\d.]+)(?:[,/ ]+([\d.]+))?\)/);
    if (m) { return {r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4]}; }
    const h = String(value).trim().replace('#', '');
    const full = h.length === 3 ? h.split('').map((x) => x + x).join('') : h;
    if (/^[0-9a-f]{6}([0-9a-f]{2})?$/i.test(full)) {
        return {r: parseInt(full.slice(0, 2), 16), g: parseInt(full.slice(2, 4), 16), b: parseInt(full.slice(4, 6), 16), a: full.length === 8 ? parseInt(full.slice(6), 16) / 255 : 1};
    }
    return null;
};
export const hex = ({r, g, b}: Pick<Rgba, 'r' | 'g' | 'b'>): string => `#${[r, g, b].map((x) => Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, '0')).join('')}`;
export const toHex = (css: string): string => {
    const c = parse(css);
    if (!c) { return css; }
    return c.a < 1 ? `${hex(c)} · ${Math.round(c.a * 100)}%` : hex(c);
};
export const rgbList = (c: Rgba): string => `${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)}`;
export const mix = (a: Rgba, b: Rgba, weight: number): Rgba => ({r: a.r * weight + b.r * (1 - weight), g: a.g * weight + b.g * (1 - weight), b: a.b * weight + b.b * (1 - weight), a: 1});
export const WHITE: Rgba = {r: 255, g: 255, b: 255, a: 1};
export const BLACK: Rgba = {r: 0, g: 0, b: 0, a: 1};
/** Bootstrap's own functions: a tint mixes with white and a shade with black, by the weight of the white or the black. */
export const tint = (c: Rgba, weight: number): Rgba => mix(WHITE, c, weight / 100);
export const shade = (c: Rgba, weight: number): Rgba => mix(BLACK, c, weight / 100);
const luminance = ({r, g, b}: Rgba): number => {
    const f = (x: number) => { const v = x / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
export const contrast = (a: Rgba, b: Rgba): number => { const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
/** The text colour that reads best on a background, with its contrast ratio. */
export const onColour = (bg: Rgba): {ink: string; ratio: number} => {
    const w = contrast(WHITE, bg);
    const k = contrast({r: 33, g: 37, b: 41, a: 1}, bg);
    return w >= k ? {ink: '#fff', ratio: w} : {ink: '#212529', ratio: k};
};
export const grade = (ratio: number): string => (ratio >= 7 ? 'AAA' : ratio >= 4.5 ? 'AA' : ratio >= 3 ? 'AA large' : '·');
const ink = (c: Rgba): string => onColour(c).ink;

/**
 * The CSS that gives the examples under `sel` the colours of a theme.
 *
 * Bootstrap 5 draws its components from variables, so overriding them is enough: the roles and their subtle tones, the variables of each
 * button (they are compiled into Bootstrap's classes) and the link colour. Bootstrap 4 has fixed colours, so its rules are written out.
 * `sel` has to beat the stylesheet of the version (`.ds-v53 .btn-primary`), hence the two classes.
 */
export const themeCss = (colours: Partial<Colours>, sel: string, five: boolean): string => {
    const out: string[] = [];
    for (const role of ROLES) {
        const c = parse(colours[role] ?? '');
        if (!c) { continue; }
        const text = ink(c);
        const textRgba = parse(text) as Rgba;
        const hover = shade(c, 15);
        const active = shade(c, 20);
        const border = shade(c, 20);
        if (five) {
            out.push(`${sel}{--bs-${role}:${hex(c)};--bs-${role}-rgb:${rgbList(c)};--bs-${role}-bg-subtle:${hex(tint(c, 80))};--bs-${role}-border-subtle:${hex(tint(c, 60))};--bs-${role}-text-emphasis:${hex(shade(c, 60))}}`);
            out.push(`${sel}[data-bs-theme="dark"]{--bs-${role}-bg-subtle:${hex(shade(c, 80))};--bs-${role}-border-subtle:${hex(shade(c, 60))};--bs-${role}-text-emphasis:${hex(tint(c, 40))}}`);
            out.push(`${sel} .btn-${role}{--bs-btn-color:${text};--bs-btn-bg:${hex(c)};--bs-btn-border-color:${hex(c)};--bs-btn-hover-color:${ink(hover)};--bs-btn-hover-bg:${hex(hover)};--bs-btn-hover-border-color:${hex(border)};--bs-btn-focus-shadow-rgb:${rgbList(mix(c, textRgba, 0.85))};--bs-btn-active-color:${ink(active)};--bs-btn-active-bg:${hex(active)};--bs-btn-active-border-color:${hex(shade(c, 25))};--bs-btn-disabled-color:${text};--bs-btn-disabled-bg:${hex(c)};--bs-btn-disabled-border-color:${hex(c)}}`);
            out.push(`${sel} .btn-outline-${role}{--bs-btn-color:${hex(c)};--bs-btn-border-color:${hex(c)};--bs-btn-hover-color:${text};--bs-btn-hover-bg:${hex(c)};--bs-btn-hover-border-color:${hex(c)};--bs-btn-focus-shadow-rgb:${rgbList(c)};--bs-btn-active-color:${text};--bs-btn-active-bg:${hex(c)};--bs-btn-active-border-color:${hex(c)};--bs-btn-disabled-color:${hex(c)};--bs-btn-disabled-border-color:${hex(c)}}`);
        } else {
            out.push(`${sel}{--${role}:${hex(c)}}`);
            out.push(`${sel} .btn-${role}{color:${text};background-color:${hex(c)};border-color:${hex(c)}}${sel} .btn-${role}:hover,${sel} .btn-${role}.ds-is-hover{color:${ink(hover)};background-color:${hex(hover)};border-color:${hex(border)}}${sel} .btn-${role}:focus,${sel} .btn-${role}.ds-is-focus{box-shadow:0 0 0 .2rem rgba(${rgbList(mix(c, textRgba, 0.85))},.5)}${sel} .btn-${role}:active,${sel} .btn-${role}.ds-is-active{color:${ink(active)};background-color:${hex(active)};border-color:${hex(shade(c, 25))}}${sel} .btn-${role}:disabled,${sel} .btn-${role}.disabled{color:${text};background-color:${hex(c)};border-color:${hex(c)}}`);
            out.push(`${sel} .btn-outline-${role}{color:${hex(c)};border-color:${hex(c)}}${sel} .btn-outline-${role}:hover,${sel} .btn-outline-${role}.ds-is-hover{color:${text};background-color:${hex(c)};border-color:${hex(c)}}${sel} .btn-outline-${role}:focus,${sel} .btn-outline-${role}.ds-is-focus{box-shadow:0 0 0 .2rem rgba(${rgbList(c)},.5)}${sel} .btn-outline-${role}:active,${sel} .btn-outline-${role}.ds-is-active{color:${text};background-color:${hex(c)};border-color:${hex(c)}}${sel} .btn-outline-${role}:disabled{color:${hex(c)};background-color:transparent}`);
            out.push(`${sel} .text-${role}{color:${hex(c)}!important}${sel} .bg-${role}{background-color:${hex(c)}!important;color:${text}}${sel} .border-${role}{border-color:${hex(c)}!important}`);
        }
        if (role === 'primary') {
            if (five) {
                out.push(`${sel}{--bs-link-color:${hex(c)};--bs-link-color-rgb:${rgbList(c)};--bs-link-hover-color:${hex(shade(c, 20))};--bs-link-hover-color-rgb:${rgbList(shade(c, 20))}}`);
                out.push(`${sel}[data-bs-theme="dark"]{--bs-link-color:${hex(tint(c, 40))};--bs-link-color-rgb:${rgbList(tint(c, 40))};--bs-link-hover-color:${hex(tint(c, 60))}}`);
                out.push(`${sel} .form-control:focus,${sel} .form-select:focus{border-color:${hex(tint(c, 50))};box-shadow:0 0 0 .25rem rgba(${rgbList(c)},.25)}${sel} .form-check-input:checked{background-color:${hex(c)};border-color:${hex(c)}}${sel} .nav-pills{--bs-nav-pills-link-active-bg:${hex(c)}}${sel} .list-group{--bs-list-group-active-bg:${hex(c)};--bs-list-group-active-border-color:${hex(c)}}${sel} .progress{--bs-progress-bar-bg:${hex(c)}}${sel} .accordion{--bs-accordion-active-color:${hex(shade(c, 60))};--bs-accordion-active-bg:${hex(tint(c, 80))}}`);
            } else {
                out.push(`${sel} a:not(.btn){color:${hex(c)}}${sel} a:not(.btn):hover{color:${hex(shade(c, 20))}}${sel} .progress-bar{background-color:${hex(c)}}${sel} .list-group-item.active{background-color:${hex(c)};border-color:${hex(c)};color:${text}}${sel} .form-control:focus,${sel} .custom-select:focus{border-color:${hex(tint(c, 50))};box-shadow:0 0 0 .2rem rgba(${rgbList(c)},.25)}${sel} .nav-pills .nav-link.active{background-color:${hex(c)};color:${text}}${sel} .page-item.active .page-link{background-color:${hex(c)};border-color:${hex(c)}}`);
            }
        }
    }
    return out.join('\n');
};

/** The two style elements the examples are themed with, created once and in this order, so the lab always wins over the switch. */
export const styleElements = (): {brand: HTMLStyleElement; lab: HTMLStyleElement} => {
    const make = (id: string): HTMLStyleElement => {
        let el = document.getElementById(id) as HTMLStyleElement | null;
        if (!el) { el = document.createElement('style'); el.id = id; document.head.appendChild(el); }
        return el;
    };
    return {brand: make('ds-brand-style'), lab: make('ds-lab-style')};
};
