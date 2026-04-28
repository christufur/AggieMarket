import { useEffect, useState, useRef, useCallback } from "react";
import { colors } from "@/theme/colors";
import {
  View, Pressable, ScrollView, useWindowDimensions, ActivityIndicator, Image,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/text";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useWebSocket } from "@/context/WebSocketContext";
import { API } from "@/constants/api";

import type { Conversation, Message } from "@/types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Parse SQLite datetime — appends Z if no timezone marker so JS treats as UTC */
function parseDate(raw: string): Date {
  const s = raw.includes("T") || raw.includes("Z") || raw.includes("+") ? raw : raw + "Z";
  return new Date(s);
}

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const diff = Math.floor((Date.now() - parseDate(iso).getTime()) / 1000);
  if (diff < 0) return "just now";
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return parseDate(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getInitials(name: string): string {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

function formatMessageTime(iso: string): string {
  return parseDate(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

// ─── Avatar ──────────────────────────────────────────────────────────────────

function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  return (
    <View
      style={{
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: colors.primaryLight, borderWidth: 1.5, borderColor: colors.primaryBorder,
        alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}
    >
      <Text style={{ fontSize: size * 0.36, fontWeight: "700", color: colors.primary }}>
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
          ? colors.primaryLight
          : hovered
          ? "#fdf6f9"
          : hasUnread
          ? "#fffafc"
          : "transparent",
        borderRightWidth: selected ? 2 : 0,
        borderRightColor: colors.primary,
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
            backgroundColor: colors.primary, borderWidth: 2, borderColor: "#fff",
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

        {(item.listing_title || item.service_title || item.event_title) && (
          <Text numberOfLines={1} style={{ fontSize: 10, color: colors.primary, fontWeight: "500" }}>
            {item.listing_title || item.service_title || item.event_title}
          </Text>
        )}

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
              backgroundColor: colors.primary, borderRadius: 100,
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
        backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center",
      }}>
        <Ionicons name="chatbubbles-outline" size={28} color={colors.primary} />
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

type OptimisticMessage = Message & { _status?: 'sending' | 'failed'; _tempId?: string };

function MessageBubble({ msg, isMine }: { msg: OptimisticMessage; isMine: boolean }) {
  return (
    <View style={{
      alignSelf: isMine ? "flex-end" : "flex-start",
      maxWidth: "70%",
      marginBottom: 8,
    }}>
      <View style={{
        backgroundColor: isMine ? colors.primary : "#fff",
        opacity: msg._status === 'sending' ? 0.65 : 1,
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
      <View style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginTop: 3,
        alignSelf: isMine ? "flex-end" : "flex-start",
        paddingHorizontal: 4,
      }}>
        <Text style={{ fontSize: 10, color: "#bbb" }}>
          {formatMessageTime(msg.created_at)}
        </Text>
        {isMine && (
          <Text style={{ fontSize: 9, color: msg.read_at ? colors.primary : "#ccc" }}>
            {msg.read_at ? "\u2713\u2713 Read" : "\u2713 Sent"}
          </Text>
        )}
        {isMine && msg._status === 'sending' && (
          <Text style={{ fontSize: 9, color: "#ccc" }}>Sending…</Text>
        )}
        {isMine && msg._status === 'failed' && (
          <Text style={{ fontSize: 9, color: colors.error, fontWeight: "600" }}>Failed</Text>
        )}
      </View>
    </View>
  );
}

// ─── Reportable Message ──────────────────────────────────────────────────────

const REPORT_REASONS = ["Spam", "Harassment", "Inappropriate content", "Other"];

function ReportableMessage({
  msg, isReported, isShowingMenu, reportSubmitting, onOpenMenu, onReport, onDismiss,
}: {
  msg: OptimisticMessage;
  isReported: boolean;
  isShowingMenu: boolean;
  reportSubmitting: boolean;
  onOpenMenu: () => void;
  onReport: (msgId: string, reason: string) => void;
  onDismiss: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <View
      style={{ marginBottom: 8 }}
      // @ts-ignore — web-only event
      onMouseEnter={() => setHovered(true)}
      // @ts-ignore — web-only event
      onMouseLeave={() => setHovered(false)}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 4 }}>
        {/* Message bubble */}
        <View style={{ flex: 1 }}>
          <MessageBubble msg={msg} isMine={false} />
        </View>
        {/* Flag button — show on hover or when menu is open */}
        {(hovered || isShowingMenu) && !isReported && (
          <Pressable
            onPress={onOpenMenu}
            style={{
              width: 24, height: 24, borderRadius: 12,
              alignItems: "center", justifyContent: "center",
              backgroundColor: isShowingMenu ? colors.bg : "transparent",
              cursor: "pointer" as any,
              flexShrink: 0,
              marginBottom: 24,
            }}
          >
            <Ionicons name="flag-outline" size={13} color={isShowingMenu ? colors.error : colors.mid} />
          </Pressable>
        )}
        {isReported && (
          <View style={{ paddingBottom: 24, paddingHorizontal: 4 }}>
            <Text style={{ fontSize: 10, color: colors.mid }}>Reported</Text>
          </View>
        )}
      </View>

      {/* Reason menu */}
      {isShowingMenu && (
        <View style={{
          marginLeft: 8, marginTop: 4, marginBottom: 4,
          backgroundColor: "#fff", borderRadius: 10,
          borderWidth: 1, borderColor: colors.border,
          shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08, shadowRadius: 8,
          overflow: "hidden", alignSelf: "flex-start", minWidth: 180,
        }}>
          <View style={{ paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <Text style={{ fontSize: 11, fontWeight: "600", color: colors.dark }}>Report message</Text>
          </View>
          {REPORT_REASONS.map((reason) => (
            <Pressable
              key={reason}
              onPress={() => !reportSubmitting && onReport(msg.id, reason)}
              style={({ pressed }) => ({
                paddingHorizontal: 12, paddingVertical: 9,
                backgroundColor: pressed ? colors.bg : "#fff",
                cursor: "pointer" as any,
                opacity: reportSubmitting ? 0.5 : 1,
              })}
            >
              <Text style={{ fontSize: 13, color: colors.ink }}>{reason}</Text>
            </Pressable>
          ))}
          <Pressable
            onPress={onDismiss}
            style={{ paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border, cursor: "pointer" as any }}
          >
            <Text style={{ fontSize: 12, color: colors.dark, fontWeight: "500" }}>Cancel</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

// ─── Chat Panel ──────────────────────────────────────────────────────────────

function ChatPanel({ conversation, token, userId }: {
  conversation: Conversation; token: string; userId: number;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<OptimisticMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const { subscribe, send } = useWebSocket();
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [reportMsgId, setReportMsgId] = useState<string | null>(null);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportedMsgIds, setReportedMsgIds] = useState<Set<string>>(new Set());

  // Fetch messages
  useEffect(() => {
    setLoading(true);
    setMessages([]);
    fetch(API.conversationMessages(conversation.id), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => { if (data.messages) setMessages(data.messages); })
      .finally(() => setLoading(false));

    // Mark as read
    fetch(API.conversationRead(conversation.id), {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    });
  }, [conversation.id, token]);

  // Subscribe to new messages via WebSocket
  useEffect(() => {
    const unsub = subscribe("new_message", (payload) => {
      if (payload.conversationId === conversation.id && payload.message) {
        const incoming = payload.message as Message;
        setMessages((prev) => {
          // Avoid duplicates — real message might already be there from HTTP response
          if (prev.some((m) => m.id === incoming.id)) return prev;
          return [...prev, incoming];
        });
        // Mark as read since we're viewing this conversation
        fetch(API.conversationRead(conversation.id), {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    });
    return unsub;
  }, [conversation.id, subscribe, token]);

  // Subscribe to typing indicators
  useEffect(() => {
    const unsub = subscribe("typing", (payload) => {
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

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: OptimisticMessage = {
      id: tempId,
      _tempId: tempId,
      _status: 'sending',
      conversation_id: conversation.id,
      sender_id: userId,
      content: text,
      sender_name: '',
      read_at: null,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setInput("");
    setSending(true);

    try {
      const res = await fetch(API.conversationMessages(conversation.id), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: text }),
      });
      const data = await res.json();
      if (data.message) {
        // Replace optimistic message with real one
        setMessages((prev) =>
          prev.map((m) => m._tempId === tempId ? { ...data.message } : m)
        );
      }
    } catch {
      // Mark as failed
      setMessages((prev) =>
        prev.map((m) => m._tempId === tempId ? { ...m, _status: 'failed' } : m)
      );
      setSendError("Failed to send");
      setTimeout(() => setSendError(""), 3000);
    } finally {
      setSending(false);
    }
  };

  const retryMessage = async (failedMsg: OptimisticMessage) => {
    // Remove the failed message
    setMessages((prev) => prev.filter((m) => m._tempId !== failedMsg._tempId));
    // Re-send by setting input and calling send
    setInput(failedMsg.content);
  };

  const handleInputChange = (text: string) => {
    setInput(text);
    send({ type: "typing", conversationId: conversation.id });
  };

  const handleReport = async (msgId: string, reason: string) => {
    setReportSubmitting(true);
    try {
      await fetch(API.reports, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ target_type: "message", target_id: msgId, reason }),
      });
      setReportedMsgIds((prev) => new Set([...prev, msgId]));
    } catch {
      // silent fail — don't crash the chat
    } finally {
      setReportSubmitting(false);
      setReportMsgId(null);
    }
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
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Text style={{ fontSize: 11, color: colors.primary, fontWeight: "500" }}>typing</Text>
              <View style={{ flexDirection: "row", gap: 2 }}>
                {[0, 1, 2].map((i) => (
                  <View key={i} style={{
                    width: 4, height: 4, borderRadius: 2, backgroundColor: colors.primary,
                    opacity: 0.4,
                    animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
                  } as any} />
                ))}
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Item context banner */}
      {(() => {
        const itemTitle = conversation.listing_title || conversation.service_title || conversation.event_title;
        const itemImage = conversation.listing_image || conversation.service_image;
        const itemPrice = conversation.listing_title
          ? (conversation.listing_is_free ? "Free" : conversation.listing_price != null ? `$${conversation.listing_price}` : null)
          : conversation.service_title
          ? (conversation.service_price != null ? `$${conversation.service_price}` : null)
          : null;
        const itemType = conversation.listing_id ? "listing" : conversation.service_id ? "service" : conversation.event_id ? "event" : null;
        const itemId = conversation.listing_id || conversation.service_id || conversation.event_id;

        if (!itemTitle) return null;
        return (
          <Pressable
            onPress={() => { if (itemType && itemId) router.push(`/${itemType}/${itemId}` as any); }}
            style={{
              flexDirection: "row", alignItems: "center", gap: 10,
              paddingHorizontal: 16, paddingVertical: 8,
              backgroundColor: colors.primaryLight,
              borderBottomWidth: 1, borderBottomColor: colors.primaryBorder,
            }}
          >
            {itemImage ? (
              <Image
                source={{ uri: itemImage.startsWith("http") ? itemImage : API.mediaUrl(itemImage) }}
                style={{ width: 36, height: 36, borderRadius: 6 }}
                resizeMode="cover"
              />
            ) : (
              <View style={{
                width: 36, height: 36, borderRadius: 6,
                backgroundColor: colors.primaryBorder, alignItems: "center", justifyContent: "center",
              }}>
                <Ionicons
                  name={itemType === "event" ? "calendar-outline" : itemType === "service" ? "construct-outline" : "pricetag-outline"}
                  size={16}
                  color={colors.primary}
                />
              </View>
            )}
            <View style={{ flex: 1, gap: 1 }}>
              <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: "600", color: colors.primary }}>
                {itemTitle}
              </Text>
              {itemPrice && (
                <Text style={{ fontSize: 11, fontWeight: "500", color: colors.dark }}>
                  {itemPrice}
                </Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={14} color={colors.primary} />
          </Pressable>
        );
      })()}

      {/* Messages */}
      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.primary} />
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
            messages.map((msg) => {
              const isMine = msg.sender_id === userId;
              const isReported = reportedMsgIds.has(msg.id);
              const isShowingMenu = reportMsgId === msg.id;

              return (
                <View key={msg.id}>
                  {!isMine ? (
                    <ReportableMessage
                      msg={msg}
                      isReported={isReported}
                      isShowingMenu={isShowingMenu}
                      reportSubmitting={reportSubmitting}
                      onOpenMenu={() => setReportMsgId(isShowingMenu ? null : msg.id)}
                      onReport={handleReport}
                      onDismiss={() => setReportMsgId(null)}
                    />
                  ) : (
                    <View>
                      <MessageBubble msg={msg} isMine={true} />
                      {msg._status === 'failed' && (
                        <Pressable
                          onPress={() => retryMessage(msg as OptimisticMessage)}
                          style={{ alignSelf: 'flex-end', paddingHorizontal: 8, paddingBottom: 6 }}
                        >
                          <Text style={{ fontSize: 11, color: colors.error, fontWeight: '500', cursor: 'pointer' as any }}>
                            Tap to retry
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Send error */}
      {sendError ? (
        <View style={{ paddingHorizontal: 16, paddingVertical: 6, backgroundColor: colors.errorLight }}>
          <Text style={{ fontSize: 12, color: colors.error, fontWeight: "500" }}>{sendError}</Text>
        </View>
      ) : null}

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
            backgroundColor: input.trim() ? colors.primary : colors.border,
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
  const { conversation: conversationParam } = useLocalSearchParams<{ conversation?: string }>();
  const { user, token } = useAuth();
  const { width } = useWindowDimensions();
  const { unreadCount, subscribe } = useWebSocket();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(conversationParam ?? null);
  const [query, setQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);

  const isMobile = width < 640;

  const fetchConversations = useCallback(async () => {
    if (!token) return;
    const res = await fetch(API.conversations, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.conversations) setConversations(data.conversations);
    setLoading(false);
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
      <View className="bg-card border-b border-border px-6 py-3">
        <View className="flex-row items-center justify-between" style={{ maxWidth: 1100, marginHorizontal: "auto", width: "100%" }}>
          <View className="flex-row items-center gap-3">
            <Pressable onPress={() => router.push("/home")} className="flex-row items-center gap-1.5">
              <View className="bg-primary rounded px-1.5 py-0.5">
                <Text className="text-xs font-bold text-primary-foreground">AM</Text>
              </View>
              <Text className="text-sm font-semibold text-foreground">Home</Text>
            </Pressable>
            <Ionicons name="chevron-forward" size={12} color={colors.mid} />
            <Text className="text-sm text-muted-foreground">Messages</Text>
          </View>
          <View className="flex-row items-center gap-2">
            <Pressable className="w-9 h-9 border-[1.5px] border-border rounded-lg items-center justify-center" onPress={() => router.push("/saved")}>
              <Ionicons name="heart-outline" size={16} color={colors.dark} />
            </Pressable>
            <Pressable className="w-9 h-9 border-[1.5px] border-border rounded-lg items-center justify-center" onPress={() => router.push("/profile")}>
              <Ionicons name="person-outline" size={16} color={colors.dark} />
            </Pressable>
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
          <View style={{ paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f0f0f0", gap: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: "#111" }}>Messages</Text>
              {totalUnread > 0 && (
                <View style={{
                  backgroundColor: colors.primary, borderRadius: 100,
                  paddingHorizontal: 8, paddingVertical: 2,
                }}>
                  <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>
                    {totalUnread} unread
                  </Text>
                </View>
              )}
            </View>
            <View
              className={`flex-row items-center bg-background border-[1.5px] rounded-lg px-3 h-[34px] gap-2 ${
                searchFocused ? "border-foreground" : "border-border"
              }`}
            >
              <Ionicons name="search-outline" size={14} color={colors.dark} />
              <Input
                className="flex-1 text-[12px] border-0 h-auto p-0"
                placeholder="Search conversations..."
                value={query}
                onChangeText={setQuery}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                style={{ outlineStyle: "none" } as any}
              />
              {query.length > 0 && (
                <Pressable onPress={() => setQuery("")}>
                  <Ionicons name="close-circle" size={14} color="#bbb" />
                </Pressable>
              )}
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            {loading ? (
              <View style={{ alignItems: "center", paddingVertical: 48 }}>
                <ActivityIndicator color={colors.primary} />
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
