/* =========================================================
   Código compartido por las funciones de /api
   ---------------------------------------------------------
   Variables de entorno (Vercel → Settings → Environment Variables):
     DATABASE_URL     la crea la integración de Neon/Postgres
     ADMIN_PASSWORD   contraseña del panel /admin
   ========================================================= */

import { neon } from "@neondatabase/serverless";
import { timingSafeEqual } from "node:crypto";

export const sql = neon(process.env.DATABASE_URL || process.env.POSTGRES_URL);

// Zona horaria para agrupar visitas por día
export const TZ = "America/Mexico_City";

// Crea las tablas la primera vez que se usa cada función
const schema = () => [
  sql`CREATE TABLE IF NOT EXISTS mensajes (
        id         SERIAL PRIMARY KEY,
        name       TEXT NOT NULL,
        phone      TEXT NOT NULL,
        interest   TEXT NOT NULL DEFAULT '',
        message    TEXT NOT NULL,
        channel    TEXT NOT NULL DEFAULT 'web',
        read       BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
  sql`CREATE TABLE IF NOT EXISTS contenido (
        clave      TEXT PRIMARY KEY,
        valor      TEXT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
  sql`CREATE TABLE IF NOT EXISTS ajustes (
        clave      TEXT PRIMARY KEY,
        valor      JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
  sql`CREATE TABLE IF NOT EXISTS imagenes (
        id         TEXT PRIMARY KEY,
        tipo       TEXT NOT NULL,
        datos      TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
  sql`CREATE TABLE IF NOT EXISTS estadisticas (
        dia   DATE NOT NULL,
        tipo  TEXT NOT NULL,
        ref   TEXT NOT NULL DEFAULT '',
        total INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (dia, tipo, ref)
      )`,
];

let ready;
export const ensureSchema = () =>
  (ready ??= sql.transaction(schema()).catch((err) => { ready = null; throw err; }));

export function isAdmin(req) {
  const expected = process.env.ADMIN_PASSWORD || "";
  const given = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!expected || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Envuelve un handler: cabeceras, tablas y errores en un solo lugar
export const route = (fn) => async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  try {
    await ensureSchema();
    return await fn(req, res);
  } catch (err) {
    console.error(req.url, err);
    return res.status(500).json({ error: "Error del servidor." });
  }
};

export const deny = (res) => res.status(401).json({ error: "No autorizado." });
export const notAllowed = (res, allow) => {
  res.setHeader("Allow", allow);
  return res.status(405).json({ error: "Método no permitido." });
};

/* ---------- Imágenes subidas desde el panel ---------- */
export const IMG_PREFIX = "/api/imagenes/?id=";
const DATA_URL = /^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=]+)$/;
const IMG_MAX_BYTES = 3 * 1024 * 1024;

export async function saveImage(dataUrl) {
  const m = DATA_URL.exec(dataUrl || "");
  if (!m) throw Object.assign(new Error("Imagen inválida"), { status: 400 });
  if (m[2].length * 0.75 > IMG_MAX_BYTES) throw Object.assign(new Error("La imagen es muy pesada"), { status: 413 });
  const id = crypto.randomUUID().replace(/-/g, "");
  await sql`INSERT INTO imagenes (id, tipo, datos) VALUES (${id}, ${m[1]}, ${m[2]})`;
  return IMG_PREFIX + id;
}

// Si un valor viene como data:image (respaldos viejos), lo guarda y devuelve su URL
export const storeIfDataUrl = async (v) => (typeof v === "string" && v.startsWith("data:image/") ? saveImage(v) : v);

const imageId = (v) => (typeof v === "string" && v.startsWith(IMG_PREFIX) ? v.slice(IMG_PREFIX.length) : null);

// Borra imágenes que ya no usa ningún texto ni popup (deja un día de margen
// para las que se acaban de subir en un popup que todavía no se guarda)
export async function cleanupImages() {
  const [content, popups] = await Promise.all([
    sql`SELECT valor FROM contenido`,
    sql`SELECT valor FROM ajustes WHERE clave = 'popups'`,
  ]);
  const used = [
    ...content.map((r) => imageId(r.valor)),
    ...(popups[0]?.valor || []).map((p) => imageId(p.image)),
  ].filter(Boolean);
  await sql`DELETE FROM imagenes WHERE created_at < NOW() - INTERVAL '1 day' AND NOT (id = ANY(${used}))`;
}

/* ---------- Lecturas comunes ---------- */
export async function readSite() {
  const [content, popups] = await Promise.all([
    sql`SELECT clave, valor FROM contenido`,
    sql`SELECT valor FROM ajustes WHERE clave = 'popups'`,
  ]);
  return {
    content: Object.fromEntries(content.map((r) => [r.clave, r.valor])),
    popups: popups[0]?.valor ?? null, // null = nunca se han editado (el sitio usa los de fábrica)
  };
}

export async function readStats() {
  const rows = await sql`SELECT dia::text AS dia, tipo, ref, total FROM estadisticas`;
  const stats = { visits: {}, popupViews: {}, popupClicks: {} };
  const buckets = { popupView: stats.popupViews, popupClick: stats.popupClicks };
  for (const r of rows) {
    if (r.tipo === "visit") stats.visits[r.dia] = (stats.visits[r.dia] || 0) + r.total;
    else if (buckets[r.tipo]) buckets[r.tipo][r.ref] = (buckets[r.tipo][r.ref] || 0) + r.total;
  }
  return stats;
}

export async function savePopups(list) {
  const clean = await Promise.all(
    list.map(async (p) => ({ ...p, image: await storeIfDataUrl(p.image || "") }))
  );
  await sql`
    INSERT INTO ajustes (clave, valor) VALUES ('popups', ${JSON.stringify(clean)}::jsonb)
    ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor, updated_at = NOW()`;
  return clean;
}
