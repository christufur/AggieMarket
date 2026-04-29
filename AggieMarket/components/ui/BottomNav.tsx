import { View, Pressable } from "react-native";
import { Text } from "./text";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/theme/colors";

export type NavTab = 'home' | 'browse' | 'post' | 'inbox' | 'me';

export function BottomNav({
  active = 'home',
  unreadCount = 0,
  onPress,
}: {
  active?: NavTab;
  unreadCount?: number;
  onPress?: (key: NavTab) => void;
}) {
  const items: { k: NavTab; icon: string; label: string; cta?: boolean }[] = [
    { k: 'home',   icon: 'home-outline',      label: 'Home' },
    { k: 'browse', icon: 'compass-outline',   label: 'Browse' },
    { k: 'post',   icon: 'add',               label: 'Post', cta: true },
    { k: 'inbox',  icon: 'chatbubble-outline', label: 'Inbox' },
    { k: 'me',     icon: 'person-outline',    label: 'Me' },
  ];

  return (
    <View style={{
      borderTopWidth: 1, borderTopColor: colors.border,
      backgroundColor: colors.white,
      paddingBottom: 20, paddingTop: 8,
      flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
    }}>
      {items.map(item =>
        item.cta ? (
          <Pressable key={item.k} onPress={() => onPress?.(item.k)} style={{ marginTop: -14 }}>
            <View style={{
              width: 56, height: 56, borderRadius: 999,
              backgroundColor: colors.primary,
              alignItems: 'center', justifyContent: 'center',
              borderWidth: 4, borderColor: colors.white,
              shadowColor: colors.primary,
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.35, shadowRadius: 16,
              elevation: 8,
            }}>
              <Ionicons name="add" size={26} color={colors.white} />
            </View>
          </Pressable>
        ) : (
          <Pressable
            key={item.k}
            onPress={() => onPress?.(item.k)}
            style={{ alignItems: 'center', gap: 2, paddingHorizontal: 8, position: 'relative' }}
          >
            <Ionicons
              name={item.icon as any}
              size={22}
              color={active === item.k ? colors.primary : colors.dark}
            />
            <Text style={{
              fontSize: 10,
              fontWeight: active === item.k ? '700' : '500',
              color: active === item.k ? colors.primary : colors.dark,
            }}>
              {item.label}
            </Text>
            {item.k === 'inbox' && unreadCount > 0 && (
              <View style={{
                position: 'absolute', top: -2, right: 4,
                backgroundColor: colors.primary, borderRadius: 999,
                minWidth: 16, height: 16, paddingHorizontal: 3,
                alignItems: 'center', justifyContent: 'center',
                borderWidth: 1.5, borderColor: colors.white,
              }}>
                <Text style={{ color: colors.white, fontSize: 9, fontWeight: '800' }}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </Pressable>
        )
      )}
    </View>
  );
}
