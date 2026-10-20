// This file is part of the Didactika Moodle design system.
// Licensed under the GNU General Public License, version 3 or later.

/**
 * Reads the people who have contributed to any public repository of the organisation (not to this one only) and writes them to
 * src/data/people.generated.json, which the footer renders. It runs on every build, and the Pages workflow builds every day, so the list follows
 * the organisation. With a token (GITHUB_TOKEN or GH_TOKEN) it is not limited by what GitHub allows an anonymous request; without one, or if GitHub
 * does not answer, the list of the last build is kept (an empty one the first time), so a build never fails because of it.
 *
 * Usage: node tools/fetch-people.mjs
 */
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'src/data/people.generated.json');
const config = JSON.parse(readFileSync(join(root, 'src/config/site.json'), 'utf8'));
const org = config.collaborators.org;
const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
const headers = {Accept: 'application/vnd.github+json', 'User-Agent': 'didactika-design-system', ...(token ? {Authorization: `Bearer ${token}`} : {})};

const get = async(path) => {
    const response = await fetch(`https://api.github.com${path}`, {headers});
    if (!response.ok) { throw new Error(`${response.status} ${path}`); }
    return response.json();
};

try {
    const repos = (await get(`/orgs/${org}/repos?type=public&per_page=100`)).filter((r) => !r.fork && !r.archived);
    const totals = new Map();
    for (const repo of repos) {
        for (const person of await get(`/repos/${org}/${repo.name}/contributors?per_page=100`).catch(() => [])) {
            if (person.type !== 'User') { continue; }
            const known = totals.get(person.login) ?? {login: person.login, url: person.html_url, avatar: person.avatar_url, contributions: 0};
            known.contributions += person.contributions;
            totals.set(person.login, known);
        }
    }
    const contributors = [...totals.values()].sort((a, b) => b.contributions - a.contributions);
    writeFileSync(out, JSON.stringify({org, at: new Date().toISOString(), contributors}, null, 1) + '\n');
    console.log(`people: ${contributors.length} contributors of ${repos.length} repositories`);
} catch (error) {
    if (!existsSync(out)) { writeFileSync(out, JSON.stringify({org, at: null, contributors: []}) + '\n'); }
    console.log(`people: kept the last list (${error.message})`);
}
