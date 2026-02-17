import AppText from "@/src/components/ui/AppText";
import { auth, db } from "@/src/lib/firebase";
import { useRouter } from "expo-router";
import { deleteUser, signOut } from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  writeBatch,
} from "firebase/firestore";
import React from "react";
import { View, Text, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

async function deleteAllEntries(uid: string) {
  // entries가 많아지면 paging 필요
  const snap = await getDocs(collection(db, "users", uid, "entries"));
  const batch = writeBatch(db);
  snap.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}

function Me() {
  const router = useRouter();

  const onLogout = async () => {
    await signOut(auth);
    router.replace("/login");
  };

  const onDeleteAccount = async () => {
    const user = auth.currentUser;
    if (!user) return;

    Alert.alert(
      "계정 탈퇴",
      "정말 탈퇴할까요? 기록이 모두 삭제되며, 복원할 수 없어요.",
      [
        { text: "취소", style: "cancel" },
        {
          text: "탈퇴",
          style: "destructive",
          onPress: async () => {
            try {
              const uid = user.uid;

              // 1) Firestore 데이터 삭제
              await deleteAllEntries(uid);
              await deleteDoc(doc(db, "users", uid));

              // 2) Auth 계정 삭제
              await deleteUser(user);

              router.replace("/login");
            } catch (e: any) {
              Alert.alert(
                "탈퇴 실패",
                e?.message ?? "다시 로그인 후 탈퇴를 시도해 주세요.",
              );
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
      <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 100, gap: 12 }}>
        <AppText preset="h3" onPress={onLogout} style={{ textAlign: "center" }}>
          로그아웃
        </AppText>
        <AppText
          preset="h3"
          onPress={onDeleteAccount}
          style={{ textAlign: "center" }}
        >
          계정 탈퇴
        </AppText>
      </View>
    </SafeAreaView>
  );
}

export default Me;
