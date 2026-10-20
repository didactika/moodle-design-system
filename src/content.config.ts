import {defineCollection} from 'astro:content';
import {glob} from 'astro/loaders';
import {z} from 'astro/zod';

/**
 * Every page of the site, one file per language: `src/content/docs/<lang>/<section>/<page>.mdx`. The two files of a page share
 * `group` and `order`; `tools/check-content.mjs` fails the build when one language is missing or they disagree.
 */
const docs = defineCollection({
    loader: glob({pattern: '**/*.mdx', base: './src/content/docs'}),
    schema: z.object({
        title: z.string(),
        summary: z.string(),
        /** The section of the navigation. */
        group: z.enum(['start', 'foundations', 'bootstrap', 'moodle', 'didactika', 'patterns', 'guides']),
        order: z.number(),
        /** Versions the page applies to. Omitted: all of them. */
        versions: z.array(z.enum(['v41', 'v45', 'v53'])).optional(),
    }),
});

export const collections = {docs};
