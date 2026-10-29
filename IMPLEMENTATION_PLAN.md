# Implementation plan

## Existing prototype

The project contained one self-contained HTML prototype, `Our%20Little%20Universe%20%E2%80%94%20for%20thangooo.html`. It includes the personalized home page, anniversary date and time, interactive heart and surprise messages, sample letters, local-only gallery preview, demo chat, editable in-memory timeline, reasons cards, local voice recording preview, music and video previews, and responsive styling. It has no persistence, authentication, backend, tests, or deployment configuration. The original has been preserved unchanged.

## Phases

1. [x] Establish a Next.js, TypeScript, Tailwind application shell and premium responsive design, retaining the prototype's content.
2. [x] Add two-account sign-in boundary, existing Firebase membership lookup, and fail-closed private pages.
3. [x] Add documented Firestore/Storage schemas, restrictive rules, and persistent feature flows.
4. [x] Add chat, validation, and security rule test coverage.
5. [x] Run typecheck, targeted lint, and production build. Firebase emulator rule tests are still blocked because the emulator hub cannot bind local port 4400 in this environment; they need to be rerun on the user's machine.
6. [x] Prepare Firebase/Vercel deployment instructions. Actual deployment is contingent on user-owned accounts and project configuration.

## Upgrade from the October 2026 brief

The provided Firestore screenshots show approved member documents directly under the top-level collection `Our Little Universe`. The app's earlier code expected `couples/our-little-universe/members/{uid}`, which caused the membership rejection. Preserve the existing records and update the app and rules to use the existing collection as the trusted membership source. App feature data remains under `couples/our-little-universe`.

The newly supplied WhatsApp screenshot is available as the chat visual reference. Upgrade work is prioritized as: (1) use the existing account records and correct auth gate; (2) persistent, private chat/media, receipts and memories; (3) profile images and account-specific preferences; (4) fixed anniversary and removal/replacement of requested home actions; (5) persisted surprises/notifications; (6) security-rule and UI verification. Features requiring production credentials, live user sessions, or unavailable screenshot data will be clearly identified.

The existing Firebase app and Firestore documents are preserved. The HTML prototype remains as a standalone fallback; the Next.js application is the upgraded experience. Never delete the two existing member documents as part of this upgrade.
