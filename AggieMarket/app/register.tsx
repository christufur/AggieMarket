import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { colors } from "../theme/colors";

export default function RegisterScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleRegister = () => {
    router.replace("/home");
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <View style={styles.header}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>AM</Text>
              </View>
              <Text style={styles.title}>Create account</Text>
              <Text style={styles.sub}>Join Aggie Market to buy and sell with NMSU students</Text>
            </View>

            <View style={styles.form}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor={colors.mid}
                autoCapitalize="words"
                autoComplete="name"
              />
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
              />
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={colors.mid}
                secureTextEntry
                autoComplete="password-new"
              />
              <Text style={styles.label}>Confirm password</Text>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="••••••••"
                placeholderTextColor={colors.mid}
                secureTextEntry
                autoComplete="password-new"
              />
              <Pressable style={styles.primaryBtn} onPress={handleRegister}>
                <Text style={styles.primaryBtnText}>Create account</Text>
              </Pressable>
            </View>

            <Pressable onPress={() => router.push("/login")} style={styles.switchLink}>
              <Text style={styles.switchLinkText}>Already have an account? Log in</Text>
            </Pressable>
            <Pressable onPress={() => router.back()} style={styles.backLink}>
              <Text style={styles.backLinkText}>← Back</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.white,
  },
  keyboard: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
  },
  content: {
    flex: 1,
  },
  header: {
    marginBottom: 32,
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: colors.ink,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 16,
  },
  badgeText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "700",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.ink,
    marginBottom: 4,
  },
  sub: {
    fontSize: 14,
    color: colors.dark,
  },
  form: {
    gap: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.ink,
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.mid,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.ink,
  },
  primaryBtn: {
    backgroundColor: colors.ink,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
  },
  primaryBtnText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "700",
  },
  switchLink: {
    marginTop: 24,
  },
  switchLinkText: {
    fontSize: 14,
    color: colors.ink,
    fontWeight: "600",
  },
  backLink: {
    marginTop: 12,
  },
  backLinkText: {
    fontSize: 14,
    color: colors.dark,
  },
});
