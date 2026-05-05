import { useEffect, useState } from "react";
import { View, Pressable, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { colors } from "@/theme/colors";
import { API } from "@/constants/api";
import type { RatingItem } from "@/types";

const MAX_BODY = 500;

export function RateUserDialog({
  open,
  onClose,
  transactionId,
  counterpartyName,
  listingTitle,
  token,
  onSubmitted,
}: {
  open: boolean;
  onClose: () => void;
  transactionId: string | null;
  counterpartyName: string | null;
  listingTitle?: string | null;
  token: string | null;
  onSubmitted?: (rating: RatingItem) => void;
}) {
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setStars(0);
      setHover(0);
      setBody("");
      setError(null);
      setSaving(false);
    }
  }, [open, transactionId]);

  const handleSubmit = async () => {
    if (!token || !transactionId) return;
    if (stars < 1 || stars > 5) {
      setError("Please pick a star rating.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(API.ratings, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          transaction_id: transactionId,
          stars,
          body: body.trim() ? body.trim() : null,
        }),
      });
      const data = await res.json();
      if (!res.ok || (typeof data.status === "number" && data.status >= 400)) {
        setError(data.message ?? "Failed to submit rating.");
        return;
      }
      onSubmitted?.(data.rating as RatingItem);
      onClose();
    } catch (err) {
      console.error("Rating submit error:", err);
      setError("Network error. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const display = hover || stars;
  const labels = ["", "Poor", "Fair", "Good", "Great", "Excellent"];

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            <Text style={{ fontSize: 16, fontWeight: "700", color: colors.ink }}>
              Rate {counterpartyName ?? "user"}
            </Text>
          </DialogTitle>
        </DialogHeader>

        <View style={{ gap: 16, paddingVertical: 8 }}>
          {listingTitle ? (
            <Text style={{ fontSize: 13, color: colors.dark }} numberOfLines={2}>
              For: <Text style={{ fontWeight: "600", color: colors.ink }}>{listingTitle}</Text>
            </Text>
          ) : null}

          <View style={{ alignItems: "center", gap: 8 }}>
            <View style={{ flexDirection: "row", gap: 4 }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <Pressable
                  key={i}
                  onPress={() => setStars(i)}
                  onHoverIn={() => setHover(i)}
                  onHoverOut={() => setHover(0)}
                  hitSlop={6}
                  style={{ padding: 2, cursor: "pointer" as any }}
                >
                  <Ionicons
                    name={i <= display ? "star" : "star-outline"}
                    size={36}
                    color={i <= display ? colors.primary : colors.border}
                  />
                </Pressable>
              ))}
            </View>
            <Text style={{ fontSize: 13, color: colors.dark, minHeight: 18 }}>
              {display > 0 ? labels[display] : "Tap a star"}
            </Text>
          </View>

          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 12, fontWeight: "600", color: colors.dark }}>
              Comment (optional)
            </Text>
            <Textarea
              value={body}
              onChangeText={(t) => setBody(t.slice(0, MAX_BODY))}
              placeholder="Share details about your experience..."
              numberOfLines={4}
              style={{ minHeight: 90 }}
            />
            <Text style={{ fontSize: 11, color: colors.dark, alignSelf: "flex-end" }}>
              {body.length}/{MAX_BODY}
            </Text>
          </View>

          {error ? (
            <View style={{
              padding: 10, borderRadius: 8,
              backgroundColor: colors.errorLight,
              borderWidth: 1, borderColor: colors.error,
            }}>
              <Text style={{ fontSize: 12, color: colors.error }}>{error}</Text>
            </View>
          ) : null}
        </View>

        <DialogFooter>
          <Button variant="outline" onPress={onClose} disabled={saving}>
            <Text>Cancel</Text>
          </Button>
          <Button onPress={handleSubmit} disabled={saving || stars < 1}>
            {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text>Submit</Text>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default RateUserDialog;
