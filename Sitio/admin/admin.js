/* =========================================================
   TERRAMIZ · Panel de administración (demo MVP)
   ========================================================= */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = TZUtil.escape;

const ROOT = "../"; // el admin vive en /admin, las imágenes en la raíz del sitio
const imgSrc = (v) => (!v ? "" : v.startsWith("data:") ? v : ROOT + v);
const FIELDS = Object.fromEntries(TZ_SCHEMA.flatMap((s) => s.fields).map((f) => [f.k, f]));
const STORAGE_LIMIT = 5 * 1024 * 1024; // aprox. lo que permite localStorage

/* ---------- Fechas ---------- */
const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
function lastDays(n, offset = 0) {
  const out = [];
  for (let i = n - 1 + offset; i >= offset; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push(dayKey(d));
  }
  return out;
}
const fmtDate = (iso, opts = { day: "numeric", month: "short", year: "numeric" }) =>
  new Date(iso.length === 10 ? iso + "T12:00" : iso).toLocaleDateString("es-MX", opts);
function timeAgo(iso) {
  const mins = Math.round((Date.now() - new Date(iso)) / 60000);
  if (mins < 1) return "justo ahora";
  if (mins < 60) return `hace ${mins} min`;
  const h = Math.round(mins / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? "ayer" : d < 7 ? `hace ${d} días` : fmtDate(iso);
}
const sum = (arr) => arr.reduce((a, b) => a + b, 0);
const fmtNum = (n) => n.toLocaleString("es-MX");
const fmtKB = (b) => (b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

/* ---------- Toast ---------- */
let toastTimer;
function toast(msg, type = "") {
  const t = $("#toast");
  t.textContent = msg;
  t.className = `toast is-on ${type ? "toast--" + type : ""}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("is-on"), 2200);
}
const saveFailed = () => toast("No hay espacio suficiente. Prueba con una imagen más ligera.", "error");

/* ---------- Imágenes: se reducen y comprimen antes de guardarlas ---------- */
function compressImage(file, max = 1600, quality = 0.8) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith("image/")) return reject(new Error("El archivo no es una imagen"));
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("No se pudo leer la imagen")); };
    img.src = url;
  });
}

/* ---------- Datos de demostración ---------- */
function seedDemo() {
  const db = TZStore.raw();
  if (db.demo) return;

  const visits = { ...db.stats.visits };
  const demoDays = [];
  lastDays(60, 1).forEach((k, i) => {
    if (visits[k]) return;
    const dow = new Date(k + "T12:00").getDay();
    visits[k] = Math.max(4, Math.round(22 + 8 * Math.sin(i / 4) + i * 0.25 + (dow === 0 ? -10 : dow === 6 ? -5 : 0) + ((i * 7) % 5)));
    demoDays.push(k);
  });

  const ago = (h) => new Date(Date.now() - h * 3600000).toISOString();
  const demoMessages = [
    { name: "Laura Méndez", phone: "3312345678", interest: "Cubiertas de granito", message: "Hola, quiero cotizar una cubierta de granito para cocina de 3.20 m con barra. ¿Aplica el descuento de Halloween?", date: ago(3), read: false },
    { name: "Ricardo Salas", phone: "3398765432", interest: "Terrazo & pisos", message: "Me interesa terrazo para 45 m² de sala y comedor, color claro con piedra gris.", date: ago(27), read: false },
    { name: "Arq. Paola Ruiz", phone: "3355512233", interest: "Mosaicos de pasta", message: "Busco mosaico de pasta para un proyecto de restaurante, aprox. 60 m². ¿Tienen catálogo?", date: ago(70), read: true },
  ].map((m) => ({ id: TZUtil.uid(), demo: true, ...m }));

  const demoPopup = { id: "halloween-2026", views: 214, clicks: 37 };
  const stats = {
    visits,
    popupViews: { ...db.stats.popupViews, [demoPopup.id]: (db.stats.popupViews[demoPopup.id] || 0) + demoPopup.views },
    popupClicks: { ...db.stats.popupClicks, [demoPopup.id]: (db.stats.popupClicks[demoPopup.id] || 0) + demoPopup.clicks },
  };

  TZStore.replaceAll({ ...db, stats, messages: [...db.messages, ...demoMessages], demo: { days: demoDays, popup: demoPopup } });
}

function clearDemo() {
  const db = TZStore.raw();
  if (!db.demo) return;
  const visits = { ...db.stats.visits };
  db.demo.days.forEach((k) => delete visits[k]);
  const { id, views, clicks } = db.demo.popup;
  const popupViews = { ...db.stats.popupViews, [id]: Math.max(0, (db.stats.popupViews[id] || 0) - views) };
  const popupClicks = { ...db.stats.popupClicks, [id]: Math.max(0, (db.stats.popupClicks[id] || 0) - clicks) };
  TZStore.replaceAll({ ...db, demo: null, demoCleared: true, messages: db.messages.filter((m) => !m.demo), stats: { visits, popupViews, popupClicks } });
}

/* ---------- Sesión (demo: sin contraseña) ---------- */
const AUTH_KEY = "tz-admin";
const isAuthed = () => { try { return sessionStorage.getItem(AUTH_KEY) === "1"; } catch { return false; } };

function showLogin() {
  $("#app").hidden = true;
  $("#login").hidden = false;
  $("#loginForm button").focus();
}

function showApp() {
  $("#login").hidden = true;
  $("#app").hidden = false;
  if (!TZStore.raw().demoCleared) seedDemo();
  route();
}

$("#loginForm").addEventListener("submit", (e) => {
  e.preventDefault();
  try { sessionStorage.setItem(AUTH_KEY, "1"); } catch {}
  if (!location.hash) history.replaceState(null, "", "#resumen");
  showApp();
  toast("¡Bienvenido!");
});

$("#logout").addEventListener("click", () => {
  try { sessionStorage.removeItem(AUTH_KEY); } catch {}
  history.replaceState(null, "", location.pathname);
  showLogin();
});

/* ---------- Menú móvil ---------- */
function setMenu(open) {
  $("#side").classList.toggle("is-open", open);
  $("#menuBtn").setAttribute("aria-expanded", String(open));
}
$("#menuBtn").addEventListener("click", () => setMenu(!$("#side").classList.contains("is-open")));

/* =========================================================
   Router
   ========================================================= */
const ROUTES = {
  resumen: { title: "Resumen", sub: "Así va tu sitio", render: viewResumen },
  banner: { title: "Banner principal", sub: "La primera imagen y el mensaje que ven tus clientes", render: viewBanner },
  contenido: { title: "Textos e imágenes", sub: "Edita cada sección del sitio. Se guarda automáticamente.", render: viewContenido },
  popups: { title: "Popups y promociones", sub: "Avisos de noticias, descuentos o temporadas", render: viewPopups },
  mensajes: { title: "Mensajes", sub: "Solicitudes enviadas desde el formulario de contacto", render: viewMensajes },
  ajustes: { title: "Ajustes", sub: "Respaldo de información y datos de la demo", render: viewAjustes },
};

function route() {
  if (!isAuthed()) return showLogin();
  const [name, arg] = location.hash.slice(1).split("/");
  const r = ROUTES[name] || ROUTES.resumen;
  const key = ROUTES[name] ? name : "resumen";

  $$(".side__nav a").forEach((a) => a.classList.toggle("is-active", a.dataset.route === key));
  $("#pageTitle").textContent = r.title;
  $("#pageSub").textContent = r.sub;
  document.title = `${r.title} · Panel Terramiz`;

  clearViewListeners();
  TZPopup.close();
  const view = $("#view");
  view.style.animation = "none";
  void view.offsetWidth;
  view.style.animation = "";
  r.render(view, arg);

  setMenu(false);
  updateBadge();
  window.scrollTo(0, 0);
}
window.addEventListener("hashchange", route);

function updateBadge() {
  const n = TZStore.messages().filter((m) => !m.read).length;
  const b = $("#unreadBadge");
  b.hidden = !n;
  b.textContent = n;
}

// Si el sitio (en otra pestaña) registra un mensaje o una visita, refresca
window.addEventListener("storage", (e) => {
  if (e.key !== TZStore.KEY) return;
  TZStore.reload();
  updateBadge();
  const name = location.hash.slice(1).split("/")[0];
  if (["resumen", "mensajes"].includes(name) && isAuthed()) route();
});

/* =========================================================
   Vista: Resumen
   ========================================================= */
const ICON = {
  eye: '<svg viewBox="0 0 24 24"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  mail: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="M3.5 6l8.5 7 8.5-7"/></svg>',
  tag: '<svg viewBox="0 0 24 24"><path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.5"/></svg>',
  click: '<svg viewBox="0 0 24 24"><path d="M9 9l11 4-5 2-2 5z"/><path d="M5 3v3M3 5h3M13 3l-1.5 2.5M3 13l2.5-1.5"/></svg>',
  info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/></svg>',
  wa: '<svg viewBox="0 0 24 24"><path d="M3.5 20.5l1.3-4A8.5 8.5 0 1 1 8 19.6z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 1c-1-.4-1.7-1.1-2-2l1-1-1-2z"/></svg>',
  pumpkin: '<svg viewBox="0 0 64 64"><ellipse cx="22" cy="37" rx="13" ry="20"/><ellipse cx="42" cy="37" rx="13" ry="20"/><ellipse cx="32" cy="37" rx="12" ry="21"/><path d="M31 14c0-5 2-8 6-9l1 3c-3 1-4 3-4 6z"/></svg>',
};

function viewResumen(view) {
  const s = TZStore.stats();
  const msgs = TZStore.messages();
  const unread = msgs.filter((m) => !m.read).length;
  const v30 = sum(lastDays(30).map((k) => s.visits[k] || 0));
  const vPrev = sum(lastDays(30, 30).map((k) => s.visits[k] || 0));
  const delta = vPrev ? Math.round(((v30 - vPrev) / vPrev) * 100) : null;
  const active = TZStore.activePopup();
  const views = sum(Object.values(s.popupViews));
  const clicks = sum(Object.values(s.popupClicks));
  const ctr = views ? ((clicks / views) * 100).toFixed(1) : "0";

  const all = Object.values(FIELDS);
  const customTexts = all.filter((f) => f.type !== "image" && TZStore.isCustom(f.k)).length;
  const customImgs = all.filter((f) => f.type === "image" && TZStore.isCustom(f.k)).length;
  const used = TZStore.usageBytes();
  const pct = Math.min(100, (used / STORAGE_LIMIT) * 100);

  view.innerHTML = `
    ${TZStore.raw().demo ? `
      <div class="notice">${ICON.info}
        <p><strong>Estás viendo datos de demostración.</strong> Las visitas y mensajes de ejemplo sirven para ver cómo se verá el panel. Los datos reales del sitio se suman a partir de hoy.</p>
        <a class="btn btn--sm" href="#ajustes">Quitar datos demo</a>
      </div>` : ""}

    <section class="kpis">
      <article class="card kpi">
        <p class="kpi__label">${ICON.eye} Visitas · 30 días</p>
        <p class="kpi__value">${fmtNum(v30)}</p>
        <p class="kpi__meta">${delta === null ? "Sin datos del periodo anterior" : `<span class="${delta >= 0 ? "delta--up" : "delta--down"}">${delta >= 0 ? "▲" : "▼"} ${Math.abs(delta)}%</span> vs. 30 días anteriores`}</p>
      </article>
      <article class="card kpi">
        <p class="kpi__label">${ICON.mail} Mensajes</p>
        <p class="kpi__value">${fmtNum(msgs.length)}</p>
        <p class="kpi__meta">${unread ? `<strong>${unread}</strong> sin leer` : "Todo al día"}</p>
      </article>
      <article class="card kpi">
        <p class="kpi__label">${ICON.tag} Promoción en el sitio</p>
        <p class="kpi__value kpi__value--sm">${active ? esc(active.title) : "Ninguna"}</p>
        <p class="kpi__meta">${active ? (active.end ? `Termina el ${fmtDate(active.end, { day: "numeric", month: "long" })}` : "Sin fecha de fin") : '<a href="#popups/nuevo">Crear una promoción</a>'}</p>
      </article>
      <article class="card kpi">
        <p class="kpi__label">${ICON.click} Clics en popups</p>
        <p class="kpi__value">${fmtNum(clicks)}</p>
        <p class="kpi__meta">${ctr}% de ${fmtNum(views)} vistas</p>
      </article>
    </section>

    <div class="grid grid--main">
      <section class="card">
        <header class="card__head">
          <div><h2>Visitas por día</h2><p>Últimos 14 días</p></div>
        </header>
        <div class="card__body"><div class="chart" id="visitsChart"></div></div>
      </section>

      <section class="card">
        <header class="card__head">
          <div><h2>Últimos mensajes</h2><p>${unread ? `${unread} sin leer` : "Sin pendientes"}</p></div>
          <a class="btn btn--sm" href="#mensajes">Ver todos</a>
        </header>
        ${msgs.length ? `<ul class="list">${msgs.slice(0, 4).map((m) => `
          <li>
            <span class="list__dot ${m.read ? "" : "is-new"}"></span>
            <div class="list__main">
              <p class="list__title">${esc(m.name)} <span class="pill pill--plain">${esc(m.interest)}</span></p>
              <p class="list__text">${esc(m.message)}</p>
            </div>
            <span class="list__time">${timeAgo(m.date)}</span>
          </li>`).join("")}</ul>` : `<p class="empty">Aún no llegan mensajes del formulario.</p>`}
      </section>
    </div>

    <div class="grid grid--3" style="margin-top:20px">
      <section class="card">
        <header class="card__head"><h2>Contenido del sitio</h2><a class="btn btn--sm" href="#contenido">Editar</a></header>
        <div class="card__body stat-rows">
          <p class="stat-row"><span>Textos personalizados</span><strong>${customTexts} de ${all.filter((f) => f.type !== "image").length}</strong></p>
          <p class="stat-row"><span>Imágenes cambiadas</span><strong>${customImgs} de ${all.filter((f) => f.type === "image").length}</strong></p>
          <p class="stat-row"><span>Popups creados</span><strong>${TZStore.popups().length}</strong></p>
        </div>
      </section>
      <section class="card">
        <header class="card__head"><h2>Banner actual</h2><a class="btn btn--sm" href="#banner">Cambiar</a></header>
        <div class="card__body">
          <div class="hero-prev" style="aspect-ratio:16/8;background-image:url('${esc(imgSrc(TZStore.get("hero.img")))}')">
            <div><h2 style="font-size:1rem">${esc(TZStore.get("hero.l1"))} <span class="gold">${esc(TZStore.get("hero.gold"))}</span> ${esc(TZStore.get("hero.l3"))}</h2></div>
          </div>
        </div>
      </section>
      <section class="card">
        <header class="card__head"><h2>Espacio usado</h2><a class="btn btn--sm" href="#ajustes">Respaldo</a></header>
        <div class="card__body">
          <div class="meter ${pct > 80 ? "meter--warn" : ""}"><span style="width:${Math.max(pct, 1)}%"></span></div>
          <p class="meter__meta"><span>${fmtKB(used)} de ~5 MB</span><span>${pct.toFixed(0)}%</span></p>
          <p class="field__hint" style="margin-top:12px">En la demo todo se guarda en este navegador. Con hosting se conectará a una base de datos.</p>
        </div>
      </section>
    </div>`;

  const data = lastDays(14).map((k) => ({ key: k, value: s.visits[k] || 0 }));
  drawBarChart($("#visitsChart"), data);
}

/* Gráfica de barras de una sola serie, con tooltip */
function drawBarChart(el, data) {
  const draw = () => {
    const W = el.clientWidth || 600;
    const H = 220;
    const m = { t: 12, r: 4, b: 26, l: 30 };
    const max = Math.max(4, ...data.map((d) => d.value));
    const step = Math.ceil(max / 4 / 5) * 5 || 1;
    const top = step * 4;
    const iw = W - m.l - m.r;
    const ih = H - m.t - m.b;
    const col = iw / data.length;
    const bw = Math.min(28, col * 0.62);
    const y = (v) => m.t + ih - (v / top) * ih;
    const today = dayKey(new Date());

    const grid = [0, 1, 2, 3, 4].map((i) => {
      const v = step * i;
      return `<line class="grid-line" x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}"/>
              <text class="axis-label" x="${m.l - 8}" y="${y(v) + 4}" text-anchor="end">${v}</text>`;
    }).join("");

    const bars = data.map((d, i) => {
      const cx = m.l + col * i + col / 2;
      const x = cx - bw / 2;
      const h = Math.max(0, y(0) - y(d.value));
      const r = Math.min(4, h);
      const path = h
        ? `M${x},${y(0)} V${y(d.value) + r} Q${x},${y(d.value)} ${x + r},${y(d.value)} H${x + bw - r} Q${x + bw},${y(d.value)} ${x + bw},${y(d.value) + r} V${y(0)} Z`
        : "";
      const date = new Date(d.key + "T12:00");
      const label = d.key === today ? "Hoy" : String(date.getDate());
      const showLabel = data.length <= 16 || i % 2 === 0 || d.key === today;
      return `
        <rect class="hit" x="${m.l + col * i}" y="${m.t}" width="${col}" height="${ih}" data-i="${i}"/>
        <path class="bar ${d.key === today ? "is-today" : ""}" data-bar="${i}" d="${path}"/>
        ${showLabel ? `<text class="axis-label" x="${cx}" y="${H - 8}" text-anchor="middle">${label}</text>` : ""}`;
    }).join("");

    el.innerHTML = `
      <svg width="${W}" height="${H}" role="img" aria-label="Visitas por día en los últimos ${data.length} días">${grid}${bars}</svg>
      <div class="chart__tip" aria-hidden="true"></div>
      <details class="chart__table"><summary>Ver como tabla</summary>
        <table><thead><tr><th>Día</th><th>Visitas</th></tr></thead><tbody>
        ${data.map((d) => `<tr><td>${fmtDate(d.key, { weekday: "short", day: "numeric", month: "short" })}</td><td>${d.value}</td></tr>`).join("")}
        </tbody></table>
      </details>`;

    const tip = $(".chart__tip", el);
    $$(".hit", el).forEach((hit) => {
      const i = +hit.dataset.i;
      const bar = $(`[data-bar="${i}"]`, el);
      hit.addEventListener("mouseenter", () => {
        const d = data[i];
        tip.innerHTML = `${fmtDate(d.key, { weekday: "long", day: "numeric", month: "short" })} · <strong>${d.value}</strong> visitas`;
        tip.style.left = `${m.l + col * i + col / 2}px`;
        tip.style.top = `${y(d.value)}px`;
        tip.classList.add("is-on");
        bar.classList.add("is-hover");
      });
      hit.addEventListener("mouseleave", () => {
        tip.classList.remove("is-on");
        bar.classList.remove("is-hover");
      });
    });
  };

  draw();
  if (el._ro) el._ro.disconnect();
  let lastW = el.clientWidth;
  el._ro = new ResizeObserver(() => {
    if (!el.isConnected) return el._ro.disconnect();
    if (el.clientWidth !== lastW) { lastW = el.clientWidth; draw(); }
  });
  el._ro.observe(el);
}

/* =========================================================
   Campos de contenido (texto / imagen) con guardado automático
   ========================================================= */
function fieldHead(f) {
  const custom = TZStore.isCustom(f.k);
  return `<label for="f-${f.k}">${esc(f.label)}</label>
    ${custom ? `<span class="edited">· Editado</span><button type="button" class="link-btn" data-reset="${f.k}">Restaurar original</button>` : ""}`;
}

function fieldHTML(f) {
  const v = TZStore.get(f.k);
  const head = `<div class="field__label" data-head="${f.k}">${fieldHead(f)}</div>`;
  const hint = f.hint ? `<span class="field__hint">${esc(f.hint)}</span>` : "";

  if (f.type === "image") {
    return `
      <div class="img-field" data-field="${f.k}">
        ${head}
        <div class="img-field__preview" data-drop="${f.k}">
          <img src="${esc(imgSrc(v))}" alt="" data-preview="${f.k}">
          <label class="img-field__drop" for="f-${f.k}">Soltar o elegir imagen</label>
        </div>
        <input type="file" accept="image/*" id="f-${f.k}" data-img="${f.k}">
        <div class="img-field__actions">
          <label class="btn btn--sm" for="f-${f.k}">Subir imagen</label>
          <span class="field__hint">JPG o PNG · se optimiza sola</span>
        </div>
      </div>`;
  }

  const input = f.type === "textarea"
    ? `<textarea id="f-${f.k}" data-k="${f.k}" rows="3">${esc(v)}</textarea>`
    : `<input id="f-${f.k}" data-k="${f.k}" type="text" value="${esc(v)}">`;
  return `<div class="field ${f.type === "textarea" && !f.group ? "field--full" : ""}">${head}${input}${hint}</div>`;
}

function refreshField(k) {
  const head = $(`[data-head="${CSS.escape(k)}"]`);
  if (head) head.innerHTML = fieldHead(FIELDS[k]);
  const input = $(`[data-k="${CSS.escape(k)}"]`);
  if (input && document.activeElement !== input) input.value = TZStore.get(k);
  const prev = $(`[data-preview="${CSS.escape(k)}"]`);
  if (prev) prev.src = imgSrc(TZStore.get(k));
  document.dispatchEvent(new CustomEvent("tz:field", { detail: k }));
}

const saveTimers = {};
function saveText(k, value) {
  clearTimeout(saveTimers[k]);
  saveTimers[k] = setTimeout(() => {
    const ok = value === TZ_DEFAULTS[k] ? TZStore.resetField(k) : TZStore.set(k, value);
    if (!ok) return saveFailed();
    refreshField(k);
    toast("Cambios guardados");
  }, 450);
}

async function saveImage(k, file) {
  try {
    const data = await compressImage(file, FIELDS[k].max || 1600);
    if (!TZStore.set(k, data)) return saveFailed();
    refreshField(k);
    toast("Imagen actualizada");
  } catch (err) {
    toast(err.message, "error");
  }
}

// Delegación de eventos para todos los campos
const view = $("#view");
view.addEventListener("input", (e) => {
  const k = e.target.dataset.k;
  if (k) {
    saveText(k, e.target.value);
    document.dispatchEvent(new CustomEvent("tz:typing", { detail: { k, value: e.target.value } }));
  }
});
view.addEventListener("change", (e) => {
  const k = e.target.dataset.img;
  if (k && e.target.files[0]) saveImage(k, e.target.files[0]);
  if (k) e.target.value = "";
});
view.addEventListener("click", (e) => {
  const k = e.target.closest("[data-reset]")?.dataset.reset;
  if (!k) return;
  TZStore.resetField(k);
  const input = $(`[data-k="${CSS.escape(k)}"]`);
  if (input) input.value = TZStore.get(k);
  refreshField(k);
  toast("Se restauró el original");
});
["dragenter", "dragover"].forEach((ev) =>
  view.addEventListener(ev, (e) => {
    const drop = e.target.closest("[data-drop]");
    if (!drop) return;
    e.preventDefault();
    drop.classList.add("is-drag");
  })
);
view.addEventListener("dragleave", (e) => e.target.closest("[data-drop]")?.classList.remove("is-drag"));
view.addEventListener("drop", (e) => {
  const drop = e.target.closest("[data-drop]");
  if (!drop) return;
  e.preventDefault();
  drop.classList.remove("is-drag");
  if (e.dataTransfer.files[0]) saveImage(drop.dataset.drop, e.dataTransfer.files[0]);
});

function groupHTML(section) {
  const general = section.fields.filter((f) => !f.group);
  const groups = [...new Set(section.fields.filter((f) => f.group).map((f) => f.group))];
  const cardName = { cats: "Especialidad", fin: "Tarjeta", prod: "Producto" }[section.id] || "Elemento";

  return `
    ${general.length ? `
      <section class="card" style="margin-bottom:20px">
        <header class="card__head"><div><h2>${esc(section.label)}</h2>${section.desc ? `<p>${esc(section.desc)}</p>` : ""}</div></header>
        <div class="card__body fields fields--2">${general.map(fieldHTML).join("")}</div>
      </section>` : section.desc ? `<p class="top__sub" style="margin-bottom:16px">${esc(section.desc)}</p>` : ""}
    ${groups.length ? `
      <div class="item-cards">
        ${groups.map((g) => `
          <article class="card item-card">
            <h4>${cardName} ${g}</h4>
            ${section.fields.filter((f) => f.group === g).map((f) => fieldHTML({ ...f, label: f.label.replace(/^.*· /, "") })).join("")}
          </article>`).join("")}
      </div>` : ""}`;
}

/* =========================================================
   Vista: Banner principal
   ========================================================= */
function viewBanner(view) {
  const hero = TZ_SCHEMA.find((s) => s.id === "hero");
  const img = hero.fields.find((f) => f.type === "image");
  const texts = hero.fields.filter((f) => f.type !== "image");

  view.innerHTML = `
    <section class="card" style="margin-bottom:20px">
      <header class="card__head">
        <div><h2>Vista previa</h2><p>Así se ve el banner en tu sitio</p></div>
        <a class="btn btn--sm" href="../#inicio" target="_blank" rel="noopener">Abrir sitio</a>
      </header>
      <div class="card__body"><div class="hero-prev" id="heroPrev"></div></div>
    </section>
    <div class="grid grid--2">
      <section class="card">
        <header class="card__head"><h2>Imagen</h2></header>
        <div class="card__body">${fieldHTML(img)}</div>
      </section>
      <section class="card">
        <header class="card__head"><h2>Textos</h2></header>
        <div class="card__body fields">${texts.map((f) => fieldHTML({ ...f, type: f.type === "textarea" ? "textarea" : "text" })).join("")}</div>
      </section>
    </div>`;

  const draft = {};
  const renderPrev = () => {
    const g = (k) => (k in draft ? draft[k] : TZStore.get(k));
    $("#heroPrev").style.backgroundImage = `url('${imgSrc(TZStore.get("hero.img"))}')`;
    $("#heroPrev").innerHTML = `<div>
      <h2>${esc(g("hero.l1"))}<br><span class="gold">${esc(g("hero.gold"))}</span><br>${esc(g("hero.l3"))}</h2>
      <p>${TZUtil.rich(g("hero.text"))}</p>
      <span class="btn-prev">${esc(g("hero.btn"))} ›</span></div>`;
  };
  renderPrev();
  bindViewEvent("tz:typing", (e) => { draft[e.detail.k] = e.detail.value; renderPrev(); });
  bindViewEvent("tz:field", (e) => { delete draft[e.detail]; renderPrev(); });
}

// Escuchas que sólo viven mientras la vista está abierta
let viewListeners = [];
function bindViewEvent(type, fn) {
  document.addEventListener(type, fn);
  viewListeners.push([type, fn]);
}
function clearViewListeners() {
  viewListeners.forEach(([t, f]) => document.removeEventListener(t, f));
  viewListeners = [];
}

/* =========================================================
   Vista: Textos e imágenes
   ========================================================= */
let contentTab = "cats";
function viewContenido(view) {
  const sections = TZ_SCHEMA.filter((s) => s.id !== "hero");
  if (!sections.some((s) => s.id === contentTab)) contentTab = sections[0].id;

  view.innerHTML = `
    <div class="tabs" role="tablist">
      ${sections.map((s) => `<button role="tab" data-tab="${s.id}" class="${s.id === contentTab ? "is-active" : ""}" aria-selected="${s.id === contentTab}">${esc(s.label)}</button>`).join("")}
    </div>
    <div id="tabPanel">${groupHTML(sections.find((s) => s.id === contentTab))}</div>`;

  $$("[data-tab]", view).forEach((b) =>
    b.addEventListener("click", () => {
      contentTab = b.dataset.tab;
      viewContenido(view);
    })
  );
}

/* =========================================================
   Vista: Popups y promociones
   ========================================================= */
function popupStatus(p) {
  const t = TZUtil.today();
  if (!p.active) return ["Apagado", ""];
  if (p.start && t < p.start) return ["Programado", "warn"];
  if (p.end && t > p.end) return ["Terminado", "bad"];
  return ["Activo", "ok"];
}

function viewPopups(view, arg) {
  if (arg) return viewPopupEditor(view, arg);

  const list = TZStore.popups();
  const live = TZStore.activePopup();
  const s = TZStore.stats();

  view.innerHTML = `
    <div class="notice">${ICON.info}
      <p>El popup aparece cada vez que alguien entra o recarga el sitio, dentro de las fechas que elijas. Si hay varios activos a la vez, se muestra el primero de la lista.</p>
      <a class="btn btn--gold btn--sm" href="#popups/nuevo">+ Nuevo popup</a>
    </div>
    ${list.length ? `<div class="popup-list">${list.map((p) => {
      const [label, tone] = popupStatus(p);
      const views = s.popupViews[p.id] || 0;
      const clicks = s.popupClicks[p.id] || 0;
      const swatch = p.image
        ? `<img src="${esc(imgSrc(p.image))}" alt="">`
        : p.theme === "halloween" ? ICON.pumpkin : esc((p.title || "?").charAt(0));
      return `
        <article class="card popup-row">
          <div class="popup-row__swatch popup-row__swatch--${esc(p.theme)}">${swatch}</div>
          <div>
            <h3>${esc(p.title)} <span class="pill pill--${tone}">${label}</span>${live && live.id === p.id ? '<span class="pill pill--gold">Visible en el sitio</span>' : ""}</h3>
            <p>${p.start || p.end ? `${p.start ? fmtDate(p.start) : "Desde hoy"} → ${p.end ? fmtDate(p.end) : "sin fecha de fin"}` : "Sin fechas"}
              · ${fmtNum(views)} vistas · ${fmtNum(clicks)} clics</p>
          </div>
          <div class="popup-row__actions">
            <label class="switch"><input type="checkbox" data-toggle="${p.id}" ${p.active ? "checked" : ""}><i></i>${p.active ? "Encendido" : "Apagado"}</label>
            <button class="btn btn--sm" data-preview-popup="${p.id}">Vista previa</button>
            <a class="btn btn--sm" href="#popups/${encodeURIComponent(p.id)}">Editar</a>
            <button class="btn btn--sm btn--ghost" data-dup="${p.id}">Duplicar</button>
            <button class="btn btn--sm btn--ghost btn--danger" data-del="${p.id}">Eliminar</button>
          </div>
        </article>`;
    }).join("")}</div>` : `<div class="card empty">No hay popups. <a href="#popups/nuevo">Crea el primero</a>.</div>`}
    ${live ? `<p style="margin-top:16px"><a class="btn btn--sm" href="../?popup=preview" target="_blank" rel="noopener">Probar en el sitio →</a></p>` : ""}`;

  const save = (next, msg) => { if (!TZStore.savePopups(next)) return saveFailed(); toast(msg); viewPopups(view); };

  $$("[data-toggle]", view).forEach((c) =>
    c.addEventListener("change", () => {
      save(list.map((p) => (p.id === c.dataset.toggle ? { ...p, active: c.checked, updatedAt: Date.now() } : p)), c.checked ? "Popup encendido" : "Popup apagado");
    })
  );
  $$("[data-preview-popup]", view).forEach((b) =>
    b.addEventListener("click", () => previewPopup(list.find((p) => p.id === b.dataset.previewPopup)))
  );
  $$("[data-dup]", view).forEach((b) =>
    b.addEventListener("click", () => {
      const src = list.find((p) => p.id === b.dataset.dup);
      const copy = { ...src, id: TZUtil.uid(), title: src.title + " (copia)", active: false, updatedAt: Date.now() };
      save([...list, copy], "Popup duplicado (apagado)");
    })
  );
  $$("[data-del]", view).forEach((b) =>
    b.addEventListener("click", () => {
      const p = list.find((x) => x.id === b.dataset.del);
      if (confirm(`¿Eliminar el popup "${p.title}"?`)) save(list.filter((x) => x.id !== p.id), "Popup eliminado");
    })
  );
}

function previewPopup(p) {
  const el = TZPopup.open(p, { base: ROOT });
  el.querySelector("[data-tzp-cta]")?.addEventListener("click", (e) => e.preventDefault());
}

function viewPopupEditor(view, arg, draft) {
  const list = TZStore.popups();
  const isNew = arg === "nuevo";
  const existing = list.find((p) => p.id === decodeURIComponent(arg));
  if (!isNew && !existing) { location.hash = "#popups"; return; }

  const today = TZUtil.today();
  const in30 = dayKey(new Date(Date.now() + 30 * 86400000));
  const p = draft
    ? draft
    : existing
    ? { ...existing }
    : { id: TZUtil.uid(), active: true, theme: "classic", badge: "Novedad", title: "", text: "", code: "", ctaLabel: "Cotizar ahora", ctaLink: "#contacto", image: "", start: today, end: in30, delay: 2, frequency: "always" };

  $("#pageTitle").textContent = isNew ? "Nuevo popup" : "Editar popup";
  const v = (k) => esc(p[k] ?? "");

  view.innerHTML = `
    <p style="margin-bottom:16px"><a class="btn btn--sm btn--ghost" href="#popups">← Volver a popups</a></p>
    <div class="editor">
      <form class="card" id="popupForm" novalidate>
        <header class="card__head">
          <div><h2>Contenido del popup</h2><p>Lo que verá el visitante</p></div>
          <label class="switch"><input type="checkbox" name="active" ${p.active ? "checked" : ""}><i></i>Encendido</label>
        </header>
        <div class="card__body fields fields--2">
          <div class="field field--full">
            <span>Estilo</span>
            <div class="theme-pick">
              <label><input type="radio" name="theme" value="classic" ${p.theme !== "halloween" ? "checked" : ""}><i></i><span>Clásico Terramiz</span></label>
              <label><input type="radio" name="theme" value="halloween" ${p.theme === "halloween" ? "checked" : ""}><i class="h"></i><span>Halloween</span></label>
            </div>
          </div>
          <label class="field"><span>Etiqueta</span><input name="badge" value="${v("badge")}" placeholder="Ej. Promoción, Noticia"></label>
          <label class="field"><span>Título *</span><input name="title" value="${v("title")}" placeholder="Ej. 15% de descuento" required></label>
          <label class="field field--full"><span>Mensaje</span><textarea name="text" rows="3" placeholder="Describe la promoción o noticia">${v("text")}</textarea><span class="field__hint">Usa **palabra** para resaltar.</span></label>
          <label class="field"><span>Código de descuento</span><input name="code" value="${v("code")}" placeholder="Opcional"></label>
          <label class="field"><span>Texto del botón</span><input name="ctaLabel" value="${v("ctaLabel")}" placeholder="Opcional"></label>
          <label class="field field--full"><span>¿A dónde lleva el botón?</span>
            <select name="ctaLink">
              ${[["#contacto", "Formulario de contacto"], ["#productos", "Productos"], ["#servicios", "Acabados / servicios"], ["whatsapp", "WhatsApp"]]
                .map(([val, lab]) => `<option value="${val}" ${(p.ctaLink.startsWith("https://wa.me") ? "whatsapp" : p.ctaLink) === val ? "selected" : ""}>${lab}</option>`).join("")}
            </select>
          </label>
          <div class="field field--full">
            <span>Imagen (opcional)</span>
            <div class="img-field__actions">
              <label class="btn btn--sm" for="popupImg">${p.image ? "Cambiar imagen" : "Subir imagen"}</label>
              <input type="file" accept="image/*" id="popupImg" hidden>
              ${p.image ? '<button type="button" class="btn btn--sm btn--ghost btn--danger" id="popupImgDel">Quitar imagen</button>' : '<span class="field__hint">Se muestra arriba del texto</span>'}
            </div>
          </div>
        </div>
        <header class="card__head" style="border-top:1px solid var(--line)"><div><h2>Cuándo se muestra</h2></div></header>
        <div class="card__body fields fields--2">
          <label class="field"><span>Desde</span><input type="date" name="start" value="${v("start")}"></label>
          <label class="field"><span>Hasta</span><input type="date" name="end" value="${v("end")}"></label>
          <label class="field"><span>Aparece después de (segundos)</span><input type="number" name="delay" min="0" max="60" value="${v("delay")}"></label>
          <label class="field"><span>Frecuencia</span>
            <select name="frequency">
              <option value="always" ${p.frequency !== "session" ? "selected" : ""}>Cada vez que se entra o recarga</option>
              <option value="session" ${p.frequency === "session" ? "selected" : ""}>Una vez por visita</option>
            </select>
          </label>
          <div class="form-actions field--full">
            ${isNew ? "" : '<button type="button" class="btn btn--ghost btn--danger" id="popupDel" style="margin-right:auto">Eliminar</button>'}
            <a class="btn" href="#popups">Cancelar</a>
            <button class="btn btn--gold" type="submit">${isNew ? "Crear popup" : "Guardar cambios"}</button>
          </div>
        </div>
      </form>

      <div class="preview-stage" id="stage"></div>
    </div>`;

  const form = $("#popupForm");
  const read = () => {
    const d = Object.fromEntries(new FormData(form));
    const link = d.ctaLink === "whatsapp" ? `https://wa.me/${TZStore.get("contact.whatsapp").replace(/\D/g, "")}` : d.ctaLink;
    return { ...p, ...d, ctaLink: link, active: form.active.checked, delay: Math.max(0, Number(d.delay) || 0) };
  };
  const renderStage = () => {
    const d = read();
    $("#stage").innerHTML = `<span class="preview-stage__label">Vista previa</span>` +
      TZPopup.html({ ...d, title: d.title || "Título del popup" }, ROOT);
    const el = $("#stage .tzp");
    el.classList.add("is-open");
    $$("[data-tzp-close], [data-tzp-cta]", el).forEach((b) => b.addEventListener("click", (e) => e.preventDefault()));
  };
  renderStage();
  form.addEventListener("input", renderStage);
  form.addEventListener("change", renderStage);

  $("#popupImg").addEventListener("change", async (e) => {
    try {
      const image = await compressImage(e.target.files[0], 900, 0.78);
      viewPopupEditor(view, arg, { ...read(), image });
    } catch (err) { toast(err.message, "error"); }
  });
  $("#popupImgDel")?.addEventListener("click", () => {
    viewPopupEditor(view, arg, { ...read(), image: "" });
  });
  $("#popupDel")?.addEventListener("click", () => {
    if (!confirm(`¿Eliminar el popup "${p.title}"?`)) return;
    TZStore.savePopups(list.filter((x) => x.id !== p.id));
    toast("Popup eliminado");
    location.hash = "#popups";
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const d = read();
    if (!d.title.trim()) { form.title.focus(); return toast("Ponle un título al popup", "error"); }
    if (d.start && d.end && d.end < d.start) { form.end.focus(); return toast("La fecha final es antes de la inicial", "error"); }
    d.updatedAt = Date.now();
    const next = isNew ? [d, ...list] : list.map((x) => (x.id === d.id ? d : x));
    if (!TZStore.savePopups(next)) return saveFailed();
    toast(isNew ? "Popup creado" : "Cambios guardados");
    location.hash = "#popups";
  });
}

/* =========================================================
   Vista: Mensajes
   ========================================================= */
let msgFilter = "all";
function viewMensajes(view) {
  const all = TZStore.messages();
  const list = msgFilter === "new" ? all.filter((m) => !m.read) : all;
  const unread = all.filter((m) => !m.read).length;
  const waNumber = (phone) => {
    const d = String(phone).replace(/\D/g, "");
    return d.length === 10 ? "52" + d : d;
  };

  view.innerHTML = `
    <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-bottom:20px">
      <div class="tabs" style="margin:0">
        <button data-filter="all" class="${msgFilter === "all" ? "is-active" : ""}">Todos (${all.length})</button>
        <button data-filter="new" class="${msgFilter === "new" ? "is-active" : ""}">Sin leer (${unread})</button>
      </div>
      <span style="flex:1"></span>
      ${unread ? '<button class="btn btn--sm" id="readAll">Marcar todo como leído</button>' : ""}
      ${all.length ? '<button class="btn btn--sm" id="csv">Descargar Excel (CSV)</button>' : ""}
    </div>
    <section class="card">
      ${list.length ? `
        <div class="table-wrap"><table>
          <thead><tr><th>Fecha</th><th>Cliente</th><th>Interés</th><th>Mensaje</th><th></th></tr></thead>
          <tbody>${list.map((m) => `
            <tr class="${m.read ? "" : "is-new"}">
              <td><strong style="font-weight:500">${fmtDate(m.date, { day: "numeric", month: "short" })}</strong><br><span class="field__hint">${timeAgo(m.date)}</span></td>
              <td>${esc(m.name)}${m.demo ? ' <span class="pill pill--plain">Demo</span>' : ""}<br><span class="field__hint">${esc(m.phone)}</span></td>
              <td><span class="pill pill--plain">${esc(m.interest)}</span></td>
              <td class="msg">${esc(m.message)}</td>
              <td class="actions">
                <a class="btn btn--sm btn--dark" href="https://wa.me/${waNumber(m.phone)}?text=${encodeURIComponent(`Hola ${m.name}, gracias por escribir a Terramiz.`)}" target="_blank" rel="noopener" data-mark="${m.id}">${ICON.wa} Responder</a>
                <button class="btn btn--sm btn--ghost" data-read="${m.id}">${m.read ? "Marcar no leído" : "Marcar leído"}</button>
                <button class="btn btn--sm btn--ghost btn--danger" data-delmsg="${m.id}" aria-label="Eliminar mensaje">Eliminar</button>
              </td>
            </tr>`).join("")}
          </tbody>
        </table></div>` : `<p class="empty">${msgFilter === "new" ? "No hay mensajes sin leer." : "Aún no llegan mensajes. Aparecerán aquí cuando alguien use el formulario de contacto del sitio."}</p>`}
    </section>`;

  const rerender = () => { updateBadge(); viewMensajes(view); };
  $$("[data-filter]", view).forEach((b) => b.addEventListener("click", () => { msgFilter = b.dataset.filter; rerender(); }));
  $$("[data-read]", view).forEach((b) => b.addEventListener("click", () => {
    const m = all.find((x) => x.id === b.dataset.read);
    TZStore.updateMessage(m.id, { read: !m.read });
    rerender();
  }));
  $$("[data-mark]", view).forEach((a) => a.addEventListener("click", () => { TZStore.updateMessage(a.dataset.mark, { read: true }); setTimeout(rerender, 100); }));
  $$("[data-delmsg]", view).forEach((b) => b.addEventListener("click", () => {
    if (!confirm("¿Eliminar este mensaje?")) return;
    TZStore.deleteMessage(b.dataset.delmsg);
    toast("Mensaje eliminado");
    rerender();
  }));
  $("#readAll", view)?.addEventListener("click", () => { all.forEach((m) => TZStore.updateMessage(m.id, { read: true })); rerender(); });
  $("#csv", view)?.addEventListener("click", () => {
    const rows = [["Fecha", "Nombre", "Teléfono", "Interés", "Mensaje", "Leído"],
      ...all.map((m) => [new Date(m.date).toLocaleString("es-MX"), m.name, m.phone, m.interest, m.message, m.read ? "Sí" : "No"])];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    download(`terramiz-mensajes-${TZUtil.today()}.csv`, "﻿" + csv, "text/csv");
  });
}

function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* =========================================================
   Vista: Ajustes
   ========================================================= */
function viewAjustes(view) {
  const used = TZStore.usageBytes();
  const pct = Math.min(100, (used / STORAGE_LIMIT) * 100);
  const demo = TZStore.raw().demo;

  view.innerHTML = `
    <div class="grid grid--2">
      <section class="card">
        <header class="card__head"><div><h2>Respaldo</h2><p>Descarga o recupera toda la información del sitio</p></div></header>
        <div class="card__body stack">
          <div>
            <div class="meter ${pct > 80 ? "meter--warn" : ""}"><span style="width:${Math.max(pct, 1)}%"></span></div>
            <p class="meter__meta"><span>${fmtKB(used)} usados de ~5 MB</span><span>${pct.toFixed(0)}%</span></p>
          </div>
          <p class="field__hint">Esta demo guarda todo en este navegador. Descarga un respaldo antes de borrar el historial o de cambiar de computadora; al pasar a hosting, este mismo archivo se puede importar a la base de datos.</p>
          <div class="img-field__actions">
            <button class="btn btn--dark" id="exportBtn">Descargar respaldo</button>
            <label class="btn" for="importFile">Importar respaldo</label>
            <input type="file" id="importFile" accept="application/json,.json" hidden>
          </div>
        </div>
      </section>

      <section class="card">
        <header class="card__head"><div><h2>Datos de demostración</h2><p>Visitas y mensajes de ejemplo</p></div></header>
        <div class="card__body stack">
          <p class="field__hint">${demo
            ? "Ahora mismo el resumen incluye visitas, mensajes y clics de ejemplo para mostrar cómo se ve el panel con actividad."
            : "Los datos de ejemplo están desactivados; sólo ves la actividad real del sitio."}</p>
          <div>${demo
            ? '<button class="btn" id="demoOff">Quitar datos de demostración</button>'
            : '<button class="btn" id="demoOn">Volver a cargar datos de ejemplo</button>'}</div>
        </div>
      </section>

      <section class="card">
        <header class="card__head"><div><h2>Acceso</h2><p>Inicio de sesión del panel</p></div></header>
        <div class="card__body stack">
          <p class="field__hint">En la demo el botón “Entrar” no pide contraseña. Cuando el sitio tenga hosting se agregará usuario y contraseña reales.</p>
          <p class="stat-row"><span>Dirección del panel</span><strong>terramiz.com/admin</strong></p>
        </div>
      </section>

      <section class="card">
        <header class="card__head"><div><h2>Restablecer</h2><p>Cuidado: estas acciones no se pueden deshacer</p></div></header>
        <div class="card__body stack">
          <div class="img-field__actions">
            <button class="btn btn--danger" id="resetContent">Restaurar textos e imágenes originales</button>
            <button class="btn btn--danger" id="resetAll">Borrar toda la información</button>
          </div>
        </div>
      </section>
    </div>`;

  $("#exportBtn").addEventListener("click", () => {
    download(`terramiz-respaldo-${TZUtil.today()}.json`, TZStore.exportJSON(), "application/json");
    toast("Respaldo descargado");
  });
  $("#importFile").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      if (!confirm("Esto reemplazará la información actual con la del respaldo. ¿Continuar?")) return;
      if (!TZStore.importJSON(text)) return saveFailed();
      toast("Respaldo importado");
      route();
    } catch {
      toast("El archivo no es un respaldo válido", "error");
    }
  });
  $("#demoOff")?.addEventListener("click", () => { clearDemo(); toast("Datos de demostración eliminados"); route(); });
  $("#demoOn")?.addEventListener("click", () => {
    TZStore.replaceAll({ ...TZStore.raw(), demoCleared: false });
    seedDemo();
    toast("Datos de ejemplo cargados");
    route();
  });
  $("#resetContent").addEventListener("click", () => {
    if (!confirm("Se perderán todos los textos e imágenes que hayas cambiado. ¿Continuar?")) return;
    TZStore.replaceAll({ ...TZStore.raw(), content: {} });
    toast("Contenido original restaurado");
  });
  $("#resetAll").addEventListener("click", () => {
    if (!confirm("Se borrarán textos, imágenes, popups, mensajes y estadísticas. ¿Continuar?")) return;
    TZStore.resetAll();
    toast("Información borrada");
    route();
  });
}

/* ---------- Arranque ---------- */
if (isAuthed()) showApp();
else showLogin();
