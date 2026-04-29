import { useEffect, useRef, useState, useCallback, memo } from "react";
import {
  View, Pressable, ScrollView,
  Switch, ActivityIndicator, Animated, useWindowDimensions, Image,
} from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
// @ts-ignore
import DatePicker from "react-datepicker";
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
import { Navbar } from "@/components/ui/navbar";
import { CreatePostModal, PostType} from "@/components/ui/createpostmodal";

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
            <Ionicons name="image-outline" size={40} color={colors.primary} style={{ opacity: 0.3 }} />
          </View>
        )}
        <CardContent className="p-4 gap-2">
          <Text className="text-sm font-bold text-foreground font-display leading-[19px]" numberOfLines={2}>{item.title}</Text>
          {item.seller_name && (
            <Text className="text-xs text-muted-foreground mt-0.5">by {item.seller_name}</Text>
          )}
          <Text className="text-xl font-extrabold font-display tracking-tight" style={{ color: item.is_free ? colors.success : colors.primary }}>{label}</Text>
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

// ─── Home Screen ──────────────────────────────────────────────────────────────

export default function HomeWebScreen() {
  const { user, token } = useAuth();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const { unreadCount } = useWebSocket();

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
      .then((d) => { if (d.listings) setListings(d.listings); });
  }, []);

  const fetchServices = useCallback(() => {
    if (!token) return;
    fetch(API.services, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { if (d.services) setServices(d.services); });
  }, [token]);

  const fetchEvents = useCallback(() => {
    if (!token) return;
    fetch(API.events, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { if (d.events) setEvents(d.events); });
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
  const contentWidth = Math.min(width - (isMobile ? 16 : 48), 1100);
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
      <Navbar
        query={query}
        onChangeQuery={setQuery}
        activeTab={activeTab}
        onTabChange={switchTab}
        onNewPost={() => setModalVisible(true)}
      />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* ── Banner ── */}
        <div className="banner-pattern" style={{ background: "linear-gradient(135deg, #8C0B42, #5E072D)" }}>
          <View className="px-6 py-6">
            <View className="self-center w-full flex-row items-center justify-between" style={{ maxWidth: contentWidth }}>
              <View className="flex-1 gap-1">
                <Text className="text-2xl font-bold text-primary-foreground tracking-tight font-display">
                  Welcome Back 
                </Text>
                <Text className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
                  {listings.length} listings · {services.length} services · {events.length} events
                </Text>
              </View>
            </View>
          </View>
        </div>

        {/* ── Main Content ── */}
        <View className="flex-row pt-8 pb-12 gap-6 self-center w-full" style={{ maxWidth: contentWidth, paddingHorizontal: isMobile ? 12 : 24 }}>

          {/* Sidebar */}
          {!isMobile && <View className="shrink-0" style={{ width: SIDEBAR }}>
            <Text className="text-[10px] font-extrabold tracking-[1.5px] text-muted-foreground uppercase mb-3 mt-1">Categories</Text>
            <Pressable
              className="py-2.5 px-3 rounded-md mb-1"
              style={!activeCategory ? { backgroundColor: colors.primaryLight } : undefined}
              onPress={() => setActiveCategory(null)}
            >
              <Text className="text-[13px] font-medium" style={{ color: !activeCategory ? colors.primary : colors.dark, fontWeight: !activeCategory ? "600" : "500" }}>All</Text>
            </Pressable>
            {currentCategories.map((c) => (
              <Pressable
                key={c}
                className="py-2.5 px-3 rounded-md mb-1"
                style={activeCategory === c ? { backgroundColor: colors.primaryLight } : undefined}
                onPress={() => setActiveCategory(activeCategory === c ? null : c)}
              >
                <Text className="text-[13px] font-medium" style={{ color: activeCategory === c ? colors.primary : colors.dark, fontWeight: activeCategory === c ? "600" : "500" }}>{c}</Text>
              </Pressable>
            ))}

            {activeTab === "listing" && (
              <>
                <Separator className="my-5" />
                <Text className="text-[10px] font-extrabold tracking-[1.5px] text-muted-foreground uppercase mb-3 mt-1">Condition</Text>
                <Pressable
                  className="py-2.5 px-3 rounded-md mb-1"
                  style={!activeCondition ? { backgroundColor: colors.primaryLight } : undefined}
                  onPress={() => setActiveCondition(null)}
                >
                  <Text className="text-[13px] font-medium" style={{ color: !activeCondition ? colors.primary : colors.dark, fontWeight: !activeCondition ? "600" : "500" }}>Any</Text>
                </Pressable>
                {CONDITIONS.map((c) => (
                  <Pressable
                    key={c}
                    className="py-2.5 px-3 rounded-md mb-1"
                    style={activeCondition === c ? { backgroundColor: colors.primaryLight } : undefined}
                    onPress={() => setActiveCondition(activeCondition === c ? null : c)}
                  >
                    <Text className="text-[13px] font-medium" style={{ color: activeCondition === c ? colors.primary : colors.dark, fontWeight: activeCondition === c ? "600" : "500" }}>{c}</Text>
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
