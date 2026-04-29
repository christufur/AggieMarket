import { useEffect, useState } from "react";
import {
  View, Pressable, ScrollView, Switch, ActivityIndicator, Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
// @ts-ignore
import DatePicker from "react-datepicker";
import { colors } from "@/theme/colors";
import { API } from "@/constants/api";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { CONDITIONS, LISTING_CATEGORIES, SERVICE_CATEGORIES, EVENT_CATEGORIES, PRICE_TYPES } from "@/constants/categories";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PostType = "listing" | "service" | "event";

export type PostForm = {
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

export const EMPTY_FORM: PostForm = {
  title: "", description: "", categories: [],
  condition: "Good", price: "", isFree: false,
  priceType: "hourly", availability: "",
  location: "", startsAt: null, endsAt: null,
  eventFree: true, ticketPrice: "", externalLink: "",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function CreatePostModal({
  visible, onClose, onSaved, token,
}: {
  visible: boolean;
  onClose: () => void;
  onSaved: (type: PostType) => void;
  token: string | null;
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
      <DialogContent className="w-[480px] max-w-[480px] p-0">
        <DialogHeader className="flex-row justify-between items-center px-6 py-4 border-b border-border mb-0">
          <DialogTitle>
            <Text className="text-base font-bold text-foreground">New Post</Text>
          </DialogTitle>
          <Pressable onPress={onClose} disabled={saving}>
            <Text className="text-base text-muted-foreground font-light">✕</Text>
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
                  <Text className="text-primary-foreground text-[11px] font-bold">✕</Text>
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
            placeholder={postType === "event" ? "What's this event about?" : "Describe it…"}
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
                placeholder="e.g. Weekends, MTTh 4–6pm"
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
      </DialogContent>
    </Dialog>
  );
}
