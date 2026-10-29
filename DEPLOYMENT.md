# Deployment

Production deployment is not performed yet. It requires user-owned Firebase, GitHub, and Vercel projects and two account identities. Do not call the site deployed until a real URL has been tested.

## Firebase

1. Create a dedicated Firebase project and choose Firestore/Storage regions carefully.
2. Enable Email/Password authentication. Disable public sign-up at the app level; create exactly two accounts in the Firebase Console. Use strong, unique passwords and configure recovery email/verification.
3. Create Firestore and Storage. Deploy `firestore.rules`, indexes, and `storage.rules` from the repository.
4. Keep the two existing approved member documents in top-level collection `Our Little Universe`, with each document ID exactly equal to that Firebase Authentication user's UID. Each must contain Boolean `approved: true` plus its correct `email` and `role`. The app reads this existing collection; do not create a second members collection or expose client write access to approval fields.
5. Create a Firebase web app and copy its public config into local `.env.local` and Vercel project environment settings. Add exactly both account emails to `NEXT_PUBLIC_AUTHORIZED_EMAILS` in the hosting environment. This UI allowlist is not trusted by rules. Do not expose Admin SDK credentials.
6. Add local/Vercel hostnames to Firebase Auth authorized domains; configure Firebase Storage bucket CORS for the deployed app origin (the app reads private media through authorized SDK requests); enforce App Check before production after integrating its client token provider.

## Vercel and GitHub

1. Create a private GitHub repository, commit the source, and connect it to Vercel.
2. Add the `.env.example` variables in Vercel for Preview/Production as appropriate. Use a separate Firebase development project for Preview.
3. Deploy a preview, verify both approved accounts and an unrelated account, then promote to production.
4. Confirm HTTPS, headers, security rules, upload restrictions, logout, expired sessions, and mobile layout. Keep deployment URL private if desired.

## Local commands (PowerShell)

```powershell
npm install
npm run lint
npm run typecheck
npm test
npm run test:rules
npm run build
firebase deploy --only firestore:rules,firestore:indexes,storage
```

Never deploy rules without verifying the active Firebase project with `firebase projects:list` and `firebase use`.
