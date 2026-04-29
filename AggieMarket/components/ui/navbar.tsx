import { useState } from "react";
import { View, Pressable, useWindowDimensions } from "react-native";
import { useRouter, usePathname } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { colors } from "@/theme/colors";

type NavTab = "listing" | "service" | "event";

type NavbarProps = {
  query: string;
  onChangeQuery: (q: string) => void;
  unreadCount?: number;
  onNewPost?: () => void;
  activeTab?: NavTab;
  onTabChange: (tab: NavTab) => void;
};

const NAV_LINKS: { key: NavTab; label: string; href: string }[] = [
  { key: "listing", label: "Listings", href: "/home?tab=listing" },
  { key: "service", label: "Services", href: "/home?tab=service" },
  { key: "event", label: "Events", href: "/home?tab=event" },
];

export function Navbar({
  query,
  onChangeQuery,
  unreadCount = 0,
  onNewPost,
  activeTab,
  onTabChange,
}: NavbarProps) {
  const pathname = usePathname();
  const isHome = pathname == "/" || pathname === "/home";
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [searchFocused, setSearchFocused] = useState(false);

  const isMobile = width < 768;
  const contentWidth = Math.min(width - (isMobile ? 16 : 48), 1200);

  return (
    <View
      className="bg-card border-b border-border z-[100]"
      style={{ position: "sticky" as any, top: 0 }}
    >
      <View
        className="h-[60px] justify-center"
        style={{ paddingHorizontal: isMobile ? 12 : 24 }}
      >
        <View
          className="flex-row items-center self-center w-full gap-3"
          style={{ maxWidth: contentWidth }}
        >
          {/* Logo */}
          <Pressable
            className="flex-row items-center gap-2 shrink-0"
            onPress={() => router.push("/home")}
          >
            <View className="bg-primary px-[7px] py-[3px] rounded">
              <Text className="text-primary-foreground text-[11px] font-extrabold tracking-wide">
                AM
              </Text>
            </View>

            {!isMobile && (
              <Text className="text-base font-bold text-foreground tracking-tight font-display">
                Aggie Market
              </Text>
            )}
          </Pressable>

          {/* Tabs */}
          {!isMobile && isHome && (
            <View className="flex-row items-center gap-1 shrink-0">
              {NAV_LINKS.map(({ key, label, href }) => {
                const isActive = activeTab === key;

                return (
                  <Pressable
                    key={key}
                    className="px-3 py-[6px] rounded-full"
                    style={
                      isActive
                        ? { backgroundColor: "#FDF2F6" }
                        : undefined
                    }
                    onPress={() => onTabChange(key)}
                  >
                    <Text
                      className="text-[13px] font-semibold"
                      style={{
                        color: isActive ? "#8C0B42" : "#757575",
                      }}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* Search */}
          {isHome && (


            <View
              className={`flex-1 flex-row items-center bg-background border-[1.5px] rounded-lg px-3 h-[38px] gap-2 ${searchFocused ? "border-foreground" : "border-border"
                }`}
              style={{ minWidth: isMobile ? 120 : 200 }}
            >
              <Ionicons name="search-outline" size={15} color={colors.dark} />

              <Input
                className="flex-1 text-[13px] border-0 h-auto p-0"
                placeholder={
                  isMobile
                    ? "Search..."
                    : "Search listings, services, events..."
                }
                value={query}
                onChangeText={onChangeQuery}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                style={{ outlineStyle: "none" } as any}
              />
            </View>
          )}

          {/* spacing  */}
          {!isHome && (
            <View className="flex-1" />
          )}
          
          {/* Right side */}
          <View className="flex-row items-center gap-2 shrink-0">
            {!isMobile && (
              <Pressable
                className="w-9 h-9 border-[1.5px] border-border rounded-lg items-center justify-center"
                onPress={() => router.push("/inbox")}
              >
                <Ionicons
                  name="chatbubble-outline"
                  size={16}
                  color={colors.dark}
                />
              </Pressable>
            )}

            <Pressable className="w-9 h-9 border-[1.5px] border-border rounded-lg items-center justify-center" onPress={() => router.push("/saved")}>
              <Ionicons name="heart-outline" size={16} color={colors.dark} />
            </Pressable>
            <Pressable
              className="w-9 h-9 border-[1.5px] border-border rounded-lg items-center justify-center"
              onPress={() => router.push("/profile")}
            >
              <Ionicons
                name="person-outline"
                size={16}
                color={colors.dark}
              />
            </Pressable>

            {onNewPost && (
              <Button size="sm" onPress={onNewPost}>
                <Text className="text-primary-foreground text-[13px] font-bold">
                  {isMobile ? "+" : "+ New Post"}
                </Text>
              </Button>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}