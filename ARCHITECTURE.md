# Architecture

`src/app` provides the Next.js App Router layout and global CSS styling. `src/components/Universe.tsx` is the primary client interface.

- **Authentication**: Managed via Firebase Authentication with Google OAuth (`src/lib/firebase/client.ts`).
- **Database**: Cloud Firestore holds collections for messages, memories, love letters, timeline events, bucket list plans, user settings, and surprises.
- **Storage**: Firebase Storage manages couple media and profile pictures with 50 MB limits for media and 5 MB limits for profile avatars.
- **Security**: Defined in `firestore.rules` and `storage.rules`. Only Poovu (`thisispoovu03@gmail.com`) and Shiva (`shivadharshinid13@gmail.com`) can read or write shared couple data and files.
