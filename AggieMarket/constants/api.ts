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
  listings: `${BASE}/listings`,
  listing: (id: string) => `${BASE}/listings/${id}`,
  listingImages: (id: string) => `${BASE}/listings/${id}/images`,
  services: `${BASE}/services`,
  service: (id: string) => `${BASE}/services/${id}`,
  serviceImages: (id: string) => `${BASE}/services/${id}/images`,
  events: `${BASE}/events`,
  event: (id: string) => `${BASE}/events/${id}`,
  eventImages: (id: string) => `${BASE}/events/${id}/images`,
  upload: `${BASE}/upload`,
  mediaUrl: (path: string) => `${BASE}${path}`,
  user: (id: number) => `${BASE}/users/${id}`,
  userListings: (id: number) => `${BASE}/users/${id}/listings`,
  userServices: (id: number) => `${BASE}/users/${id}/services`,
  userEvents: (id: number) => `${BASE}/users/${id}/events`,
  updateProfile: `${BASE}/users/me`,
};