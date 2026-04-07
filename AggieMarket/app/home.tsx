import { useEffect, useRef, useState, useCallback, memo } from "react";
import {
  View, Pressable, ScrollView,
  Modal, Switch, ActivityIndicator, Animated, useWindowDimensions, Image,
} from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
// @ts-ignore
import DatePicker from "react-datepicker";
import { colors } from "../theme/colors";
import { useAuth } from "../context/AuthContext";
import { API } from "../constants/api";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

// ─── Types ───────────────────────────────────────────────────────────────────

type Listing = {
  id: string;
  title: string;
  price: number | null;
  is_free: number;
  category: string;
  condition: string | null;
  created_at: string;
  image_url: string | null;
  seller_name: string | null;
};

type Service = {
  id: string;
  title: string;
  description: string;
  price: number | null;
  price_type: string | null;
  category: string;
  availability: string | null;
  image_url: string | null;
  provider_name: string | null;
};

type Event = {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  starts_at: string;
  ends_at: string | null;
  is_free: number;
  ticket_price: number | null;
  image_url: string | null;
  organizer_name: string | null;
};

type TabType = "listing" | "service" | "event";
type PostType = "listing" | "service" | "event";

type PostForm = {
  title: string;
  description: string;
  categories: string[];
  condition: string;
  price: string;
  isFree: boolean;
  priceType: string;
  availability: string;
  location: string;
  startsAt: Date | null;
  endsAt: Date | null;
  eventFree: boolean;
  ticketPrice: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const CONDITIONS = ["New", "Like New", "Good", "Fair", "For Parts"];
const LISTING_CATEGORIES = ["Textbooks", "Furniture", "Electronics", "Clothing", "Other"];
const SERVICE_CATEGORIES = ["Tutoring", "Design", "Tech", "Writing", "Music", "Other"];
const EVENT_CATEGORIES = ["Academic", "Social", "Career", "Sports", "Other"];
const PRICE_TYPES = ["hourly", "flat", "starting_at"];

const EMPTY_FORM: PostForm = {
  title: "", description: "", categories: [],
  condition: "Good", price: "", isFree: false,
  priceType: "hourly", availability: "",
  location: "", startsAt: null, endsAt: null,
  eventFree: true, ticketPrice: "",
};

const TAB_LABELS: { key: TabType; label: string }[] = [
  { key: "listing", label: "Listings" },
  { key: "service", label: "Services" },
  { key: "event", label: "Events" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function priceLabel(price: number | null, price_type: string | null) {
  if (price == null) return "Free";
  const suffix = price_type === "hourly" ? "/hr" : price_type === "starting_at" ? "+" : "";
  return `$${price}${suffix}`;
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ message, visible }: { message: string; visible: boolean }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start(() => {
        setTimeout(() => {
          Animated.parallel([
            Animated.timing(opacity, { toValue: 0, duration: 280, useNativeDriver: true }),
            Animated.timing(translateY, { toValue: 16, duration: 280, useNativeDriver: true }),
          ]).start();
        }, 1800);
      });
    }
  }, [visible]);

  return (
    <Animated.View
      style={{
        position: "absolute", bottom: 32, alignSelf: "center",
        backgroundColor: colors.ink, paddingHorizontal: 22, paddingVertical: 12,
        borderRadius: 100, shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12,
        opacity, transform: [{ translateY }],
      }}
      pointerEvents="none"
    >
      <Text className="text-primary-foreground text-[13px] font-semibold">{"✓  "}{message}</Text>
    </Animated.View>
  );
}

// ─── Cards ────────────────────────────────────────────────────────────────────

const ListingCard = memo(function ListingCard({ item }: { item: Listing }) {
  const router = useRouter();
  const [hovered, setHovered] = useState(false);
  const label = item.is_free ? "Free" : item.price != null ? `$${item.price}` : "\u2014";

  return (
    <Pressable
      onPress={() => router.push(`/listing/${item.id}`)}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
    >
      <Card
        className="overflow-hidden"
        style={{
          transitionDuration: "200ms",
          transitionProperty: "box-shadow, border-color",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: hovered ? 8 : 2 },
          shadowOpacity: hovered ? 0.15 : 0.06,
          shadowRadius: hovered ? 20 : 8,
          borderColor: hovered ? "#8C0B42" : undefined,
        } as any}
      >
        {item.image_url ? (
          <Image
            source={{ uri: API.mediaUrl(item.image_url!) }}
            style={{ width: "100%" as any, height: 208, borderTopLeftRadius: 12, borderTopRightRadius: 12 }}
            resizeMode="cover"
          />
        ) : (
          <View className="w-full items-center justify-center border-b border-border" style={{ height: 208, backgroundColor: "#FDF2F6" }}>
            <Ionicons name="image-outline" size={40} color="#8C0B42" style={{ opacity: 0.3 }} />
          </View>
        )}
        <CardContent className="p-4 gap-2">
          <Text className="text-sm font-bold text-foreground font-display leading-[19px]" numberOfLines={2}>{item.title}</Text>
          {item.seller_name && (
            <Text className="text-xs text-muted-foreground mt-0.5">by {item.seller_name}</Text>
          )}
          <Text className="text-xl font-extrabold font-display tracking-tight" style={{ color: item.is_free ? "#2e7d32" : "#8C0B42" }}>{label}</Text>
          <View className="flex-row gap-1.5 mt-1 flex-wrap">
            {item.condition && (
              <Badge variant="outline" className="px-2 py-0.5 rounded">
                <Text className="text-[10px] font-medium">{item.condition}</Text>
              </Badge>
            )}
            <Badge className="px-2 py-0.5 rounded" style={{ backgroundColor: "#FDF2F6", borderColor: "#F9C9DB", borderWidth: 1 }}>
              <Text className="text-[10px] font-medium" style={{ color: "#5E072D" }}>{item.category}</Text>
            </Badge>
          </View>
        </CardContent>
      </Card>
    </Pressable>
  );
});

const ServiceCard = memo(function ServiceCard({ item }: { item: Service }) {
  const router = useRouter();
  const [hovered, setHovered] = useState(false);
  const label = priceLabel(item.price, item.price_type);
  const cats = item.category.split(",").map((c) => c.trim()).filter(Boolean);

  return (
    <Pressable
      onPress={() => router.push(`/service/${item.id}`)}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
    >
      <Card
        className="overflow-hidden"
        style={{
          transitionDuration: "200ms",
          transitionProperty: "box-shadow, border-color",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: hovered ? 8 : 2 },
          shadowOpacity: hovered ? 0.15 : 0.06,
          shadowRadius: hovered ? 20 : 8,
          borderColor: hovered ? "#8C0B42" : undefined,
        } as any}
      >
        {item.image_url ? (
          <Image
            source={{ uri: API.mediaUrl(item.image_url!) }}
            style={{ width: "100%" as any, height: 208, borderTopLeftRadius: 12, borderTopRightRadius: 12 }}
            resizeMode="cover"
          />
        ) : (
          <View className="w-full items-center justify-center border-b border-border" style={{ height: 208, backgroundColor: "#FDF2F6" }}>
            <Ionicons name="construct-outline" size={40} color="#8C0B42" style={{ opacity: 0.3 }} />
          </View>
        )}
        <CardContent className="p-4 gap-2">
          <Text className="text-sm font-bold text-foreground font-display leading-[19px]" numberOfLines={2}>{item.title}</Text>
          {item.provider_name && (
            <Text className="text-xs text-muted-foreground mt-0.5">by {item.provider_name}</Text>
          )}
          <Text className="text-xl font-extrabold font-display tracking-tight" style={{ color: "#8C0B42" }}>{label}</Text>
          {item.availability ? (
            <Text className="text-xs text-muted-foreground mt-0.5" numberOfLines={1}>{"\u23f0 "}{item.availability}</Text>
          ) : null}
          <View className="flex-row gap-1.5 mt-1 flex-wrap">
            {cats.map((c) => (
              <Badge key={c} className="px-2 py-0.5 rounded" style={{ backgroundColor: "#FDF2F6", borderColor: "#F9C9DB", borderWidth: 1 }}>
                <Text className="text-[10px] font-medium" style={{ color: "#5E072D" }}>{c}</Text>
              </Badge>
            ))}
          </View>
        </CardContent>
      </Card>
    </Pressable>
  );
});

const EventCard = memo(function EventCard({ item }: { item: Event }) {
  const router = useRouter();
  const [hovered, setHovered] = useState(false);
  const ticketLabel = item.is_free ? "Free" : item.ticket_price != null ? `$${item.ticket_price}` : "Paid";
  const cats = item.category.split(",").map((c) => c.trim()).filter(Boolean);

  return (
    <Pressable
      onPress={() => router.push(`/event/${item.id}`)}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
    >
      <Card
        className="overflow-hidden"
        style={{
          transitionDuration: "200ms",
          transitionProperty: "box-shadow, border-color",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: hovered ? 8 : 2 },
          shadowOpacity: hovered ? 0.15 : 0.06,
          shadowRadius: hovered ? 20 : 8,
          borderColor: hovered ? "#8C0B42" : undefined,
        } as any}
      >
        {item.image_url ? (
          <Image
            source={{ uri: API.mediaUrl(item.image_url!) }}
            style={{ width: "100%" as any, height: 208, borderTopLeftRadius: 12, borderTopRightRadius: 12 }}
            resizeMode="cover"
          />
        ) : (
          <View className="w-full items-center justify-center border-b border-border" style={{ height: 208, backgroundColor: "#FDF2F6" }}>
            <Ionicons name="calendar-outline" size={40} color="#8C0B42" style={{ opacity: 0.3 }} />
          </View>
        )}
        <CardContent className="p-4 gap-2">
          <Text className="text-sm font-bold text-foreground font-display leading-[19px]" numberOfLines={2}>{item.title}</Text>
          {item.organizer_name && (
            <Text className="text-xs text-muted-foreground mt-0.5">by {item.organizer_name}</Text>
          )}
          <Text className="text-xs text-muted-foreground mt-0.5">{"\ud83d\udccd "}{item.location}</Text>
          <Text className="text-xs text-muted-foreground mt-0.5">{"\ud83d\uddd3 "}{formatDate(item.starts_at)}</Text>
          <View className="flex-row gap-1.5 mt-1 flex-wrap">
            <Badge
              variant={item.is_free ? "success" : "outline"}
              style={!item.is_free ? { backgroundColor: "#fff8e1", borderColor: "#fff8e1" } : undefined}
            >
              <Text className={`text-[10px] font-medium ${item.is_free ? "text-green-800" : "text-yellow-800"}`}>{ticketLabel}</Text>
            </Badge>
            {cats.map((c) => (
              <Badge key={c} className="px-2 py-0.5 rounded" style={{ backgroundColor: "#FDF2F6", borderColor: "#F9C9DB", borderWidth: 1 }}>
                <Text className="text-[10px] font-medium" style={{ color: "#5E072D" }}>{c}</Text>
              </Badge>
            ))}
          </View>
        </CardContent>
      </Card>
    </Pressable>
  );
});

// ─── Create Post Modal ────────────────────────────────────────────────────────

function CreatePostModal({
  visible, onClose, onSaved, token,
}: {
  visible: boolean; onClose: () => void; onSaved: (type: PostType) => void; token: string | null;
}) {
  const [postType, setPostType] = useState<PostType>("listing");
  const [form, setForm] = useState<PostForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [images, setImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  function set<K extends keyof PostForm>(key: K, value: PostForm[K]) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  function switchType(t: PostType) {
    setPostType(t);
    setForm({ ...EMPTY_FORM, title: form.title, description: form.description });
    setError("");
  }

  async function pickImages() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 8,
    });
    if (!result.canceled) {
      setImages((prev) => [...prev, ...result.assets].slice(0, 8));
    }
  }

  async function uploadImages(postId: string, attachUrl: string) {
    for (let i = 0; i < images.length; i++) {
      const asset = images[i];
      const formData = new FormData();
      const filename = asset.fileName ?? `photo_${i}.jpg`;
      const type = asset.mimeType ?? "image/jpeg";
      // On web expo-image-picker gives us the real File object via asset.file
      const fileObj: File | null = (asset as any).file ?? null;
      if (fileObj) {
        formData.append("file", fileObj, filename);
      } else {
        formData.append("file", { uri: asset.uri, name: filename, type } as any);
      }

      const uploadRes = await fetch(API.upload, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const uploadData = await uploadRes.json();
      if (uploadData.url) {
        await fetch(attachUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ url: uploadData.url, sort_order: i }),
        });
      }
    }
  }

  function numericOnly(raw: string) {
    return raw.replace(/[^0-9.]/g, "");
  }

  const categories =
    postType === "listing" ? LISTING_CATEGORIES :
    postType === "service" ? SERVICE_CATEGORIES :
    EVENT_CATEGORIES;

  async function submit() {
    setError("");
    if (!form.title.trim()) { setError("Title is required."); return; }
    if (!form.categories.length) { setError("Please select at least one category."); return; }
    if (!token) { setError("You must be logged in."); return; }

    let body: Record<string, any> = {
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.categories.join(","),
    };
    let url = API.listings;

    if (postType === "listing") {
      if (!form.isFree) {
        const n = parseFloat(form.price);
        if (!form.price || isNaN(n) || n < 0) { setError("Enter a valid price or mark as free."); return; }
      }
      body = { ...body, condition: form.condition, price: form.isFree ? null : parseFloat(form.price), is_free: form.isFree };
    } else if (postType === "service") {
      body = { ...body, price: form.price ? parseFloat(form.price) : null, price_type: form.priceType, availability: form.availability.trim() || null };
      url = API.services;
    } else {
      if (!form.startsAt) { setError("Start date is required."); return; }
      if (!form.location.trim()) { setError("Location is required."); return; }
      body = {
        ...body,
        location: form.location.trim(),
        starts_at: form.startsAt.toISOString(),
        ends_at: form.endsAt ? form.endsAt.toISOString() : null,
        is_free: form.eventFree,
        ticket_price: form.eventFree ? null : parseFloat(form.ticketPrice) || null,
      };
      url = API.events;
    }

    setSaving(true);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.status === 201) {
        const postId = data.listing?.id ?? data.service?.id ?? data.event?.id;
        if (postId && images.length > 0) {
          const attachUrl =
            postType === "listing" ? API.listingImages(postId) :
            postType === "service" ? API.serviceImages(postId) :
            API.eventImages(postId);
          await uploadImages(postId, attachUrl);
        }
        setForm(EMPTY_FORM);
        setImages([]);
        onClose();
        onSaved(postType);
      } else {
        setError(data.message || "Failed to post.");
      }
    } catch {
      setError("Could not connect to server.");
    } finally {
      setSaving(false);
    }
  }

  const typeLabels: { key: PostType; label: string }[] = [
    { key: "listing", label: "Listing" },
    { key: "service", label: "Service" },
    { key: "event", label: "Event" },
  ];

  return (
    <Dialog open={visible} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="w-[480px] max-w-[480px] p-0">
        <DialogHeader className="flex-row justify-between items-center px-6 py-4 border-b border-border mb-0">
          <DialogTitle>
            <Text className="text-base font-bold text-foreground">New Post</Text>
          </DialogTitle>
          <Pressable onPress={onClose} disabled={saving}>
            <Text className="text-base text-muted-foreground font-light">{"\u2715"}</Text>
          </Pressable>
        </DialogHeader>

        <View className="flex-row px-6 py-3 gap-2 border-b border-border">
          {typeLabels.map(({ key, label }) => (
            <Button
              key={key}
              variant={postType === key ? "default" : "outline"}
              size="sm"
              className="flex-1"
              onPress={() => switchType(key)}
              disabled={saving}
            >
              <Text className={postType === key ? "text-[13px] font-semibold text-primary-foreground" : "text-[13px] font-semibold text-muted-foreground"}>{label}</Text>
            </Button>
          ))}
        </View>

        <ScrollView className="px-6 pt-1 pb-6" showsVerticalScrollIndicator={false}>
          <Text className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase mt-4 mb-1.5">Photos</Text>
          <View className="flex-row flex-wrap gap-2">
            {images.map((img, i) => (
              <Pressable
                key={i}
                className="w-[72px] h-[72px] rounded-lg overflow-hidden relative"
                onPress={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                disabled={saving}
              >
                <Image source={{ uri: img.uri }} style={{ width: 72, height: 72 }} />
                <View className="absolute top-0 right-0 w-5 h-5 bg-black/55 rounded-bl-md items-center justify-center">
                  <Text className="text-primary-foreground text-[11px] font-bold">{"\u2715"}</Text>
                </View>
              </Pressable>
            ))}
            {images.length < 8 && (
              <Pressable
                className="w-[72px] h-[72px] rounded-lg border-[1.5px] border-dashed border-muted-foreground bg-background items-center justify-center gap-1"
                onPress={pickImages}
                disabled={saving}
              >
                <Text className="text-xl text-muted-foreground leading-[22px]">+</Text>
                <Text className="text-[9px] text-muted-foreground tracking-wide">Add photo</Text>
              </Pressable>
            )}
          </View>

          <Text className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase mt-4 mb-1.5">Title *</Text>
          <Input
            placeholder={postType === "listing" ? "e.g. Calc Textbook" : postType === "service" ? "e.g. Math Tutoring" : "e.g. Spring Career Fair"}
            value={form.title}
            onChangeText={(v) => set("title", v)}
            editable={!saving}
            className="text-sm"
            style={{ outlineStyle: "none" } as any}
          />

          <Text className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase mt-4 mb-1.5">Description</Text>
          <Input
            placeholder={postType === "event" ? "What's this event about?" : "Describe it\u2026"}
            value={form.description}
            onChangeText={(v) => set("description", v)}
            multiline
            editable={!saving}
            className="text-sm"
            style={{ minHeight: 80, textAlignVertical: "top", outlineStyle: "none" } as any}
          />

          <Text className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase mt-4 mb-1.5">Category</Text>
          <View className="flex-row flex-wrap gap-2">
            {categories.map((c) => (
              <Pressable
                key={c}
                className={`px-3 py-1.5 rounded-full border-[1.5px] ${form.categories.includes(c) ? "bg-primary border-primary" : "border-border"}`}
                onPress={() => {
                  const next = form.categories.includes(c)
                    ? form.categories.filter((x) => x !== c)
                    : [...form.categories, c];
                  set("categories", next);
                }}
              >
                <Text className={`text-xs ${form.categories.includes(c) ? "text-primary-foreground font-semibold" : "text-foreground"}`}>{c}</Text>
              </Pressable>
            ))}
          </View>

          {postType === "listing" && (
            <>
              <Text className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase mt-4 mb-1.5">Condition</Text>
              <View className="flex-row flex-wrap gap-2">
                {CONDITIONS.map((c) => (
                  <Pressable
                    key={c}
                    className={`px-3 py-1.5 rounded-full border-[1.5px] ${form.condition === c ? "bg-primary border-primary" : "border-border"}`}
                    onPress={() => set("condition", c)}
                  >
                    <Text className={`text-xs ${form.condition === c ? "text-primary-foreground font-semibold" : "text-foreground"}`}>{c}</Text>
                  </Pressable>
                ))}
              </View>
              <View className="flex-row justify-between items-center mt-4">
                <Text className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase">Free item</Text>
                <Switch value={form.isFree} onValueChange={(v) => set("isFree", v)} disabled={saving} />
              </View>
              {!form.isFree && (
                <>
                  <Text className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase mt-4 mb-1.5">Price *</Text>
                  <Input
                    placeholder="25.00"
                    value={form.price}
                    onChangeText={(v) => set("price", numericOnly(v))}
                    keyboardType="decimal-pad"
                    editable={!saving}
                    className="text-sm"
                    style={{ outlineStyle: "none" } as any}
                  />
                </>
              )}
            </>
          )}

          {postType === "service" && (
            <>
              <Text className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase mt-4 mb-1.5">Price Type</Text>
              <View className="flex-row flex-wrap gap-2">
                {PRICE_TYPES.map((pt) => (
                  <Pressable
                    key={pt}
                    className={`px-3 py-1.5 rounded-full border-[1.5px] ${form.priceType === pt ? "bg-primary border-primary" : "border-border"}`}
                    onPress={() => set("priceType", pt)}
                  >
                    <Text className={`text-xs ${form.priceType === pt ? "text-primary-foreground font-semibold" : "text-foreground"}`}>
                      {pt === "starting_at" ? "Starting at" : pt.charAt(0).toUpperCase() + pt.slice(1)}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Text className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase mt-4 mb-1.5">Price</Text>
              <Input
                placeholder="20.00"
                value={form.price}
                onChangeText={(v) => set("price", numericOnly(v))}
                keyboardType="decimal-pad"
                editable={!saving}
                className="text-sm"
                style={{ outlineStyle: "none" } as any}
              />
              <Text className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase mt-4 mb-1.5">Availability</Text>
              <Input
                placeholder="e.g. Weekends, MTTh 4\u20136pm"
                value={form.availability}
                onChangeText={(v) => set("availability", v)}
                editable={!saving}
                className="text-sm"
                style={{ outlineStyle: "none" } as any}
              />
            </>
          )}

          {postType === "event" && (
            <>
              <Text className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase mt-4 mb-1.5">Location *</Text>
              <Input
                placeholder="e.g. Corbett Center, Room 203"
                value={form.location}
                onChangeText={(v) => set("location", v)}
                editable={!saving}
                className="text-sm"
                style={{ outlineStyle: "none" } as any}
              />

              <Text className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase mt-4 mb-1.5">Start Date & Time *</Text>
              {mounted && (
                <DatePicker
                  selected={form.startsAt}
                  onChange={(date: Date | null) => set("startsAt", date)}
                  selectsStart
                  startDate={form.startsAt}
                  endDate={form.endsAt}
                  showTimeSelect
                  timeIntervals={15}
                  dateFormat="MMM d, yyyy h:mm aa"
                  placeholderText="Select start date & time"
                  disabled={saving}
                  className="am-datepicker"
                  withPortal
                  portalId="datepicker-portal"
                />
              )}

              <Text className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase mt-4 mb-1.5">End Date & Time</Text>
              {mounted && (
                <DatePicker
                  selected={form.endsAt}
                  onChange={(date: Date | null) => set("endsAt", date)}
                  selectsEnd
                  startDate={form.startsAt}
                  endDate={form.endsAt}
                  minDate={form.startsAt ?? undefined}
                  showTimeSelect
                  timeIntervals={15}
                  dateFormat="MMM d, yyyy h:mm aa"
                  placeholderText="Select end date & time (optional)"
                  disabled={saving}
                  className="am-datepicker"
                  withPortal
                  portalId="datepicker-portal"
                />
              )}
              <View className="flex-row justify-between items-center mt-4">
                <Text className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase">Free event</Text>
                <Switch value={form.eventFree} onValueChange={(v) => set("eventFree", v)} disabled={saving} />
              </View>
              {!form.eventFree && (
                <>
                  <Text className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase mt-4 mb-1.5">Ticket Price *</Text>
                  <Input
                    placeholder="10.00"
                    value={form.ticketPrice}
                    onChangeText={(v) => set("ticketPrice", numericOnly(v))}
                    keyboardType="decimal-pad"
                    editable={!saving}
                    className="text-sm"
                    style={{ outlineStyle: "none" } as any}
                  />
                </>
              )}
            </>
          )}

          {error ? <Text className="text-xs text-destructive mt-3">{error}</Text> : null}

          <Button
            className="mt-5 rounded-[10px]"
            onPress={submit}
            disabled={saving}
            style={saving ? { opacity: 0.5 } : undefined}
          >
            {saving
              ? <ActivityIndicator color={colors.white} size="small" />
              : <Text className="text-sm font-bold text-primary-foreground">Post {postType.charAt(0).toUpperCase() + postType.slice(1)}</Text>
            }
          </Button>
        </ScrollView>
      </DialogContent>
    </Dialog>
  );
}

// ─── Home Screen ──────────────────────────────────────────────────────────────

export default function HomeWebScreen() {
  const { user, token } = useAuth();
  const { width } = useWindowDimensions();
  const router = useRouter();

  const [listings, setListings] = useState<Listing[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>("listing");
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeCondition, setActiveCondition] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("Posted!");
  const [searchFocused, setSearchFocused] = useState(false);

  const fetchListings = useCallback(() => {
    fetch(API.listings)
      .then((r) => r.json())
      .then((d) => { if (d.listings) setListings(d.listings); })
      .catch(() => {});
  }, []);

  const fetchServices = useCallback(() => {
    if (!token) return;
    fetch(API.services, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { if (d.services) setServices(d.services); })
      .catch(() => {});
  }, [token]);

  const fetchEvents = useCallback(() => {
    if (!token) return;
    fetch(API.events, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { if (d.events) setEvents(d.events); })
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    fetchListings();
    fetchServices();
    fetchEvents();
  }, [fetchListings, fetchServices, fetchEvents]);

  const switchTab = useCallback((tab: TabType) => {
    setActiveTab(tab);
    setActiveCategory(null);
    setActiveCondition(null);
    setQuery("");
  }, []);

  const closeModal = useCallback(() => setModalVisible(false), []);

  const handleSaved = useCallback((type: PostType) => {
    fetchListings();
    fetchServices();
    fetchEvents();
    setToastMessage(type === "listing" ? "Listing posted!" : type === "service" ? "Service posted!" : "Event posted!");
    setToastVisible(false);
    setTimeout(() => setToastVisible(true), 50);
  }, [fetchListings, fetchServices, fetchEvents]);

  // Filtered data per tab
  function matchesCat(category: string, filter: string | null) {
    if (!filter) return true;
    return category.split(",").some((c) => c.trim().toLowerCase() === filter.toLowerCase());
  }

  const filteredListings = listings.filter((l) => {
    const matchQ = !query || l.title.toLowerCase().includes(query.toLowerCase());
    return matchQ && matchesCat(l.category, activeCategory) && (!activeCondition || l.condition === activeCondition);
  });

  const filteredServices = services.filter((s) => {
    const matchQ = !query || s.title.toLowerCase().includes(query.toLowerCase());
    return matchQ && matchesCat(s.category, activeCategory);
  });

  const filteredEvents = events.filter((e) => {
    const matchQ = !query || e.title.toLowerCase().includes(query.toLowerCase());
    return matchQ && matchesCat(e.category, activeCategory);
  });

  const currentCategories =
    activeTab === "listing" ? LISTING_CATEGORIES :
    activeTab === "service" ? SERVICE_CATEGORIES :
    EVENT_CATEGORIES;

  const currentCount =
    activeTab === "listing" ? filteredListings.length :
    activeTab === "service" ? filteredServices.length :
    filteredEvents.length;

  const isMobile = width < 768;
  const SIDEBAR = isMobile ? 0 : 220;
  const contentWidth = Math.min(width - (isMobile ? 16 : 48), 1280);
  const gridCols = isMobile ? (width < 480 ? 1 : 2) : 3;

  const tabPlaceholder =
    activeTab === "listing" ? "Search listings\u2026" :
    activeTab === "service" ? "Search services\u2026" :
    "Search events\u2026";

  const emptyPostLabel =
    activeTab === "listing" ? "Post a Listing" :
    activeTab === "service" ? "Post a Service" :
    "Post an Event";

  const emptyNoResultMsg =
    activeTab === "listing" ? "No listings found" :
    activeTab === "service" ? "No services found" :
    "No events found";

  return (
    <View className="flex-1 bg-background">
      {/* ── Navbar ── */}
      <View
        className="bg-card border-b border-border h-[60px] justify-center z-[100]"
        style={{ position: "sticky" as any, top: 0, paddingHorizontal: isMobile ? 12 : 24 }}
      >
        <View className="flex-row items-center self-center w-full gap-3" style={{ maxWidth: contentWidth }}>
          <Pressable className="flex-row items-center gap-2 shrink-0" onPress={() => router.push("/home")}>
            <View className="bg-primary px-[7px] py-[3px] rounded">
              <Text className="text-primary-foreground text-[11px] font-extrabold tracking-wide">AM</Text>
            </View>
            {!isMobile && <Text className="text-base font-bold text-foreground tracking-tight font-display">Aggie Market</Text>}
          </Pressable>

          <View
            className={`flex-1 flex-row items-center bg-background border-[1.5px] rounded-lg px-3 h-[38px] gap-2 ${searchFocused ? "border-foreground" : "border-border"}`}
          >
            <Ionicons name="search-outline" size={16} color="#757575" />
            <Input
              className="flex-1 text-[13px] border-0 h-auto p-0"
              placeholder={isMobile ? "Search..." : tabPlaceholder}
              value={query}
              onChangeText={setQuery}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              style={{ outlineStyle: "none" } as any}
            />
          </View>

          <View className="flex-row items-center gap-2 shrink-0">
            {!isMobile && (
              <Pressable className="w-9 h-9 border-[1.5px] border-border rounded-lg items-center justify-center" onPress={() => router.push("/inbox")}>
                <Ionicons name="chatbubble-outline" size={16} color="#757575" />
              </Pressable>
            )}
            <Pressable className="w-9 h-9 border-[1.5px] border-border rounded-lg items-center justify-center" onPress={() => router.push("/profile")}>
              <Ionicons name="person-outline" size={16} color="#757575" />
            </Pressable>
            <Button size="sm" onPress={() => setModalVisible(true)}>
              <Text className="text-primary-foreground text-[13px] font-bold">{isMobile ? "+" : "+ New Post"}</Text>
            </Button>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* ── Banner ── */}
        <div className="banner-pattern" style={{ background: "linear-gradient(135deg, #8C0B42, #5E072D)" }}>
          <View className="px-6 py-6">
            <View className="self-center w-full flex-row items-center justify-between" style={{ maxWidth: contentWidth }}>
              <View className="flex-1 gap-1">
                <Text className="text-2xl font-bold text-primary-foreground tracking-tight font-display">
                  Marketplace
                </Text>
                <Text className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
                  {listings.length} listings · {services.length} services · {events.length} events
                </Text>
              </View>
            </View>
          </View>
        </div>

        {/* ── Tab Bar ── */}
        <View
          className="flex-row bg-card border-b border-border items-center gap-1 py-2"
          style={{ paddingHorizontal: Math.max(24, (width - contentWidth) / 2) }}
        >
          {TAB_LABELS.map(({ key, label }) => (
            <Pressable
              key={key}
              className={`px-4 py-2 rounded-full ${activeTab === key ? "" : ""}`}
              style={activeTab === key ? { backgroundColor: "#FDF2F6" } : undefined}
              onPress={() => switchTab(key)}
            >
              <Text
                className="text-sm font-semibold"
                style={{ color: activeTab === key ? "#8C0B42" : "#757575" }}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* ── Main Content ── */}
        <View className="flex-row pt-8 pb-12 gap-6 self-center w-full" style={{ maxWidth: contentWidth, paddingHorizontal: isMobile ? 12 : 24 }}>

          {/* Sidebar */}
          {!isMobile && <View className="shrink-0" style={{ width: SIDEBAR }}>
            <Text className="text-[10px] font-extrabold tracking-[1.5px] text-muted-foreground uppercase mb-3 mt-1">Categories</Text>
            <Pressable
              className="py-2.5 px-3 rounded-md mb-1"
              style={!activeCategory ? { backgroundColor: "#FDF2F6" } : undefined}
              onPress={() => setActiveCategory(null)}
            >
              <Text className="text-[13px] font-medium" style={{ color: !activeCategory ? "#8C0B42" : "#757575", fontWeight: !activeCategory ? "600" : "500" }}>All</Text>
            </Pressable>
            {currentCategories.map((c) => (
              <Pressable
                key={c}
                className="py-2.5 px-3 rounded-md mb-1"
                style={activeCategory === c ? { backgroundColor: "#FDF2F6" } : undefined}
                onPress={() => setActiveCategory(activeCategory === c ? null : c)}
              >
                <Text className="text-[13px] font-medium" style={{ color: activeCategory === c ? "#8C0B42" : "#757575", fontWeight: activeCategory === c ? "600" : "500" }}>{c}</Text>
              </Pressable>
            ))}

            {activeTab === "listing" && (
              <>
                <Separator className="my-5" />
                <Text className="text-[10px] font-extrabold tracking-[1.5px] text-muted-foreground uppercase mb-3 mt-1">Condition</Text>
                <Pressable
                  className="py-2.5 px-3 rounded-md mb-1"
                  style={!activeCondition ? { backgroundColor: "#FDF2F6" } : undefined}
                  onPress={() => setActiveCondition(null)}
                >
                  <Text className="text-[13px] font-medium" style={{ color: !activeCondition ? "#8C0B42" : "#757575", fontWeight: !activeCondition ? "600" : "500" }}>Any</Text>
                </Pressable>
                {CONDITIONS.map((c) => (
                  <Pressable
                    key={c}
                    className="py-2.5 px-3 rounded-md mb-1"
                    style={activeCondition === c ? { backgroundColor: "#FDF2F6" } : undefined}
                    onPress={() => setActiveCondition(activeCondition === c ? null : c)}
                  >
                    <Text className="text-[13px] font-medium" style={{ color: activeCondition === c ? "#8C0B42" : "#757575", fontWeight: activeCondition === c ? "600" : "500" }}>{c}</Text>
                  </Pressable>
                ))}
              </>
            )}
          </View>}

          {/* Grid */}
          <View className="flex-1 min-w-0">
            <View className="flex-row justify-between items-baseline mb-5 pb-4 border-b border-border">
              <Text className="text-xl font-bold text-foreground tracking-tight">
                {activeCategory ?? (activeTab === "listing" ? "All Listings" : activeTab === "service" ? "All Services" : "All Events")}
                {activeCondition ? ` \u00b7 ${activeCondition}` : ""}
              </Text>
              <Text className="text-[13px] text-muted-foreground">{currentCount} result{currentCount !== 1 ? "s" : ""}</Text>
            </View>

            {currentCount === 0 ? (
              <View className="items-center py-20 gap-3">
                <Text className="text-[40px] text-border">{"\u25ce"}</Text>
                <Text className="text-lg font-bold text-foreground">{emptyNoResultMsg}</Text>
                <Text className="text-sm text-muted-foreground">
                  {query ? `Nothing matches "${query}"` : "Be the first to post one."}
                </Text>
                <Button className="mt-2" onPress={() => setModalVisible(true)}>
                  <Text className="text-primary-foreground text-[13px] font-bold">{emptyPostLabel}</Text>
                </Button>
              </View>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${gridCols}, 1fr)`, gap: 16 }}>
                {activeTab === "listing" && filteredListings.map((item) => (
                  <ListingCard key={item.id} item={item} />
                ))}
                {activeTab === "service" && filteredServices.map((item) => (
                  <ServiceCard key={item.id} item={item} />
                ))}
                {activeTab === "event" && filteredEvents.map((item) => (
                  <EventCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </View>
        </View>

      </ScrollView>

      <Toast message={toastMessage} visible={toastVisible} />

      <CreatePostModal
        visible={modalVisible}
        onClose={closeModal}
        onSaved={handleSaved}
        token={token}
      />
    </View>
  );
}
