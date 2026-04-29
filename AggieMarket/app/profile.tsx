import { useEffect, useState, useCallback } from "react";
import {
  View, ScrollView, ActivityIndicator, Pressable, Image,
} from "react-native";
import { useRouter } from "expo-router";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Avatar as FacehashAvatar,
  AvatarImage as FacehashAvatarImage,
  AvatarFallback as FacehashAvatarFallback,
} from "facehash";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { useWebSocket } from "@/context/WebSocketContext";
import { API } from "@/constants/api";
import { colors } from "@/theme/colors";
import type { ProfileData, ListingItem, ServiceItem, EventItem } from "@/types";
import { fmtDate, fmtJoined } from "@/lib/utils";
import { Navbar } from "@/components/ui/navbar";
import { CreatePostModal } from "@/components/ui/createpostmodal";

// ── Sub-components ───────────────────────────────────────────────────────────

function ProfileInfoRow({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View className="flex-row items-center gap-2 py-1">
      <Ionicons name={icon} size={15} color={colors.dark} />
      <Text className="text-sm text-muted-foreground">{label}</Text>
    </View>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

export default function ProfileScreen() {

  const [modalVisible, setModalVisible] = useState(false);

  const { user, token, logout } = useAuth();
  const router = useRouter();
  const { unreadCount } = useWebSocket();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [listings, setListings] = useState<ListingItem[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [contentTab, setContentTab] = useState<"listings" | "services" | "events">("listings");

  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!user || !token) return;
    try {
      const [pRes, lRes, sRes, eRes] = await Promise.all([
        fetch(API.user(user.id), { headers: { Authorization: `Bearer ${token}` } }),
        fetch(API.userListings(user.id), { headers: { Authorization: `Bearer ${token}` } }),
        fetch(API.userServices(user.id), { headers: { Authorization: `Bearer ${token}` } }),
        fetch(API.userEvents(user.id), { headers: { Authorization: `Bearer ${token}` } }),
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
  }, [user, token]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const closeModal = useCallback(() => setModalVisible(false), []);

  const handleSaved = useCallback(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleLogout = async () => {
    if (!window.confirm("Are you sure you want to log out?")) return;
    await logout();
    router.replace("/");
  };

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
    if (!window.confirm("Delete this listing?")) return;
    await fetch(API.listing(id), { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    setListings((p) => p.filter((l) => l.id !== id));
  };
  const deleteService = async (id: string) => {
    if (!window.confirm("Delete this service?")) return;
    await fetch(API.service(id), { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    setServices((p) => p.filter((s) => s.id !== id));
  };
  const deleteEvent = async (id: string) => {
    if (!window.confirm("Delete this event?")) return;
    await fetch(API.event(id), { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    setEvents((p) => p.filter((e) => e.id !== id));
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background" style={{ minHeight: "100vh" as any }}>
        <ActivityIndicator color={colors.ink} />
      </View>
    );
  }


  return (
    <View className="flex-1 bg-background" style={{ minHeight: "100vh" as any }}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* ── Top nav bar ── */}
        <Navbar
          onNewPost={() => setModalVisible(true)}
        />

        {/* ── Cover photo ── */}
        <View style={{ maxWidth: 1100, marginHorizontal: "auto", width: "100%" }}>
          <View className="relative" style={{ height: 200 }}>
            {profile?.cover_url ? (
              <Image
                source={{ uri: API.mediaUrl(profile.cover_url) }}
                style={{ width: "100%", height: 200, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
                resizeMode="cover"
              />
            ) : (
              <div style={{
                width: "100%", height: 200,
                background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark} 50%, ${colors.primaryDarkest} 100%)`,
                borderRadius: 0,
              }} />
            )}
            {/* Edit cover button */}
            <Pressable
              className="absolute top-3 right-3 bg-card/80 rounded-md px-3 py-1.5 flex-row items-center gap-1.5"
              onPress={() => {
                setEditName(profile?.name ?? user?.name ?? "");
                setEditBio(profile?.bio ?? "");
                setEditOpen(true);
              }}
            >
              <Ionicons name="create-outline" size={14} color={colors.ink} />
              <Text className="text-xs font-medium text-foreground">Edit</Text>
            </Pressable>
          </View>

          {/* ── Avatar + Name row ── */}
          <View className="items-center -mt-16 mb-4">
            <FacehashAvatar
              className="h-28 w-28 rounded-full overflow-hidden border-4 border-white shadow-md"
              style={{ width: 112, height: 112 }}
            >
              {profile?.avatar_url ? (
                <FacehashAvatarImage
                  src={API.mediaUrl(profile.avatar_url)}
                  alt={profile?.name ?? "Profile"}
                />
              ) : null}
              <FacehashAvatarFallback
                name={profile?.name ?? user?.name ?? user?.email ?? "User"}
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

            <Text className="text-2xl font-bold text-foreground mt-3">
              {profile?.name ?? user?.name}
            </Text>
            <Pressable
              className="p-2 rounded-md hover:bg-muted"
              onPress={handleLogout}
            >
              <Ionicons name="log-out-outline" size={18} color={colors.dark} />
            </Pressable>

            {/* Meta badges */}
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
                <Text>{fmtJoined(profile?.created_at ?? new Date().toISOString())}</Text>
              </Badge>
            </View>
          </View>

          <View>
            {/* ── Two-column layout ── */}
            <View className="flex-row items-stretch gap-6 px-4 py-6" style={{ flexWrap: "wrap" }}>
              {/* Left column — About (stretches with right column; bio grows until email/rating) */}
              <View className="self-stretch" style={{ width: 300, flexShrink: 0 }}>
                <Card className="flex-1">
                  <CardHeader>
                    <Text className="text-sm font-semibold text-foreground">About</Text>
                  </CardHeader>
                  <CardContent className="flex-1 flex-col pt-0">
                    <View className="flex-1">
                      <Text className="text-sm text-foreground">
                        {profile?.bio || "No bio yet. Click Edit Profile to add one."}
                      </Text>
                    </View>
                    <View>
                      <Separator className="my-3" />
                      <ProfileInfoRow icon="mail-outline" label={user?.email ?? ""} />
                      {profile && profile.rating_count > 0 && (
                        <ProfileInfoRow icon="star-outline" label={`${profile.rating_avg.toFixed(1)} avg (${profile.rating_count} reviews)`} />
                      )}
                    </View>
                  </CardContent>
                </Card>
              </View>

              {/* Right column — Tabbed content */}
              <View style={{ flex: 1, minWidth: 300 }}>
                <Card>
                  {/* Tab pills */}
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
                                  <View className="flex-row items-center justify-between">
                                    <Text className="text-sm font-bold" style={{ color: colors.primary }}>
                                      {item.is_free ? "Free" : item.price != null ? `$${item.price}` : "—"}
                                    </Text>
                                    {item.status === "sold" && <Badge variant="destructive"><Text>SOLD</Text></Badge>}
                                  </View>
                                </CardContent>
                              </Pressable>
                              <View className="px-3 pb-2">
                                <Pressable className="flex-row items-center gap-1 self-end p-1 rounded hover:bg-muted" onPress={() => deleteListing(item.id)}>
                                  <Ionicons name="trash-outline" size={13} color={colors.error} />
                                  <Text className="text-xs" style={{ color: colors.error }}>Delete</Text>
                                </Pressable>
                              </View>
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
                                  <Text className="text-sm font-bold" style={{ color: colors.primary }}>
                                    {item.price != null ? `$${item.price}${item.price_type === "hourly" ? "/hr" : ""}` : "Free"}
                                  </Text>
                                </CardContent>
                              </Pressable>
                              <View className="px-3 pb-2">
                                <Pressable className="flex-row items-center gap-1 self-end p-1 rounded hover:bg-muted" onPress={() => deleteService(item.id)}>
                                  <Ionicons name="trash-outline" size={13} color={colors.error} />
                                  <Text className="text-xs" style={{ color: colors.error }}>Delete</Text>
                                </Pressable>
                              </View>
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
                                  <Text className="text-xs text-muted-foreground">{fmtDate(item.starts_at)}</Text>
                                  <Text className="text-sm font-bold" style={{ color: item.is_free ? colors.success : colors.primary }}>
                                    {item.is_free ? "Free" : item.ticket_price != null ? `$${item.ticket_price}` : "Paid"}
                                  </Text>
                                </CardContent>
                              </Pressable>
                              <View className="px-3 pb-2">
                                <Pressable className="flex-row items-center gap-1 self-end p-1 rounded hover:bg-muted" onPress={() => deleteEvent(item.id)}>
                                  <Ionicons name="trash-outline" size={13} color={colors.error} />
                                  <Text className="text-xs" style={{ color: colors.error }}>Delete</Text>
                                </Pressable>
                              </View>
                            </Card>
                          ))}
                        </div>
                      )
                    )}
                  </CardContent>
                </Card>
              </View>
            </View>

            {/* ── Reviews & Ratings — full width row ── */}
            <View className="px-4 pb-8">
              <Card>
                <CardHeader>
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2">
                      <Text className="text-base font-bold text-foreground">Reviews & Ratings</Text>
                      {profile && profile.rating_count > 0 && (
                        <View className="flex-row items-center gap-1 px-2 py-0.5 rounded-full" style={{ backgroundColor: colors.primaryLight }}>
                          <Ionicons name="star" size={12} color={colors.primary} />
                          <Text className="text-xs font-semibold" style={{ color: colors.primary }}>
                            {profile.rating_avg.toFixed(1)} ({profile.rating_count})
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </CardHeader>
                <CardContent>
                  {(!profile || profile.rating_count === 0) ? (
                    <View className="items-center py-10">
                      <View className="flex-row gap-1 mb-3">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Ionicons key={i} name="star-outline" size={24} color={colors.border} />
                        ))}
                      </View>
                      <Text className="text-sm font-medium text-muted-foreground">No reviews yet</Text>
                      <Text className="text-xs text-muted-foreground mt-1 text-center" style={{ maxWidth: 320 }}>
                        When buyers leave reviews on your listings, services, or events, they'll show up here with a star rating and comment.
                      </Text>
                    </View>
                  ) : (
                    <View className="gap-4">
                      {/* Rating summary bar */}
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
                        {/* Rating distribution bars */}
                        <View className="flex-1 gap-1.5">
                          {[5, 4, 3, 2, 1].map((star) => (
                            <View key={star} className="flex-row items-center gap-2">
                              <Text className="text-xs text-muted-foreground w-3">{star}</Text>
                              <Ionicons name="star" size={10} color={colors.primary} />
                              <View className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                <View className="h-2 rounded-full" style={{ width: "0%", backgroundColor: colors.primary }} />
                              </View>
                            </View>
                          ))}
                        </View>
                      </View>
                      <Text className="text-xs text-muted-foreground text-center">Individual reviews will appear here</Text>
                    </View>
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
          <View className="gap-4">
            <View className="gap-1.5">
              <Text className="text-sm font-medium text-foreground">Name</Text>
              <Input value={editName} onChangeText={setEditName} placeholder="Your name" />
            </View>
            <View className="gap-1.5">
              <Text className="text-sm font-medium text-foreground">Bio</Text>
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

      <CreatePostModal
        visible={modalVisible}
        onClose={closeModal}
        onSaved={handleSaved}
        token={token}
      />
    </View>
  );
}

