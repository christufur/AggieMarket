import { useEffect, useRef, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, Alert, Modal,
  TextInput, TouchableOpacity, Switch, ActivityIndicator,
  Platform, Animated, Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { TopNav, SectionHeader, CardH } from "../components";
import { colors } from "../theme/colors";
import { useAuth } from "../context/AuthContext";
import { API } from "../constants/api";

type Listing = {
  id: string;
  title: string;
  price: number | null;
  is_free: number;
  category: string;
  condition: string | null;
  image_url: string | null;
};

type Service = {
  id: string;
  title: string;
  price: number | null;
  price_type: string | null;
  image_url: string | null;
};

type Event = {
  id: string;
  title: string;
  starts_at: string;
  is_free: number;
  ticket_price: number | null;
  image_url: string | null;
};

type PostType = "listing" | "service" | "event";

type PostForm = {
  title: string;
  description: string;
  categories: string[];
  // listing
  condition: string;
  price: string;
  isFree: boolean;
  // service
  priceType: string;
  availability: string;
  // event
  location: string;
  startsAt: string;
  endsAt: string;
  eventFree: boolean;
  ticketPrice: string;
};

const CONDITIONS = ["New", "Like New", "Good", "Fair", "For Parts"];
const LISTING_CATEGORIES = ["Textbooks", "Furniture", "Electronics", "Clothing", "Other"];
const SERVICE_CATEGORIES = ["Tutoring", "Design", "Tech", "Writing", "Music", "Other"];
const EVENT_CATEGORIES = ["Academic", "Social", "Career", "Sports", "Other"];
const PRICE_TYPES = ["hourly", "flat", "starting_at"];

const EMPTY_FORM: PostForm = {
  title: "",
  description: "",
  categories: [],
  condition: "Good",
  price: "",
  isFree: false,
  priceType: "hourly",
  availability: "",
  location: "",
  startsAt: "",
  endsAt: "",
  eventFree: true,
  ticketPrice: "",
};


function Toast({ message, visible }: { message: string; visible: boolean }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.delay(1600),
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  return (
    <Animated.View style={[toast.wrap, { opacity }]} pointerEvents="none">
      <Text style={toast.text}>✓ {message}</Text>
    </Animated.View>
  );
}

function CreatePostModal({
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
  const [images, setImages] = useState<ImagePicker.ImagePickerAsset[]>([]);

  function set<K extends keyof PostForm>(key: K, value: PostForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function switchType(t: PostType) {
    setPostType(t);
    setForm({ ...EMPTY_FORM, title: form.title, description: form.description });
  }

  async function pickImages() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Allow photo access to add images.");
      return;
    }
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
      formData.append("file", { uri: asset.uri, name: filename, type } as any);

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

  async function save() {
    if (!form.title.trim()) {
      Alert.alert("Missing title", "Please enter a title.");
      return;
    }
    if (!form.categories.length) {
      Alert.alert("Missing category", "Please select at least one category.");
      return;
    }
    if (!token) {
      Alert.alert("Not logged in", "Please log in first.");
      return;
    }

    let body: Record<string, any> = {
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.categories.join(","),
    };
    let url = API.listings;

    if (postType === "listing") {
      if (!form.isFree) {
        const parsed = parseFloat(form.price);
        if (!form.price.trim() || isNaN(parsed) || parsed < 0) {
          Alert.alert("Invalid price", "Enter a valid price or mark the item as free.");
          return;
        }
      }
      body = { ...body, condition: form.condition, price: form.isFree ? null : parseFloat(form.price), is_free: form.isFree };
      url = API.listings;
    } else if (postType === "service") {
      body = { ...body, price: form.price ? parseFloat(form.price) : null, price_type: form.priceType, availability: form.availability.trim() || null };
      url = API.services;
    } else {
      if (!form.startsAt.trim()) {
        Alert.alert("Missing date", "Please enter a start date.");
        return;
      }
      if (!form.location.trim()) {
        Alert.alert("Missing location", "Please enter a location.");
        return;
      }
      body = {
        ...body,
        location: form.location.trim(),
        starts_at: form.startsAt.trim(),
        ends_at: form.endsAt.trim() || null,
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
        Alert.alert("Error", data.message || "Failed to post.");
      }
    } catch {
      Alert.alert("Error", "Could not connect to server.");
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
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === "ios" ? "pageSheet" : undefined}
    >
      <SafeAreaView style={modal.safe} edges={["top", "bottom"]}>
        <View style={modal.header}>
          <TouchableOpacity onPress={onClose} disabled={saving}>
            <Text style={[modal.cancel, saving && { opacity: 0.4 }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={modal.headerTitle}>New Post</Text>
          <TouchableOpacity onPress={save} disabled={saving}>
            {saving ? (
              <ActivityIndicator size="small" color={colors.ink} />
            ) : (
              <Text style={modal.post}>Post</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Type segmented control */}
        <View style={modal.segmentRow}>
          {typeLabels.map(({ key, label }) => (
            <TouchableOpacity
              key={key}
              style={[modal.segment, postType === key && modal.segmentActive]}
              onPress={() => switchType(key)}
              disabled={saving}
            >
              <Text style={[modal.segmentText, postType === key && modal.segmentTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView contentContainerStyle={modal.scrollContent}>
          {/* Photo picker */}
          <Text style={modal.label}>Photos</Text>
          <View style={modal.photoRow}>
            {images.map((img, i) => (
              <View key={i} style={modal.thumb}>
                <Image source={{ uri: img.uri }} style={modal.thumbImg} />
                <TouchableOpacity
                  style={modal.thumbRemove}
                  onPress={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                  disabled={saving}
                >
                  <Ionicons name="close-circle" size={18} color={colors.ink} />
                </TouchableOpacity>
              </View>
            ))}
            {images.length < 8 && (
              <TouchableOpacity style={modal.addPhoto} onPress={pickImages} disabled={saving}>
                <Ionicons name="add" size={22} color={colors.mid} />
              </TouchableOpacity>
            )}
          </View>

          <Text style={modal.label}>Title *</Text>
          <TextInput
            style={modal.input}
            placeholder={postType === "listing" ? "e.g. Calc Textbook" : postType === "service" ? "e.g. Math Tutoring" : "e.g. Spring Career Fair"}
            placeholderTextColor={colors.dark}
            value={form.title}
            onChangeText={(v) => set("title", v)}
            editable={!saving}
          />

          <Text style={modal.label}>Description</Text>
          <TextInput
            style={[modal.input, modal.textarea]}
            placeholder={postType === "event" ? "What's this event about?" : "Describe it…"}
            placeholderTextColor={colors.dark}
            value={form.description}
            onChangeText={(v) => set("description", v)}
            multiline
            numberOfLines={4}
            editable={!saving}
          />

          <Text style={modal.label}>Category</Text>
          <View style={modal.pills}>
            {categories.map((c) => (
              <TouchableOpacity
                key={c}
                style={[modal.pill, form.categories.includes(c) && modal.pillActive]}
                onPress={() => {
                  const next = form.categories.includes(c)
                    ? form.categories.filter((x) => x !== c)
                    : [...form.categories, c];
                  set("categories", next);
                }}
                disabled={saving}
              >
                <Text style={[modal.pillText, form.categories.includes(c) && modal.pillTextActive]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Listing-only fields */}
          {postType === "listing" && (
            <>
              <Text style={modal.label}>Condition</Text>
              <View style={modal.pills}>
                {CONDITIONS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[modal.pill, form.condition === c && modal.pillActive]}
                    onPress={() => set("condition", c)}
                    disabled={saving}
                  >
                    <Text style={[modal.pillText, form.condition === c && modal.pillTextActive]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={modal.row}>
                <Text style={modal.label}>Free item</Text>
                <Switch value={form.isFree} onValueChange={(v) => set("isFree", v)} disabled={saving} />
              </View>
              {!form.isFree && (
                <>
                  <Text style={modal.label}>Price *</Text>
                  <TextInput
                    style={modal.input}
                    placeholder="25.00"
                    placeholderTextColor={colors.dark}
                    value={form.price}
                    onChangeText={(v) => set("price", numericOnly(v))}
                    keyboardType="decimal-pad"
                    editable={!saving}
                  />
                </>
              )}
            </>
          )}

          {/* Service-only fields */}
          {postType === "service" && (
            <>
              <Text style={modal.label}>Price Type</Text>
              <View style={modal.pills}>
                {PRICE_TYPES.map((pt) => (
                  <TouchableOpacity
                    key={pt}
                    style={[modal.pill, form.priceType === pt && modal.pillActive]}
                    onPress={() => set("priceType", pt)}
                    disabled={saving}
                  >
                    <Text style={[modal.pillText, form.priceType === pt && modal.pillTextActive]}>
                      {pt === "starting_at" ? "Starting at" : pt.charAt(0).toUpperCase() + pt.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={modal.label}>Price</Text>
              <TextInput
                style={modal.input}
                placeholder="20.00"
                placeholderTextColor={colors.dark}
                value={form.price}
                onChangeText={(v) => set("price", numericOnly(v))}
                keyboardType="decimal-pad"
                editable={!saving}
              />
              <Text style={modal.label}>Availability</Text>
              <TextInput
                style={modal.input}
                placeholder="e.g. Weekends, MTTh 4–6pm"
                placeholderTextColor={colors.dark}
                value={form.availability}
                onChangeText={(v) => set("availability", v)}
                editable={!saving}
              />
            </>
          )}

          {/* Event-only fields */}
          {postType === "event" && (
            <>
              <Text style={modal.label}>Location *</Text>
              <TextInput
                style={modal.input}
                placeholder="e.g. Corbett Center, Room 203"
                placeholderTextColor={colors.dark}
                value={form.location}
                onChangeText={(v) => set("location", v)}
                editable={!saving}
              />
              <Text style={modal.label}>Start Date & Time *</Text>
              <TextInput
                style={modal.input}
                placeholder="YYYY-MM-DD HH:MM"
                placeholderTextColor={colors.dark}
                value={form.startsAt}
                onChangeText={(v) => set("startsAt", v)}
                editable={!saving}
              />
              <Text style={modal.label}>End Date & Time</Text>
              <TextInput
                style={modal.input}
                placeholder="YYYY-MM-DD HH:MM"
                placeholderTextColor={colors.dark}
                value={form.endsAt}
                onChangeText={(v) => set("endsAt", v)}
                editable={!saving}
              />
              <View style={modal.row}>
                <Text style={modal.label}>Free event</Text>
                <Switch value={form.eventFree} onValueChange={(v) => set("eventFree", v)} disabled={saving} />
              </View>
              {!form.eventFree && (
                <>
                  <Text style={modal.label}>Ticket Price *</Text>
                  <TextInput
                    style={modal.input}
                    placeholder="10.00"
                    placeholderTextColor={colors.dark}
                    value={form.ticketPrice}
                    onChangeText={(v) => set("ticketPrice", numericOnly(v))}
                    keyboardType="decimal-pad"
                    editable={!saving}
                  />
                </>
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

export default function HomeScreen() {
  const { user, token } = useAuth();
  const firstName = user?.name?.split(" ")[0] ?? "Aggie";
  const [listings, setListings] = useState<Listing[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [isCreateVisible, setCreateVisible] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("Posted!");

  function fetchListings() {
    fetch(API.listings)
      .then((r) => r.json())
      .then((data) => { if (data.listings) setListings(data.listings); })
      .catch(() => {});
  }

  function fetchServices() {
    if (!token) return;
    fetch(API.services, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => { if (data.services) setServices(data.services); })
      .catch(() => {});
  }

  function fetchEvents() {
    if (!token) return;
    fetch(API.events, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => { if (data.events) setEvents(data.events); })
      .catch(() => {});
  }

  useEffect(() => {
    fetchListings();
    fetchServices();
    fetchEvents();
  }, [token]);

  function handleSaved(type: PostType) {
    fetchListings();
    fetchServices();
    fetchEvents();
    setToastMessage(type === "listing" ? "Listing posted!" : type === "service" ? "Service posted!" : "Event posted!");
    setToastVisible(false);
    setTimeout(() => setToastVisible(true), 50);
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <TopNav onAdd={() => setCreateVisible(true)} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Welcome back, {firstName}</Text>
          <Text style={styles.heroSub}>
            Discover verified listings from NMSU students
          </Text>
        </View>

        <SectionHeader title="Popular Listings" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hStrip}>
          {listings.length === 0 ? (
            <Text style={styles.empty}>No listings yet</Text>
          ) : (
            listings.map((item) => (
              <CardH
                key={item.id}
                title={item.title}
                price={item.is_free ? "Free" : item.price != null ? `$${item.price}` : undefined}
                imageUrl={item.image_url ? API.mediaUrl(item.image_url) : undefined}
                listingId={item.id}
              />
            ))
          )}
        </ScrollView>

        <SectionHeader title="Popular Services" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hStrip}>
          {services.length === 0 ? (
            <Text style={styles.empty}>No services yet</Text>
          ) : (
            services.map((item) => (
              <CardH
                key={item.id}
                title={item.title}
                price={item.price != null ? `$${item.price}${item.price_type === "hourly" ? "/hr" : ""}` : undefined}
                imageUrl={item.image_url ? API.mediaUrl(item.image_url) : undefined}
                serviceId={item.id}
              />
            ))
          )}
        </ScrollView>

        <SectionHeader title="Events" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hStrip}>
          {events.length === 0 ? (
            <Text style={styles.empty}>No events yet</Text>
          ) : (
            events.map((item) => (
              <CardH
                key={item.id}
                title={item.title}
                sub={`${new Date(item.starts_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })} · ${item.is_free ? "Free" : `$${item.ticket_price}`}`}
                imageUrl={item.image_url ? API.mediaUrl(item.image_url) : undefined}
                eventId={item.id}
              />
            ))
          )}
        </ScrollView>
      </ScrollView>

      <Toast message={toastMessage} visible={toastVisible} />

      <CreatePostModal
        visible={isCreateVisible}
        onClose={() => setCreateVisible(false)}
        onSaved={handleSaved}
        token={token}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 24 },
  hero: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  heroTitle: { fontSize: 17, fontWeight: "700", color: colors.ink },
  heroSub: { fontSize: 11, color: colors.dark, marginTop: 3 },
  hStrip: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  empty: { fontSize: 12, color: colors.mid, paddingHorizontal: 16, paddingBottom: 14 },
});

const modal = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: 15, fontWeight: "700", color: colors.ink },
  cancel: { fontSize: 14, color: colors.dark },
  post: { fontSize: 14, fontWeight: "700", color: colors.ink },
  segmentRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  segment: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  segmentActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  segmentText: { fontSize: 13, fontWeight: "600", color: colors.dark },
  segmentTextActive: { color: colors.white },
  scrollContent: { padding: 16 },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.ink,
    marginTop: 12,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.ink,
  },
  textarea: { minHeight: 90, textAlignVertical: "top" },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  pillText: { fontSize: 12, color: colors.ink },
  pillTextActive: { color: colors.white, fontWeight: "600" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },
  photoRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  thumb: {
    width: 70,
    height: 70,
    borderRadius: 8,
    overflow: "hidden",
    position: "relative",
  },
  thumbImg: {
    width: 70,
    height: 70,
  },
  thumbRemove: {
    position: "absolute",
    top: 2,
    right: 2,
    backgroundColor: colors.white,
    borderRadius: 10,
  },
  addPhoto: {
    width: 70,
    height: 70,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.mid,
    borderStyle: "dashed",
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
});

const toast = StyleSheet.create({
  wrap: {
    position: "absolute",
    bottom: 32,
    alignSelf: "center",
    backgroundColor: colors.ink,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 100,
  },
  text: { color: colors.white, fontSize: 13, fontWeight: "600" },
});
