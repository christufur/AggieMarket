import Elysia from "elysia";
import { jwt } from "@elysiajs/jwt";
import db from "../db";
import crypto from "crypto";


const eventsRoutes = new Elysia()
    .use(jwt({ name: "jwt", secret: process.env.JWT_SECRET || "secret" }))

    // browse all events
    .get("/events", async ({ headers, jwt }) => {
        const token = (headers as any).authorization?.replace("Bearer ", "");
        if (!token) return { message: "Unauthorized", status: 401 };

        const payload = await jwt.verify(token) as { id: number; email: string } | false;
        if (!payload) return { message: "Invalid token", status: 401 };

        const events = db.query(
            `SELECT e.*, u.name AS organizer_name,
                    (SELECT s3_url FROM event_images WHERE event_id = e.id ORDER BY sort_order ASC LIMIT 1) AS image_url
             FROM events e
             LEFT JOIN users u ON u.id = e.organizer_id
             WHERE e.status = 'active' ORDER BY e.starts_at ASC`
        ).all();
        return { events, status: 200 };
    })

    // events by category
    .get("/events/category/:category", async ({ params, headers, jwt }) => {
        const token = (headers as any).authorization?.replace("Bearer ", "");
        if (!token) return { message: "Unauthorized", status: 401 };

        const payload = await jwt.verify(token) as { id: number; email: string } | false;
        if (!payload) return { message: "Invalid token", status: 401 };

        const events = db.query("SELECT * FROM events WHERE category = ? AND status = 'active' ORDER BY starts_at ASC").all(params.category);
        return { events, status: 200 };
    })

    // events by organizer
    .get("/events/organizer/:organizer_id", async ({ params, headers, jwt }) => {
        const token = (headers as any).authorization?.replace("Bearer ", "");
        if (!token) return { message: "Unauthorized", status: 401 };

        const payload = await jwt.verify(token) as { id: number; email: string } | false;
        if (!payload) return { message: "Invalid token", status: 401 };

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

        return { event: { ...(event as object), images }, status: 200 };
    })

    // create event
    .post("/events", async ({ body, headers, jwt }) => {
        const token = (headers as any).authorization?.replace("Bearer ", "");
        if (!token) return { message: "Unauthorized", status: 401 };

        const payload = await jwt.verify(token) as { id: number; email: string } | false;
        if (!payload) return { message: "Invalid token", status: 401 };

        const { title, description, category, location, starts_at, ends_at } = body as {
            title: string;
            description: string;
            category: string;
            location: string;
            starts_at: string;
            ends_at: string;
        };

        if (!title || !category || !location || !starts_at) {
            return { message: "title, category, location, and starts_at are required", status: 400 };
        }

        const id = crypto.randomUUID();
        db.run(
            "INSERT INTO events (id, organizer_id, title, description, category, location, starts_at, ends_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [id, payload.id, title, description, category, location, starts_at, ends_at ?? null]
        );

        const event = db.query("SELECT * FROM events WHERE id = ?").get(id);
        return { event, status: 201 };
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
