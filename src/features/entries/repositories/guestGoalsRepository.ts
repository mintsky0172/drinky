import AsyncStorage from "@react-native-async-storage/async-storage";

import type { UserGoals } from "@/src/lib/user";
import { DEFAULT_GOALS } from "@/src/lib/user";

const GUEST_GOALS_KEY = "guestGoals";

export async function getGuestGoals(): Promise<UserGoals> {
  const raw = await AsyncStorage.getItem(GUEST_GOALS_KEY);
  if (!raw) return DEFAULT_GOALS;

  try {
    const parsed = JSON.parse(raw) as Partial<UserGoals>;
    return {
      waterMl: Number(parsed.waterMl ?? DEFAULT_GOALS.waterMl),
      caffeineMg: Number(parsed.caffeineMg ?? DEFAULT_GOALS.caffeineMg),
      sugarG: Number(parsed.sugarG ?? DEFAULT_GOALS.sugarG),
    };
  } catch {
    return DEFAULT_GOALS;
  }
}

export async function saveGuestGoals(goals: UserGoals) {
  await AsyncStorage.setItem(GUEST_GOALS_KEY, JSON.stringify(goals));
}

export async function clearGuestGoals() {
  await AsyncStorage.removeItem(GUEST_GOALS_KEY);
}
