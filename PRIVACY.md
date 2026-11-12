# Privacy

The app uses Google sign-in through Firebase Authentication. New uploads store profile photos, shared memories, and chat attachments in Firebase Storage. Shared messages and app content are stored in Cloud Firestore.

- Only the two approved accounts (Poovu: `thisispoovu03@gmail.com` and Shiva: `shivadharshinid13@gmail.com`) can access the app's shared content.
- New photos and videos are shared privately between both accounts and read using authenticated Firebase requests.
- Removing a photo from the Memories page removes its database reference; the original stored object remains in Firebase Storage.

Some media saved by an earlier version may still use Cloudinary URLs. Those are public URLs and may be accessible to anyone who has the link. Migrate those objects to Firebase Storage and delete the Cloudinary originals before treating the older media as private.
