import { View, Text, Pressable, StyleSheet } from "react-native";
import { colors } from "../theme/colors";

type SellerCardProps = {
  name: string;
  rating?: string;
  onViewProfile?: () => void;
};

export function SellerCard({
  name,
  rating = "★★★★★ 4.9 · 12 reviews",
  onViewProfile,
}: SellerCardProps) {
  return (
    <View style={styles.container}>
      <View style={styles.av} />
      <View style={styles.info}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.rating}>{rating}</Text>
      </View>
      <Pressable onPress={onViewProfile}>
        <Text style={styles.link}>View Profile →</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginVertical: 12,
  },
  av: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.border,
    borderWidth: 1.5,
    borderColor: colors.mid,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.ink,
  },
  rating: {
    fontSize: 10,
    color: colors.dark,
    marginTop: 2,
  },
  link: {
    fontSize: 10,
    color: colors.dark,
    textDecorationLine: "underline",
  },
});
