"use client";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  updateDoc,
  getBlob,
  ref,
  localDb as db,
  localStorageClient as storage,
  type LocalUser,
  type Snapshot,
} from "@/lib/local-backend";
import { uploadToPrivateStorage } from "@/lib/media-upload";

const couplePath = ["couples", "our-little-universe"] as const;
const themeNames = [
  "Dark WhatsApp",
  "Emerald Green Romance",
  "Midnight Black",
  "Soft Romantic",
  "Forest Green",
  "Minimal Light",
  "Rose Glow",
] as const;
type ChatTheme = (typeof themeNames)[number];
type ChatMessage = {
  id: string;
  senderUid: string;
  receiverUid: string;
  type: "text" | "image" | "video" | "audio";
  text?: string;
  mediaPath?: string;
  contentType?: string;
  fileName?: string;
  createdAt?: { toDate?: () => Date };
  readBy?: string[];
  deliveredAt?: unknown;
  replyTo?: { id: string; text: string };
  reactions?: Record<string, string>;
  localUrl?: string;
};
type PendingFile = { file: File; url: string; type: "image" | "video" | "audio"; durationMs?: number };

export default function PrivateChat({
  user,
  partnerUid,
  partnerName = "Your person",
  partnerPhotoPath = "",
}: {
  user: LocalUser;
  partnerUid: string;
  partnerName?: string;
  partnerPhotoPath?: string;
}) {
  const [live, setLive] = useState<ChatMessage[]>([]);
  const [older, setOlder] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [text, setText] = useState("");
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [reply, setReply] = useState<ChatMessage | null>(null);
  const [theme, setTheme] = useState<ChatTheme>(themeNames[0]);
  const [viewer, setViewer] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [error, setError] = useState("");
  const [partnerAvatar, setPartnerAvatar] = useState("");

  const scroller = useRef<HTMLDivElement>(null);
  const cursor = useRef<Snapshot | null>(null);
  const mediaUrls = useRef(new Map<string, string>());
  const pendingUrls = useRef(new Set<string>());
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<BlobPart[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordStartedAt = useRef(0);
  const wasAtBottom = useRef(true);

  const myUid = user.uid;

  const messages = useMemo(
    () =>
      [...older, ...live]
        .filter((m, i, a) => a.findIndex((x) => x.id === m.id) === i)
        .sort((a, b) => (a.createdAt?.toDate?.()?.getTime() ?? 0) - (b.createdAt?.toDate?.()?.getTime() ?? 0)),
    [older, live]
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? messages.filter((m) => (m.text ?? "").toLowerCase().includes(q)) : messages;
  }, [messages, search]);

  useEffect(() => {
    const database = db,
      mediaStorage = storage,
      urls = mediaUrls.current;
    if (!database || !mediaStorage) return;
    setLoading(true);

    const messagesRef = collection(database, ...couplePath, "messages");
    const liveQuery = query(messagesRef, orderBy("createdAt", "desc"), limit(50));

    const hydrate = async (m: ChatMessage) => {
      if (!m.mediaPath) return m;
      if (m.mediaPath.startsWith("http")) {
        return { ...m, localUrl: m.mediaPath };
      }
      try {
        let url = urls.get(m.mediaPath);
        if (!url) {
          url = URL.createObjectURL(await getBlob(ref(mediaStorage, m.mediaPath)));
          urls.set(m.mediaPath, url);
        }
        return { ...m, localUrl: url };
      } catch {
        return m;
      }
    };

    const stop = onSnapshot(
      liveQuery,
      async (snap) => {
        if (!cursor.current) cursor.current = snap.docs.at(-1) ?? null;
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ChatMessage));
        for (const m of rows) {
          if (m.senderUid !== myUid && (!m.readBy?.includes(myUid) || !m.deliveredAt)) {
            void updateDoc(doc(database, ...couplePath, "messages", m.id), {
              readBy: arrayUnion(myUid),
              deliveredAt: serverTimestamp(),
            }).catch(() => undefined);
          }
        }
        setLive((await Promise.all(rows.map(hydrate))).reverse());
        setLoading(false);
      },
      (e) => {
        setError(`Chat could not load: ${e.message}`);
        setLoading(false);
      }
    );

    return () => {
      stop();
      for (const url of urls.values()) URL.revokeObjectURL(url);
      urls.clear();
    };
  }, [myUid]);

  useEffect(() => {
    if (!db) return;
    return onSnapshot(doc(db, ...couplePath, "userSettings", myUid), (snap) => {
      const value = snap.data()?.chatTheme as ChatTheme | undefined;
      if (value && themeNames.includes(value)) setTheme(value);
    });
  }, [myUid]);

  useEffect(() => {
    let url = "";
    if (partnerPhotoPath) {
      if (partnerPhotoPath.startsWith("http")) {
        setPartnerAvatar(partnerPhotoPath);
      } else if (storage) {
        void getBlob(ref(storage, partnerPhotoPath))
          .then((blob) => {
            url = URL.createObjectURL(blob);
            setPartnerAvatar(url);
          })
          .catch(() => setPartnerAvatar(""));
      }
    }
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [partnerPhotoPath]);

  useEffect(() => {
    const el = scroller.current;
    if (el && wasAtBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
      stream.current?.getTracks().forEach((t) => t.stop());
      for (const url of pendingUrls.current) URL.revokeObjectURL(url);
      pendingUrls.current.clear();
    },
    []
  );

  function pickFiles(list: FileList | null) {
    if (!list) return;
    const next: PendingFile[] = [];
    for (const file of Array.from(list)) {
      if (file.size >= 50 * 1024 * 1024) {
        setError(`${file.name} exceeds the 50 MB limit.`);
        continue;
      }
      const type = file.type.startsWith("image/")
        ? "image"
        : file.type.startsWith("video/")
        ? "video"
        : file.type.startsWith("audio/")
        ? "audio"
        : null;
      if (
        !type ||
        !/^(image\/(jpeg|png|webp|gif)|video\/(mp4|webm|quicktime)|audio\/(webm|mpeg|mp4|ogg|wav))$/i.test(file.type)
      ) {
        setError(`${file.name} has an unsupported media type.`);
        continue;
      }
      const url = URL.createObjectURL(file);
      pendingUrls.current.add(url);
      next.push({ file, url, type });
    }
    setFiles((old) => [...old, ...next]);
    setError("");
  }

  async function send(e?: FormEvent) {
    e?.preventDefault();
    if (uploading || (!text.trim() && !files.length)) return;
    if (!db || !partnerUid) {
      setError("Partner is not connected yet. Please wait a moment.");
      return;
    }

    const database = db;
    setError("");

    const body = text.trim();
    const currentFiles = [...files];

    // 1. Send text immediately so messages are never delayed
    if (body) {
      try {
        setText("");
        const replyItem = reply;
        setReply(null);
        await addDoc(collection(database, ...couplePath, "messages"), {
          text: body,
          type: "text",
          senderUid: myUid,
          receiverUid: partnerUid,
          createdBy: myUid,
          createdAt: serverTimestamp(),
          readBy: [myUid],
          ...(replyItem ? { replyTo: { id: replyItem.id, text: (replyItem.text ?? "").slice(0, 160) } } : {}),
        });
      } catch (textErr) {
        setError(textErr instanceof Error ? textErr.message : "Message could not be sent. Please try again.");
        return;
      }
    }

    // 2. Upload media attachments if any
    if (currentFiles.length > 0) {
      setUploading(true);
      setUploadProgress(0);

      try {
        for (let i = 0; i < currentFiles.length; i++) {
          const pending = currentFiles[i];
          const uploadResult = await uploadToPrivateStorage(pending.file, {
            folder: `couples/our-little-universe/media/${myUid}`,
            onProgress: (p) => {
              setUploadProgress(Math.round(((i + p / 100) / currentFiles.length) * 100));
            },
          });

          await addDoc(collection(database, ...couplePath, "messages"), {
            type: pending.type,
            text: "",
            mediaPath: uploadResult.path,
            contentType: pending.file.type,
            fileName: pending.file.name,
            ...(pending.durationMs ? { durationMs: pending.durationMs } : {}),
            senderUid: myUid,
            receiverUid: partnerUid,
            createdBy: myUid,
            createdAt: serverTimestamp(),
            readBy: [myUid],
          });
        }

        currentFiles.forEach((f) => {
          URL.revokeObjectURL(f.url);
          pendingUrls.current.delete(f.url);
        });
        setFiles([]);
      } catch (uploadErr) {
        setError(
          uploadErr instanceof Error
            ? `Media error: ${uploadErr.message}`
            : "Media upload failed. Please check your Firebase Storage setup."
        );
      } finally {
        setUploading(false);
        setUploadProgress(0);
      }
    }
  }

  async function loadOlder() {
    if (!db || !cursor.current || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const snap = await getDocs(
        query(collection(db, ...couplePath, "messages"), orderBy("createdAt", "desc"), startAfter(cursor.current), limit(50))
      );
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ChatMessage));
      cursor.current = snap.docs.at(-1) ?? cursor.current;
      const hydrated = await Promise.all(
        rows.map(async (m) => {
          if (!m.mediaPath || !storage) return m;
          try {
            let url = mediaUrls.current.get(m.mediaPath);
            if (!url) {
              url = URL.createObjectURL(await getBlob(ref(storage, m.mediaPath)));
              mediaUrls.current.set(m.mediaPath, url);
            }
            return { ...m, localUrl: url };
          } catch {
            return m;
          }
        })
      );
      setOlder((old) => [...hydrated.reverse(), ...old]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Older messages could not load.");
    } finally {
      setLoadingOlder(false);
    }
  }

  async function markMemory(message: ChatMessage) {
    if (!db || !message.mediaPath) return;
    const memoryId = `chat_${message.id}`,
      memoryRef = doc(db, ...couplePath, "memories", memoryId);
    try {
      if ((await getDoc(memoryRef)).exists()) {
        setError("This item is already in Memories.");
        return;
      }
      await setDoc(memoryRef, {
        caption: message.text || message.fileName || "A moment from our chat",
        path: message.mediaPath,
        contentType: message.contentType ?? "application/octet-stream",
        filename: message.fileName ?? "chat-media",
        sourceMessageId: message.id,
        createdAt: serverTimestamp(),
        createdBy: myUid,
      });
      setError("Added to Memories 💚");
    } catch {
      setError("Could not add this item to Memories.");
    }
  }

  async function react(message: ChatMessage, emoji: string) {
    if (!db) return;
    try {
      await updateDoc(doc(db, ...couplePath, "messages", message.id), {
        reactions: { ...(message.reactions ?? {}), [myUid]: emoji },
      });
    } catch {
      setError("Reaction could not be saved.");
    }
  }

  async function remove(message: ChatMessage) {
    if (!db || message.senderUid !== myUid) return;
    try {
      await deleteDoc(doc(db, ...couplePath, "messages", message.id));
    } catch {
      setError("Only the sender can remove this message.");
    }
  }

  async function chooseTheme(value: ChatTheme) {
    setTheme(value);
    setMenuOpen(false);
    if (!db) return;
    try {
      await setDoc(
        doc(db, ...couplePath, "userSettings", myUid),
        { chatTheme: value, updatedAt: serverTimestamp() },
        { merge: true }
      );
    } catch {
      setError("Theme preference could not be saved.");
    }
  }

  async function startVoice() {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setError("Voice recording is not supported in this browser.");
      return;
    }
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.current = audioStream;
      chunks.current = [];
      recordStartedAt.current = Date.now();
      const rec = new MediaRecorder(audioStream);
      rec.ondataavailable = (e) => {
        if (e.data.size) chunks.current.push(e.data);
      };
      rec.onstop = () => {
        const blob = new Blob(chunks.current, { type: rec.mimeType || "audio/webm" });
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: blob.type });
        const url = URL.createObjectURL(blob);
        pendingUrls.current.add(url);
        setFiles((old) => [...old, { file, url, type: "audio", durationMs: Date.now() - recordStartedAt.current }]);
        audioStream.getTracks().forEach((t) => t.stop());
        stream.current = null;
      };
      rec.start();
      recorder.current = rec;
      setRecording(true);
      setRecordSeconds(0);
      timer.current = setInterval(() => setRecordSeconds((s) => s + 1), 1000);
      setError("");
    } catch {
      setError("Microphone permission was denied or is unavailable.");
    }
  }

  function stopVoice(cancel = false) {
    if (timer.current) clearInterval(timer.current);
    if (cancel) {
      if (recorder.current) recorder.current.onstop = null;
      recorder.current?.stop();
      stream.current?.getTracks().forEach((t) => t.stop());
      stream.current = null;
    } else recorder.current?.stop();
    recorder.current = null;
    setRecording(false);
  }

  function bubbleTime(m: ChatMessage) {
    const date = m.createdAt?.toDate?.();
    return date ? date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "Just now";
  }

  return (
    <section className={`chat-shell theme-${themeNames.indexOf(theme)}`} aria-label="Private chat">
      <header className="chat-header">
        <div className="chat-person">
          <div className="chat-avatar">{partnerAvatar ? <img src={partnerAvatar} alt="" /> : partnerName.slice(0, 1)}</div>
          <div>
            <strong>{partnerName}</strong>
            <small>Private conversation</small>
          </div>
        </div>
        <div className="chat-tools">
          {searchOpen && (
            <input
              className="chat-search"
              autoFocus
              placeholder="Search loaded messages"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          )}
          <button title="Video calls are not configured" aria-label="Video call unavailable" disabled>
            ▣
          </button>
          <button title="Voice calls are not configured" aria-label="Voice call unavailable" disabled>
            ☎
          </button>
          <button onClick={() => setSearchOpen((v) => !v)} aria-label="Search messages">
            ⌕
          </button>
          <button onClick={() => setMenuOpen((v) => !v)} aria-label="Chat settings">
            ⋮
          </button>
        </div>
      </header>

      {menuOpen && (
        <div className="chat-menu">
          <strong>Chat theme</strong>
          {themeNames.map((t) => (
            <button key={t} className={theme === t ? "selected" : ""} onClick={() => chooseTheme(t)}>
              {t}
            </button>
          ))}
          <button onClick={() => setSearchOpen(true)}>Search messages</button>
        </div>
      )}

      <div
        className="chat-history"
        ref={scroller}
        onScroll={(e) => {
          const el = e.currentTarget;
          wasAtBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 90;
        }}
      >
        {loading ? (
          <p className="chat-empty">Loading your conversation…</p>
        ) : (
          <>
            {cursor.current && (
              <button className="load-older" onClick={loadOlder} disabled={loadingOlder}>
                {loadingOlder ? "Loading…" : "Load earlier messages"}
              </button>
            )}
            {!visible.length && (
              <p className="chat-empty">
                {search ? "No matching messages in the loaded conversation." : "Your little conversation starts here. Send a hello 💚"}
              </p>
            )}
            {visible.map((m) => (
              <article key={m.id} className={`chat-row ${m.senderUid === myUid ? "outgoing" : "incoming"}`}>
                <div className="chat-bubble">
                  <small className="bubble-sender">{m.senderUid === myUid ? user.displayName ?? "You" : partnerName}</small>
                  {m.replyTo && (
                    <button className="reply-preview" onClick={() => setSearch(m.replyTo?.text ?? "")}>
                      {m.replyTo.text}
                    </button>
                  )}
                  {m.type === "text" ? (
                    <p>{m.text}</p>
                  ) : m.type === "image" && m.localUrl ? (
                    <button className="media-thumb" onClick={() => setViewer(m.localUrl!)}>
                      <img src={m.localUrl} alt={m.fileName ?? "Shared image"} />
                    </button>
                  ) : m.type === "video" && m.localUrl ? (
                    <video src={m.localUrl} controls preload="metadata" />
                  ) : m.type === "audio" && m.localUrl ? (
                    <audio src={m.localUrl} controls />
                  ) : (
                    <p className="media-pending">Private media unavailable</p>
                  )}
                  <div className="bubble-meta">
                    <time>{bubbleTime(m)}</time>
                    {m.senderUid === myUid && (
                      <span
                        className={m.readBy?.includes(partnerUid) ? "read-tick" : "sent-tick"}
                        title={m.readBy?.includes(partnerUid) ? "Read" : "Sent"}
                      >
                        {m.readBy?.includes(partnerUid) ? "✓✓" : m.deliveredAt ? "✓✓" : "✓"}
                      </span>
                    )}
                  </div>
                  {m.reactions && Object.values(m.reactions).length > 0 && (
                    <div className="reaction-chip">{Object.values(m.reactions).join(" ")}</div>
                  )}
                  <div className="bubble-actions">
                    <button title="Reply" onClick={() => setReply(m)}>
                      ↩
                    </button>
                    <button title="React with heart" onClick={() => react(m, "💚")}>
                      ♡
                    </button>
                    <button title="Copy text" onClick={() => m.text && navigator.clipboard?.writeText(m.text)}>
                      ⧉
                    </button>
                    {m.mediaPath && (
                      <button title="Add to Memories" onClick={() => markMemory(m)}>
                        Add to Memories 💚
                      </button>
                    )}
                    {m.senderUid === myUid && (
                      <button title="Delete message" onClick={() => remove(m)}>
                        ⌫
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </>
        )}
      </div>

      {files.length > 0 && (
        <div className="chat-previews" aria-label="Attachments ready to send">
          {files.map((f, i) => (
            <div key={`${f.file.name}-${i}`} className="pending-preview">
              {f.type === "image" ? (
                <img src={f.url} alt={f.file.name} />
              ) : f.type === "video" ? (
                <video src={f.url} />
              ) : (
                <span>🎙️ {f.file.name}</span>
              )}
              <button
                onClick={() => {
                  URL.revokeObjectURL(f.url);
                  pendingUrls.current.delete(f.url);
                  setFiles((old) => old.filter((_, n) => n !== i));
                }}
                aria-label={`Remove ${f.file.name}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {reply && (
        <div className="reply-composer">
          <span>Replying to: {(reply.text || reply.fileName || "media").slice(0, 100)}</span>
          <button onClick={() => setReply(null)} aria-label="Cancel reply">
            ×
          </button>
        </div>
      )}

      {recording && (
        <div className="recording-bar">
          <span className="record-dot" /> Recording {Math.floor(recordSeconds/60)}:
          {String(recordSeconds % 60).padStart(2, "0")}
          <button onClick={() => stopVoice(true)}>Cancel</button>
          <button onClick={() => stopVoice(false)}>Stop</button>
        </div>
      )}

      {uploading && (
        <div className="upload-progress">
          <span style={{ width: `${uploadProgress}%` }} />
        </div>
      )}

      {error && (
        <div
          role="alert"
          style={{
            margin: "8px 12px",
            padding: "8px 12px",
            background: "#450a0acc",
            color: "#fecaca",
            borderRadius: 8,
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>⚠️ {error}</span>
          <button
            onClick={() => setError("")}
            style={{ background: "transparent", border: "none", color: "#fecaca", cursor: "pointer", fontSize: 16 }}
          >
            ×
          </button>
        </div>
      )}

      {emojiOpen && (
        <div className="emoji-picker">
          {["💚", "❤️", "😘", "🥺", "😂", "🥰", "🌹", "✨", "🫂", "😊", "🥹", "💌"].map((e) => (
            <button
              key={e}
              onClick={() => {
                setText((v) => v + e);
                setEmojiOpen(false);
              }}
            >
              {e}
            </button>
          ))}
        </div>
      )}

      <form className="chat-composer" onSubmit={send}>
        <label className="chat-icon" title="Attach photos or videos">
          📎
          <input
            type="file"
            accept="image/*,video/mp4,video/webm,audio/*"
            multiple
            onChange={(e) => pickFiles(e.target.files)}
          />
        </label>
        <button type="button" className="chat-icon" onClick={() => setEmojiOpen((v) => !v)} aria-label="Open emoji picker">
          ☻
        </button>
        <input
          className="chat-text"
          placeholder="Type a message"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={4000}
        />
        {uploading ? (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 12, color: "#a7f3d0" }}>{uploadProgress}%</span>
            <button
              type="button"
              onClick={() => {
                setUploading(false);
                setUploadProgress(0);
                setError("Upload cancelled. You can type and send text messages.");
              }}
              style={{
                background: "#ffffff22",
                border: "none",
                borderRadius: 4,
                color: "#e2e8f0",
                fontSize: 11,
                padding: "2px 6px",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        ) : text.trim() || files.length ? (
          <button className="chat-send">➤</button>
        ) : (
          <button
            type="button"
            className="chat-icon"
            onClick={recording ? () => stopVoice(false) : startVoice}
            aria-label={recording ? "Stop recording" : "Record voice message"}
          >
            {recording ? "■" : "🎙"}
          </button>
        )}
      </form>

      {viewer && (
        <div className="media-viewer" role="dialog" aria-modal="true" onClick={() => setViewer(null)}>
          <button aria-label="Close media viewer">×</button>
          <img src={viewer} alt="Shared image full screen" />
        </div>
      )}
    </section>
  );
}
