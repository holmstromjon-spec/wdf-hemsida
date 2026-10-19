import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Files starting with "_" (e.g. _MALL.md) are templates and are not published.
const pattern = '[!_]*.md';

const instruktorer = defineCollection({
  loader: glob({ pattern, base: './src/content/instruktorer' }),
  schema: ({ image }) =>
    z.object({
      namn: z.string(),
      roll: z.string(),
      ordning: z.number(),
      bild: image().optional(),
      dansstilar: z.array(z.string()).default([]),
    }),
});

const dansstilar = defineCollection({
  loader: glob({ pattern, base: './src/content/dansstilar' }),
  schema: ({ image }) =>
    z.object({
      namn: z.string(),
      ordning: z.number(),
      bild: image().optional(),
      visa_pa_dansstilar: z.boolean().default(true),
      // Set to show the style under "Våra mest populära dansstilar just nu!" on the start page.
      popular: z.object({ namn: z.string(), text: z.string() }).optional(),
    }),
});

const aktuellt = defineCollection({
  loader: glob({ pattern, base: './src/content/aktuellt' }),
  schema: ({ image }) =>
    z.object({
      titel: z.string(),
      datum: z.coerce.date(),
      bild: image().optional(),
      bild_alt: z.string().optional(),
      utdrag: z.string().optional(),
    }),
});

export const collections = { instruktorer, dansstilar, aktuellt };
