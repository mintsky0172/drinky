import { db } from "@/src/lib/firebase";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";

export type UserGoals = {
  waterMl: number;
  sugarG: number;
  caffeineMg: number;
};

export const DEFAULT_GOALS: UserGoals = {
  waterMl: 2000,
  sugarG: 50,
  caffeineMg: 300,
};

export async function updateUserGoals(uid: string, goals: UserGoals) {
  const ref = doc(db, "users", uid);
  await setDoc(
    ref,
    {
      goals: {
        ...goals,
        updatedAt: serverTimestamp(),
      },
    },
    { merge: true },
  );
}

export async function ensureUserDoc(params: {
  uid: string;
  email: string;
  nickname?: string;
}) {
  const { uid, email, nickname } = params;
  const trimmedNickname = nickname?.trim();

  await setDoc(
    doc(db, "users", uid),
    {
      email,
      ...(trimmedNickname ? { nickname: trimmedNickname } : {}),
      goals: DEFAULT_GOALS,
      streak: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }, // 이미 있으면 유지 + 없는 필드만 채움
  );
}
