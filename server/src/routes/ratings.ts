import { Elysia } from "elysia";
import { jwt } from "@elysiajs/jwt";
import db from "../db";
import { requireAuth } from "../utils/auth";

const ratingsRoutes = new Elysia()
  .use(jwt({ name: "jwt", secret: process.env.JWT_SECRET! }))

  .post("/ratings", async ({ body, headers, jwt }) => {
    const payload = await requireAuth(headers, jwt);
    if ('status' in payload) return payload;

    const { transaction_id, stars, body: reviewBody } = body as {
      transaction_id?: string;
      stars?: number;
      body?: string | null;
    };

    if (!transaction_id) return { message: "transaction_id is required", status: 400 };
    if (!Number.isInteger(stars) || (stars as number) < 1 || (stars as number) > 5) {
      return { message: "stars must be an integer between 1 and 5", status: 400 };
    }
    const normalizedStars = Number(stars);

    const transaction = db.query(`
      SELECT
        t.id,
        t.buyer_id,
        t.seller_id,
        t.sold_at
      FROM transactions t
      WHERE t.id = ?
    `).get(transaction_id) as {
      id: string;
      buyer_id: number | null;
      seller_id: number;
      sold_at: string | null;
    } | null;

    if (!transaction) return { message: "Transaction not found", status: 404 };
    if (!transaction.sold_at) {
      return { message: "Transaction must be closed before leaving a rating", status: 400 };
    }

    const reviewerId = Number(payload.id);
    const isBuyer = Number(transaction.buyer_id) === reviewerId;
    const isSeller = Number(transaction.seller_id) === reviewerId;

    if (!isBuyer && !isSeller) {
      return { message: "Forbidden", status: 403 };
    }

    if (transaction.buyer_id == null) {
      return { message: "Buyer must be specified on the transaction before ratings are allowed", status: 400 };
    }

    const revieweeId = isBuyer ? Number(transaction.seller_id) : Number(transaction.buyer_id);

    const existingRating = db.query(`
      SELECT id FROM ratings
      WHERE transaction_id = ? AND reviewer_id = ?
    `).get(transaction_id, reviewerId);

    if (existingRating) {
      return { message: "You have already rated this transaction", status: 409 };
    }

    const result = db.run(`
      INSERT INTO ratings (transaction_id, reviewer_id, reviewee_id, stars, body)
      VALUES (?, ?, ?, ?, ?)
    `, [
      transaction_id,
      reviewerId,
      revieweeId,
      normalizedStars,
      reviewBody?.trim() ? reviewBody.trim() : null,
    ]);

    const rating = db.query(`
      SELECT
        r.*,
        reviewer.name AS reviewer_name
      FROM ratings r
      LEFT JOIN users reviewer ON reviewer.id = r.reviewer_id
      WHERE r.id = ?
    `).get(result.lastInsertRowid);

    return { rating, status: 201 };
  })

  .get("/users/:id/ratings", ({ params, query }) => {
    const parsedLimit = Number((query as { limit?: string }).limit);
    const parsedOffset = Number((query as { offset?: string }).offset);
    const limit = Number.isFinite(parsedLimit) && parsedLimit > 0
      ? Math.min(Math.floor(parsedLimit), 100)
      : 20;
    const offset = Number.isFinite(parsedOffset) && parsedOffset >= 0
      ? Math.floor(parsedOffset)
      : 0;

    const ratings = db.query(`
      SELECT
        r.*,
        reviewer.name AS reviewer_name
      FROM ratings r
      LEFT JOIN users reviewer ON reviewer.id = r.reviewer_id
      WHERE r.reviewee_id = ?
      ORDER BY r.created_at DESC, r.id DESC
      LIMIT ? OFFSET ?
    `).all(params.id, limit, offset);

    return { ratings, status: 200 };
  })

  .get("/transactions/pending-ratings", async ({ headers, jwt }) => {
    const payload = await requireAuth(headers, jwt);
    if ('status' in payload) return payload;

    const userId = Number(payload.id);

    const transactions = db.query(`
      SELECT
        t.id,
        t.listing_id,
        t.seller_id,
        t.buyer_id,
        t.sold_at,
        l.title AS listing_title,
        l.price AS listing_price,
        l.is_free AS listing_is_free,
        (SELECT s3_url FROM listing_images
           WHERE listing_id = l.id
           ORDER BY sort_order ASC, id ASC
           LIMIT 1) AS listing_image,
        CASE WHEN t.buyer_id = ? THEN t.seller_id ELSE t.buyer_id END AS counterparty_id,
        cp.name AS counterparty_name,
        cp.avatar_url AS counterparty_avatar,
        CASE WHEN t.buyer_id = ? THEN 'buyer' ELSE 'seller' END AS my_role
      FROM transactions t
      JOIN listings l ON l.id = t.listing_id
      LEFT JOIN users cp
        ON cp.id = CASE WHEN t.buyer_id = ? THEN t.seller_id ELSE t.buyer_id END
      WHERE t.sold_at IS NOT NULL
        AND t.buyer_id IS NOT NULL
        AND (t.buyer_id = ? OR t.seller_id = ?)
        AND NOT EXISTS (
          SELECT 1 FROM ratings r
          WHERE r.transaction_id = t.id AND r.reviewer_id = ?
        )
      ORDER BY t.sold_at DESC
    `).all(userId, userId, userId, userId, userId, userId);

    return { transactions, status: 200 };
  })

  .get("/transactions/:id", async ({ params, headers, jwt }) => {
    const payload = await requireAuth(headers, jwt);
    if ('status' in payload) return payload;

    const userId = Number(payload.id);

    const transaction = db.query(`
      SELECT
        t.id,
        t.listing_id,
        t.seller_id,
        t.buyer_id,
        t.sold_at,
        l.title AS listing_title,
        seller.name AS seller_name,
        buyer.name AS buyer_name
      FROM transactions t
      JOIN listings l ON l.id = t.listing_id
      LEFT JOIN users seller ON seller.id = t.seller_id
      LEFT JOIN users buyer ON buyer.id = t.buyer_id
      WHERE t.id = ?
    `).get(params.id) as {
      id: string;
      listing_id: string;
      seller_id: number;
      buyer_id: number | null;
      sold_at: string | null;
      listing_title: string;
      seller_name: string | null;
      buyer_name: string | null;
    } | null;

    if (!transaction) return { message: "Transaction not found", status: 404 };

    const isBuyer = Number(transaction.buyer_id) === userId;
    const isSeller = Number(transaction.seller_id) === userId;
    if (!isBuyer && !isSeller) return { message: "Forbidden", status: 403 };

    const myRating = db.query(`
      SELECT id, stars, body, created_at FROM ratings
      WHERE transaction_id = ? AND reviewer_id = ?
    `).get(params.id, userId) as { id: number; stars: number; body: string | null; created_at: string } | null;

    const counterparty = isBuyer
      ? { id: transaction.seller_id, name: transaction.seller_name, role: "seller" as const }
      : { id: transaction.buyer_id, name: transaction.buyer_name, role: "buyer" as const };

    return {
      transaction: {
        ...transaction,
        my_role: isBuyer ? "buyer" : "seller",
        counterparty,
        my_rating: myRating,
      },
      status: 200,
    };
  });

export default ratingsRoutes;
