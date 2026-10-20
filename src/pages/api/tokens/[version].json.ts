import type {APIRoute, GetStaticPaths} from 'astro';
import versions from '../../../data/versions.json';
import tokens from '../../../data/tokens.json';
import {SCHEMA, json} from '../../../lib/api';

export const getStaticPaths = (() => versions.map((v) => ({params: {version: v.id}, props: {version: v}}))) satisfies GetStaticPaths;

/** The CSS variables of the stylesheet of a version, light and dark. */
export const GET: APIRoute = ({props}) => json({schema: SCHEMA, version: props.version, tokens: (tokens as Record<string, unknown>)[props.version.id]});
