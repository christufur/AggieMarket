import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";
import { API } from "../constants/api";
import { useAuth } from "./AuthContext";

type WsEvent = { type: string; [key: string]: unknown };

type WebSocketContextType = {
  subscribe: (eventType: string, callback: (payload: WsEvent) => void) => () => void;
  send: (data: unknown) => void;
  isConnected: boolean;
  unreadCount: number;
  setUnreadCount: React.Dispatch<React.SetStateAction<number>>;
};

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const subscribersRef = useRef<Map<string, Set<(payload: WsEvent) => void>>>(
    new Map()
  );
  const wsRef = useRef<WebSocket | null>(null);
  const intentionalCloseRef = useRef(false);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backoffMsRef = useRef(1000);

  const subscribe = useCallback(
    (eventType: string, callback: (payload: WsEvent) => void) => {
      let set = subscribersRef.current.get(eventType);
      if (!set) {
        set = new Set();
        subscribersRef.current.set(eventType, set);
      }
      set.add(callback);
      return () => {
        set!.delete(callback);
        if (set!.size === 0) {
          subscribersRef.current.delete(eventType);
        }
      };
    },
    []
  );

  const send = useCallback((data: unknown) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const raw = typeof data === "string" ? data : JSON.stringify(data);
    ws.send(raw);
  }, []);

  useEffect(() => {
    if (!token) {
      intentionalCloseRef.current = true;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close(1000, "Logged out");
        wsRef.current = null;
      }
      setIsConnected(false);
      setUnreadCount(0);
      return;
    }

    intentionalCloseRef.current = false;
    let cancelled = false;

    const fetchUnread = async () => {
      const res = await fetch(API.conversationUnreadCount, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = (await res.json()) as { count?: number };
      if (typeof data.count === "number" && !cancelled) {
        setUnreadCount(data.count);
      }
    };

    const dispatch = (payload: WsEvent) => {
      const subs = subscribersRef.current.get(payload.type);
      subs?.forEach((cb) => {
        try {
          cb(payload);
        } catch (err) {
          console.error("WebSocket subscriber error:", err);
        }
      });
    };

    const connect = () => {
      if (cancelled || intentionalCloseRef.current) return;

      if (wsRef.current) {
        wsRef.current.close(1000, "Reconnecting");
        wsRef.current = null;
      }

      const url = API.wsChat(token);
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (cancelled || intentionalCloseRef.current) {
          ws.close(1000, "Cancelled");
          return;
        }
        backoffMsRef.current = 1000;
        setIsConnected(true);
        void fetchUnread();
      };

      ws.onmessage = (ev) => {
        try {
          const payload = JSON.parse(String(ev.data)) as WsEvent;
          if (typeof payload?.type !== "string") return;

          if (payload.type === "new_message") {
            setUnreadCount((c) => c + 1);
          }
          dispatch(payload);
        } catch {
          // non-JSON or invalid — ignore
        }
      };

      ws.onerror = () => {
        // onclose will handle reconnect
      };

      ws.onclose = () => {
        wsRef.current = null;
        setIsConnected(false);
        if (cancelled || intentionalCloseRef.current) return;

        const delay = backoffMsRef.current;
        backoffMsRef.current = Math.min(backoffMsRef.current * 2, 30_000);

        reconnectTimerRef.current = setTimeout(() => {
          reconnectTimerRef.current = null;
          connect();
        }, delay);
      };
    };

    connect();

    return () => {
      cancelled = true;
      intentionalCloseRef.current = true;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close(1000, "Cleanup");
        wsRef.current = null;
      }
      setIsConnected(false);
    };
  }, [token]);

  return (
    <WebSocketContext.Provider
      value={{ subscribe, send, isConnected, unreadCount, setUnreadCount }}
    >
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const ctx = useContext(WebSocketContext);
  if (!ctx) throw new Error("useWebSocket must be used within WebSocketProvider");
  return ctx;
}
