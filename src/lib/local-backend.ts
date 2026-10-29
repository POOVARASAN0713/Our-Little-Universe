// Shared Supabase backend for the couple's app data and private media.
/* eslint-disable @typescript-eslint/no-explicit-any -- this adapter intentionally mirrors the small dynamic Firestore API used by existing UI components. */
import { supabase } from "@/lib/supabase/client";
export type LocalUser = { uid: string; email: string; displayName?: string };
type Ref = { path: string; id?: string; kind: "collection" | "document"; constraints?: Constraint[] };
type Constraint = { type: "where"; field: string; op: string; value: unknown } | { type: "orderBy"; field: string; direction: "asc" | "desc" } | { type: "limit"; count: number } | { type: "startAfter"; snapshot: Snapshot };
type StoredRecord = { id: string; [key: string]: any };

class LocalTimestamp {
  constructor(private readonly milliseconds: number) {}
  toDate() { return new Date(this.milliseconds); }
  toJSON() { return new Date(this.milliseconds).toISOString(); }
}
export function serverTimestamp() { return new LocalTimestamp(Date.now()); }
export function arrayUnion(...values: unknown[]) { return { __arrayUnion: values }; }
function hydrate(value: any, key = ""): any {
  if (value instanceof LocalTimestamp) return value;
  if (Array.isArray(value)) return value.map((item) => hydrate(item));
  if (value && typeof value === "object") {
    const next: Record<string, unknown> = {};
    for (const [childKey, childValue] of Object.entries(value)) next[childKey] = hydrate(childValue, childKey);
    return next;
  }
  if (["createdAt", "updatedAt", "deliveredAt", "viewedAt"].includes(key) && typeof value === "string") {
    const milliseconds = Date.parse(value);
    if (Number.isFinite(milliseconds)) return new LocalTimestamp(milliseconds);
  }
  return value;
}
export const localDb = supabase;
export const localStorageClient = supabase.storage;
export function collection(_db: unknown, ...parts: string[]): Ref { return { path: parts.join("/"), kind: "collection" }; }
export function doc(_db: unknown, ...parts: string[]): Ref { return { path: parts.slice(0, -1).join("/"), id: parts.at(-1) ?? "", kind: "document" }; }
export function where(field: string, op: string, value: unknown): Constraint { return { type: "where", field, op, value }; }
export function orderBy(field: string, direction: "asc" | "desc" = "asc"): Constraint { return { type: "orderBy", field, direction }; }
export function limit(count: number): Constraint { return { type: "limit", count }; }
export function startAfter(snapshot: Snapshot): Constraint { return { type: "startAfter", snapshot }; }
export function query(base: Ref, ...constraints: Constraint[]): Ref { return { ...base, constraints }; }

export class Snapshot {
  readonly docs: Snapshot[] = [];
  constructor(readonly id: string, private readonly row?: StoredRecord) {}
  exists() { return this.row !== undefined; }
  data() { if (!this.row) return undefined; const data = Object.fromEntries(Object.entries(this.row).filter(([key]) => key !== "id")); return hydrate(data); }
}
type QuerySnapshot = Snapshot & { docs: Snapshot[] };
async function records(path: string): Promise<StoredRecord[]> {
  const { data, error } = await supabase.from("app_documents").select("id,data").eq("path", path);
  if (error) throw error;
  return (data ?? []).map((row: { id: string; data: StoredRecord }) => ({ id: row.id, ...hydrate(row.data) }));
}
function runQuery(rows: StoredRecord[], ref: Ref) {
  for (const c of ref.constraints ?? []) {
    if (c.type === "where") rows = rows.filter(row => c.op === "==" ? row[c.field] === c.value : c.op === "array-contains" ? Array.isArray(row[c.field]) && row[c.field].includes(c.value) : false);
    if (c.type === "orderBy") rows.sort((a, b) => {
      const av = a[c.field]?.toDate?.()?.getTime?.() ?? a[c.field] ?? "";
      const bv = b[c.field]?.toDate?.()?.getTime?.() ?? b[c.field] ?? "";
      return (av < bv ? -1 : av > bv ? 1 : 0) * (c.direction === "desc" ? -1 : 1);
    });
    if (c.type === "startAfter") { const index = rows.findIndex(row => row.id === c.snapshot.id); if (index >= 0) rows = rows.slice(index + 1); }
    if (c.type === "limit") rows = rows.slice(0, c.count);
  }
  return rows;
}
export async function getDoc(ref: Ref) {
  const rows = await records(ref.path);
  const row = rows.find(entry => entry.id === ref.id);
  return new Snapshot(ref.id ?? "", row);
}
export async function getDocs(ref: Ref) {
  const rows = runQuery(await records(ref.path), ref);
  const result = new Snapshot("", undefined) as QuerySnapshot;
  Object.defineProperty(result, "docs", { value: rows.map(row => new Snapshot(row.id, row)) });
  return result;
}
export async function addDoc(ref: Ref, value: Record<string, unknown>) {
  const id = crypto.randomUUID();
  const { error } = await supabase.from("app_documents").insert({ path: ref.path, id, data: value });
  if (error) throw error;
  return { id };
}
export async function setDoc(ref: Ref, value: Record<string, any>, options?: { merge?: boolean }) {
  const id = ref.id ?? "";
  let data = value;
  if (options?.merge) { const old = await getDoc(ref); data = { ...(old.data() ?? {}), ...value }; }
  const { error } = await supabase.from("app_documents").upsert({ path: ref.path, id, data }, { onConflict: "path,id" });
  if (error) throw error;
}
export async function updateDoc(ref: Ref, value: Record<string, any>) {
  const old = await getDoc(ref);
  if (!old.exists()) throw new Error("This saved item no longer exists.");
  const patch = { ...value };
  for (const [key, item] of Object.entries(patch)) if (item?.__arrayUnion) patch[key] = [...new Set([...(old.data()?.[key] ?? []), ...item.__arrayUnion])];
  const { error } = await supabase.from("app_documents").update({ data: { ...old.data(), ...patch } }).eq("path", ref.path).eq("id", ref.id);
  if (error) throw error;
}
export async function deleteDoc(ref: Ref) {
  const { error } = await supabase.from("app_documents").delete().eq("path", ref.path).eq("id", ref.id);
  if (error) throw error;
}
export function onSnapshot(ref: Ref, next: (snapshot: QuerySnapshot) => void, error?: (error: Error) => void) {
  const publish = async () => {
    try {
      if (ref.kind === "document") { const snapshot = await getDoc(ref); next(snapshot as QuerySnapshot); }
      else next(await getDocs(ref) as QuerySnapshot);
    } catch (cause) { error?.(cause instanceof Error ? cause : new Error("Supabase could not read the saved data.")); }
  };
  void publish();
  const channel = supabase.channel(`app-documents-${crypto.randomUUID()}`).on("postgres_changes", { event: "*", schema: "public", table: "app_documents", filter: `path=eq.${ref.path}` }, () => void publish()).subscribe((status, cause) => { if (status === "CHANNEL_ERROR" && cause) error?.(new Error(String(cause))); });
  return () => { void supabase.removeChannel(channel); };
}
export function ref(_storage: unknown, path: string) { return { fullPath: path }; }
export async function getBlob(mediaRef: { fullPath: string }): Promise<Blob> {
  const { data, error } = await supabase.storage.from("couple-media").download(mediaRef.fullPath);
  if (error) throw error;
  return data;
}
export function uploadBytesResumable(mediaRef: { fullPath: string }, file: Blob, metadata?: { contentType?: string }) {
  return { on(_event: string, progress?: (state: { bytesTransferred: number; totalBytes: number }) => void, error?: (error: Error) => void, complete?: () => void) {
    void supabase.storage.from("couple-media").upload(mediaRef.fullPath, file, { upsert: true, contentType: metadata?.contentType ?? file.type }).then(({ error: uploadError }) => {
      if (uploadError) { error?.(uploadError); return; }
      progress?.({ bytesTransferred: file.size, totalBytes: file.size }); complete?.();
    });
    return () => undefined;
  } };
}

