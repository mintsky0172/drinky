import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import AuthProvider from "@/src/providers/AuthProvider";

export default function RootLayout() {
  const [loaded] = useFonts({
    Iseoyun: require("../assets/fonts/Iseoyun.ttf"),
  });

  if (!loaded) return null;
  return (
    
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </AuthProvider>
  );
}
