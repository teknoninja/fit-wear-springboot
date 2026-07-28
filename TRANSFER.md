# Setting this up on your personal laptop

## 1. Install dependencies

`node_modules` was left out of the zip (448 MB, and it rebuilds from the lockfiles):

```bash
npm install                 # root — needed by the api/ functions
npm install --prefix client # the React app
```

## 2. Recreate the root `.env` — REQUIRED

**`client/.env` is included** in the zip. Everything in it is public by design:
the Supabase URL, the publishable/anon key and the Stripe publishable key all
ship inside the JavaScript bundle your visitors download.

**The root `.env` was deliberately left out.** It holds two secrets that must
never travel through Slack, email, or any chat system:

| Variable | Where to get it again |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API Keys → *Secret keys* |
| `STRIPE_SECRET_KEY` | Stripe → Developers → API keys → *Secret key* |

Create `.env` in the project root:

```
SUPABASE_URL=https://mwujewuqddkwoppdirbz.supabase.co
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

The service-role key bypasses every security rule on your database, so treat it
like a password. `.gitignore` already excludes both `.env` files, so neither
will be committed when you push to GitHub.

## 3. Run it

```bash
cd client && npm run dev      # http://localhost:5173
```

Auth, catalog, search, wishlist and profile all work. Checkout does not run
locally — see below.

## 4. Push to GitHub

```bash
git init
git config user.name  "Your Name"
git config user.email "you@personal.com"
git add -A
git commit -m "Auth + catalog on Supabase"
git remote add origin git@github.com:<you>/<repo>.git
git push -u origin main
```

Before committing, confirm no secrets are staged:

```bash
git status --short | grep -E "\.env$"      # should print nothing
```

## 5. Deploy

Full checklist in [AUTH_SETUP.md](AUTH_SETUP.md) and below. Short version:

```bash
vercel link --project e-store
./scripts/push-env-to-vercel.sh
vercel --prod
```

---

## Known state — read before deploying

**Checkout has never run.** The functions in `api/` are Vercel serverless and do
not execute under `npm run dev` (`vite.config.js` proxies `/api` to port 1337,
where nothing listens). The code is written but untested end to end. To finish:

1. **Vercel → Settings → General → Root Directory must be BLANK.** Set it to
   `client` and no functions deploy, so every checkout 404s. `vercel.json`
   already points the build at `client/`.
2. Push the env vars, then deploy.
3. Add a Stripe webhook at `https://<domain>/api/webhook` for
   `checkout.session.completed`. Put its signing secret in `.env` as
   `STRIPE_WEBHOOK_SECRET`, push again, redeploy. **Without this, payments
   succeed but no order is ever recorded.**
4. Add `https://<domain>/**` to Supabase → Authentication → URL Configuration,
   or password-reset links bounce users to localhost.

**Two loose ends:**

- `VITE_STRIPE_PUBLISHABLE_KEY` in `client/.env` has a leading space after the
  `=`. Vite tolerates it; `scripts/push-env-to-vercel.sh` does not, and would
  upload the key with the space. Remove it.
- The Supabase secret key ending `…EA_-68TIEDY` was exposed and is still valid.
  Revoke it under Project Settings → API Keys → Secret keys. The newer key
  ending `…0zNc_kcW` is the one in use — do not revoke that one.

**Unused files**, imported by nothing, safe to delete:
`client/src/components/GoogleButton/`, `client/src/components/ProductRail/`,
`client/src/lib/recommendations.js`, `supabase/recommendations.sql`,
`client/src/sanityClient.js`.

**Supabase already holds everything** — 600 products, the schema and the RLS
policies are live on the project. Nothing needs re-importing; the new laptop
just points at the same project.
