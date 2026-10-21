# Moodle Design System · Didactika

The design system of Didactika's Moodle plugins, as a static site in English and Spanish: Bootstrap, Moodle and plugin components with
every variant, drawn with the real stylesheet of each supported Moodle version and measured from it.

Published at <https://didactika.github.io/moodle-design-system/> (GitHub Pages, from `main`). Pages was turned on once with GitHub Actions as its source; the workflow only deploys.

## What it is for

- One reference for how every Didactika plugin draws lists, forms, dialogs, badges and icons, on every Moodle version we support.
- The source of truth plugins are checked against. A plugin copies nothing from here at run time; it uses the classes of Bootstrap and
  Moodle that these pages document.

## How it works

Moodle commits the compiled stylesheet of its Boost theme in every branch. `tools/build-moodle.ts` downloads it for each version in
[`src/data/versions.json`](src/data/versions.json), points its fonts at local copies, and scopes every rule under `.ds-<id>` so all
versions live in one page and are switched without a reload. Every rule for `:hover`, `:focus` and `:active` also gets a
`.ds-is-hover`, `.ds-is-focus` and `.ds-is-active` twin, so a page can draw the states of a component side by side.
`tools/extract-data.ts` reads from the same sources the table of Moodle icons per version (`src/data/icons.json`) and the design
tokens of each stylesheet (`src/data/tokens.json`).

Examples are real HTML files in `src/examples`, written with the classes of Bootstrap 5 and the Moodle icon ids
(`<i data-pix="t/edit"></i>`). For the versions that run Bootstrap 4 the page translates the class names, or uses
`<name>.bs4.html` when the markup has to differ. Sizes, paddings, radii, type and colours in the tables and in the inspector are read
from the computed style of the example, never typed.

## Data for other documentation

Everything the site knows is also published as static JSON under `/api/` (see the guide "Connect a plugin's docs"): the index of pages
and versions, each page with the source of its text, the CSS variables of each Moodle version, the table of icons and the brand. Every
file carries `"schema": 1`. Any page opens in a given state with `?version=v45&mode=dark&brand=1`.

## Layout

```
src/content/docs/<lang>/<section>/<page>.mdx   one page per language; same group, order and versions in both
src/examples/<component>/<name>.html           the markup of a live example (and <name>.bs4.html where it differs)
src/components/                                Header, Footer, Logo, Icon, Example, Matrix, Rule, Colours, ThemeLab, IconGrid
src/data/                                      versions.json and brand.json (hand-kept), icons.json, tokens.json and project.generated.json (generated)
src/pages/api/                                 the JSON API
src/scripts/site.ts                            version, colour mode, examples, inspector, icon grid
tools/                                         build-moodle, extract-data, check-content, build-brand (icon and share image; needs sharp)
```

## Commands

```bash
npm ci
npm run dev        # downloads the Moodle stylesheets (once) and serves the site
npm run build      # build + content check, as CI does
npm run data       # refresh icons.json and tokens.json after changing a version (needs vendor/ from `npm run moodle`)
```

`npm run build` fails when a page is missing in one language, when the two languages disagree on `group`, `order` or
`versions`, or when an example file is missing or unused.

## Nothing is kept up to date by hand

The people, the organisation and the funding of the footer are assembled from GitHub on every build by `tools/fetch-project.ts`:

- the repository comes from `GITHUB_REPOSITORY` (in Actions) or the `origin` remote of the clone, and the address of the site (`https://<owner>.github.io/<repository>/`) follows it;
- the organisation (name, website, avatar) and everyone who contributed to any of its public repositories, as collaborators; the two co-founders are the only people set by hand (`COFOUNDERS` in the tool), with the name each has on GitHub;
- the funding, from the `FUNDING.yml` of the repository or of the organisation's `.github` repository, which is also what GitHub uses for its Sponsor button.

A token is read from `GH_TOKEN`, `GITHUB_TOKEN` or the `gh` CLI. If GitHub does not answer, the data of the last build is kept. The Pages workflow builds every day, so the site follows the organisation without a push.

## Adding a component page

Copy `src/content/docs/en/bootstrap/buttons.mdx` and its Spanish twin: it is the template. Every component page has what it is for and
when not to use it, anatomy, the matrix of variants and states, measured sizes, classes (with the Bootstrap 4 name), code, what changes
by version and accessibility, in both languages. A page never says where a component is used: the documentation of each plugin does.

## Licence

GPL-3.0-or-later, as Moodle. The stylesheets and fonts downloaded at build time belong to Moodle (GPL), Bootstrap (MIT), Font Awesome
Free (icons CC BY 4.0, fonts SIL OFL 1.1, code MIT) and Noto Sans (SIL OFL 1.1).
