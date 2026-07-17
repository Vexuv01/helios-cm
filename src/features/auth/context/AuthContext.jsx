import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { AuthContext } from "./auth-context";

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(userId) {
    if (!userId) {
      setProfile(null);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error(error);
      setProfile(null);
      return;
    }

    setProfile(data);
  }

  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error(error);
      }

      if (!mounted) return;

      const nextSession = data?.session ?? null;
      const nextUser = nextSession?.user ?? null;

      setSession(nextSession);
      setUser(nextUser);

      if (nextUser?.id) {
        await loadProfile(nextUser.id);
      }

      setLoading(false);
    }

    initializeAuth();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, nextSession) => {
        const nextUser = nextSession?.user ?? null;

        setSession(nextSession);
        setUser(nextUser);

        if (nextUser?.id) {
          await loadProfile(nextUser.id);
        } else {
          setProfile(null);
        }

        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function signIn(email, password) {
    return supabase.auth.signInWithPassword({ email, password });
  }

  async function signOut() {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
  }

  const value = useMemo(
    () => ({
      session,
      user,
      profile,
      loading,
      isAuthenticated: Boolean(session?.user),
      signIn,
      signOut,
    }),
    [session, user, profile, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
