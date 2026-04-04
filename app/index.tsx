import { Image, ImageBackground, StyleSheet } from "react-native";
import React, { useEffect } from "react";
import { useRouter } from "expo-router";
import { useAuthGate } from "@/src/features/auth/AuthGate";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SplashScreen = () => {
  const router = useRouter();
  const route = useAuthGate();

  useEffect(() => {
    const init = async () => {
      const hasOnboarded = await AsyncStorage.getItem('hasOnboarded');

      if(hasOnboarded === 'true') {
        router.replace('/(tabs)');
      } else {
        router.replace('/onboarding');
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (route === "LOADING") return;

    const t = setTimeout(() => {
      if (route === "AUTH") router.replace("/(auth)/login");
      else if (route === "NICKNAME") router.replace("/(auth)/nickname");
      else router.replace("/(tabs)");
    }, 900);

    return () => clearTimeout(t);
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
