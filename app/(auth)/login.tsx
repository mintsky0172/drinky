import AppButton from "@/src/components/ui/AppButton";
import AppText from "@/src/components/ui/AppText";
import TextField from "@/src/components/ui/TextField";
import { useGoogleSignIn } from "@/src/features/auth/useGoogleSignIn";
import { auth } from "@/src/lib/firebase";
import { useRouter } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import React, { useState } from "react";
import { Alert, ImageBackground, Image, StyleSheet, View } from "react-native";
import Toast from "react-native-toast-message";

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
        />
        <TextField
          placeholder="비밀번호"
          secureTextEntry
          value={pw}
          onChangeText={setPw}
        />
        <AppButton label="로그인" onPress={onLogin} />
        <AppButton
          label="회원가입"
          variant="danger"
          onPress={() => router.push("/signup")}
        />
        <AppButton
          label="Google로 시작하기"
          variant="secondary"
          iconSource={require('@/assets/icons/etc/google.png')}
          onPress={onGoogleLogin}
        />
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
});
