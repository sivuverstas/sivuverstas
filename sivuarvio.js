/* =============================================================
   Sivuverstas – Ilmainen sivuarvio (liidimagneetti, etupää)
   -------------------------------------------------------------
   Käsittelee #sivuarvio-osion lomakkeen: lähettää URL:n analyysiin
   (review-worker.js), näyttää pisteytetyn raportin ja tallentaa
   liidin (sähköposti) Jerelle.
   ============================================================= */
(function () {
  "use strict";

  const CONFIG = {
    // Aseta tähän sivuarvion Workerin osoite (ks. LUE-MINUT-sivuarvio.md), esim.
    //   "https://sivuverstas-sivuarvio.kayttaja.workers.dev"
    // Jätä tyhjäksi -> käytetään selaimen demo-arviota (rajoitettu).
    reviewApiUrl: "https://sivuverstas-sivuarvio.sivuverstas.workers.dev",
    // Liidin tallennus: sama Formspree kuin yhteyslomakkeella.
    leadEndpoint: "https://formspree.io/f/meewnelg",
    accent: "#1F4BFF",
  };

  function $(id) { return document.getElementById(id); }
  function validEmail(e) { return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e); }

  function injectStyles() {
    const css = `
    #sivuarvio .sa-form{display:flex;flex-direction:column;gap:12px}
    #sivuarvio .sa-row{display:flex;gap:10px;flex-wrap:wrap}
    #sivuarvio .sa-row .email{flex:1;min-width:220px;margin:0}
    #sivuarvio .sa-status{font-size:14px;color:var(--muted);min-height:20px;display:flex;align-items:center;gap:10px}
    #sivuarvio .sa-err{color:#C2410C;font-size:14px}
    .sa-result{margin-top:22px;display:none}
    .sa-top{display:flex;gap:22px;align-items:center;flex-wrap:wrap;background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:22px}
    .sa-ring{--p:0;width:104px;height:104px;border-radius:50%;flex:none;
      background:conic-gradient(var(--ringcol) calc(var(--p)*1%),var(--line) 0);
      display:flex;align-items:center;justify-content:center;position:relative}
    .sa-ring::after{content:"";position:absolute;inset:9px;background:var(--surface);border-radius:50%}
    .sa-ring b{position:relative;z-index:1;font-family:'Bricolage Grotesque';font-weight:800;font-size:30px;line-height:1}
    .sa-ring small{position:relative;z-index:1;font-size:11px;color:var(--muted)}
    .sa-grade h3{font-family:'Bricolage Grotesque';font-weight:800;font-size:22px;margin:0 0 4px}
    .sa-grade p{margin:0;color:var(--muted);font-size:14px;max-width:420px}
    .sa-cats{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:18px}
    .sa-cat{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:18px}
    .sa-cat h4{font-size:14px;margin:0 0 12px;font-weight:700}
    .sa-item{display:flex;gap:9px;align-items:flex-start;font-size:13.5px;padding:6px 0;color:var(--ink)}
    .sa-item .ic{flex:none;width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;margin-top:1px}
    .sa-item.ok .ic{background:#EAF7EE;color:var(--ok)}
    .sa-item.no .ic{background:#FDECE4;color:#C2410C}
    .sa-item .tip{display:block;color:var(--muted);font-size:12.5px;margin-top:2px}
    .sa-sugg{background:var(--ink);color:#fff;border-radius:16px;padding:24px;margin-top:18px}
    .sa-sugg h3{color:#fff;font-size:19px;margin:0 0 14px}
    .sa-sugg ol{margin:0;padding-left:20px;display:flex;flex-direction:column;gap:9px;font-size:14.5px;opacity:.95}
    .sa-sugg .cta{margin-top:18px;display:flex;gap:10px;flex-wrap:wrap}
    .sa-sugg .btn{background:#fff;color:var(--ink)}.sa-sugg .btn:hover{background:var(--accent);color:#fff}
    .sa-spin{width:20px;height:20px;border-radius:50%;border:2px solid var(--line);border-top-color:var(--accent);animation:spin .8s linear infinite}
    @media(max-width:780px){.sa-cats{grid-template-columns:1fr}}
    `;
    const s = document.createElement("style"); s.textContent = css; document.head.appendChild(s);
  }

  function ringColor(score) {
    return score >= 85 ? "#16A34A" : score >= 70 ? "#1F4BFF" : score >= 50 ? "#F59E0B" : "#DC2626";
  }

  function renderResult(data) {
    const box = $("saResult");
    const col = ringColor(data.score);
    const cats = data.categories.map((c) => {
      const items = c.items.map((it) => `
        <div class="sa-item ${it.ok ? "ok" : "no"}">
          <span class="ic">${it.ok ? "✓" : "!"}</span>
          <span>${esc(it.label)}${it.tip ? `<span class="tip">${esc(it.tip)}</span>` : ""}</span>
        </div>`).join("");
      return `<div class="sa-cat"><h4>${esc(c.name)}</h4>${items}</div>`;
    }).join("");
    const suggs = (data.suggestions || []).map((s) => `<li>${esc(s)}</li>`).join("");

    box.innerHTML = `
      <div class="sa-top">
        <div class="sa-ring" style="--p:${data.score};--ringcol:${col}"><div><b>${data.score}</b><br><small>/ 100</small></div></div>
        <div class="sa-grade">
          <h3>${esc(data.grade)} — ${data.score}/100</h3>
          <p>Arvio osoitteelle <b>${esc(stripProto(data.url))}</b>. Alla konkreettiset löydökset ja tärkeimmät parannukset.</p>
        </div>
      </div>
      <div class="sa-cats">${cats}</div>
      <div class="sa-sugg">
        <h3>Tärkeimmät parannukset${data.aiUsed ? " (AI-analyysi)" : ""}</h3>
        <ol>${suggs}</ol>
        <div class="cta">
          <a class="btn" href="#yhteys">Pyydä Sivuverstas korjaamaan nämä →</a>
        </div>
      </div>`;
    box.style.display = "block";
    if (typeof box.scrollIntoView === "function") box.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function esc(s) { return String(s).replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c])); }
  function stripProto(u) { return String(u).replace(/^https?:\/\//, "").replace(/\/$/, ""); }

  // Selaimen demo-arvio (jos backendiä ei ole asetettu). Rajoitettu:
  // ei voi hakea ulkoista sivua CORS:n vuoksi, joten näytetään esimerkki.
  function demoReport(url) {
    return {
      url, score: 64, grade: "Kohtalainen", aiUsed: false,
      categories: [
        { name: "Tekniikka & nopeus", items: [
          { ok: true, label: "Suojattu yhteys (HTTPS)" },
          { ok: false, label: "Vasteaika hidas", tip: "Kevennä kuvia ja koodia nopeuttaaksesi latausta." },
          { ok: true, label: "Mobiilioptimoitu (viewport)" },
        ]},
        { name: "Hakukoneoptimointi (SEO)", items: [
          { ok: false, label: "Meta-kuvaus puuttuu", tip: "Lisää 50–160 merkin kuvaus, joka houkuttelee klikkaamaan." },
          { ok: false, label: "Rakenteinen data puuttuu", tip: "Lisää LocalBusiness-schema parempaan Google-näkyvyyteen." },
          { ok: true, label: "Pääotsikko (H1) selkeä" },
        ]},
        { name: "Jaettavuus & sisältö", items: [
          { ok: false, label: "Open Graph -tagit puuttuvat", tip: "Lisää og:title/og:image somejakoja varten." },
          { ok: true, label: "Kielimääritys (lang)" },
        ]},
      ],
      suggestions: [
        "Tämä on esimerkkiarvio — kytke analyysipalvelu (ks. LUE-MINUT-sivuarvio.md) saadaksesi oikean arvion mistä tahansa osoitteesta.",
        "Lisää meta-kuvaus ja Open Graph -tagit parempaan näkyvyyteen ja somejakoihin.",
        "Nopeuta latausta keventämällä kuvia.",
      ],
    };
  }

  function setStatus(msg, busy) {
    const s = $("saStatus");
    s.innerHTML = busy ? `<span class="sa-spin"></span> ${esc(msg)}` : esc(msg);
    s.className = "sa-status";
  }
  function setError(msg) { $("saStatus").innerHTML = `<span class="sa-err">${esc(msg)}</span>`; }

  async function run() {
    const urlEl = $("saUrl"), emailEl = $("saEmail"), btn = $("saGo");
    const url = (urlEl.value || "").trim();
    const email = (emailEl.value || "").trim();
    if (url.length < 4 || !/\./.test(url)) { urlEl.focus(); setError("Anna sivusi osoite, esim. www.yritys.fi"); return; }
    if (!validEmail(email)) { emailEl.focus(); emailEl.style.borderColor = "#FF5A2C"; setError("Anna kelvollinen sähköposti, niin lähetämme raportin."); return; }
    emailEl.style.borderColor = "";
    btn.disabled = true; btn.querySelector("#saGoLabel").textContent = "Analysoidaan…";
    setStatus("Haetaan ja analysoidaan sivua…", true);

    let data = null;
    try {
      if (CONFIG.reviewApiUrl) {
        const r = await fetch(CONFIG.reviewApiUrl, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url, email }),
        });
        const j = await r.json();
        if (j.error) { setError(j.error); }
        else data = j;
      } else {
        await new Promise((r) => setTimeout(r, 900));
        data = demoReport(/^https?:\/\//.test(url) ? url : "https://" + url);
      }
    } catch (e) {
      setError("Analyysi ei juuri nyt onnistunut. Yritä uudelleen tai ota yhteyttä, niin teemme arvion käsin.");
    }

    // Tallenna liidi (myös kun analyysi onnistui)
    if (data) {
      sendLead(url, email, data.score);
      setStatus(data.emailed ? "Valmis! Raportti lähetetty myös sähköpostiisi." : "Valmis! Raportti näkyy alla.", false);
      renderResult(data);
    }
    btn.disabled = false; btn.querySelector("#saGoLabel").textContent = "Tee ilmainen arvio";
  }

  function sendLead(url, email, score) {
    try {
      fetch(CONFIG.leadEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ tyyppi: "Sivuarvio-liidi", arvioitava_sivu: url, email, pisteet: score }),
      });
    } catch (e) { /* hiljainen: liidi ei saa estää raporttia */ }
  }

  function init() {
    if (!$("saGo")) return; // osiota ei ole sivulla
    injectStyles();
    $("saGo").addEventListener("click", run);
    [$("saUrl"), $("saEmail")].forEach((el) => el && el.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); run(); } }));
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
