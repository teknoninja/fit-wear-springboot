// api/_supabase.js
//
// Server-side Supabase helpers. The leading underscore keeps Vercel from
// exposing this file as its own HTTP endpoint.
import { createClient } from "@supabase/supabase-js";

// SERVICE ROLE KEY — bypasses Row Level Security entirely.
// It must only ever live in Vercel env vars and never be sent to the browser.
// Note the name has no VITE_ prefix, which is what stops Vite from inlining it
// into the client bundle.
// Env values pasted into a dashboard routinely arrive with a stray space or
// wrapping quotes, and supabase-js rejects anything that does not start with
// http(s):// — which surfaces as a 500 at checkout rather than anything
// obviously configuration-related. Normalise before use.
const clean = (value) =>
  (value ?? "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .trim();

export const supabaseAdmin = () => {
  let url = clean(process.env.SUPABASE_URL);
  const serviceKey = clean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (!url || !serviceKey) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variable."
    );
  }

  // Accept a bare host, and tolerate someone pasting the REST endpoint instead
  // of the project URL — the client appends /rest/v1 itself.
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  url = url.replace(/\/+$/, "").replace(/\/rest\/v1$/i, "");

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