// Tracks open WebSocket connections per user so REST routes can push real-time events.
// One user may have multiple concurrent connections (e.g. multiple tabs).

interface WsConnection {
    send(data: string): void;
}

const connections = new Map<number, Set<WsConnection>>();

export function addConnection(userId: number, ws: WsConnection) {
    if (!connections.has(userId)) {
        connections.set(userId, new Set());
    }
    connections.get(userId)?.add(ws);
}

export function removeConnection(userId: number, ws: WsConnection) {
    connections.get(userId)?.delete(ws);
}

export function sendToUser(userId: number, event: { type: string; [key: string]: unknown }) {
    connections.get(userId)?.forEach(ws => ws.send(JSON.stringify(event)));
}

