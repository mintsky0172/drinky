import AppText from "@/src/components/ui/AppText";
import { COLORS } from "@/src/constants/colors";
import { setGuestMode } from "@/src/features/auth/session";
import { listEntries } from "@/src/features/entries/entriesApi";
import { getGuestGoals } from "@/src/features/entries/repositories/guestGoalsRepository";
import { getUserRole } from "@/src/lib/admin/adminApi";
import { auth, db } from "@/src/lib/firebase";
import { DEFAULT_GOALS, type UserGoals } from "@/src/lib/user";
import { useAuth } from "@/src/providers/AuthProvider";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { deleteUser, signOut } from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  writeBatch,
  query,
} from "firebase/firestore";
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Alert,
  Pressable,
  StyleSheet,
  Image,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

async function deleteAllEntries(uid: string) {
  // entries가 많아지면 paging 필요
  const snap = await getDocs(collection(db, "users", uid, "entries"));
  const batch = writeBatch(db);
  snap.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}

function Me() {
  const { user, initializing } = useAuth();

  const [isAdmin, setIsAdmin] = useState(false);

  const [nickname, setNickname] = useState("닉네임");
  const [email, setEmail] = useState("");
  const [goals, setGoals] = useState<UserGoals>(DEFAULT_GOALS);
  const [streakDays, setStreakDays] = useState(0);

  useEffect(() => {
    if (initializing) return;
    if (!user) {
      setIsAdmin(false);
      return;
    }

    const run = async () => {
      const role = await getUserRole(user.uid);
      setIsAdmin(role === "admin");
    };

    run();
  }, [user, initializing]);

  useEffect(() => {
    if (initializing) return;
    if (!user) {
      let cancelled = false;

      const run = async () => {
        const [entries, guestGoals] = await Promise.all([
          listEntries(),
          getGuestGoals(),
        ]);
        if (cancelled) return;

        const dateKeys = Array.from(
          new Set(
            entries
              .map((entry: any) => entry?.dateKey as string | undefined)
              .filter((dateKey): dateKey is string => Boolean(dateKey)),
          ),
        ).sort();

        setNickname("게스트");
        setEmail("");
        setGoals(guestGoals);
        setStreakDays(calculateCurrentStreak(dateKeys));
      };

      void run();

      return () => {
        cancelled = true;
      };
    }

    const userRef = doc(db, "users", user.uid);
    const unsubscribeUser = onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();

        setNickname(data.nickname ?? "닉네임");
        setEmail(user.email ?? "");

        const nextGoals: UserGoals = {
          waterMl: data.goals?.waterMl ?? DEFAULT_GOALS.waterMl,
          caffeineMg: data.goals?.caffeineMg ?? DEFAULT_GOALS.caffeineMg,
          sugarG: data.goals?.sugarG ?? DEFAULT_GOALS.sugarG,
        };
        setGoals(nextGoals);
      } else {
        setNickname("닉네임");
        setEmail(user.email ?? "");
        setGoals(DEFAULT_GOALS);
      }
    });

    const entriesRef = collection(db, "users", user.uid, "entries");
    const unsubscribeEntries = onSnapshot(query(entriesRef), (snap) => {
      const dateKeys = Array.from(
        new Set(
          snap.docs
            .map((d) => (d.data() as any).dateKey as string | undefined)
            .filter((dateKey): dateKey is string => Boolean(dateKey)),
        ),
      ).sort();

      setStreakDays(calculateCurrentStreak(dateKeys));
    });

    return () => {
      unsubscribeUser();
      unsubscribeEntries();
    };
  }, [user, initializing]);

  const profileHint = useMemo(() => {
    if (streakDays >= 30) return "대단해요! 기록이 습관이 된 단계에요.";
    if (streakDays >= 7) return "멋져요! 기록 루틴이 잘 이어지고 있어요.";
    if (streakDays >= 1) return "차근차근 기록을 쌓는 중이에요.";
    return "오늘도 Drinky와 함께 음료 기록을 시작해 볼까요?";
  }, [streakDays]);

  const router = useRouter();

  const onLogout = async () => {
    await signOut(auth);
    await setGuestMode();
    router.replace("/");
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
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleRow}>
          <AppText preset="h1">마이페이지</AppText>

          {isAdmin ? (
            <Pressable
              style={styles.admin}
              onPress={() => router.push("/admin")}
            >
              <Image
                source={require("@/assets/icons/etc/tool.png")}
                style={styles.adminIcon}
              />
              <AppText preset="body">관리자 페이지</AppText>
            </Pressable>
          ) : null}
        </View>

        {/* 프로필 카드 */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <AppText preset="h2">프로필</AppText>
            <View style={styles.streakBadge}>
              <AppText preset="caption" style={styles.streakBadgeText}>
                연속 기록 {streakDays}일
              </AppText>
            </View>
          </View>

          <View style={styles.profileRow}>
            <View style={styles.profileImageWrap}>
              <Ionicons
                name="person"
                size={48}
                color={COLORS.semantic.textSecondary}
              />
            </View>

            <View style={styles.profileInfo}>
              <AppText preset="h3">{nickname}</AppText>
              <AppText preset="body">{email || "이메일 없음"}</AppText>

              <AppText preset="caption" style={styles.profileHint}>
                {profileHint}
              </AppText>
            </View>
          </View>
        </View>

        {!user ? (
          <View style={styles.guestNoticeCard}>
            <AppText preset="caption" style={styles.guestNoticeEyebrow}>
              GUEST MODE
            </AppText>
            <AppText preset="body" style={styles.guestNoticeText}>
              비회원 기록은 이 기기에만 저장돼요. 앱을 삭제하거나 기기를
              바꾸면 기록, 목표, 오늘의 한 줄이 사라질 수 있어요.
            </AppText>
            <Pressable
              style={styles.guestNoticeButton}
              onPress={() => router.push("/login")}
            >
              <AppText preset="caption" style={styles.guestNoticeButtonText}>
                로그인하고 안전하게 저장하기
              </AppText>
            </Pressable>
          </View>
        ) : null}

        {/* 하루 목표 설정 */}
        <View style={styles.sectionCard}>
          <View style={styles.editButtonRow}>
            <View style={styles.sectionHeaderTitleWrap}>
              <AppText preset="h2">목표 설정</AppText>
            </View>

            <Pressable
              style={styles.editButton}
              onPress={() => router.push("/me/goals")}
            >
              <Ionicons
                name="create-outline"
                size={14}
                color={COLORS.semantic.textSecondary}
              />
              <AppText preset="caption" style={styles.editButtonText}>
                수정
              </AppText>
            </Pressable>
          </View>

          <View style={styles.goalRow}>
            <View style={[styles.goalCard, styles.goalCardBlue]}>
              <AppText preset="h3">수분</AppText>
              <GoalValue value={goals.waterMl} unit="mL" />
            </View>

            <View style={[styles.goalCard, styles.goalCardWarm]}>
              <AppText preset="h3">카페인</AppText>
              <GoalValue value={goals.caffeineMg} unit="mg" />
            </View>

            <View style={[styles.goalCard, styles.goalCardPink]}>
              <AppText preset="h3">당류</AppText>
              <GoalValue value={goals.sugarG} unit="g" />
            </View>
          </View>
        </View>

        {/* 데이터 & 기능 */}
        <View style={styles.sectionCard}>
          <AppText preset="h2" style={styles.sectionTitle}>
            데이터 / 기능
          </AppText>

          <Pressable style={styles.menuRow}>
            <View style={styles.menuLeft}>
              <Image
                source={require("@/assets/icons/etc/idea.png")}
                style={styles.menuIcon}
              />
              <AppText
                preset="h3"
                style={styles.menuText}
                onPress={() => router.push("/report/new")}
              >
                새로운 음료 / 단종 음료 제보하기
              </AppText>
            </View>
          </Pressable>

          <View style={styles.menuDivider} />

          <Pressable style={styles.menuRow}>
            <View style={styles.menuLeft}>
              <Image
                source={require("@/assets/icons/etc/mail.png")}
                style={styles.menuIcon}
              />
              <AppText
                preset="h3"
                style={styles.menuText}
                onPress={() => router.push("/inquiry/new")}
              >
                문의하기
              </AppText>
            </View>
          </Pressable>
        </View>

        {/* 계정 */}
        <View style={styles.sectionCard}>
          <AppText preset="h2" style={styles.sectionTitle}>
            계정
          </AppText>

          {!user ? (
            <Pressable style={styles.menuRow} onPress={() => router.push("/login")}>
              <View style={styles.menuLeft}>
                <Image
                  source={require("@/assets/icons/etc/logout.png")}
                  style={styles.menuIcon}
                />
                <AppText preset="h3" style={styles.menuText}>
                  로그인
                </AppText>
              </View>
            </Pressable>
          ) : (
            <>
              <Pressable style={styles.menuRow} onPress={onLogout}>
                <View style={styles.menuLeft}>
                  <Image
                    source={require("@/assets/icons/etc/logout.png")}
                    style={styles.menuIcon}
                  />
                  <AppText preset="h3" style={styles.menuText}>
                    로그아웃
                  </AppText>
                </View>
              </Pressable>

              <View style={styles.menuDivider} />

              <Pressable style={styles.menuRow} onPress={onDeleteAccount}>
                <View style={styles.menuLeft}>
                  <Image
                    source={require("@/assets/icons/etc/exit.png")}
                    style={styles.menuIcon}
                  />
                  <AppText preset="h3" style={styles.menuText}>
                    계정 탈퇴
                  </AppText>
                </View>
              </Pressable>
            </>
          )}
        </View>

        <AppText preset="caption" style={{ textAlign: "center" }}>
          본 앱은 특정 브랜드와 공식적으로 제휴되어 있지 않습니다. {"\n"} 메뉴
          정보는 참고용입니다.
        </AppText>
        <AppText preset="caption" style={{ textAlign: "center" }}>
          © Somin Lee, 2026
        </AppText>
      </ScrollView>
    </SafeAreaView>
  );
}

export default Me;

function GoalValue({
  value,
  unit,
}: {
  value: number;
  unit: "mL" | "mg" | "g";
}) {
  const [shouldBreak, setShouldBreak] = useState(false);
  const formattedValue = value.toLocaleString();

  return (
    <AppText
      preset="h3"
      style={styles.goalsValue}
      onTextLayout={(event) => {
        if (!shouldBreak && event.nativeEvent.lines.length > 1) {
          setShouldBreak(true);
        }
      }}
    >
      {shouldBreak ? `${formattedValue}\n${unit}` : `${formattedValue}${unit}`}
    </AppText>
  );
}

function toLocalDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function calculateCurrentStreak(dateKeys: string[]) {
  if (dateKeys.length === 0) return 0;

  const keySet = new Set(dateKeys);

  const today = new Date();
  const todayKey = toLocalDateKey(today);
  const yesterday = addDays(today, -1);
  const yesterdayKey = toLocalDateKey(yesterday);

  // 오늘도, 어제도 기록이 없으면 streak 끊김
  if (!keySet.has(todayKey) && !keySet.has(yesterdayKey)) return 0;

  // 오늘 기록 있으면 오늘부터, 없으면 어제부터 시작
  let cursor = keySet.has(todayKey) ? today : yesterday;
  let streak = 0;

  while (true) {
    const key = toLocalDateKey(cursor);
    if (!keySet.has(key)) break;

    streak++;
    cursor = addDays(cursor, -1);
  }

  return streak;
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "transparent",
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 70,
    paddingBottom: 20,
    gap: 14,
    backgroundColor: "transparent",
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  admin: {
    flexDirection: "row",
  },
  adminIcon: {
    width: 24,
    height: 24,
  },
  sectionCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.ui.border,
    backgroundColor: COLORS.semantic.surface,
    padding: 16,
  },
  guestNoticeCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.ui.border,
    backgroundColor: COLORS.base.white,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  guestNoticeEyebrow: {
    color: COLORS.semantic.textSecondary,
    letterSpacing: 0.6,
  },
  guestNoticeText: {
    color: COLORS.semantic.textPrimary,
    lineHeight: 22,
  },
  guestNoticeButton: {
    width: '100%',
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: COLORS.base.warmBeige,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  guestNoticeButtonText: {
    color: COLORS.semantic.textPrimary,
    textAlign: "center",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  profileImageWrap: {
    width: 88,
    height: 88,
    borderRadius: 999,
    backgroundColor: COLORS.base.warmBeige,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  profileInfo: {
    flex: 1,
    minWidth: 0,
  },
  profileHint: {
    marginTop: 6,
    color: COLORS.semantic.textSecondary,
    opacity: 0.8,
  },
  streakBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: COLORS.semantic.primary,
  },
  streakBadgeText: {
    color: COLORS.base.creamPaper,
  },
  editButtonRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionHeaderTitleWrap: {
    justifyContent: "center",
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.ui.border,
    backgroundColor: COLORS.semantic.surface,
  },
  editButtonText: {
    color: COLORS.semantic.textSecondary,
  },
  goalRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
    alignItems: "stretch",
  },
  goalCard: {
    flex: 1,
    minHeight: 80,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.ui.border,
    paddingVertical: 16,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  goalCardBlue: {
    backgroundColor: "#EEF6FF",
  },
  goalCardWarm: {
    backgroundColor: COLORS.base.warmBeige,
  },
  goalCardPink: {
    backgroundColor: "#FFF1F3",
  },
  goalLabel: {
    marginBottom: 8,
  },
  goalsValue: {
    textAlign: "center",
  },
  menuRow: {
    minHeight: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  menuLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  menuIcon: {
    width: 22,
    height: 22,
    resizeMode: "contain",
  },
  menuText: {
    flexShrink: 1,
  },
  menuDivider: {
    height: 1,
    backgroundColor: COLORS.ui.border,
    marginVertical: 8,
    opacity: 0.8,
  },
});
