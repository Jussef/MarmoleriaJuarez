/* =========================================================
   Galería: filtros por categoría, "ver más" y visor de fotos.
   Las fotos vienen de js/galeria-data.js (tools/galeria.py).
   ========================================================= */

(() => {
  const data = window.TZ_GALERIA;
  const grid = document.getElementById("galleryGrid");
  if (!data || !grid) return;

  const PAGE = 12;
  const filters = document.getElementById("galleryFilters");
  const moreBtn = document.getElementById("galleryMore");
  const lightbox = document.getElementById("lightbox");
  const lbImg = document.getElementById("lightboxImg");
  const lbCaption = document.getElementById("lightboxCaption");
  const labels = Object.fromEntries(data.categories.map((c) => [c.id, c.label]));

  let current = "all";
  let shown = 0;
  let index = 0;
  let lastFocus = null;

  // Mezcla las categorías en "Todas" para que no salgan todas las de un tipo juntas
  const mixed = (() => {
    const queues = data.categories.map((c) => data.photos.filter((p) => p.cat === c.id));
    const out = [];
    while (queues.some((q) => q.length)) queues.forEach((q) => q.length && out.push(q.shift()));
    return out;
  })();

  const list = () => (current === "all" ? mixed : data.photos.filter((p) => p.cat === current));

  // ---------- Filtros ----------
  const chip = (id, label, count) =>
    `<button type="button" class="chip${id === current ? " is-active" : ""}" data-cat="${id}" aria-pressed="${id === current}">${label}<span>${count}</span></button>`;

  filters.innerHTML =
    chip("all", "Todas", data.photos.length) +
    data.categories
      .map((c) => chip(c.id, c.label, data.photos.filter((p) => p.cat === c.id).length))
      .join("");

  filters.addEventListener("click", (e) => {
    const btn = e.target.closest(".chip");
    if (!btn || btn.dataset.cat === current) return;
    current = btn.dataset.cat;
    filters.querySelectorAll(".chip").forEach((b) => {
      const on = b === btn;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-pressed", String(on));
    });
    grid.innerHTML = "";
    shown = 0;
    render();
  });

  // ---------- Cuadrícula ----------
  function render() {
    const photos = list();
    const next = photos.slice(shown, shown + PAGE);
    grid.insertAdjacentHTML(
      "beforeend",
      next
        .map(
          (p, i) => `
        <button type="button" class="gallery__item" data-i="${shown + i}" style="animation-delay:${i * 40}ms">
          <img src="${p.sm}" width="${p.w}" height="${p.h}" alt="${labels[p.cat]}" loading="lazy" decoding="async">
        </button>`
        )
        .join("")
    );
    shown += next.length;
    moreBtn.hidden = shown >= photos.length;
  }

  moreBtn.addEventListener("click", render);

  grid.addEventListener("click", (e) => {
    const item = e.target.closest(".gallery__item");
    if (item) open(Number(item.dataset.i));
  });

  // ---------- Visor ----------
  function show(i) {
    const photos = list();
    index = (i + photos.length) % photos.length;
    const p = photos[index];
    lbImg.src = p.lg;
    lbImg.alt = labels[p.cat];
    lbCaption.textContent = `${labels[p.cat]} · ${index + 1} / ${photos.length}`;
    // Precarga la siguiente
    new Image().src = photos[(index + 1) % photos.length].lg;
  }

  function open(i) {
    lastFocus = document.activeElement;
    show(i);
    lightbox.hidden = false;
    document.body.style.overflow = "hidden";
    lightbox.querySelector(".lightbox__close").focus();
  }

  function close() {
    lightbox.hidden = true;
    lbImg.removeAttribute("src");
    document.body.style.overflow = "";
    lastFocus?.focus();
  }

  lightbox.addEventListener("click", (e) => {
    const action = e.target.closest("[data-lb]")?.dataset.lb;
    if (action === "prev") show(index - 1);
    else if (action === "next") show(index + 1);
    else if (action === "close" || e.target === lightbox) close();
  });

  document.addEventListener("keydown", (e) => {
    if (lightbox.hidden) return;
    if (e.key === "Escape") close();
    else if (e.key === "ArrowLeft") show(index - 1);
    else if (e.key === "ArrowRight") show(index + 1);
  });

  // Deslizar en móvil
  let touchX = null;
  lightbox.addEventListener("touchstart", (e) => (touchX = e.touches[0].clientX), { passive: true });
  lightbox.addEventListener("touchend", (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) show(index + (dx < 0 ? 1 : -1));
    touchX = null;
  });

  render();
})();
