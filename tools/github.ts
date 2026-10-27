// This file is part of the Didactika Moodle design system.
// Licensed under the GNU General Public License, version 3 or later.

/**
 * What the build needs to know about where it runs, read from the environment instead of written in a file: which GitHub repository the
 * site belongs to and a token to ask the API with. `astro.config.ts` and `tools/fetch-project.ts` share it, so the address of the site, the
 * organisation, the people and the funding all follow the repository.
 */
import {execSync} from 'node:child_process';
import {existsSync, readFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

export interface RepositoryId {
    owner: string;
    name: string;
}

const run = (command: string): string => {
    try {
        return execSync(command, {encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']}).trim();
    } catch (error) {
        return '';
    }
};

/** The repository of the site: GITHUB_REPOSITORY in Actions, the `origin` remote of the clone anywhere else. */
export const repositoryId = (): RepositoryId => {
    const remote = process.env.GITHUB_REPOSITORY ?? run('git remote get-url origin');
    const match = remote.match(/([^/:]+)\/([^/]+?)(?:\.git)?$/);
    if (!match) {
        throw new Error('Cannot tell which GitHub repository this is: set GITHUB_REPOSITORY or give the clone an origin remote.');
    }
    return {owner: match[1] as string, name: match[2] as string};
};

/** A token for the GitHub API: the one of Actions, one of the environment, or the one the `gh` CLI is signed in with. Empty when there is none. */
export const githubToken = (): string => process.env.GH_TOKEN || process.env.GITHUB_TOKEN || run('gh auth token');

/** One request to the GitHub API. It rejects when GitHub does not answer with success. */
export const github = async<T>(path: string, token = githubToken()): Promise<T> => {
    const headers: Record<string, string> = {Accept: 'application/vnd.github+json', 'User-Agent': 'didactika-design-system'};
    if (token) { headers.Authorization = `Bearer ${token}`; }
    const response = await fetch(`https://api.github.com${path}`, {headers});
    if (!response.ok) { throw new Error(`${response.status} ${path}`); }
    return response.json() as Promise<T>;
};

/**
 * Where the site is served. With a custom domain (the file `public/CNAME`, which GitHub Pages also reads) the site lives at the root of that
 * domain; without one it lives under `https://<owner>.github.io/<repository>/`.
 */
export const siteAddress = (): {site: string; base: string} => {
    const file = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'CNAME');
    const domain = existsSync(file) ? (readFileSync(file, 'utf8').split(/\r?\n/)[0] ?? '').trim() : '';
    if (domain) {
        return {site: `https://${domain}`, base: '/'};
    }
    const {owner, name} = repositoryId();
    return {site: `https://${owner}.github.io`, base: `/${name}`};
};
