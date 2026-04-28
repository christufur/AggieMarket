import { Elysia } from "elysia";
import { jwt } from "@elysiajs/jwt";
import db from "../db";

async function requireAdmin(headers: Record<string, string | undefined>, jwtInstance: any) {
  const token = headers.authorization?.replace("Bearer ", "");
  if (!token) return null;

  const payload = await jwtInstance.verify(token) as { id: number; email: string } | false;
  if (!payload) return null;

  const admin = db.query(`
    SELECT id
    FROM users
    WHERE id = ? AND is_admin = 1
  `).get(payload.id);

  if (!admin) return null;

  return payload;
}

const reportsRoutes = new Elysia()
  .use(jwt({ name: "jwt", secret: process.env.JWT_SECRET || "secret" }))

  .post("/reports", async ({ body, headers, jwt }) => {
    const token = (headers as any).authorization?.replace("Bearer ", "");
    if (!token) return { message: "Unauthorized", status: 401 };

    const payload = await jwt.verify(token) as { id: number; email: string } | false;
    if (!payload) return { message: "Invalid token", status: 401 };

    const { target_type, target_id, reason, description } = body as {
      target_type?: "listing" | "message" | "user";
      target_id?: string | number;
      reason?: string;
      description?: string | null;
    };

    if (!target_type || !["listing", "message", "user"].includes(target_type)) {
      return { message: "target_type must be one of listing, message, or user", status: 400 };
    }
    if (target_id == null || target_id === "") return { message: "target_id is required", status: 400 };
    if (!reason?.trim()) return { message: "reason is required", status: 400 };

    const normalizedTargetId = String(target_id);

    let targetExists = false;

    if (target_type === "listing") {
      targetExists = !!db.query(`
        SELECT id FROM listings
        WHERE id = ? AND status != 'deleted'
      `).get(normalizedTargetId);
    } else if (target_type === "message") {
      targetExists = !!db.query(`
        SELECT id FROM messages
        WHERE id = ? AND is_hidden = 0
      `).get(normalizedTargetId);
    } else {
      targetExists = !!db.query(`
        SELECT id FROM users
        WHERE id = ?
      `).get(normalizedTargetId);
    }

    if (!targetExists) return { message: "Target not found", status: 404 };

    const result = db.run(`
      INSERT INTO reports (reporter_id, target_type, target_id, reason, description)
      VALUES (?, ?, ?, ?, ?)
    `, [
      payload.id,
      target_type,
      normalizedTargetId,
      reason.trim(),
      description?.trim() ? description.trim() : null,
    ]);

    const report = db.query(`
      SELECT *
      FROM reports
      WHERE id = ?
    `).get(result.lastInsertRowid);

    return { report, status: 201 };
  })

  .get("/admin/reports", async ({ headers, jwt, query }) => {
    const admin = await requireAdmin(headers as Record<string, string | undefined>, jwt);
    if (!admin) return { message: "Not found", status: 404 };

    const requestedStatus = (query as { status?: string }).status;
    const status = requestedStatus && ["pending", "resolved", "dismissed"].includes(requestedStatus)
      ? requestedStatus
      : "pending";

    const parsedLimit = Number((query as { limit?: string }).limit);
    const parsedOffset = Number((query as { offset?: string }).offset);
    const limit = Number.isFinite(parsedLimit) && parsedLimit > 0
      ? Math.min(Math.floor(parsedLimit), 100)
      : 20;
    const offset = Number.isFinite(parsedOffset) && parsedOffset >= 0
      ? Math.floor(parsedOffset)
      : 0;

    const reports = db.query(`
      SELECT
        r.*,
        reporter.name AS reporter_name,
        reviewer.name AS reviewed_by_name,
        l.id AS listing_id,
        l.title AS listing_title,
        l.description AS listing_description,
        l.status AS listing_status,
        m.id AS message_id,
        m.content AS message_content,
        m.is_hidden AS message_is_hidden,
        u.id AS user_id,
        u.name AS user_name,
        u.email AS user_email,
        u.status AS user_status
      FROM reports r
      LEFT JOIN users reporter ON reporter.id = r.reporter_id
      LEFT JOIN users reviewer ON reviewer.id = r.reviewed_by
      LEFT JOIN listings l ON r.target_type = 'listing' AND l.id = r.target_id
      LEFT JOIN messages m ON r.target_type = 'message' AND m.id = r.target_id
      LEFT JOIN users u ON r.target_type = 'user' AND CAST(u.id AS TEXT) = r.target_id
      WHERE r.status = ?
      ORDER BY r.created_at DESC, r.id DESC
      LIMIT ? OFFSET ?
    `).all(status, limit, offset) as Array<Record<string, any>>;

    const totalRow = db.query(`
      SELECT COUNT(*) AS count
      FROM reports
      WHERE status = ?
    `).get(status) as { count: number };

    const items = reports.map((report) => {
      let target: Record<string, unknown> | null = null;

      if (report.target_type === "listing" && report.listing_id) {
        target = {
          id: report.listing_id,
          title: report.listing_title,
          description: report.listing_description,
          status: report.listing_status,
        };
      } else if (report.target_type === "message" && report.message_id) {
        target = {
          id: report.message_id,
          content: report.message_content,
          is_hidden: Boolean(report.message_is_hidden),
        };
      } else if (report.target_type === "user" && report.user_id) {
        target = {
          id: report.user_id,
          name: report.user_name,
          email: report.user_email,
          status: report.user_status,
        };
      }

      return {
        id: report.id,
        reporter_id: report.reporter_id,
        reporter_name: report.reporter_name,
        target_type: report.target_type,
        target_id: report.target_id,
        target,
        reason: report.reason,
        description: report.description,
        status: report.status,
        reviewed_by: report.reviewed_by,
        reviewed_by_name: report.reviewed_by_name,
        admin_note: report.admin_note,
        created_at: report.created_at,
      };
    });

    return { reports: items, total: totalRow.count, limit, offset, status: 200 };
  })

  .post("/admin/reports/:id/resolve", async ({ params, body, headers, jwt }) => {
    const admin = await requireAdmin(headers as Record<string, string | undefined>, jwt);
    if (!admin) return { message: "Not found", status: 404 };

    const report = db.query(`
      SELECT *
      FROM reports
      WHERE id = ?
    `).get(params.id) as {
      id: number;
      target_type: "listing" | "message" | "user";
      target_id: string;
      status: string;
    } | null;

    if (!report) return { message: "Report not found", status: 404 };
    if (report.status !== "pending") {
      return { message: "Report has already been reviewed", status: 400 };
    }

    const { admin_note } = body as { admin_note?: string | null };

    if (report.target_type === "listing") {
      db.run(`
        UPDATE listings
        SET status = 'deleted', updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND status != 'deleted'
      `, [report.target_id]);
    } else if (report.target_type === "message") {
      db.run(`
        UPDATE messages
        SET is_hidden = 1
        WHERE id = ?
      `, [report.target_id]);
    }

    db.run(`
      UPDATE reports
      SET status = 'resolved',
          reviewed_by = ?,
          admin_note = ?
      WHERE id = ?
    `, [admin.id, admin_note?.trim() ? admin_note.trim() : null, params.id]);

    const updatedReport = db.query(`
      SELECT *
      FROM reports
      WHERE id = ?
    `).get(params.id);

    return { report: updatedReport, status: 200 };
  })

  .post("/admin/reports/:id/dismiss", async ({ params, body, headers, jwt }) => {
    const admin = await requireAdmin(headers as Record<string, string | undefined>, jwt);
    if (!admin) return { message: "Not found", status: 404 };

    const report = db.query(`
      SELECT id, status
      FROM reports
      WHERE id = ?
    `).get(params.id) as { id: number; status: string } | null;

    if (!report) return { message: "Report not found", status: 404 };
    if (report.status !== "pending") {
      return { message: "Report has already been reviewed", status: 400 };
    }

    const { admin_note } = body as { admin_note?: string | null };

    db.run(`
      UPDATE reports
      SET status = 'dismissed',
          reviewed_by = ?,
          admin_note = ?
      WHERE id = ?
    `, [admin.id, admin_note?.trim() ? admin_note.trim() : null, params.id]);

    const updatedReport = db.query(`
      SELECT *
      FROM reports
      WHERE id = ?
    `).get(params.id);

    return { report: updatedReport, status: 200 };
  });

export default reportsRoutes;
