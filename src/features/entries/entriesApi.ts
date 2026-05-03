import type { EntryDoc } from "@/src/types/drinky";

import type { EntryWritePayload } from "@/src/features/entries/buildEntryPayload";
import {
  deleteCloudEntry,
  getCloudEntryById,
  listCloudEntries,
  listCloudEntriesByDateKey,
  saveEntry as saveCloudEntry,
  updateCloudEntry,
} from "@/src/features/entries/repositories/cloudEntriesRepository";
import { auth } from "@/src/lib/firebase";
import { getSessionMode } from "../auth/session";
import {
  deleteGuestEntry,
  type GuestEntry,
  listGuestEntries,
  listGuestEntriesByDateKey,
  saveGuestEntry,
  updateGuestEntry,
} from "./repositories/guestEntriesRepository";

function isAuthed() {
  return !!auth.currentUser;
}

function randomGuestEntryId() {
  return `guest_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function serializeDateLike(value: unknown) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof (value as { toDate?: () => Date })?.toDate === "function") {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }

  return new Date().toISOString();
}

function toGuestEntry(entry: EntryWritePayload): GuestEntry {
  return {
    id: randomGuestEntryId(),
    drinkId: entry.drinkId ?? null,
    drinkName: entry.drinkName,
    brandLabel: entry.brandLabel ?? null,
    brandNormalized: entry.brandNormalized ?? null,
    iconKey: entry.iconKey,
    calendarIconUrl: entry.calendarIconUrl ?? null,
    isWaterOnly: entry.isWaterOnly,
    sizeLabel: entry.sizeLabel ?? null,
    servings: entry.servings,
    unit: entry.unit,
    mlPerUnit: entry.mlPerUnit,
    totalMl: entry.totalMl,
    totalCaffeineMg: entry.totalCaffeineMg,
    totalSugarG: entry.totalSugarG,
    waterMl: entry.waterMl,
    consumedAt: serializeDateLike(entry.consumedAt),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    dateKey: entry.dateKey,
    memo: entry.memo ?? null,
  };
}

export async function saveEntry(entry: EntryWritePayload) {
  const mode = await getSessionMode();

  if (mode === "authenticated" && isAuthed()) {
    return saveCloudEntry(entry);
  }
  return saveGuestEntry(toGuestEntry(entry));
}

export async function listEntries() {
  const mode = await getSessionMode();

  if (mode === "authenticated" && isAuthed()) {
    return listCloudEntries();
  }
  return listGuestEntries();
}

export async function getEntryById(entryId: string) {
  const mode = await getSessionMode();

  if (mode === "authenticated" && isAuthed()) {
    return getCloudEntryById(entryId);
  }

  const entries = await listGuestEntries();
  return entries.find((entry) => entry.id === entryId) ?? null;
}

export async function listEntriesByDateKey(dateKey: string) {
  const mode = await getSessionMode();

  if (mode === "authenticated" && isAuthed()) {
    return listCloudEntriesByDateKey(dateKey);
  }
  return listGuestEntriesByDateKey(dateKey);
}

export async function updateEntry(entryId: string, patch: Partial<EntryDoc>) {
  const mode = await getSessionMode();

  if (mode === "authenticated" && isAuthed()) {
    return updateCloudEntry(entryId, patch);
  }
  return updateGuestEntry(entryId, patch);
}

export async function deleteEntry(entryId: string) {
  const mode = await getSessionMode();

  if (mode === "authenticated" && isAuthed()) {
    return deleteCloudEntry(entryId);
  }
  return deleteGuestEntry(entryId);
}

export async function addEntry(payload: EntryWritePayload) {
  return saveEntry(payload);
}
