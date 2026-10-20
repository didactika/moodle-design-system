// The page search of the header: a magnifier that opens into a field with live results, on every page. It reads the index of the pages that
// `Base.astro` embeds (title, summary and group of each page of the language), so it needs no request and works the same on the home page.
import {$, $$, readJson} from './dom';

interface Entry { title: string; summary: string; group: string; url: string }

const index = readJson<Entry[]>('ds-search-data') ?? [];
const box = $('#ds-search');
const input = $<HTMLInputElement>('#ds-search-input');
const panel = $('#ds-search-panel');
const list = $('#ds-search-results');
const empty = $('#ds-search-empty');
const opener = $('#ds-search-open');
const closer = $('#ds-search-close');

/** Without accents and in lower case, so "tamano" finds "tamaño". */
const fold = (value: string): string => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const escapeHtml = (value: string): string => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** The text with each word of the query marked, comparing without accents. */
const mark = (text: string, words: string[]): string => {
    const plain = fold(text);
    const ranges: [number, number][] = [];
    for (const word of words) {
        const at = plain.indexOf(word);
        if (at >= 0) { ranges.push([at, at + word.length]); }
    }
    if (!ranges.length) { return escapeHtml(text); }
    ranges.sort((a, b) => a[0] - b[0]);
    let out = '';
    let cursor = 0;
    for (const [from, to] of ranges) {
        if (from < cursor) { continue; }
        out += `${escapeHtml(text.slice(cursor, from))}<mark>${escapeHtml(text.slice(from, to))}</mark>`;
        cursor = to;
    }
    return out + escapeHtml(text.slice(cursor));
};

/** The entries that contain every word of the query, the ones with the words in the title first. */
const find = (query: string): Entry[] => {
    const words = fold(query).split(/\s+/).filter(Boolean);
    if (!words.length) { return index; }
    const scored: [number, Entry][] = [];
    for (const entry of index) {
        const title = fold(entry.title);
        const rest = fold(`${entry.group} ${entry.summary}`);
        if (!words.every((w) => title.includes(w) || rest.includes(w))) { continue; }
        const score = words.reduce((sum, w) => sum + (title.startsWith(w) ? 3 : title.includes(w) ? 2 : 1), 0);
        scored.push([score, entry]);
    }
    return scored.sort((a, b) => b[0] - a[0]).map(([, entry]) => entry);
};

let active = 0;
const options = (): HTMLElement[] => $$('[role="option"]', list ?? document);
const highlight = (to: number): void => {
    const all = options();
    if (!all.length) { return; }
    active = (to + all.length) % all.length;
    all.forEach((el, i) => { el.setAttribute('aria-selected', String(i === active)); });
    const current = all[active] as HTMLElement;
    input?.setAttribute('aria-activedescendant', current.id);
    current.scrollIntoView({block: 'nearest'});
};

const render = (): void => {
    if (!list || !input || !empty) { return; }
    const query = input.value;
    const words = fold(query).split(/\s+/).filter(Boolean);
    const found = find(query);
    list.innerHTML = found.slice(0, 12).map((entry, i) => `<li role="option" id="ds-sr-${i}" aria-selected="false"><a href="${escapeHtml(entry.url)}"><span class="t">${mark(entry.title, words)}</span>${entry.group ? `<span class="g">${escapeHtml(entry.group)}</span>` : ''}<span class="s">${mark(entry.summary, words)}</span></a></li>`).join('');
    empty.hidden = found.length > 0;
    highlight(0);
};

const isOpen = (): boolean => box?.dataset.open === 'true';
const open = (): void => {
    if (!box || !input || !panel) { return; }
    box.dataset.open = 'true';
    panel.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    render();
    input.focus();
    input.select();
};
const close = (): void => {
    if (!box || !input || !panel) { return; }
    box.dataset.open = 'false';
    panel.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    input.blur();
};
const go = (): void => {
    const link = options()[active]?.querySelector('a');
    if (link) { location.href = link.href; }
};

opener?.addEventListener('click', open);
closer?.addEventListener('click', close);
input?.addEventListener('input', render);
input?.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown') { event.preventDefault(); highlight(active + 1); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); highlight(active - 1); }
    else if (event.key === 'Enter') { event.preventDefault(); go(); }
});
document.addEventListener('keydown', (event) => {
    const typing = event.target instanceof Element && event.target.closest('input, select, textarea, [contenteditable]');
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); if (isOpen()) { close(); } else { open(); } return; }
    if (event.key === '/' && !typing && !event.ctrlKey && !event.metaKey && !event.altKey) { event.preventDefault(); open(); return; }
    if (event.key === 'Escape' && isOpen()) { event.stopPropagation(); close(); }
}, true);
document.addEventListener('click', (event) => {
    if (isOpen() && event.target instanceof Node && box && !box.contains(event.target)) { close(); }
});
