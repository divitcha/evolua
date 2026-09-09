import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { storage } from "@/src/utils/storage";
import { api, AUTH_TOKEN_KEY } from "@/src/api/client";

interface Trainer {
  id: string;
  name: string;
  email: string;
}

interface AuthState {
  trainer: Trainer | null;
  token: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const TRAINER_KEY = "apex_trainer_profile";

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [trainer, setTrainer] = useState<Trainer | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const savedToken = await storage.secureGet(AUTH_TOKEN_KEY, "");
      const savedTrainer = await storage.getItem<any>(TRAINER_KEY, null);
      if (savedToken) {
        setToken(savedToken);
        if (savedTrainer) setTrainer(savedTrainer as Trainer);
      }
      setLoading(false);
    })();
  }, []);

  const persist = useCallback(async (t: string, prof: Trainer) => {
    await storage.secureSet(AUTH_TOKEN_KEY, t);
    await storage.setItem(TRAINER_KEY, prof as any);
    setToken(t);
    setTrainer(prof);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await api.login(email, password);
    await persist(res.access_token, res.trainer);
  }, [persist]);

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    const res = await api.register(name, email, password);
    await persist(res.access_token, res.trainer);
  }, [persist]);

  const signOut = useCallback(async () => {
    await storage.secureRemove(AUTH_TOKEN_KEY);
    await storage.removeItem(TRAINER_KEY);
    setToken(null);
    setTrainer(null);
  }, []);

  return (
    <AuthContext.Provider value={{ trainer, token, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
