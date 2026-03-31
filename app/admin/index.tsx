import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import React, { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AppText from "@/src/components/ui/AppText";
import { COLORS } from "@/src/constants/colors";
import { useAuth } from "@/src/providers/AuthProvider";
import { getUserRole } from "@/src/lib/admin/adminApi";

const AdminScreen = () => {
  const router = useRouter();
  const { user, initializing } = useAuth();

  const [loadingRole, setLoadingRole] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (initializing) return;
    if (!user) {
      setLoadingRole(false);
      setIsAdmin(false);
      return;
    }

    const run = async () => {
      const role = await getUserRole(user.uid);
      setIsAdmin(role === "admin");
      setLoadingRole(false);
    };

    run();
  }, [initializing, user]);

  if (loadingRole) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      </SafeAreaView>
    );
  }

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <AppText preset="h3" style={styles.blockedTitle}>
            관리자 전용 페이지에요.
          </AppText>
          <AppText preset="h3" style={styles.blockedText}>
            현재 계정에는 접근 권한이 없어요.
          </AppText>

          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <AppText preset="h2" style={styles.backButtonText}>
              돌아가기
            </AppText>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons
              name="chevron-back"
              size={22}
              color={COLORS.semantic.textPrimary}
            />
          </Pressable>

          <AppText preset="h1">관리자 페이지</AppText>

          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.sectionCard}>
          <AppText preset="h2" style={styles.sectionTitle}>
            관리 메뉴
          </AppText>

          <Pressable
            style={styles.itemRow}
            onPress={() => router.push("/admin/recipes")}
          >
            <AppText preset="h3">음료 메뉴 관리</AppText>

            <Ionicons
              name="chevron-forward"
              size={18}
              color={COLORS.semantic.textSecondary}
            />
          </Pressable>

          <View style={styles.itemDivider} />

          <Pressable
            style={styles.itemRow}
            onPress={() => router.push("/admin/reports-and-inquiries")}
          >
            <AppText preset="h3">제보/문의 관리</AppText>

            <Ionicons
              name="chevron-forward"
              size={18}
              color={COLORS.semantic.textSecondary}
            />
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default AdminScreen;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 64,
    paddingBottom: 28,
    gap: 14,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  blockedTitle: {
    marginBottom: 8,
  },
  blockedText: {
    textAlign: "center",
    marginBottom: 16,
  },
  backButton: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: COLORS.base.warmBeige,
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonText: {
    color: COLORS.base.creamPaper,
  },
  headerRow: {
    height: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerSpacer: {
    width: 22,
  },
  sectionCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.ui.border,
    backgroundColor: COLORS.base.white,
    padding: 16,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  itemRow: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  itemDivider: {
    height: 1,
    backgroundColor: COLORS.ui.border,
  },
});
