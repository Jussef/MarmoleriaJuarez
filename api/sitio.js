/* =========================================================
   Contenido del sitio (textos, imágenes y popups)
   ---------------------------------------------------------
   GET  /api/sitio/   → { content, popups }            (público)
   PUT  /api/sitio/   → { content: { clave: valor|null }, popups?: [...] } (admin)
                        valor null = volver al texto/imagen original
   ========================================================= */

import { sql, route, isAdmin, deny, notAllowed, readSite, savePopups, storeIfDataUrl, cleanupImages } from "../lib/db.js";

const MAX_VALUE = 20000;

export default route(async (req, res) => {
  if (req.method === "GET") return res.status(200).json(await readSite());

  if (req.method !== "PUT") return notAllowed(res, "GET, PUT");
  if (!isAdmin(req)) return deny(res);

  const { content, popups } = req.body || {};

  if (content && typeof content === "object") {
    for (const [k, raw] of Object.entries(content)) {
      if (!/^[a-z0-9._-]{1,80}$/i.test(k)) return res.status(400).json({ error: `Clave inválida: ${k}` });
      if (raw === null) {
        await sql`DELETE FROM contenido WHERE clave = ${k}`;
        continue;
      }
      const v = await storeIfDataUrl(String(raw));
      if (v.length > MAX_VALUE) return res.status(400).json({ error: "El texto es demasiado largo." });
      await sql`
        INSERT INTO contenido (clave, valor) VALUES (${k}, ${v})
        ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor, updated_at = NOW()`;
    }
  }

  if (popups !== undefined) {
    if (!Array.isArray(popups)) return res.status(400).json({ error: "Popups inválidos." });
    await savePopups(popups);
  }

  await cleanupImages();
  return res.status(200).json(await readSite());
});
