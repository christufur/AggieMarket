import { Elysia } from "elysia";
import { jwt } from "@elysiajs/jwt";
import db from "../db";
import { sendToUser } from "../utils/connections";
import { requireAuth } from "../utils/auth";

function sendExpoPush(
    tokens: string[],
    title: string,
    body: string,
    data: Record<string, string>
) {
    const messages = tokens.map((to) => ({ to, title, body, data, sound: "default" }));
    fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(messages),
    }).catch(() => {}); // fire and forget — never block message delivery
}

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

    .get("/conversations", async ({ headers, jwt }) => {
        const payload = await requireAuth(headers, jwt);
        if ('status' in payload) return payload;
        const userId = Number(payload.id);

        const conversations = db
            .query(`
                SELECT c.*,
                u.id as partner_id,
                u.name as partner_name,
                u.avatar_url as partner_avatar,
                (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY rowid DESC LIMIT 1) as last_message_content,
                (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND sender_id != ? AND read_at IS NULL) as unread_count,
                l.title as listing_title,
                l.price as listing_price,
                l.is_free as listing_is_free,
                (SELECT s3_url FROM listing_images WHERE listing_id = l.id ORDER BY sort_order ASC LIMIT 1) as listing_image,
                sv.title as service_title,
                sv.price as service_price,
                (SELECT s3_url FROM service_images WHERE service_id = sv.id ORDER BY sort_order ASC LIMIT 1) as service_image,
                ev.title as event_title
            FROM conversations c
            JOIN users u ON CASE WHEN c.buyer_id = ? THEN c.seller_id ELSE c.buyer_id END = u.id
            LEFT JOIN listings l ON l.id = c.listing_id
            LEFT JOIN services sv ON sv.id = c.service_id
            LEFT JOIN events ev ON ev.id = c.event_id
            WHERE c.buyer_id = ? OR c.seller_id = ?
            ORDER BY c.last_message_at DESC NULLS LAST
        `)
            .all(userId, userId, userId, userId);
        return { conversations, status: 200 };
    })

    .post("/conversations", async ({ body, headers, jwt }) => {
        const payload = await requireAuth(headers, jwt);
        if ('status' in payload) return payload;
        const userId = Number(payload.id);

        const { seller_id, listing_id, service_id, event_id } = body as {
            seller_id: number;
            listing_id?: string;
            service_id?: string;
            event_id?: string;
        };

        if (seller_id === userId) return { message: "Cannot message yourself", status: 400 };

        // If item context provided, match exact conversation (item-specific)
        // If no item context (e.g. from profile), find the most recent conversation with this user
        const hasItemContext = listing_id || service_id || event_id;

        if (hasItemContext) {
            const existingConversation = db
                .query("SELECT * FROM conversations WHERE buyer_id = ? AND seller_id = ? AND listing_id IS ? AND service_id IS ? AND event_id IS ?")
                .get(userId, seller_id, listing_id ?? null, service_id ?? null, event_id ?? null);
            if (existingConversation) return { conversation: existingConversation, status: 200 };
        } else {
            const existingConversation = db
                .query("SELECT * FROM conversations WHERE (buyer_id = ? AND seller_id = ?) OR (buyer_id = ? AND seller_id = ?) ORDER BY last_message_at DESC NULLS LAST, created_at DESC LIMIT 1")
                .get(userId, seller_id, seller_id, userId);
            if (existingConversation) return { conversation: existingConversation, status: 200 };
        }

        const conversationId = crypto.randomUUID();
        db.run(
            "INSERT INTO conversations (id, buyer_id, seller_id, listing_id, service_id, event_id) VALUES (?, ?, ?, ?, ?, ?)",
            [conversationId, userId, seller_id, listing_id ?? null, service_id ?? null, event_id ?? null],
        );
        const conversation = db.query("SELECT * FROM conversations WHERE id = ?").get(conversationId as string);
        if (!conversation) return { message: "Failed to create conversation", status: 500 };
        return { conversation, status: 201 };
    })

    .get("/conversations/unread-count", async ({ headers, jwt }) => {
        const payload = await requireAuth(headers, jwt);
        if ('status' in payload) return payload;
        const userId = Number(payload.id);

        const row = db
            .query("SELECT COUNT(*) as count FROM messages m JOIN conversations c ON c.id = m.conversation_id WHERE (c.buyer_id = ? OR c.seller_id = ?) AND m.sender_id != ? AND m.read_at IS NULL")
            .get(userId, userId, userId) as { count: number } | null;
        return { count: row?.count ?? 0, status: 200 };
    })

    .get("/conversations/:id/messages", async ({ params, headers, jwt }) => {
        const payload = await requireAuth(headers, jwt);
        if ('status' in payload) return payload;
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

    .post("/conversations/:id/messages", async ({ params, body, headers, jwt }) => {
        const payload = await requireAuth(headers, jwt);
        if ('status' in payload) return payload;
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
        const recipientId = conversation.buyer_id === userId ? conversation.seller_id : conversation.buyer_id;
        sendToUser(recipientId, {
            type: "new_message",
            conversationId: params.id,
            message: message,
        });

        // APNs / Expo push notification to recipient (if app is backgrounded)
        const sender = db.query("SELECT name FROM users WHERE id = ?").get(userId) as { name: string } | null;
        const pushTokenRows = db.query(
            "SELECT token FROM push_tokens WHERE user_id = ? AND is_active = 1"
        ).all(recipientId) as { token: string }[];
        if (sender && pushTokenRows.length > 0) {
            sendExpoPush(
                pushTokenRows.map((r) => r.token),
                sender.name,
                content.length > 100 ? content.slice(0, 97) + "…" : content,
                { conversation_id: params.id }
            );
        }

        return { message, status: 201 };
    })

    .patch("/conversations/:id/read", async ({ params, headers, jwt }) => {
        const payload = await requireAuth(headers, jwt);
        if ('status' in payload) return payload;
        const userId = Number(payload.id);

        const conversation = db
            .query("SELECT * FROM conversations WHERE id = ? AND (buyer_id = ? OR seller_id = ?)")
            .get(params.id, userId, userId) as ConversationRow | null;
        if (!conversation) return { message: "Forbidden", status: 403 };

        const changes = db.run("UPDATE messages SET read_at = datetime('now') WHERE conversation_id = ? AND sender_id != ? AND read_at IS NULL", [params.id, userId]);
        return { updated: changes, status: 200 };
    })

export default conversationsRoutes;
