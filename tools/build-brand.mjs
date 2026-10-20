// This file is part of the Didactika Moodle design system.
// Licensed under the GNU General Public License, version 3 or later.

/**
 * Draws the icon of the site: the Didactika logo (the organisation's, from public/brand/didactika-logo.png) on a white tile with the
 * handles of a selection and a "UI" badge, so it reads as "Didactika" and "design system" at once. It writes favicon.svg, the PNG sizes,
 * favicon.ico, the apple touch icon and the image used when a link is shared.
 *
 * The output is committed; run it only when the icon changes. It needs sharp, which the site itself does not:
 *   npm i --no-save sharp && node tools/build-brand.mjs
 */
import {readFileSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pub = join(root, 'public');
const logo = readFileSync(join(pub, 'brand/didactika-logo.png')).toString('base64');
const TEAL = '#0f766e';
const DEEP = '#00555a';

const handle = (x, y) => `<rect x="${x - 15}" y="${y - 15}" width="30" height="30" rx="6" fill="#fff" stroke="${TEAL}" stroke-width="9"/>`;

/** The icon as an SVG of 512 by 512. */
const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect x="16" y="16" width="480" height="480" rx="120" fill="#fff"/>
  <rect x="16" y="16" width="480" height="480" rx="120" fill="none" stroke="${DEEP}" stroke-opacity=".14" stroke-width="8"/>
  <image href="data:image/png;base64,${logo}" x="62" y="52" width="388" height="388"/>
  <rect x="64" y="64" width="384" height="384" rx="26" fill="none" stroke="${TEAL}" stroke-width="9" stroke-dasharray="1 0"/>
  ${handle(64, 64)}${handle(448, 64)}${handle(64, 448)}
  <rect x="268" y="338" width="214" height="142" rx="54" fill="${TEAL}" stroke="#fff" stroke-width="14"/>
  <text x="375" y="436" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="104" letter-spacing="-2" fill="#fff">UI</text>
</svg>
`;
writeFileSync(join(pub, 'favicon.svg'), icon);
writeFileSync(join(pub, 'brand/favicon.svg'), icon);

const png = (size) => sharp(Buffer.from(icon), {density: 384}).resize(size, size).png().toBuffer();
const sizes = {16: 'favicon-16x16.png', 32: 'favicon-32x32.png', 180: 'apple-touch-icon.png', 192: 'brand/android-chrome-192x192.png', 512: 'brand/android-chrome-512x512.png'};
const buffers = {};
for (const [size, name] of Object.entries(sizes)) {
    buffers[size] = await png(Number(size));
    writeFileSync(join(pub, name), buffers[size]);
    if (!name.includes('/')) { writeFileSync(join(pub, 'brand', name), buffers[size]); }
}

// favicon.ico: a container with the 16 and 32 pixel PNGs.
const entries = [16, 32].map((s) => ({size: s, data: buffers[s]}));
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
    <text x="0" y="170" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="96" letter-spacing="-3" fill="${DEEP}">Didactika</text>
    <text x="4" y="262" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="72" letter-spacing="-2" fill="${TEAL}">Moodle UI</text>
    <text x="6" y="336" font-family="Arial, Helvetica, sans-serif" font-size="30" fill="#334155">The design system of our Moodle plugins</text>
    <text x="6" y="380" font-family="Arial, Helvetica, sans-serif" font-size="26" fill="#475569">Bootstrap 4 and 5 · English and Spanish · open source</text>
  </g>
  <image href="data:image/svg+xml;base64,${Buffer.from(icon).toString('base64')}" x="760" y="118" width="360" height="360"/>
</svg>`;
writeFileSync(join(pub, 'brand/og-image.png'), await sharp(Buffer.from(og), {density: 144}).png().toBuffer());
console.log('brand assets written');
