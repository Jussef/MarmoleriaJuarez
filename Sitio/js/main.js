const header = document.getElementById("header");
const nav = document.getElementById("nav");
const burger = document.getElementById("burger");
const mobileQuery = window.matchMedia("(max-width: 1080px)");

document.getElementById("year").textContent = new Date().getFullYear();

// Sombra del header al hacer scroll
const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 10);
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

// Menú móvil
function setMenu(open) {
  nav.classList.toggle("is-open", open);
  burger.setAttribute("aria-expanded", String(open));
  burger.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
  document.body.style.overflow = open ? "hidden" : "";
}

burger.addEventListener("click", () => setMenu(!nav.classList.contains("is-open")));

nav.addEventListener("click", (e) => {
  const link = e.target.closest("a");
  if (!link) return;

  // En móvil, el primer toque en "Productos"/"Servicios" despliega el submenú
  const dropItem = link.parentElement.classList.contains("nav__item--drop") ? link.parentElement : null;
  if (dropItem && mobileQuery.matches) {
    e.preventDefault();
    dropItem.classList.toggle("is-open");
    return;
  }
  setMenu(false);
});

mobileQuery.addEventListener("change", () => setMenu(false));

// Enlace activo según la sección visible
const navLinks = [...document.querySelectorAll(".nav__link")];
const sections = navLinks
  .map((a) => document.querySelector(a.getAttribute("href")))
  .filter(Boolean);

const sectionObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const id = "#" + entry.target.id;
      navLinks.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === id));
    });
  },
  { rootMargin: "-45% 0px -50% 0px" }
);
sections.forEach((s) => sectionObserver.observe(s));

// Aparición al hacer scroll
const revealObserver = new IntersectionObserver(
  (entries, obs) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      obs.unobserve(entry.target);
    });
  },
  { threshold: 0.12 }
);
document.querySelectorAll(".reveal").forEach((el) => revealObserver.observe(el));

// Formulario: arma el mensaje y lo abre en WhatsApp
const form = document.getElementById("contactForm");
const formMsg = document.getElementById("formMsg");

form.addEventListener("submit", (e) => {
  e.preventDefault();

  const required = [...form.querySelectorAll("[required]")];
  required.forEach((f) => f.classList.toggle("is-invalid", !f.value.trim()));
  const firstInvalid = required.find((f) => !f.value.trim());
  if (firstInvalid) {
    formMsg.textContent = "Por favor completa los campos marcados.";
    firstInvalid.focus();
    return;
  }

  const data = new FormData(form);
  TZStore.addMessage({
    name: data.get("nombre"),
    phone: data.get("telefono"),
    interest: data.get("servicio"),
    message: data.get("mensaje"),
  });

  const text =
    `Hola Terramiz, me interesa cotizar un proyecto.\n\n` +
    `Nombre: ${data.get("nombre")}\n` +
    `Teléfono: ${data.get("telefono")}\n` +
    `Interés: ${data.get("servicio")}\n\n` +
    `${data.get("mensaje")}`;

  const whatsapp = TZStore.get("contact.whatsapp").replace(/\D/g, "");
  window.open(`https://wa.me/${whatsapp}?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  formMsg.textContent = "¡Gracias! Te estamos redirigiendo a WhatsApp.";
  form.reset();
});

form.addEventListener("input", (e) => {
  if (e.target.value.trim()) e.target.classList.remove("is-invalid");
});
