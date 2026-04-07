import { useRef, useState } from "react";
import { View, Pressable, TextInput, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { API } from "@/constants/api";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const CODE_LENGTH = 6;

export default function RegisterScreenWeb() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  const maskedEmail = email.replace(/(.{2}).+(@.+)/, "$1...$2");

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
          <Text className="text-2xl font-bold text-foreground">
            Create account
          </Text>
          <Text className="text-center text-sm text-muted-foreground">
            Join Aggie Market to buy and sell with NMSU students
          </Text>
        </CardHeader>

        <Separator />

        <CardContent className="gap-4 pt-6">
          <View className="gap-1.5">
            <Text className="text-sm font-semibold text-foreground">Name</Text>
            <Input
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              autoCapitalize="words"
              autoComplete="name"
              editable={!loading}
            />
          </View>

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
              placeholder="Min. 8 characters"
              secureTextEntry
              autoComplete="password-new"
              editable={!loading}
            />
          </View>

          <View className="gap-1.5">
            <Text className="text-sm font-semibold text-foreground">
              Confirm password
            </Text>
            <Input
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Re-enter password"
              secureTextEntry
              autoComplete="password-new"
              editable={!loading}
            />
          </View>

          {error ? (
            <Text className="text-sm font-medium text-destructive">
              {error}
            </Text>
          ) : null}

          <Button onPress={handleRegister} disabled={loading} className="mt-1">
            {loading ? (
              <View className="flex-row items-center gap-2">
                <ActivityIndicator color="#FFFFFF" size="small" />
                <Text className="text-sm font-semibold text-primary-foreground">
                  Creating...
                </Text>
              </View>
            ) : (
              <Text className="text-sm font-semibold text-primary-foreground">
                Create account
              </Text>
            )}
          </Button>
        </CardContent>
      </Card>

      <Pressable onPress={() => router.push("/login")} className="mt-6">
        <Text className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <Text className="font-semibold text-foreground">Log in</Text>
        </Text>
      </Pressable>

      {/* OTP Verification Dialog */}
      <Dialog open={showOTP} onOpenChange={setShowOTP}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <Text>Check your inbox</Text>
            </DialogTitle>
          </DialogHeader>

          <Text className="text-sm text-muted-foreground">
            We sent a 6-digit code to{" "}
            <Text className="font-semibold text-foreground">{maskedEmail}</Text>
          </Text>

          <View className="my-4 flex-row justify-center gap-2">
            {digits.map((d, i) => (
              <TextInput
                key={i}
                ref={(el) => {
                  inputs.current[i] = el;
                }}
                style={{
                  width: 44,
                  height: 52,
                  borderWidth: 2,
                  borderColor: otpSuccess
                    ? "#2E7D32"
                    : otpError
                      ? "#D32F2F"
                      : d
                        ? "#212121"
                        : "#E0E0E0",
                  borderRadius: 10,
                  textAlign: "center",
                  fontSize: 20,
                  fontWeight: "700",
                  color: otpSuccess ? "#2E7D32" : "#212121",
                  backgroundColor: otpSuccess
                    ? "#F1F8E9"
                    : otpError
                      ? "#FFF8F8"
                      : d
                        ? "#FFFFFF"
                        : "#F5F5F5",
                }}
                value={d}
                onChangeText={(t) => handleDigitChange(t, i)}
                onKeyPress={({ nativeEvent }) =>
                  handleKeyPress(nativeEvent.key, i)
                }
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
                editable={!otpLoading && !otpSuccess}
              />
            ))}
          </View>

          {otpError ? (
            <Text className="text-center text-sm font-medium text-destructive">
              {otpError}
            </Text>
          ) : otpSuccess ? (
            <Text className="text-center text-sm font-semibold text-green-700">
              Verified!
            </Text>
          ) : null}

          <DialogFooter>
            <Button
              variant="outline"
              onPress={() => setShowOTP(false)}
              disabled={otpLoading || otpSuccess}
            >
              <Text>Cancel</Text>
            </Button>
            <Button
              onPress={() => handleVerify()}
              disabled={otpLoading || otpSuccess}
            >
              {otpLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text className="text-sm font-semibold text-primary-foreground">
                  Verify
                </Text>
              )}
            </Button>
          </DialogFooter>

          <Text className="mt-2 text-center text-xs text-muted-foreground">
            Didn't get it? Check your spam folder.
          </Text>
        </DialogContent>
      </Dialog>
    </View>
  );
}
