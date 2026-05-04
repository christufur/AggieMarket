import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const memoryStore: Record<string, string> = {};

const webStorage = {
  get: (key: string) =>
    typeof window !== "undefined" && window.localStorage
      ? window.localStorage.getItem(key)
      : null,
  set: (key: string, value: string) => {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  },
  delete: (key: string) => {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.removeItem(key);
    }
  },
};

export const storage = {
  async get(key: string): Promise<string | null> {
    if (Platform.OS === "web") return webStorage.get(key);
    if (memoryStore[key] !== undefined) return memoryStore[key];
    try {
      const v = await AsyncStorage.getItem(key);
      if (v != null) memoryStore[key] = v;
      return v;
    } catch {
      return null;
    }
  },
  async set(key: string, value: string): Promise<void> {
    memoryStore[key] = value;
    if (Platform.OS === "web") return webStorage.set(key, value);
    try {
      await AsyncStorage.setItem(key, value);
    } catch {}
  },
  async delete(key: string): Promise<void> {
    delete memoryStore[key];
    if (Platform.OS === "web") return webStorage.delete(key);
    try {
      await AsyncStorage.removeItem(key);
    } catch {}
  },
};
