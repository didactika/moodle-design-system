import type {APIRoute, GetStaticPaths} from 'astro';
import {SCHEMA, json, pages} from '../../../lib/api';

export const getStaticPaths = (async({site}) => (await pages(site)).map((page) => ({params: {slug: page.id}, props: {page}}))) satisfies GetStaticPaths;

/** One page: its data in both languages and the source of its text (MDX; the components in it are the site's own). */
export const GET: APIRoute = ({props}) => json({schema: SCHEMA, ...props.page});
