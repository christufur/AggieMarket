import { Elysia } from "elysia";
import { jwt } from "@elysiajs/jwt";
import db from "../db";
import { sendToUser } from "../utils/connections";

/** Row shape for `SELECT * FROM conversations` (bun:sqlite infers `.get()` as `{}` otherwise). */
type ConversationRow = {
    id: string;
    listing_id: string | null;
    service_id: string | null;
    event_id: string | null;
    buyer_id: number;
    seller_id: number;
    last_message_at: string | null;
    created_at: string | null;
};

const conversationsRoutes = new Elysia()
    .use(jwt({ name: "jwt", secret: process.env.JWT_SECRET! }))

    // GET /conversations — list all conversations for the authenticated user
    // 1. Auth
    // 2. Query conversations with partner info, last message preview, and unread count
    // 3. Return sorted by last_message_at DESC
    .get("/conversations", async ({ headers, jwt }) => {
        const token = (headers as any).authorization?.replace("Bearer ", "");
        if (!token) return { message: "Unauthorized", status: 401 };

        const payload = await jwt.verify(token) as { id: number; email: string } | false;
        if (!payload) return { message: "Invalid token", status: 401 };
        const userId = Number(payload.id);

        const conversations = db
            .query(`
                SELECT c.*,
                u.id as partner_id,
                u.name as partner_name,
                u.avatar_url as partner_avatar,
                (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY rowid DESC LIMIT 1) as last_message_content,
                (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND sender_id != ? AND read_at IS NULL) as unread_count
            FROM conversations c
            JOIN users u ON CASE WHEN c.buyer_id = ? THEN c.seller_id ELSE c.buyer_id END = u.id
            WHERE c.buyer_id = ? OR c.seller_id = ?
            ORDER BY c.last_message_at DESC NULLS LAST
        `)
            .all(userId, userId, userId, userId);
        return { conversations, status: 200 }; 
    })

    // POST /conversations — create or find existing conversation
    // 1. Auth
    // 2. Reject if seller_id === userId (can't message yourself)
    // 3. Check for existing conversation between buyer+seller for this item
    // 4. If found, return it. If not, insert with crypto.randomUUID(), return new row.
    .post("/conversations", async ({ body, headers, jwt }) => {
        const token = (headers as any).authorization?.replace("Bearer ", "");
        if (!token) return { message: "Unauthorized", status: 401 };

        const payload = await jwt.verify(token) as { id: number; email: string } | false;
        if (!payload) return { message: "Invalid token", status: 401 };
        const userId = Number(payload.id);

        const { seller_id, listing_id, service_id, event_id } = body as {
            seller_id: number;
            listing_id?: string;
            service_id?: string;
            event_id?: string;
        };

        if (seller_id === userId) return { message: "Cannot message yourself", status: 400 };
        
        const existingConversation = db
            .query("SELECT * FROM conversations WHERE buyer_id = ? AND seller_id = ? AND listing_id IS ? AND service_id IS ? AND event_id IS ?")
            .get(userId, seller_id, listing_id ?? null, service_id ?? null, event_id ?? null);
        if (existingConversation) return { conversation: existingConversation, status: 200 };

        const conversationId = crypto.randomUUID();
        db.run(
            "INSERT INTO conversations (id, buyer_id, seller_id, listing_id, service_id, event_id) VALUES (?, ?, ?, ?, ?, ?)",
            [conversationId, userId, seller_id, listing_id ?? null, service_id ?? null, event_id ?? null],
        );
        const conversation = db.query("SELECT * FROM conversations WHERE id = ?").get(conversationId as string);
        if (!conversation) return { message: "Failed to create conversation", status: 500 };
        return { conversation, status: 201 };
    })

    // GET /conversations/unread-count — total unread messages across all conversations
    // 1. Auth
    // 2. Count messages where sender_id != me AND read_at IS NULL
    // 3. Return { count }
    .get("/conversations/unread-count", async ({ headers, jwt }) => {
        const token = (headers as any).authorization?.replace("Bearer ", "");
        if (!token) return { message: "Unauthorized", status: 401 };

        const payload = await jwt.verify(token) as { id: number; email: string } | false;
        if (!payload) return { message: "Invalid token", status: 401 };
        const userId = Number(payload.id);

        const row = db
            .query("SELECT COUNT(*) as count FROM messages m JOIN conversations c ON c.id = m.conversation_id WHERE (c.buyer_id = ? OR c.seller_id = ?) AND m.sender_id != ? AND m.read_at IS NULL")
            .get(userId, userId, userId) as { count: number } | null;
        return { count: row?.count ?? 0, status: 200 };
    })

    // GET /conversations/:id/messages — message history for a conversation
    // 1. Auth
    // 2. Verify user is a participant (buyer or seller), 403 if not
    // 3. Fetch messages with sender name, ordered by created_at ASC
    .get("/conversations/:id/messages", async ({ params, headers, jwt }) => {
        const token = (headers as any).authorization?.replace("Bearer ", "");
        if (!token) return { message: "Unauthorized", status: 401 };

        const payload = await jwt.verify(token) as { id: number; email: string } | false;
        if (!payload) return { message: "Invalid token", status: 401 };
        const userId = Number(payload.id);

        const conversation = db
            .query("SELECT * FROM conversations WHERE id = ? AND (buyer_id = ? OR seller_id = ?)")
            .get(params.id, userId, userId) as ConversationRow | null;
        if (!conversation) return { message: "Forbidden", status: 403 };

        const messages = db
            .query("SELECT m.*, u.name as sender_name FROM messages m JOIN users u ON u.id = m.sender_id WHERE conversation_id = ? ORDER BY created_at ASC")
            .all(params.id);
        return { messages, status: 200 };
    })

    // POST /conversations/:id/messages — send a message
    // 1. Auth
    // 2. Verify participant
    // 3. Insert message with crypto.randomUUID()
    // 4. Update conversations.last_message_at
    // 5. Push new_message event to recipient via WebSocket
    .post("/conversations/:id/messages", async ({ params, body, headers, jwt }) => {
        const token = (headers as any).authorization?.replace("Bearer ", "");
        if (!token) return { message: "Unauthorized", status: 401 };

        const payload = await jwt.verify(token) as { id: number; email: string } | false;
        if (!payload) return { message: "Invalid token", status: 401 };
        const userId = Number(payload.id);

        const conversation = db
            .query("SELECT * FROM conversations WHERE id = ? AND (buyer_id = ? OR seller_id = ?)")
            .get(params.id, userId, userId) as ConversationRow | null;
        if (!conversation) return { message: "Forbidden", status: 403 };

        const { content } = body as { content: string };
        if (!content) return { message: "Content is required", status: 400 };

        const messageId = crypto.randomUUID();
        db.run("INSERT INTO messages (id, conversation_id, sender_id, content) VALUES (?, ?, ?, ?)", [messageId, params.id, userId, content]);
        const message = db.query("SELECT * FROM messages WHERE id = ?").get(messageId as string);
        if (!message) return { message: "Failed to create message", status: 500 };
        db.run("UPDATE conversations SET last_message_at = datetime('now') WHERE id = ?", [params.id]);
        sendToUser(conversation.buyer_id === userId ? conversation.seller_id : conversation.buyer_id, {
            type: "new_message",
            conversationId: params.id,
            message: message,
        });
        return { message, status: 201 };
    })

    // PATCH /conversations/:id/read — mark messages as read
    // 1. Auth
    // 2. Verify participant
    // 3. Update read_at for all unread messages where sender != me
    // 4. Return { updated: changes }
    .patch("/conversations/:id/read", async ({ params, headers, jwt }) => {
        const token = (headers as any).authorization?.replace("Bearer ", "");
        if (!token) return { message: "Unauthorized", status: 401 };

        const payload = await jwt.verify(token) as { id: number; email: string } | false;
        if (!payload) return { message: "Invalid token", status: 401 };
        const userId = Number(payload.id);

        const conversation = db
            .query("SELECT * FROM conversations WHERE id = ? AND (buyer_id = ? OR seller_id = ?)")
            .get(params.id, userId, userId) as ConversationRow | null;
        if (!conversation) return { message: "Forbidden", status: 403 };

        const changes = db.run("UPDATE messages SET read_at = datetime('now') WHERE conversation_id = ? AND sender_id != ? AND read_at IS NULL", [params.id, userId]);
        return { updated: changes, status: 200 };
    })

export default conversationsRoutes;