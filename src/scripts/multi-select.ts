// This file is part of the Didactika Moodle design system.
// Licensed under the GNU General Public License, version 3 or later.

/**
 * A select with the attribute `multiple` becomes a field of tags. The browser draws a list box for it and a page cannot style it; here the chosen
 * options are tags that can be removed one by one, and the options open in the menu of the design system with a check, which stays open while
 * the user picks. The select underneath keeps its values and fires `input` and `change`, so the markup of a plugin does not change.
 *
 * Keyboard: Enter, Space and the arrows open the menu; the arrows, Home and End move; Enter and Space check or uncheck; Backspace on the
 * field removes the last tag; Escape and Tab close it.
 */
interface Environment {
    /** True when the examples are used; false while designer mode turns clicks into selections. */
    enabled: () => boolean;
}

const SELECTOR = '.ds-frame select[multiple].form-select, .ds-frame select[multiple].custom-select';

interface Widget { select: HTMLSelectElement; field: HTMLElement }
interface Open { widget: Widget; menu: HTMLElement; buttons: HTMLButtonElement[]; frame: HTMLElement }

const widgets = new WeakMap<HTMLSelectElement, Widget>();
let current: Open | null = null;

const labelOf = (option: HTMLOptionElement): string => (option.textContent ?? '').trim();

const render = (widget: Widget): void => {
    const {select, field} = widget;
    field.replaceChildren();
    const chosen = [...select.options].filter((option) => option.selected);
    for (const option of chosen) {
        const tag = document.createElement('span');
        tag.className = 'dd-tag';
        tag.append(labelOf(option));
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'dd-tag-remove';
        remove.setAttribute('aria-label', `Remove ${labelOf(option)}`);
        remove.tabIndex = -1;
        remove.dataset.index = String(option.index);
        tag.append(remove);
        field.append(tag);
    }
    if (!chosen.length) {
        const placeholder = document.createElement('span');
        placeholder.className = 'dd-tags-placeholder';
        placeholder.textContent = select.dataset.placeholder ?? 'Choose…';
        field.append(placeholder);
    }
};

const toggle = (widget: Widget, option: HTMLOptionElement): void => {
    if (option.disabled) { return; }
    option.selected = !option.selected;
    widget.select.dispatchEvent(new Event('input', {bubbles: true}));
    widget.select.dispatchEvent(new Event('change', {bubbles: true}));
    render(widget);
};

const close = (restoreFocus = false): void => {
    if (!current) { return; }
    const {widget, menu} = current;
    menu.remove();
    widget.field.setAttribute('aria-expanded', 'false');
    current = null;
    if (restoreFocus) { widget.field.focus(); }
};

const activate = (index: number): void => {
    if (!current) { return; }
    const {buttons} = current;
    const count = buttons.length;
    for (let step = 0; step < count; step += 1) {
        const at = (index + step * (index >= 0 ? 1 : -1) + count * 2) % count;
        const button = buttons[at];
        if (button && !button.classList.contains('disabled')) {
            buttons.forEach((b) => b.classList.toggle('is-active', b === button));
            button.focus();
            button.scrollIntoView({block: 'nearest'});
            return;
        }
    }
};

const open = (widget: Widget): void => {
    const frame = widget.field.closest<HTMLElement>('.ds-frame');
    if (!frame) { return; }
    close();
    const menu = document.createElement('div');
    menu.className = 'dropdown-menu show dd-select-menu';
    menu.setAttribute('role', 'listbox');
    menu.setAttribute('aria-multiselectable', 'true');
    menu.tabIndex = -1;
    const buttons: HTMLButtonElement[] = [];
    const options: HTMLOptionElement[] = [];
    for (const option of widget.select.options) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'dropdown-item';
        button.setAttribute('role', 'option');
        button.setAttribute('aria-selected', String(option.selected));
        if (option.disabled) { button.classList.add('disabled'); button.setAttribute('aria-disabled', 'true'); button.tabIndex = -1; }
        button.textContent = labelOf(option);
        menu.append(button);
        buttons.push(button);
        options.push(option);
    }
    frame.append(menu);
    const f = frame.getBoundingClientRect();
    const s = widget.field.getBoundingClientRect();
    menu.style.minWidth = `${s.width}px`;
    const height = menu.offsetHeight;
    const below = window.innerHeight - s.bottom;
    const top = below < height + 12 && s.top > height + 12 ? s.top - f.top - height - 2 : s.bottom - f.top + 2;
    menu.style.left = `${Math.max(0, Math.min(s.left - f.left, f.width - menu.offsetWidth))}px`;
    menu.style.top = `${top}px`;
    widget.field.setAttribute('aria-expanded', 'true');
    current = {widget, menu, buttons, frame};
    const pick = (at: number): void => {
        const option = options[at];
        const button = buttons[at];
        if (!option || !button) { return; }
        toggle(widget, option);
        button.setAttribute('aria-selected', String(option.selected));
    };
    menu.addEventListener('click', (event) => {
        const at = buttons.indexOf((event.target as Element).closest('button.dropdown-item') as HTMLButtonElement);
        if (at >= 0) { pick(at); }
    });
    menu.addEventListener('keydown', (event) => {
        const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
        if (event.key === 'ArrowDown') { event.preventDefault(); activate(at + 1); }
        else if (event.key === 'ArrowUp') { event.preventDefault(); activate(at <= 0 ? -1 : at - 1); }
        else if (event.key === 'Home') { event.preventDefault(); activate(0); }
        else if (event.key === 'End') { event.preventDefault(); activate(-1); }
        else if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); if (at >= 0) { pick(at); } }
        else if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(true); }
        else if (event.key === 'Tab') { close(); }
    });
    const first = options.findIndex((option) => option.selected);
    activate(first >= 0 ? first : 0);
};

/** Builds the field for a select that does not have one yet. */
const enhance = (select: HTMLSelectElement): void => {
    if (widgets.has(select)) { return; }
    const field = document.createElement('div');
    field.className = 'dd-tags';
    field.tabIndex = select.disabled ? -1 : 0;
    field.setAttribute('role', 'combobox');
    field.setAttribute('aria-haspopup', 'listbox');
    field.setAttribute('aria-expanded', 'false');
    const label = select.id ? document.querySelector<HTMLElement>(`label[for="${select.id}"]`) : null;
    if (label) {
        label.id = label.id || `${select.id}-label`;
        field.setAttribute('aria-labelledby', label.id);
    }
    select.classList.add('dd-tags-native');
    select.tabIndex = -1;
    select.setAttribute('aria-hidden', 'true');
    select.after(field);
    const widget: Widget = {select, field};
    widgets.set(select, widget);
    render(widget);
    select.addEventListener('change', () => render(widget));
};

export const installMultiSelects = (env: Environment): void => {
    const scan = (root: ParentNode): void => { root.querySelectorAll<HTMLSelectElement>(SELECTOR).forEach(enhance); };
    scan(document);
    // The examples are drawn again when the version changes: the new selects get their field too.
    new MutationObserver((records) => {
        for (const record of records) {
            record.addedNodes.forEach((node) => { if (node instanceof Element) { scan(node.parentNode ?? node); } });
        }
    }).observe(document.body, {childList: true, subtree: true});

    document.addEventListener('mousedown', (event) => {
        const target = event.target instanceof Element ? event.target : null;
        if (!target || !env.enabled()) { return; }
        if (current && !current.menu.contains(target)) {
            const same = current.widget.field.contains(target);
            close();
            if (same) { event.preventDefault(); return; }
        }
        const remove = target.closest<HTMLElement>('.dd-tag-remove');
        const field = target.closest<HTMLElement>('.dd-tags');
        const select = field?.previousElementSibling;
        if (!field || !(select instanceof HTMLSelectElement) || select.disabled) { return; }
        const widget = widgets.get(select);
        if (!widget) { return; }
        event.preventDefault();
        field.focus();
        if (remove) {
            const option = select.options[Number(remove.dataset.index)];
            if (option) { toggle(widget, option); }
            return;
        }
        open(widget);
    });
    document.addEventListener('keydown', (event) => {
        const target = event.target instanceof Element ? event.target : null;
        if (!target || !env.enabled() || current) { return; }
        const field = target.closest<HTMLElement>('.dd-tags');
        const select = field?.previousElementSibling;
        if (!field || !(select instanceof HTMLSelectElement) || select.disabled) { return; }
        const widget = widgets.get(select);
        if (!widget) { return; }
        if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); open(widget); }
        else if (event.key === 'Backspace') {
            const chosen = [...select.options].filter((option) => option.selected);
            const last = chosen[chosen.length - 1];
            if (last) { event.preventDefault(); toggle(widget, last); }
        }
    });
    window.addEventListener('resize', () => close());
    window.addEventListener('scroll', (event) => { if (current && !current.menu.contains(event.target as Node)) { close(); } }, {capture: true, passive: true});
};
