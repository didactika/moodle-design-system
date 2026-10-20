// The collaborators of the footer: the public members of the GitHub organisation, read when the page opens (and kept for half an hour so a
// visit does not spend the limit GitHub puts on anonymous requests). If they cannot be read, the footer simply shows no one.
const KEY = 'ds-people';
const TTL = 30 * 60 * 1000;

const read = async(org) => {
    try {
        const cached = JSON.parse(sessionStorage.getItem(KEY) ?? 'null');
        if (cached && cached.org === org && Date.now() - cached.at < TTL) { return cached.list; }
    } catch (error) { /* no storage: ask every time */ }
    const response = await fetch(`https://api.github.com/orgs/${org}/public_members?per_page=100`, {headers: {Accept: 'application/vnd.github+json'}});
    if (!response.ok) { throw new Error(String(response.status)); }
    const list = (await response.json()).map((u) => ({login: u.login, url: u.html_url, avatar: u.avatar_url}));
    try { sessionStorage.setItem(KEY, JSON.stringify({org, at: Date.now(), list})); } catch (error) { /* optional */ }
    return list;
};

document.querySelectorAll('[data-people]').forEach(async(box) => {
    const stack = box.querySelector('[data-people-list]');
    const skip = (box.dataset.exclude || '').toLowerCase().split(',').filter(Boolean);
    const max = Number(box.dataset.max) || 8;
    try {
        const people = (await read(box.dataset.org)).filter((p) => p.avatar && !skip.includes(p.login.toLowerCase()));
        const esc = (s) => s.replace(/[&<>"]/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
        stack.innerHTML = people.slice(0, max).map((p) => `<a href="${esc(p.url)}" title="${esc(p.login)}" aria-label="${esc(p.login)}"><img src="${esc(p.avatar)}${p.avatar.includes('?') ? '&' : '?'}s=64" alt="" width="32" height="32" loading="lazy"></a>`).join('')
            + (people.length > max ? `<a class="more" href="${esc(box.dataset.all)}" title="${esc(box.dataset.more)}">+${people.length - max}</a>` : '');
        box.classList.toggle('has-people', people.length > 0);
    } catch (error) {
        box.classList.remove('has-people');
    }
});
