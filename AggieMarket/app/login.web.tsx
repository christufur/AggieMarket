import { useState } from "react";
import { View, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { API } from "@/constants/api";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

export default function LoginScreenWeb() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setError("");
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(API.login, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (data.token) {
        const meRes = await fetch(API.me, {
          headers: { Authorization: `Bearer ${data.token}` },
        });
        const meData = await meRes.json();
        await login(data.token, meData.user);
      } else {
        setError(data.message || "Login failed.");
      }
    } catch (e: any) {
      setError(`Network error: ${e?.message ?? "unknown"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View
      className="flex-1 items-center justify-center bg-background px-4"
      style={{ minHeight: "100vh" as any }}
    >
      <Card className="w-full" style={{ maxWidth: 420 }}>
        <CardHeader className="items-center gap-3 pb-2">
          <View className="rounded-md bg-primary px-3 py-1.5">
            <Text className="text-xs font-bold tracking-wide text-primary-foreground">
              AM
            </Text>
          </View>
          <Text className="text-2xl font-bold text-foreground">Log in</Text>
          <Text className="text-sm text-muted-foreground">
            Welcome back to Aggie Market
          </Text>
        </CardHeader>

        <Separator />

        <CardContent className="gap-5 pt-6">
          <View className="gap-1.5">
            <Text className="text-sm font-semibold text-foreground">Email</Text>
            <Input
              value={email}
              onChangeText={setEmail}
              placeholder="you@nmsu.edu"
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              editable={!loading}
            />
          </View>

          <View className="gap-1.5">
            <Text className="text-sm font-semibold text-foreground">
              Password
            </Text>
            <Input
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              secureTextEntry
              autoComplete="password"
              editable={!loading}
            />
          </View>

          {error ? (
            <Text className="text-sm font-medium text-destructive">
              {error}
            </Text>
          ) : null}

          <Button onPress={handleLogin} disabled={loading} className="mt-1">
            {loading ? (
              <View className="flex-row items-center gap-2">
                <ActivityIndicator color="#FFFFFF" size="small" />
                <Text className="text-sm font-semibold text-primary-foreground">
                  Logging in...
                </Text>
              </View>
            ) : (
              <Text className="text-sm font-semibold text-primary-foreground">
                Log in
              </Text>
            )}
          </Button>
        </CardContent>
      </Card>

      <Pressable onPress={() => router.push("/register")} className="mt-6">
        <Text className="text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Text className="font-semibold text-foreground">Sign up</Text>
        </Text>
      </Pressable>
    </View>
  );
}
