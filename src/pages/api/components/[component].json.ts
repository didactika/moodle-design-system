import type {APIRoute, GetStaticPaths} from 'astro';
import {SCHEMA, components, json} from '../../../lib/api';

export const getStaticPaths = (async({site}) => (await components(site)).map((c) => ({params: {component: c.id}, props: {component: c}}))) satisfies GetStaticPaths;

/** One component: each example as markup for Bootstrap 5 (Moodle 5.x) and for Bootstrap 4 (Moodle 4.x), plain and as a Moodle template. */
export const GET: APIRoute = ({props}) => json({schema: SCHEMA, ...props.component});
