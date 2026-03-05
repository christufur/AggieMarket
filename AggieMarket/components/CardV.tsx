import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { colors } from "../theme/colors";

type CardVProps = {
  title: string;
  price: string;
  badge?: string;
  badgeSold?: boolean;
  sellerRow?: string;
  listingId?: string;
};

export function CardV({
  title,
  price,
  badge,
  badgeSold,
  sellerRow,
  listingId,
}: CardVProps) {
  const router = useRouter();
  return (
    <Pressable
      style={styles.card}
      onPress={() => listingId && router.push(`/listing/${listingId}`)}
    >
      <View style={styles.img} />
      <View style={styles.body}>
        {badge && (
          <Text
            style={[styles.badge, badgeSold && styles.badgeSold]}
            numberOfLines={1}
          >
            {badge}
          </Text>
        )}
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        <Text style={[styles.price, badgeSold && styles.priceSold]}>{price}</Text>
        {sellerRow && (
          <View style={styles.sellerRow}>
            <View style={styles.av} />
            <Text style={styles.sellerText} numberOfLines={1}>
              {sellerRow}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 8,
    overflow: "hidden",
  },
  img: {
    width: "100%",
    height: 85,
    backgroundColor: colors.bg,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.mid,
    borderStyle: "dashed",
  },
  body: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  badge: {
    fontSize: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: colors.mid,
    borderRadius: 20,
    color: colors.dark,
    alignSelf: "flex-start",
    marginBottom: 3,
  },
  badgeSold: {
    color: colors.mid,
    borderColor: colors.mid,
  },
  title: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.ink,
  },
  price: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.ink,
    marginVertical: 2,
  },
  priceSold: {
    color: colors.mid,
  },
  sellerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  av: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.border,
    borderWidth: 1,
    borderColor: colors.mid,
  },
  sellerText: {
    fontSize: 9,
    color: colors.dark,
    flex: 1,
  },
});
