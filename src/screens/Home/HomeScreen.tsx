import {
  Pressable,
  StyleSheet,
  Text,
  View,
  ScrollView,
} from "react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { COLORS } from "@/src/constants/colors";
import { TYPOGRAPHY } from "@/src/constants/typography";
import AppButton from "@/src/components/ui/AppButton";
import TodayMemoCard from "@/src/components/home/TodayMemoCard";
import { IconKey } from "@/src/constants/icons";
import DrinkIcon from "@/src/components/common/DrinkIcon";
import Toast from "react-native-toast-message";
import IconPickerModal from "@/src/components/home/IconPickerModal";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  deleteField,
} from "firebase/firestore";
import { auth, db } from "@/src/lib/firebase";
import { toDateKey } from "@/src/lib/dateKey";

type SummaryCard = {
  label: "수분" | "카페인" | "당류";
  value: string;
  status: string;
  variant: "water" | "caffeine" | "sugar";
};

const HomeScreen = () => {
  const router = useRouter();
  // TODO: Firestore에서 오늘 집계로 교체
  const dateText = "2026. 02. 15";
  const dayText = "일요일";
  const dateKey = useMemo(() => toDateKey(new Date()), []);

  const todayDrinks = [
    { name: "물", servingsText: "5잔" },
    { name: "아이스 아메리카노", servingsText: "2잔" },
    { name: "오렌지 주스", servingsText: "1잔" },
  ];

  const cards: SummaryCard[] = [
    { label: "수분", value: "1,000mL", status: "조금 부족", variant: "water" },
    {
      label: "카페인",
      value: "100mg",
      status: "조금 많음",
      variant: "caffeine",
    },
    { label: "당류", value: "30g", status: "적절", variant: "sugar" },
  ];

  const [todayIconKey, setTodayIconKey] = useState<IconKey>("default");
  const [todayOneLine, setTodayOneLine] = useState("");
  const [topIconKey, setTopIconKey] = useState<IconKey | null>(null);

  const [iconPickerOpen, setIconPickerOpen] = useState(false);

  const [loadingSummary, setLoadingSummary] = useState(true);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const getSummaryRef = () => {
    const user = auth.currentUser;
    if (!user) return null;
    return doc(db, "users", user.uid, "dailySummaries", dateKey);
  };

  /** 1) 홈 진입 시 : summary 불러오기 */
  useEffect(() => {
    const run = async () => {
      const user = auth.currentUser;
      if (!user) {
        setLoadingSummary(false);
        return;
      }

      try {
        const ref = getSummaryRef();
        if (!ref) return;

        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data() as any;

          const overrideIconKey = data.overrideIconKey as IconKey | undefined;
          const topIconKeyFromDb = data.topIconKey as IconKey | undefined;

          setTodayIconKey(overrideIconKey ?? topIconKeyFromDb ?? "default");
          setTodayOneLine(data.oneLine ?? "");
        } else {
          await setDoc(
            ref,
            {
              dateKey,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            },
            { merge: true },
          );
        }
      } catch (e: any) {
        Toast.show({ type: "error", text1: "데이터 불러오기 실패" });
      } finally {
        setLoadingSummary(false);
      }
    };

    run();

    // 언마운트 시 타이머 정리
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  /** 공통 저장 함수 */
  const saveSummary = async (
    patch: Partial<{ oneLine: string }> & Record<string, any>,
  ) => {
    const ref = getSummaryRef();
    if (!ref) {
      Toast.show({ type: "error", text1: "로그인이 필요해요" });
      return;
    }

    const payload: any = {
      ...patch,
      updatedAt: serverTimestamp(),
    };

    await setDoc(ref, payload, { merge: true });
  };

  /** 2) 아이콘 선택: 즉시 저장 */
  const handleSelectIcon = async (key: IconKey) => {
    setTodayIconKey(key);
    setIconPickerOpen(false);

    try {
      await saveSummary({ overrideIconKey: key });
      Toast.show({ type: "success", text1: "대표 아이콘 변경 완료!" });
    } catch {
      Toast.show({ type: "error", text1: "아이콘 저장 실패" });
    }
  };

  /** 3) 아이콘 자동(기본)으로 되돌리기 */
  const handleResetIcon = async () => {
    setIconPickerOpen(false);

    setTodayIconKey(topIconKey ?? 'default');

    try {
      await saveSummary({ overrideIconKey: deleteField() });
      Toast.show({ type: "info", text1: "기본으로 되돌렸어요." });
    } catch {
      Toast.show({ type: "error", text1: "저장 실패" });
    }
  };

  /** 4) 오늘의 한 줄 : 디바운스 자동 저장 */
  const handleChangeOneLine = (text: string) => {
    setTodayOneLine(text);

    // 타이핑 중이면 이전 타이머 취소
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    saveTimerRef.current = setTimeout(async () => {
      try {
        await saveSummary({ oneLine: text.trim() });
      } catch (e) {
        Toast.show({ type: "error", text1: "오늘의 한 줄 저장 실패" });
      }
    }, 600);
  };

  /** 5) 제출 : 즉시 저장 + 타이머 취소 */
  const handleSubmitOneLine = async () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    try {
      await saveSummary({ oneLine: todayOneLine.trim() });
      Toast.show({ type: "success", text1: "오늘의 한 줄 저장 완료!" });
    } catch (e) {
      Toast.show({ type: "error", text1: "오늘의 한 줄 저장 실패" });
    }
  };

  const onPressWrite = () => {
    router.push("/record/create");
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
      >
        <View style={{ height: 30 }} />
        {/* 날짜 */}
        <View style={styles.sectionTop}>
          <Text style={styles.dateText}>
            {dateText} <Text style={styles.dayText}>{dayText}</Text>
          </Text>
        </View>
        {/* 오늘의 음료 목록 */}
        <Text style={styles.sectionTitle}>오늘 마신 음료</Text>
        <View style={styles.listCard}>
          {todayDrinks.map((d, idx) => (
            <Text key={`${d.name}-${idx}`} style={styles.bulletItem}>
              • {d.name} {d.servingsText}
            </Text>
          ))}
        </View>
        {/* 요약 타이틀 + 정보 */}
        <View style={styles.summaryHeaderRow}>
          <Text style={styles.summaryHeaderTitle}>
            오늘의 수분/카페인/당 섭취량
          </Text>
          <Pressable
            hitSlop={8}
            onPress={() => {
              // TODO : 툴팁으로 설명 띄우기
            }}
          >
            <Ionicons
              name="help-circle-outline"
              size={18}
              color={COLORS.semantic.textSecondary}
            />
          </Pressable>
        </View>
        {/* 수분/카페인/당 카드 */}
        <View style={styles.cardRow}>
          {cards.map((c) => (
            <View
              key={c.variant}
              style={[styles.miniCard, miniCardVariant(c.variant)]}
            >
              <Text style={styles.miniCardLabel}>{c.label}</Text>
              <Text style={styles.miniCardValue}>{c.value}</Text>
              <Text
                style={[
                  styles.miniCardStatus,
                  miniCardStatusVariant(c.variant),
                ]}
              >
                {c.status}
              </Text>
            </View>
          ))}
        </View>
        {/* 오늘의 요약 */}
        <Text style={styles.statusLine}>균형 잡힌 하루에요!</Text>
        {/* 오늘의 한줄 */}
        <TodayMemoCard
          icon={<DrinkIcon iconKey={todayIconKey} size={32} />}
          oneLine={todayOneLine}
          onPressIcon={() => setIconPickerOpen(true)}
          onChangeOneLine={handleChangeOneLine}
          onSubmitOneLine={handleSubmitOneLine}
        />
        <IconPickerModal
          visible={iconPickerOpen}
          selectedKey={todayIconKey}
          onSelect={handleSelectIcon}
          onClose={() => setIconPickerOpen(false)}
          onResetToDefault={handleResetIcon}
        />
        {/* CTA */}
        <AppButton
          label="+ 음료 기록하기"
          variant="primary"
          onPress={onPressWrite}
          style={styles.cta}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

export default HomeScreen;

/** variants */
function miniCardVariant(variant: "water" | "caffeine" | "sugar") {
  switch (variant) {
    case "water":
      return {
        borderColor: COLORS.status.low,
        backgroundColor: COLORS.ui.cardYellowBg,
      };
    case "caffeine":
      return {
        borderColor: COLORS.status.high,
        backgroundColor: COLORS.ui.cardRedBg,
      };
    case "sugar":
      return {
        borderColor: COLORS.status.balanced,
        backgroundColor: COLORS.ui.cardGreenBg,
      };
  }
}

function miniCardStatusVariant(variant: "water" | "caffeine" | "sugar") {
  switch (variant) {
    case "water":
      return { color: COLORS.status.low };
    case "caffeine":
      return { color: COLORS.status.high };
    case "sugar":
      return { color: COLORS.status.balanced };
  }
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.base.creamPaper,
  },
  container: {
    flexGrow: 1,
    paddingBottom: 16,
    backgroundColor: COLORS.base.creamPaper,
    paddingHorizontal: 20,
  },
  headerBg: {
    height: 90,
    width: "100%",
  },
  headerBgImg: {
    resizeMode: "cover",
  },
  sectionTop: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  dateText: {
    ...TYPOGRAPHY.preset.h2,
    color: COLORS.semantic.textPrimary,
  },
  dayText: {
    ...TYPOGRAPHY.preset.h3,
    color: COLORS.semantic.textPrimary,
  },
  sectionTitle: {
    ...TYPOGRAPHY.preset.h3,
    color: COLORS.semantic.textPrimary,
    paddingHorizontal: 20,
    marginTop: 18,
    marginBottom: 10,
  },
  listCard: {
    marginHorizontal: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.ui.border,
    backgroundColor: COLORS.semantic.surface,
  },
  bulletItem: {
    ...TYPOGRAPHY.preset.body,
    color: COLORS.semantic.textPrimary,
    lineHeight: 22,
  },
  summaryHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginTop: 18,
    marginBottom: 10,
  },
  summaryHeaderTitle: {
    ...TYPOGRAPHY.preset.h3,
    color: COLORS.semantic.textPrimary,
    flexShrink: 1,
    marginRight: 8,
  },
  cardRow: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    marginTop: 6,
  },
  miniCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingVertical: 14,
    alignItems: "center",
  },
  miniCardLabel: {
    ...TYPOGRAPHY.preset.caption,
    color: COLORS.semantic.textPrimary,
    marginBottom: 6,
  },
  miniCardValue: {
    ...TYPOGRAPHY.preset.h3,
    color: COLORS.semantic.textPrimary,
    marginBottom: 6,
  },
  miniCardStatus: {
    ...TYPOGRAPHY.preset.caption,
  },
  statusLine: {
    ...TYPOGRAPHY.preset.caption,
    color: COLORS.semantic.textSecondary,
    textAlign: "center",
    marginTop: 10,
  },

  cta: {
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 20,
  },
});
