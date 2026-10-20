// This file is part of the Didactika Moodle design system.
// Licensed under the GNU General Public License, version 3 or later.

/** One Moodle version of `src/data/versions.json`, as the build tools read it. */
export interface VersionConfig {
    id: string;
    moodle: string;
    label: string;
    /** The branch of the Moodle repository its stylesheet is read from. */
    branch: string;
    /** True when the branch keeps the theme under `public/` (Moodle 5.1 and later). */
    public?: boolean;
    bootstrap: string;
    /** Which Font Awesome the version draws its icons with. */
    icons: 'fa4' | 'fa6';
    /** `npm` when the fonts come from the Font Awesome package instead of the Moodle branch. */
    fontsFrom?: 'npm';
    noto?: boolean;
    darkMode: boolean;
}

/** A person shown on the site, as GitHub describes them. */
export interface Person {
    login: string;
    name: string | null;
    url: string;
    avatar: string;
    contributions: number;
}

/** How the project can be supported, read from the FUNDING.yml GitHub itself uses for its Sponsor button. */
export interface Funding {
    platform: string;
    url: string;
}

/** Everything about the project the site shows, assembled from GitHub at build time (`tools/fetch-project.ts`). Nothing in it is written by hand. */
export interface Project {
    /** When it was read; null when GitHub did not answer and nothing was kept. */
    at: string | null;
    repository: {owner: string; name: string; url: string; description: string | null; licence: string | null};
    organisation: {login: string; name: string; description: string | null; website: string | null; avatar: string | null; url: string; repositoriesUrl: string; peopleUrl: string};
    /** The owners of the organisation. */
    founders: Person[];
    /** Everyone who has contributed to a public repository of the organisation, the most active first. */
    contributors: Person[];
    funding: Funding | null;
}
