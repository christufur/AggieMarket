import { View, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

const FEATURES = [
  {
    icon: "pricetag-outline" as const,
    title: "Listings",
    description:
      "Buy and sell textbooks, furniture, electronics, and more with fellow Aggies.",
  },
  {
    icon: "construct-outline" as const,
    title: "Services",
    description:
      "Offer or find tutoring, rides, photography, and other student services.",
  },
  {
    icon: "calendar-outline" as const,
    title: "Events",
    description:
      "Discover campus events, study groups, and social gatherings at NMSU.",
  },
];

export default function LandingScreenWeb() {
  const router = useRouter();

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ minHeight: "100vh" as any }}
    >
      {/* Nav Bar */}
      <View className="w-full border-b border-border bg-card">
        <View
          className="flex-row items-center justify-between px-6 py-4"
          style={{ maxWidth: 1100, width: "100%", alignSelf: "center" }}
        >
          <Pressable
            className="flex-row items-center gap-3"
            onPress={() => router.push("/")}
          >
            <Badge className="rounded-md px-2.5 py-1">
              <Text className="text-sm font-bold text-primary-foreground">
                AM
              </Text>
            </Badge>
            <Text className="text-lg font-bold text-foreground">
              Aggie Market
            </Text>
          </Pressable>

          <View className="flex-row items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onPress={() => router.push("/login")}
            >
              <Text>Log in</Text>
            </Button>
            <Button size="sm" onPress={() => router.push("/register")}>
              <Text className="text-sm font-semibold text-primary-foreground">
                Get Started
              </Text>
            </Button>
          </View>
        </View>
      </View>

      {/* Hero Section */}
      <View
        className="items-center px-6 py-24"
        style={{ maxWidth: 1100, width: "100%", alignSelf: "center" }}
      >
        <Badge variant="secondary" className="mb-4 px-3 py-1">
          <Text className="text-xs font-semibold text-foreground">
            NMSU Verified Students Only
          </Text>
        </Badge>

        <Text
          className="text-center font-bold text-foreground"
          style={{ fontSize: 48, lineHeight: 56, maxWidth: 700 }}
        >
          {"Buy, sell, and connect\nwith NMSU students"}
        </Text>

        <Text
          className="mt-4 text-center text-muted-foreground"
          style={{ fontSize: 18, lineHeight: 28, maxWidth: 540 }}
        >
          A trusted marketplace exclusively for New Mexico State University
          students. Verified with your NMSU email.
        </Text>

        <View className="mt-10 flex-row items-center gap-4">
          <Button size="lg" onPress={() => router.push("/register")}>
            <Text className="text-base font-semibold text-primary-foreground">
              Get Started
            </Text>
          </Button>
          <Button
            variant="outline"
            size="lg"
            onPress={() => router.push("/login")}
          >
            <Text className="text-base font-semibold">Log in</Text>
          </Button>
        </View>
      </View>

      {/* Features Section */}
      <View className="bg-background px-6 pb-24">
        <View style={{ maxWidth: 1100, width: "100%", alignSelf: "center" }}>
          <Text className="mb-2 text-center text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Features
          </Text>
          <Text
            className="mb-12 text-center font-bold text-foreground"
            style={{ fontSize: 28, lineHeight: 36 }}
          >
            Everything you need on campus
          </Text>

          <View className="flex-row gap-6" style={{ flexWrap: "wrap" }}>
            {FEATURES.map((feature) => (
              <Card
                key={feature.title}
                className="flex-1"
                style={{ minWidth: 280 }}
              >
                <CardHeader>
                  <View className="mb-3 h-11 w-11 items-center justify-center rounded-lg bg-primary">
                    <Ionicons name={feature.icon} size={22} color="#FFFFFF" />
                  </View>
                  <CardTitle>
                    <Text>{feature.title}</Text>
                  </CardTitle>
                  <CardDescription>
                    <Text>{feature.description}</Text>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Pressable
                    className="flex-row items-center gap-1"
                    onPress={() => router.push("/register")}
                  >
                    <Text className="text-sm font-semibold text-foreground">
                      Learn more
                    </Text>
                    <Ionicons name="arrow-forward" size={14} color="#212121" />
                  </Pressable>
                </CardContent>
              </Card>
            ))}
          </View>
        </View>
      </View>

      {/* Footer */}
      <View className="mt-auto border-t border-border bg-card px-6 py-8">
        <View
          className="items-center"
          style={{ maxWidth: 1100, width: "100%", alignSelf: "center" }}
        >
          <Text className="text-sm text-muted-foreground">
            © 2026 Aggie Market · NMSU Verified
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
