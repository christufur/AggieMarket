import type { ServerWebSocket } from "bun";

// Tracks online users so REST routes can push WS events after sending a message

// TODO: Store a Map<number, Set<ServerWebSocket>> (userId -> open WS connections)
//exports three functions: addConnection(userId, ws), removeConnection(userId, ws), sendToUser(userId, event)
//sendToUser iterates the users connections and calls ws.send(JSON.stringify(event))
//addConnection(userId, ws) adds the connection to the Map
//removeConnection(userId, ws) removes the connection from the Map

const connections = new Map<number, Set<any>>();

export function addConnection(userId: number, ws: any) {
    if (!connections.has(userId)) {
        connections.set(userId, new Set());
    }
    connections.get(userId)?.add(ws);
}

export function removeConnection(userId: number, ws: any) {
    connections.get(userId)?.delete(ws);
}

export function sendToUser(userId: number, event: any) {
    connections.get(userId)?.forEach(ws => ws.send(JSON.stringify(event)));
}

export default { addConnection, removeConnection, sendToUser };