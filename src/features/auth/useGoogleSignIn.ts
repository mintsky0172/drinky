import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import * as AuthSession from "expo-auth-session";
import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import { auth } from "@/src/lib/firebase";
import Toast from "react-native-toast-message";

WebBrowser.maybeCompleteAuthSession();

export function useGoogleSignIn() {
  const reversedClientId =
    process.env.EXPO_PUBLIC_GOOGLE_IOS_REVERSED_CLIENT_ID;
  if (!reversedClientId) {
    throw new Error("EXPO_PUBLIC_GOOGLE_IOS_REVERSED_CLIENT_ID is missing");
  }

  const redirectUri = `${reversedClientId}:/oauthredirect`;

  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    redirectUri,
    shouldAutoExchangeCode: false,
    scopes: ["openid", "profile", "email"],
  });

  const signIn = async () => {
    const result = await promptAsync();

    if (result.type !== "success") return null;

    let idToken = result.params?.id_token ?? result.authentication?.idToken;
    let accessToken =
      result.params?.access_token ?? result.authentication?.accessToken;

    // v2 Google flow on native often returns only authorization code.
    if ((!idToken || !accessToken) && result.params?.code && request?.codeVerifier) {
      const tokenResult = await AuthSession.exchangeCodeAsync(
        {
          clientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID!,
          code: result.params.code,
          redirectUri,
          extraParams: {
            code_verifier: request.codeVerifier,
          },
        },
        Google.discovery,
      );

      idToken = idToken ?? tokenResult.idToken ?? undefined;
      accessToken = accessToken ?? tokenResult.accessToken ?? undefined;
    }

    if (!idToken && !accessToken) {
      Toast.show({
        type: "error",
        text1: "Google token missing",
        text2:
          result.params?.error_description ??
          result.params?.error ??
          "Google OAuth 설정을 다시 확인해 주세요.",
      });
      return;
    }

    const credential = GoogleAuthProvider.credential(
      idToken ?? null,
      accessToken ?? null,
    );

    try {
      const userCred = await signInWithCredential(auth, credential);
      return userCred.user;
    } catch (e: any) {
      // Some Google token combos fail on Firebase; retry with access token only.
      if (accessToken) {
        try {
          const fallbackCred = GoogleAuthProvider.credential(null, accessToken);
          const userCred = await signInWithCredential(auth, fallbackCred);
          return userCred.user;
        } catch {
          // Keep original error from first sign-in attempt.
        }
      }
      throw e;
    }
  };
  return { request, response, signIn };
}
