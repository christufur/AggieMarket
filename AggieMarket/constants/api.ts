import { Platform } from "react-native";

const BASE = Platform.OS === "web"
  ? (process.env.EXPO_PUBLIC_API_URL_WEB ?? "https://aggiemarket.xyz")
  : Platform.OS === "android"
  ? (process.env.EXPO_PUBLIC_API_URL_ANDROID ?? "http://10.0.2.2:3000")
  : (process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000");

export const API = {
  register: `${BASE}/auth/register`,
  verifyEmail: `${BASE}/auth/verify-email`,
  login: `${BASE}/auth/login`,
  me: `${BASE}/auth/me`,
};