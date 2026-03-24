import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
// @ts-ignore
import WaCarousel from "@awesome.me/webawesome/dist/react/carousel";
// @ts-ignore
import WaCarouselItem from "@awesome.me/webawesome/dist/react/carousel-item";
import { colors } from "../../theme/colors";
import { useAuth } from "../../context/AuthContext";
import { API } from "../../constants/api";

type EventDetail = {
  id: string;
  organizer_id: number;
  title: string;
  description: string;
  category: string;
  location: string;
  is_online: number;
  starts_at: string;
  ends_at: string | null;
  is_free: number;
  ticket_price: number | null;
  max_attendees: number | null;
  status: string;
  view_count: number;
  created_at: string;
  images: { url: string; sort_order: number }[];
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
    year: "numeric", hour: "numeric", minute: "2-digit",
  });
}

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAuth();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id || !token) return;
    fetch(API.event(id), { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        if (data.event) setEvent(data.event);
        else setError("Event not found.");
      })
      .catch(() => setError("Could not load event."))
      .finally(() => setLoading(false));
  }, [id, token]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.center}><ActivityIndicator color={colors.ink} /></View>
      </SafeAreaView>
    );
  }

  if (error || !event) {
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

  const categories = event.category.split(",").map((c) => c.trim()).filter(Boolean);
  const ticketLabel = event.is_free ? "Free" : event.ticket_price != null ? `$${event.ticket_price}` : "Paid";
  const date = new Date(event.created_at).toLocaleDateString("en-US", {
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
        {event.images?.length > 0 ? (
          <div style={{ width: "100%", height: 300 }}>
            <WaCarousel navigation={event.images.length > 1} pagination={event.images.length > 1} loop style={{ height: "100%" }}>
              {event.images.map((img, i) => (
                <WaCarouselItem key={i}>
                  <div style={{ position: "relative", width: "100%", height: "300px", overflow: "hidden" }}>
                    <img src={img.url} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: "blur(24px)", transform: "scale(1.12)", opacity: 0.6 }} alt="" />
                    <img src={img.url} style={{ position: "relative", width: "100%", height: "100%", objectFit: "contain", zIndex: 1 }} alt="" />
                  </div>
                </WaCarouselItem>
              ))}
            </WaCarousel>
          </div>
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderEmoji}>📅</Text>
            <Text style={styles.imagePlaceholderText}>No photo</Text>
          </View>
        )}

        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{event.title}</Text>
            <View style={[styles.ticketBadge, event.is_free ? styles.freeBadge : styles.paidBadge]}>
              <Text style={[styles.ticketBadgeText, event.is_free ? styles.freeText : styles.paidText]}>
                {ticketLabel}
              </Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            {categories.map((c) => (
              <View key={c} style={styles.chip}><Text style={styles.chipText}>{c}</Text></View>
            ))}
          </View>

          <Text style={styles.sectionLabel}>When</Text>
          <Text style={styles.metaValue}>🗓 {formatDateTime(event.starts_at)}</Text>
          {event.ends_at && (
            <Text style={styles.metaValueSub}>until {formatDateTime(event.ends_at)}</Text>
          )}

          <Text style={styles.sectionLabel}>Where</Text>
          <Text style={styles.metaValue}>
            {event.is_online ? "🌐 Online" : `📍 ${event.location}`}
          </Text>

          {event.max_attendees != null && (
            <>
              <Text style={styles.sectionLabel}>Capacity</Text>
              <Text style={styles.metaValue}>👥 {event.max_attendees} max attendees</Text>
            </>
          )}

          <Text style={styles.sectionLabel}>Description</Text>
          <Text style={styles.description}>{event.description || "No description provided."}</Text>

          <View style={styles.footerMeta}>
            <Text style={styles.meta}>Posted {date}</Text>
            <Text style={styles.meta}>{event.view_count} views</Text>
          </View>

          <Pressable style={[styles.ctaBtn, event.is_free ? styles.ctaBtnFree : styles.ctaBtnPaid]}>
            <Text style={styles.ctaBtnText}>
              {event.is_free ? "RSVP — Free" : `Get Tickets · ${ticketLabel}`}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  header: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  back: { fontSize: 14, color: colors.ink, fontWeight: "600" },
  imagePlaceholder: { width: "100%", height: 300, backgroundColor: "#fff4f0", alignItems: "center", justifyContent: "center", borderBottomWidth: 1, borderBottomColor: colors.border, gap: 8 },
  imagePlaceholderEmoji: { fontSize: 48 },
  imagePlaceholderText: { fontSize: 13, color: colors.mid },
  content: { paddingBottom: 40 },
  body: { padding: 20, gap: 12 },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
  title: { flex: 1, fontSize: 22, fontWeight: "700", color: colors.ink },
  ticketBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  freeBadge: { backgroundColor: "#e8f5e9" },
  paidBadge: { backgroundColor: "#fff8e1" },
  ticketBadgeText: { fontSize: 13, fontWeight: "700" },
  freeText: { color: "#2e7d32" },
  paidText: { color: "#f57f17" },
  metaRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: colors.border },
  chipText: { fontSize: 11, color: colors.dark },
  sectionLabel: { fontSize: 12, fontWeight: "700", color: colors.ink, marginTop: 4 },
  metaValue: { fontSize: 14, color: colors.dark },
  metaValueSub: { fontSize: 12, color: colors.mid, marginTop: -8 },
  description: { fontSize: 14, color: colors.dark, lineHeight: 22 },
  footerMeta: { flexDirection: "row", justifyContent: "space-between" },
  meta: { fontSize: 11, color: colors.mid },
  ctaBtn: { paddingVertical: 14, borderRadius: 10, alignItems: "center", marginTop: 8 },
  ctaBtnFree: { backgroundColor: "#2e7d32" },
  ctaBtnPaid: { backgroundColor: colors.ink },
  ctaBtnText: { color: colors.white, fontSize: 16, fontWeight: "700" },
  errorText: { fontSize: 14, color: colors.dark },
  backBtn: { marginTop: 8 },
  backBtnText: { fontSize: 14, color: colors.ink, fontWeight: "600" },
});
