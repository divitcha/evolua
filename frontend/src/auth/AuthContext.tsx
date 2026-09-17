import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { storage } from "@/src/utils/storage";
import { api, AUTH_TOKEN_KEY } from "@/src/api/client";

interface UserProfile {
  id: string;
  name: string;
  email: string;
}

interface AuthState {
  user: UserProfile | null;
  role: "admin" | "trainer" | "student" | null;
  token: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  // For backwards compatibility in other components temporarily:
  trainer: UserProfile | null; 
}

const USER_KEY = "apex_user_profile";
const ROLE_KEY = "apex_user_role";

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<"admin" | "trainer" | "student" | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const savedToken = await storage.secureGet(AUTH_TOKEN_KEY, "");
      const savedUser = await storage.getItem<any>(USER_KEY, null);
      const savedRole = await storage.getItem<any>(ROLE_KEY, null);
      
      const oldTrainer = await storage.getItem<any>("apex_trainer_profile", null);
      
      if (savedToken) {
        setToken(savedToken);
        if (savedUser && savedRole) {
          setUser(savedUser as UserProfile);
          setRole(savedRole as "admin" | "trainer" | "student");
        } else if (oldTrainer) {
          setUser(oldTrainer as UserProfile);
          setRole("trainer");
        }
      }
      setLoading(false);
    })();
  }, []);

  const persist = useCallback(async (t: string, prof: UserProfile, userRole: "admin" | "trainer" | "student") => {
    await storage.secureSet(AUTH_TOKEN_KEY, t);
    await storage.setItem(USER_KEY, prof as any);
    await storage.setItem(ROLE_KEY, userRole as any);
    setToken(t);
    setUser(prof);
    setRole(userRole);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await api.loginUnified(email, password);
    await persist(res.access_token, res.user, res.role as "admin" | "trainer" | "student");
  }, [persist]);

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    const res = await api.register(name, email, password);
    await persist(res.access_token, res.trainer, "trainer");
  }, [persist]);

  const signOut = useCallback(async () => {
    await storage.secureRemove(AUTH_TOKEN_KEY);
    await storage.removeItem(USER_KEY);
    await storage.removeItem(ROLE_KEY);
    await storage.removeItem("apex_trainer_profile");
    setToken(null);
    setUser(null);
    setRole(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, trainer: user, token, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
