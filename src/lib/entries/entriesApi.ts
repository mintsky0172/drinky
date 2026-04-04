import { auth, db} from '@/src/lib/firebase';
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDoc,
    serverTimestamp,
    updateDoc,
} from 'firebase/firestore';
import type { EntryDoc } from '@/src/types/drinky';

type EntryWritePayload = Omit<EntryDoc, "createdAt" | "updatedAt"> & {
    createdAt: EntryDoc["createdAt"];
    updatedAt: EntryDoc["updatedAt"];
};

function requireUid() {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("Not authenticated");
    return uid;
}

export async function addEntry(payload: EntryWritePayload) {
    const uid = requireUid();
    const ref = collection(db, 'users', uid, 'entries');
    return await addDoc(ref, payload);
}

export async function getEntryById(entryId: string) {
    const uid = requireUid();
    const ref = doc(db, 'users', uid, 'entries', entryId);
    const snap = await getDoc(ref);

    return snap.exists()
        ? ({ id: snap.id, ...(snap.data() as EntryDoc) })
        : null;
}

export async function updateEntry(entryId: string, patch: Partial<EntryDoc>) {
    const uid = requireUid();
    const ref = doc(db, 'users', uid, 'entries', entryId);
    await updateDoc(ref, {
        ...patch,
        updatedAt: serverTimestamp(),
    });
}

export async function deleteEntry(entryId: string) {
    const uid = requireUid();
    const ref = doc(db, "users", uid, 'entries', entryId);
    await deleteDoc(ref);
}
