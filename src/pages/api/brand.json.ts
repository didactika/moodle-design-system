import type {APIRoute} from 'astro';
import brand from '../../data/brand.json';
import team from '../../data/team.json';
import {SCHEMA, json, urls} from '../../lib/api';

/** Didactika's colours, its logo and icon, the sponsor link and the team. */
export const GET: APIRoute = ({site}) => {
    const {abs} = urls(site);
    return json({
        schema: SCHEMA,
        ...brand,
        assets: {logo: abs('/brand/didactika-logo.png'), icon: abs('/favicon.svg'), share: abs('/brand/og-image.png')},
        sponsor: team.sponsor,
        website: team.website,
        team: {cofounders: team.cofounders.map(({avatar, ...p}) => ({...p, avatar: abs('/' + avatar)})), collaborators: team.collaborators.map(({avatar, ...p}) => ({...p, avatar: abs('/' + avatar)}))},
    });
};
