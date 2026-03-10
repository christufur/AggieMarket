import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { colors } from "../theme/colors";
import { useAuth } from "../context/AuthContext";
import { API } from "../constants/api";

export default function LoginScreen() {
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
        // Fetch user profile with the token
        const meRes = await fetch(API.me, {
          headers: { Authorization: `Bearer ${data.token}` },
        });
        const meData = await meRes.json();
        await login(data.token, meData.user);
        // _layout.tsx will redirect to /home
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
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>AM</Text>
            </View>
            <Text style={styles.title}>Log in</Text>
            <Text style={styles.sub}>Welcome back to Aggie Market</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@nmsu.edu"
              placeholderTextColor={colors.mid}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              editable={!loading}
            />
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={colors.mid}
              secureTextEntry
              autoComplete="password"
              editable={!loading}
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Pressable
              style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.primaryBtnText}>Log in</Text>
              )}
            </Pressable>
          </View>

          <Pressable onPress={() => router.push("/register")} style={styles.switchLink}>
            <Text style={styles.switchLinkText}>Don't have an account? Sign up</Text>
          </Pressable>
          <Pressable onPress={() => router.back()} style={styles.backLink}>
            <Text style={styles.backLinkText}>← Back</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  keyboard: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 24 },
  header: { marginBottom: 32 },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: colors.ink,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 16,
  },
  badgeText: { color: colors.white, fontSize: 12, fontWeight: "700" },
  title: { fontSize: 24, fontWeight: "700", color: colors.ink, marginBottom: 4 },
  sub: { fontSize: 14, color: colors.dark },
  form: { gap: 16 },
  label: { fontSize: 12, fontWeight: "700", color: colors.ink },
  input: {
    borderWidth: 1.5,
    borderColor: colors.mid,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.ink,
  },
  errorText: {
    fontSize: 13,
    color: "#D32F2F",
    fontWeight: "500",
  },
  primaryBtn: {
    backgroundColor: colors.ink,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
  },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { color: colors.white, fontSize: 16, fontWeight: "700" },
  switchLink: { marginTop: 24 },
  switchLinkText: { fontSize: 14, color: colors.ink, fontWeight: "600" },
  backLink: { marginTop: 12 },
  backLinkText: { fontSize: 14, color: colors.dark },
});
