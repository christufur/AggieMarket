import { useEffect, useState, useRef, useCallback } from "react";
import { colors } from "@/theme/colors";
import {
  View, Pressable, ScrollView, useWindowDimensions, ActivityIndicator, Image, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/text";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useWebSocket } from "@/context/WebSocketContext";
import { API } from "@/constants/api";
import { Chip } from "@/components/ui/Chip";
import { SiteHeader, NavAvatar } from "@/components/ui/SiteHeader";
import { BottomNav } from "@/components/ui/BottomNav";
import * as ImagePicker from "expo-image-picker";

import type { Conversation, Message } from "@/types";
import { Navbar } from "@/components/ui/navbar";
import { CreatePostModal } from "@/components/ui/createpostmodal";


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

function formatMessageTime(iso: string): string {
  return parseDate(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

// ─── Conversation Row ────────────────────────────────────────────────────────

function ConversationRow({
  item, selected, onSelect,
}: {
  item: Conversation;
  selected: boolean;
  onSelect: () => void;
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
          : "transparent",
        borderRightWidth: selected ? 2 : 0,
        borderRightColor: colors.primary,
        transitionDuration: "120ms",
        transitionProperty: "background-color",
      } as any}
    >
      <View style={{ position: "relative" }}>
        <NavAvatar name={item.partner_name} avatarUrl={item.partner_avatar ?? null} size={40} />
        {hasUnread && (
          <View style={{
            position: "absolute", bottom: 0, right: 0,
            width: 10, height: 10, borderRadius: 5,
            backgroundColor: colors.primary, borderWidth: 2, borderColor: "#fff",
          }} />
        )}
      </View>

      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 4 }}>
          <Text numberOfLines={1} style={{ flex: 1, fontSize: 14, fontWeight: hasUnread ? "800" : "600", color: colors.ink }}>
            {item.partner_name}
          </Text>
          <Text style={{ fontSize: 11, color: colors.dark, flexShrink: 0 }}>
            {timeAgo(item.last_message_at)}
          </Text>
        </View>

        {(item.listing_title || item.service_title || item.event_title) && (
          <Text numberOfLines={1} style={{ fontSize: 11, color: colors.primary, fontWeight: "700" }}>
            re: {item.listing_title || item.service_title || item.event_title}
          </Text>
        )}

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
          <Text numberOfLines={1} style={{
            fontSize: 12, flex: 1,
            color: colors.dark,
            fontWeight: hasUnread ? "600" : "400",
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
      maxWidth: "75%",
      marginBottom: 6,
    }}>
      <View style={{
        backgroundColor: isMine ? colors.primary : colors.white,
        opacity: msg._status === 'sending' ? 0.6 : 1,
        borderRadius: 16,
        borderBottomRightRadius: isMine ? 4 : 16,
        borderBottomLeftRadius: isMine ? 16 : 4,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderWidth: isMine ? 0 : 1,
        borderColor: colors.border,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
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
  const [markingSold, setMarkingSold] = useState(false);
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

  const sendMessageContent = async (text: string) => {
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

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    await sendMessageContent(text);
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

  const handleMarkSold = async () => {
    if (markingSold || !conversation.listing_id) return;
    setMarkingSold(true);
    try {
      await fetch(API.markSold(conversation.listing_id), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ buyer_id: null }),
      });
    } catch {
      // silent fail
    } finally {
      setMarkingSold(false);
    }
  };

  const pickAndSendImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      console.log("Image selected:", asset.fileName);
      const formData = new FormData();
      const filename = asset.fileName ?? "photo.jpg";
      const type = asset.mimeType ?? "image/jpeg";
      const fileObj: File | null = (asset as any).file ?? null;
      if (fileObj) {
        formData.append("file", fileObj, filename);
      } else {
        formData.append("file", { uri: asset.uri, name: filename, type } as any);
      }
      try {
        const uploadRes = await fetch(API.upload, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (uploadData.url) {
          const imgUrl = API.mediaUrl(uploadData.url);
          // Send image as message immediately
          await sendMessageContent(`[Image] ${imgUrl}`);
          alert("Image sent");
        } else {
          alert("Failed to upload image. Try again.");
        }
      } catch {
        alert("Failed to upload image. Try again.");
      }
    }
  };

  const QUICK_REPLIES = ["👍 Sounds good", "See you there", "Send address", "I'm on my way"];

  return (
    <View style={{ flex: 1, flexDirection: "column" }}>
      {/* Chat header — Inbox 2.0 */}
      <View style={{
        borderBottomWidth: 1, borderBottomColor: colors.border,
        backgroundColor: colors.white,
      }}>
        {/* Top row: identity + actions */}
        <View style={{
          paddingHorizontal: 20, paddingTop: 14, paddingBottom: 12,
          flexDirection: "row", alignItems: "center", gap: 12,
        }}>
          <Pressable
            onPress={() => router.push(`/user/${conversation.partner_id}` as any)}
            style={{ cursor: "pointer" as any }}
          >
            <NavAvatar name={conversation.partner_name} avatarUrl={conversation.partner_avatar ?? null} size={40} />
          </Pressable>
          <View style={{ flex: 1, gap: 2 }}>
            <Pressable
              onPress={() => router.push(`/user/${conversation.partner_id}` as any)}
              style={{ flexDirection: "row", alignItems: "center", gap: 6, cursor: "pointer" as any, alignSelf: "flex-start" }}
            >
              <Text style={{ fontSize: 15, fontWeight: "800", color: colors.ink }}>
                {conversation.partner_name}
              </Text>
              <Ionicons name="shield-checkmark-outline" size={13} color={colors.success} />
            </Pressable>
            {typing ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Text style={{ fontSize: 11, color: colors.primary, fontWeight: "600" }}>typing…</Text>
              </View>
            ) : (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success }} />
                <Text style={{ fontSize: 11, color: colors.success, fontWeight: "600" }}>Active now</Text>
              </View>
            )}
          </View>

          {userId === conversation.seller_id && conversation.listing_id && (
            <Pressable
              onPress={handleMarkSold}
              disabled={markingSold}
              style={{ paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1.5, borderColor: colors.border, borderRadius: 8, backgroundColor: colors.white, opacity: markingSold ? 0.5 : 1 }}
            >
              <Text style={{ fontSize: 12, fontWeight: "700", color: colors.ink }}>
                {markingSold ? "Marking…" : "Mark sold"}
              </Text>
            </Pressable>
          )}
        </View>

        {/* Bottom row: item context, full chat width */}
        {(() => {
          const itemTitle = conversation.listing_title || conversation.service_title || conversation.event_title;
          const itemPrice = conversation.listing_title
            ? (conversation.listing_is_free ? "Free" : conversation.listing_price != null ? `$${conversation.listing_price}` : null)
            : conversation.service_title
            ? (conversation.service_price != null ? `$${conversation.service_price}` : null)
            : null;
          const itemType = conversation.listing_id ? "listing" : conversation.service_id ? "service" : conversation.event_id ? "event" : null;
          const itemId = conversation.listing_id || conversation.service_id || conversation.event_id;
          const kindLabel = itemType ? itemType.toUpperCase() : null;
          if (!itemTitle || !itemType || !itemId) return null;
          return (
            <Pressable
              onPress={() => router.push(`/${itemType}/${itemId}` as any)}
              style={{
                flexDirection: "row", alignItems: "center", gap: 12,
                paddingHorizontal: 20, paddingVertical: 10,
                borderTopWidth: 1, borderTopColor: colors.primary200,
                backgroundColor: colors.primaryLight,
                cursor: "pointer" as any,
              } as any}
            >
              {conversation.listing_image ? (
                <Image
                  source={{ uri: conversation.listing_image.startsWith("http") ? conversation.listing_image : API.mediaUrl(conversation.listing_image) }}
                  style={{ width: 44, height: 44, borderRadius: 8 }}
                  resizeMode="cover"
                />
              ) : (
                <View style={{ width: 44, height: 44, borderRadius: 8, backgroundColor: colors.primary200, alignItems: "center", justifyContent: "center" }}>
                  <Ionicons
                    name={itemType === "service" ? "construct-outline" : itemType === "event" ? "calendar-outline" : "image-outline"}
                    size={20} color={colors.primary}
                  />
                </View>
              )}
              <View style={{ flex: 1, gap: 2 }}>
                {kindLabel && (
                  <Text style={{ fontSize: 10, fontWeight: "800", color: colors.dark, letterSpacing: 0.8 }}>
                    {kindLabel}
                  </Text>
                )}
                <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: "700", color: colors.ink }}>
                  {itemTitle}
                </Text>
              </View>
              {itemPrice && (
                <Text style={{ fontSize: 15, fontWeight: "800", color: colors.primary }}>{itemPrice}</Text>
              )}
              <Ionicons name="chevron-forward" size={16} color={colors.dark} />
            </Pressable>
          );
        })()}
      </View>

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
        <View style={{ paddingHorizontal: 16, paddingVertical: 6, backgroundColor: colors.dangerLight }}>
          <Text style={{ fontSize: 12, color: colors.danger, fontWeight: "500" }}>{sendError}</Text>
        </View>
      ) : null}

      {/* Input area — quick replies + main bar */}
      <View style={{ borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.white }}>
        {/* Quick reply pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ flexDirection: "row", gap: 10, paddingHorizontal: 14, paddingVertical: 10 } as any}>
          {QUICK_REPLIES.map(q => (
            <Pressable key={q} onPress={() => setInput(q)}
              style={{ paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.white }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: colors.ink }}>{q}</Text>
            </Pressable>
          ))}
        </ScrollView>
        {/* Main input row */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingBottom: 16, paddingTop: 8 }}>
          <View style={{ flex: 1, flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: colors.border, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, gap: 10, minHeight: 48 }}>
            <Pressable onPress={pickAndSendImage} style={{ cursor: "pointer" as any }}>
              <Ionicons name="image-outline" size={20} color={colors.dark} />
            </Pressable>
            <Input
              className="flex-1 text-[15px] border-0 h-auto p-0"
              placeholder={`Message ${conversation.partner_name.split(" ")[0]}…`}
              value={input}
              onChangeText={handleInputChange}
              onSubmitEditing={sendMessage}
              editable={!sending}
              style={{ outlineStyle: "none", backgroundColor: "transparent", color: colors.ink } as any}
            />
          </View>
          <Pressable onPress={sendMessage} disabled={!input.trim() || sending}
            style={{ width: 48, height: 48, borderRadius: 10, backgroundColor: input.trim() ? colors.primary : colors.border, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="send" size={20} color={colors.white} />
          </Pressable>
        </View>
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
  const [tab, setTab] = useState<"all" | "unread" | "buying" | "selling">("all");
  const [leftCollapsed, setLeftCollapsed] = useState(false);

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

  // Tab filter — Buying = current user is buyer; Selling = current user is seller.
  const tabFiltered = conversations.filter((c) => {
    if (tab === "unread") return c.unread_count > 0;
    if (tab === "buying") return user ? c.buyer_id === user.id : false;
    if (tab === "selling") return user ? c.seller_id === user.id : false;
    return true;
  });

  const filtered = query.trim()
    ? tabFiltered.filter((c) =>
        c.partner_name.toLowerCase().includes(query.toLowerCase()) ||
        (c.last_message_content ?? "").toLowerCase().includes(query.toLowerCase())
      )
    : tabFiltered;

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread_count, 0);
  const tabCounts = {
    all: conversations.length,
    unread: conversations.filter((c) => c.unread_count > 0).length,
    buying: user ? conversations.filter((c) => c.buyer_id === user.id).length : 0,
    selling: user ? conversations.filter((c) => c.seller_id === user.id).length : 0,
  };
  const selectedConvo = conversations.find((c) => c.id === selectedId) ?? null;

  const handleSelectConversation = (id: string) => {
    setSelectedId(id);
    // Clear unread for selected conversation locally
    setConversations((prev) =>
      prev.map((c) => c.id === id ? { ...c, unread_count: 0 } : c)
    );
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.white }}>
    <View className="flex-1 bg-background" style={{ height: "100vh" as any }}>

      {/* ── Top app navbar ── */}
      <SiteHeader crumb="Messages" showSearch={false} />


      {/* ── Body — mobile: single pane (list OR chat); desktop: 3-panel ── */}
      <View style={{ flex: 1, flexDirection: isMobile ? "column" : "row", overflow: "hidden" }}>

        {/* On mobile, hide the list when a conversation is selected so the chat fills the screen */}
        {isMobile && selectedId ? null : (
        <>
        {/* Left panel: thread list (collapsible) */}
        {leftCollapsed && !isMobile ? (
          <View style={{ width: 44, borderRightWidth: 1, borderRightColor: colors.divider, backgroundColor: colors.white, alignItems: "center", paddingTop: 16, gap: 12 }}>
            <Pressable
              onPress={() => setLeftCollapsed(false)}
              style={{ width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, borderColor: colors.border, alignItems: "center", justifyContent: "center", cursor: "pointer" as any }}
            >
              <Ionicons name="chevron-forward" size={16} color={colors.dark} />
            </Pressable>
            {totalUnread > 0 && (
              <View style={{ backgroundColor: colors.primary, borderRadius: 999, minWidth: 22, paddingHorizontal: 6, paddingVertical: 2, alignItems: "center" }}>
                <Text style={{ color: colors.white, fontSize: 10, fontWeight: "700" }}>{totalUnread > 99 ? "99+" : totalUnread}</Text>
              </View>
            )}
          </View>
        ) : (
        <View style={{ width: isMobile ? "100%" as any : 350, flex: isMobile ? 1 : undefined, borderRightWidth: isMobile ? 0 : 1, borderRightColor: colors.divider, flexDirection: "column", backgroundColor: colors.white }}>
          <View style={{ paddingHorizontal: 16, paddingTop: 18, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.divider, gap: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={{ fontSize: 20, fontWeight: "800", color: colors.ink }}>Inbox</Text>
                {totalUnread > 0 && (
                  <View style={{ backgroundColor: colors.primary, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
                    <Text style={{ color: colors.white, fontSize: 11, fontWeight: "700" }}>{totalUnread} unread</Text>
                  </View>
                )}
              </View>
              <Pressable
                onPress={() => setLeftCollapsed(true)}
                style={{ width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", cursor: "pointer" as any }}
              >
                <Ionicons name="chevron-back" size={16} color={colors.dark} />
              </Pressable>
            </View>
            {/* Search */}
            <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: colors.bg, borderRadius: 10, height: 36, paddingHorizontal: 10, gap: 8 }}>
              <Ionicons name="search-outline" size={14} color={colors.dark} />
              <Input className="flex-1 text-[12px] border-0 h-auto p-0" placeholder="Search messages"
                value={query} onChangeText={setQuery}
                style={{ outlineStyle: "none", backgroundColor: "transparent", color: colors.ink } as any} />
              {query.length > 0 && <Pressable onPress={() => setQuery("")}><Ionicons name="close-circle" size={14} color={colors.mid} /></Pressable>}
            </View>
            {/* Filter pills */}
            <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
              {([
                { key: "all" as const, label: "All", count: tabCounts.all },
                { key: "unread" as const, label: "Unread", count: tabCounts.unread },
                { key: "buying" as const, label: "Buying", count: tabCounts.buying },
                { key: "selling" as const, label: "Selling", count: tabCounts.selling },
              ]).map(({ key, label, count }) => {
                const active = tab === key;
                return (
                  <Pressable
                    key={key}
                    onPress={() => setTab(key)}
                    style={{
                      paddingHorizontal: 10, paddingVertical: 5,
                      borderRadius: 999, borderWidth: 1,
                      borderColor: active ? colors.primary : colors.border,
                      backgroundColor: active ? colors.primary : colors.white,
                      flexDirection: "row", alignItems: "center", gap: 5,
                      cursor: "pointer" as any,
                    } as any}
                  >
                    <Text style={{ fontSize: 12, fontWeight: "600", color: active ? colors.white : colors.ink }}>
                      {label}
                    </Text>
                    {count > 0 && (
                      <View style={{
                        backgroundColor: active ? "rgba(255,255,255,0.25)" : colors.bg,
                        borderRadius: 999, paddingHorizontal: 5, minWidth: 18, alignItems: "center",
                      }}>
                        <Text style={{ fontSize: 10, fontWeight: "700", color: active ? colors.white : colors.dark }}>
                          {count}
                        </Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
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
                  {query
                    ? `No results for "${query}"`
                    : tab === "unread"
                    ? "No unread conversations"
                    : tab === "buying"
                    ? "Nothing you're buying yet"
                    : tab === "selling"
                    ? "Nothing you're selling yet"
                    : "No conversations yet"}
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
        )}
        </>
        )}

        {/* Center panel: chat — on mobile, only render when a conversation is selected */}
        {(!isMobile || selectedId) && (
          <View style={{ flex: 1, backgroundColor: colors.bg }}>
            {isMobile && selectedConvo && (
              <Pressable
                onPress={() => setSelectedId(null)}
                style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.white }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="chevron-back" size={18} color={colors.primary} />
                <Text style={{ fontSize: 14, fontWeight: "700", color: colors.primary }}>Inbox</Text>
              </Pressable>
            )}
            {selectedConvo && user && token ? (
              <ChatPanel conversation={selectedConvo} token={token} userId={user.id} />
            ) : (
              <NoConversationSelected />
            )}
          </View>
        )}

      </View>

      {Platform.OS !== "web" && (
        <BottomNav
          active="inbox"
          unreadCount={unreadCount}
          onPress={(k) => {
            if (k === "home") router.push("/home");
            if (k === "browse") router.push("/browse");
            if (k === "post") router.push("/home");
            if (k === "me") router.push("/profile");
            if (k === "inbox") setSelectedId(null);
          }}
        />
      )}
    </View>
    </SafeAreaView>
  );
}
