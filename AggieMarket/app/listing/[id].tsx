import { useEffect, useState } from "react";
import { View, ScrollView, ActivityIndicator, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { API } from "@/constants/api";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

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
  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [imgIdx, setImgIdx] = useState(0);

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

  if (loading) {
    return (
      <View
        className="flex-1 items-center justify-center bg-background"
        style={{ minHeight: "70vh" as any }}
      >
        <ActivityIndicator color="#212121" />
      </View>
    );
  }

  if (error || !listing) {
    return (
      <View
        className="flex-1 items-center justify-center gap-3 bg-background"
        style={{ minHeight: "70vh" as any }}
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
      contentContainerStyle={{ minHeight: "40vh" as any }}
    >
      {/* Nav */}
      <View className="border-b border-border bg-card">
        <View
          className="flex-row items-center px-6 py-3"
          style={{ maxWidth: 900, width: "100%", alignSelf: "center" }}
        >
          <Pressable
            className="flex-row items-center gap-2"
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={18} color="#212121" />
            <Text className="text-sm font-semibold text-foreground">Back</Text>
          </Pressable>
        </View>
      </View>

      <View
        className="px-6 py-4"
        style={{ maxHeight: "50vh", overflow: "hidden", maxWidth: 900, width: "70%", alignSelf: "center" }}
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
                    background: "#F5F5F5",
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
                          borderColor: i === imgIdx ? "#8C0B42" : "#E0E0E0",
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
                    <Text>{listing.title}</Text>
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
              </CardHeader>

              <Separator />

              <CardContent className="gap-4 pt-4">
                {listing.seller_name && (
                  <View className="flex-row items-center gap-2">
                    <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "#FDF2F6", alignItems: "center", justifyContent: "center" }}>
                      <Ionicons name="person" size={14} color="#8C0B42" />
                    </View>
                    <Text className="text-sm font-semibold text-foreground">{listing.seller_name}</Text>
                  </View>
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
                  <Button
                    variant="destructive"
                    className="mt-2"
                    onPress={async () => {
                      if (
                        !window.confirm(
                          "Are you sure you want to delete this listing?"
                        )
                      )
                        return;
                      await fetch(API.listing(listing.id), {
                        method: "DELETE",
                        headers: { Authorization: `Bearer ${token}` },
                      });
                      router.back();
                    }}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={16}
                      color="#FFFFFF"
                    />
                    <Text className="ml-2 text-sm font-semibold text-destructive-foreground">
                      Delete Listing
                    </Text>
                  </Button>
                ) : (
                  <Button className="mt-2">
                    <Ionicons
                      name="chatbubble-outline"
                      size={16}
                      color="#FFFFFF"
                    />
                    <Text className="ml-2 text-sm font-semibold text-primary-foreground">
                      Message Seller
                    </Text>
                  </Button>
                )}
              </CardContent>
            </Card>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
