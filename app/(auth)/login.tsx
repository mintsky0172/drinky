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
  Linking,
} from "react-native";
import Toast from "react-native-toast-message";
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
      Toast.show({
        type: "success",
        text1: "로그인 완료",
        text2: "Drinky에 오신 걸 환영해요☕️",
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
        <AppButton label="음료 기록하러 가기!" onPress={onLogin} />

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

        <View style={styles.linkRow}>
          <AppText style={styles.linkText} onPress={() => router.push("/signup")}>
            회원가입
          </AppText>
          <AppText style={styles.linkDivider}>|</AppText>
          <AppText style={styles.linkText} onPress={handleResetPassword}>
            비밀번호 찾기
          </AppText>
        </View>

        <View style={styles.divider} />

        <View>
          <AppText style={{ textAlign: 'center', color: COLORS.semantic.textSecondary}}>
            로그인 시 <AppText style={styles.linkText} onPress={() => Linking.openURL('https://www.notion.so/Drinky-33837b515a168017924eebac9c7e5a2a?source=copy_link')}>이용약관</AppText>과{'\n'}<AppText style={styles.linkText} onPress={() => Linking.openURL('https://www.notion.so/Drinky-33837b515a1680b2a447df52e7b6179e?source=copy_link')}>개인정보처리방침</AppText>에 동의한 것으로 간주합니다.
          </AppText>
          <View style={{height: 22}} />
          <AppText style={{textAlign: 'center'}}>© Somin Lee, 2026</AppText>
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
    gap: 36,
    marginTop: 4,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
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
  }
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
