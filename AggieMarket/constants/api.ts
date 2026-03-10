import { Platform } from "react-native";

// iOS simulator → localhost, Android emulator → 10.0.2.2
const BASE = Platform.OS === "android" ? "http://10.0.2.2:3000" : "http://localhost:3000";

export const API = {
  register: `${BASE}/auth/register`,
  verifyEmail: `${BASE}/auth/verify-email`,
  login: `${BASE}/auth/login`,
  me: `${BASE}/auth/me`,
};
