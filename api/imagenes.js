/* =========================================================
   Imágenes subidas desde el panel
   ---------------------------------------------------------
   GET /api/imagenes/?id=…   → la imagen (público)
   Se guardan al editar textos/imágenes o popups (ver lib/db.js).
   ========================================================= */

import { sql, route, notAllowed } from "../lib/db.js";

export default route(async (req, res) => {
  if (req.method !== "GET") return notAllowed(res, "GET");

  const id = String(req.query.id || "");
  const rows = /^[a-f0-9]{32}$/.test(id) ? await sql`SELECT tipo, datos FROM imagenes WHERE id = ${id}` : [];
  if (!rows.length) return res.status(404).json({ error: "No existe la imagen." });

  // Cada imagen nueva tiene un id nuevo, así que se puede guardar en caché para siempre
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.setHeader("Content-Type", rows[0].tipo);
  return res.status(200).send(Buffer.from(rows[0].datos, "base64"));
});
