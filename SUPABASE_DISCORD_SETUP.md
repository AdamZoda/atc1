# Supabase + Discord OAuth setup (quick steps)

1) Files added
- `.env` (local, contains your Supabase keys) — is ignored by git.
- `.env.example` (example, no secrets).

2) Supabase (you already added keys)
- Ensure `VITE_SUPABASE_URL` matches your Project URL (in Supabase Settings → General).
- Ensure `VITE_SUPABASE_ANON_KEY` is set to the Publishable/Anon key (in Supabase → API Keys).
- In Supabase → Authentication → URL Configuration → Redirect URLs add these (dev & prod):
  - `http://localhost:5173/#/auth/callback`
  - `https://atlanticrp.vercel.app/#/auth/callback`

3) Discord Developer Portal
- Open your Discord application → OAuth2 → Redirects, and add the Supabase callback URL exactly as shown in Supabase Authentication settings (example):
  - `https://jurvkrrhvohlsbbyokln.supabase.co/auth/v1/callback`
  This is necessary because Supabase performs the provider callback server-side.

4) Discord credentials
- In Discord Developer Portal copy `Client ID` and `Client Secret` and paste them into Supabase → Authentication → Sign In / Providers → Discord (you may have done this).

5) Frontend config (already implemented)
- `pages/Login.tsx` uses `supabase.auth.signInWithOAuth({ provider: 'discord', options: { redirectTo: `${window.location.origin}/#/auth/callback` } })`.
- `pages/AuthCallback.tsx` calls `supabase.auth.getSessionFromUrl({ storeSession: true })` and redirects to `/` on success.

6) What is still missing from me (I can add these for you):
- `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET` to populate `.env` and keep for reference.

7) Testing
- Start dev server, open `http://localhost:5173/#/login`, click "Discord".
- If you get "redirect_uri OAuth2 non valide", ensure the `redirect_uri` in the Discord authorize URL exactly matches the redirect URL registered in Discord.
