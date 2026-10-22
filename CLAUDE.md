# Wilson Dance Factory – hemsida

Ny version av https://wilsondancefactory.se. Den gamla sajten är byggd i WordPress/Elementor. Den nya är en statisk sajt byggd med **Astro 7** och hostas på **Netlify**.

## Status
- [x] Inventering av nuvarande sajt: se `INVENTERING.md` (godkänd av Jon 2026-10-19, beslut i §6)
- [x] Sajten är byggd: alla 17 sidor, datafiler, bilder, butik och beställningsfunktion
- [x] Publicerad på testadressen https://wilsondancefactory.netlify.app/ (Netlify, från `main` på github.com/holmstromjon-spec/wdf-hemsida)
- [x] Kundens feedback, omgång 1 (2026-10-20): Yoga bort/HipHop in bland populära, informationsmötets datum "meddelas senare", text över bilder rättad. Kunden: "once these things are fixed its ok to release" (kan komma fler små saker).
- [x] **Lanserad 2026-10-20** på https://wilsondancefactory.se (Netlify, DNS kvar hos Loopia: A `@` → 75.2.60.5, CNAME `www` → wilsondancefactory.netlify.app). HTTPS via Let's Encrypt. Beställningsmejl via Resend, testade och fungerar.
- Gamla värden hos Loopia, om man måste backa till WordPress: A `93.188.2.51` och AAAA `2a02:250:0:8::55` på både `@` och `www`.

## Mål
- **Samma URL:er som idag**, så att vi behåller rankingen på Google. Varje sida i `INVENTERING.md` §1 finns kvar med exakt samma sökväg, med avslutande `/` (`trailingSlash: 'always'`). Oanvända WP-sidor är borttagna helt, utan omdirigeringar (beslut 5). `npm run check-urls` kontrollerar detta.
- **Allt innehåll som ändras ofta ligger i datafiler**, inte i sidkoden. Se **Ändra innehåll** nedan.
- **Anmälan** bäddas in från dans.se (org-id 372, konto `wilsondancefactory`) med deras eget skript och en `cwLoadContent`-länk ([CogWork-handledning](https://cogwork.se/handledning/integrera/webbshop/)). dans.se är ett eget system. Vi bäddar bara in det och rör aldrig dess innehåll (kurser, ledare, tider). Båda adresserna står i `site.yaml → dans_se`, och båda detaljerna nedan är nödvändiga för att filtren (?, Ålder, Kategori, Dag, Ledare, Sök) ska synas. dans.se:s "?" är ingen filtrering utan en förklaring av färgprickarna, så vi döper om knappen till "Färgförklaring" i `anmalan.astro` (Jon 2026-10-21; namnet "Tillgänglighet" fick den att se ut som ett filter):
  - Länken har `?listFormat=list`, alltså den nya kurslistan med filter.
  - Skriptet laddas från `https://dans.se/files/prod/js/lib.js`, **inte** från kortadressen `/api/init.js`. Kortadressen gör att filtren hämtas från `/api/shop_filter.js`, vars omdirigering saknar CORS, och då blockerar webbläsaren dem. Det är ett fel hos dans.se, verifierat 2026-10-20.
- **Butiken** är ett beställningsformulär, ingen kassa. Kunden får ett bekräftelsemejl, och info@wilsondancefactory.se får en kopia. Betalning sker med Swish eller i receptionen.

## Ändra innehåll
| Vad | Fil |
|---|---|
| Kontakt, öppettider, sociala medier, värdegrundscitat, Trustindex-ID | `src/data/site.yaml` |
| Priser, presentkort, prisvillkor | `src/data/priser.yaml` |
| Veckoschema och tävlingsschema (passen och grupprubrikerna) | **Google-arket**, fliken "Hemsida schema". Kunden publicerar själv via `/admin/schema/` (se **Schemat** nedan) |
| Introtexterna till schemat | `src/data/schema.yaml` |
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
netlify/functions/  # order.mjs (beställningsmejl via Resend), bestallningar.mjs och schema-admin.mjs (/admin/)
netlify/lib/        # orders.mjs (Blobs), admin.mjs (lösenord och sidmall för /admin/)
scripts/            # import-images.mjs, check-urls.mjs, test-order.mjs, test-schema.mjs
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

## Schemat (från Google Sheets, sedan 2026-10-21)
- WDF har schemat i ett eget Google-ark. Fliken **"Hemsida schema"** är publicerad som CSV (Arkiv → Dela → Publicera på webben). Adressen står i `src/lib/schema-sheet.mjs` (`SHEET_CSV_URL`). **Läs bara den fliken.** De andra flikarna (elevnoteringar, coacher med mera) innehåller personuppgifter och ska aldrig hämtas, laddas upp eller committas.
- `src/lib/schema-sheet.mjs` tolkar arket på samma sätt i bygget (`src/lib/data.ts`) och på adminsidan. Upplägget: kolumnparen A/B, D/E och G/H, där en grupprubrik är text utan något till höger, en veckodag ger en ny dag, och tid till vänster plus klass till höger ger ett pass. Raden "TÄVLINGSDANS" startar tävlingsschemat. Grupprubriker i versaler skrivs om till vanlig skiftläge, dagar blir "Måndagar" och så vidare, tider skrivs `16.00-16.30` och dubbla mellanslag tas bort. Inget annat ändras, så det som står i arket är det som syns på sajten.
- **Säkerhetsnät i bygget:** om Google inte svarar, eller om arket har fel, används schemat som redan är publicerat (`/schema.json`). Om inte heller det går att hämta används reservkopian i `schema.yaml`. Varje fallback skrivs som `[schema]`-varning i byggloggen. `SCHEMA_SOURCE=fil` hoppar över nätet.
- **`/admin/schema/`** (`netlify/functions/schema-admin.mjs`) skyddas av samma lösenord som orderlistan. Sidan visar förhandsvisningen, felen med cellreferens (till exempel "A40: tiden … saknar klass i B40") och vad som skiljer sig från sajten. Knappen **Publicera** startar ett Netlify-bygge via build hooken i `SCHEMA_BUILD_HOOK`, men bara om arket saknar fel. Google uppdaterar den publicerade CSV:n med upp till cirka 5 minuters fördröjning.
- Testerna i `npm run test-schema` använder `scripts/fixtures/hemsida-schema.csv`, fliken som den såg ut 2026-10-21.

## Formulär
- **Butik:** `/shop/` skickar till `netlify/functions/order.mjs`. Funktionen läser produkter och priser från `/butik.json` (priser från webbläsaren ignoreras), validerar, skapar ett ordernummer (`WDF-ÅÅMMDD-XXXX`) och skickar mejl till kunden och till info@. Med JavaScript sker det via `fetch`. Utan JavaScript är det en vanlig POST som skickas vidare (303) till `/tack/?order=…&summa=…`. Formuläret har ett dolt fält mot spam.
- **Varje order sparas innan mejlen skickas** (Netlify Blobs, store `orders`, `netlify/lib/orders.mjs`). Om sparandet misslyckas får kunden ett fel, aldrig en bekräftelse. Misslyckade mejl sparas som status på ordern, och tacksidan säger då ärligt att bekräftelsemejlet inte gick fram. Infört 2026-10-21, efter att en riktig hoodie-order bara fanns som mejl och mejlet till info@ fastnade i Loopias spamfilter (Resend sa "Delivered").
- **Orderlistan:** https://wilsondancefactory.se/admin/bestallningar/ (`netlify/functions/bestallningar.mjs`). Lösenordet ligger i `ADMIN_PASSWORD` och gäller för alla sidor under `/admin/` (det äldre namnet `ORDERS_PASSWORD` fungerar också). Användarnamnet kan vara vad som helst. Här ser receptionen alla beställningar med mejlstatus och matchar Swish mot ordernumret. Ordrar från före 2026-10-21 finns bara i Resends logg (resend.com/emails). På sidan finns en **Radera**-knapp per order (för tester och avbeställningar) och formuläret **"Lägg till en order manuellt"** (för ordrar från receptionen eller från tiden före listan; inga mejl skickas, och ordern visas som "Manuellt inlagd"). Kunduppgifter läggs alltså in via sidan och aldrig i koden.
- **Miljövariabler** (Netlify → Site configuration → Environment variables, aldrig i repot): `RESEND_API_KEY`, `ORDER_FROM` (`Wilson Dance Factory <order@wilsondancefactory.se>`), `ORDER_TO` (standard info@; flera adresser kommaseparerade), `ADMIN_PASSWORD` (adminsidorna), `JOBS_TO` (jobbansökningar, standard info@), `SCHEMA_BUILD_HOOK` (build hooken som Publicera på `/admin/schema/` anropar), `ORDER_DRY_RUN=1` för att bara logga. Se `.env.example`.
- **Mottagare sedan 2026-10-22:** `ORDER_TO=reception@wilsondancefactory.se` (Pauls önskan, eftersom han läser receptionens inkorg). Jobbansökningarna går fortfarande till info@. Mejl från order@ hamnade i papperskorgen eller skräpposten hos Loopia, eftersom de skickas från vår egen domän via en extern server. Därför är `order@wilsondancefactory.se` **vitlistad i Loopias antispam för både reception@ och info@** (kundzonen → E-post → adressen → Antispam). Lägg till samma vitlistning om en ny mottagare läggs till. Verifierat med en testorder: den hamnar i inkorgen.
- **E-posttjänst:** Resend, region EU (eu-west-1), domänen `wilsondancefactory.se`. Resends DNS-poster ligger på `send` och `resend._domainkey` och rör inte Loopias MX eller SPF för info@. DNS ligger hos Loopia, och Jon lägger in posterna. Se `PUBLICERING.md`.
- **Jobba hos oss** (formulär sedan 2026-10-21; Jon ändrade beslut 3): `/jobba-hos-oss/#jobba` skickar till `netlify/functions/ansokan.mjs`. Fälten är namn, e-post, telefon, ålder, erfarenhet, motivering, högst 3 bilagor på totalt 4 MB (PDF, Word eller bild) och ett obligatoriskt samtycke. Ansökan **sparas först** (Blobs, store `ansokningar`, `netlify/lib/applications.mjs`). Därefter mejlas den till `JOBS_TO` (standard info@) med bilagorna, och den sökande får ett kvitto. Tacksidan är `/tack-ansokan/`.
- **Ansökningslistan:** https://wilsondancefactory.se/admin/ansokningar/ (samma lösenord). Här finns nedladdning av bilagor och en knapp för att radera. Ansökningar **raderas automatiskt efter 6 månader** (`ansokningar-rensa.mjs` körs dagligen, och rensning sker även när listan öppnas), vilket integritetspolicyn lovar.

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
npm run test-schema    # testar schemaimporten från Google-arket och /admin/schema/
npm run test-ansokan   # testar jobbformulärets funktion och /admin/ansokningar/
npm run import-images  # plockar ut och optimerar bilder från uploads/
```

## Kvar att göra
Steg för steg för GitHub, Netlify, Resend och DNS finns i **`PUBLICERING.md`**.
1. **Google Search Console:** verifiera domänen och skicka in `https://wilsondancefactory.se/sitemap-index.xml` (Jon).
2. **WordPress-webbhotellet:** säg upp det först när den nya sajten har fungerat ett tag, och spara en backup av WP-databasen innan.
3. *(Valfritt)* **Trustindex:** skapa en widget på trustindex.io och klistra in ID:t i `site.yaml` → `trustindex_widget`. Tills dess visas en länk till Google-recensionerna. **Uppdatera då även cookieavsnittet i integritetspolicyn**, eftersom Trustindex laddar innehåll från tredje part.

Klart 2026-10-20: köpvillkoren (3 dagar för betalning, 10 arbetsdagars leverans) och integritetspolicyn är ifyllda med kundens svar (lagringstider 12/6 månader, samtycke till bilder vid anmälan, Nordea, Rosenberg & Partners Redovisningsbyrå). Google-kartan på Kontakt laddas först efter klick, så ingen cookie-banner behövs.

## Kontakt / fakta
Wilson Dance Factory, Kapplöpningsgatan 6, 252 30 Helsingborg · info@wilsondancefactory.se · 042-13 14 08 · Org.nr 559159-4873
