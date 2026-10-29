# Privacy

The app processes Firebase account email/UID, messages, letters, timeline/plans, and user-uploaded media. Firebase processes this data under the selected project and region. Choose a region appropriate to both people before creating Firestore/Storage; region migration may require export/import.

Welcome photos are local previews only and are not uploaded. The checkbox confirms the current user has permission to choose a photo; each person must separately consent before any future photo storage or biometric enrollment. No face matching or raw biometric data is collected. Passkeys are not implemented.

Both approved members can read shared couple content. Item creators may delete their own records; Firebase project administrators can access data. There is no automatic retention or deletion schedule. To delete, remove content through the app, verify the paired media object is removed, disable/delete accounts, and delete/export the Firebase project data as requested. Back up only with both members' agreement and protect exports as sensitive data.
