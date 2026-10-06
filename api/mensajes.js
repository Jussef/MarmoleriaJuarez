/* =========================================================
   Mensajes del formulario de contacto
   ---------------------------------------------------------
   POST   /api/mensajes/             → guarda un mensaje (público)
   GET    /api/mensajes/             → lista los mensajes (admin)
   PATCH  /api/mensajes/             → { ids: [...], read: true|false } (admin)
   DELETE /api/mensajes/?id=123      → elimina un mensaje (admin)
   ========================================================= */

import { sql, route, isAdmin, deny, notAllowed } from "../lib/db.js";

const LIMITS = { name: 120, phone: 40, interest: 80, message: 3000 };
const CHANNELS = ["web", "whatsapp"];

const clean = (v, max) => String(v ?? "").trim().slice(0, max);

const toJSON = (r) => ({
  id: String(r.id),
  name: r.name,
  phone: r.phone,
  interest: r.interest,
  message: r.message,
  channel: r.channel,
  read: r.read,
  date: new Date(r.created_at).toISOString(),
});

export default route(async (req, res) => {
  if (req.method === "POST") {
    const body = req.body || {};
    if (body.website) return res.status(201).json({ ok: true }); // campo trampa: sólo lo llenan bots

    const name = clean(body.nombre, LIMITS.name);
    const phone = clean(body.telefono, LIMITS.phone);
    const interest = clean(body.servicio, LIMITS.interest);
    const message = clean(body.mensaje, LIMITS.message);
    const channel = CHANNELS.includes(body.canal) ? body.canal : "web";

    if (!name || !phone || !message) return res.status(400).json({ error: "Faltan campos obligatorios." });

    await sql`
      INSERT INTO mensajes (name, phone, interest, message, channel)
      VALUES (${name}, ${phone}, ${interest}, ${message}, ${channel})`;
    return res.status(201).json({ ok: true });
  }

  if (!isAdmin(req)) return deny(res);

  if (req.method === "GET") {
    const rows = await sql`SELECT * FROM mensajes ORDER BY created_at DESC LIMIT 1000`;
    return res.status(200).json({ messages: rows.map(toJSON) });
  }

  if (req.method === "PATCH") {
    const { ids, read } = req.body || {};
    const list = (Array.isArray(ids) ? ids : []).map(Number).filter(Number.isInteger);
    if (!list.length || typeof read !== "boolean") return res.status(400).json({ error: "Datos inválidos." });
    await sql`UPDATE mensajes SET read = ${read} WHERE id = ANY(${list})`;
    return res.status(200).json({ ok: true });
  }

  if (req.method === "DELETE") {
    const id = Number(req.query.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: "Falta el id." });
    await sql`DELETE FROM mensajes WHERE id = ${id}`;
    return res.status(200).json({ ok: true });
  }

  return notAllowed(res, "GET, POST, PATCH, DELETE");
});
