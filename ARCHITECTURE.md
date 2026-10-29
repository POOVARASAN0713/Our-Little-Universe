# Architecture

`src/app` owns the Next.js App Router shell and global style. `src/components/Universe.tsx` is the client experience. Google OAuth sessions come from Supabase Auth. `src/lib/local-backend.ts` adapts the app's existing data calls to Supabase Postgres, Realtime, and private Storage. `supabase-setup.sql` creates the table, bucket, and row-level security policies.

Only the two approved email addresses in the SQL policies can use the shared couple data. Text, metadata, and uploaded files live in the Supabase project and sync across both accounts. The site is hosted on Vercel; its public Supabase anon key is protected by the database and storage RLS policies. Never use the Supabase service-role key in browser code.
