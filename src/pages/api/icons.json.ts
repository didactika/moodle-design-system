import type {APIRoute} from 'astro';
import versions from '../../data/versions.json';
import icons from '../../data/icons.json';
import {SCHEMA, json} from '../../lib/api';

/** Every icon Moodle maps to Font Awesome, with the Font Awesome name each version draws it with (absent where a version has none). */
export const GET: APIRoute = () => json({schema: SCHEMA, versions: versions.map((v) => ({id: v.id, family: v.icons})), icons});
