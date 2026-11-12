# Our Little Universe

A private romantic website for Poovu and Shiva. It uses Google sign-in through Firebase Authentication, with couple-only data access in Cloud Firestore, real-time shared chat and surprises, and private media in Firebase Storage.

## Firebase Setup

1. **Create or Open Firebase Project**:
   - Project: `our-little-universe-f4972` (or your preferred Firebase project).
2. **Enable Google Authentication**:
   - In Firebase Console → **Build** → **Authentication** → **Sign-in method**, enable **Google**.
   - Set support email and save.
3. **Authorized Domains**:
   - In Firebase Console → **Authentication** → **Settings** → **Authorized domains**, ensure `localhost` and your deployed domain (e.g., `your-app.vercel.app`) are listed.
4. **Deploy Firestore and Storage Rules**:
   - Deploy `firestore.rules` and `storage.rules` via the Firebase CLI:
     ```powershell
     firebase deploy --only firestore:rules,storage
     ```
   - Access is restricted exclusively to Poovu (`thisispoovu03@gmail.com`) and Shiva (`shivadharshinid13@gmail.com`).
5. **Environment Configuration**:
   - Copy your Firebase web app config values into `.env.local` using `.env.example` as the guide.
6. Configure Firebase Storage CORS for your exact local and production origins so authenticated private media reads work. Never create public download-token URLs for personal photos.

New media uploads go to private Firebase Storage using resumable uploads. Photos and videos can be up to 2 GiB each,
and a selected batch can be up to 10 GiB. Firebase Storage is not a free 10 GiB storage service: storage,
download bandwidth, and any required billing plan are controlled by Firebase/Google Cloud. Do not upload until the
project's Storage usage and billing limits are understood. Any older Cloudinary URLs remain public until those files
are migrated and deleted from Cloudinary; see [SECURITY.md](SECURITY.md) before uploading sensitive photos.

## Local Gallery Images

For selected images that should ship with the website without Firebase Storage, put the files in
`public/gallery`. Add each selected file to `public/gallery/gallery.json`, for example:

```json
[
  { "src": "/gallery/leaf.jpg", "title": "A little wonder", "alt": "A glowing leaf" }
]
```

Open the **Gallery** tab to browse them. These files are part of the deployment, so keep them optimized and
avoid adding private images to a public repository.

## Run Locally

Requirements: Node.js 20+ and npm.

```powershell
npm install
npm run dev
```

Open `http://localhost:3000`.

## Deploy to Vercel

1. Import the project repository into Vercel.
2. In Project Settings → Environment Variables, add the Firebase variables from `.env.local`:
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`
   - `NEXT_PUBLIC_AUTHORIZED_EMAILS`
   - `NEXT_PUBLIC_ANNIVERSARY_ISO`
3. Add the deployed Vercel domain to Firebase Console → Authentication → Settings → Authorized domains.

## Checks

```powershell
npm run typecheck
npm run build
```
