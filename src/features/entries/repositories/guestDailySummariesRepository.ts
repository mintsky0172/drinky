import AsyncStorage from "@react-native-async-storage/async-storage";

const GUEST_DAILY_SUMMARIES_KEY = "guestDailySummaries";

export type GuestDailySummary = {
  dateKey: string;
  oneLine?: string;
  overrideIconKey?: string | null;
  goalsAchieved?: boolean;
  confettiShown?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

async function readAllGuestDailySummaries(): Promise<GuestDailySummary[]> {
  const raw = await AsyncStorage.getItem(GUEST_DAILY_SUMMARIES_KEY);
  return raw ? JSON.parse(raw) : [];
}

async function writeAllGuestDailySummaries(summaries: GuestDailySummary[]) {
  await AsyncStorage.setItem(
    GUEST_DAILY_SUMMARIES_KEY,
    JSON.stringify(summaries),
  );
}

export async function getGuestDailySummary(dateKey: string) {
  const summaries = await readAllGuestDailySummaries();
  return summaries.find((summary) => summary.dateKey === dateKey) ?? null;
}

export async function listGuestDailySummariesByDateRange(
  startKey: string,
  endKey: string,
) {
  const summaries = await readAllGuestDailySummaries();
  return summaries
    .filter(
      (summary) => summary.dateKey >= startKey && summary.dateKey < endKey,
    )
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey));
}

export async function saveGuestDailySummary(
  dateKey: string,
  patch: Partial<GuestDailySummary>,
) {
  const summaries = await readAllGuestDailySummaries();
  const now = new Date().toISOString();
  const index = summaries.findIndex((summary) => summary.dateKey === dateKey);

  const nextSummary: GuestDailySummary = {
    dateKey,
    ...(index >= 0 ? summaries[index] : { createdAt: now }),
    ...patch,
    updatedAt: now,
  };

  const next =
    index >= 0
      ? summaries.map((summary, summaryIndex) =>
          summaryIndex === index ? nextSummary : summary,
        )
      : [nextSummary, ...summaries];

  await writeAllGuestDailySummaries(next);
  return nextSummary;
}

export async function clearGuestDailySummaries() {
  await AsyncStorage.removeItem(GUEST_DAILY_SUMMARIES_KEY);
}
