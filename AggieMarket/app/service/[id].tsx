import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, Pressable, Image, useWindowDimensions, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme/colors";
import { useAuth } from "../../context/AuthContext";
import { API } from "../../constants/api";

type ServiceDetail = {
  id: string;
  provider_id: number;
  title: string;
  description: string;
  price: number | null;
  price_type: string | null;
  category: string;
  availability: string | null;
  status: string;
  view_count: number;
  created_at: string;
  images: { url: string; sort_order: number }[];
};

function priceLabel(price: number | null, price_type: string | null) {
  if (price == null) return "Free";
  const suffix = price_type === "hourly" ? "/hr" : price_type === "starting_at" ? "+" : "";
  return `$${price}${suffix}`;
}

export default function ServiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user, token } = useAuth();
  const { width } = useWindowDimensions();
  const [service, setService] = useState<ServiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id || !token) return;
    fetch(API.service(id), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.service) setService(data.service);
        else setError("Service not found.");
      })
      .catch(() => setError("Could not load service."))
      .finally(() => setLoading(false));
  }, [id, token]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.ink} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !service) {
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

  const categories = service.category.split(",").map((c) => c.trim()).filter(Boolean);
  const date = new Date(service.created_at).toLocaleDateString("en-US", {
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
        {service.images?.length > 0 ? (
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={{ width, height: 240 }}>
            {service.images.map((img, i) => (
              <Image key={i} source={{ uri: img.url }} style={{ width, height: 240 }} resizeMode="cover" />
            ))}
          </ScrollView>
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderEmoji}>🛠</Text>
            <Text style={styles.imagePlaceholderText}>No photo</Text>
          </View>
        )}

        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{service.title}</Text>
            <Text style={styles.price}>{priceLabel(service.price, service.price_type)}</Text>
          </View>

          {service.price_type && (
            <Text style={styles.priceType}>
              {service.price_type === "hourly" ? "Per hour" : service.price_type === "flat" ? "Flat rate" : "Starting at"}
            </Text>
          )}

          <View style={styles.metaRow}>
            {categories.map((c) => (
              <View key={c} style={styles.chip}>
                <Text style={styles.chipText}>{c}</Text>
              </View>
            ))}
          </View>

          {service.availability && (
            <>
              <Text style={styles.sectionLabel}>Availability</Text>
              <Text style={styles.metaValue}>⏰ {service.availability}</Text>
            </>
          )}

          <Text style={styles.sectionLabel}>Description</Text>
          <Text style={styles.description}>
            {service.description || "No description provided."}
          </Text>

          <View style={styles.footerMeta}>
            <Text style={styles.meta}>Posted {date}</Text>
            <Text style={styles.meta}>{service.view_count} views</Text>
          </View>

          {String(service.provider_id) === String(user?.id) ? (
            <Pressable
              style={styles.deleteBtn}
              onPress={() => {
                Alert.alert("Delete Service", "Are you sure you want to delete this service?", [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Delete", style: "destructive", onPress: async () => {
                      await fetch(API.service(service.id), {
                        method: "DELETE",
                        headers: { Authorization: `Bearer ${token}` },
                      });
                      router.back();
                    },
                  },
                ]);
              }}
            >
              <Ionicons name="trash-outline" size={18} color="#d32f2f" />
              <Text style={styles.deleteBtnText}>Delete Service</Text>
            </Pressable>
          ) : (
            <Pressable style={styles.contactBtn}>
              <Text style={styles.contactBtnText}>Contact Provider</Text>
            </Pressable>
          )}
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
    backgroundColor: "#f0f4ff",
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 8,
  },
  imagePlaceholderEmoji: { fontSize: 48 },
  imagePlaceholderText: { fontSize: 13, color: colors.mid },
  content: { paddingBottom: 40 },
  body: { padding: 16, gap: 12 },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  title: { flex: 1, fontSize: 20, fontWeight: "700", color: colors.ink },
  price: { fontSize: 20, fontWeight: "700", color: colors.ink },
  priceType: { fontSize: 12, color: colors.mid, marginTop: -8 },
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
  metaValue: { fontSize: 14, color: colors.dark },
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
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#d32f2f",
    marginTop: 8,
  },
  deleteBtnText: { color: "#d32f2f", fontSize: 16, fontWeight: "700" },
  errorText: { fontSize: 14, color: colors.dark },
  backBtn: { marginTop: 8 },
  backBtnText: { fontSize: 14, color: colors.ink, fontWeight: "600" },
});
