# Sivustudio — oma myyntisivu

Lippulaivasivu verkkosivujen myyntiin. Toimii samalla portfoliona, todisteena ja myyntikoneena. Demogeneraattori on heti herossa: kävijä kuvaa yrityksensä → näkee demon → jättää sähköpostin = liidi.

## Tiedostot
- `index.html` — koko sivu (hero+demo, hinnasto, vertailu, paketinrakentaja, prosessi, ennen/jälkeen, referenssit, henkilö, UKK, yhteydenotto, footer)
- `api/generate.js` — AI-demogeneraattori (pitää API-avaimen palvelimella)
- `api/contact.js` — yhteydenottolomakkeen vastaanotto
- `package.json`

## Tärkeää: toimii myös ilman backendiä
Hero-demo yrittää ensin oikeaa AI:ta (`/api/generate`). Jos backendiä ei ole (esim. avaat tiedoston paikallisesti), se putoaa automaattisesti **sisäänrakennettuun mallipohjaan** — eli demo näyttää aina jotain. Tuotannossa (Vercel + avain) se käyttää oikeaa AI:ta.

## Käyttöönotto (Vercel)
1. Lataa tiedostot GitHub-repoon (säilytä `api/`-kansio).
2. platform.claude.com → luo API-avain. **API laskutetaan erikseen käytön mukaan** — lisää saldoa.
3. vercel.com → Import repo → Deploy.
4. Vercel → Settings → Environment Variables:
   - `ANTHROPIC_API_KEY` = avaimesi
   - *(valinn.)* `MODEL` = `claude-haiku-4-5` (oletus) tai `claude-sonnet-4-6` (laadukkaampi, kalliimpi)
   - *(valinn.)* `LEAD_WEBHOOK_URL` = webhook johon demot JA yhteydenotot lähetetään
   - Redeploy.
5. Lisää oma domain → valmis.

## VAIHDA NÄMÄ ennen julkaisua (etsi index.html:stä)
- **Nimi / logo:** "Sivustudio" → oma brändisi (myös <title> ja meta-description)
- **Hinnat:** 490 / 890 / 1490 € ja ylläpidot 19/39/59 €/kk (kohta `id="hinnasto"`)
- **Paketinrakentajan hinnat:** `const ADDONS` ja base-napit scriptissä
- **Henkilöosio:** `[ Kuvasi ]`, `[Etunimi Sukunimi]`, puhelin, sähköposti, some-linkit
- **Yhteystiedot kaikkialla:** `040 123 4567`, `nimi@sivustudio.fi`, `wa.me/358401234567`
- **Referenssit:** korvaa esimerkit omilla töillä (kuvat + tekstit)
- **Y-tunnus** footerissa
- **Varaa puheluaika -linkki:** lisää Calendly-osoitteesi
- **Some-linkit:** Instagram / TikTok / LinkedIn

## Liidit
Demot ja yhteydenotot lokitetaan Verceliin. Aseta `LEAD_WEBHOOK_URL` (esim. Google Apps Script → Google Sheet) niin saat ne suoraan taulukkoon/sähköpostiin. Tämä on tärkein kohta — jokainen liidi on rahaa.

## Pakolliset (GDPR)
Sivu kerää lomakkeella henkilötietoja, joten tee oikea **tietosuojaseloste** ja **evästeilmoitus** ja linkitä ne footeriin (paikkamerkit valmiina).
