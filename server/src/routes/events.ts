import Elysia from "elysia";
import { jwt } from "@elysiajs/jwt";
import db from "../db";
import crypto from "crypto";


const eventsRoutes = new Elysia()
    .use(jwt({ name: "jwt", secret: process.env.JWT_SECRET! }))

    // browse all events (public)
    .get("/events", ({ query }) => {
        const page = Math.max(1, parseInt(query.page as string) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(query.limit as string) || 20));
        const offset = (page - 1) * limit;

        const total = (db.query(
            `SELECT COUNT(*) as count FROM events e WHERE e.status = 'active' AND e.starts_at >= datetime('now')`
        ).get() as { count: number }).count;

        const events = db.query(
            `SELECT e.*, u.name AS organizer_name,
                    (SELECT s3_url FROM event_images WHERE event_id = e.id ORDER BY sort_order ASC LIMIT 1) AS image_url
             FROM events e
             LEFT JOIN users u ON u.id = e.organizer_id
             WHERE e.status = 'active' AND e.starts_at >= datetime('now')
             ORDER BY e.starts_at ASC LIMIT ? OFFSET ?`
        ).all(limit, offset);
        return { events, total, page, limit, status: 200 };
    })

    // events by category
    .get("/events/category/:category", ({ params }) => {
        const events = db.query("SELECT * FROM events WHERE category = ? AND status = 'active' AND starts_at >= datetime('now') ORDER BY starts_at ASC").all(params.category);
        return { events, status: 200 };
    })

    // events by organizer (public)
    .get("/events/organizer/:organizer_id", ({ params }) => {
        const events = db.query("SELECT * FROM events WHERE organizer_id = ? AND status = 'active' ORDER BY starts_at ASC").all(params.organizer_id);
        return { events, status: 200 };
    })

    // get singular event
    .get("/events/:id", async ({ params }) => {
        const event = db.query(
            `SELECT e.*, u.name AS organizer_name
             FROM events e LEFT JOIN users u ON u.id = e.organizer_id
             WHERE e.id = ? AND e.status != 'deleted'`
        ).get(params.id);
        if (!event) return { message: "Event not found", status: 404 };

        db.run("UPDATE events SET view_count = view_count + 1 WHERE id = ?", [params.id]);

        const images = db.query("SELECT s3_url AS url, sort_order FROM event_images WHERE event_id = ? ORDER BY sort_order ASC").all(params.id);
        const counts = db.query(`
          SELECT
            COALESCE(COUNT(*), 0) as total,
            COALESCE(SUM(CASE WHEN status = 'going' THEN 1 ELSE 0 END), 0) as going_count,
            COALESCE(SUM(CASE WHEN status = 'interested' THEN 1 ELSE 0 END), 0) as interested_count
          FROM event_attendees WHERE event_id = ?
        `).get(params.id) as { total: number; going_count: number; interested_count: number };

        return { event: { ...(event as object), images, attendee_count: counts.total, going_count: counts.going_count, interested_count: counts.interested_count }, status: 200 };
    })

    // create event
    .post("/events", async ({ body, headers, jwt }) => {
        const token = (headers as any).authorization?.replace("Bearer ", "");
        if (!token) return { message: "Unauthorized", status: 401 };

        const payload = await jwt.verify(token) as { id: number; email: string } | false;
        if (!payload) return { message: "Invalid token", status: 401 };

        const { title, description, category, location, starts_at, ends_at, is_free, ticket_price, max_attendees, external_link } = body as {
            title: string;
            description: string;
            category: string;
            location: string;
            starts_at: string;
            ends_at?: string;
            is_free?: boolean;
            ticket_price?: number;
            max_attendees?: number;
            external_link?: string;
        };

        if (!title || !category || !location || !starts_at) {
            return { message: "title, category, location, and starts_at are required", status: 400 };
        }

        const id = crypto.randomUUID();
        db.run(
            `INSERT INTO events (id, organizer_id, title, description, category, location, starts_at, ends_at, is_free, ticket_price, max_attendees, external_link)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, payload.id, title, description, category, location, starts_at, ends_at ?? null, is_free ? 1 : 0, ticket_price ?? null, max_attendees ?? null, external_link ?? null]
        );

        const event = db.query("SELECT * FROM events WHERE id = ?").get(id);
        return { event, status: 201 };
    })

    // update event
    .patch("/events/:id", async ({ params, body, headers, jwt }) => {
        const token = (headers as any).authorization?.replace("Bearer ", "");
        if (!token) return { message: "Unauthorized", status: 401 };

        const payload = await jwt.verify(token) as { id: number; email: string } | false;
        if (!payload) return { message: "Invalid token", status: 401 };

        const existing = db.query("SELECT * FROM events WHERE id = ? AND status != 'deleted'").get(params.id) as any;
        if (!existing) return { message: "Event not found", status: 404 };
        if (String(existing.organizer_id) !== String(payload.id)) return { message: "Forbidden", status: 403 };

        const { title, description, category, location, is_online, starts_at, ends_at, is_free, ticket_price, max_attendees, external_link } = body as {
            title?: string; description?: string; category?: string; location?: string;
            is_online?: boolean; starts_at?: string; ends_at?: string | null;
            is_free?: boolean; ticket_price?: number | null; max_attendees?: number | null;
            external_link?: string | null;
        };

        db.run(`
          UPDATE events SET
            title = COALESCE(?, title),
            description = COALESCE(?, description),
            category = COALESCE(?, category),
            location = COALESCE(?, location),
            is_online = COALESCE(?, is_online),
            starts_at = COALESCE(?, starts_at),
            ends_at = COALESCE(?, ends_at),
            is_free = COALESCE(?, is_free),
            ticket_price = COALESCE(?, ticket_price),
            max_attendees = COALESCE(?, max_attendees),
            external_link = COALESCE(?, external_link),
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [
          title ?? null, description ?? null, category ?? null, location ?? null,
          is_online != null ? (is_online ? 1 : 0) : null, starts_at ?? null, ends_at !== undefined ? ends_at : null,
          is_free != null ? (is_free ? 1 : 0) : null, ticket_price !== undefined ? ticket_price : null,
          max_attendees !== undefined ? max_attendees : null, external_link !== undefined ? external_link : null,
          params.id,
        ]);

        const event = db.query("SELECT * FROM events WHERE id = ?").get(params.id);
        return { event, status: 200 };
    })

    // RSVP to event
    .post("/events/:id/rsvp", async ({ params, body, headers, jwt }) => {
        const token = (headers as any).authorization?.replace("Bearer ", "");
        if (!token) return { message: "Unauthorized", status: 401 };

        const payload = await jwt.verify(token) as { id: number } | false;
        if (!payload) return { message: "Invalid token", status: 401 };

        const event = db.query("SELECT * FROM events WHERE id = ? AND status = 'active'").get(params.id) as any;
        if (!event) return { message: "Event not found", status: 404 };

        const { status } = body as { status?: string };
        if (!status || !["going", "interested"].includes(status)) {
            return { message: "status must be 'going' or 'interested'", status: 400 };
        }

        // Check capacity before allowing RSVP
        if (event.max_attendees != null) {
            const existing = db.query("SELECT id FROM event_attendees WHERE event_id = ? AND user_id = ?").get(params.id, payload.id);
            if (!existing) {
                const current = db.query("SELECT COUNT(*) as count FROM event_attendees WHERE event_id = ?").get(params.id) as { count: number };
                if (current.count >= event.max_attendees) {
                    return { message: "Event is at capacity", status: 409 };
                }
            }
        }

        db.run(
            `INSERT INTO event_attendees (event_id, user_id, status) VALUES (?, ?, ?)
             ON CONFLICT(event_id, user_id) DO UPDATE SET status = excluded.status`,
            [params.id, payload.id, status]
        );

        const count = db.query("SELECT COUNT(*) as count FROM event_attendees WHERE event_id = ?").get(params.id) as { count: number };
        const rsvp = db.query("SELECT * FROM event_attendees WHERE event_id = ? AND user_id = ?").get(params.id, payload.id);
        return { rsvp, count: count.count, status: 201 };
    })

    // Cancel RSVP
    .delete("/events/:id/rsvp", async ({ params, headers, jwt }) => {
        const token = (headers as any).authorization?.replace("Bearer ", "");
        if (!token) return { message: "Unauthorized", status: 401 };

        const payload = await jwt.verify(token) as { id: number } | false;
        if (!payload) return { message: "Invalid token", status: 401 };

        db.run("DELETE FROM event_attendees WHERE event_id = ? AND user_id = ?", [params.id, payload.id]);

        const count = db.query("SELECT COUNT(*) as count FROM event_attendees WHERE event_id = ?").get(params.id) as { count: number };
        return { message: "RSVP cancelled", count: count.count, status: 200 };
    })

    // Check RSVP status
    .get("/events/:id/rsvp", async ({ params, headers, jwt }) => {
        const token = (headers as any).authorization?.replace("Bearer ", "");
        if (!token) return { message: "Unauthorized", status: 401 };

        const payload = await jwt.verify(token) as { id: number } | false;
        if (!payload) return { message: "Invalid token", status: 401 };

        const rsvp = db.query("SELECT * FROM event_attendees WHERE event_id = ? AND user_id = ?").get(params.id, payload.id);
        return { rsvp: rsvp || null, status: 200 };
    })

    // List attendees
    .get("/events/:id/attendees", async ({ params, headers, jwt }) => {
        const token = (headers as any).authorization?.replace("Bearer ", "");
        if (!token) return { message: "Unauthorized", status: 401 };

        const payload = await jwt.verify(token) as { id: number } | false;
        if (!payload) return { message: "Invalid token", status: 401 };

        const attendees = db.query(`
          SELECT ea.*, u.name, u.avatar_url
          FROM event_attendees ea
          LEFT JOIN users u ON u.id = ea.user_id
          WHERE ea.event_id = ?
          ORDER BY ea.created_at ASC
        `).all(params.id);

        const going = attendees.filter((a: any) => a.status === "going").length;
        const interested = attendees.filter((a: any) => a.status === "interested").length;

        return { attendees, going_count: going, interested_count: interested, status: 200 };
    })

    // soft delete event
    .delete("/events/:id", async ({ params, headers, jwt }) => {
        const token = (headers as any).authorization?.replace("Bearer ", "");
        if (!token) return { message: "Unauthorized", status: 401 };

        const payload = await jwt.verify(token) as { id: number; email: string } | false;
        if (!payload) return { message: "Invalid token", status: 401 };

        const event = db.query("SELECT * FROM events WHERE id = ? AND organizer_id = ?").get(params.id, payload.id);
        if (!event) return { message: "Event not found", status: 404 };

        db.run("UPDATE events SET status = 'deleted', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [params.id]);
        return { message: "Event deleted", status: 200 };
    })

export default eventsRoutes;
