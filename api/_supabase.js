// api/_supabase.js
//
// Server-side Supabase helpers. The leading underscore keeps Vercel from
// exposing this file as its own HTTP endpoint.
import { createClient } from "@supabase/supabase-js";

// SERVICE ROLE KEY — bypasses Row Level Security entirely.
// It must only ever live in Vercel env vars and never be sent to the browser.
// Note the name has no VITE_ prefix, which is what stops Vite from inlining it
// into the client bundle.
export const supabaseAdmin = () => {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variable."
    );
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};

// Turns an "Authorization: Bearer <jwt>" header into a verified user.
// Returns null for a missing, malformed, or expired token — never throws, so
// callers can just fall through to guest behaviour.
export const getUserFromRequest = async (req) => {
  const header = req.headers.authorization || req.headers.Authorization;
  if (!header?.startsWith("Bearer ")) return null;

  const token = header.slice("Bearer ".length).trim();
  if (!token) return null;

  try {
    // getUser() checks the JWT signature against the project's keys, so a
    // forged or tampered token is rejected here.
    const { data, error } = await supabaseAdmin().auth.getUser(token);
    if (error) return null;
    return data.user ?? null;
  } catch (err) {
    console.error("Failed to verify access token:", err.message);
    return null;
  }
};
