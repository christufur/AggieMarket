import { Elysia, t } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { join } from "path";
import { mkdir } from "fs/promises";
import db from "../db";

const UPLOADS_DIR = join(process.cwd(), "uploads");
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const EXT_MAP: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

await mkdir(UPLOADS_DIR, { recursive: true });

const uploadsRoutes = new Elysia()
  .use(jwt({ name: "jwt", secret: process.env.JWT_SECRET! }))

  // UPLOAD image
  .post(
    "/upload",
    async ({ body, headers, jwt }) => {
      const token = (headers as any).authorization?.replace("Bearer ", "");
      if (!token) return { message: "Unauthorized", status: 401 };

      const payload = await jwt.verify(token) as { id: number } | false;
      if (!payload) return { message: "Invalid token", status: 401 };

      const file = body.file as File;

      if (!ALLOWED_TYPES.includes(file.type)) {
        return { message: "Only JPEG, PNG, and WebP images are allowed", status: 400 };
      }
      if (file.size > MAX_SIZE) {
        return { message: "File exceeds 5MB limit", status: 400 };
      }

      const ext = EXT_MAP[file.type];
      const filename = `${crypto.randomUUID()}.${ext}`;
      const filepath = join(UPLOADS_DIR, filename);

      const buffer = await file.arrayBuffer();
      await Bun.write(filepath, buffer);

      const url = `/uploads/${filename}`;
      return { url, status: 201 };
    },
    {
      body: t.Object({ file: t.File() }),
    }
  )

  // ATTACH image to listing
  .post("/listings/:id/images", async ({ params, body, headers, jwt }) => {
    const token = (headers as any).authorization?.replace("Bearer ", "");
    if (!token) return { message: "Unauthorized", status: 401 };

    const payload = await jwt.verify(token) as { id: number } | false;
    if (!payload) return { message: "Invalid token", status: 401 };

    const listing = db.query("SELECT * FROM listings WHERE id = ? AND status != 'deleted'").get(params.id) as { seller_id: number } | null;
    if (!listing) return { message: "Listing not found", status: 404 };
    if (String(listing.seller_id) !== String(payload.id)) return { message: "Forbidden", status: 403 };

    const { url, sort_order } = body as { url: string; sort_order?: number };
    if (!url) return { message: "url is required", status: 400 };

    db.run(
      "INSERT INTO listing_images (listing_id, s3_key, s3_url, sort_order) VALUES (?, ?, ?, ?)",
      [params.id, url, url, sort_order ?? 0]
    );

    return { message: "Image attached", status: 201 };
  })

  // ATTACH image to service
  .post("/services/:id/images", async ({ params, body, headers, jwt }) => {
    const token = (headers as any).authorization?.replace("Bearer ", "");
    if (!token) return { message: "Unauthorized", status: 401 };

    const payload = await jwt.verify(token) as { id: number } | false;
    if (!payload) return { message: "Invalid token", status: 401 };

    const service = db.query("SELECT * FROM services WHERE id = ? AND status != 'deleted'").get(params.id) as { provider_id: number } | null;
    if (!service) return { message: "Service not found", status: 404 };
    if (String(service.provider_id) !== String(payload.id)) return { message: "Forbidden", status: 403 };

    const { url, sort_order } = body as { url: string; sort_order?: number };
    if (!url) return { message: "url is required", status: 400 };

    db.run(
      "INSERT INTO service_images (service_id, s3_key, s3_url, sort_order) VALUES (?, ?, ?, ?)",
      [params.id, url, url, sort_order ?? 0]
    );

    return { message: "Image attached", status: 201 };
  })

  // ATTACH image to event
  .post("/events/:id/images", async ({ params, body, headers, jwt }) => {
    const token = (headers as any).authorization?.replace("Bearer ", "");
    if (!token) return { message: "Unauthorized", status: 401 };

    const payload = await jwt.verify(token) as { id: number } | false;
    if (!payload) return { message: "Invalid token", status: 401 };

    const event = db.query("SELECT * FROM events WHERE id = ? AND status != 'deleted'").get(params.id) as { organizer_id: number } | null;
    if (!event) return { message: "Event not found", status: 404 };
    if (String(event.organizer_id) !== String(payload.id)) return { message: "Forbidden", status: 403 };

    const { url, sort_order } = body as { url: string; sort_order?: number };
    if (!url) return { message: "url is required", status: 400 };

    db.run(
      "INSERT INTO event_images (event_id, s3_key, s3_url, sort_order) VALUES (?, ?, ?, ?)",
      [params.id, url, url, sort_order ?? 0]
    );

    return { message: "Image attached", status: 201 };
  });

export default uploadsRoutes;
