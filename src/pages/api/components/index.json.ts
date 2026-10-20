import type {APIRoute} from 'astro';
import {SCHEMA, components, json} from '../../../lib/api';

/** The components that have examples, with the identifiers of their examples. */
export const GET: APIRoute = async({site}) => json({
    schema: SCHEMA,
    components: (await components(site)).map(({examples, ...c}) => ({...c, examples: (examples as {id: string}[]).map((e) => e.id)})),
});
