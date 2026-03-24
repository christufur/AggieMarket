import { View, Text, Pressable, StyleSheet, Image } from "react-native";
import { useRouter } from "expo-router";
import { colors } from "../theme/colors";

type CardHProps = {
  title: string;
  price?: string;
  sub?: string;
  imageUrl?: string | null;
  listingId?: string;
  serviceId?: string;
  eventId?: string;
};

export function CardH({ title, price, sub, imageUrl, listingId, serviceId, eventId }: CardHProps) {
  const router = useRouter();

  function handlePress() {
    if (listingId) router.push(`/listing/${listingId}`);
    else if (serviceId) router.push(`/service/${serviceId}`);
    else if (eventId) router.push(`/event/${eventId}`);
  }

  return (
    <Pressable
      style={styles.card}
      onPress={handlePress}
    >
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.img} />
      ) : (
        <View style={styles.img} />
      )}
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {price && <Text style={styles.price}>{price}</Text>}
        {sub && <Text style={styles.sub}>{sub}</Text>}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 110,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 8,
    overflow: "hidden",
  },
  img: {
    width: "100%",
    height: 75,
    backgroundColor: colors.bg,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.mid,
    borderStyle: "dashed",
  },
  body: {
    paddingHorizontal: 7,
    paddingVertical: 5,
  },
  title: {
    fontSize: 9,
    fontWeight: "700",
    color: colors.ink,
  },
  price: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.ink,
    marginTop: 1,
  },
  sub: {
    fontSize: 8,
    color: colors.dark,
    marginTop: 1,
  },
});
