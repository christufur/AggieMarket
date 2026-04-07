import Elysia from "elysia";
import { jwt } from "@elysiajs/jwt";
import db from "../db";
import crypto from "crypto";

const servicesRoutes = new Elysia()
    .use(jwt({ name: "jwt", secret: process.env.JWT_SECRET || "secret" }))

    // browse all services
    .get("/services", async ({ headers, jwt }) => {
        const token = (headers as any).authorization?.replace("Bearer ", "");
        if (!token) return { message: "Unauthorized", status: 401 };

        const payload = await jwt.verify(token) as { id: number; email: string } | false;
        if (!payload) return { message: "Invalid token", status: 401 };

        const services = db.query(
            `SELECT s.*, u.name AS provider_name,
                    (SELECT s3_url FROM service_images WHERE service_id = s.id ORDER BY sort_order ASC LIMIT 1) AS image_url
             FROM services s
             LEFT JOIN users u ON u.id = s.provider_id
             WHERE s.status = 'active' ORDER BY s.created_at DESC`
        ).all();
        return { services, status: 200 };
    })

    // services by category
    .get("/services/category/:category", async ({ params, headers, jwt }) => {
        const token = (headers as any).authorization?.replace("Bearer ", "");
        if (!token) return { message: "Unauthorized", status: 401 };

        const payload = await jwt.verify(token) as { id: number; email: string } | false;
        if (!payload) return { message: "Invalid token", status: 401 };

        const services = db.query("SELECT * FROM services WHERE category = ? AND status = 'active' ORDER BY created_at DESC").all(params.category);
        return { services, status: 200 };
    })

    // services by provider
    .get("/services/provider/:provider_id", async ({ params, headers, jwt }) => {
        const token = (headers as any).authorization?.replace("Bearer ", "");
        if (!token) return { message: "Unauthorized", status: 401 };

        const payload = await jwt.verify(token) as { id: number; email: string } | false;
        if (!payload) return { message: "Invalid token", status: 401 };

        const services = db.query("SELECT * FROM services WHERE provider_id = ? AND status = 'active' ORDER BY created_at DESC").all(params.provider_id);
        return { services, status: 200 };
    })

    // get singular service
    .get("/services/:id", async ({ params, headers, jwt }) => {
        const token = (headers as any).authorization?.replace("Bearer ", "");
        if (!token) return { message: "Unauthorized", status: 401 };

        const payload = await jwt.verify(token) as { id: number; email: string } | false;
        if (!payload) return { message: "Invalid token", status: 401 };

        const service = db.query(
            `SELECT s.*, u.name AS provider_name
             FROM services s LEFT JOIN users u ON u.id = s.provider_id
             WHERE s.id = ? AND s.status != 'deleted'`
        ).get(params.id);
        if (!service) return { message: "Service not found", status: 404 };

        db.run("UPDATE services SET view_count = view_count + 1 WHERE id = ?", [params.id]);

        const images = db.query("SELECT s3_url AS url, sort_order FROM service_images WHERE service_id = ? ORDER BY sort_order ASC").all(params.id);

        return { service: { ...(service as object), images }, status: 200 };
    })

    // create service
    .post("/services", async ({ body, headers, jwt }) => {
        const token = (headers as any).authorization?.replace("Bearer ", "");
        if (!token) return { message: "Unauthorized", status: 401 };

        const payload = await jwt.verify(token) as { id: number; email: string } | false;
        if (!payload) return { message: "Invalid token", status: 401 };

        const { title, description, price, price_type, category, availability } = body as {
            title: string;
            description: string;
            price: number;
            price_type: string;
            category: string;
            availability: string;
        };

        if (!title || !category) {
            return { message: "title and category are required", status: 400 };
        }

        if (!price_type) {
            return { message: "price_type is required", status: 400 };
        }

        const id = crypto.randomUUID();

        db.run(
            `INSERT INTO services (id, provider_id, title, description, price, price_type, category, availability) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, payload.id, title, description, price ?? null, price_type, category, availability ?? null]
        );

        const service = db.query("SELECT * FROM services WHERE id = ?").get(id);
        return { service, status: 201 };
    })

    // soft delete service
    .delete("/services/:id", async ({ params, headers, jwt }) => {
        const token = (headers as any).authorization?.replace("Bearer ", "");
        if (!token) return { message: "Unauthorized", status: 401 };

        const payload = await jwt.verify(token) as { id: number; email: string } | false;
        if (!payload) return { message: "Invalid token", status: 401 };

        const service = db.query("SELECT * FROM services WHERE id = ? AND status != 'deleted'").get(params.id) as {
            id: string; provider_id: number;
        } | null;

        if (!service) return { message: "Service not found", status: 404 };
        if (String(service.provider_id) !== String(payload.id)) return { message: "Forbidden", status: 403 };

        db.run("UPDATE services SET status = 'deleted', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [params.id]);

        return { message: "Service deleted", status: 200 };
    })

export default servicesRoutes;
