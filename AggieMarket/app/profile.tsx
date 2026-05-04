import { useEffect, useState, useCallback } from "react";
import {
  View, ScrollView, ActivityIndicator, Pressable, Image, Platform, useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { API } from "@/constants/api";
import { colors } from "@/theme/colors";
import { Avatar } from "@/components/ui/Avatar";
import { SiteHeader, NavAvatar } from "@/components/ui/SiteHeader";
import { BottomNav } from "@/components/ui/BottomNav";
import { useWebSocket } from "@/context/WebSocketContext";
import type { ProfileData, ListingItem, ServiceItem, EventItem, RatingItem } from "@/types";
import { fmtDate, fmtJoined } from "@/lib/utils";
import { confirmAsync } from "@/lib/dialogs";

// ── Main ─────────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { user, token, logout } = useAuth();
  const router = useRouter();
  const { unreadCount } = useWebSocket();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const handleLogout = async () => {
    const ok = await confirmAsync("Are you sure you want to log out?", "Log out");
    if (!ok) return;
    await logout();
    router.replace("/");
  };

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [activeListings, setActiveListings] = useState<ListingItem[]>([]);
  const [soldListings, setSoldListings] = useState<ListingItem[]>([]);
  const [listingsTab, setListingsTab] = useState<"active" | "sold">("active");
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [contentTab, setContentTab] = useState<"listings" | "services" | "events">("listings");
  const [ratings, setRatings] = useState<RatingItem[]>([]);
  const [ratingsLoading, setRatingsLoading] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [reviewsModalOpen, setReviewsModalOpen] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!user || !token) return;
    try {
      const [pRes, alRes, slRes, sRes, eRes, rRes] = await Promise.all([
        fetch(API.user(user.id), { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API.userListings(user.id)}?status=active`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API.userListings(user.id)}?status=sold`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(API.userServices(user.id), { headers: { Authorization: `Bearer ${token}` } }),
        fetch(API.userEvents(user.id), { headers: { Authorization: `Bearer ${token}` } }),
        fetch(API.userRatings(user.id)),
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
  }, [user, token]);

  const loadMoreRatings = async () => {
    if (!user) return;
    setRatingsLoading(true);
    try {
      const res = await fetch(`${API.userRatings(user.id)}?limit=20&offset=${ratings.length}`);
      const data = await res.json();
      if (data.ratings) setRatings((prev) => [...prev, ...data.ratings]);
    } finally { setRatingsLoading(false); }
  };

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const handleEditSave = async () => {
    if (!token) return;
    setSaving(true);
    try {
      const res = await fetch(API.updateProfile, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: editName.trim(), bio: editBio.trim() }),
      });
      const data = await res.json();
      if (data.user) {
        setProfile((p) => p ? { ...p, name: data.user.name, bio: data.user.bio } : p);
        setEditOpen(false);
      }
    } finally { setSaving(false); }
  };

  const deleteListing = async (id: string) => {
    if (!(await confirmAsync("Delete this listing?", "Delete listing"))) return;
    await fetch(API.listing(id), { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    setActiveListings((p) => p.filter((l) => l.id !== id));
    setSoldListings((p) => p.filter((l) => l.id !== id));
  };
  const deleteService = async (id: string) => {
    if (!(await confirmAsync("Delete this service?", "Delete service"))) return;
    await fetch(API.service(id), { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    setServices((p) => p.filter((s) => s.id !== id));
  };
  const deleteEvent = async (id: string) => {
    if (!(await confirmAsync("Delete this event?", "Delete event"))) return;
    await fetch(API.event(id), { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    setEvents((p) => p.filter((e) => e.id !== id));
  };

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg, minHeight: "100vh" as any }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  const displayName = profile?.name ?? user?.name ?? "User";
  const totalListings = activeListings.length + soldListings.length;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
    <View style={{ flex: 1, backgroundColor: colors.bg, minHeight: "100vh" as any }}>
      <SiteHeader
        crumb="Profile"
        showSearch={false}
        showLogout
        avatarUrl={profile?.avatar_url ?? null}
      />
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>

        {/* ── Content wrapper ── */}
        <View style={{ maxWidth: 1100, marginHorizontal: "auto" as any, width: "100%", paddingBottom: 48 }}>

          {/* ── Crimson banner + avatar hero ── */}
          <View style={{ marginBottom: 24 }}>
            <View style={{ position: "relative" as any }}>
              <LinearGradient
                colors={["#8C0B42", "#6B0833"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ height: 120, width: "100%" as any }}
              />
              {/* Edit Profile pill — overlaid on the banner */}
              <Pressable
                onPress={() => {
                  setEditName(profile?.name ?? user?.name ?? "");
                  setEditBio(profile?.bio ?? "");
                  setEditOpen(true);
                }}
                style={{
                  position: "absolute" as any,
                  top: 16,
                  right: 16,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  backgroundColor: "rgba(255,255,255,0.95)",
                  borderRadius: 100,
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                  cursor: "pointer" as any,
                  shadowColor: "#000",
                  shadowOpacity: 0.12,
                  shadowRadius: 6,
                  shadowOffset: { width: 0, height: 2 },
                }}
              >
                <Ionicons name="create-outline" size={14} color={colors.primary} />
                <Text style={{ fontSize: 13, fontWeight: "700", color: colors.primary }}>Edit Profile</Text>
              </Pressable>
            </View>

            {/* Avatar + identity, overlapping banner */}
            <View style={{ alignItems: "center", marginTop: -44, paddingHorizontal: 24 }}>
              <View style={{ borderRadius: 44, borderWidth: 3, borderColor: colors.white, overflow: "hidden" }}>
                <NavAvatar name={displayName} avatarUrl={profile?.avatar_url ?? null} size={88} />
              </View>

              {/* Name */}
              <Text style={{ fontSize: 24, fontWeight: "800", color: colors.ink, marginTop: 12, textAlign: "center" }}>
                {displayName}
              </Text>

              {/* Email */}
              <Text style={{ fontSize: 13, color: colors.dark, marginTop: 2, textAlign: "center" }}>
                {user?.email ?? ""}
              </Text>

              {/* Badges row */}
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
                    {fmtJoined(profile?.created_at ?? new Date().toISOString())}
                  </Text>
                </View>
              </View>

            </View>
          </View>

          {/* ── Mobile-only quick actions: Saved + Logout ── */}
          {isMobile && (
            <View style={{ paddingHorizontal: 16, marginBottom: 16, gap: 10 }}>
              <Pressable
                onPress={() => router.push("/saved")}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  padding: 14,
                  backgroundColor: colors.white,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 12,
                }}
              >
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="heart-outline" size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: colors.ink }}>Saved items</Text>
                  <Text style={{ fontSize: 12, color: colors.dark, marginTop: 1 }}>Listings, services, and events you saved</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.dark} />
              </Pressable>
              <Pressable
                onPress={handleLogout}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  padding: 14,
                  backgroundColor: colors.white,
                  borderWidth: 1,
                  borderColor: colors.danger,
                  borderRadius: 12,
                }}
              >
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.dangerLight, alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="log-out-outline" size={18} color={colors.danger} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: colors.danger }}>Log out</Text>
                  <Text style={{ fontSize: 12, color: colors.dark, marginTop: 1 }}>Sign out of your account</Text>
                </View>
              </Pressable>
            </View>
          )}

          {/* ── Main layout: 320px left rail (About + Reviews) + flex main (Listings/Services/Events) ── */}
          <View style={{ flexDirection: "row", flexWrap: "wrap" as any, alignItems: "flex-start", gap: 20, paddingHorizontal: 24 }}>

            {/* Left rail */}
            <View style={{ width: isMobile ? "100%" : 320, flexGrow: 0, flexShrink: 0, flexBasis: isMobile ? "100%" : 320, gap: 20 } as any}>
              {/* About */}
              <Card>
                <CardHeader>
                  <Text style={{ fontSize: 13, fontWeight: "700", color: colors.ink }}>About</Text>
                </CardHeader>
                <CardContent style={{ paddingTop: 0 }}>
                  <Text style={{ fontSize: 14, color: colors.ink, lineHeight: 20 }}>
                    {profile?.bio || "No bio yet. Tap Edit Profile to add one."}
                  </Text>
                  <Separator style={{ marginVertical: 12 }} />
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Ionicons name="mail-outline" size={14} color={colors.dark} />
                    <Text style={{ fontSize: 13, color: colors.dark }}>{user?.email ?? ""}</Text>
                  </View>
                  {profile && profile.rating_count > 0 && (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 }}>
                      <Ionicons name="star-outline" size={14} color={colors.dark} />
                      <Text style={{ fontSize: 13, color: colors.dark }}>
                        {profile.rating_avg.toFixed(1)} avg ({profile.rating_count} reviews)
                      </Text>
                    </View>
                  )}
                </CardContent>
              </Card>

              {/* Reviews summary */}
              <Card>
                <CardHeader>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={{ fontSize: 13, fontWeight: "700", color: colors.ink }}>Reviews & Ratings</Text>
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
                </CardHeader>
                <CardContent>
                  {(!profile || profile.rating_count === 0) ? (
                    <View style={{ alignItems: "center", paddingVertical: 32 }}>
                      <View style={{ flexDirection: "row", gap: 4, marginBottom: 12 }}>
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Ionicons key={i} name="star-outline" size={22} color={colors.border} />
                        ))}
                      </View>
                      <Text style={{ fontSize: 14, fontWeight: "600", color: colors.dark }}>No reviews yet</Text>
                      <Text style={{ fontSize: 13, color: colors.dark, marginTop: 4, textAlign: "center", maxWidth: 320 }}>
                        When buyers leave reviews on your listings, services, or events, they'll show up here.
                      </Text>
                    </View>
                  ) : (
                    <View style={{ gap: 16 }}>
                      {/* Rating summary bar */}
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

                      {/* Top 3 most recent reviews */}
                      {ratingsLoading && ratings.length === 0 ? (
                        <View style={{ gap: 12 }}>
                          {[1, 2, 3].map((i) => (
                            <View key={i} style={{ flexDirection: "row", gap: 12, paddingVertical: 12 }}>
                              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.border }} />
                              <View style={{ flex: 1, gap: 6 }}>
                                <View style={{ height: 12, width: "40%" as any, backgroundColor: colors.border, borderRadius: 6 }} />
                                <View style={{ height: 10, width: "60%" as any, backgroundColor: colors.bg, borderRadius: 6 }} />
                              </View>
                            </View>
                          ))}
                        </View>
                      ) : (
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
                      )}

                      {/* View all reviews link */}
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
                                    <View style={{ paddingHorizontal: 12, paddingBottom: 10 }}>
                                      <Pressable
                                        onPress={() => deleteListing(item.id)}
                                        style={{ flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-end", padding: 4, cursor: "pointer" as any }}
                                      >
                                        <Ionicons name="trash-outline" size={13} color={colors.error} />
                                        <Text style={{ fontSize: 12, color: colors.error }}>Delete</Text>
                                      </Pressable>
                                    </View>
                                  </Card>
                                ))}
                              </View>
                              {allItems.length > 2 && user && (
                                <Pressable
                                  onPress={() => router.push(`/user/${user.id}/listings?status=${listingsTab}` as any)}
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
                            <View style={{ paddingHorizontal: 12, paddingBottom: 10 }}>
                              <Pressable
                                onPress={() => deleteService(item.id)}
                                style={{ flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-end", padding: 4, cursor: "pointer" as any }}
                              >
                                <Ionicons name="trash-outline" size={13} color={colors.error} />
                                <Text style={{ fontSize: 12, color: colors.error }}>Delete</Text>
                              </Pressable>
                            </View>
                          </Card>
                        ))}
                      </View>
                      {services.length > 2 && user && (
                        <Pressable
                          onPress={() => router.push(`/user/${user.id}/services` as any)}
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
                        {events.slice(0, 2).map((item) => (
                          <Card key={item.id} style={{ overflow: "hidden", flexBasis: 220, flexGrow: 1, maxWidth: 320 } as any}>
                            <Pressable onPress={() => router.push(`/event/${item.id}`)} style={{ cursor: "pointer" as any }}>
                              {item.image_url ? (
                                <Image source={{ uri: API.mediaUrl(item.image_url) }} style={{ width: "100%" as any, height: 120 }} resizeMode="cover" />
                              ) : (
                                <View style={{ width: "100%" as any, height: 120, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" }}>
                                  <Ionicons name="calendar-outline" size={24} color={colors.mid} />
                                </View>
                              )}
                              <CardContent style={{ padding: 12, gap: 4 }}>
                                <Text style={{ fontSize: 13, fontWeight: "600", color: colors.ink }} numberOfLines={1}>{item.title}</Text>
                                <Text style={{ fontSize: 12, color: colors.dark }}>{fmtDate(item.starts_at)}</Text>
                                <Text style={{ fontSize: 13, fontWeight: "700", color: item.is_free ? colors.success : colors.primary }}>
                                  {item.is_free ? "Free" : item.ticket_price != null ? `$${item.ticket_price}` : "Paid"}
                                </Text>
                              </CardContent>
                            </Pressable>
                            <View style={{ paddingHorizontal: 12, paddingBottom: 10 }}>
                              <Pressable
                                onPress={() => deleteEvent(item.id)}
                                style={{ flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-end", padding: 4, cursor: "pointer" as any }}
                              >
                                <Ionicons name="trash-outline" size={13} color={colors.error} />
                                <Text style={{ fontSize: 12, color: colors.error }}>Delete</Text>
                              </Pressable>
                            </View>
                          </Card>
                        ))}
                      </View>
                      {events.length > 2 && user && (
                        <Pressable
                          onPress={() => router.push(`/user/${user.id}/events` as any)}
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

      {/* ── Edit Profile Dialog ── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              <Text>Edit Profile</Text>
            </DialogTitle>
          </DialogHeader>
          <View style={{ gap: 16 }}>
            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 13, fontWeight: "500", color: colors.ink }}>Name</Text>
              <Input value={editName} onChangeText={setEditName} placeholder="Your name" />
            </View>
            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 13, fontWeight: "500", color: colors.ink }}>Bio</Text>
              <Textarea
                value={editBio}
                onChangeText={setEditBio}
                placeholder="Tell people about yourself..."
                numberOfLines={4}
              />
            </View>
          </View>
          <DialogFooter>
            <Button variant="outline" onPress={() => setEditOpen(false)}>
              <Text>Cancel</Text>
            </Button>
            <Button onPress={handleEditSave} disabled={saving}>
              <Text>{saving ? "Saving..." : "Save Changes"}</Text>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── All Reviews Dialog ── */}
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

                {ratings.length >= 20 && (
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
          active="me"
          unreadCount={unreadCount}
          onPress={(k) => {
            if (k === "home") router.push("/home");
            if (k === "browse") router.push("/browse");
            if (k === "post") router.push("/home");
            if (k === "inbox") router.push("/inbox");
          }}
        />
      )}
    </View>
    </SafeAreaView>
  );
}
