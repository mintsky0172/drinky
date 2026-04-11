import AsyncStorage from "@react-native-async-storage/async-storage";

export const SESSION_MODE_KEY = "sessionMode";

export type SessionMode = "guest" | "authenticated";

export async function getSessionMode(): Promise<SessionMode> {
  const mode = await AsyncStorage.getItem(SESSION_MODE_KEY);

  if (mode === "authenticated" || mode === "guest") {
    return mode;
  }

  return "guest";
}

export async function setGuestMode() {
  await AsyncStorage.setItem(SESSION_MODE_KEY, "guest");
}

export async function setAuthenticatedMode() {
  await AsyncStorage.setItem(SESSION_MODE_KEY, "authenticated");
}

export async function clearSessionMode() {
  await AsyncStorage.removeItem(SESSION_MODE_KEY);
}
