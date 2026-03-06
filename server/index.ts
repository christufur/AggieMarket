import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import authRoutes from "./src/routes/auth";

const app = new Elysia()
  .use(cors())
  .use(authRoutes)
  .get("/", () => ({ status: "AggieMarket API running" }))
  .listen(3000);


console.log(`Server running at http://localhost:${app.server?.port}`);
