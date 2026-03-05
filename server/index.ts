import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";

const app = new Elysia()
  .use(cors())
  .get("/", () => ({ status: "AggieMarket API running" }))
  .listen(3000);

console.log(`Server running at http://localhost:${app.server?.port}`);
