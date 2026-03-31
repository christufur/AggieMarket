import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { staticPlugin } from "@elysiajs/static";
import authRoutes from "./src/routes/auth";
import listingsRoutes from "./src/routes/listings";
import servicesRoutes from "./src/routes/services";
import eventsRoutes from "./src/routes/events";
import uploadsRoutes from "./src/routes/uploads";
import usersRoutes from "./src/routes/users";


const app = new Elysia()
  .use(cors())
  .use(staticPlugin({ assets: "uploads", prefix: "/uploads" }))
  .use(authRoutes)
  .use(listingsRoutes)
  .use(servicesRoutes)
  .use(eventsRoutes)
  .use(uploadsRoutes)
  .use(usersRoutes)
  .get("/", () => ({ status: "AggieMarket API running" }))
  .listen(3000);


console.log(`Server running at http://localhost:${app.server?.port}`);
