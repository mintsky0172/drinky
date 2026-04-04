import AppButton from "@/src/components/ui/AppButton";
import AppText from "@/src/components/ui/AppText";
import TextField from "@/src/components/ui/TextField";
import { useGoogleSignIn } from "@/src/features/auth/useGoogleSignIn";
import { auth } from "@/src/lib/firebase";
import { useRouter } from "expo-router";
import { sendPasswordResetEmail, signInWithEmailAndPassword } from "firebase/auth";
import React, { useState } from "react";
import {
  Alert,
  ImageBackground,
  Image,
  Platform,
  StyleSheet,
  Pressable,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import * as AppleAuthentication from "expo-apple-authentication";
import { signInWithApple } from "@/src/features/auth/useAppleSignIn";
import { COLORS } from "@/src/constants/colors";

function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");

  const { signIn } = useGoogleSignIn();

  const onLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email.trim(), pw);
      router.replace("/");
    } catch (e: any) {
      Alert.alert("로그인 실패", e?.messsage ?? "에러가 발생했어요");
    }
  };

  const onGoogleLogin = async () => {
    try {
      const user = await signIn();
      if (!user) return;

      Toast.show({
        type: "success",
        text1: "로그인 완료",
        text2: "Drinky에 오신 걸 환영해요☕️",
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
      await signInWithApple();
    } catch (error: any) {
      if (error?.code === "ERR_REQUEST_CANCELLED") {
        return;
      }
      console.error(error);
    }
  };

  const handleResetPassword = async () => {
    const targetEmail = email.trim();

    if (!targetEmail) {
      Alert.alert("이메일을 입력해 주세요", "비밀번호 재설정 메일을 보낼 이메일이 필요해요.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, targetEmail);
      Alert.alert("메일을 보냈어요", "비밀번호 재설정 링크를 이메일로 보냈습니다.");
    } catch (error: any) {
      Alert.alert("비밀번호 찾기 실패", error?.message ?? "다시 시도해 주세요.");
    }
  };
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
      <View style={styles.form}>
        <AppText preset="h1" style={{ textAlign: "center" }}>
          로그인
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

        <View style={styles.orRow}>
          <View style={styles.orLine} />
          <AppText preset="caption" style={styles.orText}>
            또는
          </AppText>
          <View style={styles.orLine} />
        </View>

        <View style={styles.socialRow}>
          {Platform.OS === "ios" ? (
            <View style={styles.socialButtonWrap}>
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={
                  AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
                }
                buttonStyle={
                  AppleAuthentication.AppleAuthenticationButtonStyle
                    .BLACK
                }
                cornerRadius={14}
                style={styles.appleButton}
                onPress={handleAppleLogin}
              />
            </View>
          ) : null}
          <View style={styles.socialButtonWrap}>
            <GoogleAuthButton onPress={onGoogleLogin} />
          </View>
        </View>

        <View style={styles.linkRow}>
          <AppText style={styles.linkText} onPress={() => router.push("/signup")}>
            회원가입
          </AppText>
          <AppText style={styles.linkDivider}>|</AppText>
          <AppText style={styles.linkText} onPress={handleResetPassword}>
            비밀번호 찾기
          </AppText>
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
    width: 220,
    marginBottom: 12,
    marginTop: -80,
  },
  form: {
    width: "100%",
    paddingHorizontal: 40,
    gap: 12,
    marginTop: -48,
  },
  socialRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
    width: "100%",
    alignItems: "stretch",
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
    flex: 1,
    minWidth: 0,
  },
  socialButton: {
    height: 52,
    width: "100%",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.ui.border,
    backgroundColor: COLORS.base.creamPaper,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    paddingHorizontal: 14,
  },
  socialButtonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  linkText: {
    textDecorationLine: "underline",
    textAlign: "center",
  },
  linkDivider: {
    color: COLORS.semantic.textSecondary,
  },
  appleButton: {
    height: 52,
    width: "100%",
  },
  socialIcon: {
    width: 13,
    height: 15,
    marginRight: 8,
  },
  socialLabel: {
    color: COLORS.primary.espresso,
    fontFamily: "System",
    fontSize: 17,
    lineHeight: 20,
    fontWeight: "400",
  },
  loginInput: {
    paddingTop: 0,
    paddingBottom: 0,
    lineHeight: 14,
  },
});

function GoogleAuthButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.socialButton,
        pressed && styles.socialButtonPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel="Google로 로그인"
    >
      <Image
        source={require("@/assets/icons/etc/google.png")}
        style={styles.socialIcon}
        resizeMode="contain"
      />
      <AppText preset="buttonSmall" style={styles.socialLabel}>
        Google로 로그인
      </AppText>
    </Pressable>
  );
}
