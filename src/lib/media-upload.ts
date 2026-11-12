import { ref, uploadBytesResumable } from "firebase/storage";
import { storage } from "@/lib/firebase/client";

export const MAX_MEDIA_FILE_BYTES = 2 * 1024 * 1024 * 1024;
export const MAX_MEDIA_LIBRARY_BYTES = 10 * 1024 * 1024 * 1024;

const mediaTypes = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif", "image/avif", "image/heic", "image/heif",
  "video/mp4", "video/webm", "video/quicktime", "audio/webm", "audio/mpeg", "audio/mp4", "audio/ogg", "audio/wav",
]);

export function uploadToPrivateStorage(
  file: File | Blob,
  options: {
    folder: string;
    fileName?: string;
    onProgress?: (percent: number) => void;
  },
): Promise<{ path: string; bytes: number }> {
  if (!storage) return Promise.reject(new Error("Firebase Storage is not configured."));
  if (!options.folder.startsWith("couples/our-little-universe/")) {
    return Promise.reject(new Error("Invalid private media folder."));
  }
  if (!mediaTypes.has(file.type)) return Promise.reject(new Error("This file type is not allowed."));

  const isProfile = options.folder.includes("/profiles/");
  const maxBytes = isProfile ? 5 * 1024 * 1024 : MAX_MEDIA_FILE_BYTES;
  if (file.size === 0 || file.size > maxBytes) {
    return Promise.reject(new Error(`File must be ${isProfile ? "smaller than 5 MiB" : "2 GiB or smaller"}.`));
  }
  if (isProfile && !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return Promise.reject(new Error("Profile pictures must be JPEG, PNG, or WebP."));
  }

  const path = `${options.folder}/${options.fileName ?? crypto.randomUUID()}`;
  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(ref(storage, path), file, { contentType: file.type });
    let lastTransferred = 0;
    let stalledTimer: ReturnType<typeof setTimeout> | undefined;
    const resetStalledTimer = () => {
      if (stalledTimer) clearTimeout(stalledTimer);
      stalledTimer = setTimeout(() => {
        task.cancel();
        reject(
          new Error(
            "Upload made no progress for 60 seconds. Check Firebase Storage rules, billing, and your network connection.",
          ),
        );
      }, 60_000);
    };
    resetStalledTimer();
    task.on(
      "state_changed",
      (snapshot) => {
        if (snapshot.bytesTransferred > lastTransferred) {
          lastTransferred = snapshot.bytesTransferred;
          resetStalledTimer();
        }
        options.onProgress?.(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100));
      },
      (error) => {
        if (stalledTimer) clearTimeout(stalledTimer);
        reject(error);
      },
      () => {
        if (stalledTimer) clearTimeout(stalledTimer);
        resolve({ path, bytes: file.size });
      },
    );
  });
}
