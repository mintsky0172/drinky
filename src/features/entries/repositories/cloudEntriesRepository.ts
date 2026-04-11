import { auth, db } from "@/src/lib/firebase";
import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { EntryDoc } from "@/src/types/drinky";

type EntryWritePayload = Omit<EntryDoc, "createdAt" | "updatedAt"> & {
  createdAt: EntryDoc["createdAt"];
  updatedAt: EntryDoc["updatedAt"];
};

function requireUid() {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Not authenticated");
  return uid;
}

export async function saveEntry(payload: EntryWritePayload) {
  const uid = requireUid();
  const ref = collection(db, "users", uid, "entries");
  return await addDoc(ref, payload);
}

export async function getCloudEntryById(entryId: string) {
  const uid = requireUid();
  const ref = doc(db, "users", uid, "entries", entryId);
  const snap = await getDoc(ref);

  return snap.exists() ? { id: snap.id, ...(snap.data() as EntryDoc) } : null;
}

export async function listCloudEntries() {
  const uid = requireUid();
  const ref = collection(db, "users", uid, "entries");
  const q = query(ref, orderBy("consumedAt", "desc"));
  const snap = await getDocs(q);

  return snap.docs.map((docSnap) => ({
    id: docSnap.id,
    ...(docSnap.data() as EntryDoc),
  }));
}

export async function listCloudEntriesByDateKey(dateKey: string) {
  const uid = requireUid();
  const ref = collection(db, "users", uid, "entries");
  const q = query(
    ref,
    where("dateKey", "==", dateKey),
    orderBy("consumedAt", "desc"),
  );
  const snap = await getDocs(q);

  return snap.docs.map((docSnap) => ({
    id: docSnap.id,
    ...(docSnap.data() as EntryDoc),
  }));
}

export async function updateCloudEntry(entryId: string, patch: Partial<EntryDoc>) {
  const uid = requireUid();
  const ref = doc(db, "users", uid, "entries", entryId);
  await updateDoc(ref, {
    ...patch,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteCloudEntry(entryId: string) {
  const uid = requireUid();
  const ref = doc(db, "users", uid, "entries", entryId);
  await deleteDoc(ref);
}
