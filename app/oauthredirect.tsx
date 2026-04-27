import { useEffect } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";

WebBrowser.maybeCompleteAuthSession();

export default function OAuthRedirectScreen() {
  const router = useRouter();

  useEffect(() => {
    const timeout = setTimeout(() => {
      router.replace("/");
    }, 300);

    return () => clearTimeout(timeout);
  }, [router]);

  return <View />;
}
