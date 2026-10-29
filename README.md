# Our Little Universe

A romantic website for Poovu and Shiva. It uses Google sign-in through Supabase, with couple-only data access, shared chat/surprises, realtime updates, and private media storage.

## Supabase setup (free tier)

1. Create a Supabase project on the Free plan.
2. In Authentication → Providers, enable Google. Create a Google OAuth Web client in Google Cloud and add the callback URL shown by Supabase to its Authorized redirect URIs. Paste the Google client ID and secret into Supabase's Google provider settings.
3. In Authentication → URL Configuration, add `http://localhost:3000` and your Vercel site URL as redirect URLs. Set the Vercel URL as Site URL after deployment.
4. Run [`supabase-setup.sql`](supabase-setup.sql) once in the Supabase SQL Editor. It creates the shared data table, realtime publication, private media bucket, and row-level security policies limited to Poovu's and Shiva's email addresses.
5. Copy the Supabase project URL and publishable key into `.env.local` using `.env.example` as the template.

Google sign-in creates each account on first use. Only the two emails in the SQL policies can read or write app data. Do not put a Supabase service-role key in the website or Vercel client environment.

## Run locally

Requirements: Node.js 20+ and npm.

```powershell
npm install
npm run dev
```

Open `http://localhost:3000`.

## Deploy to Vercel for free

Vercel Hobby is for personal, non-commercial use. Import the project into Vercel, then add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for Preview and Production. Deploy, add the Vercel hostname to Supabase Auth redirect URLs, and redeploy.

Supabase Free currently includes 500 MB database, 1 GB storage, and 50,000 monthly active Auth users; inactive free projects may pause after one week. Keep media within the included quota. See the live provider limits before uploading a large photo collection.

## Checks

```powershell
npm run typecheck
npm run build
```

