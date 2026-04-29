import Elysia from "elysia";
import { jwt } from "@elysiajs/jwt";
import db from "../db";
import crypto from "crypto";
import { requireAuth, parsePagination } from "../utils/auth";

type EventOwnerRow = { id: string; organizer_id: number; max_attendees: number | null; status: string } | null;
type AttendeeRow = { status: string; [key: string]: unknown };

const eventsRoutes = new Elysia()
    .use(jwt({ name: "jwt", secret: process.env.JWT_SECRET! }))

    .get("/events", ({ query }) => {
        const { page, limit, offset } = parsePagination(query);
        const includePast = String((query as Record<string, unknown>).include_past ?? "1") !== "0";

        const whereClause = includePast
            ? `WHERE e.status = 'active'`
            : `WHERE e.status = 'active' AND e.starts_at >= datetime('now')`;

        const total = (db.query(
            `SELECT COUNT(*) as count FROM events e ${whereClause}`
        ).get() as { count: number }).count;

        // Upcoming first (ASC), then past (most recent past first via ABS trick)
        const events = db.query(
            `SELECT e.*, u.name AS organizer_name,
                    (SELECT s3_url FROM event_images WHERE event_id = e.id ORDER BY sort_order ASC LIMIT 1) AS image_url,
                    CASE WHEN e.starts_at < datetime('now') THEN 1 ELSE 0 END AS is_past
             FROM events e
             LEFT JOIN users u ON u.id = e.organizer_id
             ${whereClause}
             ORDER BY is_past ASC, e.starts_at ASC LIMIT ? OFFSET ?`
        ).all(limit, offset);
        return { events, total, page, limit, status: 200 };
    })

    .get("/events/popular", ({ query }) => {
        const limit = Math.min(50, Math.max(1, parseInt(query.limit as string) || 10));

        // Popular only shows upcoming
        const events = db.query(
            `SELECT e.*, u.name AS organizer_name,
                    (SELECT s3_url FROM event_images WHERE event_id = e.id ORDER BY sort_order ASC LIMIT 1) AS image_url,
                    0 AS is_past
             FROM events e
             LEFT JOIN users u ON u.id = e.organizer_id
             WHERE e.status = 'active' AND e.starts_at >= datetime('now')
             ORDER BY e.starts_at ASC LIMIT ?`
        ).all(limit);

        return { events, status: 200 };
    })

    .get("/events/category/:category", ({ params }) => {
        const events = db.query(
            `SELECT *,
                    CASE WHEN starts_at < datetime('now') THEN 1 ELSE 0 END AS is_past
             FROM events WHERE category = ? AND status = 'active'
             ORDER BY is_past ASC, starts_at ASC`
        ).all(params.category);
        return { events, status: 200 };
    })

    .get("/events/organizer/:organizer_id", ({ params }) => {
        const events = db.query(
            `SELECT *,
                    CASE WHEN starts_at < datetime('now') THEN 1 ELSE 0 END AS is_past
             FROM events WHERE organizer_id = ? AND status = 'active'
             ORDER BY is_past ASC, starts_at DESC`
        ).all(params.organizer_id);
        return { events, status: 200 };
    })

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

    .post("/events", async ({ body, headers, jwt }) => {
        const payload = await requireAuth(headers, jwt);
        if ('status' in payload) return payload;

        const { title, description, category, location, starts_at, ends_at, is_free, ticket_price, max_attendees, external_link, organization, organization_url } = body as {
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
            organization?: string | null;
            organization_url?: string | null;
        };

        if (!title || !category || !location || !starts_at) {
            return { message: "title, category, location, and starts_at are required", status: 400 };
        }

        const id = crypto.randomUUID();
        db.run(
            `INSERT INTO events (id, organizer_id, title, description, category, location, starts_at, ends_at, is_free, ticket_price, max_attendees, external_link, organization, organization_url)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                id, payload.id, title, description, category, location, starts_at,
                ends_at ?? null, is_free ? 1 : 0, ticket_price ?? null, max_attendees ?? null,
                external_link ?? null,
                organization?.trim() || null,
                organization_url?.trim() || null,
            ]
        );

        const event = db.query("SELECT * FROM events WHERE id = ?").get(id);
        return { event, status: 201 };
    })

    .patch("/events/:id", async ({ params, body, headers, jwt }) => {
        const payload = await requireAuth(headers, jwt);
        if ('status' in payload) return payload;

        const existing = db.query("SELECT * FROM events WHERE id = ? AND status != 'deleted'").get(params.id) as EventOwnerRow;
        if (!existing) return { message: "Event not found", status: 404 };
        if (String(existing.organizer_id) !== String(payload.id)) return { message: "Forbidden", status: 403 };

        const { title, description, category, location, is_online, starts_at, ends_at, is_free, ticket_price, max_attendees, external_link, organization, organization_url } = body as {
            title?: string; description?: string; category?: string; location?: string;
            is_online?: boolean; starts_at?: string; ends_at?: string | null;
            is_free?: boolean; ticket_price?: number | null; max_attendees?: number | null;
            external_link?: string | null;
            organization?: string | null;
            organization_url?: string | null;
        };

        const orgClean = organization === undefined ? undefined : (organization ? organization.trim() || null : null);
        const orgUrlClean = organization_url === undefined ? undefined : (organization_url ? organization_url.trim() || null : null);

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
            organization = CASE WHEN ? = 1 THEN ? ELSE organization END,
            organization_url = CASE WHEN ? = 1 THEN ? ELSE organization_url END,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [
          title ?? null, description ?? null, category ?? null, location ?? null,
          is_online != null ? (is_online ? 1 : 0) : null, starts_at ?? null, ends_at !== undefined ? ends_at : null,
          is_free != null ? (is_free ? 1 : 0) : null, ticket_price !== undefined ? ticket_price : null,
          max_attendees !== undefined ? max_attendees : null, external_link !== undefined ? external_link : null,
          orgClean !== undefined ? 1 : 0, orgClean ?? null,
          orgUrlClean !== undefined ? 1 : 0, orgUrlClean ?? null,
          params.id,
        ]);

        const event = db.query("SELECT * FROM events WHERE id = ?").get(params.id);
        return { event, status: 200 };
    })

    .post("/events/:id/rsvp", async ({ params, body, headers, jwt }) => {
        const payload = await requireAuth(headers, jwt);
        if ('status' in payload) return payload;

        const event = db.query("SELECT * FROM events WHERE id = ? AND status = 'active'").get(params.id) as EventOwnerRow;
        if (!event) return { message: "Event not found", status: 404 };

        const { status } = body as { status?: string };
        if (!status || !["going", "interested"].includes(status)) {
            return { message: "status must be 'going' or 'interested'", status: 400 };
        }

        // Capacity check + insert wrapped in a transaction so concurrent RSVPs
        // can't both pass the count check and exceed max_attendees.
        let atCapacity = false;
        db.transaction(() => {
            if (event.max_attendees != null) {
                const existing = db.query("SELECT id FROM event_attendees WHERE event_id = ? AND user_id = ?").get(params.id, payload.id);
                if (!existing) {
                    const current = db.query("SELECT COUNT(*) as count FROM event_attendees WHERE event_id = ?").get(params.id) as { count: number };
                    if (current.count >= event.max_attendees) {
                        atCapacity = true;
                        return;
                    }
                }
            }

            db.run(
                `INSERT INTO event_attendees (event_id, user_id, status) VALUES (?, ?, ?)
                 ON CONFLICT(event_id, user_id) DO UPDATE SET status = excluded.status`,
                [params.id, payload.id, status]
            );
        })();

        if (atCapacity) {
            return { message: "Event is at capacity", status: 409 };
        }

        const count = db.query("SELECT COUNT(*) as count FROM event_attendees WHERE event_id = ?").get(params.id) as { count: number };
        const rsvp = db.query("SELECT * FROM event_attendees WHERE event_id = ? AND user_id = ?").get(params.id, payload.id);
        return { rsvp, count: count.count, status: 201 };
    })

    .delete("/events/:id/rsvp", async ({ params, headers, jwt }) => {
        const payload = await requireAuth(headers, jwt);
        if ('status' in payload) return payload;

        db.run("DELETE FROM event_attendees WHERE event_id = ? AND user_id = ?", [params.id, payload.id]);

        const count = db.query("SELECT COUNT(*) as count FROM event_attendees WHERE event_id = ?").get(params.id) as { count: number };
        return { message: "RSVP cancelled", count: count.count, status: 200 };
    })

    .get("/events/:id/rsvp", async ({ params, headers, jwt }) => {
        const payload = await requireAuth(headers, jwt);
        if ('status' in payload) return payload;

        const rsvp = db.query("SELECT * FROM event_attendees WHERE event_id = ? AND user_id = ?").get(params.id, payload.id);
        return { rsvp: rsvp || null, status: 200 };
    })

    .get("/events/:id/attendees", async ({ params, headers, jwt }) => {
        const payload = await requireAuth(headers, jwt);
        if ('status' in payload) return payload;

        const attendees = db.query(`
          SELECT ea.*, u.name, u.avatar_url
          FROM event_attendees ea
          LEFT JOIN users u ON u.id = ea.user_id
          WHERE ea.event_id = ?
          ORDER BY ea.created_at ASC
        `).all(params.id) as AttendeeRow[];

        const going = attendees.filter(a => a.status === "going").length;
        const interested = attendees.filter(a => a.status === "interested").length;

        return { attendees, going_count: going, interested_count: interested, status: 200 };
    })

    .delete("/events/:id", async ({ params, headers, jwt }) => {
        const payload = await requireAuth(headers, jwt);
        if ('status' in payload) return payload;

        const event = db.query("SELECT * FROM events WHERE id = ? AND organizer_id = ?").get(params.id, payload.id);
        if (!event) return { message: "Event not found", status: 404 };

        db.run("UPDATE events SET status = 'deleted', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [params.id]);
        return { message: "Event deleted", status: 200 };
    })

export default eventsRoutes;
