# Didactika Moodle UI

The design system of Didactika's Moodle plugins, as a static site in English and Spanish: Bootstrap, Moodle and plugin components with
every variant, drawn with the real stylesheet of each supported Moodle version and measured from it.

Published at <https://didactika.github.io/moodle-design-system/> (GitHub Pages, from `main`).

## What it is for

- One reference for how every Didactika plugin draws lists, forms, dialogs, badges and icons, on every Moodle version we support.
- The source of truth plugins are checked against. A plugin copies nothing from here at run time; it uses the classes of Bootstrap and
  Moodle that these pages document.
- The content from which the page for Moodle's component library and the theme `theme_didactika` are built later.

## How it works

Moodle commits the compiled stylesheet of its Boost theme in every branch. `tools/build-moodle.mjs` downloads it for each version in
[`src/data/versions.json`](src/data/versions.json), points its fonts at local copies, and scopes every rule under `.ds-<id>` so all
versions live in one page and are switched without a reload. Every rule for `:hover`, `:focus` and `:active` also gets a
`.ds-is-hover`, `.ds-is-focus` and `.ds-is-active` twin, so a page can draw the states of a component side by side.
`tools/extract-data.mjs` reads from the same sources the table of Moodle icons per version (`src/data/icons.json`) and the design
tokens of each stylesheet (`src/data/tokens.json`).

Examples are real HTML files in `src/examples`, written with the classes of Bootstrap 5 and the Moodle icon ids
(`<i data-pix="t/edit"></i>`). For the versions that run Bootstrap 4 the page translates the class names, or uses
`<name>.bs4.html` when the markup has to differ. Sizes, paddings, radii, type and colours in the tables and in the inspector are read
from the computed style of the example, never typed.

## Layout

```
src/content/docs/<lang>/<section>/<page>.mdx   one page per language; same group, order, code and versions in both
src/examples/<component>/<name>.html           the markup of a live example (and <name>.bs4.html where it differs)
src/components/                                Example, Matrix, Rule, Tokens, IconGrid
src/data/                                      versions.json (hand-kept), icons.json and tokens.json (generated)
src/scripts/site.js                            version, colour mode, examples, inspector, icon grid
tools/                                         build-moodle, extract-data, check-content
```

## Commands

```bash
npm ci
npm run dev        # downloads the Moodle stylesheets (once) and serves the site
npm run build      # build + content check, as CI does
npm run data       # refresh icons.json and tokens.json after changing a version (needs vendor/ from `npm run moodle`)
```

`npm run build` fails when a page is missing in one language, when the two languages disagree on `group`, `order`, `code` or
`versions`, or when an example file is missing or unused.

## Adding a component page

Copy `src/content/docs/en/bootstrap/buttons.mdx` and its Spanish twin: it is the template. Every component page has what it is for and
when not to use it, anatomy, the matrix of variants and states, measured sizes, classes (with the Bootstrap 4 name), code, what changes
by version, accessibility and where it is used, in both languages.

## Licence

GPL-3.0-or-later, as Moodle. The stylesheets and fonts downloaded at build time belong to Moodle (GPL), Bootstrap (MIT), Font Awesome
Free (icons CC BY 4.0, fonts SIL OFL 1.1, code MIT) and Noto Sans (SIL OFL 1.1).
