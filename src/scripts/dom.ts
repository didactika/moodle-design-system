// Small helpers for the scripts of the site: typed queries, the JSON the pages embed, and a guard that narrows away `null`.

/** The first element that matches, or null. The element type defaults to HTMLElement, which is what every query of the site wants. */
export const $ = <T extends Element = HTMLElement>(selector: string, root: ParentNode = document): T | null => root.querySelector<T>(selector);

/** Every element that matches, as an array. */
export const $$ = <T extends Element = HTMLElement>(selector: string, root: ParentNode = document): T[] => [...root.querySelectorAll<T>(selector)];

/** The JSON of a `<script type="application/json">` the page embeds, or null when it is not there. */
export const readJson = <T>(id: string): T | null => {
    const node = document.getElementById(id);
    return node?.textContent ? JSON.parse(node.textContent) as T : null;
};

/** For `array.filter(present)`: keeps what is not null and tells the compiler so. */
export const present = <T,>(value: T | null): value is T => value !== null;
