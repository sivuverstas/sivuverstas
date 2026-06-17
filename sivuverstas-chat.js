/* =============================================================
   Sivuverstas – AI-chatbotti (upotettava widget)
   -------------------------------------------------------------
   Toimii heti DEMO-tilassa ilman palvelinta tai API-avainta.
   Kytke oikea Claude-AI asettamalla CONFIG.apiUrl alle
   (ks. worker.js + LUE-MINUT-botti.md).
   Upota sivulle ennen </body>:
     <script src="sivuverstas-chat.js" defer></script>
   ============================================================= */
(function () {
  "use strict";

  /* ---------------------- ASETUKSET ------------------------- */
  const CONFIG = {
    brandName: "Sivuverstas",
    subtitle: "Vastaan yleensä heti",
    greeting:
      "Hei! 👋 Olen Sivuverstaan apuri. Voin kertoa paketeista ja hinnoista, neuvoa sopivan ratkaisun tai ohjata kokeilemaan ilmaista demoa. Mitä haluaisit tietää?",
    quickReplies: [
      "Paljonko maksaa?",
      "Mitä teette?",
      "Kokeile demoa",
      "Kuinka nopeasti?",
    ],
    // Sivuverstaan brändivärit (sininen + oranjessi aksentti)
    accent: "#1F4BFF",
    accentDark: "#1838C9",
    // OIKEA AI: aseta tähän Cloudflare Workerin osoite, esim.
    //   "https://sivuverstas-chat.kayttaja.workers.dev"
    // Jätä tyhjäksi -> botti toimii demo-vastauksilla.
    apiUrl: "",
    // Mihin "Kokeile demoa" -nappi vie (hero-konsoli sivun ylhäällä)
    demoUrl: "#",
    // Mihin "Tee ilmainen sivuarvio" -nappi vie
    reviewUrl: "#sivuarvio",
    // Mihin "Ota yhteyttä" -nappi vie
    contactUrl: "#yhteys",
  };

  /* ------------- DEMO-VASTAUKSET (ilman AI:ta) -------------- */
  const DEMO_RULES = [
    {
      keys: ["hinta", "maksa", "hinnat", "kustann", "paljonko se", "budjet", "euro", "hinnasto"],
      reply:
        "Kiinteät hinnat, ei tuntilaskutusta:\n• Pienet sivut – 490 € (1-sivuinen esittely)\n• Keskikokoiset – 890 € (jopa 5 sivua, suosituin)\n• Suuret sivut – 1490 € (8+ sivua, verkkokauppa/varaus)\n\nKaikkiin kuuluu oma domain, mobiilioptimointi ja julkaisu. Voit myös rakentaa oman paketin osa kerrallaan. Haluatko tarjouksen?",
      action: "contact",
    },
    {
      keys: ["teette", "palvelu", "mitä saa", "mitä teette", "tarjoa", "mitä myyt"],
      reply:
        "Teen edullisia, nopeita ja näyttäviä verkkosivuja pienyrityksille avaimet käteen -periaatteella: suunnittelu, sisällöt, tekniikka, julkaisu ja oma domain. Voit myös rakentaa oman paketin lisäosilla (SEO, ajanvaraus, verkkokauppa, logo…). Mistä haluat kuulla lisää?",
    },
    {
      keys: ["demo", "kokeil", "näe sivu", "esikatselu", "testaa"],
      reply:
        "Kokeile ilmaiseksi! Kuvaile yrityksesi parilla sanalla sivun yläosan kentässä, niin näet valmiin demosivun ruudulla sekunneissa — ennen kuin maksat mitään. Jos pidät siitä, vien sen liveksi.",
      action: "demo",
    },
    {
      keys: ["kestää", "aikataulu", "milloin", "nopea", "kuinka kauan", "valmis", "kiire", "deadline"],
      reply:
        "Useimmiten sivu on valmis noin viikossa siitä kun sisällöt ovat kasassa. Kiireiset aikataulutkin onnistuvat usein. Onko sinulla tietty takaraja mielessä?",
    },
    {
      keys: ["seo", "google", "hakukone", "näkyvyys", "löydy"],
      reply:
        "Keskikokoiseen ja suureen pakettiin kuuluu hakukoneoptimointi (SEO): tekninen optimointi, otsikot, meta-tiedot, nopeus ja mobiili. Pieneen kuuluu perus-Google-näkyvyys, ja SEO:n saa lisäosana (+200 €). Haluatko ilmaisen arvion nykyisen sivusi SEO-kunnosta?",
      action: "review",
    },
    {
      keys: ["yhteys", "soita", "puhelin", "sähköposti", "email", "tavoit", "ihminen", "whatsapp"],
      reply:
        "Otetaan yhteyttä! Voit laittaa viestiä lomakkeella, soittaa, tai viestiä WhatsAppissa. Sähköposti: sivuverstas@gmail.com. Vastaan yleensä muutaman tunnin sisällä arkisin. Kerro lyhyesti mitä suunnittelet, niin palaan asiaan.",
      action: "contact",
    },
    {
      keys: ["verkkokaup", "kauppa", "myydä netissä", "ostoskori", "nettikauppa"],
      reply:
        "Verkkokauppa kuuluu Suureen pakettiin (1490 €) tai sen saa lisäosana (+600 €). Mukaan tuotehallinta, maksunvälitys ja toimitukset. Kerro mitä myyt, niin katsotaan sopiva ratkaisu.",
      action: "contact",
    },
    {
      keys: ["case", "referen", "esimerk", "asiakk", "kokemuks", "ennen", "jälkeen", "ea"],
      reply:
        "Hyvä esimerkki on EA-Turvallisuuskyltti Oy:n uudistus — sivulla on ennen/jälkeen-vertailu, josta näet eron. Voin kertoa lisää referensseistä; minkä alan esimerkit kiinnostavat?",
    },
    {
      keys: ["ylläpito", "päivitys", "hosting", "huolto", "varmuuskop"],
      reply:
        "Ylläpito on valinnainen (19–59 €/kk paketista riippuen) ja sisältää hostingin, varmuuskopiot, tietoturvapäivitykset ja pienet sisältömuutokset. Et ole sidottu — domain ja sivu ovat sinun.",
    },
    {
      keys: ["domain", "omista", "kuka omistaa", "sidott"],
      reply:
        "Sinä omistat sekä domainin että sivun — rekisteröin domainin sinun nimiisi. Et ole sidottu minuun, ja voit halutessasi viedä sivun mukanasi.",
    },
    {
      keys: ["takuu", "en tykkää", "tyytymät", "riski", "entä jos"],
      reply:
        "Riski on pieni: näet demon ennen kuin maksat mitään, ja hiomme sen yhdessä kuntoon. Maksat vasta kun olet tyytyväinen — tyytyväisyystakuu.",
    },
  ];

  const FALLBACK =
    "Hyvä kysymys! Välitän sen mielelläni Jerelle. Voit jättää yhteystietosi lomakkeelle tai laittaa sähköpostia osoitteeseen sivuverstas@gmail.com. Sillä välin — haluaisitko kokeilla ilmaista demoa yrityksellesi?";

  function demoReply(text) {
    const t = (text || "").toLowerCase();
    for (const rule of DEMO_RULES) {
      if (rule.keys.some((k) => t.includes(k))) return rule;
    }
    if (/^(hei|moi|terve|morjes|hello|hi|moikka)\b/.test(t)) {
      return { reply: "Hei! Mukava kun otit yhteyttä. Miten voin auttaa — paketit, hinnat vai ilmainen demo?" };
    }
    if (/(kiitos|kiitti|thanks|kiva)/.test(t)) {
      return { reply: "Ole hyvä! 😊 Jos jokin jäi mietityttämään, kysy rohkeasti." };
    }
    return { reply: FALLBACK };
  }

  /* --------------------- TYYLIT ----------------------------- */
  // Asemoitu WhatsApp-napin (oikea alakulma) yläpuolelle, ettei törmää.
  const css = `
  .sv-chat *{box-sizing:border-box;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
  .sv-chat{position:fixed;bottom:84px;right:18px;z-index:2147483000}
  .sv-launch{width:56px;height:56px;border-radius:50%;border:none;cursor:pointer;
    background:${CONFIG.accent};color:#fff;box-shadow:0 8px 24px rgba(31,75,255,.35);
    display:flex;align-items:center;justify-content:center;transition:transform .15s,background .2s;position:relative}
  .sv-launch:hover{transform:scale(1.06);background:${CONFIG.accentDark}}
  .sv-launch svg{width:26px;height:26px}
  .sv-badge{position:absolute;top:-3px;right:-3px;width:15px;height:15px;border-radius:50%;background:#FF5A2C;border:2px solid #fff}
  .sv-panel{position:absolute;bottom:70px;right:0;width:372px;max-width:calc(100vw - 28px);
    height:560px;max-height:calc(100vh - 130px);background:#fff;border-radius:18px;
    box-shadow:0 16px 48px rgba(20,24,40,.28);display:none;flex-direction:column;overflow:hidden;
    opacity:0;transform:translateY(12px);transition:opacity .2s,transform .2s}
  .sv-panel.open{display:flex;opacity:1;transform:translateY(0)}
  .sv-head{background:${CONFIG.accent};color:#fff;padding:15px 17px;display:flex;align-items:center;gap:10px}
  .sv-head .sv-dot{width:9px;height:9px;border-radius:50%;background:#4ade80;box-shadow:0 0 0 3px rgba(74,222,128,.25);flex:none}
  .sv-head h4{margin:0;font-size:15px;font-weight:700;line-height:1.2;font-family:Inter}
  .sv-head p{margin:0;font-size:12px;opacity:.85}
  .sv-head .sv-close{margin-left:auto;background:none;border:none;color:#fff;cursor:pointer;opacity:.85;padding:4px;line-height:0}
  .sv-head .sv-close:hover{opacity:1}
  .sv-body{flex:1;overflow-y:auto;padding:16px;background:#FAF8F4;display:flex;flex-direction:column;gap:10px}
  .sv-msg{max-width:85%;padding:10px 13px;border-radius:14px;font-size:14px;line-height:1.45;white-space:pre-wrap;word-wrap:break-word}
  .sv-bot{background:#fff;color:#16181D;align-self:flex-start;border-bottom-left-radius:4px;box-shadow:0 1px 2px rgba(20,24,40,.07)}
  .sv-user{background:${CONFIG.accent};color:#fff;align-self:flex-end;border-bottom-right-radius:4px}
  .sv-quick{display:flex;flex-wrap:wrap;gap:7px;margin-top:2px}
  .sv-quick button{background:#fff;border:1px solid ${CONFIG.accent};color:${CONFIG.accent};
    border-radius:16px;padding:6px 12px;font-size:13px;cursor:pointer;transition:.15s;font-family:Inter}
  .sv-quick button:hover{background:${CONFIG.accent};color:#fff}
  .sv-cta{display:inline-block;margin-top:2px;background:${CONFIG.accent};color:#fff;text-decoration:none;
    padding:9px 14px;border-radius:10px;font-size:13px;font-weight:600;align-self:flex-start}
  .sv-cta:hover{background:${CONFIG.accentDark}}
  .sv-typing{display:flex;gap:4px;padding:12px 14px;align-self:flex-start;background:#fff;border-radius:14px;box-shadow:0 1px 2px rgba(20,24,40,.07)}
  .sv-typing span{width:7px;height:7px;border-radius:50%;background:#9ca3af;animation:svb 1.2s infinite}
  .sv-typing span:nth-child(2){animation-delay:.2s}.sv-typing span:nth-child(3){animation-delay:.4s}
  @keyframes svb{0%,60%,100%{opacity:.3;transform:translateY(0)}30%{opacity:1;transform:translateY(-4px)}}
  .sv-foot{display:flex;padding:10px;gap:8px;border-top:1px solid #E4E2DB;background:#fff}
  .sv-foot input{flex:1;border:1px solid #E4E2DB;border-radius:12px;padding:11px 13px;font-size:14px;outline:none;font-family:Inter}
  .sv-foot input:focus{border-color:${CONFIG.accent}}
  .sv-foot button{border:none;background:${CONFIG.accent};color:#fff;border-radius:12px;width:44px;cursor:pointer;display:flex;align-items:center;justify-content:center}
  .sv-foot button:hover{background:${CONFIG.accentDark}}
  .sv-foot button:disabled{opacity:.5;cursor:default}
  .sv-note{text-align:center;font-size:11px;color:#9ca3af;padding:0 0 8px;background:#fff}
  @media(max-width:420px){.sv-chat{bottom:80px;right:14px}.sv-panel{height:calc(100vh - 150px)}}
  @media(prefers-reduced-motion:reduce){.sv-launch,.sv-panel,.sv-typing span{transition:none;animation:none}}
  `;

  /* --------------------- RAKENNE ---------------------------- */
  function el(html) {
    const d = document.createElement("div");
    d.innerHTML = html.trim();
    return d.firstChild;
  }

  function build() {
    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);

    const root = el(`<div class="sv-chat" role="complementary" aria-label="Chat"></div>`);

    const launch = el(`<button class="sv-launch" aria-label="Avaa chat">
      <span class="sv-badge"></span>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
    </button>`);

    const panel = el(`<div class="sv-panel" role="dialog" aria-label="Sivuverstaan chat">
      <div class="sv-head">
        <span class="sv-dot"></span>
        <div><h4>${CONFIG.brandName}</h4><p>${CONFIG.subtitle}</p></div>
        <button class="sv-close" aria-label="Sulje">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>
      <div class="sv-body"></div>
      <div class="sv-foot">
        <input type="text" placeholder="Kirjoita viesti…" aria-label="Viesti" />
        <button class="sv-send" aria-label="Lähetä">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4 20-7z"/></svg>
        </button>
      </div>
      <div class="sv-note">AI-apuri · voi tehdä virheitä</div>
    </div>`);

    root.appendChild(panel);
    root.appendChild(launch);
    document.body.appendChild(root);

    const body = panel.querySelector(".sv-body");
    const input = panel.querySelector("input");
    const sendBtn = panel.querySelector(".sv-send");
    const badge = launch.querySelector(".sv-badge");
    const history = []; // {role, content} oikeaa AI:ta varten

    function toggle(open) {
      const opened = open !== undefined ? open : !panel.classList.contains("open");
      panel.classList.toggle("open", opened);
      if (opened) {
        if (badge) badge.style.display = "none";
        if (body.childElementCount === 0) addBot(CONFIG.greeting, true);
        setTimeout(() => input.focus(), 250);
      }
    }
    launch.addEventListener("click", () => toggle());
    panel.querySelector(".sv-close").addEventListener("click", () => toggle(false));

    function scroll() { body.scrollTop = body.scrollHeight; }

    function addUser(text) {
      const m = el(`<div class="sv-msg sv-user"></div>`);
      m.textContent = text;
      body.appendChild(m);
      history.push({ role: "user", content: text });
      scroll();
    }

    function ctaFor(action) {
      if (action === "demo") return { href: CONFIG.demoUrl, label: "Kokeile ilmaista demoa →" };
      if (action === "review") return { href: CONFIG.reviewUrl, label: "Tee ilmainen sivuarvio →" };
      if (action === "contact") return { href: CONFIG.contactUrl, label: "Ota yhteyttä →" };
      return null;
    }

    function addBot(text, withQuick, action) {
      const m = el(`<div class="sv-msg sv-bot"></div>`);
      m.textContent = text;
      body.appendChild(m);
      history.push({ role: "assistant", content: text });
      const cta = ctaFor(action);
      if (cta) {
        const a = el(`<a class="sv-cta" href="${cta.href}">${cta.label}</a>`);
        a.addEventListener("click", () => toggle(false));
        body.appendChild(a);
      }
      if (withQuick) {
        const q = el(`<div class="sv-quick"></div>`);
        CONFIG.quickReplies.forEach((label) => {
          const b = document.createElement("button");
          b.textContent = label;
          b.addEventListener("click", () => { q.remove(); handle(label); });
          q.appendChild(b);
        });
        body.appendChild(q);
      }
      scroll();
    }

    function typing(on) {
      const t = body.querySelector(".sv-typing");
      if (on && !t) {
        body.appendChild(el(`<div class="sv-typing"><span></span><span></span><span></span></div>`));
        scroll();
      } else if (!on && t) t.remove();
    }

    async function handle(text) {
      if (!text || !text.trim()) return;
      addUser(text.trim());
      input.value = "";
      typing(true);
      sendBtn.disabled = true;
      try {
        if (CONFIG.apiUrl) {
          const reply = await callApi();
          typing(false);
          addBot(reply || FALLBACK);
        } else {
          await new Promise((r) => setTimeout(r, 550 + Math.random() * 450));
          const res = demoReply(text);
          typing(false);
          addBot(res.reply, false, res.action);
        }
      } catch (e) {
        typing(false);
        addBot("Pahoittelut, yhteydessä oli häiriö. Yritä hetken kuluttua uudelleen tai laita viestiä: sivuverstas@gmail.com");
      } finally {
        sendBtn.disabled = false;
        input.focus();
      }
    }

    async function callApi() {
      const r = await fetch(CONFIG.apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      if (!r.ok) throw new Error("API " + r.status);
      const data = await r.json();
      return data.reply || data.content || "";
    }

    sendBtn.addEventListener("click", () => handle(input.value));
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); handle(input.value); }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", build);
  } else {
    build();
  }
})();
