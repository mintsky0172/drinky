import { useState } from "react";
import Toast from "react-native-toast-message";
import { auth, db } from "../lib/firebase";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { ImageBackground, StyleSheet, TextInput, View } from "react-native";
import AppButton from "../components/ui/AppButton";

import { useRouter } from "expo-router";
import TextField from "../components/ui/TextField";

export default function NicknameScreen() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");

  const onSubmit = async () => {
    const user = auth.currentUser;
    if (!user) {
      Toast.show({ type: "error", text1: "로그인이 필요해요" });
      return;
    }

    const trimmed = nickname.trim();
    if (trimmed.length < 2) {
      Toast.show({ type: "error", text1: "닉네임은 2글자 이상으로 해주세요." });
      return;
    }

    try {
      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);

      await setDoc(
        ref,
        snap.exists()
          ? {
              nickname: trimmed,
              updatedAt: serverTimestamp(),
            }
          : {
              nickname: trimmed,
              email: user.email ?? null,
              updatedAt: serverTimestamp(),
              createdAt: serverTimestamp(),
              goals: {
                waterMl: 2000,
                caffeineMg: 300,
                sugarG: 50,
              },
              streak: 0,
            },
        { merge: true },
      );

      Toast.show({ type: "success", text1: "환영해요!", text2: `${trimmed}님` });
      router.replace("/(tabs)");
    } catch {
      Toast.show({ type: "error", text1: "저장 실패", text2: "잠시 후 다시 시도해 주세요." });
    }
  };

  return (
    <ImageBackground
      source={require("@/assets/images/loading_background.png")}
      style={styles.bg}
      resizeMode="cover"
    >
      <View style={styles.card}>
        <TextField
          value={nickname}
          onChangeText={setNickname}
          placeholder="닉네임 입력"
          autoCapitalize="none"
          style={styles.input}
        />
        <AppButton label="시작하기" variant="primary" onPress={onSubmit} />
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    width: "100%",
    paddingHorizontal: 40,
    gap: 12,
  },
  input: {
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#fff",
  },
});
