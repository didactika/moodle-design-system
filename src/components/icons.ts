// The glyphs of the site's own chrome (header, home), taken as they are from Font Awesome Free 6.7.2 (icons CC BY 4.0), never drawn by hand.
// The icons of the examples are not here: those come from Moodle's own icon map, per version.
import sun from '@fortawesome/fontawesome-free/svgs/solid/sun.svg?raw';
import moon from '@fortawesome/fontawesome-free/svgs/solid/moon.svg?raw';
import auto from '@fortawesome/fontawesome-free/svgs/solid/circle-half-stroke.svg?raw';
import globe from '@fortawesome/fontawesome-free/svgs/solid/globe.svg?raw';
import layers from '@fortawesome/fontawesome-free/svgs/solid/layer-group.svg?raw';
import bars from '@fortawesome/fontawesome-free/svgs/solid/bars.svg?raw';
import search from '@fortawesome/fontawesome-free/svgs/solid/magnifying-glass.svg?raw';
import palette from '@fortawesome/fontawesome-free/svgs/solid/palette.svg?raw';
import cubes from '@fortawesome/fontawesome-free/svgs/solid/cubes.svg?raw';
import book from '@fortawesome/fontawesome-free/svgs/solid/book-open.svg?raw';
import puzzle from '@fortawesome/fontawesome-free/svgs/solid/puzzle-piece.svg?raw';
import access from '@fortawesome/fontawesome-free/svgs/solid/universal-access.svg?raw';
import language from '@fortawesome/fontawesome-free/svgs/solid/language.svg?raw';
import arrow from '@fortawesome/fontawesome-free/svgs/solid/arrow-right.svg?raw';
import ruler from '@fortawesome/fontawesome-free/svgs/solid/ruler-combined.svg?raw';
import swatch from '@fortawesome/fontawesome-free/svgs/solid/swatchbook.svg?raw';
import branch from '@fortawesome/fontawesome-free/svgs/solid/code-branch.svg?raw';
import sparkles from '@fortawesome/fontawesome-free/svgs/solid/wand-magic-sparkles.svg?raw';
import check from '@fortawesome/fontawesome-free/svgs/solid/check.svg?raw';
import pointer from '@fortawesome/fontawesome-free/svgs/solid/arrow-pointer.svg?raw';
import github from '@fortawesome/fontawesome-free/svgs/brands/github.svg?raw';

const raw = {sun, moon, auto, globe, layers, bars, search, palette, cubes, book, puzzle, access, language, arrow, ruler, swatch, branch, sparkles, check, pointer, github};

export type IconName = keyof typeof raw;

/** Each glyph without the licence comment Font Awesome puts in its files. */
export const icons = Object.fromEntries(Object.entries(raw).map(([name, svg]) => [name, svg.replace(/<!--[\s\S]*?-->/g, '')])) as Record<IconName, string>;
