"use client";
import { useEffect, useState } from "react";
import {
  doc,
  onSnapshot,
  setDoc,
  getBlob,
  ref,
  localDb as db,
  localStorageClient as storage,
  type LocalUser,
} from "@/lib/local-backend";
import { uploadToPrivateStorage } from "@/lib/media-upload";

export default function ProfilePair({
  user,
  partnerUid,
  youPath,
  partnerPath,
  youName,
  partnerName,
}: {
  user: LocalUser;
  partnerUid: string;
  youPath: string;
  partnerPath: string;
  youName: string;
  partnerName: string;
}) {
  const [ownPath, setOwnPath] = useState(youPath);
  const [otherPath, setOtherPath] = useState(partnerPath);

  useEffect(() => {
    setOwnPath(youPath);
  }, [youPath]);

  useEffect(() => {
    setOtherPath(partnerPath);
  }, [partnerPath]);

  useEffect(() => {
    if (!db || !user?.uid) return;
    const own = onSnapshot(doc(db, "Our Little Universe", user.uid), (d) => {
      const p = (d.data()?.profilePhotoPath as string) ?? "";
      if (p) setOwnPath(p);
    });

    const other = partnerUid
      ? onSnapshot(doc(db, "Our Little Universe", partnerUid), (d) => {
          const p = (d.data()?.profilePhotoPath as string) ?? "";
          if (p) setOtherPath(p);
        })
      : () => undefined;

    return () => {
      own();
      other();
    };
  }, [user.uid, partnerUid]);

  return (
    <section className="profile-pair" aria-label="Our profile pictures">
      <ProfilePhoto user={user} path={ownPath} name={youName} editable />
      <ProfilePhoto user={user} path={otherPath} name={partnerName} editable={false} />
    </section>
  );
}

function ProfilePhoto({
  user,
  path,
  name,
  editable,
}: {
  user: LocalUser;
  path: string;
  name: string;
  editable: boolean;
}) {
  const [url, setUrl] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [preview, setPreview] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let local = "";
    if (path) {
      if (path.startsWith("http")) {
        setUrl(path);
      } else if (storage) {
        void getBlob(ref(storage, path))
          .then((blob) => {
            local = URL.createObjectURL(blob);
            setUrl(local);
          })
          .catch(() => setError("Profile picture could not load."));
      }
    }
    return () => {
      if (local) URL.revokeObjectURL(local);
    };
  }, [path]);

  useEffect(() => {
    if (!preview) {
      setPreviewUrl("");
      return;
    }
    const objectUrl = URL.createObjectURL(preview);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [preview]);

  function select(file?: File) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size >= 5 * 1024 * 1024) {
      setError("Choose a JPEG, PNG, or WebP image under 5 MB.");
      return;
    }
    setError("");
    setPreview(file);
    setConsent(false);
  }

  async function save() {
    if (!preview || !consent || !db) return;
    setBusy(true);
    setError("");
    try {
      const uploadResult = await uploadToPrivateStorage(preview, {
        folder: `couples/our-little-universe/profiles/${user.uid}`,
        fileName: "avatar",
      });
      await setDoc(doc(db, "Our Little Universe", user.uid), { profilePhotoPath: uploadResult.path }, { merge: true });
      if (user.email) {
        await setDoc(doc(db, "Our Little Universe", user.email.toLowerCase()), { profilePhotoPath: uploadResult.path }, { merge: true });
      }
      setPreview(null);
      setEditOpen(false);
    } catch (saveErr) {
      setError(saveErr instanceof Error ? saveErr.message : "Could not save the picture. Please check Firebase Storage setup.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="profile-person">
      <button
        className="profile-photo-button"
        onClick={() => editable && setEditOpen((v) => !v)}
        aria-label={editable ? `Open ${name} photo options` : name}
      >
        {previewUrl ? (
          <img src={previewUrl} alt="Selected profile preview" />
        ) : url ? (
          <img src={url} alt={`${name} profile`} />
        ) : (
          <span>{name}</span>
        )}
        <i>♥</i>
      </button>
      <strong>{name}</strong>
      {editable && (!url || editOpen) && (
        <>
          <input
            id="profile-photo-input"
            className="sr"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => select(e.target.files?.[0])}
          />
          {!preview && (
            <label className="btn-secondary" htmlFor="profile-photo-input">
              {url ? "Change Image" : "Add your profile picture"}
            </label>
          )}
        </>
      )}
      {preview && (
        <div className="profile-confirm">
          <p>Preview your new profile picture</p>
          <label>
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /> I agree to store this
            picture in our private shared space.
          </label>
          <div>
            <button className="btn-primary" disabled={!consent || busy} onClick={save}>
              {busy ? "Saving…" : "Save picture"}
            </button>
            <button className="btn-ghost" onClick={() => setPreview(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}
      {error && <small className="error">{error}</small>}
    </article>
  );
}
