// This file is part of the Didactika Moodle design system.
// Licensed under the GNU General Public License, version 3 or later.

/**
 * The ripple of a press: a circle that grows from the point of the click and fades, the way Material draws it. It belongs to the Didactika
 * theme (not to the design system), so it only runs while the theme is on, and never while the inspector is on or when the user asks for less
 * motion. The circle lives in a clipping layer of its own so a counter sitting on the corner of a button is not cut.
 */
const TARGETS = '.ds-frame .btn, .ds-frame .dd-chip, .ds-frame .page-link, .ds-frame .nav-search-toggle';

export const installRipple = ({enabled}: {enabled: () => boolean}): void => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    document.addEventListener('pointerdown', (event) => {
        const target = event.target instanceof Element ? event.target.closest<HTMLElement>(TARGETS) : null;
        if (!target || !enabled() || reduced.matches || document.documentElement.dataset.brand !== '1') { return; }
        if ((target as HTMLButtonElement).disabled || target.classList.contains('disabled') || target.getAttribute('aria-disabled') === 'true') { return; }
        let host = target.querySelector<HTMLElement>(':scope > .dd-ripple-host');
        if (!host) {
            host = document.createElement('span');
            host.className = 'dd-ripple-host';
            host.setAttribute('aria-hidden', 'true');
            target.append(host);
        }
        const box = target.getBoundingClientRect();
        const size = Math.max(box.width, box.height) * 2.2;
        const wave = document.createElement('span');
        wave.className = 'dd-ripple';
        Object.assign(wave.style, {width: `${size}px`, height: `${size}px`, left: `${event.clientX - box.left - size / 2}px`, top: `${event.clientY - box.top - size / 2}px`});
        host.append(wave);
        wave.addEventListener('animationend', () => wave.remove(), {once: true});
    }, {passive: true});
};
