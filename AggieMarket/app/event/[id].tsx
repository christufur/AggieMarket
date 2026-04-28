import { useEffect, useState } from "react";
import { View, ScrollView, ActivityIndicator, Pressable, Linking, Switch } from "react-native";
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

type EventDetail = {
  id: string;
  organizer_id: number;
  title: string;
  description: string;
  category: string;
  location: string;
  is_online: number;
  starts_at: string;
  ends_at: string | null;
  is_free: number;
  ticket_price: number | null;
  max_attendees: number | null;
  external_link: string | null;
  status: string;
  view_count: number;
  created_at: string;
  organizer_name: string | null;
  attendee_count: number;
  going_count: number;
  interested_count: number;
  images: { url: string; sort_order: number }[];
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

import { EVENT_CATEGORIES } from "@/constants/categories";
import { colors } from "@/theme/colors";

export default function EventDetailScreenWeb() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user, token } = useAuth();
  const { unreadCount } = useWebSocket();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [imgIdx, setImgIdx] = useState(0);
  const [saved, setSaved] = useState(false);
  const [savedId, setSavedId] = useState<number | null>(null);
  const [msgText, setMsgText] = useState("");
  const [msgSending, setMsgSending] = useState(false);
  const [msgError, setMsgError] = useState("");

  // RSVP state
  const [rsvpStatus, setRsvpStatus] = useState<"going" | "interested" | null>(null);
  const [attendeeCount, setAttendeeCount] = useState(0);
  const [rsvpLoading, setRsvpLoading] = useState(false);

  // Edit state
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editStartsAt, setEditStartsAt] = useState("");
  const [editEndsAt, setEditEndsAt] = useState("");
  const [editIsFree, setEditIsFree] = useState(true);
  const [editTicketPrice, setEditTicketPrice] = useState("");
  const [editMaxAttendees, setEditMaxAttendees] = useState("");
  const [editExternalLink, setEditExternalLink] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(API.event(id))
      .then((r) => r.json())
      .then((data) => {
        if (data.event) {
          setEvent(data.event);
          setAttendeeCount(data.event.attendee_count ?? 0);
        }
        else setError("Event not found.");
      })
      .catch(() => setError("Could not load event."))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id || !token) return;
    fetch(`${API.savedCheck}?event_id=${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data) => { setSaved(data.saved); setSavedId(data.saved_id); });
  }, [id, token]);

  useEffect(() => {
    if (!id || !token) return;
    fetch(API.eventRsvp(id), { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data) => { if (data.rsvp) setRsvpStatus(data.rsvp.status); });
  }, [id, token]);

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
        body: JSON.stringify({ event_id: id }),
      });
      const data = await res.json();
      if (data.saved) { setSaved(true); setSavedId(data.saved.id); }
    }
  };

  const toggleRsvp = async () => {
    if (!token || !event || rsvpLoading) return;
    setRsvpLoading(true);
    try {
      if (rsvpStatus) {
        const res = await fetch(API.eventRsvp(event.id), {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setRsvpStatus(null);
        setAttendeeCount(data.count ?? attendeeCount - 1);
      } else {
        const res = await fetch(API.eventRsvp(event.id), {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ status: "going" }),
        });
        const data = await res.json();
        setRsvpStatus("going");
        setAttendeeCount(data.count ?? attendeeCount + 1);
      }
    } finally { setRsvpLoading(false); }
  };

  const sendFirstMessage = async () => {
    if (!token || !event || !msgText.trim()) return;
    setMsgSending(true);
    setMsgError("");
    try {
      const convRes = await fetch(API.conversations, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ seller_id: event.organizer_id, event_id: event.id }),
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
    if (!event) return;
    setEditTitle(event.title);
    setEditDescription(event.description);
    setEditCategory(event.category);
    setEditLocation(event.location);
    setEditStartsAt(event.starts_at ? new Date(event.starts_at).toISOString().slice(0, 16) : "");
    setEditEndsAt(event.ends_at ? new Date(event.ends_at).toISOString().slice(0, 16) : "");
    setEditIsFree(!!event.is_free);
    setEditTicketPrice(event.ticket_price != null ? String(event.ticket_price) : "");
    setEditMaxAttendees(event.max_attendees != null ? String(event.max_attendees) : "");
    setEditExternalLink(event.external_link ?? "");
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    if (!token || !event) return;
    setSaving(true);
    try {
      const res = await fetch(API.event(event.id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDescription.trim(),
          category: editCategory,
          location: editLocation.trim(),
          starts_at: editStartsAt ? new Date(editStartsAt).toISOString() : undefined,
          ends_at: editEndsAt ? new Date(editEndsAt).toISOString() : null,
          is_free: editIsFree,
          ticket_price: editIsFree ? null : parseFloat(editTicketPrice) || null,
          max_attendees: editMaxAttendees ? parseInt(editMaxAttendees) : null,
          external_link: editExternalLink.trim() || null,
        }),
      });
      const data = await res.json();
      if (data.event) {
        setEvent((prev) => prev ? { ...prev, ...data.event, images: prev.images } : prev);
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

  if (error || !event) {
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

  const categories = event.category
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
  const ticketLabel = event.is_free
    ? "Free"
    : event.ticket_price != null
      ? `$${event.ticket_price}`
      : "Paid";
  const date = new Date(event.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const images = event.images ?? [];
  const isOwner = String(event.organizer_id) === String(user?.id);

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
            <Text className="text-sm text-muted-foreground">Event</Text>
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
                    alt={event.title}
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
                    <Text>{event.title}</Text>
                  </CardTitle>
                  <Badge
                    variant={event.is_free ? "success" : "outline"}
                    className="px-3 py-1"
                  >
                    <Text>{ticketLabel}</Text>
                  </Badge>
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
                {event.organizer_name && (
                  <Pressable className="flex-row items-center gap-2" onPress={() => router.push(`/user/${event.organizer_id}`)}>
                    <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center" }}>
                      <Ionicons name="person" size={14} color={colors.primary} />
                    </View>
                    <Text className="text-sm font-semibold" style={{ color: colors.primary }}>{event.organizer_name}</Text>
                  </Pressable>
                )}

                <View>
                  <Text className="mb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    When
                  </Text>
                  <Text className="text-sm text-foreground">
                    {formatDateTime(event.starts_at)}
                  </Text>
                  {event.ends_at && (
                    <Text className="text-xs text-muted-foreground">
                      until {formatDateTime(event.ends_at)}
                    </Text>
                  )}
                </View>

                <View>
                  <Text className="mb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Where
                  </Text>
                  <Text className="text-sm text-foreground">
                    {event.is_online ? "Online" : event.location}
                  </Text>
                </View>

                {event.max_attendees != null && (
                  <View>
                    <Text className="mb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      Capacity
                    </Text>
                    <Text className="text-sm text-foreground">
                      {event.max_attendees} max attendees
                    </Text>
                  </View>
                )}

                {/* Attendee count */}
                {attendeeCount > 0 && (
                  <View className="flex-row items-center gap-2">
                    <Ionicons name="people-outline" size={16} color={colors.dark} />
                    <Text className="text-sm text-muted-foreground">
                      {attendeeCount} {attendeeCount === 1 ? "person" : "people"} going
                    </Text>
                  </View>
                )}

                <View>
                  <Text className="mb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Description
                  </Text>
                  <Text className="text-sm leading-relaxed text-foreground">
                    {event.description || "No description provided."}
                  </Text>
                </View>

                <Separator />

                <View className="flex-row justify-between">
                  <Text className="text-xs text-muted-foreground">
                    Posted {date}
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    {event.view_count} views
                  </Text>
                </View>

                {isOwner ? (
                  <View className="flex-row items-center gap-3 mt-2">
                    <Button variant="outline" className="flex-1" onPress={openEdit}>
                      <Ionicons name="create-outline" size={16} color={colors.ink} />
                      <Text className="ml-2 text-sm font-semibold text-foreground">Edit Event</Text>
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onPress={async () => {
                        if (!window.confirm("Are you sure you want to delete this event?")) return;
                        await fetch(API.event(event.id), {
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
                  <View className="gap-3 mt-2">
                    <View className="flex-row items-center gap-3">
                      <Button
                        className="flex-1"
                        style={
                          rsvpStatus
                            ? { backgroundColor: colors.success }
                            : event.is_free
                              ? { backgroundColor: colors.success }
                              : undefined
                        }
                        onPress={toggleRsvp}
                        disabled={rsvpLoading}
                      >
                        <Ionicons
                          name={rsvpStatus ? "checkmark-circle" : "calendar-outline"}
                          size={16}
                          color={colors.white}
                        />
                        <Text className="ml-2 text-sm font-semibold text-primary-foreground">
                          {rsvpStatus
                            ? "RSVP'd — Going"
                            : event.is_free
                              ? "RSVP — Free"
                              : `Get Tickets · ${ticketLabel}`}
                        </Text>
                      </Button>
                      <Pressable onPress={toggleSave} style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" }}>
                        <Ionicons name={saved ? "heart" : "heart-outline"} size={22} color={colors.primary} />
                      </Pressable>
                    </View>
                    {event.external_link && (
                      <Button
                        variant="outline"
                        onPress={() => Linking.openURL(event.external_link!)}
                      >
                        <Ionicons name="link-outline" size={16} color={colors.primary} />
                        <Text className="ml-2 text-sm font-semibold" style={{ color: colors.primary }}>
                          Open Registration Link
                        </Text>
                      </Button>
                    )}
                    <View className="gap-1.5">
                      <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Message Organizer
                      </Text>
                      <Textarea
                        value={msgText}
                        onChangeText={setMsgText}
                        placeholder="Hi, I have a question about this event..."
                        numberOfLines={3}
                        editable={!msgSending}
                      />
                      {msgError ? (
                        <Text className="text-xs text-destructive">{msgError}</Text>
                      ) : null}
                      <Button
                        variant="outline"
                        onPress={sendFirstMessage}
                        disabled={msgSending || !msgText.trim()}
                      >
                        {msgSending ? (
                          <ActivityIndicator size="small" color={colors.primary} />
                        ) : (
                          <>
                            <Ionicons name="send-outline" size={16} color={colors.primary} />
                            <Text className="ml-2 text-sm font-semibold" style={{ color: colors.primary }}>Send Message</Text>
                          </>
                        )}
                      </Button>
                    </View>
                  </View>
                )}
              </CardContent>
            </Card>
          </View>
        </View>
      </View>

      {/* Edit Event Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle><Text>Edit Event</Text></DialogTitle>
          </DialogHeader>
          <ScrollView style={{ maxHeight: 500 }}>
            <View className="gap-4">
              <View className="gap-1.5">
                <Text className="text-sm font-medium text-foreground">Title</Text>
                <Input value={editTitle} onChangeText={setEditTitle} placeholder="Event title" />
              </View>
              <View className="gap-1.5">
                <Text className="text-sm font-medium text-foreground">Description</Text>
                <Textarea value={editDescription} onChangeText={setEditDescription} placeholder="Describe your event..." numberOfLines={3} />
              </View>
              <View className="gap-1.5">
                <Text className="text-sm font-medium text-foreground">Category</Text>
                <View className="flex-row gap-2 flex-wrap">
                  {EVENT_CATEGORIES.map((c) => (
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
                <Text className="text-sm font-medium text-foreground">Location</Text>
                <Input value={editLocation} onChangeText={setEditLocation} placeholder="Where is this event?" />
              </View>
              <View className="gap-1.5">
                <Text className="text-sm font-medium text-foreground">Start Date & Time</Text>
                <input
                  type="datetime-local"
                  value={editStartsAt}
                  onChange={(e) => setEditStartsAt(e.target.value)}
                  style={{ padding: 8, borderRadius: 8, border: `1px solid ${colors.border}`, fontSize: 14 }}
                />
              </View>
              <View className="gap-1.5">
                <Text className="text-sm font-medium text-foreground">End Date & Time (optional)</Text>
                <input
                  type="datetime-local"
                  value={editEndsAt}
                  onChange={(e) => setEditEndsAt(e.target.value)}
                  style={{ padding: 8, borderRadius: 8, border: `1px solid ${colors.border}`, fontSize: 14 }}
                />
              </View>
              <View className="flex-row justify-between items-center">
                <Text className="text-sm font-medium text-foreground">Free event</Text>
                <Switch value={editIsFree} onValueChange={setEditIsFree} />
              </View>
              {!editIsFree && (
                <View className="gap-1.5">
                  <Text className="text-sm font-medium text-foreground">Ticket Price</Text>
                  <Input value={editTicketPrice} onChangeText={setEditTicketPrice} placeholder="10.00" keyboardType="decimal-pad" />
                </View>
              )}
              <View className="gap-1.5">
                <Text className="text-sm font-medium text-foreground">Max Attendees (optional)</Text>
                <Input value={editMaxAttendees} onChangeText={setEditMaxAttendees} placeholder="100" keyboardType="number-pad" />
              </View>
              <View className="gap-1.5">
                <Text className="text-sm font-medium text-foreground">Registration / Event Link</Text>
                <Input value={editExternalLink} onChangeText={setEditExternalLink} placeholder="https://example.com/register" />
              </View>
            </View>
          </ScrollView>
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
