import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/colors";

export function TopNav() {
  return (
    <View style={styles.container}>
      <View style={styles.logoRow}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>AM</Text>
        </View>
        <Text style={styles.logo}>Aggie Market</Text>
      </View>
      <View style={styles.actions}>
        <View style={styles.iconBtn}>
          <Ionicons name="search" size={16} color={colors.dark} />
        </View>
        <View style={styles.iconBtn}>
          <Ionicons name="mail-outline" size={16} color={colors.dark} />
        </View>
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
    paddingVertical: 10,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.border,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  logo: {
    fontSize: 16,
    fontWeight: "700",
  },
  badge: {
    backgroundColor: colors.ink,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
    marginRight: 4,
  },
  badgeText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: "700",
  },
  actions: {
    flexDirection: "row",
    gap: 10,
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
