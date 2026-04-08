import { useEffect, useState, useRef, useCallback } from "react";
import {
  View, Pressable, ScrollView, useWindowDimensions, ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/text";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useWebSocket } from "@/context/WebSocketContext";
import { API } from "@/constants/api";

// ─── Types ───────────────────────────────────────────────────────────────────

type Conversation = {
  id: string;
  listing_id: string | null;
  service_id: string | null;
  event_id: string | null;
  buyer_id: number;
  seller_id: number;
  partner_id: number;
  partner_name: string;
  partner_avatar: string | null;
  last_message_content: string | null;
  last_message_at: string | null;
  unread_count: number;
};

type Message = {
  id: string;
  conversation_id: string;
  sender_id: number;
  content: string;
  sender_name: string;
  read_at: string | null;
  created_at: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getInitials(name: string): string {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

function formatMessageTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

// ─── Avatar ──────────────────────────────────────────────────────────────────

function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  return (
    <View
      style={{
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: "#FDF2F6", borderWidth: 1.5, borderColor: "#F9C9DB",
        alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}
    >
      <Text style={{ fontSize: size * 0.36, fontWeight: "700", color: "#8C0B42" }}>
        {getInitials(name)}
      </Text>
    </View>
  );
}

// ─── Conversation Row ────────────────────────────────────────────────────────

function ConversationRow({
  item, selected, onSelect,
}: {
  item: Conversation; selected: boolean; onSelect: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const hasUnread = item.unread_count > 0;

  return (
    <Pressable
      onPress={onSelect}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={{
        flexDirection: "row", alignItems: "center",
        paddingHorizontal: 12, paddingVertical: 11, gap: 10,
        backgroundColor: selected
          ? "#FDF2F6"
          : hovered
          ? "#fdf6f9"
          : hasUnread
          ? "#fffafc"
          : "transparent",
        borderRightWidth: selected ? 2 : 0,
        borderRightColor: "#8C0B42",
        transitionDuration: "120ms",
        transitionProperty: "background-color",
      } as any}
    >
      <View style={{ position: "relative" }}>
        <Avatar name={item.partner_name} size={40} />
        {hasUnread && (
          <View style={{
            position: "absolute", bottom: 0, right: 0,
            width: 10, height: 10, borderRadius: 5,
            backgroundColor: "#8C0B42", borderWidth: 2, borderColor: "#fff",
          }} />
        )}
      </View>

      <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 4 }}>
          <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: hasUnread ? "700" : "600", color: "#111", flex: 1 }}>
            {item.partner_name}
          </Text>
          <Text style={{ fontSize: 10, color: "#aaa", flexShrink: 0 }}>
            {timeAgo(item.last_message_at)}
          </Text>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
          <Text numberOfLines={1} style={{
            fontSize: 12, flex: 1,
            color: hasUnread ? "#444" : "#aaa",
            fontWeight: hasUnread ? "500" : "400",
          }}>
            {item.last_message_content ?? "No messages yet"}
          </Text>
          {hasUnread && (
            <View style={{
              backgroundColor: "#8C0B42", borderRadius: 100,
              minWidth: 18, height: 18, paddingHorizontal: 4,
              alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>
                {item.unread_count > 99 ? "99+" : item.unread_count}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

// ─── Empty Right Panel ───────────────────────────────────────────────────────

function NoConversationSelected() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 14, padding: 40 }}>
      <View style={{
        width: 64, height: 64, borderRadius: 32,
        backgroundColor: "#FDF2F6", alignItems: "center", justifyContent: "center",
      }}>
        <Ionicons name="chatbubbles-outline" size={28} color="#8C0B42" />
      </View>
      <Text style={{ fontSize: 16, fontWeight: "700", color: "#111" }}>
        Select a conversation
      </Text>
      <Text style={{ fontSize: 13, color: "#aaa", textAlign: "center", maxWidth: 260 }}>
        Choose a conversation from the left to read and reply to messages.
      </Text>
    </View>
  );
}

// ─── Message Bubble ──────────────────────────────────────────────────────────

function MessageBubble({ msg, isMine }: { msg: Message; isMine: boolean }) {
  return (
    <View style={{
      alignSelf: isMine ? "flex-end" : "flex-start",
      maxWidth: "70%",
      marginBottom: 8,
    }}>
      <View style={{
        backgroundColor: isMine ? "#8C0B42" : "#fff",
        borderRadius: 16,
        borderBottomRightRadius: isMine ? 4 : 16,
        borderBottomLeftRadius: isMine ? 16 : 4,
        paddingHorizontal: 14,
        paddingVertical: 9,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
        elevation: 1,
      }}>
        <Text style={{ fontSize: 14, color: isMine ? "#fff" : "#111", lineHeight: 20 }}>
          {msg.content}
        </Text>
      </View>
      <Text style={{
        fontSize: 10, color: "#bbb", marginTop: 3,
        alignSelf: isMine ? "flex-end" : "flex-start",
        paddingHorizontal: 4,
      }}>
        {formatMessageTime(msg.created_at)}
      </Text>
    </View>
  );
}

// ─── Chat Panel ──────────────────────────────────────────────────────────────

function ChatPanel({ conversation, token, userId }: {
  conversation: Conversation; token: string; userId: number;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const { subscribe, send } = useWebSocket();
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch messages
  useEffect(() => {
    setLoading(true);
    setMessages([]);
    fetch(API.conversationMessages(conversation.id), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => { if (data.messages) setMessages(data.messages); })
      .catch(() => {})
      .finally(() => setLoading(false));

    // Mark as read
    fetch(API.conversationRead(conversation.id), {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  }, [conversation.id, token]);

  // Subscribe to new messages via WebSocket
  useEffect(() => {
    const unsub = subscribe("new_message", (payload: any) => {
      if (payload.conversationId === conversation.id && payload.message) {
        setMessages((prev) => [...prev, payload.message]);
        // Mark as read since we're viewing this conversation
        fetch(API.conversationRead(conversation.id), {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
      }
    });
    return unsub;
  }, [conversation.id, subscribe, token]);

  // Subscribe to typing indicators
  useEffect(() => {
    const unsub = subscribe("typing", (payload: any) => {
      if (payload.conversationId === conversation.id && payload.userId !== userId) {
        setTyping(true);
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        typingTimerRef.current = setTimeout(() => setTyping(false), 3000);
      }
    });
    return () => {
      unsub();
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    };
  }, [conversation.id, subscribe, userId]);

  // Auto-scroll on new messages
  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages.length]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput("");
    try {
      const res = await fetch(API.conversationMessages(conversation.id), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: text }),
      });
      const data = await res.json();
      if (data.message) {
        setMessages((prev) => [...prev, data.message]);
      }
    } catch { /* ignore */ }
    finally { setSending(false); }
  };

  const handleInputChange = (text: string) => {
    setInput(text);
    send({ type: "typing", conversationId: conversation.id });
  };

  return (
    <View style={{ flex: 1, flexDirection: "column" }}>
      {/* Chat header */}
      <View style={{
        paddingHorizontal: 20, paddingVertical: 14,
        borderBottomWidth: 1, borderBottomColor: "#e5e7eb",
        backgroundColor: "#fff",
        flexDirection: "row", alignItems: "center", gap: 12,
      }}>
        <Avatar name={conversation.partner_name} size={36} />
        <View style={{ flex: 1, gap: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: "700", color: "#111" }}>
            {conversation.partner_name}
          </Text>
          {typing && (
            <Text style={{ fontSize: 11, color: "#8C0B42", fontWeight: "500" }}>
              typing...
            </Text>
          )}
        </View>
      </View>

      {/* Messages */}
      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color="#8C0B42" />
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20, paddingBottom: 10 }}
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 48, gap: 8 }}>
              <Ionicons name="chatbubble-outline" size={28} color="#ddd" />
              <Text style={{ fontSize: 13, color: "#bbb" }}>No messages yet. Say hello!</Text>
            </View>
          ) : (
            messages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} isMine={msg.sender_id === userId} />
            ))
          )}
        </ScrollView>
      )}

      {/* Input bar */}
      <View style={{
        flexDirection: "row", alignItems: "center", gap: 10,
        paddingHorizontal: 16, paddingVertical: 12,
        borderTopWidth: 1, borderTopColor: "#e5e7eb",
        backgroundColor: "#fff",
      }}>
        <Input
          className="flex-1 text-sm border-[1.5px] border-border rounded-lg px-3 h-[40px]"
          placeholder="Type a message..."
          value={input}
          onChangeText={handleInputChange}
          onSubmitEditing={sendMessage}
          editable={!sending}
          style={{ outlineStyle: "none" } as any}
        />
        <Pressable
          onPress={sendMessage}
          style={{
            width: 40, height: 40, borderRadius: 20,
            backgroundColor: input.trim() ? "#8C0B42" : "#E0E0E0",
            alignItems: "center", justifyContent: "center",
          }}
          disabled={!input.trim() || sending}
        >
          <Ionicons name="send" size={18} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function InboxScreen() {
  const router = useRouter();
  const { user, token } = useAuth();
  const { width } = useWindowDimensions();
  const { unreadCount, subscribe } = useWebSocket();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);

  const isMobile = width < 640;

  const fetchConversations = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(API.conversations, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.conversations) setConversations(data.conversations);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  // Refresh conversation list when new message arrives
  useEffect(() => {
    const unsub = subscribe("new_message", () => {
      fetchConversations();
    });
    return unsub;
  }, [subscribe, fetchConversations]);

  const filtered = query.trim()
    ? conversations.filter((c) =>
        c.partner_name.toLowerCase().includes(query.toLowerCase()) ||
        (c.last_message_content ?? "").toLowerCase().includes(query.toLowerCase())
      )
    : conversations;

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread_count, 0);
  const selectedConvo = conversations.find((c) => c.id === selectedId) ?? null;

  const handleSelectConversation = (id: string) => {
    setSelectedId(id);
    // Clear unread for selected conversation locally
    setConversations((prev) =>
      prev.map((c) => c.id === id ? { ...c, unread_count: 0 } : c)
    );
  };

  return (
    <View className="flex-1 bg-background" style={{ height: "100vh" as any }}>

      {/* ── Navbar ── */}
      <View
        className="bg-card border-b border-border h-[60px] justify-center z-[100]"
        style={{ position: "sticky" as any, top: 0, paddingHorizontal: isMobile ? 12 : 24 }}
      >
        <View className="flex-row items-center w-full gap-3">
          <Pressable className="flex-row items-center gap-2 shrink-0" onPress={() => router.push("/home")}>
            <View className="bg-primary px-[7px] py-[3px] rounded">
              <Text className="text-primary-foreground text-[11px] font-extrabold tracking-wide">AM</Text>
            </View>
            {!isMobile && (
              <Text className="text-base font-bold text-foreground tracking-tight font-display">
                Aggie Market
              </Text>
            )}
          </Pressable>

          <View
            className={`flex-1 flex-row items-center bg-background border-[1.5px] rounded-lg px-3 h-[38px] gap-2 ${
              searchFocused ? "border-foreground" : "border-border"
            }`}
          >
            <Ionicons name="search-outline" size={16} color="#757575" />
            <Input
              className="flex-1 text-[13px] border-0 h-auto p-0"
              placeholder="Search conversations..."
              value={query}
              onChangeText={setQuery}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              style={{ outlineStyle: "none" } as any}
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery("")}>
                <Ionicons name="close-circle" size={16} color="#bbb" />
              </Pressable>
            )}
          </View>

          <View className="flex-row items-center gap-2 shrink-0">
            <View className="w-9 h-9 border-[1.5px] rounded-lg items-center justify-center" style={{ borderColor: "#8C0B42", backgroundColor: "#FDF2F6", position: "relative" as any }}>
              <Ionicons name="chatbubble-outline" size={16} color="#8C0B42" />
              {totalUnread > 0 && (
                <View style={{
                  position: "absolute", top: -4, right: -4,
                  backgroundColor: "#8C0B42", borderRadius: 100,
                  minWidth: 16, height: 16, paddingHorizontal: 3,
                  alignItems: "center", justifyContent: "center",
                  borderWidth: 1.5, borderColor: "#fff",
                }}>
                  <Text style={{ color: "#fff", fontSize: 9, fontWeight: "700" }}>
                    {totalUnread}
                  </Text>
                </View>
              )}
            </View>
            <Pressable
              className="w-9 h-9 border-[1.5px] border-border rounded-lg items-center justify-center"
              onPress={() => router.push("/profile")}
            >
              <Ionicons name="person-outline" size={16} color="#757575" />
            </Pressable>
            <Button size="sm" onPress={() => router.push("/home")}>
              <Text className="text-primary-foreground text-[13px] font-bold">
                {isMobile ? "+" : "+ New Post"}
              </Text>
            </Button>
          </View>
        </View>
      </View>

      {/* ── Two-panel body ── */}
      <View style={{ flex: 1, flexDirection: "row", overflow: "hidden" }}>

        {/* Left panel: conversation list */}
        <View style={{
          width: 300,
          borderRightWidth: 1,
          borderRightColor: "#e5e7eb",
          flexDirection: "column",
        }}>
          <View style={{ paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f0f0f0" }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: "#111" }}>Messages</Text>
              {totalUnread > 0 && (
                <View style={{
                  backgroundColor: "#8C0B42", borderRadius: 100,
                  paddingHorizontal: 8, paddingVertical: 2,
                }}>
                  <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>
                    {totalUnread} unread
                  </Text>
                </View>
              )}
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            {loading ? (
              <View style={{ alignItems: "center", paddingVertical: 48 }}>
                <ActivityIndicator color="#8C0B42" />
              </View>
            ) : filtered.length === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: 48, paddingHorizontal: 20, gap: 8 }}>
                <Text style={{ fontSize: 13, color: "#aaa", textAlign: "center" }}>
                  {query ? `No results for "${query}"` : "No conversations yet"}
                </Text>
              </View>
            ) : (
              filtered.map((item, i) => (
                <View key={item.id}>
                  <ConversationRow
                    item={item}
                    selected={selectedId === item.id}
                    onSelect={() => handleSelectConversation(item.id)}
                  />
                  {i < filtered.length - 1 && <Separator />}
                </View>
              ))
            )}
          </ScrollView>
        </View>

        {/* Right panel: chat or placeholder */}
        <View style={{ flex: 1, backgroundColor: "#fafafa" }}>
          {selectedConvo && user && token ? (
            <ChatPanel
              conversation={selectedConvo}
              token={token}
              userId={user.id}
            />
          ) : (
            <NoConversationSelected />
          )}
        </View>
      </View>
    </View>
  );
}
