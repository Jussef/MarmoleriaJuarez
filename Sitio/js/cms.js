/* =========================================================
   Aplica al sitio el contenido administrado desde /admin
   (textos, imágenes, datos de contacto y popups)
   ========================================================= */

function tzApplyContent() {
  document.querySelectorAll("[data-cms]").forEach((el) => {
    el.innerHTML = TZUtil.rich(TZStore.get(el.dataset.cms));
  });

  document.querySelectorAll("[data-cms-src]").forEach((img) => {
    const src = TZStore.get(img.dataset.cmsSrc);
    if (img.getAttribute("src") !== src) img.src = src;
  });

  // Fondo del banner: sólo se sobreescribe si el cliente subió otra imagen
  document.querySelectorAll("[data-cms-bg]").forEach((el) => {
    const key = el.dataset.cmsBg;
    if (TZStore.isCustom(key)) el.style.setProperty("--hero-img", `url("${TZStore.get(key)}")`);
    else el.style.removeProperty("--hero-img");
  });

  const wa = TZStore.get("contact.whatsapp").replace(/\D/g, "");
  document.querySelectorAll("[data-cms-wa]").forEach((a) => (a.href = `https://wa.me/${wa}`));

  const mail = TZStore.get("contact.email");
  document.querySelectorAll("[data-cms-mail]").forEach((a) => {
    a.href = `mailto:${mail}`;
    a.textContent = mail;
  });
}

function tzMaybeShowPopup() {
  // ?popup=preview muestra el popup activo aunque ya se haya cerrado en esta visita
  const preview = new URLSearchParams(location.search).get("popup") === "preview";
  const popup = TZStore.activePopup();
  if (!popup) return;

  const seenKey = `tz-popup-seen:${popup.id}:${popup.updatedAt}`;
  if (!preview && popup.frequency !== "always") {
    try { if (sessionStorage.getItem(seenKey)) return; } catch {}
  }

  setTimeout(() => {
    TZPopup.open(popup, { onCta: () => TZStore.track("popupClick", popup.id) });
    TZStore.track("popupView", popup.id);
    try { sessionStorage.setItem(seenKey, "1"); } catch {}
  }, preview ? 300 : (Number(popup.delay) || 0) * 1000);
}

function tzTrackVisit() {
  try {
    if (sessionStorage.getItem("tz-visit")) return;
    sessionStorage.setItem("tz-visit", "1");
  } catch {}
  TZStore.track("visit");
}

tzApplyContent();
tzTrackVisit();
tzMaybeShowPopup();

// Si el admin está abierto en otra pestaña, los cambios se ven al instante
window.addEventListener("storage", (e) => {
  if (e.key !== TZStore.KEY) return;
  TZStore.reload();
  tzApplyContent();
});
