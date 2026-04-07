import { Elysia } from "elysia";
import { jwt } from "@elysiajs/jwt";
import db from "../db";
import { addConnection, removeConnection, sendToUser } from "../utils/connections";

const wsRoutes = new Elysia()
    .use(jwt({ name: "jwt", secret: process.env.JWT_SECRET || "secret" }))
    .ws("/ws/chat", {
        async open(ws) {
            // Auth via query param — browser WebSocket API can't set headers
            const url = new URL(ws.data.request.url);
            const token = url.searchParams.get("token");
            if (!token) { ws.close(4001, "No token"); return; }

            const payload = await (ws.data as any).jwt.verify(token);
            if (!payload) { ws.close(4001, "Invalid token"); return; }

            (ws as any).userId = Number(payload.id);
            addConnection(Number(payload.id), ws);
        },

        message(ws, raw) {
            const userId = (ws as any).userId;
            if (!userId) return;

            try {
                const msg = JSON.parse(String(raw));

                if (msg.type === "typing" && msg.conversationId) {
                    const convo = db
                        .query("SELECT buyer_id, seller_id FROM conversations WHERE id = ?")
                        .get(msg.conversationId) as any;
                    if (!convo) return;

                    const recipientId = convo.buyer_id === userId ? convo.seller_id : convo.buyer_id;
                    sendToUser(recipientId, {
                        type: "typing",
                        conversationId: msg.conversationId,
                        userId,
                    });
                }
            } catch {
                // Ignore malformed messages
            }
        },

        close(ws) {
            const userId = (ws as any).userId;
            if (userId) removeConnection(userId, ws);
        },
    });

export default wsRoutes;
