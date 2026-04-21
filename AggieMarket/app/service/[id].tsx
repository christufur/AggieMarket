import { useEffect, useState } from "react";
import { View, ScrollView, ActivityIndicator, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { useWebSocket } from "@/context/WebSocketContext";
import { API } from "@/constants/api";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { PRICE_TYPES, SERVICE_CATEGORIES } from "@/constants/categories";
import { colors } from "@/theme/colors";
import { priceLabel } from "@/lib/utils";

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
  provider_name: string | null;
  images: { url: string; sort_order: number }[];
};

export default function ServiceDetailScreenWeb() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user, token } = useAuth();
  const { unreadCount } = useWebSocket();
  const [service, setService] = useState<ServiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [imgIdx, setImgIdx] = useState(0);
  const [saved, setSaved] = useState(false);
  const [savedId, setSavedId] = useState<number | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(API.service(id))
      .then((r) => r.json())
      .then((data) => {
        if (data.service) setService(data.service);
        else setError("Service not found.");
      })
      .catch(() => setError("Could not load service."))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id || !token) return;
    fetch(`${API.savedCheck}?service_id=${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data) => { setSaved(data.saved); setSavedId(data.saved_id); });
  }, [id, token]);

  // Edit state
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editPriceType, setEditPriceType] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editAvailability, setEditAvailability] = useState("");
  const [saving, setSaving] = useState(false);

  const toggleSave = async () => {
    if (!token) return;
    if (saved && savedId) {
      await fetch(API.savedItem(savedId), { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      setSaved(false);
      setSavedId(null);
    } else {
      const res = await fetch(API.saved, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ service_id: id }),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.saved) { setSaved(true); setSavedId(data.saved.id); }
    }
  };

  const contactProvider = async () => {
    if (!token || !service) return;
    const res = await fetch(API.conversations, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ seller_id: service.provider_id, service_id: service.id }),
    });
    const data = await res.json();
    if (data.conversation) {
      router.push(`/inbox?conversation=${data.conversation.id}`);
    }
  };

  const openEdit = () => {
    if (!service) return;
    setEditTitle(service.title);
    setEditDescription(service.description);
    setEditPrice(service.price != null ? String(service.price) : "");
    setEditPriceType(service.price_type ?? "hourly");
    setEditCategory(service.category);
    setEditAvailability(service.availability ?? "");
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    if (!token || !service) return;
    setSaving(true);
    try {
      const res = await fetch(API.service(service.id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDescription.trim(),
          price: parseFloat(editPrice) || null,
          price_type: editPriceType,
          category: editCategory,
          availability: editAvailability.trim(),
        }),
      });
      const data = await res.json();
      if (data.service) {
        setService((prev) => prev ? { ...prev, ...data.service, images: prev.images } : prev);
        setEditOpen(false);
      }
    } finally { setSaving(false); }
  };

  if (loading) {
    return (
      <View
        className="flex-1 items-center justify-center bg-background"
        style={{ minHeight: "100vh" as any }}
      >
        <ActivityIndicator color={colors.ink} />
      </View>
    );
  }

  if (error || !service) {
    return (
      <View
        className="flex-1 items-center justify-center gap-3 bg-background"
        style={{ minHeight: "100vh" as any }}
      >
        <Text className="text-sm text-muted-foreground">
          {error || "Something went wrong."}
        </Text>
        <Button variant="outline" onPress={() => router.back()}>
          <Text>Go back</Text>
        </Button>
      </View>
    );
  }

  const categories = service.category
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
  const date = new Date(service.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const images = service.images ?? [];
  const isOwner = String(service.provider_id) === String(user?.id);

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ minHeight: "100vh" as any }}
    >
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
            <Text className="text-sm text-muted-foreground">Service</Text>
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

      <View
        className="px-6 py-8"
        style={{ maxWidth: 900, width: "100%", alignSelf: "center" }}
      >
        <View className="flex-row gap-8" style={{ flexWrap: "wrap" }}>
          {/* Image section */}
          <View style={{ width: "100%", maxWidth: 440, flexShrink: 0 }}>
            {images.length > 0 ? (
              <View>
                <div
                  style={{
                    width: "100%",
                    maxWidth: 440,
                    height: 400,
                    borderRadius: 12,
                    overflow: "hidden",
                    background: colors.bg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <img
                    src={API.mediaUrl(images[imgIdx].url)}
                    style={{
                      maxWidth: "100%",
                      maxHeight: "100%",
                      objectFit: "contain",
                    }}
                    alt={service.title}
                  />
                </div>
                {images.length > 1 && (
                  <View className="mt-3 flex-row gap-2">
                    {images.map((img, i) => (
                      <Pressable
                        key={i}
                        onPress={() => setImgIdx(i)}
                        style={{
                          width: 60,
                          height: 60,
                          borderRadius: 8,
                          overflow: "hidden",
                          borderWidth: i === imgIdx ? 2 : 1,
                          borderColor: i === imgIdx ? colors.primary : colors.border,
                        }}
                      >
                        <img
                          src={API.mediaUrl(img.url)}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                          alt=""
                        />
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            ) : (
              <View
                className="items-center justify-center rounded-lg bg-secondary"
                style={{ width: "100%", maxWidth: 440, height: 400 }}
              >
                <Text className="text-muted-foreground">No photo</Text>
              </View>
            )}
          </View>

          {/* Details section */}
          <View className="flex-1" style={{ minWidth: 280 }}>
            <Card>
              <CardHeader className="gap-3">
                <View className="flex-row items-start justify-between gap-3">
                  <CardTitle className="flex-1">
                    <Text>{service.title}</Text>
                  </CardTitle>
                  <View className="items-end">
                    <Text
                      className="font-bold text-foreground"
                      style={{ fontSize: 24 }}
                    >
                      {priceLabel(service.price, service.price_type)}
                    </Text>
                    {service.price_type && (
                      <Text className="text-xs text-muted-foreground">
                        {service.price_type === "hourly"
                          ? "Per hour"
                          : service.price_type === "flat"
                            ? "Flat rate"
                            : "Starting at"}
                      </Text>
                    )}
                  </View>
                </View>

                <View className="flex-row gap-2" style={{ flexWrap: "wrap" }}>
                  {categories.map((c) => (
                    <Badge key={c} variant="secondary">
                      <Text>{c}</Text>
                    </Badge>
                  ))}
                </View>
              </CardHeader>

              <Separator />

              <CardContent className="gap-4 pt-4">
                {service.provider_name && (
                  <Pressable className="flex-row items-center gap-2" onPress={() => router.push(`/user/${service.provider_id}`)}>
                    <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center" }}>
                      <Ionicons name="person" size={14} color={colors.primary} />
                    </View>
                    <Text className="text-sm font-semibold" style={{ color: colors.primary }}>{service.provider_name}</Text>
                  </Pressable>
                )}

                {service.availability && (
                  <View>
                    <Text className="mb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      Availability
                    </Text>
                    <Text className="text-sm text-foreground">
                      {service.availability}
                    </Text>
                  </View>
                )}

                <View>
                  <Text className="mb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Description
                  </Text>
                  <Text className="text-sm leading-relaxed text-foreground">
                    {service.description || "No description provided."}
                  </Text>
                </View>

                <Separator />

                <View className="flex-row justify-between">
                  <Text className="text-xs text-muted-foreground">
                    Posted {date}
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    {service.view_count} views
                  </Text>
                </View>

                {isOwner ? (
                  <View className="flex-row items-center gap-3 mt-2">
                    <Button variant="outline" className="flex-1" onPress={openEdit}>
                      <Ionicons name="create-outline" size={16} color={colors.ink} />
                      <Text className="ml-2 text-sm font-semibold text-foreground">Edit</Text>
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onPress={async () => {
                        if (!window.confirm("Are you sure you want to delete this service?")) return;
                        await fetch(API.service(service.id), {
                          method: "DELETE",
                          headers: { Authorization: `Bearer ${token}` },
                        });
                        router.back();
                      }}
                    >
                      <Ionicons name="trash-outline" size={16} color={colors.white} />
                      <Text className="ml-2 text-sm font-semibold text-destructive-foreground">Delete</Text>
                    </Button>
                  </View>
                ) : (
                  <View className="flex-row items-center gap-3 mt-2">
                    <Button className="flex-1" onPress={contactProvider}>
                      <Ionicons
                        name="chatbubble-outline"
                        size={16}
                        color={colors.white}
                      />
                      <Text className="ml-2 text-sm font-semibold text-primary-foreground">
                        Contact Provider
                      </Text>
                    </Button>
                    <Pressable onPress={toggleSave} style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" }}>
                      <Ionicons name={saved ? "heart" : "heart-outline"} size={22} color={colors.primary} />
                    </Pressable>
                  </View>
                )}
              </CardContent>
            </Card>
          </View>
        </View>
      </View>
      {/* Edit Service Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle><Text>Edit Service</Text></DialogTitle>
          </DialogHeader>
          <View className="gap-4">
            <View className="gap-1.5">
              <Text className="text-sm font-medium text-foreground">Title</Text>
              <Input value={editTitle} onChangeText={setEditTitle} placeholder="Service title" />
            </View>
            <View className="gap-1.5">
              <Text className="text-sm font-medium text-foreground">Description</Text>
              <Textarea value={editDescription} onChangeText={setEditDescription} placeholder="Describe your service..." numberOfLines={3} />
            </View>
            <View className="gap-1.5">
              <Text className="text-sm font-medium text-foreground">Price Type</Text>
              <View className="flex-row gap-2 flex-wrap">
                {PRICE_TYPES.map((pt) => (
                  <Pressable
                    key={pt}
                    onPress={() => setEditPriceType(pt)}
                    className="px-3 py-1.5 rounded-full border"
                    style={editPriceType === pt ? { backgroundColor: colors.primaryLight, borderColor: colors.primary } : { borderColor: colors.border }}
                  >
                    <Text className="text-xs font-semibold" style={{ color: editPriceType === pt ? colors.primary : colors.dark }}>
                      {pt === "hourly" ? "Hourly" : pt === "flat" ? "Flat Rate" : "Starting At"}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <View className="gap-1.5">
              <Text className="text-sm font-medium text-foreground">Price</Text>
              <Input value={editPrice} onChangeText={setEditPrice} placeholder="25.00" keyboardType="decimal-pad" />
            </View>
            <View className="gap-1.5">
              <Text className="text-sm font-medium text-foreground">Category</Text>
              <View className="flex-row gap-2 flex-wrap">
                {SERVICE_CATEGORIES.map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => setEditCategory(c)}
                    className="px-3 py-1.5 rounded-full border"
                    style={editCategory === c ? { backgroundColor: colors.primaryLight, borderColor: colors.primary } : { borderColor: colors.border }}
                  >
                    <Text className="text-xs font-semibold" style={{ color: editCategory === c ? colors.primary : colors.dark }}>{c}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <View className="gap-1.5">
              <Text className="text-sm font-medium text-foreground">Availability</Text>
              <Input value={editAvailability} onChangeText={setEditAvailability} placeholder="e.g., Weekends only, MTTh 4-6pm" />
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
    </ScrollView>
  );
}
