import type {APIRoute} from 'astro';
import brand from '../../data/brand.json';
import {SCHEMA, json, urls} from '../../lib/api';

/** Didactika's colours, its logo and its icon. */
export const GET: APIRoute = ({site}) => {
    const {abs} = urls(site);
    return json({schema: SCHEMA, ...brand, assets: {logo: abs('/brand/didactika-logo.png'), icon: abs('/favicon.svg'), share: abs('/brand/og-image.png')}});
};
