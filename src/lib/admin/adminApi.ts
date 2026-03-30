import { doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

export async function getUerRole(uid: string) {
    const ref = doc(db, 'users', uid);
    const snap = await getDoc(ref);

    if(!snap.exists()) return 'user';

    const data = snap.data();

    return data.role ?? 'user';
}

export async function hideRecipe(recipeId: string, adminUid: string) {
    const ref = doc(db, 'recipes', recipeId);

    await updateDoc(ref, {
        isPublic: false,
        updatedAt: serverTimestamp(),
        updatedBy: adminUid,
        source: 'admin',
    });
}

export async function unhideRecipe(recipeId: string, adminUid: string) {
    const ref = doc(db, 'recipes', recipeId);

    await updateDoc(ref, {
        isPublic: true,
        updatedAt: serverTimestamp(),
        updatedBy: adminUid,
        source: 'admin',
    })
}