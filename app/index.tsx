import { Image, ImageBackground, StyleSheet } from "react-native";
import React, { useEffect } from "react";
import { useRouter } from "expo-router";
import { useAuthGate } from "@/src/features/auth/AuthGate";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SplashScreen = () => {
  const router = useRouter();
  const route = useAuthGate();

  useEffect(() => {
    if (route === "LOADING") return;

    let cancelled = false;

    const init = async () => {
      if (route === "AUTH") {
        router.replace("/(auth)/login");
        return;
      }

      if (route === "NICKNAME") {
        router.replace("/(auth)/nickname");
        return;
      }

      const hasOnboarded = await AsyncStorage.getItem("hasOnboarded");
      if (cancelled) return;

      if (hasOnboarded === "true") {
        router.replace("/(tabs)");
      } else {
        router.replace("/onboarding");
      }
    };

    const t = setTimeout(() => {
      void init();
    }, 900);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [route, router]);

  return (
    <ImageBackground
      source={require("@/assets/images/loading_background.png")}
      style={styles.bg}
      resizeMode="cover"
    >
      <Image
        source={require("@/assets/images/logo.png")}
        style={styles.logo}
        resizeMode="contain"
      />
    </ImageBackground>
  );
};

export default SplashScreen;

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    width: 220,
  },
});
