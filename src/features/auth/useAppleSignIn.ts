import * as AppleAuthentication from "expo-apple-authentication";
import { OAuthProvider, signInWithCredential } from "firebase/auth";
import { auth } from "@/src/lib/firebase";
import { ensureUserDoc } from "@/src/lib/user";

export async function signInWithApple() {
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });

  const provider = new OAuthProvider("apple.com");
  const firebaseCredential = provider.credential({
    idToken: credential.identityToken!,
  });

  const result = await signInWithCredential(auth, firebaseCredential);

  const fullName = credential.fullName;
  const nickname = [
    fullName?.familyName,
    fullName?.givenName,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  await ensureUserDoc({
    uid: result.user.uid,
    email: result.user.email ?? credential.email ?? "",
    nickname: nickname || undefined,
  });

  return {
    user: result.user,
    appleCredential: credential,
  };
}
