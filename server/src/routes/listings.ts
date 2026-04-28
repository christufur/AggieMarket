import { Elysia } from "elysia";
import { jwt } from "@elysiajs/jwt";
import db from "../db";
import crypto from "crypto";
import { requireAuth, parsePagination } from "../utils/auth";

type PatchListingBody = {
    title?: string;
    description?: string;
    price?: number | null;
    is_free?: number | null;
    category?: string;
    condition?: string | null;
    status?: string;
};

const listingsRoutes = new Elysia()
    .use(jwt({ name: "jwt", secret: process.env.JWT_SECRET! }))

    .post("/listings", async ({ body, headers, jwt }) => {
        const payload = await requireAuth(headers, jwt);
        if ('status' in payload) return payload;

        const { title, description, price, is_free, category, condition } = body as {
            title: string;
            description: string;
            price?: number;
            is_free?: boolean;
            category: string;
            condition?: string;
        };

        if (!title || !category) {
            return { message: "title and category are required", status: 400 };
        }

        const id = crypto.randomUUID();

        db.run(
            `INSERT INTO listings (id, seller_id, title, description, price, is_free, category, condition)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, payload.id, title, description, price ?? null, is_free ? 1 : 0, category, condition ?? null]
        );

        const listing = db.query("SELECT * FROM listings WHERE id = ?").get(id);
        return { listing, status: 201 };
    })

    .get("/listings", ({ query }) => {
        const { category, condition, minPrice, maxPrice, q } = query as {
            category?: string;
            condition?: string;
            minPrice?: string;
            maxPrice?: string;
            q?: string;
            page?: string;
            limit?: string;
        };

        const { page, limit, offset } = parsePagination(query);

        const conditions: string[] = ["l.status = 'active'"];
        const params: (string | number)[] = [];

        if (category) { conditions.push("l.category = ?"); params.push(category); }
        if (condition) { conditions.push("l.condition = ?"); params.push(condition); }
        if (minPrice) { conditions.push("l.price >= ?"); params.push(Number(minPrice)); }
        if (maxPrice) { conditions.push("l.price <= ?"); params.push(Number(maxPrice)); }
        if (q) {
            conditions.push("(l.title LIKE ? OR l.description LIKE ?)");
            params.push(`%${q}%`, `%${q}%`);
        }

        const where = conditions.join(" AND ");

        const total = (db.query(
            `SELECT COUNT(*) as count FROM listings l WHERE ${where}`
        ).get(...params) as { count: number }).count;

        const listings = db.query(
            `SELECT l.*, u.name AS seller_name,
                    (SELECT s3_url FROM listing_images WHERE listing_id = l.id ORDER BY sort_order ASC LIMIT 1) AS image_url
             FROM listings l
             LEFT JOIN users u ON u.id = l.seller_id
             WHERE ${where} ORDER BY l.created_at DESC LIMIT ? OFFSET ?`
        ).all(...params, limit, offset);

        return { listings, total, page, limit, status: 200 };
    })

    .get("/listings/popular", ({ query }) => {
        const limit = Math.min(50, Math.max(1, parseInt(query.limit as string) || 10));

        const listings = db.query(
            `SELECT l.*, u.name AS seller_name,
                    (SELECT s3_url FROM listing_images WHERE listing_id = l.id ORDER BY sort_order ASC LIMIT 1) AS image_url
             FROM listings l
             LEFT JOIN users u ON u.id = l.seller_id
             WHERE l.status = 'active' ORDER BY l.created_at DESC LIMIT ?`
        ).all(limit);

        return { listings, status: 200 };
    })

    .get("/listings/:id", ({ params }) => {
        const listing = db.query(
            `SELECT l.*, u.name AS seller_name
             FROM listings l LEFT JOIN users u ON u.id = l.seller_id
             WHERE l.id = ? AND l.status != 'deleted'`
        ).get(params.id);

        if (!listing) return { message: "Listing not found", status: 404 };

        db.run("UPDATE listings SET view_count = view_count + 1 WHERE id = ?", [params.id]);

        const images = db.query("SELECT s3_url AS url, sort_order FROM listing_images WHERE listing_id = ? ORDER BY sort_order ASC").all(params.id);

        return { listing: { ...(listing as object), images }, status: 200 };
    })

    .patch("/listings/:id", async ({ params, body, headers, jwt }) => {
        const payload = await requireAuth(headers, jwt);
        if ('status' in payload) return payload;

        const listing = db.query("SELECT * FROM listings WHERE id = ? AND status != 'deleted'").get(params.id) as {
            id: string; seller_id: number;
        } | null;

        if (!listing) return { message: "Listing not found", status: 404 };
        if (String(listing.seller_id) !== String(payload.id)) return { message: "Forbidden", status: 403 };

        const { title, description, price, is_free, category, condition, status } = body as PatchListingBody;

        db.run(
            `UPDATE listings SET
                title = COALESCE(?, title),
                description = COALESCE(?, description),
                price = COALESCE(?, price),
                is_free = COALESCE(?, is_free),
                category = COALESCE(?, category),
                condition = COALESCE(?, condition),
                status = COALESCE(?, status),
                updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [title ?? null, description ?? null, price ?? null, is_free ?? null, category ?? null, condition ?? null, status ?? null, params.id]
        );

        const updated = db.query("SELECT * FROM listings WHERE id = ?").get(params.id);
        return { listing: updated, status: 200 };
    })

    .delete("/listings/:id", async ({ params, headers, jwt }) => {
        const payload = await requireAuth(headers, jwt);
        if ('status' in payload) return payload;

        const listing = db.query("SELECT * FROM listings WHERE id = ? AND status != 'deleted'").get(params.id) as {
            id: string; seller_id: number;
        } | null;

        if (!listing) return { message: "Listing not found", status: 404 };
        if (String(listing.seller_id) !== String(payload.id)) return { message: "Forbidden", status: 403 };

        db.run("UPDATE listings SET status = 'deleted', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [params.id]);

        return { message: "Listing deleted", status: 200 };
    })

export default listingsRoutes;
