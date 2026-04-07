import { useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { colors } from "../theme/colors";
import { useAuth } from "../context/AuthContext";
import { API } from "../constants/api";

const CODE_LENGTH = 6;

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  useAuth();

  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const inputs = useRef<(TextInput | null)[]>([]);

  const handleChange = (text: string, index: number) => {
    const digit = text.replace(/[^0-9]/g, "").slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    setError("");

    if (digit && index < CODE_LENGTH - 1) {
      inputs.current[index + 1]?.focus();
    }

    // Auto-submit when last digit filled
    if (digit && index === CODE_LENGTH - 1) {
      const code = [...next].join("");
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
      setError("Enter all 6 digits.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await fetch(API.verifyEmail, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token }),
      });
      const data = await res.json();

      if (data.status === 200) {
        setSuccess(true);
        // Brief pause so user sees the success state, then go to login
        setTimeout(() => router.replace("/login"), 1200);
      } else {
        setError(data.message || "Invalid code.");
        setDigits(Array(CODE_LENGTH).fill(""));
        inputs.current[0]?.focus();
      }
    } catch {
      setError("Could not connect to server.");
    } finally {
      setLoading(false);
    }
  };

  const maskedEmail = email
    ? email.replace(/(.{2}).+(@.+)/, "$1•••$2")
    : "";

  return (
    <View style={styles.safe}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>AM</Text>
            </View>
            <Text style={styles.title}>Check your inbox</Text>
            <Text style={styles.sub}>
              We sent a 6-digit code to{"\n"}
              <Text style={styles.emailHighlight}>{maskedEmail}</Text>
            </Text>
          </View>

          {/* OTP Input Row */}
          <View style={styles.otpRow}>
            {digits.map((d, i) => (
              <TextInput
                key={i}
                ref={(el) => { inputs.current[i] = el; }}
                style={[
                  styles.otpBox,
                  d ? styles.otpBoxFilled : null,
                  success ? styles.otpBoxSuccess : null,
                  error ? styles.otpBoxError : null,
                ]}
                value={d}
                onChangeText={(t) => handleChange(t, i)}
                onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
                editable={!loading && !success}
                caretHidden
              />
            ))}
          </View>

          {/* Status */}
          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : success ? (
            <Text style={styles.successText}>Email verified!</Text>
          ) : null}

          {/* Verify Button */}
          <Pressable
            style={[styles.primaryBtn, (loading || success) && styles.primaryBtnDisabled]}
            onPress={() => handleVerify()}
            disabled={loading || success}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.primaryBtnText}>Verify</Text>
            )}
          </Pressable>

          {/* Back */}
          <Pressable onPress={() => router.back()} style={styles.backLink}>
            <Text style={styles.backLinkText}>← Back</Text>
          </Pressable>

          {/* Hint */}
          <Text style={styles.hint}>
            Didn't get it? Check your spam folder or go back and re-register.
          </Text>
        </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  header: { marginBottom: 40 },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: colors.ink,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 16,
  },
  badgeText: { color: colors.white, fontSize: 12, fontWeight: "700" },
  title: { fontSize: 24, fontWeight: "700", color: colors.ink, marginBottom: 8 },
  sub: { fontSize: 14, color: colors.dark, lineHeight: 20 },
  emailHighlight: { color: colors.ink, fontWeight: "600" },

  // OTP Boxes
  otpRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginBottom: 24,
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
  otpBoxFilled: {
    borderColor: colors.ink,
    backgroundColor: colors.white,
  },
  otpBoxSuccess: {
    borderColor: "#2E7D32",
    backgroundColor: "#F1F8E9",
    color: "#2E7D32",
  },
  otpBoxError: {
    borderColor: "#D32F2F",
    backgroundColor: "#FFF8F8",
  },

  errorText: { fontSize: 13, color: "#D32F2F", fontWeight: "500", marginBottom: 16 },
  successText: { fontSize: 13, color: "#2E7D32", fontWeight: "600", marginBottom: 16 },

  primaryBtn: {
    backgroundColor: colors.ink,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 16,
  },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { color: colors.white, fontSize: 16, fontWeight: "700" },

  backLink: { marginBottom: 24 },
  backLinkText: { fontSize: 14, color: colors.dark },

  hint: {
    fontSize: 12,
    color: colors.mid,
    lineHeight: 18,
  },
});
