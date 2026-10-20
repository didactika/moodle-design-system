import type {APIRoute} from 'astro';
import versions from '../../data/versions.json';
import {SCHEMA, json, pages, urls} from '../../lib/api';

/** The entry point of the data of the site: what exists, where it is, and how to open a page in a state. */
export const GET: APIRoute = async() => {
    const {abs} = urls();
    const list = await pages();
    return json({
        schema: SCHEMA,
        name: 'Didactika Moodle UI',
        site: abs('/'),
        repository: 'https://github.com/didactika/moodle-design-system',
        licence: 'GPL-3.0-or-later',
        languages: ['en', 'es'],
        versions: versions.map((v) => ({...v, tokens: abs(`/api/tokens/${v.id}.json`), stylesheet: abs(`/moodle/${v.id}/boost.css`)})),
        resources: {components: abs('/api/components/index.json'), icons: abs('/api/icons.json'), brand: abs('/api/brand.json')},
        pages: list.map(({body, ...page}) => page),
        deepLinks: {
            description: 'Any page opens in a given state with query parameters.',
            parameters: {version: versions.map((v) => v.id), mode: ['light', 'dark'], brand: ['1', '0']},
            example: abs('/en/bootstrap/buttons/?version=v45&mode=light&brand=1'),
        },
    });
};
