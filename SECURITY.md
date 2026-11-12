# Security

## Security Design

- **Authentication Boundary**: The app uses Firebase Authentication with Google OAuth. The client allowlist improves the sign-in experience; Firestore and Storage rules independently enforce the two approved email identities.
- **Firestore Rules**: `firestore.rules` restricts app data to the couple's collections. Member documents can only be written at the signed-in user's own UID/email document IDs, with the user's own identity fields. A document cannot grant a different account membership.
- **Private Storage**: New photos, videos, chat attachments, and profile photos are stored in Firebase Storage. `storage.rules` restrict reads to the couple, uploads/overwrites/deletes to the owner's path, and enforce MIME and size limits. Media is read through Firebase's authenticated SDK; the app does not mint public download-token URLs.
- **Browser Security Headers**: Set in `next.config.ts`, including `nosniff`, clickjacking protection (`X-Frame-Options: DENY`), strict referrer policy, and camera/geolocation restrictions.

## Firebase Setup Verification

1. Ensure `firestore.rules` and `storage.rules` are deployed to your Firebase project.
2. In Firebase Console → Authentication → Settings → Authorized domains, ensure your domain (localhost and/or Vercel URL) is listed.
3. Configure the Firebase Storage bucket's CORS for the exact app origins so authenticated blob reads work. Do not create public download URLs.
4. Sign in as each approved account and confirm that unauthenticated requests and unrelated accounts cannot read or write data.

## Existing Cloudinary media

Older Cloudinary URLs stored in Firestore are public delivery URLs. The Cloudinary unsigned upload preset used by an earlier version is not an access-control boundary. Before treating existing photos or attachments as private, migrate them into Firebase Storage, update their Firestore paths, and delete the old Cloudinary assets. New uploads use Firebase Storage.
