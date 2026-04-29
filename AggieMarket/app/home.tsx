import { useEffect, useRef, useState, useCallback, memo } from "react";
import {
  View, Pressable, ScrollView,
  Switch, ActivityIndicator, Animated, useWindowDimensions, Image, Platform, KeyboardAvoidingView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";

import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
// react-datepicker is web-only; lazy require so native bundles don't try to load react-dom.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const DatePicker: any = Platform.OS === "web" ? require("react-datepicker").default : null;
import { colors } from "../theme/colors";
import { useAuth } from "../context/AuthContext";
import { useWebSocket } from "../context/WebSocketContext";
import { API } from "../constants/api";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Avatar } from "@/components/ui/Avatar";
import { NavAvatar } from "@/components/ui/SiteHeader";
import { Chip } from "@/components/ui/Chip";
import { BottomNav } from "@/components/ui/BottomNav";

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
  externalLink: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

import { CONDITIONS, LISTING_CATEGORIES, SERVICE_CATEGORIES, EVENT_CATEGORIES, PRICE_TYPES } from "@/constants/categories";
import { priceLabel, fmtDate as formatDate } from "@/lib/utils";

const EMPTY_FORM: PostForm = {
  title: "", description: "", categories: [],
  condition: "Good", price: "", isFree: false,
  priceType: "hourly", availability: "",
  location: "", startsAt: null, endsAt: null,
  eventFree: true, ticketPrice: "", externalLink: "",
};

const TAB_LABELS: { key: TabType; label: string }[] = [
  { key: "listing", label: "Listings" },
  { key: "service", label: "Services" },
  { key: "event", label: "Events" },
];

// Mobile category icon strip config
const MOBILE_CATEGORIES = [
  { label: "All",       icon: "grid-outline"   as const, key: null        },
  { label: "Textbooks", icon: "book-outline"   as const, key: "Textbooks" },
  { label: "Tech",      icon: "laptop-outline" as const, key: "Tech"      },
  { label: "Furniture", icon: "home-outline"   as const, key: "Furniture" },
  { label: "Free",      icon: "leaf-outline"   as const, key: "Free"      },
  { label: "Tutors",    icon: "star-outline"   as const, key: "Tutoring"  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

function SkeletonCard() {
  return (
    <View style={{ borderRadius: 12, overflow: "hidden", backgroundColor: "#fff", borderWidth: 1, borderColor: colors.border }}>
      <View style={{ height: 208, backgroundColor: colors.bg }} />
      <View style={{ padding: 16, gap: 10 }}>
        <View style={{ height: 14, width: "70%", backgroundColor: colors.bg, borderRadius: 6 }} />
        <View style={{ height: 12, width: "40%", backgroundColor: colors.bg, borderRadius: 6 }} />
        <View style={{ height: 20, width: "30%", backgroundColor: colors.bg, borderRadius: 6 }} />
      </View>
    </View>
  );
}

const ListingCard = memo(function ListingCard({ item, compact }: { item: Listing; compact?: boolean }) {
  const router = useRouter();
  const [hovered, setHovered] = useState(false);
  const label = item.is_free ? "Free" : item.price != null ? `$${item.price}` : "\u2014";
  const imageHeight = compact ? 140 : 208;

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
          borderColor: hovered ? colors.primary : undefined,
        } as any}
      >
        <View style={{ position: "relative" }}>
          {item.image_url ? (
            <Image
              source={{ uri: API.mediaUrl(item.image_url!) }}
              style={{ width: "100%" as any, height: imageHeight, borderTopLeftRadius: 12, borderTopRightRadius: 12 }}
              resizeMode="cover"
            />
          ) : (
            <View className="w-full items-center justify-center border-b border-border" style={{ height: imageHeight, backgroundColor: colors.primaryLight, borderTopLeftRadius: 12, borderTopRightRadius: 12 }}>
              <Ionicons name="image-outline" size={40} color={colors.primary} style={{ opacity: 0.3 }} />
            </View>
          )}
          {/* FREE badge overlay */}
          {!!item.is_free && (
            <View style={{
              position: "absolute", top: 8, left: 8,
              backgroundColor: colors.success, borderRadius: 6,
              paddingHorizontal: 6, paddingVertical: 2,
            }}>
              <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>FREE</Text>
            </View>
          )}
        </View>
        <CardContent className="p-4 gap-2" style={compact ? { padding: 10 } : undefined}>
          <Text className="text-sm font-bold text-foreground font-display leading-[19px]" numberOfLines={2}>{item.title}</Text>
          {item.seller_name && !compact && (
            <Text className="text-xs text-muted-foreground mt-0.5">by {item.seller_name}</Text>
          )}
          <Text
            className="font-extrabold font-display tracking-tight"
            style={{ color: item.is_free ? colors.success : colors.primary, fontSize: compact ? 16 : 20 }}
          >
            {label}
          </Text>
          {!compact && (
            <View className="flex-row gap-1.5 mt-1 flex-wrap">
              {item.condition && (
                <Badge variant="outline" className="px-2 py-0.5 rounded">
                  <Text className="text-[10px] font-medium">{item.condition}</Text>
                </Badge>
              )}
              <Badge className="px-2 py-0.5 rounded" style={{ backgroundColor: colors.primaryLight, borderColor: colors.primaryBorder, borderWidth: 1 }}>
                <Text className="text-[10px] font-medium" style={{ color: "#5E072D" }}>{item.category}</Text>
              </Badge>
            </View>
          )}
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
          borderColor: hovered ? colors.primary : undefined,
        } as any}
      >
        {item.image_url ? (
          <Image
            source={{ uri: API.mediaUrl(item.image_url!) }}
            style={{ width: "100%" as any, height: 208, borderTopLeftRadius: 12, borderTopRightRadius: 12 }}
            resizeMode="cover"
          />
        ) : (
          <View className="w-full items-center justify-center border-b border-border" style={{ height: 208, backgroundColor: colors.primaryLight }}>
            <Ionicons name="construct-outline" size={40} color={colors.primary} style={{ opacity: 0.3 }} />
          </View>
        )}
        <CardContent className="p-4 gap-2">
          <Text className="text-sm font-bold text-foreground font-display leading-[19px]" numberOfLines={2}>{item.title}</Text>
          {item.provider_name && (
            <Text className="text-xs text-muted-foreground mt-0.5">by {item.provider_name}</Text>
          )}
          <Text className="text-xl font-extrabold font-display tracking-tight" style={{ color: colors.primary }}>{label}</Text>
          {item.availability ? (
            <Text className="text-xs text-muted-foreground mt-0.5" numberOfLines={1}>{"\u23f0 "}{item.availability}</Text>
          ) : null}
          <View className="flex-row gap-1.5 mt-1 flex-wrap">
            {cats.map((c) => (
              <Badge key={c} className="px-2 py-0.5 rounded" style={{ backgroundColor: colors.primaryLight, borderColor: colors.primaryBorder, borderWidth: 1 }}>
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
          borderColor: hovered ? colors.primary : undefined,
        } as any}
      >
        {item.image_url ? (
          <Image
            source={{ uri: API.mediaUrl(item.image_url!) }}
            style={{ width: "100%" as any, height: 208, borderTopLeftRadius: 12, borderTopRightRadius: 12 }}
            resizeMode="cover"
          />
        ) : (
          <View className="w-full items-center justify-center border-b border-border" style={{ height: 208, backgroundColor: colors.primaryLight }}>
            <Ionicons name="calendar-outline" size={40} color={colors.primary} style={{ opacity: 0.3 }} />
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
              <Badge key={c} className="px-2 py-0.5 rounded" style={{ backgroundColor: colors.primaryLight, borderColor: colors.primaryBorder, borderWidth: 1 }}>
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
      if (!uploadRes.ok) {
        const errData = await uploadRes.json().catch(() => ({}));
        throw new Error(errData.message ?? `Upload failed with status ${uploadRes.status}`);
      }
      const uploadData = await uploadRes.json();
      if (uploadData.url) {
        await fetch(attachUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ url: uploadData.url, s3_key: uploadData.s3_key, sort_order: i }),
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
        external_link: form.externalLink.trim() || null,
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
          try {
            await uploadImages(postId, attachUrl);
          } catch (uploadErr: unknown) {
            setError(`Post created but image upload failed: ${uploadErr instanceof Error ? uploadErr.message : "unknown error"}`);
            onSaved(postType);
            return;
          }
        }
        setForm(EMPTY_FORM);
        setImages([]);
        onClose();
        onSaved(postType);
      } else {
        setError(data.message || "Failed to post.");
      }
    } catch (err) {
      console.error("Post submit error:", err);
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
      <DialogContent className="w-full max-w-[480px] p-0">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
          keyboardVerticalOffset={0}
        >
        <DialogHeader className="flex-row justify-between items-center px-6 py-4 border-b border-border mb-0">
          <DialogTitle>
            <Text className="text-base font-bold text-foreground">New Post</Text>
          </DialogTitle>
          <Pressable
            onPress={onClose}
            disabled={saving}
            hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
            style={{
              width: 36, height: 36, borderRadius: 18,
              borderWidth: 1.5, borderColor: colors.border,
              backgroundColor: colors.bg,
              alignItems: 'center', justifyContent: 'center',
            }}
          >
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

        <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 4, paddingBottom: 60 }} showsVerticalScrollIndicator={true} keyboardShouldPersistTaps="handled">
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
              {Platform.OS === "web" && mounted && DatePicker && (
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
              {Platform.OS !== "web" && (
                <Input
                  placeholder="YYYY-MM-DD HH:MM (e.g. 2026-05-12 18:30)"
                  value={form.startsAt ? form.startsAt.toISOString().slice(0, 16).replace("T", " ") : ""}
                  onChangeText={(v) => {
                    const d = new Date(v.replace(" ", "T"));
                    set("startsAt", isNaN(d.getTime()) ? null : d);
                  }}
                  editable={!saving}
                  className="text-sm"
                />
              )}

              <Text className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase mt-4 mb-1.5">End Date & Time</Text>
              {Platform.OS === "web" && mounted && DatePicker && (
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
              {Platform.OS !== "web" && (
                <Input
                  placeholder="YYYY-MM-DD HH:MM (optional)"
                  value={form.endsAt ? form.endsAt.toISOString().slice(0, 16).replace("T", " ") : ""}
                  onChangeText={(v) => {
                    if (!v.trim()) { set("endsAt", null); return; }
                    const d = new Date(v.replace(" ", "T"));
                    set("endsAt", isNaN(d.getTime()) ? null : d);
                  }}
                  editable={!saving}
                  className="text-sm"
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
              <Text className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase mt-4 mb-1.5">Registration / Event Link</Text>
              <Input
                placeholder="https://example.com/register"
                value={form.externalLink}
                onChangeText={(v) => set("externalLink", v)}
                editable={!saving}
                className="text-sm"
                style={{ outlineStyle: "none" } as any}
              />
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
        </KeyboardAvoidingView>
      </DialogContent>
    </Dialog>
  );
}

// ─── Digest sub-components ────────────────────────────────────────────────────

function StatusTile({ icon, n, label, sub, tone, onPress }: {
  icon: string; n: string | number; label: string; sub: string;
  tone: 'primary' | 'success' | 'warn';
  onPress?: () => void;
}) {
  const tc = {
    primary: { bg: colors.primaryLight, fg: colors.primary, br: colors.primary200 },
    success: { bg: colors.successLight, fg: colors.success, br: '#c8e6c9' },
    warn:    { bg: colors.warningLight, fg: colors.warning, br: '#ffe082' },
  }[tone];
  const inner = (
    <>
      <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon as any} size={18} color={tc.fg} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: colors.ink }}>
          <Text style={{ color: tc.fg, fontWeight: '800' }}>{n}</Text>{' '}{label}
        </Text>
        <Text style={{ fontSize: 11, color: colors.dark, marginTop: 2 }}>{sub}</Text>
      </View>
    </>
  );
  const containerStyle = { backgroundColor: tc.bg, borderWidth: 1, borderColor: tc.br, borderRadius: 14, padding: 14, flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12 };
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={[containerStyle, { cursor: 'pointer' as any }]}>
        {inner}
      </Pressable>
    );
  }
  return <View style={containerStyle}>{inner}</View>;
}

function DigestSectionHeader({ icon, title, sub, onSeeAll }: {
  icon: string; title: string; sub?: string; onSeeAll?: () => void;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Ionicons name={icon as any} size={18} color={colors.primary} />
        <Text style={{ fontSize: 20, fontWeight: '800', letterSpacing: -0.4, color: colors.ink }}>{title}</Text>
        {sub && <Text style={{ fontSize: 12, color: colors.dark }}>· {sub}</Text>}
      </View>
      {onSeeAll && (
        <Pressable onPress={onSeeAll}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>See all →</Text>
        </Pressable>
      )}
    </View>
  );
}

function RailCard({ title, link, onLinkPress, children }: { title: string; link?: string; onLinkPress?: () => void; children: React.ReactNode }) {
  return (
    <View style={{ backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Text style={{ fontSize: 14, fontWeight: '800', color: colors.ink }}>{title}</Text>
        {link && (
          onLinkPress ? (
            <Pressable onPress={onLinkPress} style={{ cursor: 'pointer' as any }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>{link}</Text>
            </Pressable>
          ) : (
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>{link}</Text>
          )
        )}
      </View>
      {children}
    </View>
  );
}

function DateBlock({ when }: { when: string }) {
  const [datePart] = (when || '').split(' · ');
  const [mon, day] = (datePart || '').split(' ');
  return (
    <View style={{ width: 44, borderWidth: 1.5, borderColor: colors.primary200, borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
      <View style={{ backgroundColor: colors.primary, paddingVertical: 2, alignItems: 'center' }}>
        <Text style={{ color: colors.white, fontSize: 9, fontWeight: '800', letterSpacing: 0.6 }}>{(mon || '').toUpperCase()}</Text>
      </View>
      <View style={{ paddingVertical: 4, alignItems: 'center' }}>
        <Text style={{ fontSize: 18, fontWeight: '800', color: colors.primary }}>{day}</Text>
      </View>
    </View>
  );
}

// ─── Home Screen ──────────────────────────────────────────────────────────────

export default function HomeWebScreen() {
  const { user, token } = useAuth();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const { unreadCount } = useWebSocket();

  const [listings, setListings] = useState<Listing[]>([]);
  const [listingResults, setListingResults] = useState<Listing[]>([]);
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
  const [loadingListings, setLoadingListings] = useState(true);
  const [loadingServices, setLoadingServices] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [errorListings, setErrorListings] = useState(false);
  const [errorServices, setErrorServices] = useState(false);
  const [errorEvents, setErrorEvents] = useState(false);
  const [browseMode, setBrowseMode] = useState(false);

  const fetchListings = useCallback(() => {
    setLoadingListings(true);
    setErrorListings(false);
    fetch(API.listings)
      .then((r) => r.json())
      .then((d) => { if (d.listings) setListings(d.listings); })
      .catch(() => setErrorListings(true))
      .finally(() => setLoadingListings(false));
  }, []);

  const fetchListingResults = useCallback((searchQuery: string, category: string | null, condition: string | null) => {
    const params = new URLSearchParams();
    const trimmedQuery = searchQuery.trim();

    if (trimmedQuery) params.set("q", trimmedQuery);
    if (category) params.set("category", category);
    if (condition) params.set("condition", condition);
    params.set("limit", "100");

    const url = params.toString() ? `${API.search}?${params.toString()}` : API.search;

    setLoadingListings(true);
    fetch(url)
      .then((r) => r.json())
      .then((d) => { if (d.listings) setListingResults(d.listings); })
      .catch(() => {})
      .finally(() => setLoadingListings(false));
  }, []);

  const fetchServices = useCallback(() => {
    if (!token) return;
    setLoadingServices(true);
    setErrorServices(false);
    fetch(API.services, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { if (d.services) setServices(d.services); })
      .catch(() => setErrorServices(true))
      .finally(() => setLoadingServices(false));
  }, [token]);

  const fetchEvents = useCallback(() => {
    if (!token) return;
    setLoadingEvents(true);
    setErrorEvents(false);
    fetch(`${API.events}?include_past=0`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { if (d.events) setEvents(d.events); })
      .catch(() => setErrorEvents(true))
      .finally(() => setLoadingEvents(false));
  }, [token]);

  useEffect(() => {
    fetchListings();
    fetchServices();
    fetchEvents();
  }, [fetchListings, fetchServices, fetchEvents]);

  useEffect(() => {
    if (activeTab !== "listing") return;

    const timeout = setTimeout(() => {
      fetchListingResults(query, activeCategory, activeCondition);
    }, 200);

    return () => clearTimeout(timeout);
  }, [activeTab, activeCategory, activeCondition, query, fetchListingResults]);

  const switchTab = useCallback((tab: TabType) => {
    setActiveTab(tab);
    setActiveCategory(null);
    setActiveCondition(null);
    setQuery("");
  }, []);

  const closeModal = useCallback(() => setModalVisible(false), []);

  const handleSaved = useCallback((type: PostType) => {
    fetchListings();
    fetchListingResults(query, activeCategory, activeCondition);
    fetchServices();
    fetchEvents();
    setToastMessage(type === "listing" ? "Listing posted!" : type === "service" ? "Service posted!" : "Event posted!");
    setToastVisible(false);
    setTimeout(() => setToastVisible(true), 50);
  }, [activeCategory, activeCondition, fetchListingResults, fetchListings, fetchServices, fetchEvents, query]);

  // Filtered data per tab
  function matchesCat(category: string, filter: string | null) {
    if (!filter) return true;
    return category.split(",").some((c) => c.trim().toLowerCase() === filter.toLowerCase());
  }

  const filteredListings = listingResults;

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

  const isLoading =
    activeTab === "listing" ? loadingListings :
    activeTab === "service" ? loadingServices :
    loadingEvents;

  const hasError =
    activeTab === "listing" ? errorListings :
    activeTab === "service" ? errorServices :
    errorEvents;

  const retryFetch =
    activeTab === "listing" ? fetchListings :
    activeTab === "service" ? fetchServices :
    fetchEvents;

  const isMobile = width < 768;
  const SIDEBAR = isMobile ? 0 : 220;
  const contentWidth = Math.min(width - (isMobile ? 16 : 48), 1100);
  const gridCols = isMobile ? (width < 480 ? 1 : 2) : 3;

  const firstName = user?.name?.split(" ")[0] || "Aggie";
  const showHotRail = !isMobile && listings.length > 0 && !loadingListings && !query && !activeCategory;

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

  const picksForYou = listings.slice(0, isMobile ? 2 : 3);
  const justPosted  = (listingResults.length ? listingResults : listings).slice(0, 4);
  const weekEvents  = events.slice(0, 3);
  const hireServices = services.slice(0, 4);
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  if (isMobile) {
    // ── MOBILE: curved header + category strip + tile feed + BottomNav ──────
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.primary }}>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        {/* Gradient header */}
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          start={{ x: 0, y: 0 }} end={{ x: 0.4, y: 1 }}
          style={{ borderBottomLeftRadius: 24, borderBottomRightRadius: 24, paddingTop: 14, paddingBottom: 22, paddingHorizontal: 18, gap: 12 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 10, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase' }} numberOfLines={1}>NMSU CAMPUS</Text>
              <Text style={{ color: colors.white, fontSize: 24, fontWeight: '800', letterSpacing: -0.5 }} numberOfLines={1} adjustsFontSizeToFit>Aggie Market</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexShrink: 0 }}>
              <Pressable
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={{ width: 36, height: 36, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' }}
                onPress={() => router.push('/inbox')}
              >
                <Ionicons name="chatbubble-outline" size={17} color={colors.white} />
              </Pressable>
              <Pressable hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} onPress={() => router.push('/profile')}>
                <Avatar name={user?.name || 'A'} size={36} />
              </Pressable>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 12, paddingHorizontal: 12, height: 44, gap: 8 }}>
            <Ionicons name="search-outline" size={17} color={colors.dark} />
            <Input className="flex-1 text-[14px] border-0 h-auto p-0" placeholder="Search listings, services…" value={query} onChangeText={setQuery} placeholderTextColor={colors.dark} style={{ outlineStyle: 'none', backgroundColor: 'transparent', color: colors.ink } as any} />
            {query.length > 0 && <Pressable onPress={() => setQuery('')}><Ionicons name="close-circle" size={17} color={colors.dark} /></Pressable>}
          </View>
        </LinearGradient>


        {/* ── Daily Digest (mobile) ── */}
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 14, paddingBottom: 100, gap: 22 } as any}>

          {/* Greeting strip */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Avatar name={user?.name || 'Aggie'} size={40} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: 12, color: colors.dark }}>{today}</Text>
              <Text style={{ fontSize: 20, fontWeight: '800', letterSpacing: -0.4, color: colors.ink }} numberOfLines={1}>Hey {firstName} 👋</Text>
            </View>
          </View>

          {/* Status tiles — compact 3-up, single-line labels */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable onPress={() => router.push('/inbox')}
              style={{ flex: 1, backgroundColor: colors.primaryLight, borderRadius: 12, padding: 12, gap: 4, borderWidth: 1, borderColor: colors.primary200 }}>
              <Ionicons name="chatbubble-outline" size={18} color={colors.primary} />
              <Text style={{ fontSize: 22, fontWeight: '800', color: colors.ink, lineHeight: 26 }}>{unreadCount || 0}</Text>
              <Text style={{ fontSize: 11, color: colors.dark, fontWeight: '600' }} numberOfLines={1}>Messages</Text>
            </Pressable>
            <Pressable onPress={() => router.push('/browse?tab=listing' as any)}
              style={{ flex: 1, backgroundColor: colors.successLight, borderRadius: 12, padding: 12, gap: 4, borderWidth: 1, borderColor: '#c8e6c9' }}>
              <Ionicons name="pricetag-outline" size={18} color={colors.success} />
              <Text style={{ fontSize: 22, fontWeight: '800', color: colors.ink, lineHeight: 26 }}>{listings.length}</Text>
              <Text style={{ fontSize: 11, color: colors.dark, fontWeight: '600' }} numberOfLines={1}>Listings</Text>
            </Pressable>
            <Pressable onPress={() => router.push('/browse?tab=event' as any)}
              style={{ flex: 1, backgroundColor: colors.warningLight, borderRadius: 12, padding: 12, gap: 4, borderWidth: 1, borderColor: '#ffe082' }}>
              <Ionicons name="calendar-outline" size={18} color={colors.warning} />
              <Text style={{ fontSize: 22, fontWeight: '800', color: colors.ink, lineHeight: 26 }}>{events.length}</Text>
              <Text style={{ fontSize: 11, color: colors.dark, fontWeight: '600' }} numberOfLines={1}>Events</Text>
            </Pressable>
          </View>

          {/* Picks for you */}
          {picksForYou.length > 0 && (
            <View>
              <DigestSectionHeader icon="sparkles-outline" title="Picks for you" sub="Trending on campus" onSeeAll={() => router.push('/browse?tab=listing' as any)} />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {picksForYou.map(item => {
                  const label = item.is_free ? 'Free' : item.price != null ? `$${item.price}` : '—';
                  return (
                    <Pressable key={item.id} onPress={() => router.push(`/listing/${item.id}`)}
                      style={{ width: '48%', backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 14, overflow: 'hidden' }}>
                      {item.image_url
                        ? <Image source={{ uri: API.mediaUrl(item.image_url) }} style={{ width: '100%' as any, aspectRatio: 1 }} resizeMode="cover" />
                        : <View style={{ width: '100%' as any, aspectRatio: 1, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' }}>
                            <Ionicons name="image-outline" size={32} color={colors.primary} style={{ opacity: 0.3 }} />
                          </View>
                      }
                      <View style={{ padding: 10, gap: 2 }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink }} numberOfLines={1}>{item.title}</Text>
                        <Text style={{ fontSize: 14, fontWeight: '800', color: item.is_free ? colors.success : colors.primary }} numberOfLines={1}>{label}</Text>
                        <Text style={{ fontSize: 11, color: colors.dark }} numberOfLines={1}>by {item.seller_name || 'Aggie'}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* Just posted */}
          {justPosted.length > 0 && (
            <View>
              <DigestSectionHeader icon="flame-outline" title="Just posted" sub="Last 24 hours" onSeeAll={() => router.push('/browse?tab=listing' as any)} />
              <View style={{ backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 14, overflow: 'hidden' }}>
                {justPosted.map((item, i) => {
                  const label = item.is_free ? 'Free' : item.price != null ? `$${item.price}` : '—';
                  return (
                    <Pressable key={item.id} onPress={() => router.push(`/listing/${item.id}`)}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderBottomWidth: i < justPosted.length - 1 ? 1 : 0, borderBottomColor: colors.border }}>
                      {item.image_url
                        ? <Image source={{ uri: API.mediaUrl(item.image_url) }} style={{ width: 56, height: 56, borderRadius: 8 }} resizeMode="cover" />
                        : <View style={{ width: 56, height: 56, borderRadius: 8, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' }}>
                            <Ionicons name="image-outline" size={20} color={colors.primary} style={{ opacity: 0.3 }} />
                          </View>
                      }
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink }} numberOfLines={1}>{item.title}</Text>
                        <Text style={{ fontSize: 11, color: colors.dark, marginTop: 2 }} numberOfLines={1}>{item.seller_name || 'Seller'} · {item.category}</Text>
                      </View>
                      <Text style={{ fontSize: 15, fontWeight: '800', color: item.is_free ? colors.success : colors.primary }}>{label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* Aggies for hire */}
          {hireServices.length > 0 && (
            <View>
              <DigestSectionHeader icon="person-outline" title="Aggies for hire" onSeeAll={() => router.push('/browse?tab=service' as any)} />
              <View style={{ gap: 10 }}>
                {hireServices.map(s => {
                  const priceLabelStr = s.price != null ? `$${s.price}${s.price_type === 'hourly' ? '/hr' : ''}` : 'Contact';
                  return (
                    <Pressable key={s.id} onPress={() => router.push(`/service/${s.id}`)}
                      style={{ backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 12, flexDirection: 'row', gap: 12 }}>
                      <Avatar name={s.provider_name || 'P'} size={42} />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink }} numberOfLines={2}>{s.title}</Text>
                        <Text style={{ fontSize: 11, color: colors.dark, marginTop: 2 }} numberOfLines={1}>{s.provider_name} · {s.category}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 4 }}>
                        <Text style={{ fontSize: 14, fontWeight: '800', color: colors.primary }}>{priceLabelStr}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* This week's events */}
          {weekEvents.length > 0 && (
            <View>
              <DigestSectionHeader icon="calendar-outline" title="On campus this week" onSeeAll={() => router.push('/browse?tab=event' as any)} />
              <View style={{ backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 14, gap: 12 }}>
                {weekEvents.map(e => (
                  <Pressable key={e.id} onPress={() => router.push(`/event/${e.id}`)} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
                    <DateBlock when={e.starts_at ? new Date(e.starts_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', lineHeight: 18, color: colors.ink }} numberOfLines={2}>{e.title}</Text>
                      <Text style={{ fontSize: 11, color: colors.dark, marginTop: 2 }} numberOfLines={1}>{e.location}</Text>
                      {!!e.is_free && <Chip variant="success" style={{ marginTop: 6 }}>FREE</Chip>}
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

        </ScrollView>

        {/* Bottom Nav */}
        <BottomNav
          active="home"
          unreadCount={unreadCount}
          onPress={k => {
            if (k === 'post')   setModalVisible(true);
            if (k === 'inbox')  router.push('/inbox');
            if (k === 'me')     router.push('/profile');
            if (k === 'browse') router.push('/browse');
          }}
        />

        <Toast message={toastMessage} visible={toastVisible} />
        <CreatePostModal visible={modalVisible} onClose={closeModal} onSaved={handleSaved} token={token} />
      </View>
      </SafeAreaView>
    );
  }

  // ── DESKTOP: Daily Digest layout ───────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* ── Desktop Navbar ── */}
      <View style={{ position: 'sticky' as any, top: 0, zIndex: 100, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border, height: 64, justifyContent: 'center', paddingHorizontal: 24 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, maxWidth: 1240, alignSelf: 'center', width: '100%' as any }}>
          {/* Left cluster: logo */}
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14, minWidth: 0 }}>
            <Pressable style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }} onPress={() => router.push('/home')}>
              <View style={{ backgroundColor: colors.primary, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                <Text style={{ color: colors.white, fontSize: 12, fontWeight: '800', letterSpacing: 0.6 }}>AM</Text>
              </View>
              <Text style={{ fontSize: 17, fontWeight: '800', color: colors.ink, letterSpacing: -0.3 }}>Aggie Market</Text>
            </Pressable>
          </View>

          {/* Center: search */}
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bg, borderWidth: 1.5, borderColor: searchFocused ? colors.primary : colors.border, borderRadius: 10, paddingHorizontal: 12, height: 42, gap: 8, width: '100%' as any, maxWidth: 520, flexShrink: 1 }}>
            <Ionicons name="search-outline" size={16} color={colors.dark} />
            <Input className="flex-1 text-[13px] border-0 h-auto p-0" placeholder="Search Aggie Market" value={query} onChangeText={setQuery}
              onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)} placeholderTextColor={colors.dark} style={{ outlineStyle: 'none', backgroundColor: 'transparent', color: colors.ink } as any} />
          </View>

          {/* Right cluster */}
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
            <Pressable style={{ width: 38, height: 38, borderWidth: 1.5, borderColor: colors.border, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }} onPress={() => router.push('/saved')}>
              <Ionicons name="heart-outline" size={16} color={colors.dark} />
            </Pressable>
            <Pressable style={{ width: 38, height: 38, borderWidth: 1.5, borderColor: colors.border, borderRadius: 10, alignItems: 'center', justifyContent: 'center', position: 'relative' as any }} onPress={() => router.push('/inbox')}>
              <Ionicons name="chatbubble-outline" size={16} color={colors.dark} />
              {unreadCount > 0 && (
                <View style={{ position: 'absolute', top: -3, right: -3, backgroundColor: colors.primary, borderRadius: 999, minWidth: 16, height: 16, paddingHorizontal: 3, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.white }}>
                  <Text style={{ color: colors.white, fontSize: 9, fontWeight: '800' }}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                </View>
              )}
            </Pressable>
            <Pressable onPress={() => router.push('/profile')}>
              <NavAvatar name={user?.name || 'A'} size={32} />
            </Pressable>
            <Button size="sm" onPress={() => setModalVisible(true)} style={{ backgroundColor: colors.primary, borderRadius: 10, height: 38, paddingHorizontal: 16 }}>
              <Text style={{ color: colors.white, fontSize: 13, fontWeight: '700' }}>+ New Post</Text>
            </Button>
          </View>
        </View>
      </View>

      {/* ── Main content ── */}
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={{ maxWidth: 1240, alignSelf: 'center', width: '100%' as any, padding: 28, paddingBottom: 60 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 28 } as any}>

            {/* ── Left column ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 } as any}>

              {/* Greeting */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 4 }}>
                <Avatar name={user?.name || 'Aggie'} size={44} />
                <View>
                  <Text style={{ fontSize: 13, color: colors.dark }}>{today}</Text>
                  <Text style={{ fontSize: 28, fontWeight: '800', letterSpacing: -0.6, color: colors.ink }}>Hey {firstName} 👋</Text>
                </View>
              </View>
              <Text style={{ fontSize: 15, color: colors.dark, marginBottom: 24, maxWidth: 520, lineHeight: 22 }}>
                Your Aggie Market digest — picks based on what's hot on campus.
              </Text>

              {/* Status tiles */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 28 } as any}>
                <StatusTile icon="chatbubble-outline" n={unreadCount || 0} label="new messages" sub="Tap to open inbox" tone="primary" onPress={() => router.push('/inbox')} />
                <StatusTile icon="heart-outline"       n={listings.length} label="active listings" sub="Campus marketplace" tone="success" onPress={() => router.push('/browse?tab=listing' as any)} />
                <StatusTile icon="calendar-outline"    n={events.length}   label="events this week" sub="On & near campus" tone="warn" onPress={() => router.push('/browse?tab=event' as any)} />
              </div>

              {/* Picks for you */}
              {picksForYou.length > 0 && (
                <View style={{ marginBottom: 32 }}>
                  <DigestSectionHeader icon="sparkles-outline" title="Picks for you" sub="Trending on campus" onSeeAll={() => router.push('/browse?tab=listing' as any)} />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 } as any}>
                    {picksForYou.map(item => {
                      const label = item.is_free ? 'Free' : item.price != null ? `$${item.price}` : '—';
                      return (
                        <Pressable key={item.id} onPress={() => router.push(`/listing/${item.id}`)}
                          style={{ backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 14, overflow: 'hidden' }}>
                          {item.image_url
                            ? <Image source={{ uri: API.mediaUrl(item.image_url) }} style={{ width: '100%' as any, height: 140 }} resizeMode="cover" />
                            : <View style={{ height: 140, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' }}>
                                <Ionicons name="image-outline" size={32} color={colors.primary} style={{ opacity: 0.3 }} />
                              </View>
                          }
                          <View style={{ padding: 12 }}>
                            <Text style={{ fontSize: 14, fontWeight: '700', lineHeight: 19, color: colors.ink }} numberOfLines={2}>{item.title}</Text>
                            <Text style={{ fontSize: 11, color: colors.primary, marginTop: 4, fontStyle: 'italic' }}>Because it's trending this week</Text>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                              <Text style={{ fontSize: 16, fontWeight: '800', color: item.is_free ? colors.success : colors.primary, letterSpacing: -0.3 }}>{label}</Text>
                              <Chip variant="outline">{item.condition || item.category}</Chip>
                            </View>
                          </View>
                        </Pressable>
                      );
                    })}
                  </div>
                </View>
              )}

              {/* Just posted */}
              {justPosted.length > 0 && (
                <View style={{ marginBottom: 32 }}>
                  <DigestSectionHeader icon="flame-outline" title="Just posted" sub="Within the last 24 hours" onSeeAll={() => router.push('/browse?tab=listing' as any)} />
                  <View style={{ backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 14, overflow: 'hidden' }}>
                    {justPosted.map((item, i) => {
                      const label = item.is_free ? 'Free' : item.price != null ? `$${item.price}` : '—';
                      return (
                        <Pressable key={item.id} onPress={() => router.push(`/listing/${item.id}`)}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderBottomWidth: i < justPosted.length - 1 ? 1 : 0, borderBottomColor: colors.border }}>
                          {item.image_url
                            ? <Image source={{ uri: API.mediaUrl(item.image_url) }} style={{ width: 64, height: 64, borderRadius: 8 }} resizeMode="cover" />
                            : <View style={{ width: 64, height: 64, borderRadius: 8, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' }}>
                                <Ionicons name="image-outline" size={22} color={colors.primary} style={{ opacity: 0.3 }} />
                              </View>
                          }
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.ink }} numberOfLines={1}>{item.title}</Text>
                            <Text style={{ fontSize: 12, color: colors.dark, marginTop: 2 }}>{item.seller_name || 'Seller'} · {item.category}</Text>
                          </View>
                          <Text style={{ fontSize: 17, fontWeight: '800', color: item.is_free ? colors.success : colors.primary, letterSpacing: -0.3 }}>{label}</Text>
                          <Pressable onPress={() => router.push(`/listing/${item.id}`)}
                            style={{ backgroundColor: colors.primaryLight, borderWidth: 1, borderColor: colors.primary200, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 }}>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>View</Text>
                          </Pressable>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Aggies for hire */}
              {hireServices.length > 0 && (
                <View style={{ marginBottom: 32 }}>
                  <DigestSectionHeader icon="person-outline" title="Aggies for hire this week" onSeeAll={() => router.push('/browse?tab=service' as any)} />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 16 } as any}>
                    {hireServices.map(s => {
                      const priceLabel = s.price != null ? `$${s.price}${s.price_type === 'hourly' ? '/hr' : ''}` : 'Contact';
                      return (
                        <Pressable key={s.id} onPress={() => router.push(`/service/${s.id}`)}
                          style={{ backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 14, flexDirection: 'row', gap: 14 }}>
                          <Avatar name={s.provider_name || 'P'} size={48} />
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.ink }} numberOfLines={2}>{s.title}</Text>
                            <Text style={{ fontSize: 12, color: colors.dark, marginTop: 2 }}>{s.provider_name} · {s.category}</Text>
                          </View>
                          <View style={{ alignItems: 'flex-end', gap: 6 }}>
                            <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary }}>{priceLabel}</Text>
                            <View style={{ backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}>
                              <Text style={{ color: colors.white, fontSize: 12, fontWeight: '700' }}>Hire</Text>
                            </View>
                          </View>
                        </Pressable>
                      );
                    })}
                  </div>
                </View>
              )}
            </div>

            {/* ── Right rail ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 } as any}>

              {/* Events */}
              {weekEvents.length > 0 && (
                <RailCard title="On campus this week" link="Browse all" onLinkPress={() => router.push('/browse?tab=event' as any)}>
                  <View style={{ gap: 12 }}>
                    {weekEvents.map(e => (
                      <Pressable key={e.id} onPress={() => router.push(`/event/${e.id}`)} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
                        <DateBlock when={e.starts_at ? new Date(e.starts_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''} />
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={{ fontSize: 13, fontWeight: '700', lineHeight: 18, color: colors.ink }} numberOfLines={2}>{e.title}</Text>
                          <Text style={{ fontSize: 11, color: colors.dark, marginTop: 2 }} numberOfLines={1}>{e.location}</Text>
                          {!!e.is_free && <Chip variant="success" style={{ marginTop: 6 }}>FREE</Chip>}
                        </View>
                      </Pressable>
                    ))}
                  </View>
                </RailCard>
              )}

              {/* Browse all listings */}
              <RailCard title="Browse everything">
                <View style={{ gap: 6 }}>
                  {TAB_LABELS.map(({ key, label }) => (
                    <Pressable key={key} onPress={() => router.push(`/browse?tab=${key}` as any)}
                      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border, cursor: 'pointer' as any }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink }}>{label}</Text>
                      <Ionicons name="arrow-forward" size={14} color={colors.dark} />
                    </Pressable>
                  ))}
                </View>
              </RailCard>
            </div>
          </div>

          {/* ── Browse mode full grid ── */}
          {browseMode && (
            <View style={{ marginTop: 32 }}>
              {/* Header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text style={{ fontSize: 26, fontWeight: '800', letterSpacing: -0.5, color: colors.ink }}>
                    All {TAB_LABELS.find(t => t.key === activeTab)?.label}
                  </Text>
                  {!isLoading && (
                    <View style={{ backgroundColor: colors.primaryLight, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1, borderColor: colors.primary200 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>{currentCount}</Text>
                    </View>
                  )}
                </View>
                <Pressable onPress={() => setBrowseMode(false)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.white }}>
                  <Ionicons name="close-outline" size={16} color={colors.dark} />
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.dark }}>Close</Text>
                </Pressable>
              </View>

              {/* Tab switcher */}
              <View style={{ flexDirection: 'row', gap: 6, marginBottom: 20 }}>
                {TAB_LABELS.map(({ key, label }) => (
                  <Pressable key={key} onPress={() => switchTab(key)}
                    style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, backgroundColor: activeTab === key ? colors.primary : colors.white, borderWidth: 1.5, borderColor: activeTab === key ? colors.primary : colors.border }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: activeTab === key ? colors.white : colors.dark }}>{label}</Text>
                  </Pressable>
                ))}
              </View>

              {/* Category filter chips */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}
                contentContainerStyle={{ gap: 8, flexDirection: 'row' } as any}>
                <Pressable onPress={() => setActiveCategory(null)}
                  style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, borderWidth: 1.5, borderColor: activeCategory === null ? colors.primary : colors.border, backgroundColor: activeCategory === null ? colors.primaryLight : colors.white }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: activeCategory === null ? colors.primary : colors.dark }}>All</Text>
                </Pressable>
                {currentCategories.map((cat) => (
                  <Pressable key={cat} onPress={() => setActiveCategory(cat)}
                    style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, borderWidth: 1.5, borderColor: activeCategory === cat ? colors.primary : colors.border, backgroundColor: activeCategory === cat ? colors.primaryLight : colors.white }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: activeCategory === cat ? colors.primary : colors.dark }}>{cat}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              {/* Grid content */}
              {isLoading ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20 } as any}>
                  {[1,2,3,4,5,6].map(i => <SkeletonCard key={i} />)}
                </div>
              ) : hasError ? (
                <View style={{ alignItems: 'center', paddingVertical: 60, gap: 12 }}>
                  <Ionicons name="cloud-offline-outline" size={40} color={colors.mid} />
                  <Text style={{ fontSize: 15, fontWeight: '600', color: colors.ink }}>Could not load</Text>
                  <Button variant="outline" onPress={retryFetch}><Text>Retry</Text></Button>
                </View>
              ) : currentCount === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 60, gap: 12 }}>
                  <Text style={{ fontSize: 36, color: colors.border }}>◎</Text>
                  <Text style={{ fontSize: 17, fontWeight: '700', color: colors.ink }}>{emptyNoResultMsg}</Text>
                  <Text style={{ fontSize: 13, color: colors.dark }}>{query ? `Nothing matches "${query}"` : 'Be the first to post one.'}</Text>
                  <Button onPress={() => setModalVisible(true)}><Text className="text-primary-foreground text-[13px] font-bold">{emptyPostLabel}</Text></Button>
                </View>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20 } as any}>
                  {activeTab === 'listing' && filteredListings.map(item => <ListingCard key={item.id} item={item} />)}
                  {activeTab === 'service' && filteredServices.map(item => <ServiceCard key={item.id} item={item} />)}
                  {activeTab === 'event'   && filteredEvents.map(item => <EventCard key={item.id} item={item} />)}
                </div>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      <Toast message={toastMessage} visible={toastVisible} />
      <CreatePostModal visible={modalVisible} onClose={closeModal} onSaved={handleSaved} token={token} />
    </View>
  );
}

