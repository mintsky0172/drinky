import { Stack } from "expo-router";
import { useFonts } from "expo-font";

export default function RootLayout() {
  const [loaded] = useFonts({
    Iseoyun: require("../assets/fonts/Iseoyun.ttf"),
  });

  if (!loaded) return null;
  return <Stack screenOptions={{ headerShown: false }} />;
}
