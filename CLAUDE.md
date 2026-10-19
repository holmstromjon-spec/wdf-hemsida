# Wilson Dance Factory – hemsida

Ny version av https://wilsondancefactory.se. Den gamla sajten är byggd i WordPress/Elementor. Den nya är en statisk sajt byggd med **Astro 7** och hostas på **Netlify**.

## Status
- [x] Inventering av nuvarande sajt: se `INVENTERING.md` (godkänd av Jon 2026-10-19, beslut i §6)
- [x] Sajten är byggd: alla 17 sidor, datafiler, bilder, butik och beställningsfunktion
- [ ] Kvar före lansering: se **Kvar att göra** längst ned

## Mål
- **Samma URL:er som idag**, så att vi behåller rankingen på Google. Varje sida i `INVENTERING.md` §1 finns kvar med exakt samma sökväg, med avslutande `/` (`trailingSlash: 'always'`). Oanvända WP-sidor är borttagna helt, utan omdirigeringar (beslut 5). `npm run check-urls` kontrollerar detta.
- **Allt innehåll som ändras ofta ligger i datafiler**, inte i sidkoden. Se **Ändra innehåll** nedan.
- **Anmälan** bäddas in från dans.se (org-id 372, konto `wilsondancefactory`) med deras eget skript `dans.se/api/init.js` och en `cwLoadContent`-länk ([CogWork-handledning](https://cogwork.se/handledning/integrera/webbshop/)). dans.se är ett eget system. Vi bäddar bara in det och rör aldrig dess innehåll (kurser, ledare, tider).
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
  styles/global.css # tokens, typografi, knappar, rörelse
public/fonts/       # Panchang + Switzer (Fontshare, self-hostade)
netlify/functions/  # order.mjs – beställningsmejl via Resend
scripts/            # import-images.mjs, check-urls.mjs, test-order.mjs
uploads/            # rå WordPress-export – ENDAST källa, ignoreras av Git
```

## Bilder
- `uploads/` är en rå WordPress-export (cirka 1 270 filer, inklusive cache, loggar, `.php` och `.htaccess`). **Den ska aldrig committas** och står i `.gitignore`.
- `npm run import-images` plockar ut de bilder som används (listan finns i skriptet), skalar ner till högst 2000 px och skriver till `src/assets/images/<grupp>/`. Utgå alltid från originalet, aldrig från WP:s storleksvarianter.
- Astros `<Image>` genererar WebP och responsiva storlekar när sajten byggs. Varje bild har en meningsfull `alt`-text.
- Instruktörer utan foto (Sigge, Elvira, Tindra) visar loggan på röd botten. Lägg till `bild:` i deras `.md` när foton finns.
- Videon på startsidan (`2026/04/Strike-a-4.mp4`, 53 MB) används inte än: den behöver komprimeras (ffmpeg finns inte på datorn).

## Design
- Riktningen kommer från skillen `design-taste-frontend` (taste-skill, MIT, i `.claude/skills/`): **"Loud and flat"**, platta paneler i loggans röda (`#D60008`), svart och vitt. Panchang 700 (versaler) används för rubriker och Switzer för text. Riktningen sparas i `.taste-skill/direction.json` (committas inte).
- Idén: veckans riktiga schema blir affischens line-up. Det levande inslaget är **"Hitta din klass"** på startsidan (`ClassFinder.astro`): man väljer ålder och ser passen. Det fungerar utan JavaScript.
- Panchang tar cirka 1 em per versal. Rubriker skalas därför efter sin behållare (`.head` med `--w` = antal tecken i längsta ordet). Rader skrivs ut manuellt, och rubriker hålls till högst två rader.
- Kontrollera med `node .claude/skills/design-taste-frontend/scripts/inspect.mjs http://localhost:4321/<sida>/` (kräver att `npm run dev` körs). Alla innehållssidor ger 0 FAIL. Kvarvarande FAIL gäller `/kopvillkor/`, `/integritetspolicy/` och `/tack/` (för få bilder eller för lite rörelse), och är ett medvetet val för text- och kvittosidor.
- Använd WDF:s **egna** bilder i första hand. Bilder från öppna arkiv används bara efter godkännande. Reglerna i den här filen gäller före skillens regler, och faktainnehåll ändras aldrig av designskäl.

## Formulär
- **Butik:** `/shop/` skickar till `netlify/functions/order.mjs`. Funktionen läser produkter och priser från `/butik.json` (priser från webbläsaren ignoreras), validerar, skapar ett ordernummer (`WDF-ÅÅMMDD-XXXX`) och skickar mejl till kunden och till info@. Med JavaScript sker det via `fetch`. Utan JavaScript är det en vanlig POST som skickas vidare (303) till `/tack/?order=…&summa=…`. Formuläret har ett dolt fält mot spam.
- **Miljövariabler** (Netlify → Site configuration → Environment variables, aldrig i repot): `RESEND_API_KEY`, `ORDER_FROM` (t.ex. `Wilson Dance Factory <order@send.wilsondancefactory.se>`), `ORDER_TO` (standard info@), `ORDER_DRY_RUN=1` för att bara logga. Se `.env.example`.
- **E-posttjänst:** Resend, som skickar från subdomänen `send.wilsondancefactory.se`. DNS ligger hos Loopia, och Jon lägger in posterna.
- **Jobba hos oss:** inget formulär. En mejlknapp (`mailto:` med färdigt ämne och mall) räcker (beslut 3).

## Arbetssätt
- Allt innehåll på sajten är på **svenska**. Kod, variabelnamn och commit-meddelanden får vara på engelska.
- Ändra inte faktainnehåll (priser, tider, namn, villkor, kvm, dansstilar). Innehållet flyttas med som det är, även där det motsäger sig självt (beslut 4). Bara rent tekniska fel rättas, som trasiga länkar och bilder som saknas.
- Långa rubriker från gamla sajten har kortats till ett par ord i Panchang. Hela den ursprungliga meningen står kvar i ingressen direkt under.
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
1. **Resend:** skapa konto, verifiera `send.wilsondancefactory.se` (DNS-poster hos Loopia) och lägg in miljövariablerna i Netlify. Testa en riktig beställning.
2. **Trustindex:** skapa en widget på trustindex.io och klistra in ID:t i `site.yaml` → `trustindex_widget`. Tills dess visas en länk till Google-recensionerna.
3. **Integritetspolicyn** (`src/texter/integritetspolicy.md`) är ett utkast med `[platshållare]`. Den ska granskas innan lansering. Köpvillkoren har också platshållare från gamla sajten ("[t.ex. 3 dagar]").
4. **Cookies:** Google Maps (Kontakt) och Trustindex kan sätta cookies från tredje part. Avgör om vi behöver en banner, eller om kartan ska laddas först efter ett klick.
5. **Video** på startsidan: komprimera `Strike-a-4.mp4` (eller hoppa över den).
6. **Netlify:** koppla repot, peka domänen och kontrollera `sitemap-index.xml` i Google Search Console.

## Kontakt / fakta
Wilson Dance Factory, Kapplöpningsgatan 6, 252 30 Helsingborg · info@wilsondancefactory.se · 042-13 14 08 · Org.nr 559159-4873
