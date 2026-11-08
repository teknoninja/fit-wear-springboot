# User Authorization — Setup Guide

Auth for Fit-Wear runs on **Supabase Auth**, which is free for ~50,000 monthly
active users. Supabase holds accounts, profiles, orders, wishlist and the saved
cart — and, since the catalog migration, the products too (see
[CATALOG_SETUP.md](CATALOG_SETUP.md)).

Total setup time is about 15 minutes, and it costs nothing.

---

## 1. Create the Supabase project

1. Sign up at [supabase.com](https://supabase.com) and click **New project**.
2. Give it a name and a database password, and pick the region closest to you.
3. Wait ~2 minutes for it to provision.

## 2. Create the tables

1. In the dashboard, open **SQL Editor → New query**.
2. Paste the entire contents of [`supabase/schema.sql`](supabase/schema.sql).
3. Click **Run**.

This creates `profiles`, `orders`, `order_items`, `wishlist` and `carts`, turns
on Row Level Security for all of them, and adds a trigger that creates a profile
row automatically whenever someone signs up. The file is safe to re-run.

## 3. Add the environment variables

### Where to find each value

Supabase split the old "API" settings page in two during a 2025 redesign. From
**Project Settings** (the gear icon at the bottom of the left sidebar):

| Value | Location |
|---|---|
| Project URL | **Data API** → *Project URL* |
| Publishable / anon key | **API Keys** → the key starting `sb_publishable_` |
| Service role / secret key | **API Keys** → *Secret keys* → click to reveal (`sb_secret_…`) |

On projects created before that change, the **API Keys** page has a **Legacy
API keys** tab holding the classic `anon` and `service_role` JWTs. Either set
works with the installed client.

**Shortcut:** the **Connect** button at the top of the dashboard → *App
Frameworks* → *React / Vite* prints the URL and publishable key already
formatted as env vars.

The Stripe keys are not in Supabase — they're at
[dashboard.stripe.com](https://dashboard.stripe.com) → **Developers → API keys**.

### The client file

`client/.env` already exists with the variable names and empty values — just
paste yours in:

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_xxx
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
```

No quotes, and no spaces around the `=`. Restart the dev server afterwards —
Vite only reads `.env` at startup.

### The server variables

In **Vercel → your project → Settings → Environment Variables** add:

```
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
VITE_SANITY_PROJECT_ID=y4feni72
VITE_SANITY_DATASET=production
SANITY_API_WRITE_TOKEN=your-sanity-write-token
```

> **The `service_role` key must never appear in `client/.env`.** It bypasses
> Row Level Security entirely, so anyone who gets it can read and modify every
> user's data. Note it deliberately has no `VITE_` prefix — that prefix is what
> tells Vite to inline a value into the public JS bundle.

See [`.env.example`](.env.example) for the annotated version of both blocks.

## 4. Configure the redirect URLs

In Supabase, go to **Authentication → URL Configuration**:

- **Site URL**: `http://localhost:5173` for local dev (change to your real
  domain when you deploy).
- **Redirect URLs**: add both, one per line:
  - `http://localhost:5173/**`
  - `https://your-domain.com/**`

Password-reset and email-confirmation links will silently fail to come back to
your app if these are missing.

## 5. Run it

```bash
cd client
npm install
npm run dev
```

Open `http://localhost:5173/register` and create an account.

> **Local checkout:** `vite.config.js` proxies `/api` to `localhost:1337`. The
> serverless functions in `api/` actually run under `vercel dev` (port 3000), so
> point the proxy there — or run `vercel dev` from the project root — if you
> want to test payment locally. Auth, wishlist and profile all work without it.

---

## What you get

| Route | Access | What it does |
|---|---|---|
| `/register` | public | Email + password signup |
| `/login` | public | Sign in, with "remember where I was going" redirect |
| `/forgot-password` | public | Emails a reset link |
| `/reset-password` | public | Landing page for that link |
| `/auth/callback` | public | Landing page for email-confirmation links |
| `/profile` | **signed in** | Name, phone, shipping address |
| `/orders` | **signed in** | Past orders with line items |
| `/wishlist` | **signed in** | Saved products |

Plus:

- **Navbar** — the person icon becomes an avatar with a dropdown once signed in;
  the heart icon shows a live wishlist count.
- **Wishlist** — the heart on any product card or product page. Clicking it
  while signed out sends you to login and then back to that product.
- **Cart sync** — your cart is saved to your account and merges with whatever is
  in the browser when you sign in, so it follows you between devices.
- **Order history** — written by the Stripe webhook after a successful payment.

---

## How the security works

Three things do the real work here. It's worth understanding them, because
skipping any one of them leaves the store wide open.

**1. Row Level Security is what protects your data.** The `anon` key sits in
your JS bundle and anyone can read it out — that's by design. What stops someone
using it to dump every customer's orders is RLS: Postgres checks
`auth.uid() = user_id` on every row of every query. Without the policies in
`schema.sql`, those tables would be world-readable.

**2. Orders are read-only from the browser.** There is deliberately no insert or
update policy on `orders`. Only the Stripe webhook can create them, using the
service-role key, and only after verifying Stripe's signature. A user cannot
mark their own order paid.

**3. Prices come from the database, not the browser.** `api/checkout.js` treats
the posted cart as just a list of ids and quantities, then looks up the real
price for each one. Otherwise a user could edit the request and buy a jacket for
$0.01.

---

## Troubleshooting

**"Missing Supabase env vars" on startup** — `client/.env` is missing or the
variable names are misspelled. Restart the dev server after creating it; Vite
only reads `.env` at startup.

**Signup succeeds but no email arrives** — Supabase's built-in mailer is rate
limited to a few messages an hour on the free tier. For real traffic, connect
your own SMTP under **Authentication → Email Templates → SMTP Settings**. To
skip confirmation entirely while developing, turn off **Confirm email** under
**Authentication → Providers → Email**.

**Orders never appear after payment** — check the webhook. In Stripe, go to
**Developers → Webhooks**, confirm the endpoint points at
`https://your-domain.com/api/webhook`, that it's subscribed to
`checkout.session.completed`, and that `STRIPE_WEBHOOK_SECRET` matches the
signing secret shown there. Recent deliveries on that page will show the error
if one is failing.

**A profile row is missing for some user** — the signup trigger did not run
(usually a user created by hand in the dashboard). Saving the profile form
recreates it, since the app upserts rather than updates.
