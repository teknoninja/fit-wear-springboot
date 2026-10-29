// client/src/context/AuthContext.jsx
//
// The single source of truth for "who is logged in". Everything else in the app
// (navbar, protected routes, wishlist, checkout) reads from useAuth().
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import apiClient from "../lib/apiClient";

const AuthContext = createContext(null);

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
};

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const user = session?.user ?? null;

  // 1. Read session from localStorage on startup
  useEffect(() => {
    const storedToken = localStorage.getItem("estore_token");
    const storedUser = localStorage.getItem("estore_user");

    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setSession({ access_token: storedToken, user: parsedUser });
      } catch {
        localStorage.removeItem("estore_token");
        localStorage.removeItem("estore_user");
      }
    }
    setLoading(false);
  }, []);

  // 2. Load profile row whenever user changes
  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    let active = true;

    apiClient
      .get(`/profiles/${user.id}`)
      .then(({ data }) => {
        if (active) setProfile(data);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [user?.id]);

  // --- actions -------------------------------------------------------------

  const signUp = async ({ email, password, fullName }) => {
    try {
      const { data } = await apiClient.post("/auth/register", {
        email,
        password,
        fullName,
      });

      localStorage.setItem("estore_token", data.token);
      localStorage.setItem("estore_user", JSON.stringify(data.user));
      setSession({ access_token: data.token, user: data.user });
      return { error: null, needsEmailConfirmation: false };
    } catch (err) {
      const message = err.response?.data?.error || err.message || "Registration failed";
      return { error: new Error(message) };
    }
  };

  const signIn = async ({ email, password }) => {
    try {
      const { data } = await apiClient.post("/auth/login", {
        email,
        password,
      });

      localStorage.setItem("estore_token", data.token);
      localStorage.setItem("estore_user", JSON.stringify(data.user));
      setSession({ access_token: data.token, user: data.user });
      return { error: null };
    } catch (err) {
      const message = err.response?.data?.error || err.message || "Invalid email or password";
      return { error: new Error(message) };
    }
  };

  const signOut = async () => {
    localStorage.removeItem("estore_token");
    localStorage.removeItem("estore_user");
    setSession(null);
    setProfile(null);
    return { error: null };
  };

  const sendPasswordReset = async () => {
    return { error: new Error("Password reset is managed by admin in this demo.") };
  };

  const updatePassword = async () => {
    return { error: new Error("Password update is managed by profile in this demo.") };
  };

  const updateProfile = async (fields) => {
    if (!user) return { error: new Error("Not signed in") };

    try {
      const { data } = await apiClient.put(`/profiles/${user.id}`, fields);
      setProfile(data);
      return { error: null };
    } catch (err) {
      return { error: err };
    }
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
