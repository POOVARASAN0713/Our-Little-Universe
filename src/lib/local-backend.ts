// Shared Firebase backend for couple app data and private media storage.
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  addDoc,
  setDoc,
  deleteDoc,
  limit,
  where,
  updateDoc,
  startAfter,
  arrayUnion,
  type DocumentSnapshot,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import {
  ref,
  uploadBytesResumable,
  getBlob as firebaseGetBlob,
  deleteObject,
  type StorageReference,
} from "firebase/storage";
import { db, storage } from "@/lib/firebase/client";

export type LocalUser = {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
};

export type Snapshot = DocumentSnapshot | QueryDocumentSnapshot;

export const localDb = db;
export const localStorageClient = storage;

// Read media through the authenticated Storage SDK; never mint public bearer URLs.
export async function getBlob(mediaRef: StorageReference): Promise<Blob> {
  return firebaseGetBlob(mediaRef);
}

export {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  addDoc,
  setDoc,
  deleteDoc,
  limit,
  where,
  updateDoc,
  startAfter,
  arrayUnion,
  ref,
  uploadBytesResumable,
  deleteObject,
};
