import { useEffect, useState, useCallback, useMemo, memo } from "react";
import {
  View, Pressable, ScrollView,
  Image, useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { colors } from "../theme/colors";
import { useAuth } from "../context/AuthContext";
import { useWebSocket } from "../context/WebSocketContext";
import { API } from "../constants/api";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/Avatar";
import { BottomNav } from "@/components/ui/BottomNav";
import { SiteHeader } from "@/components/ui/SiteHeader";

import {
  CONDITIONS, LISTING_CATEGORIES, SERVICE_CATEGORIES, EVENT_CATEGORIES,
} from "@/constants/categories";
import { priceLabel, fmtDate as formatDate } from "@/lib/utils";

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
  is_past?: number;
};

type TabType = "listing" | "service" | "event";

const TAB_LABELS: { key: TabType; label: string }[] = [
  { key: "listing", label: "Listings" },
  { key: "service", label: "Services" },
  { key: "event",   label: "Events"   },
];

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
  const isPast = !!item.is_past || new Date(item.starts_at).getTime() < Date.now();

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
          opacity: isPast ? 0.78 : 1,
        } as any}
      >
        <View style={{ position: "relative" }}>
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
          {isPast && (
            <View style={{
              position: "absolute", top: 8, left: 8,
              backgroundColor: colors.dark, borderRadius: 6,
              paddingHorizontal: 8, paddingVertical: 3,
            }}>
              <Text style={{ color: "#fff", fontSize: 10, fontWeight: "800", letterSpacing: 0.4 }}>PAST DATE</Text>
            </View>
          )}
        </View>
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

// ─── Browse Screen ────────────────────────────────────────────────────────────

export default function BrowseScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { unreadCount } = useWebSocket();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ tab?: string }>();

  const initialTab: TabType = useMemo(() => {
    const t = (Array.isArray(params.tab) ? params.tab[0] : params.tab) || "listing";
    return (t === "service" || t === "event" || t === "listing") ? t : "listing";
  }, [params.tab]);

  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [listings, setListings] = useState<Listing[]>([]);
  const [listingResults, setListingResults] = useState<Listing[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeCondition, setActiveCondition] = useState<string | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);

  // Extended filters
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [freeOnly, setFreeOnly] = useState(false);
  const [sortBy, setSortBy] = useState<"newest" | "price_asc" | "price_desc">("newest");
  const [dateFilter, setDateFilter] = useState<"any" | "today" | "week" | "month">("any");

  // Per-section collapse state — start every section collapsed
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [openSections, setOpenSections] = useState<{
    sort: boolean; price: boolean; category: boolean; condition: boolean; freeOnly: boolean; when: boolean;
  }>({ sort: false, price: false, category: false, condition: false, freeOnly: false, when: false });
  const toggleSection = useCallback((k: "sort" | "price" | "category" | "condition" | "freeOnly" | "when") => {
    setOpenSections((s) => ({ ...s, [k]: !s[k] }));
  }, []);

  const [loadingListings, setLoadingListings] = useState(true);
  const [loadingServices, setLoadingServices] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [errorListings, setErrorListings] = useState(false);
  const [errorServices, setErrorServices] = useState(false);
  const [errorEvents, setErrorEvents] = useState(false);

  // Sync route param into state if it changes
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

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
    const p = new URLSearchParams();
    const trimmed = searchQuery.trim();
    if (trimmed) p.set("q", trimmed);
    if (category) p.set("category", category);
    if (condition) p.set("condition", condition);
    p.set("limit", "100");
    const url = p.toString() ? `${API.search}?${p.toString()}` : API.search;

    setLoadingListings(true);
    fetch(url)
      .then((r) => r.json())
      .then((d) => { if (d.listings) setListingResults(d.listings); })
      .catch(() => {})
      .finally(() => setLoadingListings(false));
  }, []);

  // /services and /events are public endpoints — no auth required for read.
  const fetchServices = useCallback(() => {
    setLoadingServices(true);
    setErrorServices(false);
    fetch(API.services)
      .then((r) => r.json())
      .then((d) => { if (d.services) setServices(d.services); })
      .catch(() => setErrorServices(true))
      .finally(() => setLoadingServices(false));
  }, []);

  const fetchEvents = useCallback(() => {
    setLoadingEvents(true);
    setErrorEvents(false);
    fetch(API.events)
      .then((r) => r.json())
      .then((d) => { if (d.events) setEvents(d.events); })
      .catch(() => setErrorEvents(true))
      .finally(() => setLoadingEvents(false));
  }, []);

  // Reference listings to avoid unused warning (kept for parity / future feature)
  void listings;

  useEffect(() => {
    fetchListings();
    fetchServices();
    fetchEvents();
  }, [fetchListings, fetchServices, fetchEvents]);

  useEffect(() => {
    if (activeTab !== "listing") return;
    const t = setTimeout(() => {
      fetchListingResults(query, activeCategory, activeCondition);
    }, 200);
    return () => clearTimeout(t);
  }, [activeTab, activeCategory, activeCondition, query, fetchListingResults]);

  const switchTab = useCallback((tab: TabType) => {
    setActiveTab(tab);
    setActiveCategory(null);
    setActiveCondition(null);
    setQuery("");
  }, []);

  // Filtering
  function matchesCat(category: string, filter: string | null) {
    if (!filter) return true;
    return category.split(",").some((c) => c.trim().toLowerCase() === filter.toLowerCase());
  }

  const minP = priceMin.trim() === "" ? null : Number(priceMin);
  const maxP = priceMax.trim() === "" ? null : Number(priceMax);

  const filteredListings = useMemo(() => {
    let rows = listingResults.slice();
    if (freeOnly) rows = rows.filter((l) => !!l.is_free);
    if (minP != null && !Number.isNaN(minP))
      rows = rows.filter((l) => (l.is_free ? 0 : l.price ?? Infinity) >= minP);
    if (maxP != null && !Number.isNaN(maxP))
      rows = rows.filter((l) => (l.is_free ? 0 : l.price ?? Infinity) <= maxP);
    if (sortBy === "price_asc") {
      rows.sort((a, b) => (a.is_free ? 0 : a.price ?? Infinity) - (b.is_free ? 0 : b.price ?? Infinity));
    } else if (sortBy === "price_desc") {
      rows.sort((a, b) => (b.is_free ? 0 : b.price ?? -Infinity) - (a.is_free ? 0 : a.price ?? -Infinity));
    }
    return rows;
  }, [listingResults, freeOnly, minP, maxP, sortBy]);

  const filteredServices = useMemo(() => {
    let rows = services.filter((s) => {
      const matchQ = !query || s.title.toLowerCase().includes(query.toLowerCase());
      return matchQ && matchesCat(s.category, activeCategory);
    });
    if (minP != null && !Number.isNaN(minP))
      rows = rows.filter((s) => (s.price ?? Infinity) >= minP);
    if (maxP != null && !Number.isNaN(maxP))
      rows = rows.filter((s) => (s.price ?? Infinity) <= maxP);
    if (sortBy === "price_asc") {
      rows.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
    } else if (sortBy === "price_desc") {
      rows.sort((a, b) => (b.price ?? -Infinity) - (a.price ?? -Infinity));
    }
    return rows;
  }, [services, query, activeCategory, minP, maxP, sortBy]);

  const filteredEvents = useMemo(() => {
    let rows = events.filter((e) => {
      const matchQ = !query || e.title.toLowerCase().includes(query.toLowerCase());
      return matchQ && matchesCat(e.category, activeCategory);
    });
    if (freeOnly) rows = rows.filter((e) => !!e.is_free);
    if (dateFilter !== "any") {
      const now = Date.now();
      const horizons = {
        today: 24 * 60 * 60 * 1000,
        week: 7 * 24 * 60 * 60 * 1000,
        month: 30 * 24 * 60 * 60 * 1000,
      } as const;
      const limit = horizons[dateFilter];
      rows = rows.filter((e) => {
        const t = new Date(e.starts_at).getTime();
        return !isNaN(t) && t - now <= limit && t - now >= -24 * 60 * 60 * 1000;
      });
    }
    return rows;
  }, [events, query, activeCategory, freeOnly, dateFilter]);

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

  const emptyNoResultMsg =
    activeTab === "listing" ? "No listings found" :
    activeTab === "service" ? "No services found" :
    "No events found";

  // ── MOBILE ──────────────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.white }}>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        {/* Search bar (no top nav — BottomNav handles routing) */}
        <View style={{ backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bg, borderWidth: 1.5, borderColor: searchFocused ? colors.primary : colors.border, borderRadius: 10, paddingHorizontal: 12, height: 40, gap: 8 }}>
            <Ionicons name="search-outline" size={15} color={colors.dark} />
            <Input
              className="flex-1 text-[13px] border-0 h-auto p-0"
              placeholder={
                activeTab === 'listing' ? 'Search listings…' :
                activeTab === 'service' ? 'Search services…' :
                'Search events…'
              }
              placeholderTextColor={colors.mid}
              value={query}
              onChangeText={setQuery}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              style={{ outlineStyle: 'none', color: colors.ink, backgroundColor: 'transparent' } as any}
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery('')}>
                <Ionicons name="close-circle" size={16} color={colors.dark} />
              </Pressable>
            )}
          </View>
        </View>

        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 14, paddingBottom: 100 } as any}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <Text style={{ fontSize: 20, fontWeight: '800', letterSpacing: -0.4, color: colors.ink }}>
              All {TAB_LABELS.find(t => t.key === activeTab)?.label}
            </Text>
          </View>

          {/* Tab pills */}
          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 14 }}>
            {TAB_LABELS.map(({ key, label }) => (
              <Pressable key={key} onPress={() => switchTab(key)}
                style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: activeTab === key ? colors.primary : colors.bg, borderWidth: 1.5, borderColor: activeTab === key ? colors.primary : colors.border }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: activeTab === key ? colors.white : colors.ink }}>{label}</Text>
              </Pressable>
            ))}
          </View>

          {/* ── Filter sidebar (mobile) — collapsed by default ── */}
          <View style={{ backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, marginBottom: 14 }}>
            <Pressable
              onPress={() => setFiltersOpen(!filtersOpen)}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: filtersOpen ? 10 : 0, borderBottomWidth: filtersOpen ? 1 : 0, borderBottomColor: colors.border, marginBottom: filtersOpen ? 6 : 0 }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="options-outline" size={16} color={colors.ink} />
                <Text style={{ fontSize: 14, fontWeight: '800', color: colors.ink, letterSpacing: -0.2 }}>Filters</Text>
                {(activeCategory || activeCondition || priceMin || priceMax || freeOnly || sortBy !== 'newest') && (
                  <View style={{ backgroundColor: colors.primary, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 1 }}>
                    <Text style={{ color: colors.white, fontSize: 10, fontWeight: '800' }}>Active</Text>
                  </View>
                )}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                {filtersOpen && (
                  <Pressable
                    onPress={(e: any) => { e.stopPropagation?.(); setActiveCategory(null); setActiveCondition(null); setPriceMin(''); setPriceMax(''); setFreeOnly(false); setSortBy('newest'); }}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>Clear all</Text>
                  </Pressable>
                )}
                <Ionicons name={filtersOpen ? 'chevron-up' : 'chevron-down'} size={16} color={colors.dark} />
              </View>
            </Pressable>

            {filtersOpen && (
            <>

            {/* Category */}
            <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Pressable
                onPress={() => toggleSection('category')}
                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 }}
              >
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.dark, letterSpacing: 0.4, textTransform: 'uppercase' }}>
                  Category{activeCategory ? ` · ${activeCategory}` : ''}
                </Text>
                <Ionicons name={openSections.category ? 'chevron-up' : 'chevron-down'} size={14} color={colors.dark} />
              </Pressable>
              {openSections.category && (
                <View style={{ paddingBottom: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  <Pressable onPress={() => setActiveCategory(null)}
                    style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1.5, borderColor: activeCategory === null ? colors.primary : colors.border, backgroundColor: activeCategory === null ? colors.primaryLight : colors.white }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: activeCategory === null ? colors.primary : colors.dark }}>All</Text>
                  </Pressable>
                  {currentCategories.map((cat) => (
                    <Pressable key={cat} onPress={() => setActiveCategory(cat)}
                      style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1.5, borderColor: activeCategory === cat ? colors.primary : colors.border, backgroundColor: activeCategory === cat ? colors.primaryLight : colors.white }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: activeCategory === cat ? colors.primary : colors.dark }}>{cat}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            {/* Condition (listing only) */}
            {activeTab === 'listing' && (
              <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <Pressable
                  onPress={() => toggleSection('condition')}
                  hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.dark, letterSpacing: 0.4, textTransform: 'uppercase' }}>
                    Condition{activeCondition ? ` · ${activeCondition}` : ''}
                  </Text>
                  <Ionicons name={openSections.condition ? 'chevron-up' : 'chevron-down'} size={14} color={colors.dark} />
                </Pressable>
                {openSections.condition && (
                  <View style={{ paddingBottom: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    <Pressable onPress={() => setActiveCondition(null)}
                      style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1.5, borderColor: activeCondition === null ? colors.primary : colors.border, backgroundColor: activeCondition === null ? colors.primaryLight : colors.white }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: activeCondition === null ? colors.primary : colors.dark }}>Any</Text>
                    </Pressable>
                    {CONDITIONS.map((c) => (
                      <Pressable key={c} onPress={() => setActiveCondition(c)}
                        style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1.5, borderColor: activeCondition === c ? colors.primary : colors.border, backgroundColor: activeCondition === c ? colors.primaryLight : colors.white }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: activeCondition === c ? colors.primary : colors.dark }}>{c}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Sort */}
            {activeTab !== 'event' && (
              <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <Pressable
                  onPress={() => toggleSection('sort')}
                  hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.dark, letterSpacing: 0.4, textTransform: 'uppercase' }}>Sort by</Text>
                  <Ionicons name={openSections.sort ? 'chevron-up' : 'chevron-down'} size={14} color={colors.dark} />
                </Pressable>
                {openSections.sort && (
                  <View style={{ paddingBottom: 12, gap: 6 }}>
                    {([
                      { k: 'newest' as const, label: 'Newest' },
                      { k: 'price_asc' as const, label: 'Price: low → high' },
                      { k: 'price_desc' as const, label: 'Price: high → low' },
                    ]).map(({ k, label }) => (
                      <Pressable key={k} onPress={() => setSortBy(k)}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 }}>
                        <View style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, borderColor: sortBy === k ? colors.primary : colors.border, alignItems: 'center', justifyContent: 'center' }}>
                          {sortBy === k && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary }} />}
                        </View>
                        <Text style={{ fontSize: 13, color: colors.ink, fontWeight: sortBy === k ? '700' : '500' }}>{label}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Price */}
            {(activeTab === 'listing' || activeTab === 'service') && (
              <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <Pressable
                  onPress={() => toggleSection('price')}
                  hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.dark, letterSpacing: 0.4, textTransform: 'uppercase' }}>Price range</Text>
                  <Ionicons name={openSections.price ? 'chevron-up' : 'chevron-down'} size={14} color={colors.dark} />
                </Pressable>
                {openSections.price && (
                  <View style={{ paddingBottom: 12, flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <Input
                      placeholder="Min $"
                      keyboardType="numeric"
                      value={priceMin}
                      onChangeText={setPriceMin}
                      style={{ flex: 1, height: 38, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 10, fontSize: 13 } as any}
                    />
                    <Text style={{ color: colors.dark, fontSize: 12 }}>to</Text>
                    <Input
                      placeholder="Max $"
                      keyboardType="numeric"
                      value={priceMax}
                      onChangeText={setPriceMax}
                      style={{ flex: 1, height: 38, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 10, fontSize: 13 } as any}
                    />
                  </View>
                )}
              </View>
            )}

            {/* Free only */}
            {(activeTab === 'listing' || activeTab === 'event') && (
              <View>
                <Pressable
                  onPress={() => setFreeOnly(!freeOnly)}
                  hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 }}
                >
                  <View>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.dark, letterSpacing: 0.4, textTransform: 'uppercase' }}>Free only</Text>
                    <Text style={{ fontSize: 11, color: colors.mid, marginTop: 2 }}>Hide paid {activeTab === 'listing' ? 'listings' : 'events'}</Text>
                  </View>
                  <View style={{ width: 40, height: 22, borderRadius: 11, backgroundColor: freeOnly ? colors.success : colors.border, padding: 2, justifyContent: 'center' }}>
                    <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: colors.white, alignSelf: freeOnly ? 'flex-end' : 'flex-start' }} />
                  </View>
                </Pressable>
              </View>
            )}
            </>
            )}
          </View>

          {/* Grid */}
          {isLoading ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 }}>
              {[1,2,3,4].map(i => <View key={i} style={{ width: '48%' }}><SkeletonCard /></View>)}
            </View>
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
            </View>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 }}>
              {activeTab === 'listing' && filteredListings.map(item => {
                const priceLabel = item.is_free ? 'Free' : item.price != null ? `$${item.price}` : '—';
                return (
                  <Pressable key={item.id} onPress={() => router.push(`/listing/${item.id}`)}
                    style={{ width: '48%', backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 12, overflow: 'hidden' }}>
                    {item.image_url ? (
                      <Image source={{ uri: API.mediaUrl(item.image_url) }} style={{ width: '100%' as any, aspectRatio: 1 }} resizeMode="cover" />
                    ) : (
                      <View style={{ width: '100%' as any, aspectRatio: 1, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="image-outline" size={32} color={colors.primary} style={{ opacity: 0.3 }} />
                      </View>
                    )}
                    <View style={{ padding: 10, gap: 2 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink }} numberOfLines={1}>{item.title}</Text>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: item.is_free ? colors.success : colors.primary }} numberOfLines={1}>{priceLabel}</Text>
                      <Text style={{ fontSize: 11, color: colors.dark }} numberOfLines={1}>by {item.seller_name || 'Aggie'}</Text>
                    </View>
                  </Pressable>
                );
              })}
              {activeTab === 'service' && filteredServices.map(item => {
                const priceStr = item.price != null ? `$${item.price}${item.price_type === 'hourly' ? '/hr' : ''}` : 'Contact';
                return (
                  <Pressable key={item.id} onPress={() => router.push(`/service/${item.id}`)}
                    style={{ width: '48%', backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 12, overflow: 'hidden' }}>
                    {item.image_url ? (
                      <Image source={{ uri: API.mediaUrl(item.image_url) }} style={{ width: '100%' as any, aspectRatio: 1 }} resizeMode="cover" />
                    ) : (
                      <View style={{ width: '100%' as any, aspectRatio: 1, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="construct-outline" size={32} color={colors.primary} style={{ opacity: 0.3 }} />
                      </View>
                    )}
                    <View style={{ padding: 10, gap: 2 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink }} numberOfLines={1}>{item.title}</Text>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: colors.primary }} numberOfLines={1}>{priceStr}</Text>
                      <Text style={{ fontSize: 11, color: colors.dark }} numberOfLines={1}>by {item.provider_name || 'Aggie'}</Text>
                    </View>
                  </Pressable>
                );
              })}
              {activeTab === 'event' && filteredEvents.map(item => {
                const priceStr = item.is_free ? 'Free' : item.ticket_price != null ? `$${item.ticket_price}` : 'Paid';
                return (
                  <Pressable key={item.id} onPress={() => router.push(`/event/${item.id}`)}
                    style={{ width: '48%', backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 12, overflow: 'hidden' }}>
                    {item.image_url ? (
                      <Image source={{ uri: API.mediaUrl(item.image_url) }} style={{ width: '100%' as any, aspectRatio: 1 }} resizeMode="cover" />
                    ) : (
                      <View style={{ width: '100%' as any, aspectRatio: 1, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="calendar-outline" size={32} color={colors.primary} style={{ opacity: 0.3 }} />
                      </View>
                    )}
                    <View style={{ padding: 10, gap: 2 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink }} numberOfLines={1}>{item.title}</Text>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: item.is_free ? colors.success : colors.primary }} numberOfLines={1}>{priceStr}</Text>
                      <Text style={{ fontSize: 11, color: colors.dark }} numberOfLines={1}>by {item.organizer_name || 'Aggie'}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </ScrollView>

        <BottomNav
          active="browse"
          unreadCount={unreadCount}
          onPress={k => {
            if (k === 'home')   router.push('/home');
            if (k === 'inbox')  router.push('/inbox');
            if (k === 'me')     router.push('/profile');
          }}
        />
      </View>
      </SafeAreaView>
    );
  }

  // ── DESKTOP ─────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SiteHeader
        crumb="Browse"
        query={query}
        onQueryChange={setQuery}
        searchPlaceholder={
          activeTab === 'listing' ? 'Search listings…' :
          activeTab === 'service' ? 'Search services…' :
          'Search events…'
        }
      />

      {/* Main content */}
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <div
          style={{
            maxWidth: 1320,
            margin: "0 auto",
            width: "100%",
            padding: 28,
            paddingBottom: 60,
            display: "grid",
            gridTemplateColumns: "260px 1fr",
            gap: 28,
            alignItems: "start",
          } as any}
        >
          {/* ── Left filter sidebar ── */}
          <View style={{ position: 'sticky' as any, top: 88, alignSelf: 'flex-start' }}>
            <View style={{ backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 16, gap: 6 }}>
              {/* Header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 6 }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: colors.ink, letterSpacing: -0.2 }}>Filters</Text>
                <Pressable
                  onPress={() => {
                    setActiveCategory(null);
                    setActiveCondition(null);
                    setPriceMin('');
                    setPriceMax('');
                    setFreeOnly(false);
                    setSortBy('newest');
                    setDateFilter('any');
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '600', color: colors.primary }}>Clear all</Text>
                </Pressable>
              </View>

              {/* Sort */}
              {activeTab !== 'event' && (
                <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 10, marginBottom: 4 }}>
                  <Pressable
                    onPress={() => toggleSection('sort')}
                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.dark, letterSpacing: 0.4, textTransform: 'uppercase' as any }}>Sort by</Text>
                    <Ionicons name={openSections.sort ? 'chevron-up' : 'chevron-down'} size={14} color={colors.dark} />
                  </Pressable>
                  {openSections.sort && (
                    <View style={{ gap: 2, marginTop: 4 }}>
                      {([
                        { k: 'newest', l: 'Newest' },
                        { k: 'price_asc', l: 'Price: low to high' },
                        { k: 'price_desc', l: 'Price: high to low' },
                      ] as const).map(({ k, l }) => (
                        <Pressable
                          key={k}
                          onPress={() => setSortBy(k)}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5 }}
                        >
                          <View style={{
                            width: 14, height: 14, borderRadius: 999,
                            borderWidth: 1.5, borderColor: sortBy === k ? colors.primary : colors.border,
                            alignItems: 'center', justifyContent: 'center',
                          }}>
                            {sortBy === k && <View style={{ width: 6, height: 6, borderRadius: 999, backgroundColor: colors.primary }} />}
                          </View>
                          <Text style={{ fontSize: 12, color: colors.ink }}>{l}</Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* Price range (listings + services) — directly after Sort */}
              {activeTab !== 'event' && (
                <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 10, marginBottom: 4 }}>
                  <Pressable
                    onPress={() => toggleSection('price')}
                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.dark, letterSpacing: 0.4, textTransform: 'uppercase' as any }}>Price</Text>
                    <Ionicons name={openSections.price ? 'chevron-up' : 'chevron-down'} size={14} color={colors.dark} />
                  </Pressable>
                  {openSections.price && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, width: '100%' as any }}>
                      <View style={{ flex: 1, minWidth: 0 } as any}>
                        <Input
                          placeholder="Min"
                          value={priceMin}
                          onChangeText={setPriceMin}
                          keyboardType="numeric"
                          className="h-9 text-[12px]"
                          style={{ outlineStyle: 'none', width: '100%', minWidth: 0 } as any}
                        />
                      </View>
                      <Text style={{ color: colors.mid }}>–</Text>
                      <View style={{ flex: 1, minWidth: 0 } as any}>
                        <Input
                          placeholder="Max"
                          value={priceMax}
                          onChangeText={setPriceMax}
                          keyboardType="numeric"
                          className="h-9 text-[12px]"
                          style={{ outlineStyle: 'none', width: '100%', minWidth: 0 } as any}
                        />
                      </View>
                    </View>
                  )}
                </View>
              )}

              {/* Categories */}
              <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 10, marginBottom: 4 }}>
                <Pressable
                  onPress={() => toggleSection('category')}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.dark, letterSpacing: 0.4, textTransform: 'uppercase' as any }}>Category</Text>
                  <Ionicons name={openSections.category ? 'chevron-up' : 'chevron-down'} size={14} color={colors.dark} />
                </Pressable>
                {openSections.category && (
                  <View style={{ marginTop: 4 }}>
                    <Pressable
                      onPress={() => setActiveCategory(null)}
                      style={{
                        paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6,
                        backgroundColor: activeCategory === null ? colors.primaryLight : 'transparent',
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: activeCategory === null ? '700' : '500', color: activeCategory === null ? colors.primary : colors.ink }}>All categories</Text>
                    </Pressable>
                    {currentCategories.map((cat) => (
                      <Pressable
                        key={cat}
                        onPress={() => setActiveCategory(cat === activeCategory ? null : cat)}
                        style={{
                          paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6,
                          backgroundColor: activeCategory === cat ? colors.primaryLight : 'transparent',
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: activeCategory === cat ? '700' : '500', color: activeCategory === cat ? colors.primary : colors.ink }}>{cat}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>

              {/* Condition (listings only) */}
              {activeTab === 'listing' && (
                <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 10, marginBottom: 4 }}>
                  <Pressable
                    onPress={() => toggleSection('condition')}
                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.dark, letterSpacing: 0.4, textTransform: 'uppercase' as any }}>Condition</Text>
                    <Ionicons name={openSections.condition ? 'chevron-up' : 'chevron-down'} size={14} color={colors.dark} />
                  </Pressable>
                  {openSections.condition && (
                    <View style={{ marginTop: 4 }}>
                      <Pressable
                        onPress={() => setActiveCondition(null)}
                        style={{
                          paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6,
                          backgroundColor: activeCondition === null ? colors.primaryLight : 'transparent',
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: activeCondition === null ? '700' : '500', color: activeCondition === null ? colors.primary : colors.ink }}>Any condition</Text>
                      </Pressable>
                      {CONDITIONS.map((c) => (
                        <Pressable
                          key={c}
                          onPress={() => setActiveCondition(c === activeCondition ? null : c)}
                          style={{
                            paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6,
                            backgroundColor: activeCondition === c ? colors.primaryLight : 'transparent',
                          }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: activeCondition === c ? '700' : '500', color: activeCondition === c ? colors.primary : colors.ink }}>{c}</Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* Free only (listings + events) */}
              {activeTab !== 'service' && (
                <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 10, marginBottom: 4 }}>
                  <Pressable
                    onPress={() => toggleSection('freeOnly')}
                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.dark, letterSpacing: 0.4, textTransform: 'uppercase' as any }}>Price tier</Text>
                    <Ionicons name={openSections.freeOnly ? 'chevron-up' : 'chevron-down'} size={14} color={colors.dark} />
                  </Pressable>
                  {openSections.freeOnly && (
                    <Pressable
                      onPress={() => setFreeOnly(!freeOnly)}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, paddingVertical: 4 }}
                    >
                      <View style={{
                        width: 16, height: 16, borderRadius: 4,
                        borderWidth: 1.5, borderColor: freeOnly ? colors.primary : colors.border,
                        backgroundColor: freeOnly ? colors.primary : 'transparent',
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        {freeOnly && <Ionicons name="checkmark" size={12} color={colors.white} />}
                      </View>
                      <Text style={{ fontSize: 12, color: colors.ink, fontWeight: '600' }}>Free only</Text>
                    </Pressable>
                  )}
                </View>
              )}

              {/* Date filter (events only) */}
              {activeTab === 'event' && (
                <View>
                  <Pressable
                    onPress={() => toggleSection('when')}
                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.dark, letterSpacing: 0.4, textTransform: 'uppercase' as any }}>When</Text>
                    <Ionicons name={openSections.when ? 'chevron-up' : 'chevron-down'} size={14} color={colors.dark} />
                  </Pressable>
                  {openSections.when && (
                    <View style={{ gap: 2, marginTop: 4 }}>
                      {([
                        { k: 'any', l: 'Anytime' },
                        { k: 'today', l: 'Today' },
                        { k: 'week', l: 'This week' },
                        { k: 'month', l: 'This month' },
                      ] as const).map(({ k, l }) => (
                        <Pressable
                          key={k}
                          onPress={() => setDateFilter(k)}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5 }}
                        >
                          <View style={{
                            width: 14, height: 14, borderRadius: 999,
                            borderWidth: 1.5, borderColor: dateFilter === k ? colors.primary : colors.border,
                            alignItems: 'center', justifyContent: 'center',
                          }}>
                            {dateFilter === k && <View style={{ width: 6, height: 6, borderRadius: 999, backgroundColor: colors.primary }} />}
                          </View>
                          <Text style={{ fontSize: 12, color: colors.ink }}>{l}</Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>

          {/* ── Main results column ── */}
          <View>
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
            </View>

            {/* Tab pills */}
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 20 }}>
              {TAB_LABELS.map(({ key, label }) => (
                <Pressable key={key} onPress={() => switchTab(key)}
                  style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, backgroundColor: activeTab === key ? colors.primary : colors.white, borderWidth: 1.5, borderColor: activeTab === key ? colors.primary : colors.border }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: activeTab === key ? colors.white : colors.dark }}>{label}</Text>
                </Pressable>
              ))}
            </View>

            {/* Grid */}
            {isLoading ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 20 } as any}>
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
              </View>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 20 } as any}>
                {activeTab === 'listing' && filteredListings.map(item => <ListingCard key={item.id} item={item} />)}
                {activeTab === 'service' && filteredServices.map(item => <ServiceCard key={item.id} item={item} />)}
                {activeTab === 'event'   && filteredEvents.map(item => <EventCard key={item.id} item={item} />)}
              </div>
            )}
          </View>
        </div>
      </ScrollView>
    </View>
  );
}
