import {
  Alert,
  ImageBackground,
  StyleSheet,
  Text,
  View,
  Image,
} from "react-native";
import React, { useState } from "react";
import { useRouter } from "expo-router";
import { createUserWithEmailAndPassword } from "firebase/auth";
import AppText from "@/src/components/ui/AppText";
import TextField from "@/src/components/ui/TextField";
import AppButton from "@/src/components/ui/AppButton";
import { auth } from "@/src/lib/firebase";

const Signup = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");

  const onSignup = async () => {
    try {
      await createUserWithEmailAndPassword(auth, email.trim(), pw);
      router.replace("/(tabs)");
    } catch (e: any) {
      Alert.alert("회원가입 실패", e?.message ?? "에러가 발생했어요");
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
          회원가입
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
        <AppButton label="회원가입" onPress={onSignup} />
        <AppButton
          label="로그인으로"
          variant="danger"
          onPress={() => router.back()}
        />
      </View>
    </ImageBackground>
  );
};

export default Signup;

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
