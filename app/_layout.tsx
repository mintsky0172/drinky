import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import AuthProvider from "@/src/providers/AuthProvider";
import { ImageBackground, StyleSheet } from "react-native";
import Toast, { BaseToast, ErrorToast } from "react-native-toast-message";
import { COLORS } from "@/src/constants/colors";

const appBackground = require("../assets/images/background.png");

const toastConfig = {
  success: (props: any) => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: COLORS.semantic.primary,
        backgroundColor: COLORS.base.creamPaper,
      }}
      contentContainerStyle={{ paddingHorizontal: 12 }}
      text1Style={{
        fontSize: 16,
        fontWeight: "600",
        color: COLORS.semantic.textPrimary,
        fontFamily: "Iseoyun",
      }}
      text2Style={{
        fontSize: 14,
        color: COLORS.semantic.textSecondary,
        fontFamily: "Iseoyun",
      }}
    />
  ),
  error: (props: any) => (
    <ErrorToast
      {...props}
      style={{
        borderLeftColor: "#D96C6C",
        backgroundColor: COLORS.base.creamPaper,
      }}
      text1Style={{
        fontSize: 16,
        fontWeight: "600",
        fontFamily: "Iseoyun",
      }}
      text2Style={{
        fontSize: 14,
        fontFamily: "Iseoyun",
      }}
    />
  ),
};

export default function RootLayout() {
  const [loaded] = useFonts({
    Iseoyun: require("../assets/fonts/Iseoyun.ttf"),
  });

  if (!loaded) return null;
  return (
    <AuthProvider>
      <ImageBackground
        source={appBackground}
        style={styles.background}
        resizeMode="cover"
      >
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: "transparent" },
          }}
        />
        <Toast config={toastConfig} />
      </ImageBackground>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
});
