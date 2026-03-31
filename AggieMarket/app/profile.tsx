import { useEffect, useState, useCallback } from "react";
import {
  View, ScrollView, ActivityIndicator, Pressable, Image, Alert, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

type ProfileData = {
  id: number;
  name: string;
  bio: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  rating_avg: number;
  rating_count: number;
  created_at: string;
  listings_count: number;
  services_count: number;
  events_count: number;
};

type ListingItem = {
  id: string; title: string; price: number | null;
  is_free: number; status: string; image_url: string | null;
};

type ServiceItem = {
  id: string; title: string; price: number | null;
  price_type: string | null; image_url: string | null;
};

type EventItem = {
  id: string; title: string; starts_at: string;
  is_free: number; ticket_price: number | null; image_url: string | null;
};

function confirmAction(title: string, message: string, onConfirm: () => void) {
  if (Platform.OS === "web") {
    if (window.confirm(`${title}\n${message}`)) onConfirm();
  } else {
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel" },
      { text: "Confirm", style: "destructive", onPress: onConfirm },
    ]);
  }
}

function StatBlock({ label, value }: { label: string; value: string | number }) {
  return (
    <View className="items-center px-4">
      <Text className="text-lg font-bold text-foreground">{value}</Text>
      <Text className="text-xs text-muted-foreground">{label}</Text>
    </View>
  );
}

function ItemRow({
  imageUrl,
  title,
  subtitle,
  badge,
  badgeVariant,
  onPress,
  onDelete,
  icon,
}: {
  imageUrl: string | null;
  title: string;
  subtitle: string;
  badge?: string;
  badgeVariant?: "success" | "destructive" | "outline" | "secondary";
  onPress: () => void;
  onDelete: () => void;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <Card className="mb-2 overflow-hidden">
      <Pressable className="flex-row items-center" onPress={onPress}>
        {imageUrl ? (
          <Image
            source={{ uri: API.mediaUrl(imageUrl) }}
            className="w-16 h-16"
            resizeMode="cover"
          />
        ) : (
          <View className="w-16 h-16 items-center justify-center bg-muted">
            <Ionicons name={icon} size={22} color="#BDBDBD" />
          </View>
        )}
        <View className="flex-1 px-3 py-2">
          <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>
            {title}
          </Text>
          <Text className="text-xs text-muted-foreground mt-0.5">{subtitle}</Text>
          {badge && (
            <Badge variant={badgeVariant ?? "outline"} className="mt-1 self-start">
              <Text>{badge}</Text>
            </Badge>
          )}
        </View>
        <Pressable className="p-3 active:opacity-60" onPress={onDelete}>
          <Ionicons name="trash-outline" size={18} color="#d32f2f" />
        </Pressable>
      </Pressable>
    </Card>
  );
}

export default function ProfileScreen() {
  const { user, token, logout } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [listings, setListings] = useState<ListingItem[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [activeTab, setActiveTab] = useState("listings");
  const [loading, setLoading] = useState(true);

  // Edit dialog
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
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [user, token]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const handleLogout = () => {
    confirmAction("Log Out", "Are you sure you want to log out?", async () => {
      await logout();
      router.replace("/");
    });
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
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  const deleteListing = (id: string) =>
    confirmAction("Delete Listing", "This cannot be undone.", async () => {
      await fetch(API.listing(id), { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      setListings((p) => p.filter((l) => l.id !== id));
    });

  const deleteService = (id: string) =>
    confirmAction("Delete Service", "This cannot be undone.", async () => {
      await fetch(API.service(id), { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      setServices((p) => p.filter((s) => s.id !== id));
    });

  const deleteEvent = (id: string) =>
    confirmAction("Delete Event", "This cannot be undone.", async () => {
      await fetch(API.event(id), { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      setEvents((p) => p.filter((e) => e.id !== id));
    });

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#212121" />
        </View>
      </SafeAreaView>
    );
  }

  const memberSince = profile
    ? new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "";

  const initials = (profile?.name ?? user?.name ?? "?")
    .split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      {/* Header bar */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-card border-b border-border">
        <Pressable onPress={() => router.back()} className="flex-row items-center gap-1">
          <Ionicons name="chevron-back" size={20} color="#212121" />
          <Text className="text-sm font-semibold text-foreground">Back</Text>
        </Pressable>
        <Text className="text-base font-bold text-foreground">Profile</Text>
        <Pressable onPress={() => {
          setEditName(profile?.name ?? user?.name ?? "");
          setEditBio(profile?.bio ?? "");
          setEditOpen(true);
        }}>
          <Ionicons name="create-outline" size={20} color="#212121" />
        </Pressable>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Cover photo */}
        <View className="h-36 bg-muted">
          {profile?.cover_url && (
            <Image
              source={{ uri: API.mediaUrl(profile.cover_url) }}
              className="w-full h-36"
              resizeMode="cover"
            />
          )}
        </View>

        {/* Avatar + Info */}
        <View className="items-center -mt-12 px-4 pb-4">
          <Avatar alt={profile?.name ?? "Profile"} className="h-24 w-24 border-4 border-card">
            {profile?.avatar_url ? (
              <AvatarImage source={{ uri: API.mediaUrl(profile.avatar_url) }} />
            ) : null}
            <AvatarFallback className="bg-primary">
              <Text className="text-2xl font-bold text-primary-foreground">{initials}</Text>
            </AvatarFallback>
          </Avatar>

          <Text className="text-xl font-bold text-foreground mt-3">
            {profile?.name ?? user?.name}
          </Text>

          <View className="flex-row items-center gap-1.5 mt-1">
            <Ionicons name="shield-checkmark" size={14} color="#2e7d32" />
            <Text className="text-sm text-muted-foreground">{user?.email}</Text>
          </View>

          {profile?.bio ? (
            <Text className="text-sm text-muted-foreground text-center mt-2 px-6 leading-5">
              {profile.bio}
            </Text>
          ) : null}

          {/* Stats row */}
          <View className="flex-row items-center mt-4">
            <StatBlock label="Listings" value={listings.length} />
            <Separator orientation="vertical" className="h-8" />
            <StatBlock label="Services" value={services.length} />
            <Separator orientation="vertical" className="h-8" />
            <StatBlock label="Events" value={events.length} />
            {profile && profile.rating_count > 0 && (
              <>
                <Separator orientation="vertical" className="h-8" />
                <StatBlock
                  label="Rating"
                  value={`${profile.rating_avg.toFixed(1)} (${profile.rating_count})`}
                />
              </>
            )}
          </View>

          <Text className="text-xs text-muted-foreground mt-3">
            Member since {memberSince}
          </Text>
        </View>

        <Separator />

        {/* Tabs section */}
        <View className="px-4 pt-4 pb-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="listings">
                <Text>Listings</Text>
              </TabsTrigger>
              <TabsTrigger value="services">
                <Text>Services</Text>
              </TabsTrigger>
              <TabsTrigger value="events">
                <Text>Events</Text>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="listings">
              {listings.length === 0 ? (
                <EmptyState icon="pricetag-outline" label="No listings yet" />
              ) : (
                listings.map((item) => (
                  <ItemRow
                    key={item.id}
                    imageUrl={item.image_url}
                    title={item.title}
                    subtitle={item.is_free ? "Free" : item.price != null ? `$${item.price}` : "—"}
                    badge={item.status === "sold" ? "SOLD" : undefined}
                    badgeVariant="destructive"
                    icon="image-outline"
                    onPress={() => router.push(`/listing/${item.id}`)}
                    onDelete={() => deleteListing(item.id)}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="services">
              {services.length === 0 ? (
                <EmptyState icon="construct-outline" label="No services yet" />
              ) : (
                services.map((item) => (
                  <ItemRow
                    key={item.id}
                    imageUrl={item.image_url}
                    title={item.title}
                    subtitle={
                      item.price != null
                        ? `$${item.price}${item.price_type === "hourly" ? "/hr" : ""}`
                        : "Free"
                    }
                    icon="construct-outline"
                    onPress={() => router.push(`/service/${item.id}`)}
                    onDelete={() => deleteService(item.id)}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="events">
              {events.length === 0 ? (
                <EmptyState icon="calendar-outline" label="No events yet" />
              ) : (
                events.map((item) => (
                  <ItemRow
                    key={item.id}
                    imageUrl={item.image_url}
                    title={item.title}
                    subtitle={
                      item.is_free
                        ? "Free"
                        : item.ticket_price != null
                        ? `$${item.ticket_price}`
                        : "Paid"
                    }
                    badge={new Date(item.starts_at).toLocaleDateString("en-US", {
                      month: "short", day: "numeric",
                    })}
                    badgeVariant="secondary"
                    icon="calendar-outline"
                    onPress={() => router.push(`/event/${item.id}`)}
                    onDelete={() => deleteEvent(item.id)}
                  />
                ))
              )}
            </TabsContent>
          </Tabs>
        </View>

        {/* Logout */}
        <View className="px-4 pb-10">
          <Button variant="outline" className="border-destructive" onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={16} color="#d32f2f" />
            <Text className="text-destructive font-semibold ml-2">Log Out</Text>
          </Button>
        </View>
      </ScrollView>

      {/* Edit Profile Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
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
              <Text>{saving ? "Saving..." : "Save"}</Text>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SafeAreaView>
  );
}

function EmptyState({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View className="items-center py-12">
      <View className="w-14 h-14 rounded-full bg-muted items-center justify-center mb-3">
        <Ionicons name={icon} size={24} color="#BDBDBD" />
      </View>
      <Text className="text-sm text-muted-foreground">{label}</Text>
    </View>
  );
}
