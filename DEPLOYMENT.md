# Deployment

The app is built for Firebase Authentication, Cloud Firestore, and Firebase Storage, with Vercel hosting.

## Firebase Setup

1. **Firebase Project**:
   - Create or select your Firebase project in the [Firebase Console](https://console.firebase.google.com/).
2. **Enable Google Authentication**:
   - Navigate to **Authentication** → **Sign-in method**.
   - Enable **Google** provider and enter your project support email.
3. **Authorized Domains**:
   - Navigate to **Authentication** → **Settings** → **Authorized domains**.
   - Ensure `localhost` and your production Vercel domain (e.g. `your-universe.vercel.app`) are added.
4. **Deploy Security Rules**:
   - Ensure Firestore and Storage rules are deployed:
     ```powershell
     firebase deploy --only firestore:rules,storage
     ```
5. **Environment Variables**:
   - Provide the Firebase configuration keys in `.env.local` for local development and in the Vercel dashboard for production.
6. **Private Media Reads**:
   - Configure the Firebase Storage bucket's CORS for `http://localhost:3000` during local work and the exact production HTTPS origin. The app reads with the authenticated Firebase SDK; do not use public download-token URLs.
   - Migrate any old Cloudinary media and delete its old public assets before uploading sensitive photos.

## Vercel Deployment

1. Import your Git repository into Vercel.
2. Add all `NEXT_PUBLIC_FIREBASE_*` environment variables matching `.env.local`.
3. Deploy the application.
