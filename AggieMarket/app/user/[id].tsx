import { useEffect, useState, useCallback } from "react";
import { View, ScrollView, ActivityIndicator, Pressable, Image } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { useWebSocket } from "@/context/WebSocketContext";
import { API } from "@/constants/api";
import { colors } from "@/theme/colors";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Avatar as FacehashAvatar,
  AvatarImage as FacehashAvatarImage,
  AvatarFallback as FacehashAvatarFallback,
} from "facehash";
import type { ProfileData, ListingItem, ServiceItem, EventItem } from "@/types";
import { fmtDate, fmtJoined } from "@/lib/utils";

export default function PublicProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user, token } = useAuth();
  const { unreadCount } = useWebSocket();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [listings, setListings] = useState<ListingItem[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [contentTab, setContentTab] = useState<"listings" | "services" | "events">("listings");

  // If viewing own profile, redirect
  useEffect(() => {
    if (id && user && String(user.id) === String(id)) {
      router.replace("/profile");
    }
  }, [id, user]);

  const fetchProfile = useCallback(async () => {
    if (!id || !token) return;
    try {
      const userId = Number(id);
      const [pRes, lRes, sRes, eRes] = await Promise.all([
        fetch(API.user(userId), { headers: { Authorization: `Bearer ${token}` } }),
        fetch(API.userListings(userId), { headers: { Authorization: `Bearer ${token}` } }),
        fetch(API.userServices(userId), { headers: { Authorization: `Bearer ${token}` } }),
        fetch(API.userEvents(userId), { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const [pData, lData, sData, eData] = await Promise.all([
        pRes.json(), lRes.json(), sRes.json(), eRes.json(),
      ]);
      if (pData.user) setProfile(pData.user);
      if (lData.listings) setListings(lData.listings);
      if (sData.services) setServices(sData.services);
      if (eData.events) setEvents(eData.events);
    } catch (err) { console.error("Profile fetch error:", err); }
    finally { setLoading(false); }
  }, [id, token]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background" style={{ minHeight: "100vh" as any }}>
        <ActivityIndicator color={colors.ink} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-background" style={{ minHeight: "100vh" as any }}>
        <Text className="text-sm text-muted-foreground">User not found.</Text>
        <Button variant="outline" onPress={() => router.back()}>
          <Text>Go back</Text>
        </Button>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background" style={{ minHeight: "100vh" as any }}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Nav */}
        <View className="bg-card border-b border-border px-6 py-3">
          <View className="flex-row items-center justify-between" style={{ maxWidth: 1100, marginHorizontal: "auto", width: "100%" }}>
            <View className="flex-row items-center gap-3">
              <Pressable onPress={() => router.push("/home")} className="flex-row items-center gap-1.5">
                <View className="bg-primary rounded px-1.5 py-0.5">
                  <Text className="text-xs font-bold text-primary-foreground">AM</Text>
                </View>
                <Text className="text-sm font-semibold text-foreground">Home</Text>
              </Pressable>
              <Ionicons name="chevron-forward" size={12} color={colors.mid} />
              <Text className="text-sm text-muted-foreground">{profile.name}</Text>
            </View>
            <View className="flex-row items-center gap-2">
              <Pressable className="w-9 h-9 border-[1.5px] border-border rounded-lg items-center justify-center" onPress={() => router.push("/saved")}>
                <Ionicons name="heart-outline" size={16} color={colors.dark} />
              </Pressable>
              <Pressable className="w-9 h-9 border-[1.5px] border-border rounded-lg items-center justify-center" onPress={() => router.push("/inbox")} style={{ position: "relative" as any }}>
                <Ionicons name="chatbubble-outline" size={16} color={colors.dark} />
                {unreadCount > 0 && (
                  <View style={{
                    position: "absolute", top: -4, right: -4,
                    backgroundColor: colors.primary, borderRadius: 100,
                    minWidth: 16, height: 16, paddingHorizontal: 3,
                    alignItems: "center", justifyContent: "center",
                    borderWidth: 1.5, borderColor: colors.white,
                  }}>
                    <Text style={{ color: colors.white, fontSize: 9, fontWeight: "700" }}>
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </Text>
                  </View>
                )}
              </Pressable>
              <Pressable className="w-9 h-9 border-[1.5px] border-border rounded-lg items-center justify-center" onPress={() => router.push("/profile")}>
                <Ionicons name="person-outline" size={16} color={colors.dark} />
              </Pressable>
            </View>
          </View>
        </View>

        {/* Cover */}
        <View style={{ maxWidth: 1100, marginHorizontal: "auto", width: "100%" }}>
          <View className="relative" style={{ height: 200 }}>
            {profile.cover_url ? (
              <Image
                source={{ uri: API.mediaUrl(profile.cover_url) }}
                style={{ width: "100%", height: 200 }}
                resizeMode="cover"
              />
            ) : (
              <div style={{
                width: "100%", height: 200,
                background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark} 50%, ${colors.primaryDarkest} 100%)`,
              }} />
            )}
          </View>

          {/* Avatar + Name */}
          <View className="items-center -mt-16 mb-4">
            <FacehashAvatar
              className="h-28 w-28 rounded-full overflow-hidden border-4 border-white shadow-md"
              style={{ width: 112, height: 112 }}
            >
              {profile.avatar_url ? (
                <FacehashAvatarImage
                  src={API.mediaUrl(profile.avatar_url)}
                  alt={profile.name}
                />
              ) : null}
              <FacehashAvatarFallback
                name={profile.name}
                facehash
                facehashProps={{
                  size: 112,
                  variant: "gradient",
                  intensity3d: "dramatic",
                  interactive: true,
                  enableBlink: true,
                  showInitial: true,
                  colors: ["#6C63FF", "#F857A6", "#FF5858", "#11998E", "#F2994A", "#2D9CDB"],
                }}
              />
            </FacehashAvatar>

            <Text className="text-2xl font-bold text-foreground mt-3">{profile.name}</Text>

            <View className="flex-row items-center gap-3 mt-2 flex-wrap justify-center">
              <Badge variant="outline" className="gap-1 px-3 py-1">
                <Ionicons name="school-outline" size={12} color={colors.dark} />
                <Text>NMSU Student</Text>
              </Badge>
              <Badge variant="outline" className="gap-1 px-3 py-1">
                <Ionicons name="shield-checkmark-outline" size={12} color={colors.success} />
                <Text>Verified</Text>
              </Badge>
              <Badge variant="outline" className="gap-1 px-3 py-1">
                <Ionicons name="calendar-outline" size={12} color={colors.dark} />
                <Text>{fmtJoined(profile.created_at)}</Text>
              </Badge>
            </View>

            <Pressable
              onPress={async () => {
                if (!token || !id) return;
                const res = await fetch(API.conversations, {
                  method: "POST",
                  headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                  body: JSON.stringify({ seller_id: Number(id) }),
                });
                const data = await res.json();
                if (data.conversation) router.push(`/inbox?conversation=${data.conversation.id}`);
              }}
              style={{
                flexDirection: "row", alignItems: "center", gap: 8,
                marginTop: 14, paddingHorizontal: 20, paddingVertical: 10,
                borderRadius: 10, borderWidth: 1.5, borderColor: colors.primary,
                backgroundColor: colors.primaryLight,
              }}
            >
              <Ionicons name="chatbubble-outline" size={15} color={colors.primary} />
              <Text style={{ fontSize: 13, fontWeight: "600", color: colors.primary }}>
                Send Message
              </Text>
            </Pressable>
          </View>

          {/* Two-column layout */}
          <View className="flex-row items-stretch gap-6 px-4 py-6" style={{ flexWrap: "wrap" }}>
            {/* Left — About (stretches to match tabbed column height) */}
            <View className="self-stretch" style={{ width: 300, flexShrink: 0 }}>
              <Card className="flex-1">
                <CardHeader>
                  <Text className="text-sm font-semibold text-foreground">About</Text>
                </CardHeader>
                <CardContent className="flex-1 flex-col pt-0">
                  <View className="flex-1">
                    <Text className="text-sm text-foreground">
                      {profile.bio || "No bio yet."}
                    </Text>
                  </View>
                  <View>
                    <Separator className="my-3" />
                    {profile.rating_count > 0 && (
                      <View className="flex-row items-center gap-2 py-1">
                        <Ionicons name="star-outline" size={15} color={colors.dark} />
                        <Text className="text-sm text-muted-foreground">
                          {profile.rating_avg.toFixed(1)} avg ({profile.rating_count} reviews)
                        </Text>
                      </View>
                    )}
                  </View>
                </CardContent>
              </Card>
            </View>

            {/* Right — Tabbed content */}
            <View style={{ flex: 1, minWidth: 300 }}>
              <Card>
                <View className="flex-row gap-1 px-4 pt-4 pb-3 border-b border-border">
                  {([
                    { key: "listings" as const, label: "Listings", count: listings.length },
                    { key: "services" as const, label: "Services", count: services.length },
                    { key: "events" as const, label: "Events", count: events.length },
                  ]).map(({ key, label, count }) => (
                    <Pressable
                      key={key}
                      className="px-4 py-2 rounded-full"
                      style={contentTab === key ? { backgroundColor: colors.primaryLight } : undefined}
                      onPress={() => setContentTab(key)}
                    >
                      <Text className="text-sm font-semibold" style={{ color: contentTab === key ? colors.primary : colors.dark }}>
                        {label} ({count})
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <CardContent className="pt-4">
                  {/* Listings */}
                  {contentTab === "listings" && (
                    listings.length === 0 ? (
                      <View className="items-center py-10">
                        <Ionicons name="pricetag-outline" size={24} color={colors.mid} />
                        <Text className="text-sm text-muted-foreground mt-2">No listings yet</Text>
                      </View>
                    ) : (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
                        {listings.map((item) => (
                          <Card key={item.id} className="overflow-hidden">
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
                                <Text className="text-sm font-bold" style={{ color: colors.primary }}>
                                  {item.is_free ? "Free" : item.price != null ? `$${item.price}` : "—"}
                                </Text>
                              </CardContent>
                            </Pressable>
                          </Card>
                        ))}
                      </div>
                    )
                  )}

                  {/* Services */}
                  {contentTab === "services" && (
                    services.length === 0 ? (
                      <View className="items-center py-10">
                        <Ionicons name="construct-outline" size={24} color={colors.mid} />
                        <Text className="text-sm text-muted-foreground mt-2">No services yet</Text>
                      </View>
                    ) : (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
                        {services.map((item) => (
                          <Card key={item.id} className="overflow-hidden">
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
                                <Text className="text-sm font-bold" style={{ color: colors.primary }}>
                                  {item.price != null ? `$${item.price}${item.price_type === "hourly" ? "/hr" : ""}` : "Free"}
                                </Text>
                              </CardContent>
                            </Pressable>
                          </Card>
                        ))}
                      </div>
                    )
                  )}

                  {/* Events */}
                  {contentTab === "events" && (
                    events.length === 0 ? (
                      <View className="items-center py-10">
                        <Ionicons name="calendar-outline" size={24} color={colors.mid} />
                        <Text className="text-sm text-muted-foreground mt-2">No events yet</Text>
                      </View>
                    ) : (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
                        {events.map((item) => (
                          <Card key={item.id} className="overflow-hidden">
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
                                <Text className="text-xs text-muted-foreground">{fmtDate(item.starts_at)}</Text>
                                <Text className="text-sm font-bold" style={{ color: item.is_free ? colors.success : colors.primary }}>
                                  {item.is_free ? "Free" : item.ticket_price != null ? `$${item.ticket_price}` : "Paid"}
                                </Text>
                              </CardContent>
                            </Pressable>
                          </Card>
                        ))}
                      </div>
                    )
                  )}
                </CardContent>
              </Card>
            </View>
          </View>

          {/* Reviews section */}
          <View className="px-4 pb-8">
            <Card>
              <CardHeader>
                <View className="flex-row items-center gap-2">
                  <Text className="text-base font-bold text-foreground">Reviews & Ratings</Text>
                  {profile.rating_count > 0 && (
                    <View className="flex-row items-center gap-1 px-2 py-0.5 rounded-full" style={{ backgroundColor: colors.primaryLight }}>
                      <Ionicons name="star" size={12} color={colors.primary} />
                      <Text className="text-xs font-semibold" style={{ color: colors.primary }}>
                        {profile.rating_avg.toFixed(1)} ({profile.rating_count})
                      </Text>
                    </View>
                  )}
                </View>
              </CardHeader>
              <CardContent>
                {profile.rating_count === 0 ? (
                  <View className="items-center py-10">
                    <View className="flex-row gap-1 mb-3">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Ionicons key={i} name="star-outline" size={24} color={colors.border} />
                      ))}
                    </View>
                    <Text className="text-sm font-medium text-muted-foreground">No reviews yet</Text>
                  </View>
                ) : (
                  <View className="gap-4">
                    <View className="flex-row items-center gap-6 pb-4 border-b border-border">
                      <View className="items-center">
                        <Text className="text-4xl font-bold text-foreground">{profile.rating_avg.toFixed(1)}</Text>
                        <View className="flex-row gap-0.5 mt-1">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <Ionicons
                              key={i}
                              name={i <= Math.round(profile.rating_avg) ? "star" : "star-outline"}
                              size={14}
                              color={i <= Math.round(profile.rating_avg) ? colors.primary : colors.border}
                            />
                          ))}
                        </View>
                        <Text className="text-xs text-muted-foreground mt-1">{profile.rating_count} reviews</Text>
                      </View>
                    </View>
                    <Text className="text-xs text-muted-foreground text-center">Individual reviews will appear here</Text>
                  </View>
                )}
              </CardContent>
            </Card>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
