// This file is part of the Didactika Moodle design system.
// Licensed under the GNU General Public License, version 3 or later.

/**
 * Draws the icon of the site: the Didactika logo (the organisation's, from public/brand/didactika-logo.png) on a white tile with the
 * handles of a selection and the graduation cap of Moodle in a badge on the corner, so it reads as "Didactika" and "Moodle" at once, in the
 * favicon too. The cap is not drawn here: it is the one in Moodle's own logo (.github/moodlelogo.svg in the Moodle repository), cut out of
 * it and painted with the orange of that same file. It writes moodle-cap.svg, favicon.svg, the PNG sizes, favicon.ico, the apple touch icon
 * and the image used when a link is shared.
 *
 * The output is committed; run it only when the icon changes. It needs sharp, which the site itself does not:
 *   npm i --no-save sharp && tsx tools/build-brand.ts
 */
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pub = join(root, 'public');
const logo = readFileSync(join(pub, 'brand/didactika-logo.png')).toString('base64');
/** The cap of Moodle's logo, as an SVG that fits it exactly. */
const MOODLE_LOGO = 'https://raw.githubusercontent.com/moodle/moodle/MOODLE_503_STABLE/.github/moodlelogo.svg';
const cached = join(root, 'vendor/moodle/moodlelogo.svg');
if (!existsSync(cached)) {
    const response = await fetch(MOODLE_LOGO);
    if (!response.ok) { throw new Error(`${response.status} ${MOODLE_LOGO}`); }
    mkdirSync(dirname(cached), {recursive: true});
    writeFileSync(cached, Buffer.from(await response.arrayBuffer()));
}
const source = readFileSync(cached, 'utf8');
const ORANGE = (source.match(/\.cls-1\{fill:(#[0-9a-f]{6})/i) as RegExpMatchArray)[1] as string;
const capPaths = [...source.matchAll(/<path class="cls-4" d="([^"]+)"\/>/g)].map((m) => `<path d="${m[1]}"/>`).join('');
const probe = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1231.24 314.44" width="1231" height="314"><g fill="${ORANGE}">${capPaths}</g></svg>`;
const {data, info} = await sharp(Buffer.from(probe), {density: 288}).ensureAlpha().raw().toBuffer({resolveWithObject: true});
const scale = info.width / 1231.24;
let [x0, y0, x1, y1] = [info.width, info.height, 0, 0];
for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
        if ((data[(y * info.width + x) * info.channels + 3] as number) > 8) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    }
}
const box = {x: x0 / scale, y: y0 / scale, w: (x1 - x0 + 1) / scale, h: (y1 - y0 + 1) / scale};
const CAP = { w: box.w, h: box.h, view: `${box.x.toFixed(2)} ${box.y.toFixed(2)} ${box.w.toFixed(2)} ${box.h.toFixed(2)}` };
const cap = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${CAP.view}" width="${Math.round(CAP.w)}" height="${Math.round(CAP.h)}"><g fill="${ORANGE}">${capPaths}</g></svg>
`;
writeFileSync(join(pub, 'brand/moodle-cap.svg'), cap);
const TEAL = '#0f766e';
const DEEP = '#00555a';

const handle = (x: number, y: number): string => `<rect x="${x - 15}" y="${y - 15}" width="30" height="30" rx="6" fill="#fff" stroke="${TEAL}" stroke-width="9"/>`;

/** The icon as an SVG of 512 by 512. */
const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect x="16" y="16" width="480" height="480" rx="120" fill="#fff"/>
  <rect x="16" y="16" width="480" height="480" rx="120" fill="none" stroke="${DEEP}" stroke-opacity=".14" stroke-width="8"/>
  <image href="data:image/png;base64,${logo}" x="62" y="52" width="388" height="388"/>
  <rect x="64" y="64" width="384" height="384" rx="26" fill="none" stroke="${TEAL}" stroke-width="9" stroke-dasharray="1 0"/>
  ${handle(64, 64)}${handle(448, 64)}${handle(64, 448)}
  <circle cx="392" cy="392" r="104" fill="#fff" stroke="${TEAL}" stroke-width="14"/>
  <svg x="${392 - 78}" y="${392 - 78 * CAP.h / CAP.w}" width="156" height="${156 * CAP.h / CAP.w}" viewBox="${CAP.view}"><g fill="${ORANGE}">${capPaths}</g></svg>
</svg>
`;
writeFileSync(join(pub, 'favicon.svg'), icon);
writeFileSync(join(pub, 'brand/favicon.svg'), icon);

const png = (size: number): Promise<Buffer> => sharp(Buffer.from(icon), {density: 384}).resize(size, size).png().toBuffer();
const sizes: Record<number, string> = {16: 'favicon-16x16.png', 32: 'favicon-32x32.png', 180: 'apple-touch-icon.png', 192: 'brand/android-chrome-192x192.png', 512: 'brand/android-chrome-512x512.png'};
const buffers: Record<number, Buffer> = {};
for (const [size, name] of Object.entries(sizes)) {
    const buffer = await png(Number(size));
    buffers[Number(size)] = buffer;
    writeFileSync(join(pub, name), buffer);
    if (!name.includes('/')) { writeFileSync(join(pub, 'brand', name), buffer); }
}

// favicon.ico: a container with the 16 and 32 pixel PNGs.
const entries = [16, 32].map((s) => ({size: s, data: buffers[s] as Buffer}));
const head = Buffer.alloc(6 + 16 * entries.length);
head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(entries.length, 4);
let offset = head.length;
entries.forEach((e, i) => {
    const at = 6 + 16 * i;
    head.writeUInt8(e.size, at); head.writeUInt8(e.size, at + 1); head.writeUInt8(0, at + 2); head.writeUInt8(0, at + 3);
    head.writeUInt16LE(1, at + 4); head.writeUInt16LE(32, at + 6); head.writeUInt32LE(e.data.length, at + 8); head.writeUInt32LE(offset, at + 12);
    offset += e.data.length;
});
const ico = Buffer.concat([head, ...entries.map((e) => e.data)]);
writeFileSync(join(pub, 'favicon.ico'), ico);
writeFileSync(join(pub, 'brand/favicon.ico'), ico);

// The image of a shared link: 1200 by 630.
const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f0fdfa"/><stop offset="1" stop-color="#ccfbf1"/></linearGradient>
    <pattern id="d" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.6" fill="#99d5cd"/></pattern>
  </defs>
  <rect width="1200" height="630" fill="url(#g)"/><rect width="1200" height="630" fill="url(#d)" opacity=".55"/>
  <g transform="translate(96 150)">
    <text x="0" y="150" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="104" letter-spacing="-3" fill="${DEEP}">Moodle</text>
    <text x="2" y="236" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="76" letter-spacing="-2" fill="${TEAL}">Design System</text>
    <text x="6" y="290" font-family="Arial, Helvetica, sans-serif" font-weight="600" font-size="34" fill="#334155">by Didactika</text>
    <text x="6" y="350" font-family="Arial, Helvetica, sans-serif" font-size="30" fill="#334155">The design system of our Moodle plugins</text>
    <text x="6" y="394" font-family="Arial, Helvetica, sans-serif" font-size="26" fill="#475569">Bootstrap 4 and 5 · English and Spanish · open source</text>
  </g>
  <image href="data:image/svg+xml;base64,${Buffer.from(icon).toString('base64')}" x="760" y="118" width="360" height="360"/>
</svg>`;
writeFileSync(join(pub, 'brand/og-image.png'), await sharp(Buffer.from(og), {density: 144}).png().toBuffer());
console.log('brand assets written');
