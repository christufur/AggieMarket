import { useEffect, useState } from "react";
import { View, ScrollView, ActivityIndicator, Pressable, Switch } from "react-native";
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
import { CONDITIONS, LISTING_CATEGORIES } from "@/constants/categories";
import { colors } from "@/theme/colors";

type ListingDetail = {
  id: string;
  seller_id: number;
  title: string;
  description: string;
  price: number | null;
  is_free: number;
  category: string;
  condition: string | null;
  status: string;
  view_count: number;
  created_at: string;
  seller_name: string | null;
  images: { url: string; sort_order: number }[];
};

export default function ListingDetailScreenWeb() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user, token } = useAuth();
  const { unreadCount } = useWebSocket();
  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [imgIdx, setImgIdx] = useState(0);
  const [saved, setSaved] = useState(false);
  const [savedId, setSavedId] = useState<number | null>(null);
  const [msgText, setMsgText] = useState("");
  const [msgSending, setMsgSending] = useState(false);
  const [msgError, setMsgError] = useState("");

  // Mark as Sold state
  const [soldOpen, setSoldOpen] = useState(false);
  const [soldBuyerId, setSoldBuyerId] = useState("");
  const [soldSaving, setSoldSaving] = useState(false);

  // Report state
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [reportSending, setReportSending] = useState(false);

  const REPORT_REASONS = ["Spam", "Inappropriate", "Counterfeit", "Other"];

  useEffect(() => {
    if (!id) return;
    fetch(API.listing(id))
      .then((r) => r.json())
      .then((data) => {
        if (data.listing) setListing(data.listing);
        else setError("Listing not found.");
      })
      .catch(() => setError("Could not load listing."))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id || !token) return;
    fetch(`${API.savedCheck}?listing_id=${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data) => { setSaved(data.saved); setSavedId(data.saved_id); });
  }, [id, token]);

  // Edit state
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editIsFree, setEditIsFree] = useState(false);
  const [editCategory, setEditCategory] = useState("");
  const [editCondition, setEditCondition] = useState("");
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
        body: JSON.stringify({ listing_id: id }),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.saved) { setSaved(true); setSavedId(data.saved.id); }
    }
  };

  const sendFirstMessage = async () => {
    if (!token || !listing || !msgText.trim()) return;
    setMsgSending(true);
    setMsgError("");
    try {
      const convRes = await fetch(API.conversations, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ seller_id: listing.seller_id, listing_id: listing.id }),
      });
      const convData = await convRes.json();
      if (!convData.conversation) { setMsgError("Could not start conversation."); return; }
      await fetch(API.conversationMessages(convData.conversation.id), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: msgText.trim() }),
      });
      router.push(`/inbox?conversation=${convData.conversation.id}`);
    } catch {
      setMsgError("Could not send message.");
    } finally {
      setMsgSending(false);
    }
  };

  const openEdit = () => {
    if (!listing) return;
    setEditTitle(listing.title);
    setEditDescription(listing.description);
    setEditPrice(listing.price != null ? String(listing.price) : "");
    setEditIsFree(!!listing.is_free);
    setEditCategory(listing.category);
    setEditCondition(listing.condition ?? "");
    setEditOpen(true);
  };

  const handleMarkSold = async () => {
    if (!token || !listing) return;
    setSoldSaving(true);
    try {
      const parsedBuyerId = soldBuyerId.trim() ? parseInt(soldBuyerId.trim(), 10) : null;
      const res = await fetch(API.markSold(listing.id), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ buyer_id: parsedBuyerId ?? null }),
      });
      if (res.ok) {
        setListing((prev) => prev ? { ...prev, status: "sold" } : prev);
        setSoldOpen(false);
        setSoldBuyerId("");
      }
    } finally { setSoldSaving(false); }
  };

  const handleReport = async () => {
    if (!token || !listing || !reportReason) return;
    setReportSending(true);
    try {
      const res = await fetch(API.reports, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ target_type: "listing", target_id: listing.id, reason: reportReason, description: "" }),
      });
      if (res.ok) {
        setReportSubmitted(true);
        setReportOpen(false);
      }
    } finally { setReportSending(false); }
  };

  const handleEditSave = async () => {
    if (!token || !listing) return;
    setSaving(true);
    try {
      const res = await fetch(API.listing(listing.id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDescription.trim(),
          price: editIsFree ? null : parseFloat(editPrice) || null,
          is_free: editIsFree ? 1 : 0,
          category: editCategory,
          condition: editCondition,
        }),
      });
      const data = await res.json();
      if (data.listing) {
        setListing((prev) => prev ? { ...prev, ...data.listing, images: prev.images } : prev);
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

  if (error || !listing) {
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

  const priceLabel = listing.is_free
    ? "Free"
    : listing.price != null
      ? `$${listing.price}`
      : "—";
  const date = new Date(listing.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const images = listing.images ?? [];
  const isOwner = String(listing.seller_id) === String(user?.id);

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
            <Text className="text-sm text-muted-foreground">Listing</Text>
          </View>
          <View className="flex-row items-center gap-2">
            <Pressable className="w-9 h-9 border-[1.5px] border-border rounded-lg items-center justify-center" onPress={() => router.push("/saved")} style={{ cursor: "pointer" as any }}>
              <Ionicons name="heart-outline" size={16} color={colors.dark} />
            </Pressable>
            <Pressable className="w-9 h-9 border-[1.5px] border-border rounded-lg items-center justify-center" onPress={() => router.push("/inbox")} style={{ position: "relative" as any, cursor: "pointer" as any }}>
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
            <Pressable className="w-9 h-9 border-[1.5px] border-border rounded-lg items-center justify-center" onPress={() => router.push("/profile")} style={{ cursor: "pointer" as any }}>
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
                    alt={listing.title}
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
                    <View className="flex-row items-center gap-2 flex-wrap">
                      <Text>{listing.title}</Text>
                      {listing.status === "sold" && (
                        <Badge variant="destructive"><Text>SOLD</Text></Badge>
                      )}
                    </View>
                  </CardTitle>
                  <Text
                    className="font-bold text-foreground"
                    style={{ fontSize: 24 }}
                  >
                    {priceLabel}
                  </Text>
                </View>

                <View className="flex-row gap-2" style={{ flexWrap: "wrap" }}>
                  {listing.condition && (
                    <Badge variant="outline">
                      <Text>{listing.condition}</Text>
                    </Badge>
                  )}
                  <Badge variant="secondary">
                    <Text>{listing.category}</Text>
                  </Badge>
                </View>
                {listing.status === "sold" && (
                  <View className="rounded-md px-4 py-2 items-center" style={{ backgroundColor: colors.errorLight }}>
                    <Text className="text-sm font-bold" style={{ color: colors.error }}>This listing has been sold</Text>
                  </View>
                )}
              </CardHeader>

              <Separator />

              <CardContent className="gap-4 pt-4">
                {listing.seller_name && (
                  <Pressable className="flex-row items-center gap-2" onPress={() => router.push(`/user/${listing.seller_id}`)}>
                    <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center" }}>
                      <Ionicons name="person" size={14} color={colors.primary} />
                    </View>
                    <Text className="text-sm font-semibold" style={{ color: colors.primary }}>{listing.seller_name}</Text>
                  </Pressable>
                )}

                <View>
                  <Text className="mb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Description
                  </Text>
                  <Text className="text-sm leading-relaxed text-foreground">
                    {listing.description || "No description provided."}
                  </Text>
                </View>

                <Separator />

                <View className="flex-row justify-between">
                  <Text className="text-xs text-muted-foreground">
                    Posted {date}
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    {listing.view_count} views
                  </Text>
                </View>

                {isOwner ? (
                  <View className="gap-3 mt-2">
                    <View className="flex-row items-center gap-3">
                      <Button variant="outline" className="flex-1" onPress={openEdit} style={{ cursor: "pointer" as any }}>
                        <Ionicons name="create-outline" size={16} color={colors.ink} />
                        <Text className="ml-2 text-sm font-semibold text-foreground">Edit</Text>
                      </Button>
                      <Button
                        variant="destructive"
                        className="flex-1"
                        style={{ cursor: "pointer" as any }}
                        onPress={async () => {
                          if (!window.confirm("Are you sure you want to delete this listing?")) return;
                          await fetch(API.listing(listing.id), {
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
                    {listing.status === "active" && (
                      <Button variant="outline" onPress={() => setSoldOpen(true)} disabled={soldSaving} style={{ cursor: "pointer" as any }}>
                        {soldSaving ? (
                          <ActivityIndicator size="small" color={colors.ink} />
                        ) : (
                          <>
                            <Ionicons name="checkmark-circle-outline" size={16} color={colors.ink} />
                            <Text className="ml-2 text-sm font-semibold text-foreground">Mark as Sold</Text>
                          </>
                        )}
                      </Button>
                    )}
                  </View>
                ) : (
                  <View className="gap-3 mt-2">
                    {listing.status === "sold" ? (
                      <View className="rounded-md px-4 py-3 items-center" style={{ backgroundColor: colors.bg }}>
                        <Text className="text-sm text-muted-foreground text-center">This listing has been sold and is no longer available.</Text>
                      </View>
                    ) : (
                      <>
                        <View className="gap-1.5">
                          <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Message Seller
                          </Text>
                          <Textarea
                            value={msgText}
                            onChangeText={setMsgText}
                            placeholder="Hi, is this still available?"
                            numberOfLines={3}
                            editable={!msgSending}
                          />
                          {msgError ? (
                            <Text className="text-xs text-destructive">{msgError}</Text>
                          ) : null}
                        </View>
                        <View className="flex-row items-center gap-3">
                          <Button
                            className="flex-1"
                            onPress={sendFirstMessage}
                            disabled={msgSending || !msgText.trim()}
                          >
                            {msgSending ? (
                              <ActivityIndicator size="small" color={colors.white} />
                            ) : (
                              <>
                                <Ionicons name="send-outline" size={16} color={colors.white} />
                                <Text className="ml-2 text-sm font-semibold text-primary-foreground">Send</Text>
                              </>
                            )}
                          </Button>
                          <Pressable onPress={toggleSave} style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", cursor: "pointer" as any }}>
                            <Ionicons name={saved ? "heart" : "heart-outline"} size={22} color={colors.primary} />
                          </Pressable>
                        </View>
                      </>
                    )}
                    <View className="items-start">
                      {reportSubmitted ? (
                        <View className="flex-row items-center gap-1.5">
                          <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                          <Text className="text-xs text-muted-foreground">Report submitted.</Text>
                        </View>
                      ) : reportOpen ? (
                        <View className="gap-2 w-full">
                          <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Report reason</Text>
                          <View className="flex-row gap-2 flex-wrap">
                            {REPORT_REASONS.map((r) => (
                              <Pressable
                                key={r}
                                onPress={() => setReportReason(r)}
                                className="px-3 py-1.5 rounded-full border"
                                style={reportReason === r ? { backgroundColor: colors.primaryLight, borderColor: colors.primary, cursor: "pointer" as any } : { borderColor: colors.border, cursor: "pointer" as any }}
                              >
                                <Text className="text-xs font-semibold" style={{ color: reportReason === r ? colors.primary : colors.dark }}>{r}</Text>
                              </Pressable>
                            ))}
                          </View>
                          <View className="flex-row gap-2">
                            <Button variant="outline" onPress={() => { setReportOpen(false); setReportReason(""); }} style={{ cursor: "pointer" as any }}>
                              <Text className="text-xs">Cancel</Text>
                            </Button>
                            <Button onPress={handleReport} disabled={!reportReason || reportSending} style={{ cursor: "pointer" as any }}>
                              {reportSending ? (
                                <ActivityIndicator size="small" color={colors.white} />
                              ) : (
                                <Text className="text-xs text-primary-foreground">Submit</Text>
                              )}
                            </Button>
                          </View>
                        </View>
                      ) : (
                        <Pressable onPress={() => setReportOpen(true)} style={{ cursor: "pointer" as any }}>
                          <Text className="text-xs text-muted-foreground underline">Report listing</Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                )}
              </CardContent>
            </Card>
          </View>
        </View>
      </View>
      {/* Mark as Sold Dialog */}
      <Dialog open={soldOpen} onOpenChange={setSoldOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle><Text>Mark as Sold</Text></DialogTitle>
          </DialogHeader>
          <View className="gap-4">
            <Text className="text-sm text-muted-foreground">This will mark the listing as sold and create a transaction record.</Text>
            <View className="gap-1.5">
              <Text className="text-sm font-medium text-foreground">Buyer's user ID (optional)</Text>
              <Input
                value={soldBuyerId}
                onChangeText={setSoldBuyerId}
                placeholder="e.g. 42"
                keyboardType="numeric"
              />
            </View>
          </View>
          <DialogFooter>
            <Button variant="outline" onPress={() => { setSoldOpen(false); setSoldBuyerId(""); }}>
              <Text>Cancel</Text>
            </Button>
            <Button onPress={handleMarkSold} disabled={soldSaving}>
              <Text className="text-primary-foreground">{soldSaving ? "Saving..." : "Confirm"}</Text>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Listing Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle><Text>Edit Listing</Text></DialogTitle>
          </DialogHeader>
          <View className="gap-4">
            <View className="gap-1.5">
              <Text className="text-sm font-medium text-foreground">Title</Text>
              <Input value={editTitle} onChangeText={setEditTitle} placeholder="Listing title" />
            </View>
            <View className="gap-1.5">
              <Text className="text-sm font-medium text-foreground">Description</Text>
              <Textarea value={editDescription} onChangeText={setEditDescription} placeholder="Describe your item..." numberOfLines={3} />
            </View>
            <View className="gap-1.5">
              <Text className="text-sm font-medium text-foreground">Condition</Text>
              <View className="flex-row gap-2 flex-wrap">
                {CONDITIONS.map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => setEditCondition(c)}
                    className="px-3 py-1.5 rounded-full border"
                    style={editCondition === c ? { backgroundColor: colors.primaryLight, borderColor: colors.primary } : { borderColor: colors.border }}
                  >
                    <Text className="text-xs font-semibold" style={{ color: editCondition === c ? colors.primary : colors.dark }}>{c}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <View className="gap-1.5">
              <Text className="text-sm font-medium text-foreground">Category</Text>
              <View className="flex-row gap-2 flex-wrap">
                {LISTING_CATEGORIES.map((c) => (
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
            <View className="flex-row justify-between items-center">
              <Text className="text-sm font-medium text-foreground">Free item</Text>
              <Switch value={editIsFree} onValueChange={setEditIsFree} />
            </View>
            {!editIsFree && (
              <View className="gap-1.5">
                <Text className="text-sm font-medium text-foreground">Price</Text>
                <Input value={editPrice} onChangeText={setEditPrice} placeholder="10.00" keyboardType="decimal-pad" />
              </View>
            )}
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
