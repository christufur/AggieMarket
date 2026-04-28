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

function buildListingsQuery(options: {
    category?: string;
    condition?: string;
    minPrice?: string;
    maxPrice?: string;
    q?: string;
    limit?: string;
    offset?: string;
}) {
    const conditions: string[] = ["l.status = 'active'"];
    const params: Array<string | number> = [];
    const trimmedQuery = options.q?.trim() ?? "";

    if (options.category) {
        conditions.push("l.category LIKE ?");
        params.push(`%${options.category}%`);
    }

    if (options.condition) {
        conditions.push("l.condition = ?");
        params.push(options.condition);
    }

    if (options.minPrice) {
        conditions.push("l.price >= ?");
        params.push(Number(options.minPrice));
    }

    if (options.maxPrice) {
        conditions.push("l.price <= ?");
        params.push(Number(options.maxPrice));
    }

    let join = "";
    if (trimmedQuery) {
        const matchTokens = trimmedQuery
            .split(/\s+/)
            .map((token) => token.replace(/"/g, '""').trim())
            .filter(Boolean)
            .map((token) => `"${token}"*`);

        if (matchTokens.length > 0) {
            join = "INNER JOIN listings_fts ON listings_fts.rowid = l.rowid";
            conditions.push("listings_fts MATCH ?");
            params.push(matchTokens.join(" AND "));
        }
    }

    const parsedLimit = Number(options.limit);
    const parsedOffset = Number(options.offset);
    const limit = Number.isFinite(parsedLimit) && parsedLimit > 0
        ? Math.min(Math.floor(parsedLimit), 100)
        : 24;
    const offset = Number.isFinite(parsedOffset) && parsedOffset >= 0
        ? Math.floor(parsedOffset)
        : 0;

    params.push(limit, offset);

    return {
        params,
        sql: `
            SELECT l.*, u.name AS seller_name,
                   (SELECT s3_url FROM listing_images WHERE listing_id = l.id ORDER BY sort_order ASC LIMIT 1) AS image_url
            FROM listings l
            ${join}
            LEFT JOIN users u ON u.id = l.seller_id
            WHERE ${conditions.join(" AND ")}
            ORDER BY l.created_at DESC
            LIMIT ? OFFSET ?
        `,
    };
}

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

        const { sql, params } = buildListingsQuery({ category, condition, minPrice, maxPrice, q });
        const listings = db.query(sql).all(...params);

        return { listings, status: 200 };
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

    .get("/search", ({ query }) => {
        const { category, min_price, max_price, limit, offset, q, condition } = query as {
            category?: string;
            min_price?: string;
            max_price?: string;
            limit?: string;
            offset?: string;
            q?: string;
            condition?: string;
        };

        const { sql, params } = buildListingsQuery({
            category,
            condition,
            minPrice: min_price,
            maxPrice: max_price,
            limit,
            offset,
            q,
        });
        const listings = db.query(sql).all(...params);

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

    .post("/listings/:id/mark-sold", async ({ params, body, headers, jwt }) => {
        const token = (headers as any).authorization?.replace("Bearer ", "");
        if (!token) return { message: "Unauthorized", status: 401 };

        const payload = await jwt.verify(token) as { id: number; email: string } | false;
        if (!payload) return { message: "Invalid token", status: 401 };

        const listing = db.query(`
            SELECT id, seller_id, status
            FROM listings
            WHERE id = ?
        `).get(params.id) as {
            id: string;
            seller_id: number;
            status: string;
        } | null;

        if (!listing || listing.status === "deleted") {
            return { message: "Listing not found", status: 404 };
        }
        if (String(listing.seller_id) !== String(payload.id)) return { message: "Forbidden", status: 403 };
        if (listing.status === "sold") {
            return { message: "Listing is already sold", status: 409 };
        }

        const { buyer_id } = body as { buyer_id?: number | null };
        const normalizedBuyerId = buyer_id == null ? null : Number(buyer_id);

        if (normalizedBuyerId != null) {
            if (!Number.isInteger(normalizedBuyerId) || normalizedBuyerId <= 0) {
                return { message: "buyer_id must be a valid user id", status: 400 };
            }
            if (normalizedBuyerId === Number(payload.id)) {
                return { message: "buyer_id cannot match the seller", status: 400 };
            }

            const buyer = db.query(`
                SELECT id FROM users
                WHERE id = ? AND status = 'active'
            `).get(normalizedBuyerId);

            if (!buyer) return { message: "Buyer not found", status: 404 };
        }

        const existingTransaction = db.query(`
            SELECT id FROM transactions
            WHERE listing_id = ?
        `).get(params.id);

        if (existingTransaction) {
            return { message: "A transaction already exists for this listing", status: 409 };
        }

        const transactionId = crypto.randomUUID();

        db.run(`
            INSERT INTO transactions (id, listing_id, seller_id, buyer_id, sold_at)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        `, [transactionId, params.id, payload.id, normalizedBuyerId]);

        db.run(`
            UPDATE listings
            SET status = 'sold', updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [params.id]);

        const transaction = db.query(`
            SELECT *
            FROM transactions
            WHERE id = ?
        `).get(transactionId);

        return { transaction, status: 201 };
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
