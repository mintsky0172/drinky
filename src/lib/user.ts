import { db } from "@/src/lib/firebase";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

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
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  const existing = snap.exists() ? snap.data() : {};

  const payload: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };

  if (!existing.createdAt) {
    payload.createdAt = serverTimestamp();
  }

  if (!existing.email && email.trim()) {
    payload.email = email.trim();
  }

  if (!existing.nickname && trimmedNickname) {
    payload.nickname = trimmedNickname;
  }

  if (!existing.goals) {
    payload.goals = DEFAULT_GOALS;
  }

  if (typeof existing.streak !== "number") {
    payload.streak = 0;
  }

  await setDoc(
    ref,
    payload,
    { merge: true }, // 이미 있으면 유지 + 없는 필드만 채움
  );
}
