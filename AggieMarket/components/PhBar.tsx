import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/colors";

type PhBarProps = {
  title: string;
  leftLabel?: string;
  onLeft?: () => void;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRight?: () => void;
};

export function PhBar({
  title,
  leftLabel,
  onLeft,
  rightIcon,
  onRight,
}: PhBarProps) {
  const router = useRouter();
  const handleLeft = onLeft ?? (leftLabel ? () => router.back() : undefined);
  return (
    <View style={styles.container}>
      <View style={styles.left}>
        {leftLabel && (
          <Pressable onPress={handleLeft} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={18} color={colors.ink} />
            <Text style={styles.backLabel}>{leftLabel}</Text>
          </Pressable>
        )}
      </View>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.right}>
        {rightIcon && (
          <Pressable onPress={onRight} style={styles.iconBtn}>
            <Ionicons name={rightIcon} size={18} color={colors.dark} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.border,
  },
  left: { minWidth: 80 },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  backLabel: {
    fontSize: 12,
    color: colors.ink,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
    textAlign: "center",
  },
  right: {
    minWidth: 80,
    alignItems: "flex-end",
  },
  iconBtn: {
    width: 30,
    height: 30,
    borderWidth: 1.5,
    borderColor: colors.mid,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
});
