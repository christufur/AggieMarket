import { Elysia } from "elysia";
import { jwt } from "@elysiajs/jwt";
import db from "../db";
import { requireAuth } from "../utils/auth";

const usersRoutes = new Elysia()
  .use(jwt({ name: "jwt", secret: process.env.JWT_SECRET! }))

  .get("/users/:id", ({ params }) => {
    const user = db.query(`
      SELECT id, name, bio, avatar_url, cover_url, rating_avg, rating_count, created_at
      FROM users WHERE id = ? AND status = 'active'
    `).get(params.id);

    if (!user) return { message: "User not found", status: 404 };

    const listingsCount = db.query(
      "SELECT COUNT(*) as count FROM listings WHERE seller_id = ? AND status = 'active'"
    ).get(params.id) as { count: number };

    const servicesCount = db.query(
      "SELECT COUNT(*) as count FROM services WHERE provider_id = ? AND status = 'active'"
    ).get(params.id) as { count: number };

    const eventsCount = db.query(
      "SELECT COUNT(*) as count FROM events WHERE organizer_id = ? AND status = 'active'"
    ).get(params.id) as { count: number };

    return {
      user: {
        ...(user as object),
        listings_count: listingsCount.count,
        services_count: servicesCount.count,
        events_count: eventsCount.count,
      },
      status: 200,
    };
  })

  .get("/users/:id/listings", ({ params }) => {
    const listings = db.query(`
      SELECT l.*,
             (SELECT s3_url FROM listing_images WHERE listing_id = l.id ORDER BY sort_order ASC LIMIT 1) AS image_url
      FROM listings l
      WHERE seller_id = ? AND status IN ('active', 'sold')
      ORDER BY created_at DESC
    `).all(params.id);

    return { listings, status: 200 };
  })

  .get("/users/:id/services", ({ params }) => {
    const services = db.query(`
      SELECT s.*,
             (SELECT s3_url FROM service_images WHERE service_id = s.id ORDER BY sort_order ASC LIMIT 1) AS image_url
      FROM services s
      WHERE provider_id = ? AND status = 'active'
      ORDER BY created_at DESC
    `).all(params.id);

    return { services, status: 200 };
  })

  .get("/users/:id/events", ({ params }) => {
    const events = db.query(`
      SELECT e.*,
             (SELECT s3_url FROM event_images WHERE event_id = e.id ORDER BY sort_order ASC LIMIT 1) AS image_url
      FROM events e
      WHERE organizer_id = ? AND status = 'active'
      ORDER BY starts_at DESC
    `).all(params.id);

    return { events, status: 200 };
  })

  .post("/users/me/push-token", async ({ body, headers, jwt }) => {
    const payload = await requireAuth(headers, jwt);
    if ('status' in payload) return payload;

    const { token, platform } = body as { token: string; platform?: string };
    if (!token) return { message: "token is required", status: 400 };

    db.run(
      `INSERT INTO push_tokens (user_id, token, platform, is_active) VALUES (?, ?, ?, 1)
       ON CONFLICT(user_id, token) DO UPDATE SET is_active = 1`,
      [payload.id, token, platform ?? 'ios']
    );

    return { message: "Push token registered", status: 200 };
  })

  .patch("/users/me", async ({ body, headers, jwt }) => {
    const payload = await requireAuth(headers, jwt);
    if ('status' in payload) return payload;

    const { name, bio, avatar_url, cover_url } = body as {
      name?: string;
      bio?: string;
      avatar_url?: string;
      cover_url?: string;
    };

    db.run(`
      UPDATE users SET
        name = COALESCE(?, name),
        bio = COALESCE(?, bio),
        avatar_url = COALESCE(?, avatar_url),
        cover_url = COALESCE(?, cover_url),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [name ?? null, bio ?? null, avatar_url ?? null, cover_url ?? null, payload.id]);

    const user = db.query(
      "SELECT id, name, email, bio, avatar_url, cover_url, rating_avg, rating_count, status, created_at FROM users WHERE id = ?"
    ).get(payload.id);

    return { user, status: 200 };
  });

export default usersRoutes;
