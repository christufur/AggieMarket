import { View, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";

type NavbarProps = {
  onNewPost?: () => void;
  isMobile?: boolean;
  contentWidth?: number;
};

export function Navbar({
  onNewPost,
  isMobile = false,
  contentWidth = 1200,
}: NavbarProps) {
  const router = useRouter();

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
          className="flex-row items-center self-center w-full"
          style={{ maxWidth: contentWidth }}
        >
          {/* Logo — leftmost */}
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

          {/* Spacer */}
          <View className="flex-1" />

          {/* Actions — rightmost */}
          <View className="flex-row items-center gap-2 shrink-0">
            {!isMobile && (
              <Pressable className="w-9 h-9 border-[1.5px] border-border rounded-lg items-center justify-center">
                <Ionicons name="chatbubble-outline" size={16} color="#757575" />
              </Pressable>
            )}
            <Pressable
              className="w-9 h-9 border-[1.5px] border-border rounded-lg items-center justify-center"
              onPress={() => router.push("/profile")}
            >
              <Ionicons name="person-outline" size={16} color="#757575" />
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
