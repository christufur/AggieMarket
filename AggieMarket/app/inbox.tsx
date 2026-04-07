import { useState } from "react";
import {
  View, Pressable, ScrollView, useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/text";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_CONVERSATIONS = [
  {
    id: "1",
    other_user_name: "Jordan Lee",
    last_message: "Hey, is this still available?",
    last_message_at: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
    unread_count: 2,
    listing_title: 'MacBook Pro 14" M3',
  },
  {
    id: "2",
    other_user_name: "Priya Sharma",
    last_message: "I can do $40 if you can meet on campus tomorrow",
    last_message_at: new Date(Date.now() - 1000 * 60 * 38).toISOString(),
    unread_count: 0,
    listing_title: "Calculus Textbook 8th Ed",
  },
  {
    id: "3",
    other_user_name: "Marcus Webb",
    last_message: "Sounds good, see you then!",
    last_message_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    unread_count: 1,
    listing_title: null,
  },
  {
    id: "4",
    other_user_name: "Aisha Okonkwo",
    last_message: "Thanks for the quick response!",
    last_message_at: new Date(Date.now() - 1000 * 60 * 60 * 27).toISOString(),
    unread_count: 0,
    listing_title: "IKEA Desk Lamp",
  },
  {
    id: "5",
    other_user_name: "Tyler Nguyen",
    last_message: null,
    last_message_at: null,
    unread_count: 0,
    listing_title: "Sony WH-1000XM5 Headphones",
  },
];

type Conversation = typeof MOCK_CONVERSATIONS[number];

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Avatar ───────────────────────────────────────────────────────────────────

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

// ─── Conversation Row ─────────────────────────────────────────────────────────

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
      {/* Avatar + unread dot */}
      <View style={{ position: "relative" }}>
        <Avatar name={item.other_user_name} size={40} />
        {hasUnread && (
          <View style={{
            position: "absolute", bottom: 0, right: 0,
            width: 10, height: 10, borderRadius: 5,
            backgroundColor: "#8C0B42", borderWidth: 2, borderColor: "#fff",
          }} />
        )}
      </View>

      {/* Text */}
      <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 4 }}>
          <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: hasUnread ? "700" : "600", color: "#111", flex: 1 }}>
            {item.other_user_name}
          </Text>
          <Text style={{ fontSize: 10, color: "#aaa", flexShrink: 0 }}>
            {timeAgo(item.last_message_at)}
          </Text>
        </View>

        {item.listing_title && (
          <Text numberOfLines={1} style={{ fontSize: 10, color: "#8C0B42", fontWeight: "500" }}>
            re: {item.listing_title}
          </Text>
        )}

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
          <Text numberOfLines={1} style={{
            fontSize: 12, flex: 1,
            color: hasUnread ? "#444" : "#aaa",
            fontWeight: hasUnread ? "500" : "400",
          }}>
            {item.last_message ?? "No messages yet"}
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

// ─── Empty Right Panel ────────────────────────────────────────────────────────

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

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function InboxScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();

  const [conversations] = useState(MOCK_CONVERSATIONS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);

  const isMobile = width < 640;

  const filtered = query.trim()
    ? conversations.filter((c) =>
        c.other_user_name.toLowerCase().includes(query.toLowerCase()) ||
        (c.listing_title ?? "").toLowerCase().includes(query.toLowerCase()) ||
        (c.last_message ?? "").toLowerCase().includes(query.toLowerCase())
      )
    : conversations;

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread_count, 0);
  const selectedConvo = conversations.find((c) => c.id === selectedId) ?? null;

  return (
    <View className="flex-1 bg-background" style={{ height: "100vh" as any }}>

      {/* ── Navbar — matches home.tsx exactly ── */}
      <View
        className="bg-card border-b border-border h-[60px] justify-center z-[100]"
        style={{ position: "sticky" as any, top: 0, paddingHorizontal: isMobile ? 12 : 24 }}
      >
        <View className="flex-row items-center w-full gap-3">

          {/* Logo */}
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

          {/* Search */}
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

          {/* Right icons */}
          <View className="flex-row items-center gap-2 shrink-0">
            {/* Inbox icon — active state since we're on this page */}
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

        {/* ── Left panel: conversation list ── */}
        <View style={{
          width: 300,
          borderRightWidth: 1,
          borderRightColor: "#e5e7eb",
          flexDirection: "column",
        }}>
          {/* Panel header */}
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

          {/* List */}
          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            {filtered.length === 0 ? (
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
                    onSelect={() => setSelectedId(item.id)}
                  />
                  {i < filtered.length - 1 && <Separator />}
                </View>
              ))
            )}
          </ScrollView>
        </View>

        {/* ── Right panel: message view or placeholder ── */}
        <View style={{ flex: 1, backgroundColor: "#fafafa" }}>
          {selectedConvo ? (
            // Placeholder — you'll replace this with messages.tsx content
            <View style={{ flex: 1, flexDirection: "column" }}>
              {/* Chat header */}
              <View style={{
                paddingHorizontal: 20, paddingVertical: 14,
                borderBottomWidth: 1, borderBottomColor: "#e5e7eb",
                backgroundColor: "#fff",
                flexDirection: "row", alignItems: "center", gap: 12,
              }}>
                <Avatar name={selectedConvo.other_user_name} size={36} />
                <View style={{ flex: 1, gap: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: "#111" }}>
                    {selectedConvo.other_user_name}
                  </Text>
                  {selectedConvo.listing_title && (
                    <Text style={{ fontSize: 11, color: "#8C0B42", fontWeight: "500" }}>
                      re: {selectedConvo.listing_title}
                    </Text>
                  )}
                </View>
              </View>

              {/* Message area placeholder */}
              <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 10 }}>
                <Ionicons name="chatbubbles-outline" size={36} color="#e0c8d1" />
                <Text style={{ fontSize: 13, color: "#bbb" }}>
                  Messages will appear here
                </Text>
              </View>
            </View>
          ) : (
            <NoConversationSelected />
          )}
        </View>

      </View>
    </View>
  );
}
