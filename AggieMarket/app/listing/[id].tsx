import { useLocalSearchParams } from "expo-router";
import { View, Text, ScrollView, StyleSheet, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  BackRow,
  ListingCarousel,
  SellerCard,
  ButtonPrimary,
  ButtonSecondary,
} from "../../components";
import { colors } from "../../theme/colors";

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <BackRow />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ListingCarousel imageCount={3} activeIndex={0} />

        <View style={styles.body}>
          <Text style={styles.badge}>Like New</Text>
          <Text style={styles.title}>MacBook Pro 2021</Text>
          <Text style={styles.price}>$400</Text>

          <Text style={styles.descLabel}>Description</Text>
          <View style={styles.textBlock}>
            <View style={styles.txtLine} />
            <View style={[styles.txtLine, styles.txtLine80]} />
            <View style={styles.txtLine} />
            <View style={[styles.txtLine, styles.txtLine60]} />
          </View>

          <SellerCard
            name="Alex Johnson"
            rating="★★★★★ 4.9 · 12 reviews"
          />

          <ButtonPrimary title="Message Seller" />
          <ButtonSecondary title="♡ Save Listing" />
          <Pressable>
            <Text style={styles.reportLink}>Report this listing</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: 24,
  },
  body: {
    paddingHorizontal: 16,
    paddingBottom: 16,
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
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.ink,
    marginBottom: 4,
  },
  price: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.ink,
    marginBottom: 8,
  },
  descLabel: {
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 6,
    color: colors.ink,
  },
  textBlock: {
    marginVertical: 10,
  },
  txtLine: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    marginBottom: 7,
  },
  txtLine80: {
    width: "80%",
  },
  txtLine60: {
    width: "60%",
  },
  reportLink: {
    textAlign: "center",
    fontSize: 10,
    color: colors.mid,
    textDecorationLine: "underline",
    paddingVertical: 4,
  },
});
