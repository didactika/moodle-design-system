// This file is part of the Didactika Moodle design system.
// Licensed under the GNU General Public License, version 3 or later.

/**
 * The tip of a title. A button, a link or an icon with a `title` shows its text in a bubble of the design system (dd-tip) instead of the one the
 * browser draws, which cannot be styled. The text moves from `title` to `data-dd-title` while the page is open, and the element keeps an accessible
 * name (an `aria-label`) when it had none.
 *
 * It appears after a short wait under the pointer and at once with the keyboard; it goes away on leaving, on blur, on a click, on Escape and on
 * scrolling. It is placed above the element and below it when there is no room.
 */
interface Environment {
    enabled: () => boolean;
}

const WAIT = 350;
const GAP = 10;

export const installTips = (env: Environment): void => {
    let tip: HTMLElement | null = null;
    let owner: HTMLElement | null = null;
    let timer = 0;
    let counter = 0;

    const hide = (): void => {
        window.clearTimeout(timer);
        if (owner) { owner.removeAttribute('aria-describedby'); }
        tip?.remove();
        tip = null;
        owner = null;
    };

    /** Takes the text of the title out of the way of the browser; returns it. */
    const take = (el: HTMLElement): string => {
        const title = el.getAttribute('title');
        if (title !== null) {
            el.dataset.ddTitle = title;
            el.removeAttribute('title');
            if (!el.hasAttribute('aria-label') && !(el.textContent ?? '').trim()) { el.setAttribute('aria-label', title); }
        }
        return el.dataset.ddTitle ?? '';
    };

    const show = (el: HTMLElement, text: string): void => {
        hide();
        if (!document.contains(el)) { return; }
        counter += 1;
        tip = document.createElement('div');
        tip.className = 'dd-tip';
        tip.id = `dd-tip-${counter}`;
        tip.setAttribute('role', 'tooltip');
        tip.textContent = text;
        document.body.append(tip);
        el.setAttribute('aria-describedby', tip.id);
        owner = el;
        const r = el.getBoundingClientRect();
        const t = tip.getBoundingClientRect();
        const above = r.top - t.height - GAP > 8;
        const left = Math.max(8, Math.min(r.left + r.width / 2 - t.width / 2, window.innerWidth - t.width - 8));
        tip.dataset.place = above ? 'top' : 'bottom';
        tip.style.left = `${left}px`;
        tip.style.top = `${above ? r.top - t.height - GAP : r.bottom + GAP}px`;
        tip.style.setProperty('--dd-tip-arrow', `${r.left + r.width / 2 - left}px`);
        requestAnimationFrame(() => tip?.classList.add('is-visible'));
    };

    const target = (event: Event): HTMLElement | null => {
        const node = event.target instanceof Element ? event.target.closest<HTMLElement>('[title], [data-dd-title]') : null;
        if (!node || node instanceof SVGElement || node.matches('abbr, iframe, html, body')) { return null; }
        return node;
    };

    document.addEventListener('pointerover', (event) => {
        if (!env.enabled() || (event as PointerEvent).pointerType === 'touch') { return; }
        const el = target(event);
        if (!el || el === owner) { return; }
        const text = take(el);
        if (!text) { return; }
        window.clearTimeout(timer);
        timer = window.setTimeout(() => show(el, text), WAIT);
    });
    document.addEventListener('pointerout', (event) => {
        const el = target(event);
        if (el && !el.contains(event.relatedTarget as Node | null)) { hide(); }
    });
    document.addEventListener('focusin', (event) => {
        if (!env.enabled()) { return; }
        const el = target(event);
        if (!el || !el.matches(':focus-visible')) { return; }
        const text = take(el);
        if (text) { show(el, text); }
    });
    document.addEventListener('focusout', hide);
    document.addEventListener('pointerdown', hide);
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape') { hide(); } });
    window.addEventListener('scroll', hide, {capture: true, passive: true});
};
