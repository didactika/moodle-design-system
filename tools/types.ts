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
