// Vercel serverless function — POST /api/generate
// Pitää API-avaimen palvelimella (EI koskaan selaimessa).

const WINDOW_MS = 10 * 60 * 1000; // 10 min
const MAX_PER_WINDOW = 5;          // per IP per window (kevyt suoja, ks. README rate-limit)
const hits = new Map();            // muisti nollautuu kun instanssi sammuu — tuotantoon Upstash

function rateLimited(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  if (arr.length >= MAX_PER_WINDOW) { hits.set(ip, arr); return true; }
  arr.push(now); hits.set(ip, arr); return false;
}

function buildPrompt(desc) {
  return (
    "Olet kokenut web-suunnittelija. Luo yhden tiedoston HTML-laskeutumissivu alla kuvatulle yritykselle.\n" +
    "Vaatimukset:\n" +
    "- Kaikki CSS <style>-tagissa <head>:ssä. Ei ulkoisia tiedostoja, ei JavaScriptiä, ei <img>-kuvia eikä SVG:tä (käytä CSS-värejä ja gradientteja).\n" +
    "- Moderni, siisti, ammattimainen ja täysin mobiiliystävällinen (media queryt).\n" +
    "- Rakenne: navigaatio, hero (otsikko + alaotsikko + selkeä CTA-nappi), 3 palvelua/etua korteissa, asiakaskokemus tai luottamusosio, yhteystieto-osio puhelimella ja sähköpostilla, footer.\n" +
    "- Sisältö suomeksi ja uskottavaa juuri tälle yritykselle ja toimialalle. Keksi realistiset palvelut.\n" +
    "- Palauta VAIN valmis HTML. Ei selityksiä, ei koodiblokkimerkkejä.\n\n" +
    "Yritys: " + desc
  );
}

async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") { try { return JSON.parse(req.body); } catch { return {}; } }
  return await new Promise((resolve) => {
    let d = "";
    req.on("data", (c) => (d += c));
    req.on("end", () => { try { resolve(JSON.parse(d)); } catch { resolve({}); } });
    req.on("error", () => resolve({}));
  });
}

module.exports = async (req, res) => {
  if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed" }); return; }

  const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  if (rateLimited(ip)) { res.status(429).json({ error: "Liikaa pyyntöjä. Yritä hetken kuluttua uudelleen." }); return; }

  const { prompt, email } = await readBody(req);

  if (!prompt || typeof prompt !== "string" || prompt.trim().length < 3) {
    res.status(400).json({ error: "Anna lyhyt kuvaus yrityksestäsi." }); return;
  }
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    res.status(400).json({ error: "Anna kelvollinen sähköposti." }); return;
  }
  if (prompt.length > 600) { res.status(400).json({ error: "Kuvaus on liian pitkä." }); return; }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) { res.status(500).json({ error: "Palvelinta ei ole konfiguroitu (ANTHROPIC_API_KEY puuttuu)." }); return; }

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.MODEL || "claude-haiku-4-5",
        max_tokens: 2500,
        messages: [{ role: "user", content: buildPrompt(prompt.trim()) }],
      }),
    });

    if (!r.ok) {
      const t = await r.text().catch(() => "");
      res.status(502).json({ error: "AI-virhe (" + r.status + "). Tarkista API-avain ja saldo.", detail: t.slice(0, 300) });
      return;
    }

    const data = await r.json();
    const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
    let html = text.replace(/```html/gi, "").replace(/```/g, "").trim();
    if (!html.toLowerCase().includes("<")) { res.status(502).json({ error: "Tyhjä vastaus AI:lta." }); return; }

    // Liidin talteenotto: jos LEAD_WEBHOOK_URL on asetettu (esim. Google Apps Script / Zapier / Make),
    // lähetetään sähköposti + kuvaus sinne. Ei pysäytä vastausta jos epäonnistuu.
    if (process.env.LEAD_WEBHOOK_URL) {
      fetch(process.env.LEAD_WEBHOOK_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, prompt: prompt.trim(), ip, ts: new Date().toISOString() }),
      }).catch(() => {});
    }
    console.log("LEAD", new Date().toISOString(), email, "|", prompt.trim().slice(0, 80));

    res.status(200).json({ html });
  } catch (e) {
    res.status(500).json({ error: "Palvelinvirhe.", detail: String((e && e.message) || e) });
  }
};
