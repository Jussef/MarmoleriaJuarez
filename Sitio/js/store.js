/* =========================================================
   TERRAMIZ · Almacén de contenido (demo MVP)
   ---------------------------------------------------------
   Sin hosting ni base de datos todavía: todo se guarda en
   localStorage del navegador. La API (TZStore) está pensada
   para que después sólo cambie su implementación por
   llamadas a un backend real, sin tocar el sitio ni el admin.
   ========================================================= */

/* ---------- Esquema de contenido editable ----------
   Cada campo tiene clave (k), etiqueta, tipo y valor por defecto (d).
   Las rutas de imagen son relativas a la raíz del sitio. */
const TZ_SCHEMA = [
  {
    id: "hero",
    label: "Banner principal",
    fields: [
      { k: "hero.img", type: "image", label: "Imagen de fondo", d: "img/hero.jpg", max: 1920 },
      { k: "hero.l1", label: "Título · línea 1", d: "Diseños que" },
      { k: "hero.gold", label: "Título · palabra dorada", d: "perduran" },
      { k: "hero.l3", label: "Título · línea 3", d: "por generaciones" },
      { k: "hero.text", type: "textarea", label: "Texto", d: "Marmolería, cubiertas de granito, terrazo y mosaicos artesanales con la más alta **calidad** y detalle.", hint: "Usa **palabra** para resaltar en negritas." },
      { k: "hero.btn", label: "Texto del botón", d: "Conoce nuestros productos" },
    ],
  },
  {
    id: "cats",
    label: "Especialidades",
    desc: "La franja con los 6 íconos debajo del banner.",
    fields: [
      ["Marmolería", "Fabricación y colocación de mármol, granito y más."],
      ["Cubiertas de granito", "Diseños personalizados para cocina, baño y espacios únicos."],
      ["Terrazo & pisos", "Terrazo, vintage, pisos, loseta y terramiz."],
      ["Lavaderos", "Lavaderos de colores y tamaños para cada necesidad."],
      ["Mosaicos de pasta", "Mosaicos artesanales que aportan arte a tus espacios."],
      ["Grabados", "Grabamos en granito, mármol, terrazo, azulejo y más."],
    ].flatMap(([t, p], i) => [
      { k: `cats.${i + 1}.title`, label: `${i + 1} · Título`, d: t, group: i + 1 },
      { k: `cats.${i + 1}.text`, type: "textarea", label: `${i + 1} · Descripción`, d: p, group: i + 1 },
    ]),
  },
  {
    id: "fin",
    label: "Acabados",
    desc: "Las 6 tarjetas numeradas de servicios.",
    fields: [
      { k: "fin.eyebrow", label: "Etiqueta", d: "Acabados" },
      { k: "fin.title", label: "Título", d: "Detalles que transforman tus espacios" },
      { k: "fin.text", type: "textarea", label: "Texto", d: "Cada acabado refleja precisión, experiencia y la belleza natural de los materiales." },
      ...[
        ["img/acabados/01-barras-cocina.jpg", "Instalación de barras de cocina y cubiertas de baño"],
        ["img/acabados/02-pisos-marmol.jpg", "Colocación de pisos de mármol y grandes formatos"],
        ["img/acabados/03-vaciado-terrazo.jpg", "Aplicación y vaciado de terrazo"],
        ["img/acabados/04-pulido.jpg", "Desbastado, pulido y abrillantado"],
        ["img/acabados/05-banos.jpg", "Enchapado de baños con mármol y azulejo rectificado"],
        ["img/acabados/06-escaleras.jpg", "Revestimiento de escaleras"],
      ].flatMap(([img, t], i) => [
        { k: `fin.${i + 1}.img`, type: "image", label: `Tarjeta ${i + 1} · Imagen`, d: img, max: 900, group: i + 1 },
        { k: `fin.${i + 1}.title`, label: `Tarjeta ${i + 1} · Título`, d: t, group: i + 1 },
      ]),
    ],
  },
  {
    id: "prod",
    label: "Productos",
    desc: "Las 4 tarjetas de productos / galería.",
    fields: [
      { k: "prod.eyebrow", label: "Etiqueta", d: "Productos" },
      { k: "prod.title", label: "Título", d: "Piezas hechas a mano, pensadas para durar" },
      ...[
        ["img/productos/terrazo.jpg", "Terrazo & pisos", "Terrazo, vintage, loseta y terramiz para interiores y exteriores."],
        ["img/productos/lavaderos.jpg", "Lavaderos", "Lavaderos de colores y tamaños, hechos para cada necesidad."],
        ["img/productos/mosaicos.jpg", "Mosaicos de pasta", "Artesanales, únicos y llenos de tradición."],
        ["img/productos/grabados.jpg", "Grabados", "Grabados personalizados en granito, mármol, terrazo y más."],
      ].flatMap(([img, t, p], i) => [
        { k: `prod.${i + 1}.img`, type: "image", label: `Producto ${i + 1} · Imagen`, d: img, max: 1000, group: i + 1 },
        { k: `prod.${i + 1}.title`, label: `Producto ${i + 1} · Nombre`, d: t, group: i + 1 },
        { k: `prod.${i + 1}.text`, type: "textarea", label: `Producto ${i + 1} · Descripción`, d: p, group: i + 1 },
      ]),
    ],
  },
  {
    id: "contact",
    label: "Contacto",
    fields: [
      { k: "contact.title", label: "Título", d: "Cotiza tu proyecto" },
      { k: "contact.text", type: "textarea", label: "Texto", d: "Cuéntanos qué tienes en mente: medidas, material y el espacio. Te respondemos con una propuesta a tu medida." },
      { k: "contact.whatsapp", label: "Número de WhatsApp", d: "520000000000", hint: "Formato internacional sin + ni espacios. Ej: 5213312345678" },
      { k: "contact.email", label: "Correo", d: "contacto@terramiz.com" },
      { k: "contact.hours", label: "Horario", d: "Lunes a sábado, 9:00 – 18:00" },
    ],
  },
];

const TZ_DEFAULTS = Object.fromEntries(
  TZ_SCHEMA.flatMap((s) => s.fields).map((f) => [f.k, f.d])
);

/* ---------- Popup de ejemplo: Halloween ---------- */
const TZ_DEFAULT_POPUPS = [
  {
    id: "halloween-2026",
    active: true,
    theme: "halloween",
    badge: "Promoción de Halloween",
    title: "15% de descuento",
    text: "En cubiertas de granito, lavaderos y mosaicos de pasta. ¡Un trato, no un truco!",
    code: "HALLOWEEN15",
    ctaLabel: "Quiero mi descuento",
    ctaLink: "#contacto",
    image: "",
    start: "2026-09-25",
    end: "2026-11-02",
    delay: 2,
    frequency: "always", // "always" = cada vez que se entra o recarga · "session" = una vez por visita
    updatedAt: 1,
  },
];

/* ---------- Utilidades ---------- */
const TZUtil = {
  today() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  },
  escape(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  },
  // Texto seguro con soporte para **negritas**
  rich(s) {
    return TZUtil.escape(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br>");
  },
  uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  },
};

/* ---------- Almacén ---------- */
const TZStore = (() => {
  const KEY = "terramiz:v1";
  const empty = () => ({ content: {}, popups: null, messages: [], stats: { visits: {}, popupViews: {}, popupClicks: {} } });

  function read() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY));
      return raw ? { ...empty(), ...raw, stats: { ...empty().stats, ...(raw.stats || {}) } } : empty();
    } catch {
      return empty();
    }
  }

  let db = read();

  function write() {
    try {
      localStorage.setItem(KEY, JSON.stringify(db));
      return true;
    } catch (err) {
      // Normalmente: se llenó el espacio (~5 MB) por imágenes muy pesadas
      console.warn("TZStore: no se pudo guardar", err);
      return false;
    }
  }

  return {
    KEY,
    reload() { db = read(); },

    // Contenido
    get: (k) => (k in db.content ? db.content[k] : TZ_DEFAULTS[k]),
    isCustom: (k) => k in db.content,
    set(k, v) {
      const prev = db.content[k];
      db.content[k] = v;
      if (write()) return true;
      if (prev === undefined) delete db.content[k]; else db.content[k] = prev;
      return false;
    },
    resetField(k) { delete db.content[k]; return write(); },

    // Popups
    popups: () => db.popups ?? structuredClone(TZ_DEFAULT_POPUPS),
    savePopups(list) { db.popups = list; return write(); },
    activePopup(date = TZUtil.today()) {
      return this.popups().find((p) => p.active && (!p.start || p.start <= date) && (!p.end || date <= p.end)) || null;
    },

    // Mensajes del formulario
    messages: () => db.messages,
    addMessage(m) { db.messages.unshift({ id: TZUtil.uid(), date: new Date().toISOString(), read: false, ...m }); return write(); },
    updateMessage(id, patch) { const m = db.messages.find((x) => x.id === id); if (m) Object.assign(m, patch); return write(); },
    deleteMessage(id) { db.messages = db.messages.filter((x) => x.id !== id); return write(); },

    // Estadísticas
    stats: () => db.stats,
    track(type, id) {
      const day = TZUtil.today();
      if (type === "visit") db.stats.visits[day] = (db.stats.visits[day] || 0) + 1;
      else {
        const bucket = type === "popupView" ? db.stats.popupViews : db.stats.popupClicks;
        bucket[id] = (bucket[id] || 0) + 1;
      }
      write();
    },

    // Respaldo / restauración
    raw: () => db,
    exportJSON: () => JSON.stringify(db, null, 2),
    importJSON(json) { const data = JSON.parse(json); db = { ...empty(), ...data }; return write(); },
    replaceAll(data) { db = { ...empty(), ...data }; return write(); },
    resetAll() { db = empty(); localStorage.removeItem(KEY); },
    usageBytes: () => (localStorage.getItem(KEY) || "").length * 2,
  };
})();

/* ---------- Popup (lo usan el sitio y la vista previa del admin) ---------- */
const TZPopup = {
  // base: prefijo para rutas relativas de imagen ("" en el sitio, "../" en el admin)
  html(p, base = "") {
    const e = TZUtil.escape;
    const img = p.image ? (p.image.startsWith("data:") ? p.image : base + p.image) : "";
    const deco = p.theme === "halloween"
      ? `<svg class="tzp__bats" viewBox="0 0 200 60" aria-hidden="true">
           <path d="M20 30c4-6 10-8 14-4 2-4 6-4 7 0 1-4 5-4 7 0 4-4 10-2 14 4-6-2-10 0-12 4-2-3-5-3-7 0-2-3-5-3-7 0-2-4-6-6-16-4z"/>
           <path transform="translate(120 4) scale(.7)" d="M20 30c4-6 10-8 14-4 2-4 6-4 7 0 1-4 5-4 7 0 4-4 10-2 14 4-6-2-10 0-12 4-2-3-5-3-7 0-2-3-5-3-7 0-2-4-6-6-16-4z"/>
           <path transform="translate(80 26) scale(.5)" d="M20 30c4-6 10-8 14-4 2-4 6-4 7 0 1-4 5-4 7 0 4-4 10-2 14 4-6-2-10 0-12 4-2-3-5-3-7 0-2-3-5-3-7 0-2-4-6-6-16-4z"/>
         </svg>
         <svg class="tzp__pumpkin" viewBox="0 0 64 64" aria-hidden="true">
           <path class="stem" d="M31 14c0-5 2-8 6-9l1 3c-3 1-4 3-4 6z"/>
           <ellipse cx="22" cy="37" rx="13" ry="20"/><ellipse cx="42" cy="37" rx="13" ry="20"/><ellipse cx="32" cy="37" rx="12" ry="21"/>
           <path class="face" d="M22 32l5 5h-9zM42 32l5 5h-9zM20 45c6 4 18 4 24 0l-3 5-3-3-3 3-3-3-3 3-3-3-3 3z"/>
         </svg>`
      : "";
    return `
      <div class="tzp tzp--${e(p.theme || "classic")}" role="dialog" aria-modal="true" aria-labelledby="tzp-title">
        <div class="tzp__backdrop" data-tzp-close></div>
        <div class="tzp__card">
          <button class="tzp__close" type="button" aria-label="Cerrar" data-tzp-close>×</button>
          ${img ? `<img class="tzp__img" src="${e(img)}" alt="">` : ""}
          ${deco}
          <div class="tzp__body">
            ${p.badge ? `<span class="tzp__badge">${e(p.badge)}</span>` : ""}
            <h2 class="tzp__title" id="tzp-title">${e(p.title)}</h2>
            ${p.text ? `<p class="tzp__text">${TZUtil.rich(p.text)}</p>` : ""}
            ${p.code ? `<div class="tzp__code"><span>Código</span><strong>${e(p.code)}</strong></div>` : ""}
            ${p.ctaLabel ? `<a class="tzp__cta" href="${e(p.ctaLink || "#contacto")}" data-tzp-cta>${e(p.ctaLabel)}</a>` : ""}
            ${p.end ? `<p class="tzp__valid">Válido hasta el ${e(new Date(p.end + "T12:00").toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" }))}</p>` : ""}
          </div>
        </div>
      </div>`;
  },

  open(p, { base = "", onCta, onClose } = {}) {
    TZPopup.close();
    const wrap = document.createElement("div");
    wrap.innerHTML = TZPopup.html(p, base).trim();
    const el = wrap.firstElementChild;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add("is-open"));

    const close = () => { TZPopup.close(); onClose && onClose(); };
    el.querySelectorAll("[data-tzp-close]").forEach((b) => b.addEventListener("click", close));
    const cta = el.querySelector("[data-tzp-cta]");
    if (cta) cta.addEventListener("click", () => { onCta && onCta(); TZPopup.close(); });
    TZPopup._esc = (ev) => ev.key === "Escape" && close();
    document.addEventListener("keydown", TZPopup._esc);
    el.querySelector(".tzp__close").focus({ preventScroll: true });
    return el;
  },

  close() {
    document.querySelectorAll(".tzp").forEach((n) => n.remove());
    if (TZPopup._esc) document.removeEventListener("keydown", TZPopup._esc);
  },
};
