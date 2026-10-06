/* =========================================================
   Respaldo y mantenimiento del panel (sólo admin)
   ---------------------------------------------------------
   GET  /api/admin/                         → respaldo completo (JSON)
   POST /api/admin/ { action: "import", data }   → importa un respaldo
   POST /api/admin/ { action: "resetContent" }   → textos e imágenes originales
   POST /api/admin/ { action: "resetAll" }       → borra toda la información
   ========================================================= */

import { sql, route, isAdmin, deny, notAllowed, readSite, readStats, savePopups, storeIfDataUrl, cleanupImages } from "../lib/db.js";

export default route(async (req, res) => {
  if (!isAdmin(req)) return deny(res);

  if (req.method === "GET") {
    const [site, stats, messages, images] = await Promise.all([
      readSite(),
      readStats(),
      sql`SELECT name, phone, interest, message, channel, read, created_at FROM mensajes ORDER BY created_at`,
      sql`SELECT id, tipo, datos FROM imagenes`,
    ]);
    // Las imágenes van dentro del respaldo para que sea completo
    const inline = Object.fromEntries(images.map((i) => [`/api/imagenes/?id=${i.id}`, `data:${i.tipo};base64,${i.datos}`]));
    const content = Object.fromEntries(Object.entries(site.content).map(([k, v]) => [k, inline[v] || v]));
    const popups = site.popups && site.popups.map((p) => ({ ...p, image: inline[p.image] || p.image }));
    return res.status(200).json({ version: 2, exportedAt: new Date().toISOString(), content, popups, stats, messages });
  }

  if (req.method !== "POST") return notAllowed(res, "GET, POST");
  const { action, data } = req.body || {};

  if (action === "resetContent") {
    await sql`DELETE FROM contenido`;
    await cleanupImages();
    return res.status(200).json({ ok: true });
  }

  if (action === "resetAll") {
    await sql.transaction([
      sql`DELETE FROM contenido`,
      sql`DELETE FROM ajustes`,
      sql`DELETE FROM estadisticas`,
      sql`DELETE FROM mensajes`,
      sql`DELETE FROM imagenes`,
    ]);
    return res.status(200).json({ ok: true });
  }

  if (action === "import") {
    // Acepta respaldos de esta versión y los de la versión anterior (guardados en el navegador)
    if (!data || typeof data !== "object") return res.status(400).json({ error: "Respaldo inválido." });

    for (const [k, raw] of Object.entries(data.content || {})) {
      if (!/^[a-z0-9._-]{1,80}$/i.test(k) || typeof raw !== "string") continue;
      const v = await storeIfDataUrl(raw);
      await sql`
        INSERT INTO contenido (clave, valor) VALUES (${k}, ${v})
        ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor, updated_at = NOW()`;
    }

    if (Array.isArray(data.popups)) await savePopups(data.popups);

    const messages = (Array.isArray(data.messages) ? data.messages : []).filter((m) => !m.demo && m.name && m.message);
    for (const m of messages) {
      await sql`
        INSERT INTO mensajes (name, phone, interest, message, channel, read, created_at)
        SELECT ${m.name}, ${m.phone || ""}, ${m.interest || ""}, ${m.message}, ${m.channel || "web"}, ${!!m.read}, ${m.created_at || m.date || new Date().toISOString()}
        WHERE NOT EXISTS (SELECT 1 FROM mensajes WHERE name = ${m.name} AND message = ${m.message})`;
    }

    await cleanupImages();
    return res.status(200).json({ ok: true, imported: { content: Object.keys(data.content || {}).length, popups: data.popups?.length || 0, messages: messages.length } });
  }

  return res.status(400).json({ error: "Acción desconocida." });
});
