// Loads the YAML data files in src/data and validates them, so a typo in a data file
// fails the build with a clear message instead of breaking a page silently.
import { parse } from 'yaml';
import { z } from 'astro/zod';

import siteRaw from '../data/site.yaml?raw';
import terminRaw from '../data/termin.yaml?raw';
import schemaRaw from '../data/schema.yaml?raw';
import priserRaw from '../data/priser.yaml?raw';
import bokningsvillkorRaw from '../data/bokningsvillkor.yaml?raw';
import butikRaw from '../data/butik.yaml?raw';

function load<T extends z.ZodType>(name: string, raw: string, schema: T): z.infer<T> {
  const result = schema.safeParse(parse(raw));
  if (!result.success) {
    throw new Error(`src/data/${name}.yaml är felaktig:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}

const Text = z.object({ rubrik: z.string(), text: z.string() });

export const site = load(
  'site',
  siteRaw,
  z.object({
    namn: z.string(),
    orgnr: z.string(),
    epost: z.email(),
    telefon: z.string(),
    telefon_href: z.string().startsWith('tel:'),
    telefon_not: z.string(),
    adress: z.object({ gata: z.string(), postnummer: z.string(), ort: z.string() }),
    swish: z.string(),
    sociala: z.object({ facebook: z.url(), instagram: z.url() }),
    google: z.object({ vagbeskrivning: z.url(), karta_embed: z.url(), recension: z.url() }),
    oppettider: z.array(z.object({ dag: z.string(), tid: z.string() })),
    citat: z.object({ text: z.string(), namn: z.string(), titel: z.string() }),
    trustindex_widget: z.string().regex(/^[a-zA-Z0-9]*$/, 'bara bokstäver och siffror'),
    dans_se: z.object({ shop: z.url(), script: z.url() }),
  }),
);

export const termin = load(
  'termin',
  terminRaw,
  z.object({
    rubrik: z.string(),
    notis: z.string().optional(),
    punkter: z.array(z.string()),
    datum: z.array(z.object({ etikett: z.string(), varde: z.string() })),
    anmalan_text: z.string(),
  }),
);

const Schemagrupp = z.object({
  namn: z.string(),
  dagar: z.array(
    z.object({
      dag: z.string(),
      pass: z.array(z.object({ tid: z.string(), klass: z.string() })),
    }),
  ),
});
const Schemadel = z.object({ intro: z.string(), grupper: z.array(Schemagrupp) });

export const schema = load(
  'schema',
  schemaRaw,
  z.object({ veckoschema: Schemadel, tavlingsschema: Schemadel }),
);

const Prisrad = z.object({ namn: z.string(), pris: z.string(), info: z.string() });

export const priser = load(
  'priser',
  priserRaw,
  z.object({
    kurser: z.object({ intro: z.string(), rader: z.array(Prisrad) }),
    presentkort: z.object({ intro: z.string(), rader: z.array(Prisrad) }),
    information: z.array(Text),
  }),
);

export const bokningsvillkor = load('bokningsvillkor', bokningsvillkorRaw, z.array(Text));

export const butik = load(
  'butik',
  butikRaw,
  z.object({
    oppen: z.boolean(),
    meddelande: z.string().optional(),
    stangt_meddelande: z.string(),
    namntryck_max: z.number().int().positive(),
    namntryck_info: z.string(),
    produkter: z.array(
      z.object({
        id: z.string().regex(/^[a-z0-9-]+$/),
        namn: z.string(),
        pris: z.number().int().positive(),
        storlek: z.enum(['vuxen', 'junior', 'ingen']),
        bild: z.string(),
      }),
    ),
    storlekar: z.object({ vuxen: z.array(z.string()), junior: z.array(z.string()) }),
  }),
);

export type Butik = typeof butik;
