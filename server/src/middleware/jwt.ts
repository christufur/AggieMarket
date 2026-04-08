import { Elysia } from "elysia";
import jwt from "@elysiajs/jwt";

const jwtMiddleware = new Elysia()
    .use(jwt({
        name: "jwt",
        secret: process.env.JWT_SECRET!
    }))

export default jwtMiddleware;
