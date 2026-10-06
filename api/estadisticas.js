/* =========================================================
   Estadísticas: visitas y vistas/clics de popups
   ---------------------------------------------------------
   POST /api/estadisticas/  → { type: "visit"|"popupView"|"popupClick", id? }  (público)
   GET  /api/estadisticas/  → { visits, popupViews, popupClicks }             (admin)
   ========================================================= */

import { sql, route, isAdmin, deny, notAllowed, readStats, TZ } from "../lib/db.js";

const TYPES = ["visit", "popupView", "popupClick"];

export default route(async (req, res) => {
  if (req.method === "POST") {
    // sendBeacon puede mandar el cuerpo como texto
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    if (!TYPES.includes(body.type)) return res.status(400).json({ error: "Tipo inválido." });
    const ref = body.type === "visit" ? "" : String(body.id || "").slice(0, 80);
    await sql`
      INSERT INTO estadisticas (dia, tipo, ref, total)
      VALUES ((NOW() AT TIME ZONE ${TZ})::date, ${body.type}, ${ref}, 1)
      ON CONFLICT (dia, tipo, ref) DO UPDATE SET total = estadisticas.total + 1`;
    return res.status(204).end();
  }

  if (req.method !== "GET") return notAllowed(res, "GET, POST");
  if (!isAdmin(req)) return deny(res);
  return res.status(200).json(await readStats());
});
