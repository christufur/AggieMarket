import { useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { colors } from "../theme/colors";
import { API } from "../constants/api";

const CODE_LENGTH = 6;

export default function RegisterScreen() {
  const router = useRouter();

  // Register form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // OTP modal state
  const [showOTP, setShowOTP] = useState(false);
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [otpSuccess, setOtpSuccess] = useState(false);
  const inputs = useRef<(TextInput | null)[]>([]);

  const handleRegister = async () => {
    setError("");
    if (!name || !email || !password || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(API.register, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();

      if (data.status === 201) {
        setShowOTP(true);
      } else {
        setError(data.message || "Registration failed.");
      }
    } catch {
      setError("Could not connect to server. Is it running?");
    } finally {
      setLoading(false);
    }
  };

  const handleDigitChange = (text: string, index: number) => {
    const digit = text.replace(/[^0-9]/g, "").slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    setOtpError("");

    if (digit && index < CODE_LENGTH - 1) {
      inputs.current[index + 1]?.focus();
    }
    if (digit && index === CODE_LENGTH - 1) {
      const code = next.join("");
      if (code.length === CODE_LENGTH) handleVerify(code);
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === "Backspace" && !digits[index] && index > 0) {
      const next = [...digits];
      next[index - 1] = "";
      setDigits(next);
      inputs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (code?: string) => {
    const token = code ?? digits.join("");
    if (token.length < CODE_LENGTH) {
      setOtpError("Enter all 6 digits.");
      return;
    }

    setOtpLoading(true);
    setOtpError("");
    try {
      const res = await fetch(API.verifyEmail, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token }),
      });
      const data = await res.json();

      if (data.status === 200) {
        setOtpSuccess(true);
        setTimeout(() => {
          setShowOTP(false);
          router.replace("/login");
        }, 1000);
      } else {
        setOtpError(data.message || "Invalid code.");
        setDigits(Array(CODE_LENGTH).fill(""));
        inputs.current[0]?.focus();
      }
    } catch {
      setOtpError("Could not connect to server.");
    } finally {
      setOtpLoading(false);
    }
  };

  const maskedEmail = email.replace(/(.{2}).+(@.+)/, "$1•••$2");

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
                editable={!loading}
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
                autoComplete="password-new"
                editable={!loading}
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
                editable={!loading}
              />

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <Pressable
                style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
                onPress={handleRegister}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.primaryBtnText}>Create account</Text>
                )}
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

      {/* OTP Verification Modal */}
      <Modal
        visible={showOTP}
        transparent
        animationType="slide"
        onRequestClose={() => setShowOTP(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setShowOTP(false)}>
          <Pressable style={styles.modalSheet} onPress={() => {}}>
            <View style={styles.modalHandle} />

            <Text style={styles.modalTitle}>Check your inbox</Text>
            <Text style={styles.modalSub}>
              We sent a 6-digit code to{" "}
              <Text style={styles.modalEmail}>{maskedEmail}</Text>
            </Text>

            <View style={styles.otpRow}>
              {digits.map((d, i) => (
                <TextInput
                  key={i}
                  ref={(el) => { inputs.current[i] = el; }}
                  style={[
                    styles.otpBox,
                    d ? styles.otpBoxFilled : null,
                    otpSuccess ? styles.otpBoxSuccess : null,
                    otpError ? styles.otpBoxError : null,
                  ]}
                  value={d}
                  onChangeText={(t) => handleDigitChange(t, i)}
                  onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                  editable={!otpLoading && !otpSuccess}
                  caretHidden
                />
              ))}
            </View>

            {otpError ? (
              <Text style={styles.otpError}>{otpError}</Text>
            ) : otpSuccess ? (
              <Text style={styles.otpSuccess}>Verified!</Text>
            ) : null}

            <Pressable
              style={[styles.primaryBtn, (otpLoading || otpSuccess) && styles.primaryBtnDisabled]}
              onPress={() => handleVerify()}
              disabled={otpLoading || otpSuccess}
            >
              {otpLoading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.primaryBtnText}>Verify</Text>
              )}
            </Pressable>

            <Text style={styles.modalHint}>
              Didn't get it? Check your spam or tap outside to go back.
            </Text>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  keyboard: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
  },
  content: { flex: 1 },
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
  errorText: { fontSize: 13, color: "#D32F2F", fontWeight: "500" },
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

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 40,
    gap: 16,
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 8,
  },
  modalTitle: { fontSize: 20, fontWeight: "700", color: colors.ink },
  modalSub: { fontSize: 14, color: colors.dark },
  modalEmail: { color: colors.ink, fontWeight: "600" },

  otpRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
  },
  otpBox: {
    width: 44,
    height: 52,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 10,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "700",
    color: colors.ink,
    backgroundColor: colors.bg,
  },
  otpBoxFilled: { borderColor: colors.ink, backgroundColor: colors.white },
  otpBoxSuccess: { borderColor: "#2E7D32", backgroundColor: "#F1F8E9", color: "#2E7D32" },
  otpBoxError: { borderColor: "#D32F2F", backgroundColor: "#FFF8F8" },

  otpError: { fontSize: 13, color: "#D32F2F", fontWeight: "500" },
  otpSuccess: { fontSize: 13, color: "#2E7D32", fontWeight: "600" },

  modalHint: { fontSize: 12, color: colors.mid, lineHeight: 18 },
});
