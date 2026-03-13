"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types";
import type { User } from "@supabase/supabase-js";

// ─── Singleton auth cache to prevent duplicate Supabase calls ───
// This ensures that multiple components using useAuth() share the same
// auth state and don't each make separate getUser() + profile queries.

interface AuthState {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
}

let authState: AuthState = { user: null, profile: null, loading: true };
let listeners: Set<() => void> = new Set();
let initialized = false;

function getSnapshot(): AuthState {
  return authState;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setAuthState(newState: Partial<AuthState>) {
  authState = { ...authState, ...newState };
  listeners.forEach((l) => l());
}

async function initAuth() {
  if (initialized) return;
  initialized = true;

  const supabase = createClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      setAuthState({ user, profile: profileData, loading: false });
    } else {
      setAuthState({ user: null, profile: null, loading: false });
    }
  } catch {
    setAuthState({ user: null, profile: null, loading: false });
  }

  // Listen for auth state changes
  supabase.auth.onAuthStateChange(async (_event, session) => {
    const newUser = session?.user ?? null;
    if (newUser) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", newUser.id)
        .single();
      setAuthState({ user: newUser, profile: profileData });
    } else {
      setAuthState({ user: null, profile: null });
    }
  });
}

export function useAuth() {
  const [state, setState] = useState(getSnapshot);

  useEffect(() => {
    initAuth();
    const unsubscribe = subscribe(() => {
      setState(getSnapshot());
    });
    return unsubscribe;
  }, []);

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    initialized = false;
    setAuthState({ user: null, profile: null, loading: false });
    window.location.href = "/login";
  };

  const refreshProfile = async () => {
    const currentUser = authState.user;
    if (!currentUser) return;
    const supabase = createClient();
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", currentUser.id)
      .single();
    if (profileData) {
      setAuthState({ profile: profileData });
    }
  };

  return { user: state.user, profile: state.profile, loading: state.loading, signOut, refreshProfile };
}
