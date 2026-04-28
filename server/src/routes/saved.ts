import { Elysia } from "elysia";
import { jwt } from "@elysiajs/jwt";
import db from "../db";
import { requireAuth } from "../utils/auth";

const savedRoutes = new Elysia()
  .use(jwt({ name: "jwt", secret: process.env.JWT_SECRET! }))

  .get("/saved", async ({ headers, jwt }) => {
    const payload = await requireAuth(headers, jwt);
    if ('status' in payload) return payload;

    const listings = db.query(`
      SELECT si.id as saved_id, l.*, u.name as seller_name,
             (SELECT s3_url FROM listing_images WHERE listing_id = l.id ORDER BY sort_order ASC LIMIT 1) AS image_url
      FROM saved_items si
      JOIN listings l ON si.listing_id = l.id
      JOIN users u ON l.seller_id = u.id
      WHERE si.user_id = ? AND si.listing_id IS NOT NULL
      ORDER BY si.created_at DESC
    `).all(payload.id);

    const services = db.query(`
      SELECT si.id as saved_id, s.*, u.name as provider_name,
             (SELECT s3_url FROM service_images WHERE service_id = s.id ORDER BY sort_order ASC LIMIT 1) AS image_url
      FROM saved_items si
      JOIN services s ON si.service_id = s.id
      JOIN users u ON s.provider_id = u.id
      WHERE si.user_id = ? AND si.service_id IS NOT NULL
      ORDER BY si.created_at DESC
    `).all(payload.id);

    const events = db.query(`
      SELECT si.id as saved_id, e.*, u.name as organizer_name,
             (SELECT s3_url FROM event_images WHERE event_id = e.id ORDER BY sort_order ASC LIMIT 1) AS image_url
      FROM saved_items si
      JOIN events e ON si.event_id = e.id
      JOIN users u ON e.organizer_id = u.id
      WHERE si.user_id = ? AND si.event_id IS NOT NULL
      ORDER BY si.created_at DESC
    `).all(payload.id);

    return { listings, services, events, status: 200 };
  })

  .get("/saved/check", async ({ query, headers, jwt }) => {
    const payload = await requireAuth(headers, jwt);
    if ('status' in payload) return payload;

    const { listing_id, service_id, event_id } = query as {
      listing_id?: string;
      service_id?: string;
      event_id?: string;
    };

    let row: { id: number } | null = null;
    if (listing_id) {
      row = db.query("SELECT id FROM saved_items WHERE user_id = ? AND listing_id = ?").get(payload.id, listing_id) as { id: number } | null;
    } else if (service_id) {
      row = db.query("SELECT id FROM saved_items WHERE user_id = ? AND service_id = ?").get(payload.id, service_id) as { id: number } | null;
    } else if (event_id) {
      row = db.query("SELECT id FROM saved_items WHERE user_id = ? AND event_id = ?").get(payload.id, event_id) as { id: number } | null;
    }

    return { saved: !!row, saved_id: row ? row.id : null, status: 200 };
  })

  .post("/saved", async ({ body, headers, jwt }) => {
    const payload = await requireAuth(headers, jwt);
    if ('status' in payload) return payload;

    const { listing_id, service_id, event_id } = body as {
      listing_id?: string;
      service_id?: string;
      event_id?: string;
    };

    const count = [listing_id, service_id, event_id].filter(Boolean).length;
    if (count !== 1) {
      return { message: "Provide exactly one of listing_id, service_id, or event_id", status: 400 };
    }

    try {
      db.run(
        `INSERT INTO saved_items (user_id, listing_id, service_id, event_id) VALUES (?, ?, ?, ?)`,
        [payload.id, listing_id ?? null, service_id ?? null, event_id ?? null]
      );

      const saved = db.query("SELECT * FROM saved_items WHERE user_id = ? ORDER BY id DESC LIMIT 1").get(payload.id);
      return { saved, status: 201 };
    } catch (err: unknown) {
      if ((err as Error).message?.includes("UNIQUE constraint")) {
        return { message: "Item already saved", status: 409 };
      }
      throw err;
    }
  })

  .delete("/saved/:id", async ({ params, headers, jwt }) => {
    const payload = await requireAuth(headers, jwt);
    if ('status' in payload) return payload;

    const row = db.query("SELECT * FROM saved_items WHERE id = ?").get(params.id) as { user_id: number } | null;
    if (!row) return { message: "Saved item not found", status: 404 };
    if (row.user_id !== payload.id) return { message: "Forbidden", status: 403 };

    db.run("DELETE FROM saved_items WHERE id = ?", [params.id]);
    return { message: "Unsaved", status: 200 };
  });

export default savedRoutes;
