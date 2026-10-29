# Database

Approved account records are the existing documents `Our Little Universe/{uid}` (top-level collection, exact Authentication UID as document ID). Couple feature data is under `couples/our-little-universe`. The fixed identifier in the client is only a namespace, never authorization; every rule additionally checks the authenticated UID against an approved member document. The app's live listeners order by the fields shown below; Firestore's single-field indexes suffice today.

| Collection | Fields | Access and deletion |
| --- | --- | --- |
| `Our Little Universe/{uid}` | `approved: boolean`, `email`, `role`, optional `profilePhotoPath` | Admin provisions approval and identity; member can read own document and approved roster records. Member may update only their own photo reference. |
| `messages/{id}` | `text`, `senderUid`, `receiverUid`, `type`, optional `mediaPath`, `contentType`, `fileName`, `replyTo`, `createdAt`, `readBy`, `reactions` | Both members read; sender identity must match auth UID; sender may delete own message; receiver updates read state. Chat loads 50 latest and paginates older messages. |
| `memories/{id}` | `caption`, `path`, `contentType`, `filename`, `sourceMessageId`, `createdBy`, `createdAt` | Members read; removing a gallery entry deletes only its reference. The original private Storage object remains. |
| `letters/{id}` | `title` (≤120), `body` (≤5,000), `createdBy`, `createdAt` | Both members read; author edits/deletes. |
| `timeline/{id}` | `title`, `description` (≤1,000), `date` (`YYYY-MM-DD`), `createdBy`, `createdAt` | Both members read; author edits/deletes. Only the supplied anniversary is seeded; no personal events are invented. |
| `futurePlans/{id}` | `text` (≤240), `done: boolean`, `createdBy`, `createdAt` | Both members read; author edits/deletes. |
| `reasons/{id}` | `text` (≤500), `createdBy`, `createdAt` | Both members read; author edits/deletes. The initial sample cards in the UI are not persisted. |
| `surprises/{id}` | `action`, `emoji`, `message`, `note`, `fromUid`, `toUid`, `createdBy`, `createdAt`, `viewed` | Approved sender creates for the other approved member; recipient alone reads and marks viewed. |
| `userSettings/{uid}` | `chatTheme`, `updatedAt` | Each user reads and writes only their own theme preference. |

Storage paths use `couples/{coupleId}/media/{uid}/{fileId}` and `couples/{coupleId}/profiles/{uid}/avatar`. A 50 MiB media and 5 MiB profile-photo ceiling and MIME allowlists are enforced in rules and client. Storage is private to approved couple members. Gallery removal leaves source objects intact. Establish a periodic encrypted export and retention policy before production; no automatic expiry is configured. Check Firebase console usage and the active plan for actual storage and database usage/costs; no collection size or billing data was available to measure here.

Anniversary: `2024-08-24T13:28:00+05:30`, equivalent to `2024-08-24T07:58:00Z`, timezone `Asia/Kolkata`.
