import { useState } from "react";
import { View, Pressable, Image, Platform, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Text } from "./text";
import { Button } from "./button";
import { Input } from "./input";
import { colors } from "@/theme/colors";
import { useAuth } from "@/context/AuthContext";
import { useWebSocket } from "@/context/WebSocketContext";
import { API } from "@/constants/api";
import { confirmAsync } from "@/lib/dialogs";

// facehash is a web-only library (uses document/window/raw HTML).
// Lazy-require so the native bundle never tries to load it.
const Facehash: any = Platform.OS === "web" ? require("facehash") : null;
const FACEHASH_COLORS = ["#6C63FF", "#F857A6", "#FF5858", "#11998E", "#F2994A", "#2D9CDB"];

type SiteHeaderProps = {
  /** Optional crumb to render after the logo (e.g. "Profile", "Browse"). */
  crumb?: string;
  query?: string;
  onQueryChange?: (q: string) => void;
  searchPlaceholder?: string;
  /** Hide the search input entirely. */
  showSearch?: boolean;
  /** Render extra elements in the right cluster, before the icons. */
  rightExtra?: React.ReactNode;
  /** Show "+ New Post" button. */
  onNewPost?: () => void;
  /** Show "Log Out" pill at the far right. */
  showLogout?: boolean;
  /** Avatar URL to display in the navbar. */
  avatarUrl?: string | null;
  /** Override the display name (defaults to authed user). */
  displayName?: string;
};

const PALETTES = [
  { bg: "#FDE4D3", fg: "#8C3A1A" },
  { bg: "#DEEBFF", fg: "#1A4B8C" },
  { bg: "#E5DCFA", fg: "#4A2E8C" },
  { bg: "#DCF1E4", fg: "#1A6B3A" },
  { bg: "#FBE3EC", fg: "#8C0B42" },
  { bg: "#FFE9C7", fg: "#8C5A0B" },
];

function hashName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return Math.abs(h);
}

export function NavAvatar({
  size = 32,
  name,
  avatarUrl,
}: {
  size?: number;
  name: string;
  avatarUrl?: string | null;
}) {
  // Web: render the facehash 3D blinking avatar, falling back to image when avatarUrl is set.
  if (Platform.OS === "web" && Facehash) {
    const { Avatar: FAvatar, AvatarImage: FAvatarImage, AvatarFallback: FAvatarFallback } = Facehash;
    return (
      <FAvatar
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          overflow: "hidden",
          display: "inline-block",
        }}
      >
        {avatarUrl ? <FAvatarImage src={API.mediaUrl(avatarUrl)} alt={name} /> : null}
        <FAvatarFallback
          name={name}
          facehash
          facehashProps={{
            size,
            variant: "gradient",
            intensity3d: "subtle",
            showInitial: true,
            colors: FACEHASH_COLORS,
          }}
        />
      </FAvatar>
    );
  }

  // Native: deterministic palette + initials fallback (or image if provided).
  const initials =
    name.split(/\s+/).map((s) => s[0] ?? "").slice(0, 2).join("").toUpperCase() || "?";
  const { bg, fg } = PALETTES[hashName(name) % PALETTES.length];
  const radius = size / 2;

  if (avatarUrl) {
    return (
      <Image
        source={{ uri: API.mediaUrl(avatarUrl) }}
        style={{ width: size, height: size, borderRadius: radius, backgroundColor: bg }}
      />
    );
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        backgroundColor: bg,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontSize: size * 0.38, fontWeight: "700", color: fg }}>{initials}</Text>
    </View>
  );
}

export function SiteHeader({
  crumb,
  query = "",
  onQueryChange,
  searchPlaceholder = "Search Aggie Market",
  showSearch = true,
  rightExtra,
  onNewPost,
  showLogout = false,
  avatarUrl,
  displayName,
}: SiteHeaderProps) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { unreadCount } = useWebSocket();
  const [searchFocused, setSearchFocused] = useState(false);
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const name = displayName ?? user?.name ?? "Aggie";

  const handleLogout = async () => {
    const ok = await confirmAsync("Are you sure you want to log out?", "Log out");
    if (!ok) return;
    await logout();
    router.replace("/");
  };

  const stickyStyle =
    Platform.OS === "web" ? ({ position: "sticky", top: 0, zIndex: 100 } as any) : null;

  // ── Mobile: no top nav bar (BottomNav handles all navigation) ─────────
  if (isMobile) return null;

  // (legacy mobile compact header — disabled, kept for reference) -------
  // eslint-disable-next-line no-constant-condition
  if (false) {
    return (
      <View
        style={{
          backgroundColor: colors.white,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          height: 56,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 14,
          gap: 10,
        }}
      >
        <Pressable
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}
          onPress={() => router.push("/home")}
        >
          <View
            style={{
              backgroundColor: colors.primary,
              paddingHorizontal: 7,
              paddingVertical: 3,
              borderRadius: 6,
            }}
          >
            <Text style={{ color: colors.white, fontSize: 11, fontWeight: "800", letterSpacing: 0.6 }}>AM</Text>
          </View>
          {crumb ? (
            <Text style={{ fontSize: 14, fontWeight: "700", color: colors.ink, flexShrink: 1 }} numberOfLines={1}>
              {crumb}
            </Text>
          ) : (
            <Text style={{ fontSize: 14, fontWeight: "700", color: colors.ink, flexShrink: 1 }} numberOfLines={1}>
              Aggie Market
            </Text>
          )}
        </Pressable>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <Pressable
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              borderWidth: 1.5,
              borderColor: colors.border,
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
            onPress={() => router.push("/inbox")}
          >
            <Ionicons name="chatbubble-outline" size={16} color={colors.dark} />
            {unreadCount > 0 && (
              <View
                style={{
                  position: "absolute",
                  top: -3,
                  right: -3,
                  backgroundColor: colors.primary,
                  borderRadius: 999,
                  minWidth: 16,
                  height: 16,
                  paddingHorizontal: 3,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1.5,
                  borderColor: colors.white,
                }}
              >
                <Text style={{ color: colors.white, fontSize: 9, fontWeight: "800" }}>
                  {unreadCount > 99 ? "99+" : unreadCount}
                </Text>
              </View>
            )}
          </Pressable>

          {showLogout ? (
            <Pressable
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              onPress={handleLogout}
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                borderWidth: 1.5,
                borderColor: colors.danger,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="log-out-outline" size={16} color={colors.danger} />
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  }

  // ── Desktop header (web / wide) ─────────────────────────────────────────
  return (
    <View
      style={[
        {
          backgroundColor: colors.white,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          height: 64,
          justifyContent: "center",
          paddingHorizontal: 24,
        },
        stickyStyle,
      ]}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
          maxWidth: 1240,
          alignSelf: "center",
          width: "100%" as any,
        }}
      >
        {/* Left cluster: Logo + optional breadcrumb */}
        <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 14, minWidth: 0 }}>
          <Pressable
            style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            onPress={() => router.push("/home")}
          >
            <View
              style={{
                backgroundColor: colors.primary,
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 6,
              }}
            >
              <Text style={{ color: colors.white, fontSize: 12, fontWeight: "800", letterSpacing: 0.6 }}>
                AM
              </Text>
            </View>
            <Text style={{ fontSize: 17, fontWeight: "800", color: colors.ink, letterSpacing: -0.3 }}>
              Aggie Market
            </Text>
          </Pressable>
          {crumb ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ionicons name="chevron-forward" size={12} color={colors.mid} />
              <Text style={{ fontSize: 14, fontWeight: "600", color: colors.ink }}>{crumb}</Text>
            </View>
          ) : null}
        </View>

        {/* Center: Search */}
        {showSearch ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: colors.bg,
              borderWidth: 1.5,
              borderColor: searchFocused ? colors.primary : colors.border,
              borderRadius: 10,
              paddingHorizontal: 12,
              height: 42,
              gap: 8,
              width: 520,
              flexShrink: 0,
            }}
          >
            <Ionicons name="search-outline" size={16} color={colors.dark} />
            <Input
              className="flex-1 text-[13px] border-0 h-auto p-0"
              placeholder={searchPlaceholder}
              value={query}
              onChangeText={onQueryChange}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholderTextColor={colors.dark}
              style={
                {
                  outlineStyle: "none",
                  backgroundColor: "transparent",
                  color: colors.ink,
                } as any
              }
            />
          </View>
        ) : null}

        {/* Right cluster */}
        <View
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 8,
          }}
        >
          {rightExtra}

          <Pressable
            style={{
              width: 38,
              height: 38,
              borderWidth: 1.5,
              borderColor: colors.border,
              borderRadius: 10,
              alignItems: "center",
              justifyContent: "center",
            }}
            onPress={() => router.push("/saved")}
          >
            <Ionicons name="heart-outline" size={16} color={colors.dark} />
          </Pressable>

          <Pressable
            style={{
              width: 38,
              height: 38,
              borderWidth: 1.5,
              borderColor: colors.border,
              borderRadius: 10,
              alignItems: "center",
              justifyContent: "center",
              position: "relative" as any,
            }}
            onPress={() => router.push("/inbox")}
          >
            <Ionicons name="chatbubble-outline" size={16} color={colors.dark} />
            {unreadCount > 0 && (
              <View
                style={{
                  position: "absolute",
                  top: -3,
                  right: -3,
                  backgroundColor: colors.primary,
                  borderRadius: 999,
                  minWidth: 16,
                  height: 16,
                  paddingHorizontal: 3,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1.5,
                  borderColor: colors.white,
                }}
              >
                <Text style={{ color: colors.white, fontSize: 9, fontWeight: "800" }}>
                  {unreadCount > 99 ? "99+" : unreadCount}
                </Text>
              </View>
            )}
          </Pressable>

          <Pressable onPress={() => router.push("/profile")}>
            <NavAvatar name={name} avatarUrl={avatarUrl} size={32} />
          </Pressable>

          {showLogout ? (
            <Pressable
              onPress={handleLogout}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                paddingHorizontal: 12,
                height: 38,
                borderWidth: 1.5,
                borderColor: colors.danger,
                borderRadius: 10,
              }}
            >
              <Ionicons name="log-out-outline" size={15} color={colors.danger} />
              <Text style={{ fontSize: 13, fontWeight: "700", color: colors.danger }}>Log Out</Text>
            </Pressable>
          ) : null}

          {onNewPost ? (
            <Button
              size="sm"
              onPress={onNewPost}
              style={{
                backgroundColor: colors.primary,
                borderRadius: 10,
                height: 38,
                paddingHorizontal: 16,
              }}
            >
              <Text style={{ color: colors.white, fontSize: 13, fontWeight: "700" }}>+ New Post</Text>
            </Button>
          ) : null}
        </View>
      </View>
    </View>
  );
}
