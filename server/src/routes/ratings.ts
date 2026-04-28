import { Elysia } from "elysia";
import { jwt } from "@elysiajs/jwt";
import db from "../db";

const ratingsRoutes = new Elysia()
  .use(jwt({ name: "jwt", secret: process.env.JWT_SECRET || "secret" }))

  .post("/ratings", async ({ body, headers, jwt }) => {
    const token = (headers as any).authorization?.replace("Bearer ", "");
    if (!token) return { message: "Unauthorized", status: 401 };

    const payload = await jwt.verify(token) as { id: number; email: string } | false;
    if (!payload) return { message: "Invalid token", status: 401 };

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
  });

export default ratingsRoutes;
