// Bootstrap 5 markup for the versions that run Bootstrap 4. The examples of the site are written with the classes of Bootstrap 5; this renames
// the classes that Bootstrap 4 calls something else. It is used by the pages (to draw an example in a Bootstrap 4 version) and by the JSON
// API (to publish both markups), so both always agree.

const renamed = {
    'form-select': 'custom-select', 'form-select-sm': 'custom-select-sm', 'form-select-lg': 'custom-select-lg', 'visually-hidden': 'sr-only',
    'form-range': 'custom-range', 'float-end': 'float-right', 'float-start': 'float-left', 'text-end': 'text-right', 'text-start': 'text-left',
    'dropdown-menu-end': 'dropdown-menu-right', 'fw-bold': 'font-weight-bold', 'fw-semibold': 'font-weight-bold', 'fw-normal': 'font-weight-normal',
    'fst-italic': 'font-italic', 'rounded-end': 'rounded-right', 'rounded-start': 'rounded-left', 'text-bg-primary': 'badge-primary',
    'text-bg-secondary': 'badge-secondary', 'text-bg-success': 'badge-success', 'text-bg-danger': 'badge-danger', 'text-bg-warning': 'badge-warning',
    'text-bg-info': 'badge-info', 'text-bg-light': 'badge-light', 'text-bg-dark': 'badge-dark', 'form-label': 'd-block', 'form-check-reverse': '',
    'btn-close': 'close', 'g-0': 'no-gutters', 'accordion-button': 'btn btn-link', 'ratio': 'embed-responsive',
};

export const toBootstrap4 = (html) => html.replace(/class="([^"]*)"/g, (match, value) => {
    const names = value.split(/\s+/).filter(Boolean).map((name) => {
        if (name in renamed) { return renamed[name]; }
        const spacing = name.match(/^([mp])([se])-((?:sm|md|lg|xl|xxl)-)?(\d|auto)$/);
        if (spacing) { return `${spacing[1]}${spacing[2] === 's' ? 'l' : 'r'}-${spacing[3] || ''}${spacing[4]}`; }
        return name;
    });
    return `class="${[...new Set(names.join(' ').split(/\s+/).filter(Boolean))].join(' ')}"`;
}).replace(/ data-bs-/g, ' data-');
