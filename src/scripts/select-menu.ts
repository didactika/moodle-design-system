// The list a select opens. The browser draws its own and a page cannot style it, so a select inside an example opens a menu of the design system
// (the same one a dropdown has, with the chosen option marked and the groups as headers). The select underneath keeps its value and fires `input`
// and `change`, so the markup of a plugin does not change. Multiple selects and lists (`size`) keep the native control.
//
// Keyboard: Enter, Space and the arrows open it; the arrows, Home and End move, Enter and Space choose, a letter jumps to the next option that
// starts with it, Escape and Tab close it.

interface Environment {
    /** True when the examples are used; false while designer mode turns clicks into selections. */
    enabled: () => boolean;
}

const SELECTOR = '.ds-frame select.form-select, .ds-frame select.custom-select';

interface Entry { option: HTMLOptionElement; button: HTMLButtonElement }
interface Open { select: HTMLSelectElement; menu: HTMLElement; entries: Entry[]; frame: HTMLElement }

let current: Open | null = null;

const eligible = (select: HTMLSelectElement): boolean => !select.multiple && select.size <= 1 && !select.disabled;

const close = (restoreFocus = false): void => {
    if (!current) { return; }
    const {select, menu} = current;
    menu.remove();
    select.removeAttribute('aria-expanded');
    current = null;
    if (restoreFocus) { select.focus(); }
};

const choose = (index: number): void => {
    if (!current) { return; }
    const {select, entries} = current;
    const entry = entries[index];
    if (!entry || entry.option.disabled) { return; }
    const changed = select.selectedIndex !== entry.option.index;
    select.selectedIndex = entry.option.index;
    if (changed) {
        select.dispatchEvent(new Event('input', {bubbles: true}));
        select.dispatchEvent(new Event('change', {bubbles: true}));
    }
    close(true);
};

const activate = (index: number): void => {
    if (!current) { return; }
    const {entries, menu} = current;
    const count = entries.length;
    for (let step = 0; step < count; step += 1) {
        const at = (index + step * (index >= 0 ? 1 : -1) + count * 2) % count;
        const entry = entries[at];
        if (entry && !entry.option.disabled) {
            entries.forEach((e) => e.button.classList.toggle('is-active', e === entry));
            entry.button.focus();
            entry.button.scrollIntoView({block: 'nearest'});
            return;
        }
    }
    menu.focus();
};

const open = (select: HTMLSelectElement): void => {
    const frame = select.closest<HTMLElement>('.ds-frame');
    if (!frame) { return; }
    close();
    const menu = document.createElement('div');
    menu.className = 'dropdown-menu show dd-select-menu';
    menu.setAttribute('role', 'listbox');
    menu.tabIndex = -1;
    const entries: Entry[] = [];
    const add = (option: HTMLOptionElement, parent: HTMLElement): void => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'dropdown-item';
        button.setAttribute('role', 'option');
        button.setAttribute('aria-selected', String(option.selected));
        if (option.disabled) { button.classList.add('disabled'); button.setAttribute('aria-disabled', 'true'); button.tabIndex = -1; }
        button.textContent = option.textContent;
        parent.appendChild(button);
        entries.push({option, button});
    };
    for (const child of [...select.children]) {
        if (child instanceof HTMLOptGroupElement) {
            const header = document.createElement('h6');
            header.className = 'dropdown-header';
            header.textContent = child.label;
            menu.appendChild(header);
            [...child.children].forEach((option) => { if (option instanceof HTMLOptionElement) { add(option, menu); } });
        } else if (child instanceof HTMLOptionElement) {
            add(child, menu);
        }
    }
    frame.appendChild(menu);
    const f = frame.getBoundingClientRect();
    const s = select.getBoundingClientRect();
    menu.style.minWidth = `${s.width}px`;
    const height = menu.offsetHeight;
    const below = window.innerHeight - s.bottom;
    const top = below < height + 12 && s.top > height + 12 ? s.top - f.top - height - 2 : s.bottom - f.top + 2;
    menu.style.left = `${Math.max(0, Math.min(s.left - f.left, f.width - menu.offsetWidth))}px`;
    menu.style.top = `${top}px`;
    select.setAttribute('aria-expanded', 'true');
    current = {select, menu, entries, frame};
    menu.addEventListener('click', (event) => {
        const button = (event.target as Element).closest('button.dropdown-item');
        const at = entries.findIndex((entry) => entry.button === button);
        if (at >= 0) { choose(at); }
    });
    menu.addEventListener('keydown', (event) => {
        const at = entries.findIndex((entry) => entry.button === document.activeElement);
        if (event.key === 'ArrowDown') { event.preventDefault(); activate(at + 1); }
        else if (event.key === 'ArrowUp') { event.preventDefault(); activate(at <= 0 ? -1 : at - 1); }
        else if (event.key === 'Home') { event.preventDefault(); activate(0); }
        else if (event.key === 'End') { event.preventDefault(); activate(-1); }
        else if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(true); }
        else if (event.key === 'Tab') { close(); }
        else if (event.key.length === 1 && /\S/.test(event.key)) {
            const letter = event.key.toLowerCase();
            const from = at + 1;
            const found = [...entries.slice(from), ...entries.slice(0, from)].find((entry) => !entry.option.disabled && (entry.option.textContent ?? '').trim().toLowerCase().startsWith(letter));
            if (found) { activate(entries.indexOf(found)); }
        }
    });
    const selected = entries.findIndex((entry) => entry.option.selected);
    activate(selected >= 0 ? selected : 0);
};

export const installSelectMenus = (env: Environment): void => {
    // mousedown, before the browser opens its own list
    document.addEventListener('mousedown', (event) => {
        const target = event.target instanceof Element ? event.target : null;
        if (!env.enabled() || !target) { return; }
        if (current && !current.menu.contains(target)) { const same = target.closest('select') === current.select; close(); if (same) { event.preventDefault(); return; } }
        const select = target.closest<HTMLSelectElement>(SELECTOR);
        if (!select || !eligible(select)) { return; }
        event.preventDefault();
        select.focus();
        open(select);
    });
    document.addEventListener('keydown', (event) => {
        const target = event.target instanceof Element ? event.target : null;
        if (!env.enabled() || !target || current) { return; }
        const select = target.closest<HTMLSelectElement>(SELECTOR);
        if (!select || !eligible(select)) { return; }
        if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); open(select); }
    });
    window.addEventListener('resize', () => close());
    window.addEventListener('scroll', (event) => { if (current && !current.menu.contains(event.target as Node)) { close(); } }, {capture: true, passive: true});
};
