import AppButton from "@/src/components/ui/AppButton";
import AppText from "@/src/components/ui/AppText";
import TextField from "@/src/components/ui/TextField";
import { useGoogleSignIn } from "@/src/features/auth/useGoogleSignIn";
import { auth } from "@/src/lib/firebase";
import { useRouter } from "expo-router";
import {
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from "firebase/auth";
import React, { useState } from "react";
import {
  Alert,
  ImageBackground,
  Image,
  Platform,
  StyleSheet,
  Pressable,
  View,
  Linking,
} from "react-native";
import Toast from "react-native-toast-message";
import { signInWithApple } from "@/src/features/auth/useAppleSignIn";
import { COLORS } from "@/src/constants/colors";
import { setGuestMode } from "@/src/features/auth/session";
import { finishAuthenticatedSession } from "@/src/features/auth/finishAuthenticatedSession";

function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const socialGroupWidth = Platform.OS === "ios" ? 160 : 72;

  const { signIn } = useGoogleSignIn();

  const onLogin = async () => {
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), pw);
      const { migratedGuestData } = await finishAuthenticatedSession({
        uid: cred.user.uid,
        email: cred.user.email ?? email.trim(),
      });

      Toast.show({
        type: "success",
        text1: "로그인 완료",
        text2: migratedGuestData
          ? "비회원 기록을 계정으로 옮겼어요."
          : "Drinky에 오신 걸 환영해요☕️",
        position: "bottom",
      });
      router.replace("/");
    } catch (e: any) {
      Alert.alert("로그인 실패", e?.message ?? "에러가 발생했어요");
    }
  };

  const onGoogleLogin = async () => {
    try {
      const user = await signIn();
      if (!user) return;

      const { migratedGuestData } = await finishAuthenticatedSession({
        uid: user.uid,
        email: user.email ?? "",
      });

      Toast.show({
        type: "success",
        text1: "로그인 완료",
        text2: migratedGuestData
          ? "비회원 기록을 계정으로 옮겼어요."
          : "Drinky에 오신 걸 환영해요☕️",
        position: "bottom",
      });
      router.replace("/");
    } catch (e: any) {
      Toast.show({
        type: "error",
        text1: "로그인 실패",
        text2: e?.message ?? "다시 시도해 주세요.",
        position: "bottom",
      });
    }
  };

  const handleAppleLogin = async () => {
    try {
      const result = await signInWithApple();
      const { migratedGuestData } = await finishAuthenticatedSession({
        uid: result.user.uid,
        email: result.user.email ?? result.appleCredential.email ?? "",
      });

      Toast.show({
        type: "success",
        text1: "로그인 완료",
        text2: migratedGuestData
          ? "비회원 기록을 계정으로 옮겼어요."
          : "Drinky에 오신 걸 환영해요☕️",
        position: "bottom",
      });
      router.replace("/");
    } catch (error: any) {
      if (error?.code === "ERR_REQUEST_CANCELLED") {
        return;
      }
      Toast.show({
        type: "error",
        text1: "로그인 실패",
        text2: error?.message ?? "다시 시도해 주세요.",
        position: "bottom",
      });
    }
  };

  const handleContinueAsGuest = async () => {
    await setGuestMode();
    router.replace("/(tabs)");
  };

  const handleResetPassword = async () => {
    const targetEmail = email.trim();

    if (!targetEmail) {
      Alert.alert(
        "이메일을 입력해 주세요",
        "비밀번호 재설정 메일을 보낼 이메일이 필요해요.",
      );
      return;
    }

    try {
      await sendPasswordResetEmail(auth, targetEmail);
      Alert.alert(
        "메일을 보냈어요",
        "비밀번호 재설정 링크를 이메일로 보냈습니다.",
      );
    } catch (error: any) {
      Alert.alert(
        "비밀번호 찾기 실패",
        error?.message ?? "다시 시도해 주세요.",
      );
    }
  };
  return (
    <ImageBackground
      source={require("@/assets/images/background.png")}
      style={styles.bg}
      resizeMode="stretch"
    >
      <Image
        source={require("@/assets/images/logo.png")}
        style={styles.logo}
        resizeMode="contain"
      />
      <View style={styles.form}>
        <AppText preset="h1" style={{ textAlign: "center" }}>
          로그인
        </AppText>

        <AppText style={styles.helperText}>
          로그인하면 기록을 안전하게 저장하고{`\n`}기기 변경 시에도 이어서
          사용할 수 있어요.
        </AppText>
        <TextField
          placeholder="이메일"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
          style={styles.loginInput}
        />
        <TextField
          placeholder="비밀번호"
          secureTextEntry
          value={pw}
          onChangeText={setPw}
          style={styles.loginInput}
        />
        <AppButton label="로그인" onPress={onLogin} />
        <AppButton
          label="로그인 없이 시작하기"
          onPress={handleContinueAsGuest}
          variant="secondary"
        />

        <View style={styles.orRow}>
          <View style={styles.orLine} />
          <AppText preset="caption" style={styles.orText}>
            또는
          </AppText>
          <View style={styles.orLine} />
        </View>

        <View style={[styles.socialRow, { width: socialGroupWidth }]}>
          {Platform.OS === "ios" ? (
            <View style={styles.socialButtonWrap}>
              <Pressable
                onPress={handleAppleLogin}
                style={({ pressed }) => [
                  styles.appleCircleButton,
                  pressed && styles.appleCircleButtonPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Apple로 로그인"
              >
                <Image
                  source={require("@/assets/icons/etc/appleid_button.png")}
                  style={styles.appleArtwork}
                  resizeMode="contain"
                />
              </Pressable>
            </View>
          ) : null}
          <View style={styles.socialButtonWrap}>
            <GoogleAuthButton onPress={onGoogleLogin} />
          </View>
        </View>

        <View style={[styles.linkRow, { width: socialGroupWidth }]}>
          <Pressable style={styles.linkCell} onPress={() => router.push("/signup")}>
            <AppText style={styles.linkText}>회원가입</AppText>
          </Pressable>
          <View style={styles.linkDividerCell}>
            <AppText style={styles.linkDivider}>|</AppText>
          </View>
          <Pressable style={styles.linkCell} onPress={handleResetPassword}>
            <AppText style={styles.linkText}>비밀번호 찾기</AppText>
          </Pressable>
        </View>

        <View style={styles.divider} />

        <View>
          <AppText
           preset='caption'
            style={{
              textAlign: "center",
              color: COLORS.semantic.textSecondary,
            }}
          >
            로그인 시{" "}
            <AppText
              preset='caption'
              style={styles.linkText}
              onPress={() =>
                Linking.openURL(
                  "https://www.notion.so/Drinky-33837b515a168017924eebac9c7e5a2a?source=copy_link",
                )
              }
            >
              이용약관
            </AppText>
            과{"\n"}
            <AppText
             preset='caption'
              style={styles.linkText}
              onPress={() =>
                Linking.openURL(
                  "https://www.notion.so/Drinky-33837b515a1680b2a447df52e7b6179e?source=copy_link",
                )
              }
            >
              개인정보처리방침
            </AppText>
            에 동의한 것으로 간주합니다.
          </AppText>
          <View style={{ height: 22 }} />
          <AppText style={{ textAlign: "center" }}>© Somin Lee, 2026</AppText>
        </View>
      </View>
    </ImageBackground>
  );
}

export default Login;

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    width: 180,
    marginBottom: -10,
  },
  form: {
    width: "100%",
    paddingHorizontal: 40,
    marginTop: -72,
    gap: 12,
  },
  helperText: {
    textAlign: "center",
    color: COLORS.semantic.textSecondary,
    lineHeight: 22,
    marginBottom: 4,
  },
  socialRow: {
    flexDirection: "row",
    gap: 36,
    marginTop: 4,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  orRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 4,
    width: "100%",
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.ui.border,
  },
  orText: {
    color: COLORS.semantic.textSecondary,
  },
  socialButtonWrap: {
    width: 52,
    alignItems: "center",
  },
  googleButton: {
    width: 52,
    height: 52,
  },
  googleArtwork: {
    width: 52,
    height: 52,
    flexShrink: 0,
  },
  socialButtonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
  },
  linkCell: {
    width: 62,
    alignItems: "center",
    justifyContent: "center",
  },
  linkDividerCell: {
    width: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  linkText: {
    textDecorationLine: "underline",
    textAlign: "center",
  },
  linkDivider: {
    color: COLORS.semantic.textSecondary,
  },
  appleCircleButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
  },
  appleCircleButtonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  appleArtwork: {
    width: 40,
    height: 40,
  },
  loginInput: {
    paddingTop: 0,
    paddingBottom: 0,
    lineHeight: 14,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.ui.border,
  },
});

function GoogleAuthButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.googleButton,
        pressed && styles.socialButtonPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel="Google로 로그인"
    >
      <Image
        source={require("@/assets/icons/etc/google_button.png")}
        style={styles.googleArtwork}
        resizeMode="contain"
      />
    </Pressable>
  );
}
