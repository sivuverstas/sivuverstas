// Vercel serverless function — POST /api/contact
// Vastaanottaa yhteydenottolomakkeen ja välittää sen sinulle.

module.exports = async (req, res) => {
  if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed" }); return; }

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  if (!body || typeof body !== "object") {
    body = await new Promise((resolve) => {
      let d = ""; req.on("data", (c) => (d += c));
      req.on("end", () => { try { resolve(JSON.parse(d)); } catch { resolve({}); } });
      req.on("error", () => resolve({}));
    });
  }

  const { name, email, phone, pkg, message } = body;
  if (!name || !email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !message) {
    res.status(400).json({ error: "Täytä nimi, kelvollinen sähköposti ja viesti." });
    return;
  }

  const lead = {
    type: "contact",
    name: String(name).slice(0, 120),
    email: String(email).slice(0, 160),
    phone: String(phone || "").slice(0, 60),
    pkg: String(pkg || "").slice(0, 120),
    message: String(message).slice(0, 4000),
    ip: (req.headers["x-forwarded-for"] || "").split(",")[0].trim(),
    ts: new Date().toISOString(),
  };

  // Välitä webhookiin (Google Apps Script / Zapier / Make) jos asetettu.
  if (process.env.LEAD_WEBHOOK_URL) {
    try {
      await fetch(process.env.LEAD_WEBHOOK_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(lead),
      });
    } catch (e) { /* ei pysäytetä vastausta */ }
  }

  console.log("CONTACT", lead.ts, lead.email, lead.pkg, "|", lead.message.slice(0, 80));
  res.status(200).json({ ok: true });
};
