# Inventering – wilsondancefactory.se (WordPress/Elementor)

Genomgång gjord 2026-10-19 mot live-sajten. Underlag för ombyggnaden till Astro + Netlify.
**Status: godkänd av Jon 2026-10-19. Beslut i §6.**

---

## 1. Sidor och URL:er

Källa: `wp-sitemap.xml`, WP REST API och huvudmenyn.

### Sidor som ska finnas kvar (med samma URL)

| URL | Titel / H1 | I menyn | Innehåll i korthet |
|---|---|---|---|
| `/` | Välkommen till oss på Wilson Dance Factory i Helsingborg | (logga) | Hero med video, intro, "Skånes största dansskola", 4 populära dansstilar, 3 puffar (dansstilar/instruktörer/jobba), puff till Aktuellt, hitta hit + faciliteter |
| `/dansa-med-oss/` | Dansa med oss på Wilson Dance Factory! | Ja (förälder) | 3 puffar, vision, länk till bilder, sociala medier, bildspel (4 headerbilder) |
| `/dansstilar/` | Våra dansstilar | Under "Dansa med oss" | 13 dansstilar med bild, text och knappen "Boka kurs" (→ `/anmalan/`) |
| `/instruktorer/` | Våra instruktörer | Under "Dansa med oss" | 20 personer: kort med bild, roll, utdrag och dansstilar. 11 har en popup med hela biografin |
| `/jobba-hos-oss/` | Jobba hos oss | Under "Dansa med oss" | Text + ansökningsformulär idag. Formuläret ersätts av en mejlknapp (beslut 3) |
| `/tavlingsdans/` | Tävlingsverksamhet på Wilson Dance Factory | Ja | Lång informationstext, info om privatlektioner, bildspel, sociala medier |
| `/schema/` | Schema | Ja | Terminsinfo, veckoschema (7 grupper) + tävlingsschema (3 grupper). **Handskrivet**, inte från dans.se |
| `/anmalan/` | Anmälan | Ja | **dans.se-kurslista** (~150 kurser i kategorier) + bokningsvillkor (8 rubriker) |
| `/priser/` | Prislista | Ja | 9 kurspriser, 4 presentkort, länk till butiken, villkor (sjukdom, avbrott, ångerrätt …) |
| `/om-oss/` | Om oss på Wilson Dance Factory | Ja | Om skolan, målsättning, värdegrund (citat av Paul Wilson), Google-recensioner (Trustindex) |
| `/gallerifoo/` | Galleri | Ja ("Galleri") | FooGallery med 28 foton (2026/04/DSC…) |
| `/kontakt/` | Kontakta oss | Ja | Kontaktuppgifter, sociala medier, inbäddad Google Maps-karta, Google-recensioner |
| `/shop/` | Välkommen till Wilsons webbshop | Ja ("Butik") | Produktgalleri (7 produkter) + **beställningsformulär** (se §3.2) |
| `/tack/` | Tack för din beställning! | Nej | Sidan man kommer till efter en beställning: betalinfo, Swish 123-453 16 04, Swish-logga |
| `/aktuellt/` | Aktuellt | Nej (länkas från startsidan) | Nyhetslista (1 inlägg) + ankaret `#bilder` med 11 miljöbilder |
| `/kopvillkor/` | Köpvillkor | Nej | Fullständig villkorstext för butiken |
| `/integritetspolicy/` | Integritetspolicy | Nej | **Tom sida** (bara rubriken), men köpvillkoren hänvisar hit |

### Sidor som tas bort (beslut 5: tas bort helt, utan omdirigering)

| URL | Vad den är |
|---|---|
| `/varukorg/` | Tom WooCommerce-varukorg |
| `/underombyggnad/` | "Butiken är stängd …". Stängt-meddelandet blir i stället en inställning i butikens datafil |
| `/bildgalleri/` | Tom sida (gammalt galleri) |
| `/login-designer/`, `/password-protected/` | WP-inloggning |
| `/category/uncategorized/` | WP-kategori |
| `/test/` | Inlägget "Sommartermin" (bara en bild) |
| `/nyheter/` | Dubblett av nyhetslistan, länkas inte från något ställe |
| `/wp-sitemap.xml` m.fl. | WP:s sajtkarta, ersätts av Astros `sitemap-index.xml` |

### Global layout (alla sidor)
- **Header:** logga, e-post, telefon, Facebook, Instagram, knappen "Butik". Headern ändrar stil när man scrollat mer än 1000 px.
- **Meny:** Dansa med oss (▸ Våra dansstilar, Våra instruktörer, Jobba hos oss?), Tävlingsdans, Schema, Anmälan, Priser, Om oss, Galleri, Kontakt.
- **Footer:** värdegrundscitatet, kontaktuppgifter, sociala medier, öppettider, länken "Vår butik".
- **Favicon:** `2022/12/cropped-WDF_Favicon.png`.

---

## 2. Innehåll som ska ligga i datafiler

### 2.1 Kontakt och företag (`site`)
- E-post: info@wilsondancefactory.se · Telefon: 042-13 14 08 (begränsad telefontid i juni, juli och december)
- Adress: Kapplöpningsgatan 6, 252 30 Helsingborg · Org.nr: 559159-4873 · Swish: 123 453 16 04
- Facebook: facebook.com/wilsondancefactoryhelsingborg · Instagram: instagram.com/wilsondancefactory
- Google Maps-länk + plats-id för recensioner

### 2.2 Öppettider
Mån–tors 15:30–21:00 · Fredag: endast bokningar · Lördag 09:30–13:00 · Söndag 09:30–20:00

### 2.3 Instruktörer (20 st)
Fält: namn, roll, bild, kort utdrag, dansstilar, fullständig biografi, meriter (lista), `visa_las_mer`.

| Namn | Roll | Bild 2026 | Full bio |
|---|---|---|---|
| Paul Wilson | Ägare / Grundare / Instruktör | ✔ | ✔ |
| Linnéa Lindé | Studio Manager / Instruktör | ✔ | ✔ |
| Peter Kjärsgård Petersson | Instruktör | ✔ | ✔ |
| Elin Sandberg | Instruktör | ✔ | ✔ |
| Majken Gandsjö Gullstrand | Instruktör | ✔ | "Mer info snart" |
| Maja Andréasson | Instruktör | ✔ | "Mer info snart" |
| Johan Trulsson | Instruktör | ✔ | "Mer info snart" |
| Pelle Karlsson | Instruktör | ✔ | ✔ |
| Alvin Sandberg | Instruktör/Assistent | ✔ | "Mer info snart" |
| Joel Löfqvist | Instruktör | ✔ | ✔ |
| Filippa Jonasdotter | Instruktör | ✔ | "Mer info snart" |
| Sigge Lindé-Persson | Instruktör | ✘ (WooCommerce-platshållare) | "Mer info snart" |
| Alva Ehnberg | Instruktör | ✔ | ✔ |
| Ida Bäck | Assistent | ✔ | "Läs mer"-knapp, men ingen bio hittades |
| Mats Håkansson | Instruktör | ✔ | ✔ |
| Aleksandra Zajk | Instruktör | ✔ | ✔ (på engelska) |
| Elvira Borg | Instruktör | ✘ (platshållare) | "Mer info snart" |
| Isolde Svensson | Instruktör/Assistent | ✔ | Tom popup |
| Elli Ehrenstråle | Assistent | ✔ | "Mer info snart" |
| Tindra Palmér | Instruktör | ✘ (platshållare) | ✔ |

### 2.4 Dansstilar
13 st på `/dansstilar/`, med bild och text: Barndans 2–3 år, Dansmix 4–5 år, Dansmix 6 år, Balett, TikTok dans, Boys Only, Show, Breakdance, Disco, HipHop, Jazz & Modernt, Commercial HipHop, Bugg (Bugg saknar både text och bild).
Startsidan visar 4 "populära": Disco, Balett, Tik Tok, **Yoga** (Yoga finns inte på dansstilssidan).
Fält: namn, slug, bild, kort text, lång text, `popular`, `anmalan_kategori`.

### 2.5 Priser
- **Kurser:** Dansmix 2–3 år 1450 · Dans 4–6 år från 1450 · 7–9 år från 1500 · 10–13 år från 1560 · Ungdom 14+ från 1720 · Vuxna från 1700 · 10-klippkort vuxen (6 mån) från 1300 · 15-klippkort vuxen (12 mån) från 1950 · Terminskort 8450 (kr/termin; 12 eller 14 veckor)
- **Presentkort:** Large 1000 · Medium 750 · Small 500 · Valfri summa (står "??? kr" idag)
- **Villkor:** sjukdom/skada/flytt, avbryta kurs, workshop/event, ångerrätt, anmälan, ändringar, presentkort. Samma villkor finns, i något annan form, på `/anmalan/` under "Bokningsvillkor".

### 2.6 Schema och termin
- Termin: HT 2026, terminsstart v. 34, höstlov v. 44, terminsslut v. 49. Anmälan öppnar 1/7 kl. 10. Prova på gratis första veckan.
- Veckoschema: Barndans 2–5, Dans 6 år, 7–9 år, 10–13 år, 14+ & vuxna, Pardans/Bugg/Salsa/Bachata, Breakdance. Fält per pass: dag, tid, klass.
- Tävlingsschema (v. 34–50): Hip Hop, Disco, Performing Arts.

### 2.7 Aktuellt / nyheter
1 inlägg ("Sommartermin", 2026-04-14, URL `/test/`, bara en bild). Blir en Astro content collection i Markdown, ett inlägg per fil.

### 2.8 Butik (produkter)
| # | Produkt | Pris | Bild |
|---|---|---|---|
| 1 | Junior Hoodie svart med zip | 600 kr | 2026/02/2.-Junior-Hoodie… |
| 2 | Vuxen Hoodie svart med zip | 650 kr | 2026/02/2.-Vuxen-Hoodie… |
| 3 | Vuxen T-shirt svart | 280 kr | 2026/02/3.-Vuxen-T-shirt… |
| 4 | Junior T-shirt svart | 280 kr | 2026/02/4.-Junior-T-shirt… |
| 5 | Tot bag svart | 180 kr | 2026/02/6.-Totebag… |
| 6 | Svart sportbag | 460 kr | 2026/02/7.-Sportbag… |
| 7 | Vattenflaska | 100 kr | 2026/02/vattenflaska.png |

Storlekar: Vuxen XS–XL, Junior 90-100 / 110-120 / 130-140 / 150-160. Alla produkter levereras med namntryck (max 12 tecken).
Butiken stängs ibland ("sommaruppehåll 15/6–1/8", sidan `/underombyggnad/`). Det blir en inställning: `butik_oppen` + meddelande.

### 2.9 Recensioner
Trustindex-widget med Google-recensioner på `/om-oss/` och `/kontakt/` (betyg 4,8 av 5, 21 recensioner).

---

## 3. Funktioner

### 3.1 Anmälan via dans.se
- **Beslut:** dans.se är ett eget system som vi bara bäddar in. Vi rör inte dess innehåll (kurser, ledare, tider) och jämför det inte med sajtens övriga uppgifter.
- Konto `wilsondancefactory`, org-id 372. Idag bäddas den in via en WordPress-plugin. På den nya sajten använder vi dans.se:s inbäddning för webbläsaren, eller länkar till dans.se om en sådan inte finns.
- Bokningsvillkoren på `/anmalan/` är sajtens egen text och flyttas med.

### 3.2 Beställningsformulär i butiken (Ninja Forms idag)
Fält: För- och efternamn*, E-post*, Produkt* (flerval), Storlek (flerval), Namntryck* (max 12 tecken, begränsat med eget script), Övrig info, dolt fält mot spam.
Efter skickat formulär → `/tack/` (Swish-instruktion). Köpvillkoren säger att kunden får en orderbekräftelse och ska ange **ordernummer** i Swish-meddelandet. Idag skapas troligen inget ordernummer, så det bör vi lägga till.
**Krav:** bekräftelsemejl till kunden och till info@. Netlify Forms skickar bara notiser till sajtens ägare, så mejlet till kunden kräver en Netlify Function och en e-posttjänst. Se öppen fråga 2.

### 3.3 Ansökningsformulär (Jobba hos oss, Elementor-formulär idag)
Fält: Namn*, E-post*, Adress*, Telefon* (sifferfält), Tidigare erfarenhet* (val), Dansstil* (val, 22 alternativ), Meddelande.
Nämndes inte i uppdraget men finns idag. Förslag: Netlify Forms med notis till info@.

### 3.4 Övrigt
- Google Maps-karta (iframe) på `/kontakt/` och länkar till vägbeskrivning
- Trustindex-recensioner (extern JS)
- Popups med instruktörsbiografier, ersätts med `<dialog>` eller expanderbara kort
- Lightbox-gallerier (FooGallery och Elementor-bildspel)
- Bakgrundsvideo på startsidan (`2026/04/Strike-a-4.mp4`, **53 MB**, måste komprimeras eller kortas)
- Ingen cookie-banner hittades. Köpvillkoren nämner ändå cookies. Om Trustindex eller Google Maps sätter cookies behöver vi kanske en banner (öppen fråga 6).

---

## 4. Bilder som faktiskt används (från `/uploads`)

~100 originalfiler används, av ~1060 mediefiler (199 MB) i exporten. Alla nedan finns i `/uploads`.

| Grupp | Filer | Används på |
|---|---|---|
| Logga + favicon | `2022/12/WDF_Logotype_Free.png`, `2022/12/cropped-WDF_Favicon.png` | Alla sidor |
| Headerbilder | `2022/12/WDF_Header_1–4.jpg` | Dansa med oss, Tävlingsdans, Priser |
| Dansstilar | `2023/02/Wilson_Dance_Factory_*.jpg` (13 st inkl. Yoga) | Start, Dansstilar |
| Instruktörer (nya) | `2026/04/*_ny.png` (17 st) | Instruktörer |
| Instruktörer (gamla) | `2023/03/*_Wilson_Dance_Factory.jpg` (10 st) | Ligger kvar i dolda popups. Behövs nog inte |
| Paul Wilson | `2023/03/Paul_Wilson_Wilson_Dance_Factory.jpg` | Om oss |
| Miljöbilder | `2023/04/Wilson_Dance_Factory_Miljobild_1–11.jpg` | Aktuellt (#bilder), Om oss, Instruktörer |
| Galleri | `2026/04/DSC*-scaled-2.jpg` (28 st, ~67 MB inkl. video) | Galleri |
| Butik | `2026/02/*.png` (7 st) | Butik |
| Swish | `2023/04/Swish_Logo_Secondary_Dark-BG_P3.png` | Tack |
| Nyhet | `2026/04/WILSON-DANCE-FACTORY-SAL-1-6.png` | /test/ |
| Video | `2026/04/Strike-a-4.mp4` | Start |

Övrigt i `/uploads` (WP-cache, `wc-logs`, `wp-file-manager-pro`, `.htaccess`, `.php`, `.mmdb`, storleksvarianter som `-300x200`) används inte. Det får **aldrig** hamna i repot.

---

## 5. Inkonsekvenser och fel på nuvarande sajt (bra att rätta i samband med flytten)

1. **Lokaler:** Startsidan säger både "över 800 kvm" och "900 kvm" samt "4 stora salar + 1 liten". Om oss säger "900 kvm, 3 stora + 2 mindre".
2. **Antal instruktörer:** texten säger 21, men 20 visas.
3. **Instruktörers dansstilar** skiljer sig mellan kort och popup (Elin, Alva, Aleksandra). Aleksandra heter "Zank" i popupen.
4. **Dansstilar:** listan i jobbformuläret (22 st), schemat (Dancehall, Salsa/Bachata, Performing Arts, Tåspets …) och dansstilssidan (13) stämmer inte överens. Yoga visas som "populär" men finns inte.
5. **Schema:** rubriken "Hösttermin 2026" står bredvid texten "det synliga schemat är vårterminens".
6. **Kontakt:** e-postlänken är trasig (`http://mailto;info@…`).
7. **Priser:** presentkort "Valfri summa ??? kr".
8. **Köpvillkor:** platshållare kvar ("[t.ex. 3 dagar]", "[t.ex. 2–4 veckor]").
9. **Integritetspolicy:** tom sida.
10. **Nyhetsinlägget** ligger på URL:en `/test/` och innehåller bara en bild.
11. **Recension** från "Joanna Törnros" ser ut som spam/test ("Hej vännen is a great place to work for…").
12. **Tävlingsdans** länkar till `/aktuellt/#bilder` och `/schema/#tavlingsschema`. Ankarna måste finnas kvar.
13. Infomötet "18 januari, tid meddelas senare" är troligen inaktuellt.

---

## 6. Beslut (Jon, 2026-10-19)

1. **dans.se:** bäddas bara in, och vi rör inte dess innehåll. `/schema/` fortsätter att vara sajtens eget schema, i en datafil.
2. **E-post från butiken:** Jon har tillgång till DNS hos Loopia. Förslag: **Resend** (gratis upp till 3 000 mejl per månad, enkelt API). Mejlen skickas från en egen subdomän, t.ex. `send.wilsondancefactory.se`, så att SPF och DKIM inte krockar med info@-mejlen hos Loopia. Jon lägger in DNS-posterna hos Loopia när vi kommer dit.
3. **Jobbformuläret:** tas bort. Sidan `/jobba-hos-oss/` blir kvar med text och en tydlig knapp för att mejla till info@ (`mailto:` med färdig ämnesrad). Ingen server och inget formulär behövs.
4. **Inkonsekvenserna i §5:** faktainnehållet flyttas med **som det är**. Vi ändrar inte kvm, instruktörer eller dansstilar. Rent tekniska fel rättas, t.ex. den trasiga e-postlänken (§5.6) och instruktörsbilder som saknas (då visas logga eller initialer i stället för WooCommerce-platshållaren).
5. **Oanvända sidor tas bort helt**, utan omdirigeringar: `/varukorg/`, `/underombyggnad/`, `/bildgalleri/`, `/login-designer/`, `/password-protected/`, `/category/uncategorized/`, `/test/` och `/nyheter/` (som inte länkas från något ställe). `/aktuellt/` blir kvar, men nyhetslistan är tom tills ett nytt inlägg läggs till.
6. **Trustindex behålls.** Det laddas bara på `/om-oss/` och `/kontakt/`.
7. **Designen fräschas upp:** ett nytt utseende som presenteras som något nytt, med skillen `design-taste-frontend`. Struktur, URL:er och innehåll är desamma som idag.
8. **Integritetspolicy:** utkast skrivet i `src/texter/integritetspolicy.md`. Det väntar på Jons granskning.
