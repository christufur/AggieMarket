import { useEffect, useRef, useState, useCallback, memo } from "react";
import {
  View, Text, TextInput, Pressable, ScrollView, StyleSheet,
  Modal, Switch, ActivityIndicator, Animated, useWindowDimensions, Image,
} from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
// @ts-ignore
import DatePicker from "react-datepicker";
import { colors } from "../theme/colors";
import { useAuth } from "../context/AuthContext";
import { API } from "../constants/api";

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
    <Animated.View style={[s.toast, { opacity, transform: [{ translateY }] }]} pointerEvents="none">
      <Text style={s.toastText}>✓  {message}</Text>
    </Animated.View>
  );
}

// ─── Cards ────────────────────────────────────────────────────────────────────

const ListingCard = memo(function ListingCard({ item }: { item: Listing }) {
  const router = useRouter();
  const [hovered, setHovered] = useState(false);
  const label = item.is_free ? "Free" : item.price != null ? `$${item.price}` : "—";

  return (
    <Pressable
      style={[card.wrap, hovered && card.wrapHover]}
      onPress={() => router.push(`/listing/${item.id}`)}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
    >
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={card.img} resizeMode="cover" />
      ) : (
        <View style={card.img}><Text style={card.imgLabel}>No photo</Text></View>
      )}
      <View style={card.body}>
        <Text style={card.title} numberOfLines={2}>{item.title}</Text>
        <Text style={card.price}>{label}</Text>
        <View style={card.tags}>
          {item.condition && (
            <View style={card.tag}><Text style={card.tagText}>{item.condition}</Text></View>
          )}
          <View style={[card.tag, card.catTag]}>
            <Text style={[card.tagText, card.catTagText]}>{item.category}</Text>
          </View>
        </View>
      </View>
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
      style={[card.wrap, hovered && card.wrapHover]}
      onPress={() => router.push(`/service/${item.id}`)}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
    >
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={card.img} resizeMode="cover" />
      ) : (
        <View style={[card.img, card.serviceImg]}>
          <Text style={card.serviceEmoji}>🛠</Text>
        </View>
      )}
      <View style={card.body}>
        <Text style={card.title} numberOfLines={2}>{item.title}</Text>
        <Text style={card.price}>{label}</Text>
        {item.availability ? (
          <Text style={card.meta} numberOfLines={1}>⏰ {item.availability}</Text>
        ) : null}
        <View style={card.tags}>
          {cats.map((c) => (
            <View key={c} style={[card.tag, card.catTag]}>
              <Text style={[card.tagText, card.catTagText]}>{c}</Text>
            </View>
          ))}
        </View>
      </View>
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
      style={[card.wrap, hovered && card.wrapHover]}
      onPress={() => router.push(`/event/${item.id}`)}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
    >
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={card.img} resizeMode="cover" />
      ) : (
        <View style={[card.img, card.eventImg]}>
          <Text style={card.serviceEmoji}>📅</Text>
        </View>
      )}
      <View style={card.body}>
        <Text style={card.title} numberOfLines={2}>{item.title}</Text>
        <Text style={card.meta}>📍 {item.location}</Text>
        <Text style={card.meta}>🗓 {formatDate(item.starts_at)}</Text>
        <View style={card.tags}>
          <View style={[card.tag, item.is_free ? card.freeTag : card.paidTag]}>
            <Text style={[card.tagText, item.is_free ? card.freeTagText : card.paidTagText]}>{ticketLabel}</Text>
          </View>
          {cats.map((c) => (
            <View key={c} style={[card.tag, card.catTag]}>
              <Text style={[card.tagText, card.catTagText]}>{c}</Text>
            </View>
          ))}
        </View>
      </View>
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
          body: JSON.stringify({ url: API.mediaUrl(uploadData.url), sort_order: i }),
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
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={m.backdrop} onPress={onClose}>
        <Pressable style={m.sheet} onPress={() => {}}>
          <View style={m.header}>
            <Text style={m.heading}>New Post</Text>
            <Pressable onPress={onClose} disabled={saving}>
              <Text style={m.closeBtn}>✕</Text>
            </Pressable>
          </View>

          <View style={m.segmentRow}>
            {typeLabels.map(({ key, label }) => (
              <Pressable
                key={key}
                style={[m.segment, postType === key && m.segmentActive]}
                onPress={() => switchType(key)}
                disabled={saving}
              >
                <Text style={[m.segmentText, postType === key && m.segmentTextActive]}>{label}</Text>
              </Pressable>
            ))}
          </View>

          <ScrollView style={m.body} showsVerticalScrollIndicator={false}>
            <Text style={m.label}>Photos</Text>
            <View style={m.photoRow}>
              {images.map((img, i) => (
                <Pressable
                  key={i}
                  style={m.thumb}
                  onPress={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                  disabled={saving}
                >
                  <Image source={{ uri: img.uri }} style={m.thumbImg} />
                  <View style={m.thumbOverlay}>
                    <Text style={m.thumbX}>✕</Text>
                  </View>
                </Pressable>
              ))}
              {images.length < 8 && (
                <Pressable style={m.addPhoto} onPress={pickImages} disabled={saving}>
                  <Text style={m.addPhotoIcon}>+</Text>
                  <Text style={m.addPhotoLabel}>Add photo</Text>
                </Pressable>
              )}
            </View>

            <Text style={m.label}>Title *</Text>
            <TextInput
              style={m.input}
              placeholder={postType === "listing" ? "e.g. Calc Textbook" : postType === "service" ? "e.g. Math Tutoring" : "e.g. Spring Career Fair"}
              placeholderTextColor={colors.mid}
              value={form.title}
              onChangeText={(v) => set("title", v)}
              editable={!saving}
            />

            <Text style={m.label}>Description</Text>
            <TextInput
              style={[m.input, m.textarea]}
              placeholder={postType === "event" ? "What's this event about?" : "Describe it…"}
              placeholderTextColor={colors.mid}
              value={form.description}
              onChangeText={(v) => set("description", v)}
              multiline
              editable={!saving}
            />

            <Text style={m.label}>Category</Text>
            <View style={m.pills}>
              {categories.map((c) => (
                <Pressable
                  key={c}
                  style={[m.pill, form.categories.includes(c) && m.pillOn]}
                  onPress={() => {
                    const next = form.categories.includes(c)
                      ? form.categories.filter((x) => x !== c)
                      : [...form.categories, c];
                    set("categories", next);
                  }}
                >
                  <Text style={[m.pillText, form.categories.includes(c) && m.pillTextOn]}>{c}</Text>
                </Pressable>
              ))}
            </View>

            {postType === "listing" && (
              <>
                <Text style={m.label}>Condition</Text>
                <View style={m.pills}>
                  {CONDITIONS.map((c) => (
                    <Pressable key={c} style={[m.pill, form.condition === c && m.pillOn]} onPress={() => set("condition", c)}>
                      <Text style={[m.pillText, form.condition === c && m.pillTextOn]}>{c}</Text>
                    </Pressable>
                  ))}
                </View>
                <View style={m.freeRow}>
                  <Text style={m.label}>Free item</Text>
                  <Switch value={form.isFree} onValueChange={(v) => set("isFree", v)} disabled={saving} />
                </View>
                {!form.isFree && (
                  <>
                    <Text style={m.label}>Price *</Text>
                    <TextInput style={m.input} placeholder="25.00" placeholderTextColor={colors.mid} value={form.price} onChangeText={(v) => set("price", numericOnly(v))} keyboardType="decimal-pad" editable={!saving} />
                  </>
                )}
              </>
            )}

            {postType === "service" && (
              <>
                <Text style={m.label}>Price Type</Text>
                <View style={m.pills}>
                  {PRICE_TYPES.map((pt) => (
                    <Pressable key={pt} style={[m.pill, form.priceType === pt && m.pillOn]} onPress={() => set("priceType", pt)}>
                      <Text style={[m.pillText, form.priceType === pt && m.pillTextOn]}>
                        {pt === "starting_at" ? "Starting at" : pt.charAt(0).toUpperCase() + pt.slice(1)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={m.label}>Price</Text>
                <TextInput style={m.input} placeholder="20.00" placeholderTextColor={colors.mid} value={form.price} onChangeText={(v) => set("price", numericOnly(v))} keyboardType="decimal-pad" editable={!saving} />
                <Text style={m.label}>Availability</Text>
                <TextInput style={m.input} placeholder="e.g. Weekends, MTTh 4–6pm" placeholderTextColor={colors.mid} value={form.availability} onChangeText={(v) => set("availability", v)} editable={!saving} />
              </>
            )}

            {postType === "event" && (
              <>
                <Text style={m.label}>Location *</Text>
                <TextInput style={m.input} placeholder="e.g. Corbett Center, Room 203" placeholderTextColor={colors.mid} value={form.location} onChangeText={(v) => set("location", v)} editable={!saving} />

                <Text style={m.label}>Start Date & Time *</Text>
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

                <Text style={m.label}>End Date & Time</Text>
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
                <View style={m.freeRow}>
                  <Text style={m.label}>Free event</Text>
                  <Switch value={form.eventFree} onValueChange={(v) => set("eventFree", v)} disabled={saving} />
                </View>
                {!form.eventFree && (
                  <>
                    <Text style={m.label}>Ticket Price *</Text>
                    <TextInput style={m.input} placeholder="10.00" placeholderTextColor={colors.mid} value={form.ticketPrice} onChangeText={(v) => set("ticketPrice", numericOnly(v))} keyboardType="decimal-pad" editable={!saving} />
                  </>
                )}
              </>
            )}

            {error ? <Text style={m.error}>{error}</Text> : null}

            <Pressable style={[m.submitBtn, saving && m.submitBtnDim]} onPress={submit} disabled={saving}>
              {saving
                ? <ActivityIndicator color={colors.white} size="small" />
                : <Text style={m.submitText}>Post {postType.charAt(0).toUpperCase() + postType.slice(1)}</Text>
              }
            </Pressable>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
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

  const cols = width > 1200 ? 3 : width > 800 ? 2 : 1;
  const SIDEBAR = 220;
  const GUTTER = 24;
  const contentWidth = Math.min(width - 48, 1280);
  const gridWidth = contentWidth - SIDEBAR - GUTTER;
  const cardWidth = (gridWidth - (cols - 1) * 16) / cols;

  const tabPlaceholder =
    activeTab === "listing" ? "Search listings…" :
    activeTab === "service" ? "Search services…" :
    "Search events…";

  const emptyPostLabel =
    activeTab === "listing" ? "Post a Listing" :
    activeTab === "service" ? "Post a Service" :
    "Post an Event";

  const emptyNoResultMsg =
    activeTab === "listing" ? "No listings found" :
    activeTab === "service" ? "No services found" :
    "No events found";

  return (
    <View style={s.root}>
      {/* ── Navbar ── */}
      <View style={s.nav}>
        <View style={[s.navInner, { maxWidth: contentWidth }]}>
          <Pressable style={s.navLogo} onPress={() => router.push("/home")}>
            <View style={s.navBadge}><Text style={s.navBadgeText}>AM</Text></View>
            <Text style={s.navLogoText}>Aggie Market</Text>
          </Pressable>

          <View style={[s.navSearch, searchFocused && s.navSearchFocused]}>
            <Text style={s.navSearchIcon}>⌕</Text>
            <TextInput
              style={s.navSearchInput}
              placeholder={tabPlaceholder}
              placeholderTextColor={colors.mid}
              value={query}
              onChangeText={setQuery}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
          </View>

          <View style={s.navRight}>
            <View style={s.navIcon}><Text style={s.navIconText}>✉</Text></View>
            <View style={s.navIcon}><Text style={s.navIconText}>◉</Text></View>
            <Pressable style={s.postBtn} onPress={() => setModalVisible(true)}>
              <Text style={s.postBtnText}>+ New Post</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        {/* ── Hero ── */}
        <View style={s.hero}>
          <View style={[s.heroInner, { maxWidth: contentWidth }]}>
            <Text style={s.heroEyebrow}>NMSU Verified · Students Only</Text>
            <Text style={s.heroHeadline}>The NMSU Student{"\n"}Marketplace</Text>
            <Text style={s.heroSub}>Buy, sell, and discover — verified students only.</Text>
            <View style={[s.heroSearch, searchFocused && s.heroSearchFocused]}>
              <Text style={s.heroSearchIcon}>⌕</Text>
              <TextInput
                style={s.heroSearchInput}
                placeholder="What are you looking for?"
                placeholderTextColor="rgba(255,255,255,0.45)"
                value={query}
                onChangeText={setQuery}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
              />
            </View>
            <View style={s.heroStats}>
              <Text style={s.heroStat}>{listings.length} listings</Text>
              <View style={s.heroDot} />
              <Text style={s.heroStat}>{services.length} services</Text>
              <View style={s.heroDot} />
              <Text style={s.heroStat}>{events.length} events</Text>
              <View style={s.heroDot} />
              <Text style={s.heroStat}>NMSU verified</Text>
            </View>
          </View>
        </View>

        {/* ── Tab Bar ── */}
        <View style={[s.tabBar, { paddingHorizontal: Math.max(24, (width - contentWidth) / 2) }]}>
          {TAB_LABELS.map(({ key, label }) => (
            <Pressable
              key={key}
              style={[s.tab, activeTab === key && s.tabActive]}
              onPress={() => switchTab(key)}
            >
              <Text style={[s.tabText, activeTab === key && s.tabTextActive]}>{label}</Text>
              {activeTab === key && <View style={s.tabUnderline} />}
            </Pressable>
          ))}
        </View>

        {/* ── Main Content ── */}
        <View style={[s.main, { maxWidth: contentWidth, alignSelf: "center", width: "100%" }]}>

          {/* Sidebar */}
          <View style={[s.sidebar, { width: SIDEBAR }]}>
            <Text style={s.sidebarHeading}>Categories</Text>
            <Pressable style={[s.filterItem, !activeCategory && s.filterItemOn]} onPress={() => setActiveCategory(null)}>
              <Text style={[s.filterText, !activeCategory && s.filterTextOn]}>All</Text>
            </Pressable>
            {currentCategories.map((c) => (
              <Pressable
                key={c}
                style={[s.filterItem, activeCategory === c && s.filterItemOn]}
                onPress={() => setActiveCategory(activeCategory === c ? null : c)}
              >
                <Text style={[s.filterText, activeCategory === c && s.filterTextOn]}>{c}</Text>
              </Pressable>
            ))}

            {activeTab === "listing" && (
              <>
                <View style={s.sidebarDivider} />
                <Text style={s.sidebarHeading}>Condition</Text>
                <Pressable style={[s.filterItem, !activeCondition && s.filterItemOn]} onPress={() => setActiveCondition(null)}>
                  <Text style={[s.filterText, !activeCondition && s.filterTextOn]}>Any</Text>
                </Pressable>
                {CONDITIONS.map((c) => (
                  <Pressable
                    key={c}
                    style={[s.filterItem, activeCondition === c && s.filterItemOn]}
                    onPress={() => setActiveCondition(activeCondition === c ? null : c)}
                  >
                    <Text style={[s.filterText, activeCondition === c && s.filterTextOn]}>{c}</Text>
                  </Pressable>
                ))}
              </>
            )}
          </View>

          {/* Grid */}
          <View style={s.gridWrap}>
            <View style={s.gridHeader}>
              <Text style={s.gridTitle}>
                {activeCategory ?? (activeTab === "listing" ? "All Listings" : activeTab === "service" ? "All Services" : "All Events")}
                {activeCondition ? ` · ${activeCondition}` : ""}
              </Text>
              <Text style={s.gridCount}>{currentCount} result{currentCount !== 1 ? "s" : ""}</Text>
            </View>

            {currentCount === 0 ? (
              <View style={s.empty}>
                <Text style={s.emptyIcon}>◎</Text>
                <Text style={s.emptyTitle}>{emptyNoResultMsg}</Text>
                <Text style={s.emptySub}>
                  {query ? `Nothing matches "${query}"` : "Be the first to post one."}
                </Text>
                <Pressable style={s.emptyBtn} onPress={() => setModalVisible(true)}>
                  <Text style={s.emptyBtnText}>{emptyPostLabel}</Text>
                </Pressable>
              </View>
            ) : (
              <View style={[s.grid, { gap: 16 }]}>
                {activeTab === "listing" && filteredListings.map((item) => (
                  <View key={item.id} style={{ width: cardWidth }}>
                    <ListingCard item={item} />
                  </View>
                ))}
                {activeTab === "service" && filteredServices.map((item) => (
                  <View key={item.id} style={{ width: cardWidth }}>
                    <ServiceCard item={item} />
                  </View>
                ))}
                {activeTab === "event" && filteredEvents.map((item) => (
                  <View key={item.id} style={{ width: cardWidth }}>
                    <EventCard item={item} />
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* ── Footer ── */}
        <View style={s.footer}>
          <Text style={s.footerText}>© 2026 Aggie Market · NMSU Verified</Text>
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

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },

  nav: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 24,
    height: 60,
    justifyContent: "center",
    position: "sticky" as any,
    top: 0,
    zIndex: 100,
  },
  navInner: { flexDirection: "row", alignItems: "center", alignSelf: "center", width: "100%", gap: 16 },
  navLogo: { flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 0 },
  navBadge: { backgroundColor: colors.ink, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4 },
  navBadgeText: { color: colors.white, fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },
  navLogoText: { fontSize: 16, fontWeight: "700", color: colors.ink, letterSpacing: -0.3 },
  navSearch: {
    flex: 1, flexDirection: "row", alignItems: "center",
    backgroundColor: colors.bg, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 8, paddingHorizontal: 12, height: 38, gap: 8,
  },
  navSearchFocused: { borderColor: colors.ink },
  navSearchIcon: { fontSize: 16, color: colors.mid },
  navSearchInput: { flex: 1, fontSize: 13, color: colors.ink, outlineStyle: "none" } as any,
  navRight: { flexDirection: "row", alignItems: "center", gap: 10, flexShrink: 0 },
  navIcon: { width: 36, height: 36, borderWidth: 1.5, borderColor: colors.border, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  navIconText: { fontSize: 15, color: colors.dark },
  postBtn: { backgroundColor: colors.ink, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 8 },
  postBtnText: { color: colors.white, fontSize: 13, fontWeight: "700" },

  hero: { backgroundColor: colors.ink, paddingVertical: 64, paddingHorizontal: 24 },
  heroInner: { alignSelf: "center", width: "100%" },
  heroEyebrow: { fontSize: 11, fontWeight: "700", letterSpacing: 2, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", marginBottom: 16 },
  heroHeadline: { fontSize: 52, fontWeight: "800", color: colors.white, letterSpacing: -1.5, lineHeight: 58, marginBottom: 16 },
  heroSub: { fontSize: 16, color: "rgba(255,255,255,0.65)", marginBottom: 32, lineHeight: 24 },
  heroSearch: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)", borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.2)", borderRadius: 10,
    paddingHorizontal: 16, height: 52, gap: 12, maxWidth: 560,
  },
  heroSearchFocused: { backgroundColor: "rgba(255,255,255,0.15)", borderColor: "rgba(255,255,255,0.5)" },
  heroSearchIcon: { fontSize: 20, color: "rgba(255,255,255,0.5)" },
  heroSearchInput: { flex: 1, fontSize: 15, color: colors.white, outlineStyle: "none" } as any,
  heroStats: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 24 },
  heroStat: { fontSize: 12, color: "rgba(255,255,255,0.45)" },
  heroDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.25)" },

  // Tab bar
  tabBar: {
    flexDirection: "row",
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    alignItems: "center",
    position: "relative",
  },
  tabActive: {},
  tabText: { fontSize: 14, fontWeight: "600", color: colors.mid },
  tabTextActive: { color: colors.ink },
  tabUnderline: {
    position: "absolute",
    bottom: 0,
    left: 20,
    right: 20,
    height: 2,
    backgroundColor: colors.ink,
    borderRadius: 1,
  },

  main: { flexDirection: "row", paddingHorizontal: 24, paddingTop: 32, paddingBottom: 48, gap: 24 },

  sidebar: { flexShrink: 0 },
  sidebarHeading: { fontSize: 10, fontWeight: "800", letterSpacing: 1.5, color: colors.mid, textTransform: "uppercase", marginBottom: 8, marginTop: 4 },
  sidebarDivider: { height: 1, backgroundColor: colors.border, marginVertical: 20 },
  filterItem: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, marginBottom: 2 },
  filterItemOn: { backgroundColor: colors.ink },
  filterText: { fontSize: 13, color: colors.dark, fontWeight: "500" },
  filterTextOn: { color: colors.white, fontWeight: "600" },

  gridWrap: { flex: 1, minWidth: 0 },
  gridHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  gridTitle: { fontSize: 20, fontWeight: "700", color: colors.ink, letterSpacing: -0.3 },
  gridCount: { fontSize: 13, color: colors.mid },
  grid: { flexDirection: "row", flexWrap: "wrap" },

  empty: { alignItems: "center", paddingVertical: 80, gap: 12 },
  emptyIcon: { fontSize: 40, color: colors.border },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: colors.ink },
  emptySub: { fontSize: 14, color: colors.mid },
  emptyBtn: { marginTop: 8, backgroundColor: colors.ink, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  emptyBtnText: { color: colors.white, fontSize: 13, fontWeight: "700" },

  footer: { borderTopWidth: 1, borderTopColor: colors.border, paddingVertical: 24, alignItems: "center" },
  footerText: { fontSize: 12, color: colors.mid },

  toast: {
    position: "absolute", bottom: 32, alignSelf: "center",
    backgroundColor: colors.ink, paddingHorizontal: 22, paddingVertical: 12,
    borderRadius: 100, shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12,
  },
  toastText: { color: colors.white, fontSize: 13, fontWeight: "600" },
});

const card = StyleSheet.create({
  wrap: {
    backgroundColor: colors.white, borderRadius: 10, borderWidth: 1,
    borderColor: colors.border, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, transitionDuration: "150ms",
  } as any,
  wrapHover: { shadowOpacity: 0.12, shadowOffset: { width: 0, height: 6 }, shadowRadius: 16, borderColor: colors.mid },
  img: { width: "100%", height: 160, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center", borderBottomWidth: 1, borderBottomColor: colors.border },
  serviceImg: { backgroundColor: "#f0f4ff" },
  eventImg: { backgroundColor: "#fff4f0" },
  serviceEmoji: { fontSize: 32 },
  imgLabel: { fontSize: 11, color: colors.mid, letterSpacing: 0.5 },
  body: { padding: 14, gap: 6 },
  title: { fontSize: 14, fontWeight: "700", color: colors.ink, lineHeight: 19 },
  price: { fontSize: 18, fontWeight: "800", color: colors.ink, letterSpacing: -0.3 },
  meta: { fontSize: 12, color: colors.dark, marginTop: 2 },
  tags: { flexDirection: "row", gap: 6, marginTop: 6, flexWrap: "wrap" },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, borderWidth: 1, borderColor: colors.border },
  catTag: { backgroundColor: colors.bg, borderColor: colors.bg },
  freeTag: { backgroundColor: "#e8f5e9", borderColor: "#e8f5e9" },
  paidTag: { backgroundColor: "#fff8e1", borderColor: "#fff8e1" },
  tagText: { fontSize: 10, color: colors.dark, fontWeight: "500" },
  catTagText: { color: colors.mid },
  freeTagText: { color: "#2e7d32" },
  paidTagText: { color: "#f57f17" },
});

const m = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" },
  sheet: {
    backgroundColor: colors.white, borderRadius: 14, width: 480, maxHeight: "85%",
    shadowColor: "#000", shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.25, shadowRadius: 40, overflow: "hidden",
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  heading: { fontSize: 16, fontWeight: "700", color: colors.ink },
  closeBtn: { fontSize: 16, color: colors.mid, fontWeight: "300" },
  segmentRow: { flexDirection: "row", paddingHorizontal: 24, paddingVertical: 12, gap: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  segment: { flex: 1, paddingVertical: 7, borderRadius: 8, borderWidth: 1.5, borderColor: colors.border, alignItems: "center" },
  segmentActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  segmentText: { fontSize: 13, fontWeight: "600", color: colors.dark },
  segmentTextActive: { color: colors.white },
  body: { paddingHorizontal: 24, paddingTop: 4, paddingBottom: 24 },
  label: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5, color: colors.dark, marginTop: 16, marginBottom: 6, textTransform: "uppercase" },
  input: { borderWidth: 1.5, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: colors.ink, outlineStyle: "none" } as any,
  textarea: { minHeight: 80, textAlignVertical: "top" },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, borderColor: colors.border },
  pillOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  pillText: { fontSize: 12, color: colors.ink },
  pillTextOn: { color: colors.white, fontWeight: "600" },
  freeRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 16 },
  error: { fontSize: 12, color: "#D32F2F", marginTop: 12 },
  submitBtn: { backgroundColor: colors.ink, paddingVertical: 14, borderRadius: 10, alignItems: "center", marginTop: 20 },
  submitBtnDim: { opacity: 0.5 },
  submitText: { color: colors.white, fontSize: 14, fontWeight: "700" },
  photoRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  thumb: { width: 72, height: 72, borderRadius: 8, overflow: "hidden", position: "relative" },
  thumbImg: { width: 72, height: 72 },
  thumbOverlay: {
    position: "absolute", top: 0, right: 0, width: 20, height: 20,
    backgroundColor: "rgba(0,0,0,0.55)", borderBottomLeftRadius: 6,
    alignItems: "center", justifyContent: "center",
  },
  thumbX: { color: colors.white, fontSize: 11, fontWeight: "700" },
  addPhoto: {
    width: 72, height: 72, borderRadius: 8, borderWidth: 1.5,
    borderColor: colors.mid, borderStyle: "dashed", backgroundColor: colors.bg,
    alignItems: "center", justifyContent: "center", gap: 4,
  },
  addPhotoIcon: { fontSize: 20, color: colors.mid, lineHeight: 22 },
  addPhotoLabel: { fontSize: 9, color: colors.mid, letterSpacing: 0.3 },
});
