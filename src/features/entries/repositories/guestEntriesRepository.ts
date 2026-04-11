import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SizeLabel, Unit } from "@/src/types/drinky";

const GUEST_ENTRIES_KEY = "guestEntries";

export type GuestEntry = {
  id: string;
  drinkId?: string | null;
  drinkName: string;
  brandLabel?: string | null;
  brandNormalized?: string | null;
  iconKey: string;
  isWaterOnly: boolean;
  sizeLabel?: SizeLabel | null;
  servings: number;
  unit: Unit;
  mlPerUnit: number;
  totalMl: number;
  totalCaffeineMg: number;
  totalSugarG: number;
  waterMl: number;
  consumedAt: string;
  createdAt: string;
  updatedAt: string;
  dateKey: string;
  memo?: string | null;
};

async function readAllGuestEntries(): Promise<GuestEntry[]> {
    const raw = await AsyncStorage.getItem(GUEST_ENTRIES_KEY);
    return raw ? JSON.parse(raw) : [];
}

async function writeAllGuestEntries(entries: GuestEntry[]) {
    await AsyncStorage.setItem(GUEST_ENTRIES_KEY, JSON.stringify(entries));
}

export async function saveGuestEntry(entry: GuestEntry) {
  const entries = await readAllGuestEntries();
  const next = [entry, ...entries];
  await writeAllGuestEntries(next);
}

export async function listGuestEntries() {
  const entries = await readAllGuestEntries();
  return entries.sort(
    (a, b) => new Date(b.consumedAt).getTime() - new Date(a.consumedAt).getTime(),
  );
}

export async function listGuestEntriesByDateKey(dateKey: string) {
  const entries = await readAllGuestEntries();
  return entries
    .filter((entry) => entry.dateKey === dateKey)
    .sort(
      (a, b) => new Date(b.consumedAt).getTime() - new Date(a.consumedAt).getTime(),
    );
}

export async function updateGuestEntry(
  entryId: string,
  patch: Partial<GuestEntry>,
) {
  const entries = await readAllGuestEntries();

  const next = entries.map((entry) =>
    entry.id === entryId ? { ...entry, ...patch } : entry,
  );

  await writeAllGuestEntries(next);
}

export async function deleteGuestEntry(entryId: string) {
  const entries = await readAllGuestEntries();
  const next = entries.filter((entry) => entry.id !== entryId);
  await writeAllGuestEntries(next);
}

export async function clearGuestEntries() {
  await AsyncStorage.removeItem(GUEST_ENTRIES_KEY);
}

export async function getGuestEntryCount() {
  const entries = await readAllGuestEntries();
  return entries.length;
}
