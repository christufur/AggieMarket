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
import ratingsRoutes from "./src/routes/ratings";
import reportsRoutes from "./src/routes/reports";
import conversationsRoutes from "./src/routes/conversations";
import wsRoutes from "./src/routes/ws";
import savedRoutes from "./src/routes/saved";


const app = new Elysia()
  .use(cors())
  .use(authRoutes)
  .use(listingsRoutes)
  .use(servicesRoutes)
  .use(eventsRoutes)
  .use(uploadsRoutes)
  .use(usersRoutes)
  .use(ratingsRoutes)
  .use(reportsRoutes)
  .use(conversationsRoutes)
  .use(wsRoutes)
  .use(savedRoutes)
  .get("/", () => ({ status: "AggieMarket API running" }))
  .listen(Number(process.env.PORT) || 3000);


console.log(`Server running at http://localhost:${app.server?.port}`);
