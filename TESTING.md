# Testing

Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:rules`, and `npm run build`. The rules suite uses the Firebase Emulator rule testing SDK and seeds two approved members with rules disabled, then checks both accounts plus anonymous, unrelated, spoofed, and member-provisioning operations.

Not yet automated: Storage rule tests, end-to-end login/session expiry, media upload/deletion, pagination, mobile browser matrix, keyboard/accessibility scan, reduced-motion screenshot, and live production verification. Do not represent these as passed until executed against test accounts and emulators.
