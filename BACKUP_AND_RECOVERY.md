# Backup and recovery

No automated backup is configured. Before production, enable scheduled Firestore exports to a restricted, encrypted Cloud Storage bucket in an appropriate region; document retention and test restoration quarterly in a separate staging project. Keep media object backups or documented copies alongside Firestore metadata exports. Protect exports with least-privilege IAM and lifecycle expiry.

For account recovery, use Firebase Auth's verified email reset flow, revoke sessions on suspected compromise, rotate the password, then confirm membership remains approved. Recovery is not a passkey fallback because passkeys are not implemented. For deletion, export only with consent, remove Firestore documents and Storage objects, then verify through a second member account. Record and test a recovery contact route outside this site.
