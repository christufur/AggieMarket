import { useEffect, useState, useCallback, useMemo } from "react";
import { View, ScrollView, ActivityIndicator, Pressable, Image } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { API } from "@/constants/api";
import { colors } from "@/theme/colors";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SiteHeader } from "@/components/ui/SiteHeader";
import type { ProfileData, ListingItem, ServiceItem, EventItem } from "@/types";
import { fmtDate } from "@/lib/utils";

type ItemType = "listings" | "services" | "events";

export default function UserItemsScreen() {
  const { id, type, status: statusParam } = useLocalSearchParams<{
    id: string; type: string; status?: string;
  }>();
  const router = useRouter();
  const { token } = useAuth();

  const itemType: ItemType = useMemo(() => {
    const t = (Array.isArray(type) ? type[0] : type) || "listings";
    if (t === "services" || t === "events") return t;
    return "listings";
  }, [type]);

  const status = (Array.isArray(statusParam) ? statusParam[0] : statusParam) || "active";

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [listings, setListings] = useState<ListingItem[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!id) return;
    try {
      const userId = Number(id);
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      const pRes = await fetch(API.user(userId), { headers });
      const pData = await pRes.json();
      if (pData.user) setProfile(pData.user);

      if (itemType === "listings") {
        const url = status === "sold"
          ? `${API.userListings(userId)}?status=sold`
          : `${API.userListings(userId)}?status=active`;
        const r = await fetch(url, { headers });
        const d = await r.json();
        if (d.listings) setListings(d.listings);
      } else if (itemType === "services") {
        const r = await fetch(API.userServices(userId), { headers });
        const d = await r.json();
        if (d.services) setServices(d.services);
      } else if (itemType === "events") {
        const r = await fetch(API.userEvents(userId), { headers });
        const d = await r.json();
        if (d.events) setEvents(d.events);
      }
    } finally {
      setLoading(false);
    }
  }, [id, token, itemType, status]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg, minHeight: "100vh" as any }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const heading =
    itemType === "listings"
      ? `${status === "sold" ? "Sold" : "Active"} listings`
      : itemType === "services"
        ? "Services"
        : "Events";

  const totalCount =
    itemType === "listings" ? listings.length :
    itemType === "services" ? services.length :
    events.length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, minHeight: "100vh" as any }}>
      <SiteHeader crumb={profile?.name ?? "User"} showSearch={false} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 60 }}>
        <View style={{ maxWidth: 1100, alignSelf: "center" as any, width: "100%" as any, padding: 24 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <Pressable
              onPress={() => router.push(`/user/${id}` as any)}
              style={{ width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, borderColor: colors.border, alignItems: "center", justifyContent: "center", cursor: "pointer" as any }}
            >
              <Ionicons name="arrow-back" size={16} color={colors.dark} />
            </Pressable>
            <Text style={{ fontSize: 13, color: colors.dark }}>{profile?.name ?? "User"}</Text>
            <Ionicons name="chevron-forward" size={12} color={colors.mid} />
            <Text style={{ fontSize: 13, color: colors.dark }}>{heading}</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 24 }}>
            <Text style={{ fontSize: 26, fontWeight: "800", color: colors.ink }}>{heading}</Text>
            <View style={{ backgroundColor: colors.primaryLight, borderRadius: 100, paddingHorizontal: 10, paddingVertical: 3 }}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: colors.primary }}>{totalCount}</Text>
            </View>
          </View>

          {itemType === "listings" && (
            <View style={{ flexDirection: "row", gap: 6, marginBottom: 20 }}>
              {(["active", "sold"] as const).map((s) => (
                <Pressable
                  key={s}
                  onPress={() => router.setParams({ status: s } as any)}
                  style={{
                    paddingHorizontal: 14, paddingVertical: 7,
                    borderRadius: 999,
                    borderWidth: 1.5,
                    borderColor: status === s ? colors.primary : colors.border,
                    backgroundColor: status === s ? colors.primary : colors.white,
                    cursor: "pointer" as any,
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: "700", color: status === s ? colors.white : colors.dark }}>
                    {s === "active" ? "Active" : "Sold"}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          {totalCount === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 80, gap: 12 }}>
              <Ionicons
                name={itemType === "listings" ? "pricetag-outline" : itemType === "services" ? "construct-outline" : "calendar-outline"}
                size={36}
                color={colors.mid}
              />
              <Text style={{ fontSize: 15, fontWeight: "600", color: colors.ink }}>Nothing to show</Text>
              <Button variant="outline" onPress={() => router.back()}>
                <Text>Go back</Text>
              </Button>
            </View>
          ) : (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 18 }}>
              {itemType === "listings" && listings.map((item) => (
                <Card key={item.id} className="overflow-hidden" style={{ flexBasis: 240, flexGrow: 1, maxWidth: 360 } as any}>
                  <Pressable onPress={() => router.push(`/listing/${item.id}`)} style={{ cursor: "pointer" as any }}>
                    {item.image_url ? (
                      <Image source={{ uri: API.mediaUrl(item.image_url) }} style={{ width: "100%" as any, height: 160 }} resizeMode="cover" />
                    ) : (
                      <View style={{ width: "100%" as any, height: 160, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center" }}>
                        <Ionicons name="image-outline" size={32} color={colors.primary} style={{ opacity: 0.3 }} />
                      </View>
                    )}
                    <CardContent style={{ padding: 14, gap: 6 }}>
                      <Text style={{ fontSize: 14, fontWeight: "700", color: colors.ink }} numberOfLines={2}>{item.title}</Text>
                      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                        <Text style={{ fontSize: 16, fontWeight: "800", color: colors.primary }}>
                          {item.is_free ? "Free" : item.price != null ? `$${item.price}` : "—"}
                        </Text>
                        {item.status === "sold" && <Badge variant="destructive"><Text>SOLD</Text></Badge>}
                      </View>
                    </CardContent>
                  </Pressable>
                </Card>
              ))}

              {itemType === "services" && services.map((item) => (
                <Card key={item.id} className="overflow-hidden" style={{ flexBasis: 240, flexGrow: 1, maxWidth: 360 } as any}>
                  <Pressable onPress={() => router.push(`/service/${item.id}`)} style={{ cursor: "pointer" as any }}>
                    {item.image_url ? (
                      <Image source={{ uri: API.mediaUrl(item.image_url) }} style={{ width: "100%" as any, height: 160 }} resizeMode="cover" />
                    ) : (
                      <View style={{ width: "100%" as any, height: 160, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center" }}>
                        <Ionicons name="construct-outline" size={32} color={colors.primary} style={{ opacity: 0.3 }} />
                      </View>
                    )}
                    <CardContent style={{ padding: 14, gap: 6 }}>
                      <Text style={{ fontSize: 14, fontWeight: "700", color: colors.ink }} numberOfLines={2}>{item.title}</Text>
                      <Text style={{ fontSize: 16, fontWeight: "800", color: colors.primary }}>
                        {item.price != null ? `$${item.price}${item.price_type === "hourly" ? "/hr" : ""}` : "Free"}
                      </Text>
                    </CardContent>
                  </Pressable>
                </Card>
              ))}

              {itemType === "events" && events.map((item) => {
                const isPast = new Date(item.starts_at).getTime() < Date.now();
                return (
                  <Card key={item.id} className="overflow-hidden" style={{ opacity: isPast ? 0.78 : 1 }}>
                    <Pressable onPress={() => router.push(`/event/${item.id}`)} style={{ cursor: "pointer" as any }}>
                      <View style={{ position: "relative" }}>
                        {item.image_url ? (
                          <Image source={{ uri: API.mediaUrl(item.image_url) }} style={{ width: "100%" as any, height: 160 }} resizeMode="cover" />
                        ) : (
                          <View style={{ width: "100%" as any, height: 160, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center" }}>
                            <Ionicons name="calendar-outline" size={32} color={colors.primary} style={{ opacity: 0.3 }} />
                          </View>
                        )}
                        {isPast && (
                          <View style={{
                            position: "absolute", top: 8, left: 8,
                            backgroundColor: colors.dark, borderRadius: 6,
                            paddingHorizontal: 8, paddingVertical: 3,
                          }}>
                            <Text style={{ color: "#fff", fontSize: 10, fontWeight: "800", letterSpacing: 0.4 }}>PAST DATE</Text>
                          </View>
                        )}
                      </View>
                      <CardContent style={{ padding: 14, gap: 6 }}>
                        <Text style={{ fontSize: 14, fontWeight: "700", color: colors.ink }} numberOfLines={2}>{item.title}</Text>
                        <Text style={{ fontSize: 12, color: colors.dark }}>{fmtDate(item.starts_at)}</Text>
                        <Text style={{ fontSize: 16, fontWeight: "800", color: item.is_free ? colors.success : colors.primary }}>
                          {item.is_free ? "Free" : item.ticket_price != null ? `$${item.ticket_price}` : "Paid"}
                        </Text>
                      </CardContent>
                    </Pressable>
                  </Card>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
