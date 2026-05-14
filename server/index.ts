/**
 * AggieMarket API — entry point.
 *
 * Boots an Elysia HTTP + WebSocket server, applies CORS, and mounts every
 * route module under a flat URL space (e.g. /auth/*, /listings/*, /events/*).
 * Run with `bun dev` (hot reload) or `bun index.ts` (production via PM2).
 *
 * Required env: JWT_SECRET (fail-fast below). Optional: PORT, RESEND_*, AWS_*.
 */
import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}
import authRoutes from "./src/routes/auth";
import listingsRoutes from "./src/routes/listings";
import servicesRoutes from "./src/routes/services";
import eventsRoutes from "./src/routes/events";
import uploadsRoutes from "./src/routes/uploads";
import usersRoutes from "./src/routes/users";
import conversationsRoutes from "./src/routes/conversations";
import wsRoutes from "./src/routes/ws";
import savedRoutes from "./src/routes/saved";
import ratingsRoutes from "./src/routes/ratings";
import reportsRoutes from "./src/routes/reports";


const app = new Elysia()
  .use(cors())
  .use(authRoutes)
  .use(listingsRoutes)
  .use(servicesRoutes)
  .use(eventsRoutes)
  .use(uploadsRoutes)
  .use(usersRoutes)
  .use(conversationsRoutes)
  .use(wsRoutes)
  .use(savedRoutes)
  .use(ratingsRoutes)
  .use(reportsRoutes)
  .get("/", () => ({ status: "AggieMarket API running" }))
  .listen(Number(process.env.PORT) || 3000);


console.log(`Server running at http://localhost:${app.server?.port}`);
