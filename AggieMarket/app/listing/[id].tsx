import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, Pressable, Image, useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { colors } from "../../theme/colors";
import { API } from "../../constants/api";

type ListingDetail = {
  id: string;
  seller_id: number;
  title: string;
  description: string;
  price: number | null;
  is_free: number;
  category: string;
  condition: string | null;
  status: string;
  view_count: number;
  created_at: string;
  images: { url: string; sort_order: number }[];
};

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    fetch(API.listing(id))
      .then((r) => r.json())
      .then((data) => {
        if (data.listing) setListing(data.listing);
        else setError("Listing not found.");
      })
      .catch(() => setError("Could not load listing."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.ink} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !listing) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.center}>
          <Text style={styles.errorText}>{error || "Something went wrong."}</Text>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const priceLabel = listing.is_free ? "Free" : listing.price != null ? `$${listing.price}` : "—";
  const date = new Date(listing.created_at).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {listing.images?.length > 0 ? (
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={{ width, height: 240 }}>
            {listing.images.map((img, i) => (
              <Image key={i} source={{ uri: img.url }} style={{ width, height: 240 }} resizeMode="cover" />
            ))}
          </ScrollView>
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderText}>No photo</Text>
          </View>
        )}

        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{listing.title}</Text>
            <Text style={styles.price}>{priceLabel}</Text>
          </View>

          <View style={styles.metaRow}>
            {listing.condition && (
              <View style={styles.chip}>
                <Text style={styles.chipText}>{listing.condition}</Text>
              </View>
            )}
            <View style={styles.chip}>
              <Text style={styles.chipText}>{listing.category}</Text>
            </View>
          </View>

          <Text style={styles.sectionLabel}>Description</Text>
          <Text style={styles.description}>
            {listing.description || "No description provided."}
          </Text>

          <View style={styles.footerMeta}>
            <Text style={styles.meta}>Posted {date}</Text>
            <Text style={styles.meta}>{listing.view_count} views</Text>
          </View>

          <Pressable style={styles.contactBtn}>
            <Text style={styles.contactBtnText}>Message Seller</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  back: { fontSize: 14, color: colors.ink, fontWeight: "600" },
  imagePlaceholder: {
    width: "100%",
    height: 240,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  imagePlaceholderText: { fontSize: 13, color: colors.mid },
  body: { padding: 16, gap: 12 },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  title: { flex: 1, fontSize: 20, fontWeight: "700", color: colors.ink },
  price: { fontSize: 20, fontWeight: "700", color: colors.ink },
  metaRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: { fontSize: 11, color: colors.dark },
  sectionLabel: { fontSize: 12, fontWeight: "700", color: colors.ink, marginTop: 4 },
  description: { fontSize: 14, color: colors.dark, lineHeight: 20 },
  footerMeta: { flexDirection: "row", justifyContent: "space-between" },
  meta: { fontSize: 11, color: colors.mid },
  contactBtn: {
    backgroundColor: colors.ink,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
  },
  contactBtnText: { color: colors.white, fontSize: 16, fontWeight: "700" },
  errorText: { fontSize: 14, color: colors.dark },
  backBtn: { marginTop: 8 },
  backBtnText: { fontSize: 14, color: colors.ink, fontWeight: "600" },
});
