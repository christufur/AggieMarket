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

type ServiceDetail = {
  id: string;
  provider_id: number;
  title: string;
  description: string;
  price: number | null;
  price_type: string | null;
  category: string;
  availability: string | null;
  status: string;
  view_count: number;
  created_at: string;
  provider_name: string | null;
  images: { url: string; sort_order: number }[];
};

function priceLabel(price: number | null, price_type: string | null) {
  if (price == null) return "Free";
  const suffix =
    price_type === "hourly"
      ? "/hr"
      : price_type === "starting_at"
        ? "+"
        : "";
  return `$${price}${suffix}`;
}

export default function ServiceDetailScreenWeb() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user, token } = useAuth();
  const [service, setService] = useState<ServiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [imgIdx, setImgIdx] = useState(0);

  useEffect(() => {
    if (!id || !token) return;
    fetch(API.service(id), { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        if (data.service) setService(data.service);
        else setError("Service not found.");
      })
      .catch(() => setError("Could not load service."))
      .finally(() => setLoading(false));
  }, [id, token]);

  if (loading) {
    return (
      <View
        className="flex-1 items-center justify-center bg-background"
        style={{ minHeight: "100vh" as any }}
      >
        <ActivityIndicator color="#212121" />
      </View>
    );
  }

  if (error || !service) {
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

  const categories = service.category
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
  const date = new Date(service.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const images = service.images ?? [];
  const isOwner = String(service.provider_id) === String(user?.id);

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ minHeight: "100vh" as any }}
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
                    alt={service.title}
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
                    <Text>{service.title}</Text>
                  </CardTitle>
                  <View className="items-end">
                    <Text
                      className="font-bold text-foreground"
                      style={{ fontSize: 24 }}
                    >
                      {priceLabel(service.price, service.price_type)}
                    </Text>
                    {service.price_type && (
                      <Text className="text-xs text-muted-foreground">
                        {service.price_type === "hourly"
                          ? "Per hour"
                          : service.price_type === "flat"
                            ? "Flat rate"
                            : "Starting at"}
                      </Text>
                    )}
                  </View>
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
                {service.provider_name && (
                  <View className="flex-row items-center gap-2">
                    <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "#FDF2F6", alignItems: "center", justifyContent: "center" }}>
                      <Ionicons name="person" size={14} color="#8C0B42" />
                    </View>
                    <Text className="text-sm font-semibold text-foreground">{service.provider_name}</Text>
                  </View>
                )}

                {service.availability && (
                  <View>
                    <Text className="mb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      Availability
                    </Text>
                    <Text className="text-sm text-foreground">
                      {service.availability}
                    </Text>
                  </View>
                )}

                <View>
                  <Text className="mb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Description
                  </Text>
                  <Text className="text-sm leading-relaxed text-foreground">
                    {service.description || "No description provided."}
                  </Text>
                </View>

                <Separator />

                <View className="flex-row justify-between">
                  <Text className="text-xs text-muted-foreground">
                    Posted {date}
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    {service.view_count} views
                  </Text>
                </View>

                {isOwner ? (
                  <Button
                    variant="destructive"
                    className="mt-2"
                    onPress={async () => {
                      if (
                        !window.confirm(
                          "Are you sure you want to delete this service?"
                        )
                      )
                        return;
                      await fetch(API.service(service.id), {
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
                      Delete Service
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
                      Contact Provider
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
