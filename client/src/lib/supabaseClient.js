// client/src/lib/supabaseClient.js
import { createClient } from "@supabase/supabase-js";

// Trimmed for the same reason as api/_supabase.js: a stray space or quote from
// a pasted env var otherwise breaks the whole app at startup.
const clean = (v) => (v ?? "").trim().replace(/^["']|["']$/g, "").trim();

const supabaseUrl = clean(import.meta.env.VITE_SUPABASE_URL);
const supabaseAnonKey = clean(import.meta.env.VITE_SUPABASE_ANON_KEY);

// Fail loudly at startup rather than with a confusing "fetch failed" later.
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase env vars. Copy .env.example to client/.env and fill in " +
      "VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from your Supabase project settings."
  );
}

// The anon key is meant to be public — it ships in the JS bundle. Row Level
// Security (see supabase/schema.sql) is what actually protects the data.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,      // keep the user logged in across reloads
    autoRefreshToken: true,    // silently refresh the JWT before it expires
    detectSessionInUrl: true,  // needed for password-reset + email-confirm links
    flowType: "pkce",
  },
});

export default supabase;