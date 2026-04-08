import { Platform } from "react-native";

const BASE = Platform.OS === "web"
  ? (__DEV__
      ? (process.env.EXPO_PUBLIC_API_URL_WEB ?? "http://localhost:3000")
      : "https://aggiemarket.xyz")
  : Platform.OS === "android"
  ? (process.env.EXPO_PUBLIC_API_URL_ANDROID ?? "http://10.0.2.2:3000")
  : (process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000");

/** `http` → `ws`, `https` → `wss` */
const WS_BASE = BASE.replace(/^http/, "ws");

export const API = {
  register: `${BASE}/auth/register`,
  verifyEmail: `${BASE}/auth/verify-email`,
  resendVerification: `${BASE}/auth/resend-verification`,
  login: `${BASE}/auth/login`,
  forgotPassword: `${BASE}/auth/forgot-password`,
  resetPassword: `${BASE}/auth/reset-password`,
  me: `${BASE}/auth/me`,
  listings: `${BASE}/listings`,
  listingsPopular: (limit = 10) => `${BASE}/listings/popular?limit=${limit}`,
  search: `${BASE}/search`,
  listing: (id: string) => `${BASE}/listings/${id}`,
  listingImages: (id: string) => `${BASE}/listings/${id}/images`,
  services: `${BASE}/services`,
  servicesPopular: (limit = 10) => `${BASE}/services/popular?limit=${limit}`,
  service: (id: string) => `${BASE}/services/${id}`,
  serviceImages: (id: string) => `${BASE}/services/${id}/images`,
  events: `${BASE}/events`,
  eventsPopular: (limit = 10) => `${BASE}/events/popular?limit=${limit}`,
  event: (id: string) => `${BASE}/events/${id}`,
  eventImages: (id: string) => `${BASE}/events/${id}/images`,
  eventRsvp: (id: string) => `${BASE}/events/${id}/rsvp`,
  eventAttendees: (id: string) => `${BASE}/events/${id}/attendees`,
  upload: `${BASE}/upload`,
  mediaUrl: (path: string) => `${BASE}${path}`,
  user: (id: number) => `${BASE}/users/${id}`,
  userListings: (id: number) => `${BASE}/users/${id}/listings`,
  userServices: (id: number) => `${BASE}/users/${id}/services`,
  userEvents: (id: number) => `${BASE}/users/${id}/events`,
  updateProfile: `${BASE}/users/me`,
  pushToken: `${BASE}/users/me/push-token`,
  conversations: `${BASE}/conversations`,
  conversation: (id: string) => `${BASE}/conversations/${id}`,
  conversationMessages: (id: string) => `${BASE}/conversations/${id}/messages`,
  conversationUnreadCount: `${BASE}/conversations/unread-count`,
  conversationRead: (id: string) => `${BASE}/conversations/${id}/read`,
  saved: `${BASE}/saved`,
  savedCheck: `${BASE}/saved/check`,
  savedItem: (id: number) => `${BASE}/saved/${id}`,
  wsChat: (token: string) =>
    `${WS_BASE}/ws/chat?token=${encodeURIComponent(token)}`,
  markSold: (id: string) => `${BASE}/listings/${id}/mark-sold`,
  ratings: `${BASE}/ratings`,
  userRatings: (id: number) => `${BASE}/users/${id}/ratings`,
  reports: `${BASE}/reports`,
  adminReports: `${BASE}/admin/reports`,
  adminReportResolve: (id: number) => `${BASE}/admin/reports/${id}/resolve`,
  adminReportDismiss: (id: number) => `${BASE}/admin/reports/${id}/dismiss`,
};
