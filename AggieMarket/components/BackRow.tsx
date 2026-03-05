import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/colors";

type BackRowProps = {
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRight?: () => void;
};

export function BackRow({ rightIcon = "share-outline", onRight }: BackRowProps) {
  const router = useRouter();
  return (
    <View style={styles.container}>
      <Pressable onPress={() => router.back()} style={styles.backBtn}>
        <Ionicons name="chevron-back" size={18} color={colors.ink} />
        <Text style={styles.backLabel}>Back</Text>
      </Pressable>
      {rightIcon && (
        <Pressable onPress={onRight} style={styles.iconBtn}>
          <Ionicons name={rightIcon} size={18} color={colors.dark} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  backLabel: {
    fontSize: 12,
    color: colors.ink,
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
