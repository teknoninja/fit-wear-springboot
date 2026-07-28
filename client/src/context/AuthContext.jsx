// client/src/context/AuthContext.jsx
//
// The single source of truth for "who is logged in". Everything else in the app
// (navbar, protected routes, wishlist, checkout) reads from useAuth().
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import supabase from "../lib/supabaseClient";

const AuthContext = createContext(null);

// Exported next to the provider on purpose — it only costs full-file HMR here.
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
};

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  // Starts true so protected routes show a spinner instead of bouncing a
  // logged-in user to /login during the first render.
  const [loading, setLoading] = useState(true);

  const user = session?.user ?? null;

  useEffect(() => {
    let active = true;

    // 1. Read whatever session is already in localStorage.
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
    });

    // 2. Then keep it in sync: sign in, sign out, token refresh, OAuth return.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  // Load the matching profile row whenever the user changes.
  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    let active = true;

    supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (active) setProfile(data);
      });

    return () => {
      active = false;
    };
  }, [user?.id]);

  // --- actions -------------------------------------------------------------
  // Each returns { error } so the calling form can show the message inline
  // instead of every screen having to wrap calls in try/catch.

  const signUp = async ({ email, password, fullName }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Picked up by the handle_new_user() trigger to fill in profiles.full_name.
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) return { error };

    // With "Confirm email" on (the Supabase default), there is no session yet —
    // the user has to click the link in their inbox first.
    return { error: null, needsEmailConfirmation: !data.session };
  };

  const signIn = async ({ email, password }) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  // Sends the "reset your password" email. The link lands on /reset-password
  // with a recovery session already active, which is what lets updatePassword
  // work there without the old password.
  const sendPasswordReset = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  };

  const updatePassword = async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error };
  };

  const updateProfile = async (fields) => {
    if (!user) return { error: new Error("Not signed in") };

    // upsert, not update: covers the edge case where the signup trigger did not
    // run (e.g. a user created straight from the Supabase dashboard).
    const { data, error } = await supabase
      .from("profiles")
      .upsert({ id: user.id, ...fields, updated_at: new Date().toISOString() })
      .select()
      .single();

    if (!error) setProfile(data);
    return { error };
  };

  const value = useMemo(
    () => ({
      session,
      user,
      profile,
      loading,
      isLoggedIn: !!user,
      signUp,
      signIn,
      signOut,
      sendPasswordReset,
      updatePassword,
      updateProfile,
    }),
    [session, user, profile, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
