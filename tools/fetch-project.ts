// This file is part of the Didactika Moodle design system.
// Licensed under the GNU General Public License, version 3 or later.

/**
 * Assembles everything the site says about the project from GitHub, so no file has to be kept up to date by hand, and writes it to
 * src/data/project.generated.json (not committed):
 *
 * - the repository (from GITHUB_REPOSITORY, or the origin remote of the clone): its address, description and licence;
 * - the organisation that owns it: name, description, website, avatar and the addresses of its repositories and people;
 * - the founders: the two co-founders, set below, with the name each one has on GitHub;
 * - the contributors: everyone who has contributed to any public repository of the organisation;
 * - the funding: what the FUNDING.yml of the repository (or of the organisation's `.github` repository) says, which is also what GitHub
 *   uses for its Sponsor button.
 *
 * It runs on every build, and the Pages workflow builds every day, so the site follows GitHub. If GitHub does not answer, the file of the
 * last build is kept and a build never fails because of it.
 *
 * Usage: tsx tools/fetch-project.ts
 */
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {github, repositoryId} from './github';
import type {Funding, Person, Project} from './types';

interface ApiUser { login: string; name?: string | null; html_url: string; avatar_url: string; type: string; contributions?: number }
interface ApiOrg { login: string; name: string | null; description: string | null; blog: string | null; avatar_url: string; html_url: string }
interface ApiRepo { name: string; description: string | null; html_url: string; fork: boolean; archived: boolean; license: {spdx_id: string} | null }
interface ApiFile { content: string; encoding: string }

/** The co-founders of Didactika. They are the only people set by hand: everyone else is a collaborator and comes from GitHub. */
const COFOUNDERS = ['E2RD0', 'hector-ae21'];

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'src/data/project.generated.json');
const {owner, name} = repositoryId();

/** The profile of a user, for the name that is not in the lists of members and contributors. */
const person = async(user: ApiUser, contributions = 0): Promise<Person> => {
    const full = user.name === undefined ? await github<ApiUser>(`/users/${user.login}`).catch(() => user) : user;
    return {login: user.login, name: full.name ?? null, url: user.html_url, avatar: user.avatar_url, contributions};
};

/** The first way to support the project that a FUNDING.yml names. */
const FUNDING: [string, string, (handle: string) => string][] = [
    ['ko_fi', 'Ko-fi', (h) => `https://ko-fi.com/${h}`],
    ['patreon', 'Patreon', (h) => `https://www.patreon.com/${h}`],
    ['open_collective', 'Open Collective', (h) => `https://opencollective.com/${h}`],
    ['buy_me_a_coffee', 'Buy Me a Coffee', (h) => `https://buymeacoffee.com/${h}`],
    ['liberapay', 'Liberapay', (h) => `https://liberapay.com/${h}`],
    ['github', 'GitHub Sponsors', (h) => `https://github.com/sponsors/${h}`],
    ['custom', '', (h) => h],
];
const parseFunding = (yaml: string): Funding | null => {
    for (const [key, platform, url] of FUNDING) {
        const hit = yaml.match(new RegExp(`^\\s*${key}\\s*:\\s*\\[?\\s*["']?([^"'\\]\\s,]+)`, 'm'));
        const handle = hit?.[1];
        if (handle && (key !== 'custom' || handle.startsWith('http'))) {
            return {platform: platform || new URL(handle).hostname.replace(/^www\./, ''), url: url(handle)};
        }
    }
    return null;
};
const fundingOf = async(repo: string, path: string): Promise<Funding | null> => {
    const file = await github<ApiFile>(`/repos/${owner}/${repo}/contents/${path}`).catch(() => null);
    return file ? parseFunding(Buffer.from(file.content, file.encoding as BufferEncoding).toString('utf8')) : null;
};

const empty = (): Project => ({
    at: null,
    repository: {owner, name, url: `https://github.com/${owner}/${name}`, description: null, licence: null},
    organisation: {login: owner, name: owner, description: null, website: null, avatar: null, url: `https://github.com/${owner}`, repositoriesUrl: `https://github.com/orgs/${owner}/repositories`, peopleUrl: `https://github.com/orgs/${owner}/people`},
    founders: [],
    contributors: [],
    funding: null,
});

try {
    const org = await github<ApiOrg>(`/orgs/${owner}`);
    const repo = await github<ApiRepo>(`/repos/${owner}/${name}`);
    const repos = (await github<ApiRepo[]>(`/orgs/${owner}/repos?type=public&per_page=100`)).filter((r) => !r.fork && !r.archived);

    const founders = await Promise.all(COFOUNDERS.map(async(login) => person(await github<ApiUser>(`/users/${login}`))));

    const totals = new Map<string, Person>();
    for (const r of repos) {
        for (const user of await github<ApiUser[]>(`/repos/${owner}/${r.name}/contributors?per_page=100`).catch(() => [] as ApiUser[])) {
            if (user.type !== 'User') { continue; }
            const known = totals.get(user.login) ?? {login: user.login, name: null, url: user.html_url, avatar: user.avatar_url, contributions: 0};
            known.contributions += user.contributions ?? 0;
            totals.set(user.login, known);
        }
    }
    const contributors = [...totals.values()].sort((a, b) => b.contributions - a.contributions);

    const funding = await fundingOf(name, '.github/FUNDING.yml') ?? await fundingOf('.github', 'FUNDING.yml') ?? await fundingOf('.github', '.github/FUNDING.yml');

    const project: Project = {
        at: new Date().toISOString(),
        repository: {owner, name, url: repo.html_url, description: repo.description, licence: repo.license?.spdx_id ?? null},
        organisation: {...empty().organisation, login: org.login, name: org.name ?? org.login, description: org.description, website: org.blog || null, avatar: org.avatar_url, url: org.html_url},
        founders,
        contributors,
        funding,
    };
    writeFileSync(out, JSON.stringify(project, null, 1) + '\n');
    console.log(`project: ${owner}/${name}, ${founders.length} founders, ${contributors.length} contributors of ${repos.length} repositories${funding ? `, funding on ${funding.platform}` : ''}`);
} catch (error) {
    if (!existsSync(out)) { writeFileSync(out, JSON.stringify(empty(), null, 1) + '\n'); }
    console.log(`project: kept the last data (${error instanceof Error ? error.message : String(error)})`);
}
// Read back so a corrupt file never reaches the build.
JSON.parse(readFileSync(out, 'utf8'));
