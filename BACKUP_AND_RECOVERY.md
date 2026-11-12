# Backup and Recovery

No automated export is configured by default. Before storing irreplaceable memories, keep original copies somewhere safe.

- **Firestore Backups**: Use the Google Cloud / Firebase Console or `gcloud firestore export` to periodically export database collections to Google Cloud Storage.
- **Firebase Storage**: Original photos, videos, and voice recordings remain in Firebase Storage. Deleting an entry in the Memories gallery removes its database entry; the original Storage object is preserved.
- **Account Recovery**: If a Google account is compromised, revoke active sessions in the Firebase Console and update the authorized emails list.
