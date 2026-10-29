# Security

## Controls present

- Firestore and Storage default deny; all app data requires an authenticated UID and admin-provisioned `approved: true` member document.
- Member document creation and role changes are prohibited to clients.
- Message sender UID must equal auth UID; subsequent message updates are limited by rule fields, and only the sender can delete a message.
- Content has field and length checks. Media uploads require an approved MIME class and size below 50 MiB; profile photos are limited to 5 MiB.
- HTTPS is required for production, and the app sets basic content, framing, referrer, and permissions headers.
- The email allowlist only prevents accidental sign-in UI use; it is not a security boundary.

## Gaps before production

No server session cookies, passkeys, backend rate limiter, Firebase App Check enforcement, full CSP, robust recovery workflow, automated abuse monitoring, byte-level media inspection, or authenticated production audit is implemented. Storage rules enforce declared MIME metadata and size, but cannot prove that uploaded bytes match the declared type. The app uses authenticated Storage SDK reads (`getBlob`) rather than persisting public download URLs. Rules tests cover approved membership, unrelated and anonymous users, sender spoofing, and private media, but must run against the Firebase emulators to produce a meaningful pass/fail result.

## Threat model and response

Protect against unauthenticated visitors, unrelated authenticated users, client-supplied couple IDs, sender spoofing, oversized uploads, and unauthorized member changes. If a credential, download URL, or account is compromised: disable the account in Firebase Auth, revoke sessions, remove its membership approval, rotate passwords and affected media objects, inspect Firebase logs, restore from a known backup if needed, and notify both members. Never store service account keys in Git, Vercel browser variables, or this repository.
