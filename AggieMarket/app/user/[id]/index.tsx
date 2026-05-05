import { useEffect, useState, useCallback } from "react";
import { View, ScrollView, ActivityIndicator, Pressable, Image, Platform } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "@/context/AuthContext";
import { API } from "@/constants/api";
import { colors } from "@/theme/colors";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar } from "@/components/ui/Avatar";
import { SiteHeader, NavAvatar } from "@/components/ui/SiteHeader";
import { BottomNav } from "@/components/ui/BottomNav";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useWebSocket } from "@/context/WebSocketContext";
import type { ProfileData, ListingItem, ServiceItem, EventItem, RatingItem } from "@/types";
import { fmtDate, fmtJoined, isPastDay } from "@/lib/utils";

export default function PublicProfileScreen() {
  const _ws = useWebSocket();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user, token } = useAuth();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [activeListings, setActiveListings] = useState<ListingItem[]>([]);
  const [soldListings, setSoldListings] = useState<ListingItem[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [ratings, setRatings] = useState<RatingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [contentTab, setContentTab] = useState<"listings" | "services" | "events">("listings");
  const [listingsTab, setListingsTab] = useState<"active" | "sold">("active");
  const [reviewsModalOpen, setReviewsModalOpen] = useState(false);
  const [ratingsLoading, setRatingsLoading] = useState(false);

  const loadMoreRatings = async () => {
    if (!id) return;
    setRatingsLoading(true);
    try {
      const userId = Number(id);
      const res = await fetch(`${API.userRatings(userId)}?limit=20&offset=${ratings.length}`);
      const data = await res.json();
      if (data.ratings) setRatings((prev) => [...prev, ...data.ratings]);
    } finally { setRatingsLoading(false); }
  };

  // If viewing own profile, redirect
  useEffect(() => {
    if (id && user && String(user.id) === String(id)) {
      router.replace("/profile");
    }
  }, [id, user, router]);

  const fetchProfile = useCallback(async () => {
    if (!id) return;
    try {
      const userId = Number(id);
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      const [pRes, alRes, slRes, sRes, eRes, rRes] = await Promise.all([
        fetch(API.user(userId), { headers }),
        fetch(`${API.userListings(userId)}?status=active`, { headers }),
        fetch(`${API.userListings(userId)}?status=sold`, { headers }),
        fetch(API.userServices(userId), { headers }),
        fetch(API.userEvents(userId), { headers }),
        fetch(API.userRatings(userId)),
      ]);
      const [pData, alData, slData, sData, eData, rData] = await Promise.all([
        pRes.json(), alRes.json(), slRes.json(), sRes.json(), eRes.json(), rRes.json(),
      ]);
      if (pData.user) setProfile(pData.user);
      if (alData.listings) setActiveListings(alData.listings);
      if (slData.listings) setSoldListings(slData.listings);
      if (sData.services) setServices(sData.services);
      if (eData.events) setEvents(eData.events);
      if (rData.ratings) setRatings(rData.ratings);
    } catch (err) { console.error("Profile fetch error:", err); }
    finally { setLoading(false); }
  }, [id, token]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg, minHeight: "100vh" as any }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12, backgroundColor: colors.bg, minHeight: "100vh" as any }}>
        <Text style={{ fontSize: 14, color: colors.dark }}>User not found.</Text>
        <Button variant="outline" onPress={() => router.back()}>
          <Text>Go back</Text>
        </Button>
      </View>
    );
  }

  const totalListings = activeListings.length + soldListings.length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, minHeight: "100vh" as any }}>
      <SiteHeader crumb={profile.name} showSearch={false} />
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>

        {/* ── Content wrapper ── */}
        <View style={{ maxWidth: 1100, marginHorizontal: "auto" as any, width: "100%", paddingBottom: 48 }}>

          {/* ── Crimson banner + avatar hero ── */}
          <View style={{ marginBottom: 24 }}>
            <LinearGradient
              colors={["#8C0B42", "#6B0833"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ height: 120, width: "100%" as any }}
            />

            {/* Avatar + identity, overlapping banner */}
            <View style={{ alignItems: "center", marginTop: -44, paddingHorizontal: 24 }}>
              <View style={{ borderRadius: 44, borderWidth: 3, borderColor: colors.white, overflow: "hidden" }}>
                <NavAvatar name={profile.name} avatarUrl={profile.avatar_url ?? null} size={88} />
              </View>

              {/* Name */}
              <Text style={{ fontSize: 24, fontWeight: "800", color: colors.ink, marginTop: 12, textAlign: "center" }}>
                {profile.name}
              </Text>

              {/* Badges row (no email — public view) */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10, flexWrap: "wrap" as any, justifyContent: "center" }}>
                <View style={{
                  flexDirection: "row", alignItems: "center", gap: 4,
                  backgroundColor: colors.successLight,
                  borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4,
                }}>
                  <Ionicons name="shield-checkmark" size={12} color={colors.success} />
                  <Text style={{ fontSize: 12, fontWeight: "600", color: colors.success }}>Verified .edu</Text>
                </View>

                <View style={{
                  flexDirection: "row", alignItems: "center", gap: 4,
                  backgroundColor: colors.primaryLight,
                  borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4,
                }}>
                  <Ionicons name="school-outline" size={12} color={colors.primary} />
                  <Text style={{ fontSize: 12, fontWeight: "600", color: colors.primary }}>NMSU Student</Text>
                </View>

                <View style={{
                  flexDirection: "row", alignItems: "center", gap: 4,
                  backgroundColor: colors.bg,
                  borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4,
                  borderWidth: 1, borderColor: colors.border,
                }}>
                  <Ionicons name="calendar-outline" size={12} color={colors.dark} />
                  <Text style={{ fontSize: 12, fontWeight: "500", color: colors.dark }}>
                    {fmtJoined(profile.created_at)}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* ── Main layout: 320px left rail (About + Reviews) + flex main ── */}
          <View style={{ flexDirection: "row", flexWrap: "wrap" as any, alignItems: "flex-start", gap: 20, paddingHorizontal: 24 }}>

            {/* Left rail */}
            <View style={{ width: 320, flexGrow: 0, flexShrink: 0, flexBasis: 320, gap: 20 } as any}>
              {/* About */}
              <Card>
                <CardHeader>
                  <Text style={{ fontSize: 13, fontWeight: "700", color: colors.ink }}>About</Text>
                </CardHeader>
                <CardContent style={{ paddingTop: 0 }}>
                  <Text style={{ fontSize: 14, color: colors.ink, lineHeight: 20 }}>
                    {profile.bio || "No bio yet."}
                  </Text>
                  {profile.rating_count > 0 && (
                    <>
                      <Separator style={{ marginVertical: 12 }} />
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Ionicons name="star-outline" size={14} color={colors.dark} />
                        <Text style={{ fontSize: 13, color: colors.dark }}>
                          {profile.rating_avg.toFixed(1)} avg ({profile.rating_count} reviews)
                        </Text>
                      </View>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Reviews summary */}
              <Card>
                <CardHeader>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={{ fontSize: 13, fontWeight: "700", color: colors.ink }}>Reviews & Ratings</Text>
                    {profile.rating_count > 0 && (
                      <View style={{
                        flexDirection: "row", alignItems: "center", gap: 4,
                        paddingHorizontal: 8, paddingVertical: 3,
                        backgroundColor: colors.primaryLight, borderRadius: 100,
                      }}>
                        <Ionicons name="star" size={11} color={colors.primary} />
                        <Text style={{ fontSize: 12, fontWeight: "600", color: colors.primary }}>
                          {profile.rating_avg.toFixed(1)} ({profile.rating_count})
                        </Text>
                      </View>
                    )}
                  </View>
                </CardHeader>
                <CardContent>
                  {profile.rating_count === 0 ? (
                    <View style={{ alignItems: "center", paddingVertical: 32 }}>
                      <View style={{ flexDirection: "row", gap: 4, marginBottom: 12 }}>
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Ionicons key={i} name="star-outline" size={22} color={colors.border} />
                        ))}
                      </View>
                      <Text style={{ fontSize: 14, fontWeight: "600", color: colors.dark }}>No reviews yet</Text>
                    </View>
                  ) : (
                    <View style={{ gap: 16 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                        <View style={{ alignItems: "center" }}>
                          <Text style={{ fontSize: 40, fontWeight: "800", color: colors.ink }}>{profile.rating_avg.toFixed(1)}</Text>
                          <View style={{ flexDirection: "row", gap: 2, marginTop: 2 }}>
                            {[1, 2, 3, 4, 5].map((i) => (
                              <Ionicons
                                key={i}
                                name={i <= Math.round(profile.rating_avg) ? "star" : "star-outline"}
                                size={14}
                                color={i <= Math.round(profile.rating_avg) ? colors.primary : colors.border}
                              />
                            ))}
                          </View>
                          <Text style={{ fontSize: 12, color: colors.dark, marginTop: 2 }}>{profile.rating_count} reviews</Text>
                        </View>
                        <View style={{ flex: 1, gap: 5 }}>
                          {[5, 4, 3, 2, 1].map((star) => {
                            const starCount = ratings.filter((r) => r.stars === star).length;
                            const pct = ratings.length > 0 ? (starCount / ratings.length) * 100 : 0;
                            return (
                              <View key={star} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                                <Text style={{ fontSize: 11, color: colors.dark, width: 8 }}>{star}</Text>
                                <Ionicons name="star" size={10} color={colors.primary} />
                                <View style={{ flex: 1, height: 6, backgroundColor: colors.bg, borderRadius: 3, overflow: "hidden" }}>
                                  <View style={{ height: 6, width: `${pct}%` as any, backgroundColor: colors.primary, borderRadius: 3 }} />
                                </View>
                              </View>
                            );
                          })}
                        </View>
                      </View>

                      <View style={{ gap: 0 }}>
                        {ratings.slice(0, 3).map((r) => (
                          <View key={r.id} style={{
                            flexDirection: "row", gap: 12,
                            paddingVertical: 14,
                            borderBottomWidth: 1, borderBottomColor: colors.border,
                          }}>
                            <Avatar name={r.reviewer_name ?? "U"} size={36} />
                            <View style={{ flex: 1, gap: 4 }}>
                              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                                <Text style={{ fontSize: 13, fontWeight: "600", color: colors.ink }}>{r.reviewer_name ?? "Anonymous"}</Text>
                                <Text style={{ fontSize: 12, color: colors.dark }}>{fmtDate(r.created_at)}</Text>
                              </View>
                              <View style={{ flexDirection: "row", gap: 2 }}>
                                {[1, 2, 3, 4, 5].map((i) => (
                                  <Ionicons
                                    key={i}
                                    name={i <= r.stars ? "star" : "star-outline"}
                                    size={13}
                                    color={i <= r.stars ? colors.primary : colors.border}
                                  />
                                ))}
                              </View>
                              {r.body ? <Text style={{ fontSize: 13, color: colors.ink, marginTop: 2 }} numberOfLines={3}>{r.body}</Text> : null}
                            </View>
                          </View>
                        ))}
                      </View>

                      {ratings.length > 0 && (
                        <Pressable
                          onPress={() => setReviewsModalOpen(true)}
                          style={{ alignSelf: "flex-start", paddingVertical: 6, cursor: "pointer" as any }}
                        >
                          <Text style={{ fontSize: 13, fontWeight: "600", color: colors.primary }}>
                            View all reviews →
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  )}
                </CardContent>
              </Card>
            </View>

            {/* Right main column — Listings/Services/Events tabs */}
            <View style={{ flex: 1, minWidth: 320 }}>
              <Card>
                {/* Tab pills */}
                <View style={{
                  flexDirection: "row", gap: 4,
                  paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12,
                  borderBottomWidth: 1, borderBottomColor: colors.border,
                }}>
                  {([
                    { key: "listings" as const, label: "Listings", count: totalListings },
                    { key: "services" as const, label: "Services", count: services.length },
                    { key: "events" as const, label: "Events", count: events.length },
                  ]).map(({ key, label, count }) => (
                    <Pressable
                      key={key}
                      onPress={() => setContentTab(key)}
                      style={[
                        {
                          paddingHorizontal: 14, paddingVertical: 7,
                          borderRadius: 100,
                          cursor: "pointer" as any,
                          transition: "background-color 150ms ease" as any,
                        },
                        contentTab === key
                          ? { backgroundColor: colors.primary }
                          : { backgroundColor: "transparent" },
                      ]}
                    >
                      <Text style={{
                        fontSize: 13, fontWeight: "600",
                        color: contentTab === key ? colors.white : colors.dark,
                      }}>
                        {label} ({count})
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <CardContent style={{ paddingTop: 16 }}>
                  {/* Listings */}
                  {contentTab === "listings" && (
                    <View style={{ gap: 12 }}>
                      {/* Active / Sold sub-tabs */}
                      <View style={{
                        flexDirection: "row",
                        backgroundColor: colors.bg,
                        borderRadius: 100, padding: 3,
                        alignSelf: "flex-start",
                      }}>
                        {(["active", "sold"] as const).map((tab) => {
                          const count = tab === "active" ? activeListings.length : soldListings.length;
                          return (
                            <Pressable
                              key={tab}
                              onPress={() => setListingsTab(tab)}
                              style={[
                                {
                                  paddingHorizontal: 14, paddingVertical: 6,
                                  borderRadius: 100,
                                  cursor: "pointer" as any,
                                  transition: "background-color 150ms ease" as any,
                                },
                                listingsTab === tab
                                  ? { backgroundColor: colors.primary }
                                  : { backgroundColor: "transparent" },
                              ]}
                            >
                              <Text style={{
                                fontSize: 12, fontWeight: "600",
                                color: listingsTab === tab ? colors.white : colors.dark,
                              }}>
                                {tab === "active" ? "Active" : "Sold"} ({count})
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>

                      {(listingsTab === "active" ? activeListings : soldListings).length === 0 ? (
                        <View style={{ alignItems: "center", paddingVertical: 40 }}>
                          <Ionicons name="pricetag-outline" size={28} color={colors.mid} />
                          <Text style={{ fontSize: 14, color: colors.dark, marginTop: 8 }}>
                            {listingsTab === "active" ? "No active listings" : "No sold listings"}
                          </Text>
                        </View>
                      ) : (
                        (() => {
                          const allItems = listingsTab === "active" ? activeListings : soldListings;
                          const visible = allItems.slice(0, 2);
                          return (
                            <View style={{ gap: 14 }}>
                              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 14 }}>
                                {visible.map((item) => (
                                  <Card key={item.id} style={{ overflow: "hidden", flexBasis: 220, flexGrow: 1, maxWidth: 320 } as any}>
                                    <Pressable onPress={() => router.push(`/listing/${item.id}`)} style={{ cursor: "pointer" as any }}>
                                      {item.image_url ? (
                                        <Image source={{ uri: API.mediaUrl(item.image_url) }} style={{ width: "100%" as any, height: 120 }} resizeMode="cover" />
                                      ) : (
                                        <View style={{ width: "100%" as any, height: 120, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" }}>
                                          <Ionicons name="image-outline" size={24} color={colors.mid} />
                                        </View>
                                      )}
                                      <CardContent style={{ padding: 12, gap: 4 }}>
                                        <Text style={{ fontSize: 13, fontWeight: "600", color: colors.ink }} numberOfLines={1}>{item.title}</Text>
                                        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                                          <Text style={{ fontSize: 13, fontWeight: "700", color: colors.primary }}>
                                            {item.is_free ? "Free" : item.price != null ? `$${item.price}` : "—"}
                                          </Text>
                                          {item.status === "sold" && <Badge variant="destructive"><Text>SOLD</Text></Badge>}
                                        </View>
                                      </CardContent>
                                    </Pressable>
                                  </Card>
                                ))}
                              </View>
                              {allItems.length > 2 && (
                                <Pressable
                                  onPress={() => router.push(`/user/${id}/listings?status=${listingsTab}` as any)}
                                  style={{ alignSelf: "flex-start", paddingVertical: 6, cursor: "pointer" as any }}
                                >
                                  <Text style={{ fontSize: 13, fontWeight: "700", color: colors.primary }}>
                                    View all {allItems.length} {listingsTab} listings →
                                  </Text>
                                </Pressable>
                              )}
                            </View>
                          );
                        })()
                      )}
                    </View>
                  )}

                  {/* Services */}
                  {contentTab === "services" && (
                    services.length === 0 ? (
                      <View style={{ alignItems: "center", paddingVertical: 40 }}>
                        <Ionicons name="construct-outline" size={28} color={colors.mid} />
                        <Text style={{ fontSize: 14, color: colors.dark, marginTop: 8 }}>No services yet</Text>
                      </View>
                    ) : (
                      <View style={{ gap: 14 }}>
                        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 14 }}>
                          {services.slice(0, 2).map((item) => (
                            <Card key={item.id} style={{ overflow: "hidden", flexBasis: 220, flexGrow: 1, maxWidth: 320 } as any}>
                              <Pressable onPress={() => router.push(`/service/${item.id}`)} style={{ cursor: "pointer" as any }}>
                                {item.image_url ? (
                                  <Image source={{ uri: API.mediaUrl(item.image_url) }} style={{ width: "100%" as any, height: 120 }} resizeMode="cover" />
                                ) : (
                                  <View style={{ width: "100%" as any, height: 120, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" }}>
                                    <Ionicons name="construct-outline" size={24} color={colors.mid} />
                                  </View>
                                )}
                                <CardContent style={{ padding: 12, gap: 4 }}>
                                  <Text style={{ fontSize: 13, fontWeight: "600", color: colors.ink }} numberOfLines={1}>{item.title}</Text>
                                  <Text style={{ fontSize: 13, fontWeight: "700", color: colors.primary }}>
                                    {item.price != null ? `$${item.price}${item.price_type === "hourly" ? "/hr" : ""}` : "Free"}
                                  </Text>
                                </CardContent>
                              </Pressable>
                            </Card>
                          ))}
                        </View>
                        {services.length > 2 && (
                          <Pressable
                            onPress={() => router.push(`/user/${id}/services` as any)}
                            style={{ alignSelf: "flex-start", paddingVertical: 6, cursor: "pointer" as any }}
                          >
                            <Text style={{ fontSize: 13, fontWeight: "700", color: colors.primary }}>
                              View all {services.length} services →
                            </Text>
                          </Pressable>
                        )}
                      </View>
                    )
                  )}

                  {/* Events */}
                  {contentTab === "events" && (
                    events.length === 0 ? (
                      <View style={{ alignItems: "center", paddingVertical: 40 }}>
                        <Ionicons name="calendar-outline" size={28} color={colors.mid} />
                        <Text style={{ fontSize: 14, color: colors.dark, marginTop: 8 }}>No events yet</Text>
                      </View>
                    ) : (
                      <View style={{ gap: 14 }}>
                        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 14 }}>
                          {events.slice(0, 2).map((item) => {
                            const isPast = isPastDay(item.starts_at);
                            return (
                              <Card key={item.id} style={{ overflow: "hidden", opacity: isPast ? 0.78 : 1 }}>
                                <Pressable onPress={() => router.push(`/event/${item.id}`)} style={{ cursor: "pointer" as any }}>
                                  <View style={{ position: "relative" }}>
                                    {item.image_url ? (
                                      <Image source={{ uri: API.mediaUrl(item.image_url) }} style={{ width: "100%" as any, height: 120 }} resizeMode="cover" />
                                    ) : (
                                      <View style={{ width: "100%" as any, height: 120, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" }}>
                                        <Ionicons name="calendar-outline" size={24} color={colors.mid} />
                                      </View>
                                    )}
                                    {isPast && (
                                      <View style={{
                                        position: "absolute", top: 6, left: 6,
                                        backgroundColor: colors.dark, borderRadius: 5,
                                        paddingHorizontal: 6, paddingVertical: 2,
                                      }}>
                                        <Text style={{ color: "#fff", fontSize: 9, fontWeight: "800", letterSpacing: 0.4 }}>PAST</Text>
                                      </View>
                                    )}
                                  </View>
                                  <CardContent style={{ padding: 12, gap: 4 }}>
                                    <Text style={{ fontSize: 13, fontWeight: "600", color: colors.ink }} numberOfLines={1}>{item.title}</Text>
                                    <Text style={{ fontSize: 12, color: colors.dark }}>{fmtDate(item.starts_at)}</Text>
                                    <Text style={{ fontSize: 13, fontWeight: "700", color: item.is_free ? colors.success : colors.primary }}>
                                      {item.is_free ? "Free" : item.ticket_price != null ? `$${item.ticket_price}` : "Paid"}
                                    </Text>
                                  </CardContent>
                                </Pressable>
                              </Card>
                            );
                          })}
                        </View>
                        {events.length > 2 && (
                          <Pressable
                            onPress={() => router.push(`/user/${id}/events` as any)}
                            style={{ alignSelf: "flex-start", paddingVertical: 6, cursor: "pointer" as any }}
                          >
                            <Text style={{ fontSize: 13, fontWeight: "700", color: colors.primary }}>
                              View all {events.length} events →
                            </Text>
                          </Pressable>
                        )}
                      </View>
                    )
                  )}
                </CardContent>
              </Card>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* All Reviews Dialog */}
      <Dialog open={reviewsModalOpen} onOpenChange={setReviewsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={{ fontSize: 16, fontWeight: "700", color: colors.ink }}>All Reviews</Text>
                {profile && profile.rating_count > 0 && (
                  <View style={{
                    flexDirection: "row", alignItems: "center", gap: 4,
                    paddingHorizontal: 8, paddingVertical: 3,
                    backgroundColor: colors.primaryLight, borderRadius: 100,
                  }}>
                    <Ionicons name="star" size={11} color={colors.primary} />
                    <Text style={{ fontSize: 12, fontWeight: "600", color: colors.primary }}>
                      {profile.rating_avg.toFixed(1)} ({profile.rating_count})
                    </Text>
                  </View>
                )}
              </View>
            </DialogTitle>
          </DialogHeader>
          <ScrollView style={{ maxHeight: 500 }} showsVerticalScrollIndicator={true}>
            {ratings.length === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: 40 }}>
                <Text style={{ fontSize: 14, color: colors.dark }}>No reviews yet</Text>
              </View>
            ) : (
              <View style={{ gap: 0 }}>
                {ratings.map((r) => (
                  <View key={r.id} style={{
                    flexDirection: "row", gap: 12,
                    paddingVertical: 14,
                    borderBottomWidth: 1, borderBottomColor: colors.border,
                  }}>
                    <Avatar name={r.reviewer_name ?? "U"} size={36} />
                    <View style={{ flex: 1, gap: 4 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                        <Text style={{ fontSize: 13, fontWeight: "600", color: colors.ink }}>{r.reviewer_name ?? "Anonymous"}</Text>
                        <Text style={{ fontSize: 12, color: colors.dark }}>{fmtDate(r.created_at)}</Text>
                      </View>
                      <View style={{ flexDirection: "row", gap: 2 }}>
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Ionicons
                            key={i}
                            name={i <= r.stars ? "star" : "star-outline"}
                            size={13}
                            color={i <= r.stars ? colors.primary : colors.border}
                          />
                        ))}
                      </View>
                      {r.body ? <Text style={{ fontSize: 13, color: colors.ink, marginTop: 2 }}>{r.body}</Text> : null}
                    </View>
                  </View>
                ))}

                {profile && ratings.length < profile.rating_count && (
                  <View style={{ paddingVertical: 12 }}>
                    <Button variant="outline" onPress={loadMoreRatings} disabled={ratingsLoading}>
                      {ratingsLoading ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                      ) : (
                        <Text>Load more</Text>
                      )}
                    </Button>
                  </View>
                )}
              </View>
            )}
          </ScrollView>
          <DialogFooter>
            <Button variant="outline" onPress={() => setReviewsModalOpen(false)}>
              <Text>Close</Text>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {Platform.OS !== "web" && (
        <BottomNav
          unreadCount={_ws.unreadCount}
          onPress={(k) => {
            if (k === "home") router.push("/home");
            if (k === "browse") router.push("/browse");
            if (k === "post") router.push("/home");
            if (k === "inbox") router.push("/inbox");
            if (k === "me") router.push("/profile");
          }}
        />
      )}
    </View>
  );
}
