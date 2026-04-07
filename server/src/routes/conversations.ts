import { Elysia } from "elysia";
import { jwt } from "@elysiajs/jwt";
import db from "../db";


const conversationsRoutes = new Elysia()
    .use(jwt({ name: "jwt", secret: process.env.JWT_SECRET || "secret" }))

    // GET all conversations for a user
    //lists users conversations sorted by last message timestamp
    //JOIN users table to get partner names and avatars, and last message content + number of unread messages
    //order by last_message_at DESC
    .get("/conversations", async ({ headers, jwt }) => {
        const token = (headers as any).authorization?.replace("Bearer ", "");
        if (!token) return { message: "Unauthorized", status: 401 };

        const payload = await jwt.verify(token) as { id: number; email: string } | false;
        if (!payload) return { message: "Invalid token", status: 401 };
        const userId = Number(payload.id);
    })

    //Create or find existing conversation between two users
    //purpose: allows users to start a conversation with a listing, service, event, or seller
    .post("/conversations", async ({ body, headers, jwt }) => {
        const token = (headers as any).authorization?.replace("Bearer ", "");
        if (!token) return { message: "Unauthorized", status: 401 };

        const payload = await jwt.verify(token) as { id: number; email: string } | false;
        if (!payload) return { message: "Invalid token", status: 401 };
        const userId = Number(payload.id);
    })

    //GET /conversations/unread-count
    //count messages where sender_id != me AND read_at is null across all user's conversations
    //returns the count
    .get("/conversations/unread-count", async ({ headers, jwt }) => {
        const token = (headers as any).authorization?.replace("Bearer ", "");
        if (!token) return { message: "Unauthorized", status: 401 };

        const payload = await jwt.verify(token) as { id: number; email: string } | false;
        if (!payload) return { message: "Invalid token", status: 401 };
        const userId = Number(payload.id);
    })

    //GET /conversations/:id/messages
    //paginated list of messages for a conversation
    //verifies user has access to the conversation
    //returns the messages
    .get("/conversations/:id/messages", async ({ params, headers, jwt }) => {
        const token = (headers as any).authorization?.replace("Bearer ", "");
        if (!token) return { message: "Unauthorized", status: 401 };

        const payload = await jwt.verify(token) as { id: number; email: string } | false;
        if (!payload) return { message: "Invalid token", status: 401 };
        const userId = Number(payload.id);
    })

    //POST /conversations/:id/messages
    //send message
    //insert, update last_message_at, and then push to WS
    .post("/conversations/:id/messages", async ({ params, body, headers, jwt }) => {
        const token = (headers as any).authorization?.replace("Bearer ", "");
        if (!token) return { message: "Unauthorized", status: 401 };

        const payload = await jwt.verify(token) as { id: number; email: string } | false;
        if (!payload) return { message: "Invalid token", status: 401 };
        const userId = Number(payload.id);
    })

    //PATCH /conversations/:id/read
    //UPDATE messages SET read_at = datetime('now') WHERE conversation_id = ? AND sender_id != me AND read_at is null
    //returns the number of updated rows
    .patch("/conversations/:id/read", async ({ params, headers, jwt }) => {
        const token = (headers as any).authorization?.replace("Bearer ", "");
        if (!token) return { message: "Unauthorized", status: 401 };

        const payload = await jwt.verify(token) as { id: number; email: string } | false;
        if (!payload) return { message: "Invalid token", status: 401 };
        const userId = Number(payload.id);
    })

export default conversationsRoutes;