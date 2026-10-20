# Publicering – steg för steg

> ✅ **Lanserad 2026-10-20.** Steg 1–5 är klara. Kvar: steg 6.2 (Search Console) och 6.3 (säga upp WordPress). Erfarenheter: Loopia publicerade DNS-ändringar efter 30–45 minuter, och ns1 låg efter ns2. Loopia tillåter bara en A-post per namn, så den gamla måste tas bort först. HTTPS-certifikatet kom inom några minuter efter att DNS hade slagit om.

Ordningen är vald så att den gamla WordPress-sajten och e-posten fungerar hela tiden. Domänen flyttas först i steg 5, när allt är testat på en tillfällig Netlify-adress.

**Vem gör vad:** ✋ = Jon (kräver inloggning eller beslut) · 🤖 = Claude

---

## 1. GitHub-repo
1. ✋ Gå till <https://github.com/new>
   - **Repository name:** `wdf-hemsida`
   - **Private** (viktigt: villkor, data och kod behöver inte vara publika)
   - Kryssa **inte** i README, .gitignore eller licens (repot ska vara tomt)
2. ✋ Skicka repo-adressen till Claude, t.ex. `https://github.com/<konto>/wdf-hemsida`.
3. 🤖 Claude lägger till den som `origin` och pushar `main`. Första gången öppnar Git en inloggningsruta (Git Credential Manager), där du loggar in på GitHub.

## 2. Netlify
1. ✋ Logga in på <https://app.netlify.com> → **Add new project → Import an existing project → GitHub** → välj `wdf-hemsida`.
2. Inställningarna läses från `netlify.toml`, så rör ingenting:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Functions: `netlify/functions`
3. ✋ Klicka **Deploy**. Efter några minuter finns sajten på en adress som `något-namn.netlify.app`.
4. ✋ **Project configuration → Environment variables**, lägg till:

   | Nyckel | Värde |
   |---|---|
   | `ORDER_FROM` | `Wilson Dance Factory <order@wilsondancefactory.se>` |
   | `ORDER_TO` | `info@wilsondancefactory.se` |
   | `ORDER_DRY_RUN` | `1` (tills Resend är klart i steg 3, sedan tas den bort) |
   | `RESEND_API_KEY` | läggs till i steg 3 |

   Gör en ny deploy efter ändringar (**Deploys → Trigger deploy**).

## 3. Resend (mejl från butiken)
1. ✋ Skapa konto på <https://resend.com> (gratis upp till 3 000 mejl/månad).
2. ✋ **Domains → Add domain** → `wilsondancefactory.se`, **region: Ireland (eu-west-1)** (EU, bättre för GDPR).
3. ✅ **Klart 2026-10-20.** De här posterna ligger hos Loopia och är verifierade av Resend (kopiera alltid värden med Resends kopieringsknapp, eftersom skärmen visar dem avkortade):

   | Typ | Subdomän | Värde |
   |---|---|---|
   | TXT | `resend._domainkey` | `p=MIGfMA0…kS2sklQIDAQAB` (216 tecken efter `p=`) |
   | CNAME | `rsend` | `rsend-euw1.forge.rmta.net.` |
   | CNAME | `send` | `send.forge.rmta.net.` |
   | TXT | `_dmarc` | `v=DMARC1; p=none;` |

   Posterna ligger på underdomäner och **ändrar inte** MX eller SPF för `wilsondancefactory.se`, så info@-mejlen hos Loopia påverkas inte. Loopia publicerade dem gradvis, och det tog cirka 30 minuter.
4. ✋ När domänen är verifierad: **API Keys → Create API key** (behörighet: *Sending access*, domän: wilsondancefactory.se). Kopiera nyckeln direkt, eftersom den bara visas en gång.
5. ✋ Lägg in nyckeln som `RESEND_API_KEY` i Netlify, **ta bort** `ORDER_DRY_RUN` och gör en ny deploy.
6. ✋ Testa: lägg en beställning på `…netlify.app/shop/` med din egen e-post. Du ska få en orderbekräftelse, och info@ ska få en kopia. Svara på kundmejlet för att kontrollera att svaret går till info@.

## 4. DNS hos Loopia – Resend-posterna (kan göras direkt, stör ingenting)
1. ✋ Logga in på Loopia Customer Zone → **Domäner** → `wilsondancefactory.se` → **DNS-editor**.
2. ✋ Lägg till posterna från steg 3. Hos Loopia skapar du först **underdomänen** (t.ex. `send` och `resend._domainkey`) och lägger sedan till posten på den. Skriv bara underdomänen, inte hela `send.wilsondancefactory.se`.
3. ✋ Finns det ingen `_dmarc`-post sedan tidigare? Lägg då till en TXT-post på underdomänen `_dmarc` med värdet `v=DMARC1; p=none;` (det ger bättre leverans och påverkar ingenting annat).
4. ✋ Tillbaka i Resend: **Verify DNS records**. Det tar oftast några minuter, ibland några timmar.

## 5. Flytta domänen till Netlify (när allt är testat)
> Gör detta en vardag när du har tid att kontrollera. **Ändra inte MX-posterna**, så fortsätter e-posten att fungera som vanligt.

1. ✋ Netlify → **Domain management → Add a domain** → `wilsondancefactory.se`. Välj att behålla DNS hos Loopia (**external DNS**, inte "Netlify DNS").
2. ✋ Hos Loopia, ändra **bara** dessa två (notera de gamla värdena först, om du skulle behöva backa):

   | Typ | Namn | Nytt värde |
   |---|---|---|
   | A | `@` (huvuddomänen) | `75.2.60.5` |
   | CNAME | `www` | `<ditt-namn>.netlify.app` |

   Ta bort eventuella **andra** A- eller AAAA-poster på `@` och `www` som pekar på det gamla webbhotellet. MX- och TXT-posterna lämnar du orörda.
3. ✋ Vänta, det kan ta upp till ett dygn. Netlify skapar ett HTTPS-certifikat automatiskt. Kontrollera under **Domain management → HTTPS**.
4. ✋ Ställ in **wilsondancefactory.se** (utan www) som *primary domain* i Netlify. Det är den adress Google har indexerat i dag.

## 6. Efter lansering
1. 🤖 `npm run check-urls` mot live-sajten och stickprov på alla 17 sidor.
2. ✋ Google Search Console → lägg till eller verifiera `wilsondancefactory.se` → **Sitemaps** → skicka in `https://wilsondancefactory.se/sitemap-index.xml`.
3. ✋ Säg upp WordPress-webbhotellet först när den nya sajten har fungerat en tid (spara gärna en backup av WP-databasen).

## Kvar innan lansering (från CLAUDE.md)
- [ ] Granska integritetspolicyn (`src/texter/integritetspolicy.md`, platshållare i [hakparentes])
- [ ] Platshållarna i köpvillkoren ("[t.ex. 3 dagar]", "[t.ex. 2–4 veckor]")
- [ ] Trustindex-widget-ID i `src/data/site.yaml` (valfritt, annars visas en länk till Google)
- [ ] Beslut om cookie-banner för Google Maps och Trustindex
