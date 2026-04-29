import { useEffect, useState, useCallback } from "react";
import { View, ScrollView, ActivityIndicator, Pressable, Image } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { useWebSocket } from "@/context/WebSocketContext";
import { API } from "@/constants/api";
import { colors } from "@/theme/colors";
import { Text } from "@/components/ui/text";
import { Card, CardContent } from "@/components/ui/card";
import { fmtDate } from "@/lib/utils";
import { Navbar } from "@/components/ui/navbar";
import { CreatePostModal } from "@/components/ui/createpostmodal";


type SavedListing = {
  saved_id: number;
  id: string;
  title: string;
  price: number | null;
  is_free: number;
  seller_name: string;
  image_url: string | null;
};

type SavedService = {
  saved_id: number;
  id: string;
  title: string;
  price: number | null;
  price_type: string | null;
  provider_name: string;
  image_url: string | null;
};

type SavedEvent = {
  saved_id: number;
  id: string;
  title: string;
  starts_at: string;
  is_free: number;
  ticket_price: number | null;
  organizer_name: string;
  image_url: string | null;
};

export default function SavedScreen() {

  const [modalVisible, setModalVisible] = useState(false);

  const { token } = useAuth();
  const router = useRouter();
  const { unreadCount } = useWebSocket();
  const [listings, setListings] = useState<SavedListing[]>([]);
  const [services, setServices] = useState<SavedService[]>([]);
  const [events, setEvents] = useState<SavedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"listings" | "services" | "events">("listings");

  const fetchSaved = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(API.saved, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.listings) setListings(data.listings);
      if (data.services) setServices(data.services);
      if (data.events) setEvents(data.events);
    } catch (err) { console.error("Saved fetch error:", err); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchSaved(); }, [fetchSaved]);

  const closeModal = useCallback(() => setModalVisible(false), []);

  const handleSaved = useCallback(() => {
  }, []);

  const unsave = async (savedId: number, type: "listings" | "services" | "events") => {
    await fetch(API.savedItem(savedId), { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    if (type === "listings") setListings((p) => p.filter((l) => l.saved_id !== savedId));
    if (type === "services") setServices((p) => p.filter((s) => s.saved_id !== savedId));
    if (type === "events") setEvents((p) => p.filter((e) => e.saved_id !== savedId));
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background" style={{ minHeight: "100vh" as any }}>
        <ActivityIndicator color={colors.ink} />
      </View>
    );
  }

  const totalCount = listings.length + services.length + events.length;

  return (
    <View className="flex-1 bg-background" style={{ minHeight: "100vh" as any }}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Nav */}
        <Navbar
          onNewPost={() => setModalVisible(true)}
        />

        <View style={{ maxWidth: 900, marginHorizontal: "auto", width: "100%" }} className="px-4 py-6">
          {/* Header */}
          <View className="flex-row items-center gap-3 mb-6">
            <Ionicons name="heart" size={24} color={colors.primary} />
            <Text className="text-2xl font-bold text-foreground">Saved Items</Text>
            <Text className="text-sm text-muted-foreground">({totalCount})</Text>
          </View>

          {/* Tabs */}
          <View className="flex-row gap-1 mb-6">
            {([
              { key: "listings" as const, label: "Listings", count: listings.length },
              { key: "services" as const, label: "Services", count: services.length },
              { key: "events" as const, label: "Events", count: events.length },
            ]).map(({ key, label, count }) => (
              <Pressable
                key={key}
                className="px-4 py-2 rounded-full"
                style={tab === key ? { backgroundColor: colors.primaryLight } : undefined}
                onPress={() => setTab(key)}
              >
                <Text className="text-sm font-semibold" style={{ color: tab === key ? colors.primary : colors.dark }}>
                  {label} ({count})
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Listings tab */}
          {tab === "listings" && (
            listings.length === 0 ? (
              <View className="items-center py-16">
                <Ionicons name="heart-outline" size={32} color={colors.mid} />
                <Text className="text-sm text-muted-foreground mt-3">No saved listings</Text>
              </View>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
                {listings.map((item) => (
                  <Card key={item.id} className="overflow-hidden transition-shadow hover:shadow-lg">
                    <Pressable onPress={() => router.push(`/listing/${item.id}`)}>
                      {item.image_url ? (
                        <Image source={{ uri: API.mediaUrl(item.image_url) }} style={{ width: "100%" as any, height: 120 }} resizeMode="cover" />
                      ) : (
                        <View className="w-full items-center justify-center bg-muted" style={{ height: 120 }}>
                          <Ionicons name="image-outline" size={24} color={colors.mid} />
                        </View>
                      )}
                      <CardContent className="p-3 gap-1">
                        <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>{item.title}</Text>
                        <Text className="text-xs text-muted-foreground">{item.seller_name}</Text>
                        <Text className="text-sm font-bold" style={{ color: colors.primary }}>
                          {item.is_free ? "Free" : item.price != null ? `$${item.price}` : "—"}
                        </Text>
                      </CardContent>
                    </Pressable>
                    <View className="px-3 pb-2">
                      <Pressable className="flex-row items-center gap-1 self-end p-1 rounded hover:bg-muted" onPress={() => unsave(item.saved_id, "listings")}>
                        <Ionicons name="heart-dislike-outline" size={13} color={colors.error} />
                        <Text className="text-xs" style={{ color: colors.error }}>Unsave</Text>
                      </Pressable>
                    </View>
                  </Card>
                ))}
              </div>
            )
          )}

          {/* Services tab */}
          {tab === "services" && (
            services.length === 0 ? (
              <View className="items-center py-16">
                <Ionicons name="heart-outline" size={32} color={colors.mid} />
                <Text className="text-sm text-muted-foreground mt-3">No saved services</Text>
              </View>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
                {services.map((item) => (
                  <Card key={item.id} className="overflow-hidden transition-shadow hover:shadow-lg">
                    <Pressable onPress={() => router.push(`/service/${item.id}`)}>
                      {item.image_url ? (
                        <Image source={{ uri: API.mediaUrl(item.image_url) }} style={{ width: "100%" as any, height: 120 }} resizeMode="cover" />
                      ) : (
                        <View className="w-full items-center justify-center bg-muted" style={{ height: 120 }}>
                          <Ionicons name="construct-outline" size={24} color={colors.mid} />
                        </View>
                      )}
                      <CardContent className="p-3 gap-1">
                        <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>{item.title}</Text>
                        <Text className="text-xs text-muted-foreground">{item.provider_name}</Text>
                        <Text className="text-sm font-bold" style={{ color: colors.primary }}>
                          {item.price != null ? `$${item.price}${item.price_type === "hourly" ? "/hr" : ""}` : "Free"}
                        </Text>
                      </CardContent>
                    </Pressable>
                    <View className="px-3 pb-2">
                      <Pressable className="flex-row items-center gap-1 self-end p-1 rounded hover:bg-muted" onPress={() => unsave(item.saved_id, "services")}>
                        <Ionicons name="heart-dislike-outline" size={13} color={colors.error} />
                        <Text className="text-xs" style={{ color: colors.error }}>Unsave</Text>
                      </Pressable>
                    </View>
                  </Card>
                ))}
              </div>
            )
          )}

          {/* Events tab */}
          {tab === "events" && (
            events.length === 0 ? (
              <View className="items-center py-16">
                <Ionicons name="heart-outline" size={32} color={colors.mid} />
                <Text className="text-sm text-muted-foreground mt-3">No saved events</Text>
              </View>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
                {events.map((item) => (
                  <Card key={item.id} className="overflow-hidden transition-shadow hover:shadow-lg">
                    <Pressable onPress={() => router.push(`/event/${item.id}`)}>
                      {item.image_url ? (
                        <Image source={{ uri: API.mediaUrl(item.image_url) }} style={{ width: "100%" as any, height: 120 }} resizeMode="cover" />
                      ) : (
                        <View className="w-full items-center justify-center bg-muted" style={{ height: 120 }}>
                          <Ionicons name="calendar-outline" size={24} color={colors.mid} />
                        </View>
                      )}
                      <CardContent className="p-3 gap-1">
                        <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>{item.title}</Text>
                        <Text className="text-xs text-muted-foreground">{item.organizer_name}</Text>
                        <Text className="text-xs text-muted-foreground">{fmtDate(item.starts_at)}</Text>
                        <Text className="text-sm font-bold" style={{ color: item.is_free ? colors.success : colors.primary }}>
                          {item.is_free ? "Free" : item.ticket_price != null ? `$${item.ticket_price}` : "Paid"}
                        </Text>
                      </CardContent>
                    </Pressable>
                    <View className="px-3 pb-2">
                      <Pressable className="flex-row items-center gap-1 self-end p-1 rounded hover:bg-muted" onPress={() => unsave(item.saved_id, "events")}>
                        <Ionicons name="heart-dislike-outline" size={13} color={colors.error} />
                        <Text className="text-xs" style={{ color: colors.error }}>Unsave</Text>
                      </Pressable>
                    </View>
                  </Card>
                ))}
              </div>
            )
          )}
        </View>
      </ScrollView>

      <CreatePostModal
        visible={modalVisible}
        onClose={closeModal}
        onSaved={handleSaved}
        token={token}
      />
    </View>
  );
}
