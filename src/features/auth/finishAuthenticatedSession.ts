import {
  doc,
  getDoc,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";

import { db } from "@/src/lib/firebase";
import { DEFAULT_GOALS, ensureUserDoc, type UserGoals } from "@/src/lib/user";
import { getSessionMode, setAuthenticatedMode } from "@/src/features/auth/session";
import {
  clearGuestDailySummaries,
  listGuestDailySummariesByDateRange,
} from "@/src/features/entries/repositories/guestDailySummariesRepository";
import {
  clearGuestEntries,
  listGuestEntries,
} from "@/src/features/entries/repositories/guestEntriesRepository";
import {
  clearGuestGoals,
  getGuestGoals,
} from "@/src/features/entries/repositories/guestGoalsRepository";

function parseStoredDate(value?: string) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isDefaultGoals(goals: Partial<UserGoals> | undefined) {
  if (!goals) return true;
  return (
    Number(goals.waterMl ?? DEFAULT_GOALS.waterMl) === DEFAULT_GOALS.waterMl &&
    Number(goals.caffeineMg ?? DEFAULT_GOALS.caffeineMg) ===
      DEFAULT_GOALS.caffeineMg &&
    Number(goals.sugarG ?? DEFAULT_GOALS.sugarG) === DEFAULT_GOALS.sugarG
  );
}

async function migrateGuestDataToUser(uid: string) {
  const mode = await getSessionMode();
  if (mode !== "guest") return false;

  const [entries, guestGoals] = await Promise.all([
    listGuestEntries(),
    getGuestGoals(),
  ]);

  const monthStart = "0000-01-01";
  const monthEnd = "9999-12-31";
  const summaries = await listGuestDailySummariesByDateRange(monthStart, monthEnd);
  const hasMeaningfulSummary = summaries.some(
    (summary) =>
      Boolean(summary.oneLine?.trim()) ||
      summary.overrideIconKey != null ||
      Boolean(summary.goalsAchieved) ||
      Boolean(summary.confettiShown),
  );
  const hasCustomGuestGoals = !isDefaultGoals(guestGoals);
  const hasGuestData =
    entries.length > 0 || hasMeaningfulSummary || hasCustomGuestGoals;

  if (!hasGuestData) {
    await Promise.all([
      clearGuestEntries(),
      clearGuestDailySummaries(),
      clearGuestGoals(),
    ]);
    return false;
  }

  const batch = writeBatch(db);

  entries.forEach((entry) => {
    const ref = doc(db, "users", uid, "entries", entry.id);
    batch.set(ref, {
      dateKey: entry.dateKey,
      consumedAt: parseStoredDate(entry.consumedAt) ?? new Date(),
      createdAt: parseStoredDate(entry.createdAt) ?? serverTimestamp(),
      updatedAt: parseStoredDate(entry.updatedAt) ?? serverTimestamp(),
      drinkId: entry.drinkId ?? null,
      drinkName: entry.drinkName,
      brandLabel: entry.brandLabel ?? null,
      brandNormalized: entry.brandNormalized ?? null,
      iconKey: entry.iconKey,
      isWaterOnly: entry.isWaterOnly,
      sizeLabel: entry.sizeLabel ?? null,
      servings: entry.servings,
      unit: entry.unit,
      mlPerUnit: entry.mlPerUnit,
      totalMl: entry.totalMl,
      totalCaffeineMg: entry.totalCaffeineMg,
      totalSugarG: entry.totalSugarG,
      waterMl: entry.waterMl,
      memo: entry.memo ?? null,
    });
  });

  summaries.forEach((summary) => {
    const ref = doc(db, "users", uid, "dailySummaries", summary.dateKey);
    batch.set(
      ref,
      {
        dateKey: summary.dateKey,
        oneLine: summary.oneLine ?? "",
        overrideIconKey: summary.overrideIconKey ?? null,
        goalsAchieved: Boolean(summary.goalsAchieved),
        confettiShown: Boolean(summary.confettiShown),
        updatedAt: parseStoredDate(summary.updatedAt) ?? serverTimestamp(),
      },
      { merge: true },
    );
  });

  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);
  const existingGoals = userSnap.data()?.goals as Partial<UserGoals> | undefined;

  if (isDefaultGoals(existingGoals) && !isDefaultGoals(guestGoals)) {
    batch.set(
      userRef,
      {
        goals: {
          ...guestGoals,
          updatedAt: serverTimestamp(),
        },
      },
      { merge: true },
    );
  }

  await batch.commit();
  await Promise.all([
    clearGuestEntries(),
    clearGuestDailySummaries(),
    clearGuestGoals(),
  ]);
  return hasGuestData;
}

export async function finishAuthenticatedSession(params: {
  uid: string;
  email: string;
  nickname?: string;
}) {
  await ensureUserDoc(params);
  const migratedGuestData = await migrateGuestDataToUser(params.uid);
  await setAuthenticatedMode();
  return { migratedGuestData };
}
