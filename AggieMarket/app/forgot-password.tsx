import { useRef, useState } from "react";
import { View, Pressable, TextInput, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { API } from "@/constants/api";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

const CODE_LENGTH = 6;

type Step = "email" | "reset";

export default function ForgotPasswordScreen() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState("");

  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState(false);
  const inputs = useRef<(TextInput | null)[]>([]);

  const handleRequestCode = async () => {
    setEmailError("");
    if (!email) {
      setEmailError("Please enter your email.");
      return;
    }

    setEmailLoading(true);
    try {
      const res = await fetch(API.forgotPassword, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.status === 200) {
        setStep("reset");
      } else {
        setEmailError(data.message || "Something went wrong.");
      }
    } catch {
      setEmailError("Could not connect to server.");
    } finally {
      setEmailLoading(false);
    }
  };

  const handleDigitChange = (text: string, index: number) => {
    const digit = text.replace(/[^0-9]/g, "").slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    setResetError("");

    if (digit && index < CODE_LENGTH - 1) {
      inputs.current[index + 1]?.focus();
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

  const handleReset = async () => {
    setResetError("");
    const token = digits.join("");
    if (token.length < CODE_LENGTH) {
      setResetError("Enter all 6 digits.");
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      setResetError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setResetError("Passwords do not match.");
      return;
    }

    setResetLoading(true);
    try {
      const res = await fetch(API.resetPassword, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token, newPassword }),
      });
      const data = await res.json();

      if (data.status === 200) {
        setResetSuccess(true);
        setTimeout(() => router.replace("/login"), 1500);
      } else {
        setResetError(data.message || "Failed to reset password.");
        if (data.status === 400 && data.message?.includes("expired")) {
          setDigits(Array(CODE_LENGTH).fill(""));
        }
      }
    } catch {
      setResetError("Could not connect to server.");
    } finally {
      setResetLoading(false);
    }
  };

  const maskedEmail = email.replace(/(.{2}).+(@.+)/, "$1•••$2");

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
            {step === "email" ? "Forgot password" : "Reset password"}
          </Text>
          <Text className="text-center text-sm text-muted-foreground">
            {step === "email"
              ? "Enter your NMSU email and we'll send a reset code"
              : `Enter the code sent to ${maskedEmail} and choose a new password`}
          </Text>
        </CardHeader>

        <Separator />

        <CardContent className="gap-5 pt-6">
          {step === "email" ? (
            <>
              <View className="gap-1.5">
                <Text className="text-sm font-semibold text-foreground">
                  Email
                </Text>
                <Input
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@nmsu.edu"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  editable={!emailLoading}
                />
              </View>

              {emailError ? (
                <Text className="text-sm font-medium text-destructive">
                  {emailError}
                </Text>
              ) : null}

              <Button
                onPress={handleRequestCode}
                disabled={emailLoading}
                className="mt-1"
              >
                {emailLoading ? (
                  <View className="flex-row items-center gap-2">
                    <ActivityIndicator color="#FFFFFF" size="small" />
                    <Text className="text-sm font-semibold text-primary-foreground">
                      Sending...
                    </Text>
                  </View>
                ) : (
                  <Text className="text-sm font-semibold text-primary-foreground">
                    Send reset code
                  </Text>
                )}
              </Button>
            </>
          ) : (
            <>
              <View className="gap-2">
                <Text className="text-sm font-semibold text-foreground">
                  Reset code
                </Text>
                <View className="flex-row justify-center gap-2">
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
                        borderColor: resetSuccess
                          ? "#2E7D32"
                          : resetError
                            ? "#D32F2F"
                            : d
                              ? "#212121"
                              : "#E0E0E0",
                        borderRadius: 10,
                        textAlign: "center",
                        fontSize: 20,
                        fontWeight: "700",
                        color: resetSuccess ? "#2E7D32" : "#212121",
                        backgroundColor: resetSuccess
                          ? "#F1F8E9"
                          : resetError
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
                      editable={!resetLoading && !resetSuccess}
                    />
                  ))}
                </View>
              </View>

              <View className="gap-1.5">
                <Text className="text-sm font-semibold text-foreground">
                  New password
                </Text>
                <Input
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Min. 8 characters"
                  secureTextEntry
                  autoComplete="password-new"
                  editable={!resetLoading && !resetSuccess}
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
                  editable={!resetLoading && !resetSuccess}
                />
              </View>

              {resetError ? (
                <Text className="text-sm font-medium text-destructive">
                  {resetError}
                </Text>
              ) : resetSuccess ? (
                <Text className="text-sm font-semibold text-green-700">
                  Password updated! Redirecting to login...
                </Text>
              ) : null}

              <Button
                onPress={handleReset}
                disabled={resetLoading || resetSuccess}
                className="mt-1"
              >
                {resetLoading ? (
                  <View className="flex-row items-center gap-2">
                    <ActivityIndicator color="#FFFFFF" size="small" />
                    <Text className="text-sm font-semibold text-primary-foreground">
                      Resetting...
                    </Text>
                  </View>
                ) : (
                  <Text className="text-sm font-semibold text-primary-foreground">
                    Reset password
                  </Text>
                )}
              </Button>

              <Pressable
                onPress={() => {
                  setStep("email");
                  setDigits(Array(CODE_LENGTH).fill(""));
                  setResetError("");
                }}
              >
                <Text className="text-center text-sm text-muted-foreground">
                  ← Use a different email
                </Text>
              </Pressable>
            </>
          )}
        </CardContent>
      </Card>

      <Pressable onPress={() => router.push("/login")} className="mt-6">
        <Text className="text-sm text-muted-foreground">
          Remembered it?{" "}
          <Text className="font-semibold text-foreground">Log in</Text>
        </Text>
      </Pressable>
    </View>
  );
}
