import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { API } from "../constants/api";

type User = {
  id: number;
  name: string;
  email: string;
  status: string;
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

const storage = {
  get: (key: string) => localStorage.getItem(key),
  set: (key: string, value: string) => localStorage.setItem(key, value),
  delete: (key: string) => localStorage.removeItem(key),
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const stored = storage.get(TOKEN_KEY);
        if (stored) {
          const res = await fetch(API.me, {
            headers: { Authorization: `Bearer ${stored}` },
          });
          const data = await res.json();
          if (data.user) {
            setToken(stored);
            setUser(data.user);
          } else {
            storage.delete(TOKEN_KEY);
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
    storage.set(TOKEN_KEY, newToken);
    setToken(newToken);
    setUser(newUser);
  };

  const logout = async () => {
    storage.delete(TOKEN_KEY);
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
