import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { API } from "../constants/api";
import { storage } from "../lib/storage";

type User = {
  id: number;
  name: string;
  email: string;
  status: string;
  is_admin?: number;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

const TOKEN_KEY = "aggie_token";

async function registerPushToken(authToken: string) {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== "granted") return;
  const { data: expoPushToken } = await Notifications.getExpoPushTokenAsync();
  await fetch(API.pushToken, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({ token: expoPushToken, platform: Platform.OS }),
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const stored = await storage.get(TOKEN_KEY);
        if (stored) {
          const res = await fetch(API.me, {
            headers: { Authorization: `Bearer ${stored}` },
          });
          const data = await res.json();
          if (data.user) {
            setToken(stored);
            setUser(data.user);
          } else {
            await storage.delete(TOKEN_KEY);
          }
        }
      } catch {
        // network error on launch — stay logged out
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = async (newToken: string, newUser: User) => {
    await storage.set(TOKEN_KEY, newToken);
    setToken(newToken);
    setUser(newUser);
    if (Platform.OS !== "web") {
      registerPushToken(newToken).catch(() => {});
    }
  };

  const logout = async () => {
    await storage.delete(TOKEN_KEY);
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
