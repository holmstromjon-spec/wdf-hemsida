# Wilson Dance Factory – hemsida

Ny version av https://wilsondancefactory.se. Den gamla sajten är byggd i WordPress/Elementor. Den nya är en statisk sajt byggd med **Astro 7** och hostas på **Netlify**.

## Status
- [x] Inventering av nuvarande sajt: se `INVENTERING.md` (godkänd av Jon 2026-10-19, beslut i §6)
- [x] Sajten är byggd: alla 17 sidor, datafiler, bilder, butik och beställningsfunktion
- [x] Publicerad på testadressen https://wilsondancefactory.netlify.app/ (Netlify, från `main` på github.com/holmstromjon-spec/wdf-hemsida)
- [ ] Kundens feedback på testversionen (Jon visar den för kunden 2026-10-20)
- [ ] Kvar före lansering: se **Kvar att göra** längst ned och `PUBLICERING.md`

## Mål
- **Samma URL:er som idag**, så att vi behåller rankingen på Google. Varje sida i `INVENTERING.md` §1 finns kvar med exakt samma sökväg, med avslutande `/` (`trailingSlash: 'always'`). Oanvända WP-sidor är borttagna helt, utan omdirigeringar (beslut 5). `npm run check-urls` kontrollerar detta.
- **Allt innehåll som ändras ofta ligger i datafiler**, inte i sidkoden. Se **Ändra innehåll** nedan.
- **Anmälan** bäddas in från dans.se (org-id 372, konto `wilsondancefactory`) med deras eget skript och en `cwLoadContent`-länk ([CogWork-handledning](https://cogwork.se/handledning/integrera/webbshop/)). dans.se är ett eget system. Vi bäddar bara in det och rör aldrig dess innehåll (kurser, ledare, tider). Båda adresserna står i `site.yaml → dans_se`, och båda detaljerna nedan är nödvändiga för att filtren (?, Ålder, Kategori, Dag, Ledare, Sök) ska synas:
  - Länken har `?listFormat=list`, alltså den nya kurslistan med filter.
  - Skriptet laddas från `https://dans.se/files/prod/js/lib.js`, **inte** från kortadressen `/api/init.js`. Kortadressen gör att filtren hämtas från `/api/shop_filter.js`, vars omdirigering saknar CORS, och då blockerar webbläsaren dem. Det är ett fel hos dans.se, verifierat 2026-10-20.
- **Butiken** är ett beställningsformulär, ingen kassa. Kunden får ett bekräftelsemejl, och info@wilsondancefactory.se får en kopia. Betalning sker med Swish eller i receptionen.

## Ändra innehåll
| Vad | Fil |
|---|---|
| Kontakt, öppettider, sociala medier, värdegrundscitat, Trustindex-ID | `src/data/site.yaml` |
| Priser, presentkort, prisvillkor | `src/data/priser.yaml` |
| Veckoschema och tävlingsschema | `src/data/schema.yaml` |
| Termin (rubrik, datum, öppnar-text) | `src/data/termin.yaml` |
| Bokningsvillkor på Anmälan | `src/data/bokningsvillkor.yaml` |
| Butik: öppen/stängd, produkter, priser, storlekar | `src/data/butik.yaml` (bilder i `src/assets/images/butik/`) |
| Instruktörer | `src/content/instruktorer/<namn>.md` (frontmatter + biografi) |
| Dansstilar (+ "populära" på startsidan) | `src/content/dansstilar/<stil>.md` |
| Nyheter på Aktuellt | `src/content/aktuellt/` – kopiera `_MALL.md` |
| Köpvillkor, integritetspolicy | `src/texter/*.md` |

Alla datafiler valideras med Zod (`src/lib/data.ts`, `src/content.config.ts`). Ett felstavat eller saknat fält stoppar bygget med ett tydligt felmeddelande, i stället för att en sida går sönder tyst.

## Struktur
```
src/
  data/             # YAML-datafiler (se tabellen ovan)
  content/          # instruktorer/, dansstilar/, aktuellt/ (Markdown)
  texter/           # köpvillkor och integritetspolicy (Markdown)
  assets/images/    # optimerade bilder (committas), grupperade per användning
  components/       # Header, Footer, PageHead, ClassFinder, Terms, PhotoGrid, PhotoBand, Reviews, ScheduleGroups, TextPage
  layouts/          # BaseLayout (head, SEO, meny, sidfot, rörelse)
  lib/              # data.ts (laddar + validerar YAML), nav.ts (menyn)
  pages/            # en fil per URL; butik.json.ts publicerar produktlistan för ordefunktionen
  styles/global.css # tokens, typografi, knappar, kort, rörelse
public/fonts/       # Outfit (Google Fonts, OFL, self-hostad)
public/video/       # startsidans video (npm run compress-video)
netlify/functions/  # order.mjs – beställningsmejl via Resend
scripts/            # import-images.mjs, check-urls.mjs, test-order.mjs
uploads/            # rå WordPress-export – ENDAST källa, ignoreras av Git
```

## Bilder
- `uploads/` är en rå WordPress-export (cirka 1 270 filer, inklusive cache, loggar, `.php` och `.htaccess`). **Den ska aldrig committas** och står i `.gitignore`.
- `npm run import-images` plockar ut de bilder som används (listan finns i skriptet), skalar ner till högst 2000 px och skriver till `src/assets/images/<grupp>/`. Utgå alltid från originalet, aldrig från WP:s storleksvarianter.
- Astros `<Image>` genererar WebP och responsiva storlekar när sajten byggs. Varje bild har en meningsfull `alt`-text.
- Instruktörer utan foto (Sigge, Elvira, Tindra) visar loggan på röd botten. Lägg till `bild:` i deras `.md` när foton finns.
- **Videon på startsidan är viktig för Jon.** Den ligger överst på startsidan, i full bredd och utan ljud, i loop, precis som på gamla sajten. Texten "WILSON DANCE FACTORY" är inbränd i videon. `npm run compress-video` gör `public/video/startsida-1920.mp4` (12 MB), `-1280.mp4` (6,6 MB) och en stillbild från originalet (53 MB) med `ffmpeg-static`. På mobil visas hela 16:9-bilden, så att texten inte klipps. Om användaren valt "minska rörelse" visas stillbilden, och det finns alltid en pausknapp.

## Design
- **Vald riktning: "balansversionen"** (Jon, 2026-10-20). Grunden är gamla sajtens känsla, och några grepp är hämtade från en första, djärvare version. Jon tyckte att den djärva var "too much" och att en ren kopia av den gamla var för lite. Ändra inte riktningen utan att fråga.
  - **Från gamla sajten:** mörkt sidhuvud med diamantloggan, videon överst på startsidan, mörka fotoband som rubrik på undersidor, Outfit (fri ersättare för Hero New, Adobe Fonts) i tunn vikt 300 och vanlig skiftläge, rött `#C42A20` som accent, små knappar med 4 px rundning och en pil i en ring, vita kort med tunn ram, vit footer med diamanten centrerad och ett rött band längst ned.
  - **Nytt:** ljusare och luftigare (fler vita sektioner), ett rött faktaband på startsidan (1000+ medlemmar · 800+ kvm · 20+ dansstilar · Från 2 år), riktiga scenfoton för dansstilarna (fältet `foto` i `src/content/dansstilar/*.md`, i stället för de gamla textrutorna) och **"Hitta din klass"** som affisch på svart botten (`ClassFinder.astro`, fungerar utan JavaScript).
  - **Inte valt:** kraftiga rubriker i fet versal.
- Den djärva första versionen finns i Git-historiken (commit `d7719ab`). Den helt lugna kopian av gamla sajten finns på grenen `lugn-design`.
- Kort med knappar (dansstilar, instruktörer) har knappen nedtryckt med `margin-top: auto`, så att knapparna ligger i linje i varje rad. Jon märker sådant, så håll det.
- Bugg har en miljöbild (`miljo-6`) i stället för ett eget foto. Yoga är borttagen (kunden har inte yoga längre, 2026-10-20). De "populära" på startsidan är Balett, TikTok, Disco och HipHop.
- Taste-skillen (`.claude/skills/design-taste-frontend/`) användes för första versionen. Dess inspektör (`scripts/inspect.mjs <url>`) är fortfarande bra för skärmdumpar i tre bredder och för att hitta horisontell scroll. Dess stilregler (tunga rubriker, rörelsekrav, minst fyra bilder per sida) gäller **inte** för den valda riktningen.
- Använd WDF:s **egna** bilder i första hand. Bilder från öppna arkiv används bara efter godkännande. Faktainnehåll ändras aldrig av designskäl.

## Formulär
- **Butik:** `/shop/` skickar till `netlify/functions/order.mjs`. Funktionen läser produkter och priser från `/butik.json` (priser från webbläsaren ignoreras), validerar, skapar ett ordernummer (`WDF-ÅÅMMDD-XXXX`) och skickar mejl till kunden och till info@. Med JavaScript sker det via `fetch`. Utan JavaScript är det en vanlig POST som skickas vidare (303) till `/tack/?order=…&summa=…`. Formuläret har ett dolt fält mot spam.
- **Miljövariabler** (Netlify → Site configuration → Environment variables, aldrig i repot): `RESEND_API_KEY`, `ORDER_FROM` (`Wilson Dance Factory <order@wilsondancefactory.se>`), `ORDER_TO` (standard info@), `ORDER_DRY_RUN=1` för att bara logga. Se `.env.example`.
- **E-posttjänst:** Resend, region EU (eu-west-1), domänen `wilsondancefactory.se`. Resends DNS-poster ligger på `send` och `resend._domainkey` och rör inte Loopias MX eller SPF för info@. DNS ligger hos Loopia, och Jon lägger in posterna. Se `PUBLICERING.md`.
- **Jobba hos oss:** inget formulär. En mejlknapp (`mailto:` med färdigt ämne och mall) räcker (beslut 3).

## Arbetssätt
- Allt innehåll på sajten är på **svenska**. Kod, variabelnamn och commit-meddelanden får vara på engelska.
- Ändra inte faktainnehåll (priser, tider, namn, villkor, kvm, dansstilar). Innehållet flyttas med som det är, även där det motsäger sig självt (beslut 4). Bara rent tekniska fel rättas, som trasiga länkar och bilder som saknas.
- Rubrikerna är desamma som på gamla sajten.
- Små, avgränsade ändringar. Innan något räknas som klart: `npm run build && npm run check-urls` (och `npm run test-order` om butiken eller funktionen ändrats).
- Externa skript (dans.se, Trustindex, Google Maps) laddas bara på de sidor som behöver dem.
- Windows PowerShell 5.1 skriver UTF-8 **med BOM** via `Set-Content`. Redigera filer med editorn, inte med `Set-Content`.

## Kommandon
```bash
npm run dev            # lokal utveckling, http://localhost:4321
npm run build          # astro check + bygge till dist/
npm run preview        # förhandsgranskar bygget
npm run check-urls     # alla gamla URL:er, ankare och interna länkar (efter build)
npm run test-order     # testar beställningsfunktionen utan att skicka mejl (efter build)
npm run import-images  # plockar ut och optimerar bilder från uploads/
```

## Kvar att göra
Steg för steg för GitHub, Netlify, Resend och DNS finns i **`PUBLICERING.md`**.
1. **Resend:** skapa konto, verifiera `wilsondancefactory.se` (DNS-poster hos Loopia) och lägg in miljövariablerna i Netlify. Testa en riktig beställning.
2. **Trustindex:** skapa en widget på trustindex.io och klistra in ID:t i `site.yaml` → `trustindex_widget`. Tills dess visas en länk till Google-recensionerna.
3. **Integritetspolicyn** (`src/texter/integritetspolicy.md`) är ett utkast med `[platshållare]`. Den ska granskas innan lansering. Köpvillkoren har också platshållare från gamla sajten ("[t.ex. 3 dagar]").
4. **Cookies:** Google Maps (Kontakt) och Trustindex kan sätta cookies från tredje part. Avgör om vi behöver en banner, eller om kartan ska laddas först efter ett klick.
5. **Netlify:** koppla repot, peka domänen och kontrollera `sitemap-index.xml` i Google Search Console.

## Kontakt / fakta
Wilson Dance Factory, Kapplöpningsgatan 6, 252 30 Helsingborg · info@wilsondancefactory.se · 042-13 14 08 · Org.nr 559159-4873
