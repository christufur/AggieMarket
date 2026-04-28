import { Elysia, t } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import db from "../db";
import { requireAuth } from "../utils/auth";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const EXT_MAP: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const s3 = new S3Client({ region: process.env.AWS_REGION ?? "us-east-1" });
const S3_BUCKET = process.env.S3_BUCKET!;
const S3_BASE_URL = `https://${S3_BUCKET}.s3.${process.env.AWS_REGION ?? "us-east-1"}.amazonaws.com`;

const uploadsRoutes = new Elysia()
  .use(jwt({ name: "jwt", secret: process.env.JWT_SECRET! }))

  .post(
    "/upload",
    async ({ body, headers, jwt }) => {
      const payload = await requireAuth(headers, jwt);
      if ('status' in payload) return payload;

      const file = body.file as File;

      if (!ALLOWED_TYPES.includes(file.type)) {
        return { message: "Only JPEG, PNG, and WebP images are allowed", status: 400 };
      }
      if (file.size > MAX_SIZE) {
        return { message: "File exceeds 5MB limit", status: 400 };
      }

      const ext = EXT_MAP[file.type];
      const filename = `${crypto.randomUUID()}.${ext}`;
      const buffer = await file.arrayBuffer();

      try {
        await s3.send(new PutObjectCommand({
          Bucket: S3_BUCKET,
          Key: filename,
          Body: new Uint8Array(buffer),
          ContentType: file.type,
        }));
      } catch (err: unknown) {
        console.error("S3 upload error:", err);
        return { message: `S3 error: ${err instanceof Error ? err.message : String(err)}`, status: 500 };
      }

      const url = `${S3_BASE_URL}/${filename}`;
      return { url, s3_key: filename, status: 201 };
    },
    {
      body: t.Object({ file: t.File() }),
    }
  )

  .post("/listings/:id/images", async ({ params, body, headers, jwt }) => {
    const payload = await requireAuth(headers, jwt);
    if ('status' in payload) return payload;

    const listing = db.query("SELECT * FROM listings WHERE id = ? AND status != 'deleted'").get(params.id) as { seller_id: number } | null;
    if (!listing) return { message: "Listing not found", status: 404 };
    if (String(listing.seller_id) !== String(payload.id)) return { message: "Forbidden", status: 403 };

    const { url, s3_key, sort_order } = body as { url: string; s3_key?: string; sort_order?: number };
    if (!url) return { message: "url is required", status: 400 };

    db.run(
      "INSERT INTO listing_images (listing_id, s3_key, s3_url, sort_order) VALUES (?, ?, ?, ?)",
      [params.id, s3_key ?? url, url, sort_order ?? 0]
    );

    return { message: "Image attached", status: 201 };
  })

  .post("/services/:id/images", async ({ params, body, headers, jwt }) => {
    const payload = await requireAuth(headers, jwt);
    if ('status' in payload) return payload;

    const service = db.query("SELECT * FROM services WHERE id = ? AND status != 'deleted'").get(params.id) as { provider_id: number } | null;
    if (!service) return { message: "Service not found", status: 404 };
    if (String(service.provider_id) !== String(payload.id)) return { message: "Forbidden", status: 403 };

    const { url, s3_key, sort_order } = body as { url: string; s3_key?: string; sort_order?: number };
    if (!url) return { message: "url is required", status: 400 };

    db.run(
      "INSERT INTO service_images (service_id, s3_key, s3_url, sort_order) VALUES (?, ?, ?, ?)",
      [params.id, s3_key ?? url, url, sort_order ?? 0]
    );

    return { message: "Image attached", status: 201 };
  })

  .post("/events/:id/images", async ({ params, body, headers, jwt }) => {
    const payload = await requireAuth(headers, jwt);
    if ('status' in payload) return payload;

    const event = db.query("SELECT * FROM events WHERE id = ? AND status != 'deleted'").get(params.id) as { organizer_id: number } | null;
    if (!event) return { message: "Event not found", status: 404 };
    if (String(event.organizer_id) !== String(payload.id)) return { message: "Forbidden", status: 403 };

    const { url, s3_key, sort_order } = body as { url: string; s3_key?: string; sort_order?: number };
    if (!url) return { message: "url is required", status: 400 };

    db.run(
      "INSERT INTO event_images (event_id, s3_key, s3_url, sort_order) VALUES (?, ?, ?, ?)",
      [params.id, s3_key ?? url, url, sort_order ?? 0]
    );

    return { message: "Image attached", status: 201 };
  });

export default uploadsRoutes;
