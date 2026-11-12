"use client";
import { useEffect, useState, type FormEvent } from "react";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  addDoc,
  setDoc,
  deleteDoc,
  limit,
  updateDoc,
  localDb as db,
  type LocalUser,
} from "@/lib/local-backend";
import {
  auth,
  firebaseConfigured,
  loginWithGoogle,
  checkRedirectLogin,
  logout,
  getFriendlyAuthErrorMessage,
  AUTHORIZED_EMAILS,
} from "@/lib/firebase/client";
import { onAuthStateChanged } from "firebase/auth";
import PrivateChat from "@/components/PrivateChat";
import SendAnything from "@/components/SendAnything";
import ProfilePair from "@/components/ProfilePair";
import FolderGallery from "@/components/FolderGallery";
import { eventSchema, letterSchema, planSchema } from "@/lib/validation/schemas";

// Shared couple feature data stored in Firebase Firestore and Storage.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Item = { id: string; [key: string]: any };
const coupleId = "our-little-universe";
const launchAt = new Date("2026-11-13T00:00:00+05:30").getTime();
const letters = ["miss", "sad", "smile", "sleep", "angry", "always"] as const;
const letterMessages: Record<typeof letters[number], string> = {
  miss: "If you miss me, imagine me holding your hand and telling you about my day. Distance can make a moment feel long, but it cannot erase the memories we carry. I am sending you the softest hug. ♡",
  sad: "You do not have to be happy every second. Take your time, breathe, and be kind to yourself. You matter on your difficult days just as much as on your brightest days. I am cheering for you, always. 🌙",
  smile: "Somewhere in this world, there is a person who thinks your little habits are adorable and your happiness matters so much. That person is me. 🌷",
  sleep: "Let the day rest now. I hope your mind feels lighter and your dreams are gentle. ⭐",
  angry: "Even when we disagree, I want us to listen, understand, and be gentle with each other. We are on the same team. 🫶",
  always: "I love the person you are and the memories we are still going to make. You are special to me. ♾️",
};
const sections = ["home", "gallery", "letters", "chat", "story"] as const;
type Page = typeof sections[number];

export default function Universe() {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [launchReady, setLaunchReady] = useState(false);
  const [loginBusy, setLoginBusy] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState<Page>("home");
  const [modal, setModal] = useState<{ title: string; text: string } | null>(null);
  const [messageNoticeOpen, setMessageNoticeOpen] = useState(false);

  const [messages, setMessages] = useState<Item[]>([]);
  const [letterItems, setLetterItems] = useState<Item[]>([]);
  const [events, setEvents] = useState<Item[]>([]);
  const [plans, setPlans] = useState<Item[]>([]);
  const [reasons] = useState([
    "You care in ways that make the world softer.",
    "Your smile can make an ordinary day feel golden.",
    "I love the little things that make you, you.",
    "Even silly moments become favourite memories.",
    "Your voice brings me comfort.",
    "There are so many memories left to make.",
  ]);
  const [annivCount, setAnnivCount] = useState("");
  const [letterTitle, setLetterTitle] = useState("");
  const [letterBody, setLetterBody] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTitle, setEventTitle] = useState("");
  const [eventText, setEventText] = useState("");
  const [planText, setPlanText] = useState("");
  const [sendAnythingOpen, setSendAnythingOpen] = useState(false);
  const [pendingSurprise, setPendingSurprise] = useState<Item | null>(null);
  const [activeSurprise, setActiveSurprise] = useState<Item | null>(null);
  const [surpriseRevealed, setSurpriseRevealed] = useState(false);

  const [partnerUid, setPartnerUid] = useState("");
  const [profilePaths, setProfilePaths] = useState({ you: "", partner: "" });

  const uid = user?.uid ?? "";
  const ownEmail = (user?.email ?? "").toLowerCase();
  const ownName = ownEmail === "thisispoovu03@gmail.com" ? "Poovu" : "Shiva";
  const partnerName = ownName === "Poovu" ? "Shiva" : "Poovu";
  const partnerEmail = ownName === "Poovu" ? "shivadharshinid13@gmail.com" : "thisispoovu03@gmail.com";

  useEffect(() => {
    const updateLaunchState = () => setLaunchReady(Date.now() >= launchAt);
    updateLaunchState();
    const id = setInterval(updateLaunchState, 1000);
    return () => clearInterval(id);
  }, []);

  const unreadIncoming = messages.find((m) => m.senderUid !== uid && !(m.readBy ?? []).includes(uid));
  const unreadMessages = messages.filter((m) => m.senderUid !== uid && !(m.readBy ?? []).includes(uid)).length;

  useEffect(() => {
    if (!firebaseConfigured) {
      setAuthLoading(false);
      setError("Firebase credentials are not configured in .env.local.");
      return;
    }

    checkRedirectLogin().catch((err) => {
      setError(getFriendlyAuthErrorMessage(err));
    });

    const unsubscribe = onAuthStateChanged(auth, async (account) => {
      if (!account) {
        setUser(null);
        setAuthLoading(false);
        return;
      }

      const email = (account.email ?? "").toLowerCase();
      if (!AUTHORIZED_EMAILS.includes(email)) {
        setError(`Signed in as ${email}. Only Poovu and Shiva's approved Google accounts can open this space.`);
        void logout();
        setUser(null);
        setAuthLoading(false);
        return;
      }

      const name = email === "thisispoovu03@gmail.com" ? "Poovu" : "Shiva";
      setUser({
        uid: account.uid,
        email,
        displayName: name,
        photoURL: account.photoURL ?? undefined,
      });
      setError("");
      setAuthLoading(false);

      // Auto-provision membership document in Firestore
      if (db) {
        try {
          await setDoc(
            doc(db, "Our Little Universe", account.uid),
            {
              uid: account.uid,
              email,
              displayName: name,
              approved: true,
              lastLoginAt: serverTimestamp(),
            },
            { merge: true }
          );
          await setDoc(
            doc(db, "Our Little Universe", email),
            {
              uid: account.uid,
              email,
              displayName: name,
              approved: true,
              lastLoginAt: serverTimestamp(),
            },
            { merge: true }
          );
        } catch (syncErr) {
          console.warn("Could not sync member document:", syncErr);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  async function handleLogin() {
    setError("");
    if (!firebaseConfigured) {
      setError("Connect your Firebase project first using the settings in .env.local.");
      return;
    }
    setLoginBusy(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      setError(getFriendlyAuthErrorMessage(err));
    } finally {
      setLoginBusy(false);
    }
  }

  // Real-time synchronization of member profiles and partner UID
  useEffect(() => {
    if (!db || !uid) return;
    const unsub = onSnapshot(
      collection(db, "Our Little Universe"),
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Item));
        const partnerDoc = rows.find(
          (d) =>
            d.email?.toLowerCase() === partnerEmail ||
            d.id === partnerEmail ||
            (d.id !== uid && d.displayName === partnerName)
        );
        const ownDoc = rows.find((d) => d.id === uid || d.email?.toLowerCase() === ownEmail);

        if (partnerDoc) {
          setPartnerUid(partnerDoc.uid || partnerDoc.id || partnerEmail);
        } else {
          setPartnerUid(partnerEmail);
        }

        setProfilePaths({
          you: (ownDoc?.profilePhotoPath as string) ?? "",
          partner: (partnerDoc?.profilePhotoPath as string) ?? "",
        });
      },
      (err) => console.warn("Member profile listener notice:", err.message)
    );
    return () => unsub();
  }, [uid, ownEmail, partnerEmail, partnerName]);

  useEffect(() => {
    if (unreadMessages > 0) setMessageNoticeOpen(true);
    else setMessageNoticeOpen(false);
  }, [unreadMessages]);

  useEffect(() => {
    const start = Date.parse("2024-08-24T13:28:00+05:30");
    const update = () => {
      const days = Math.max(0, Math.floor((Date.now() - start) / 86400000));
      const startParts = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        hourCycle: "h23",
      }).formatToParts(new Date(start));
      const nowParts = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        hourCycle: "h23",
      }).formatToParts(new Date());
      const part = (a: Intl.DateTimeFormatPart[], type: string) => Number(a.find((x) => x.type === type)?.value);
      const years0 = part(nowParts, "year") - part(startParts, "year");
      const before = (["month", "day", "hour", "minute"] as const).some((key, i) => {
        const fields = ["month", "day", "hour", "minute"];
        for (let n = 0; n < i; n++) {
          const a = part(nowParts, fields[n]),
            b = part(startParts, fields[n]);
          if (a !== b) return false;
        }
        return part(nowParts, key) < part(startParts, key);
      });
      const years = Math.max(0, years0 - (before ? 1 : 0));
      setAnnivCount(`${years} year${years === 1 ? "" : "s"} · ${days.toLocaleString("en-IN")} days and counting 💚`);
    };
    update();
    const id = setInterval(update, 60000);
    return () => clearInterval(id);
  }, []);

  // Shared couple collections subscription
  useEffect(() => {
    const database = db;
    if (!database || !uid) return;
    const base = `couples/${coupleId}`;
    const subscribe = (path: string, field: string, setter: (x: Item[]) => void) =>
      onSnapshot(
        query(collection(database, base, path), orderBy(field, "desc"), limit(100)),
        (s) => setter(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
        () => setError("Could not load shared content from Firebase.")
      );

    const stops = [
      subscribe("messages", "createdAt", setMessages),
      subscribe("letters", "createdAt", setLetterItems),
      subscribe("timeline", "date", setEvents),
      subscribe("futurePlans", "createdAt", setPlans),
    ];
    return () => stops.forEach((fn) => fn());
  }, [uid]);

  // Real-time surprises listener
  useEffect(() => {
    const database = db;
    if (!database || !uid) return;
    return onSnapshot(
      collection(database, "couples", coupleId, "surprises"),
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Item));
        const next =
          rows
            .filter(
              (x) =>
                (x.toUid === uid || x.toUid === ownEmail) &&
                x.fromUid !== uid &&
                x.viewed !== true
            )
            .sort(
              (a, b) =>
                (b.createdAt?.toDate?.()?.getTime?.() ?? 0) -
                (a.createdAt?.toDate?.()?.getTime?.() ?? 0)
            )[0] ?? null;
        setPendingSurprise(next);
      },
      () => setError("Could not load pending surprises.")
    );
  }, [uid, ownEmail]);

  async function create(path: string, data: Record<string, unknown>) {
    if (!db) return;
    await addDoc(collection(db, "couples", coupleId, path), {
      ...data,
      createdAt: serverTimestamp(),
      createdBy: uid,
    });
  }

  async function saveLetter(e: FormEvent) {
    e.preventDefault();
    const parsed = letterSchema.safeParse({ title: letterTitle || "A letter from the heart ♡", body: letterBody });
    if (!parsed.success) {
      setError("Add a title and a letter of up to 5,000 characters.");
      return;
    }
    try {
      await create("letters", parsed.data);
      setLetterTitle("");
      setLetterBody("");
      setModal({ title: parsed.data.title, text: parsed.data.body });
    } catch {
      setError("Letter could not be saved.");
    }
  }

  async function saveEvent(e: FormEvent) {
    e.preventDefault();
    const p = eventSchema.safeParse({ title: eventTitle, description: eventText, date: eventDate });
    if (!p.success) {
      setError("Add a title and valid date.");
      return;
    }
    try {
      await create("timeline", p.data);
      setEventTitle("");
      setEventText("");
      setEventDate("");
    } catch {
      setError("Timeline item could not be saved.");
    }
  }

  async function addPlan(e: FormEvent) {
    e.preventDefault();
    const p = planSchema.safeParse({ text: planText });
    if (!p.success) return;
    try {
      await create("futurePlans", { text: p.data.text, done: false });
      setPlanText("");
    } catch {
      setError("Plan could not be saved.");
    }
  }

  async function openSurprise() {
    if (!pendingSurprise || !db) return;
    const item = pendingSurprise;
    setActiveSurprise(item);
    setPendingSurprise(null);
    setSurpriseRevealed(true);
    try {
      await updateDoc(doc(db, "couples", coupleId, "surprises", item.id), {
        viewed: true,
        viewedAt: serverTimestamp(),
      });
    } catch {
      setError("The surprise opened, but its viewed status could not be saved.");
    }
  }

  async function removeItem(path: string, item: Item) {
    const database = db;
    if (!database) return;
    try {
      await deleteDoc(doc(database, "couples", coupleId, path, item.id));
    } catch {
      setError("Could not remove this saved item.");
    }
  }

  function pageButton(p: Page, label: string) {
    return (
      <button
        className={page === p ? "active" : ""}
        key={p}
        onClick={() => {
          setPage(p);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      >
        {label}
        {p === "chat" && unreadMessages > 0 && <span className="unread-pill">{unreadMessages}</span>}
      </button>
    );
  }

  const navLabels: Record<Page, string> = {
    home: "Home",
    gallery: "Gallery",
    letters: "Love letters",
    chat: "Our chat",
    story: "Our story",
  };

  if (!launchReady) {
    return <LaunchCountdown />;
  }

  if (authLoading) {
    return (
      <div className="welcome">
        <div className="welcome-card">
          <div className="eyebrow">Poovu + Shiva</div>
          <h1>Opening our little universe ♡</h1>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="welcome">
        <div className="welcome-card">
          <div className="eyebrow">A tiny universe, just for us</div>
          <h1>
            Welcome <em>home</em> ♡
          </h1>
          <p>Sign in with Poovu’s or Shiva’s approved Google account.</p>
          <button
            className="btn-primary"
            disabled={loginBusy}
            onClick={() => void handleLogin()}
            style={{ width: "min(360px,100%)", marginTop: 24 }}
          >
            {loginBusy ? "Opening Google…" : "Continue with Google ♡"}
          </button>
          {error && (
            <p className="error" role="alert" style={{ marginTop: 16 }}>
              {error}
            </p>
          )}
          <p className="muted" style={{ fontSize: 12, marginTop: 16 }}>
            Only Poovu and Shiva’s approved accounts can open this space.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="universe">
      <div className="wrap">
        <header className="topbar">
          <div className="brand">
            <span className="brand-icon">♡</span>
            <span>Our Little Universe</span>
          </div>
          <nav className="nav" aria-label="Main navigation">
            {sections.map((p) => pageButton(p, navLabels[p]))}
            <button onClick={() => void logout()}>Sign out {ownName}</button>
          </nav>
        </header>

        <main>
          {page === "home" && (
            <>
              <section className="hero">
                <div>
                  <div className="eyebrow">A tiny universe, just for us</div>
                  <h1>
                    Our little <em>universe</em> ♡
                  </h1>
                  <p className="lead">
                    In a world full of stars, somehow my favourite place is still wherever you are. This little corner
                    of the universe is made for our memories, our silly moments, and all the love I never want you to
                    forget.
                  </p>
                  <div className="actions">
                    <button className="btn-primary" onClick={() => setPage("gallery")}>
                      Enter our world ✦
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() =>
                        setModal({
                          title: "A little truth for you ♡",
                          text: "Out of all the things this world could give me, I am grateful for the moments that brought me closer to you. You deserve to feel loved on ordinary days too. 🌙",
                        })
                      }
                    >
                      A little surprise 🎁
                    </button>
                  </div>
                </div>
                <div className="orbit-wrap">
                  <div className="orbit">
                    <span className="orbit-name">POOVU + SHIVA</span>
                    <svg className="constellation" viewBox="0 0 240 240" aria-hidden="true">
                      <path d="M120 184 48 112 59 76 91 54 120 82 149 54 181 76 192 112Z M48 112 91 54M91 54h58M149 54l43 58M59 76l61 108 61-108M91 54l29 28 29-28" />
                      <circle cx="120" cy="184" r="3" />
                      <circle cx="48" cy="112" r="3" />
                      <circle cx="91" cy="54" r="3" />
                      <circle cx="149" cy="54" r="3" />
                      <circle cx="192" cy="112" r="3" />
                    </svg>
                    <button
                      className="heart"
                      aria-label="Open a love message"
                      onClick={() =>
                        setModal({
                          title: "A little love note 💚",
                          text: "If I could choose one place to stay, I would choose the moment I get to see you smile. Thank you for being you. I want to keep choosing kindness, laughter, and us. ♡",
                        })
                      }
                    >
                      ♥
                    </button>
                    <span className="orbit-label">you + me · always</span>
                  </div>
                </div>
              </section>

              <section className="panel anniv">
                <div>
                  <div className="eyebrow">Our special day ♡</div>
                  <h3 style={{ margin: "8px 0 4px" }}>The date our story became ours</h3>
                  <p className="muted" style={{ margin: 0, fontSize: 13 }}>
                    24 August 2024 · 1:28 PM IST — the beginning of us ♡
                  </p>
                  <p className="count">{annivCount}</p>
                </div>
              </section>

              <ProfilePair
                user={user}
                partnerUid={partnerUid || partnerEmail}
                youPath={profilePaths.you}
                partnerPath={profilePaths.partner}
                youName={ownName}
                partnerName={partnerName}
              />

              <div className="section-head">
                <div>
                  <h2>Our little universe</h2>
                  <p>Every corner holds a piece of us.</p>
                </div>
                <span className="eyebrow">Made with love ♡</span>
              </div>

              <div className="grid">
                {[
                  ["🖼️", "Our gallery", "The images we choose to keep in our universe.", "gallery"],
                  ["💌", "Words from my heart", "For the days when you need a little extra love.", "letters"],
                  ["🌙", "Our story & dreams", "Where we started and all the places we'll go.", "story"],
                ].map(([icon, title, desc, target]) => (
                  <article className="card" key={title}>
                    <div className="card-art">{icon}</div>
                    <div className="card-body">
                      <h3>{title}</h3>
                      <p>{desc}</p>
                      <button className="btn-secondary" onClick={() => setPage(target as Page)}>
                        Open ↗
                      </button>
                    </div>
                  </article>
                ))}
              </div>

              <div
                className="panel"
                style={{
                  marginTop: 16,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 16,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div className="eyebrow">A tiny reminder</div>
                  <h3 style={{ margin: "8px 0 4px" }}>You make ordinary days feel special.</h3>
                  <p className="muted" style={{ margin: 0, fontSize: 13 }}>
                    Tap the heart for a little love note.
                  </p>
                </div>
                <button className="btn-primary" onClick={() => setSendAnythingOpen(true)}>
                  Send Anything 💌
                </button>
              </div>
            </>
          )}

          {page === "gallery" && (
            <section className="page">
              <Section title="Gallery of little wonders" sub="The images you choose to keep in our universe." />
              <FolderGallery />
            </section>
          )}

          {page === "letters" && (
            <>
              <Section title="Letters from the heart" sub="Open whenever you need me." />
              <div className="letters">
                {letters.map((k, i) => (
                  <button
                    className="letter"
                    key={k}
                    onClick={() =>
                      setModal({
                        title: [
                          "Open when you miss me",
                          "Open when you're sad",
                          "Open when you need a smile",
                          "Open before you sleep",
                          "Open when we're upset",
                          "Open anytime",
                        ][i],
                        text: letterMessages[k],
                      })
                    }
                  >
                    <span>{["💌", "🌙", "🌷", "⭐", "🫶", "♾️"][i]}</span>
                    <strong>
                      {[
                        "Open when you miss me",
                        "Open when you're sad",
                        "Open when you need a smile",
                        "Open before you sleep",
                        "Open when we're upset",
                        "Open anytime",
                      ][i]}
                    </strong>
                    <p>A little message from my heart.</p>
                  </button>
                ))}
              </div>

              <div className="section-head">
                <h2>Our saved letters</h2>
              </div>
              <div className="letters">
                {letterItems.map((x) => (
                  <button
                    key={x.id}
                    className="letter"
                    onClick={() => setModal({ title: x.title, text: x.body })}
                  >
                    <span>💌</span>
                    <strong>{x.title}</strong>
                    <p>{x.body?.slice(0, 100)}</p>
                  </button>
                ))}
              </div>

              <form className="panel" style={{ marginTop: 16 }} onSubmit={saveLetter}>
                <h3>Write your own letter</h3>
                <input
                  className="field"
                  placeholder="Letter title"
                  value={letterTitle}
                  onChange={(e) => setLetterTitle(e.target.value)}
                />
                <textarea
                  className="textarea"
                  placeholder="Write from your heart…"
                  value={letterBody}
                  onChange={(e) => setLetterBody(e.target.value)}
                  style={{ marginTop: 10 }}
                />
                <button className="btn-primary" style={{ marginTop: 10 }}>
                  Save letter ♡
                </button>
              </form>
            </>
          )}

          {page === "chat" && (
            <>
              <Section title="Our little chat" sub="A private conversation for the two of you." />
              {partnerUid && user ? (
                <PrivateChat
                  user={user}
                  partnerUid={partnerUid}
                  partnerName={partnerName}
                  partnerPhotoPath={profilePaths.partner}
                />
              ) : (
                <p className="muted">Connecting to your chat space…</p>
              )}
            </>
          )}

          {page === "story" && (
            <>
              <Section
                title="Our story so far"
                sub="Past, present & all our tomorrows. Add your real dates and make this timeline yours."
              />
              <form className="panel" onSubmit={saveEvent}>
                <div className="form">
                  <input
                    className="field"
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    required
                  />
                  <input
                    className="field"
                    placeholder="Memory title"
                    value={eventTitle}
                    onChange={(e) => setEventTitle(e.target.value)}
                    required
                  />
                  <input
                    className="field"
                    placeholder="Why it matters…"
                    value={eventText}
                    onChange={(e) => setEventText(e.target.value)}
                  />
                  <button className="btn-primary">Add moment +</button>
                </div>
                <div className="timeline">
                  {events.map((x) => (
                    <article className="event" key={x.id}>
                      <time>{x.date}</time>
                      <h3>{x.title}</h3>
                      <p className="muted">{x.description}</p>
                      <button className="btn-ghost" onClick={() => removeItem("timeline", x)}>
                        Delete
                      </button>
                    </article>
                  ))}
                </div>
              </form>

              <div className="section-head">
                <div>
                  <h2>Reasons I love you</h2>
                  <p>Little truths I want you to remember.</p>
                </div>
              </div>

              <div className="reasons">
                {reasons.map((r, i) => (
                  <article className="reason" key={i}>
                    <strong className="eyebrow">{String(i + 1).padStart(2, "0")} · A LITTLE TRUTH</strong>
                    <p>{r}</p>
                  </article>
                ))}
              </div>

              <div className="grid" style={{ marginTop: 18 }}>
                <article className="card">
                  <div className="card-body">
                    <h3>🌠 Our future plans</h3>
                    <form className="form" onSubmit={addPlan}>
                      <input
                        className="field"
                        placeholder="One thing we'll do together…"
                        value={planText}
                        onChange={(e) => setPlanText(e.target.value)}
                      />
                      <button className="btn-secondary">Add</button>
                    </form>
                    <ul>
                      {plans.map((x) => (
                        <li key={x.id}>
                          {x.text}{" "}
                          <button className="btn-ghost" onClick={() => removeItem("futurePlans", x)}>
                            Delete
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </article>

                <article className="card">
                  <div className="card-body">
                    <h3>🎙️ Voice messages</h3>
                    <Recorder />
                  </div>
                </article>

                <article className="card">
                  <div className="card-body">
                    <h3>🎵 & 🎬 Private playback</h3>
                    <p className="muted">
                      Audio, photos, videos, chat, and surprises sync through Firebase. Playback requires an explicit tap.
                    </p>
                  </div>
                </article>
              </div>
            </>
          )}

          {error && (
            <p className="error" role="status" style={{ marginTop: 15 }}>
              {error}
            </p>
          )}
        </main>

        <footer className="footer">
          <span>Made with a whole lot of love ♡</span>
          <span>Our Little Universe</span>
        </footer>
      </div>

      {messageNoticeOpen && unreadMessages > 0 && (
        <div className="surprise-backdrop" role="dialog" aria-modal="true" aria-labelledby="message-notice-title">
          <div className="surprise-reveal">
            <span className="eyebrow">A note arrived while you were away</span>
            <h2 id="message-notice-title">
              {unreadIncoming
                ? `${unreadIncoming.senderUid === uid ? ownName : partnerName} sent you a message 💌`
                : "You have a message 💌"}
            </h2>
            <p>
              {unreadMessages === 1
                ? "There is one new message waiting for you."
                : `There are ${unreadMessages} new messages waiting for you.`}
            </p>
            <button
              className="btn-primary"
              onClick={() => {
                setMessageNoticeOpen(false);
                setPage("chat");
              }}
            >
              Open chat
            </button>
          </div>
        </div>
      )}

      {sendAnythingOpen && user && partnerUid && (
        <SendAnything
          user={user}
          partnerUid={partnerUid}
          onClose={() => setSendAnythingOpen(false)}
        />
      )}

      {pendingSurprise && !activeSurprise && (
        <div className="surprise-backdrop">
          <div className="surprise-reveal">
            <span className="eyebrow">A little something arrived</span>
            <h2>You have a surprise 💌</h2>
            <p>
              {pendingSurprise.fromUid === uid ? ownName : partnerName} sent you something just for you.
            </p>
            <button className="btn-primary" onClick={openSurprise}>
              Open Surprise
            </button>
          </div>
        </div>
      )}

      {activeSurprise && (
        <div className="surprise-backdrop">
          <div className="surprise-reveal">
            <button
              className="surprise-close"
              onClick={() => {
                setActiveSurprise(null);
                setSurpriseRevealed(false);
              }}
              aria-label="Close"
            >
              ×
            </button>
            <span className="eyebrow">A message from your person</span>
            <div className={`surprise-emoji ${surpriseRevealed ? "revealed" : ""}`}>
              {activeSurprise.emoji}
            </div>
            <h2>
              {activeSurprise.action === "custom"
                ? `${activeSurprise.fromUid === uid ? ownName : partnerName} sent you a little note`
                : String(activeSurprise.message ?? "A little surprise arrived").replace(
                    /^Someone/,
                    activeSurprise.fromUid === uid ? ownName : partnerName
                  )}
            </h2>
            {activeSurprise.note && <p>{activeSurprise.note}</p>}
            <button
              className="btn-secondary"
              onClick={() => {
                setActiveSurprise(null);
                setSurpriseRevealed(false);
                setSendAnythingOpen(true);
              }}
            >
              Send something back 💌
            </button>
            <button
              className="btn-primary"
              onClick={() => {
                setActiveSurprise(null);
                setSurpriseRevealed(false);
              }}
            >
              Keep this close
            </button>
          </div>
        </div>
      )}

      {modal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          onClick={() => setModal(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10,
            background: "#020b06e8",
            display: "grid",
            placeItems: "center",
            padding: 20,
          }}
        >
          <div
            className="panel"
            onClick={(e) => e.stopPropagation()}
            style={{ width: "min(520px,100%)", padding: 28, boxShadow: "0 25px 100px #0008" }}
          >
            <div className="eyebrow">A message from my heart</div>
            <h2 id="modal-title" style={{ font: "500 30px Georgia,serif" }}>
              {modal.title}
            </h2>
            <p style={{ lineHeight: 1.9, color: "#e9f8ed" }}>{modal.text}</p>
            <button className="btn-primary" onClick={() => setModal(null)}>
              Keep this close ♡
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="section-head">
      <div>
        <div className="eyebrow">For us, always ♡</div>
        <h2>{title}</h2>
        <p>{sub}</p>
      </div>
    </div>
  );
}

function Recorder() {
  const [status, setStatus] = useState("");
  const [url, setUrl] = useState("");
  const [rec, setRec] = useState<MediaRecorder | null>(null);

  async function toggle() {
    if (rec?.state === "recording") {
      rec.stop();
      setRec(null);
      setStatus("Finishing recording…");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setStatus("Voice recording is unavailable on this device.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks: BlobPart[] = [];
      const r = new MediaRecorder(stream);
      r.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      r.onstop = () => {
        setUrl(URL.createObjectURL(new Blob(chunks, { type: r.mimeType || "audio/webm" })));
        stream.getTracks().forEach((t) => t.stop());
        setStatus("Preview ready.");
      };
      r.start();
      setRec(r);
      setStatus("Recording… speak from your heart ♡");
    } catch {
      setStatus("Allow microphone access to record a voice note.");
    }
  }

  return (
    <>
      <button className="btn-secondary" onClick={toggle}>
        {rec?.state === "recording" ? "Stop recording" : "Start recording"}
      </button>
      {url && <audio controls src={url} style={{ display: "block", width: "100%", marginTop: 12 }} />}
      <p className="muted">{status}</p>
    </>
  );
}

function LaunchCountdown() {
    const [remaining, setRemaining] = useState(() => Math.max(0, launchAt - Date.now()));

    useEffect(() => {
      const update = () => setRemaining(Math.max(0, launchAt - Date.now()));
      const id = setInterval(update, 1000);
      update();
      return () => clearInterval(id);
    }, []);

    const totalSeconds = Math.floor(remaining / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return (
      <main className="launch-countdown" aria-label="Website launch countdown">
        <div className="launch-countdown-card">
          <div className="eyebrow">Our little universe</div>
          <h1>Opening soon</h1>
          <div className="countdown-values">
            {[
              ["Days", days],
              ["Hours", hours],
              ["Minutes", minutes],
              ["Seconds", seconds],
            ].map(([label, value]) => (
              <div className="countdown-value" key={label}>
                <strong>{String(value).padStart(2, "0")}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    );
}
