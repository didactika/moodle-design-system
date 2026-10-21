// The behaviour of the interactive components inside the examples: dropdowns, collapse and accordion, tabs and pills, dismissible alerts and
// toasts, tooltips, popovers and the carousel. The examples are drawn with the CSS of Moodle but without its JavaScript, so this gives them the
// same data attributes Bootstrap reads (`data-bs-*` on Bootstrap 5, `data-*` on Bootstrap 4) and the same classes, so a component opens, closes and
// moves the way a user expects. It acts only while designer mode is off: with it on, a click selects.

interface Environment {
    /** True when the selected Moodle version runs Bootstrap 5 (its markup differs a little from Bootstrap 4). */
    bs5: () => boolean;
    /** True when the examples are used; false while designer mode turns clicks into selections. */
    enabled: () => boolean;
}

const SELECTOR = '[data-bs-toggle], [data-toggle], [data-bs-dismiss], [data-dismiss], [data-bs-slide], [data-slide], [data-bs-slide-to], [data-slide-to]';
const reduced = (): boolean => matchMedia('(prefers-reduced-motion: reduce)').matches;
/** An attribute of Bootstrap in either of its spellings. */
const attr = (el: Element, name: string): string | null => el.getAttribute(`data-bs-${name}`) ?? el.getAttribute(`data-${name}`);
const targetOf = (el: Element, scope: ParentNode): HTMLElement | null => {
    const selector = attr(el, 'target') ?? el.getAttribute('href');
    return selector && selector.startsWith('#') ? scope.querySelector<HTMLElement>(selector) : null;
};

// ---------------------------------------------------------------- dropdowns
const closeDropdowns = (scope: ParentNode, except?: Element | null): void => {
    scope.querySelectorAll<HTMLElement>('.dropdown-menu.show').forEach((menu) => {
        if (except && (menu === except || menu.parentElement === except.parentElement)) { return; }
        menu.classList.remove('show');
        menu.parentElement?.classList.remove('show');
        const trigger = menu.parentElement?.querySelector<HTMLElement>('[data-bs-toggle="dropdown"], [data-toggle="dropdown"]');
        trigger?.classList.remove('show');
        trigger?.setAttribute('aria-expanded', 'false');
    });
};
const toggleDropdown = (trigger: HTMLElement, scope: ParentNode, bs5: boolean): void => {
    const menu = trigger.parentElement?.querySelector<HTMLElement>('.dropdown-menu');
    if (!menu) { return; }
    const open = !menu.classList.contains('show');
    closeDropdowns(scope);
    if (!open) { return; }
    menu.classList.add('show');
    menu.parentElement?.classList.add('show');
    trigger.classList.add('show');
    trigger.setAttribute('aria-expanded', 'true');
    // Bootstrap 5 places a menu with Popper; without it this attribute is what lets the CSS align it.
    if (bs5) { menu.setAttribute('data-bs-popper', 'static'); }
};

// ---------------------------------------------------------------- collapse and accordion
const settle = (panel: HTMLElement): void => {
    panel.style.removeProperty('height');
    panel.style.removeProperty('overflow');
    panel.style.removeProperty('transition');
};
const setCollapse = (panel: HTMLElement, open: boolean, scope: ParentNode): void => {
    scope.querySelectorAll<HTMLElement>(`[data-bs-target="#${panel.id}"], [data-target="#${panel.id}"], [href="#${panel.id}"]`).forEach((trigger) => {
        trigger.classList.toggle('collapsed', !open);
        trigger.setAttribute('aria-expanded', String(open));
    });
    if (reduced()) { panel.classList.toggle('show', open); return; }
    panel.style.overflow = 'hidden';
    panel.style.transition = 'height .26s cubic-bezier(.2, 0, 0, 1)';
    if (open) {
        panel.classList.add('show');
        const height = panel.scrollHeight;
        panel.style.height = '0px';
        requestAnimationFrame(() => { panel.style.height = `${height}px`; });
        setTimeout(() => settle(panel), 280);
    } else {
        panel.style.height = `${panel.scrollHeight}px`;
        requestAnimationFrame(() => { panel.style.height = '0px'; });
        setTimeout(() => { panel.classList.remove('show'); settle(panel); }, 280);
    }
};
const toggleCollapse = (trigger: HTMLElement, scope: ParentNode): void => {
    const panel = targetOf(trigger, scope);
    if (!panel) { return; }
    const opening = !panel.classList.contains('show');
    const parent = panel.getAttribute('data-bs-parent') ?? panel.getAttribute('data-parent');
    if (opening && parent) {
        scope.querySelectorAll<HTMLElement>(`${parent} .collapse.show`).forEach((other) => { if (other !== panel) { setCollapse(other, false, scope); } });
    }
    setCollapse(panel, opening, scope);
};

// ---------------------------------------------------------------- tabs and pills
const showTab = (trigger: HTMLElement, scope: ParentNode): void => {
    const pane = targetOf(trigger, scope);
    const list = trigger.closest('.nav, .list-group, [role="tablist"]');
    if (!pane || !list) { return; }
    list.querySelectorAll<HTMLElement>('.active').forEach((el) => { el.classList.remove('active'); el.setAttribute('aria-selected', 'false'); });
    trigger.classList.add('active');
    trigger.setAttribute('aria-selected', 'true');
    pane.parentElement?.querySelectorAll(':scope > .tab-pane').forEach((p) => p.classList.remove('show', 'active'));
    pane.classList.add('active');
    requestAnimationFrame(() => pane.classList.add('show'));
};

// ---------------------------------------------------------------- alerts and toasts: dismissed, then back after a moment so the example can be used again
const dismiss = (trigger: HTMLElement, kind: string): void => {
    const box = trigger.closest<HTMLElement>(kind === 'toast' ? '.toast' : '.alert');
    if (!box) { return; }
    box.classList.remove('show');
    setTimeout(() => { box.classList.add('show'); }, 2600);
};

// ---------------------------------------------------------------- carousel
const slide = (trigger: HTMLElement): void => {
    const carousel = trigger.closest<HTMLElement>('.carousel');
    if (!carousel) { return; }
    const items = [...carousel.querySelectorAll<HTMLElement>('.carousel-item')];
    const indicators = [...carousel.querySelectorAll<HTMLElement>('[data-bs-slide-to], [data-slide-to]')];
    const current = Math.max(items.findIndex((item) => item.classList.contains('active')), 0);
    const to = attr(trigger, 'slide-to');
    const direction = attr(trigger, 'slide');
    const next = to !== null ? Number(to) : (current + (direction === 'prev' ? -1 : 1) + items.length) % items.length;
    items.forEach((item, i) => item.classList.toggle('active', i === next));
    indicators.forEach((dot, i) => { dot.classList.toggle('active', i === next); if (i === next) { dot.setAttribute('aria-current', 'true'); } else { dot.removeAttribute('aria-current'); } });
};

// ---------------------------------------------------------------- tooltips and popovers
const PLACEMENT: Record<string, [string, string]> = {top: ['top', 'top'], bottom: ['bottom', 'bottom'], left: ['start', 'left'], right: ['end', 'right'], start: ['start', 'left'], end: ['end', 'right']};
const tips = new WeakMap<HTMLElement, HTMLElement>();
/** Places a note next to its trigger and returns the side it ended up on: a note meant for the top goes below when there is no room above. */
const place = (trigger: HTMLElement, tip: HTMLElement, wanted: string, frame: HTMLElement): string => {
    const f = frame.getBoundingClientRect();
    const t = trigger.getBoundingClientRect();
    const gap = 6;
    // Bootstrap 5 leaves the note static until Popper places it: take it out of the flow before measuring, or it measures as wide as the frame.
    Object.assign(tip.style, {position: 'absolute', left: '0px', top: '0px', margin: '0', transform: 'none'});
    const [w, h] = [tip.offsetWidth, tip.offsetHeight];
    const cx = t.left - f.left + t.width / 2;
    const cy = t.top - f.top + t.height / 2;
    const arrow = tip.querySelector<HTMLElement>('.tooltip-arrow, .popover-arrow, .arrow');
    const side = wanted === 'top' && t.top - f.top - h - gap < 0 ? 'bottom' : wanted;
    let left = cx - w / 2;
    let top = t.top - f.top - h - gap;
    if (side === 'bottom') { top = t.bottom - f.top + gap; }
    if (side === 'left') { left = t.left - f.left - w - gap; top = cy - h / 2; }
    if (side === 'right') { left = t.right - f.left + gap; top = cy - h / 2; }
    left = Math.max(0, Math.min(left, f.width - w));
    Object.assign(tip.style, {position: 'absolute', left: `${left}px`, top: `${top}px`, margin: '0', transform: 'none', inset: `${top}px auto auto ${left}px`});
    if (arrow) {
        arrow.style.position = 'absolute';
        if (side === 'top' || side === 'bottom') { arrow.style.left = `${cx - left - arrow.offsetWidth / 2}px`; arrow.style.top = ''; } else { arrow.style.top = `${cy - top - arrow.offsetHeight / 2}px`; arrow.style.left = ''; }
    }
    return side;
};
const showTip = (trigger: HTMLElement, kind: 'tooltip' | 'popover', bs5: boolean): void => {
    const frame = trigger.closest<HTMLElement>('.ds-frame');
    if (!frame || tips.has(trigger)) { return; }
    const [bs5Side, bs4Side] = PLACEMENT[attr(trigger, 'placement') ?? 'top'] ?? PLACEMENT.top as [string, string];
    const placement = bs5 ? bs5Side : bs4Side;
    const side = attr(trigger, 'placement') ?? 'top';
    const tip = document.createElement('div');
    tip.className = `${kind} bs-${kind}-${placement} fade show`;
    tip.setAttribute('role', kind);
    const arrowClass = bs5 ? `${kind}-arrow` : 'arrow';
    if (kind === 'tooltip') {
        tip.innerHTML = `<div class="${arrowClass}"></div><div class="tooltip-inner"></div>`;
        (tip.querySelector('.tooltip-inner') as HTMLElement).textContent = trigger.getAttribute('title') ?? attr(trigger, 'title') ?? '';
    } else {
        tip.innerHTML = `<div class="${arrowClass}"></div><h3 class="popover-header"></h3><div class="popover-body"></div>`;
        (tip.querySelector('.popover-header') as HTMLElement).textContent = attr(trigger, 'title') ?? trigger.getAttribute('title') ?? '';
        (tip.querySelector('.popover-body') as HTMLElement).textContent = attr(trigger, 'content') ?? '';
    }
    frame.appendChild(tip);
    const shown = place(trigger, tip, side === 'start' ? 'left' : side === 'end' ? 'right' : side, frame);
    if (shown !== (side === 'start' ? 'left' : side === 'end' ? 'right' : side)) {
        const [flipped5, flipped4] = PLACEMENT[shown] as [string, string];
        tip.className = `${kind} bs-${kind}-${bs5 ? flipped5 : flipped4} fade show`;
    }
    tips.set(trigger, tip);
};
const hideTip = (trigger: HTMLElement): void => {
    tips.get(trigger)?.remove();
    tips.delete(trigger);
};
const hideAllPopovers = (except?: HTMLElement | null): void => {
    document.querySelectorAll<HTMLElement>('[data-bs-toggle="popover"], [data-toggle="popover"]').forEach((trigger) => { if (trigger !== except) { hideTip(trigger); } });
};

/** One choice among the buttons of a group: the pressed one is the clicked one. */
const choose = (button: HTMLElement): void => {
    const group = button.parentElement;
    if (!group) { return; }
    [...group.children].forEach((other) => {
        if (!(other instanceof HTMLElement) || !other.hasAttribute('aria-pressed')) { return; }
        const on = other === button;
        other.setAttribute('aria-pressed', String(on));
        other.classList.toggle('active', on);
    });
};

/** The choices of the examples that are not Bootstrap's: groups of buttons, segmented controls, chips and tags. */
const installChoices = (env: Environment): void => {
    document.addEventListener('click', (event) => {
        const target = event.target instanceof Element ? event.target : null;
        if (!env.enabled() || !target || !target.closest('.ds-frame')) { return; }
        const button = target.closest<HTMLElement>('.btn-group > .btn[aria-pressed], .dd-segmented > button[aria-pressed]');
        if (button && !(button as HTMLButtonElement).disabled) { choose(button); return; }
        const chip = target.closest<HTMLElement>('.dd-chip[aria-pressed]');
        if (chip && !(chip as HTMLButtonElement).disabled) { chip.setAttribute('aria-pressed', String(chip.getAttribute('aria-pressed') !== 'true')); return; }
        const remove = target.closest<HTMLElement>('.dd-chip-remove, .dd-tag-remove');
        const piece = remove?.closest<HTMLElement>('.dd-chip, .dd-tag');
        const field = piece?.closest('.dd-tags');
        if (piece && !(field && field.previousElementSibling instanceof HTMLSelectElement)) { piece.remove(); }
    });
    document.addEventListener('keydown', (event) => {
        const input = event.target instanceof HTMLInputElement && event.target.matches('.dd-tags-input') ? event.target : null;
        if (!env.enabled() || !input) { return; }
        if (event.key === 'Enter' && input.value.trim()) {
            event.preventDefault();
            const tag = document.createElement('span');
            tag.className = 'dd-tag';
            tag.append(input.value.trim());
            const remove = document.createElement('button');
            remove.type = 'button';
            remove.className = 'dd-tag-remove';
            remove.setAttribute('aria-label', `Remove ${input.value.trim()}`);
            tag.append(remove);
            input.before(tag);
            input.value = '';
        } else if (event.key === 'Backspace' && !input.value) {
            const last = input.previousElementSibling;
            if (last instanceof HTMLElement && last.classList.contains('dd-tag')) { last.remove(); }
        }
    });
};

export const installBehaviours = (env: Environment): void => {
    installChoices(env);
    document.addEventListener('click', (event) => {
        const target = event.target instanceof Element ? event.target : null;
        if (!env.enabled() || !target) { return; }
        const frame = target.closest<HTMLElement>('.ds-frame');
        if (!frame) { closeDropdowns(document); hideAllPopovers(); return; }
        const trigger = target.closest<HTMLElement>(SELECTOR);
        if (!trigger || !frame.contains(trigger)) { closeDropdowns(frame); hideAllPopovers(); return; }
        const toggle = attr(trigger, 'toggle');
        const dismissal = attr(trigger, 'dismiss');
        if (toggle === 'dropdown') { event.preventDefault(); toggleDropdown(trigger, frame, env.bs5()); return; }
        if (toggle === 'collapse') { event.preventDefault(); toggleCollapse(trigger, frame); return; }
        if (toggle === 'tab' || toggle === 'pill' || toggle === 'list') { event.preventDefault(); showTab(trigger, frame); return; }
        if (toggle === 'popover') { event.preventDefault(); hideAllPopovers(trigger); if (tips.has(trigger)) { hideTip(trigger); } else { showTip(trigger, 'popover', env.bs5()); } return; }
        if (dismissal === 'alert' || dismissal === 'toast') { event.preventDefault(); dismiss(trigger, dismissal); return; }
        if (attr(trigger, 'slide') !== null || attr(trigger, 'slide-to') !== null) { event.preventDefault(); slide(trigger); }
    });
    const hover = (show: boolean) => (event: Event): void => {
        const target = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-bs-toggle="tooltip"], [data-toggle="tooltip"]') : null;
        if (!target || !env.enabled()) { return; }
        if (show) { showTip(target, 'tooltip', env.bs5()); } else { hideTip(target); }
    };
    document.addEventListener('mouseover', hover(true));
    document.addEventListener('mouseout', hover(false));
    document.addEventListener('focusin', hover(true));
    document.addEventListener('focusout', hover(false));
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') { closeDropdowns(document); hideAllPopovers(); }
    });
};
