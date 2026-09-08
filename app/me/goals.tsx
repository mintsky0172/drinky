import {
  Pressable,
  StyleSheet,
  Text,
  View,
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from "react-native";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { DEFAULT_GOALS, updateUserGoals, UserGoals } from "@/src/lib/user";
import { useRouter } from "expo-router";
import { useAuth } from "@/src/providers/AuthProvider";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/src/lib/firebase";
import Toast from "react-native-toast-message";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  getGuestGoals,
  saveGuestGoals,
} from "@/src/features/entries/repositories/guestGoalsRepository";

import AppButton from "@/src/components/ui/AppButton";
import AppText from "@/src/components/ui/AppText";
import { COLORS } from "@/src/constants/colors";
import { TYPOGRAPHY } from "@/src/constants/typography";

const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));
const toInt = (s: string) => {
  const n = parseInt((s ?? "").replace(/[^\d]/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
};
const RECOMMENDED_GOALS: UserGoals = {
  waterMl: 1500,
  caffeineMg: 400,
  sugarG: 50,
  calorieKcal: 500,
};

const GoalSettingsScreen = () => {
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const slideOffset = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => setKeyboardVisible(true));
    const hide = Keyboard.addListener("keyboardDidHide", () => setKeyboardVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // 입력은 문자열로 들고, 저장할 때 숫자로 변환
  const [waterText, setWaterText] = useState(String(DEFAULT_GOALS.waterMl));
  const [caffeineText, setCaffeineText] = useState(
    String(DEFAULT_GOALS.caffeineMg),
  );
  const [sugarText, setSugarText] = useState(String(DEFAULT_GOALS.sugarG));
  const [calorieText, setCalorieText] = useState(
    String(DEFAULT_GOALS.calorieKcal),
  );

  React.useEffect(() => {
    const run = async () => {
      try {
        if (!user) {
          const guestGoals = await getGuestGoals();
          setWaterText(String(guestGoals.waterMl));
          setCaffeineText(String(guestGoals.caffeineMg));
          setSugarText(String(guestGoals.sugarG));
          setCalorieText(String(guestGoals.calorieKcal));
          return;
        }

        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);
        const g = (snap.data()?.goals ?? {}) as Partial<UserGoals>;
        setWaterText(String(g.waterMl ?? DEFAULT_GOALS.waterMl));
        setCaffeineText(String(g.caffeineMg ?? DEFAULT_GOALS.caffeineMg));
        setSugarText(String(g.sugarG ?? DEFAULT_GOALS.sugarG));
        setCalorieText(String(g.calorieKcal ?? DEFAULT_GOALS.calorieKcal));
      } catch {
        // 불러오기 실패해도 기본값으로 진행
      }
    };
    run();
  }, [user]);

  const parsed = useMemo(() => {
    const waterMl = clamp(toInt(waterText), 0, 6000);
    const caffeineMg = clamp(toInt(caffeineText), 0, 800);
    const sugarG = clamp(toInt(sugarText), 0, 200);
    const calorieKcal = clamp(toInt(calorieText), 0, 5000);
    return { waterMl, caffeineMg, sugarG, calorieKcal };
  }, [calorieText, waterText, caffeineText, sugarText]);

  const handleQuickPick = useCallback((key: keyof UserGoals, value: number) => {
    if (key === "waterMl") setWaterText(String(value));
    if (key === "caffeineMg") setCaffeineText(String(value));
    if (key === "sugarG") setSugarText(String(value));
    if (key === "calorieKcal") setCalorieText(String(value));
  }, []);

  const handleReset = useCallback(() => {
    setWaterText(String(DEFAULT_GOALS.waterMl));
    setCaffeineText(String(DEFAULT_GOALS.caffeineMg));
    setSugarText(String(DEFAULT_GOALS.sugarG));
    setCalorieText(String(DEFAULT_GOALS.calorieKcal));
  }, []);

  const handleUseRecommendedGoals = useCallback(() => {
    setWaterText(String(RECOMMENDED_GOALS.waterMl));
    setCaffeineText(String(RECOMMENDED_GOALS.caffeineMg));
    setSugarText(String(RECOMMENDED_GOALS.sugarG));
    setCalorieText(String(RECOMMENDED_GOALS.calorieKcal));
    Toast.show({
      type: "info",
      text1: "추천 목표를 입력했어요",
      text2: "저장하기를 누르면 적용돼요.",
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (parsed.waterMl === 0) {
      Toast.show({
        type: "info",
        text1: "수분 목표가 0이에요. 괜찮다면 저장할게요!",
      });
    }

    setLoading(true);
    try {
      if (user) {
        await updateUserGoals(user.uid, parsed);
      } else {
        await saveGuestGoals(parsed);
      }
      Toast.show({ type: "success", text1: "목표를 저장했어요!" });
      router.back();
    } catch {
      Toast.show({ type: "error", text1: "저장에 실패했어요" });
    } finally {
      setLoading(false);
    }
  }, [user, parsed, router]);

  const slides = [
    { key: "waterMl", title: "수분", unit: "mL", value: waterText, setValue: setWaterText, picks: [1500, 2000, 2500], hint: "수분은 순수 물 및 일부 차 종류만 계산돼요." },
    { key: "caffeineMg", title: "카페인", unit: "mg", value: caffeineText, setValue: setCaffeineText, picks: [200, 300, 400], hint: "하루에 섭취할 카페인의 한도를 설정해 주세요." },
    { key: "sugarG", title: "당류", unit: "g", value: sugarText, setValue: setSugarText, picks: [25, 50, 75], hint: "음료로 섭취할 하루 당류의 한도를 설정해 주세요." },
    { key: "calorieKcal", title: "열량", unit: "kcal", value: calorieText, setValue: setCalorieText, picks: [500, 1000, 1500], hint: "음료로 섭취할 하루 열량의 한도를 설정해 주세요." },
  ] satisfies { key: keyof UserGoals; title: string; unit: string; value: string; setValue: (value: string) => void; picks: number[]; hint: string }[];
  const slide = slides[page];

  const movePage = (direction: number) => {
    const nextPage = page + direction;
    if (nextPage < 0 || nextPage >= slides.length) return;
    Keyboard.dismiss();
    slideOffset.stopAnimation();
    slideOffset.setValue(direction * 32);
    setPage(nextPage);
    Animated.timing(slideOffset, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
      isInteraction: false,
    }).start();
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={[styles.container, keyboardVisible && styles.keyboardContainer]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={keyboardVisible ? styles.hidden : undefined}>
        <AppText preset="h1">목표 설정</AppText>
        <Text style={styles.sub}>
          항목별 하루 목표를 설정해 주세요.
        </Text>

        {!user ? (
          <View style={styles.guestNoticeBox}>
            <Text style={styles.guestNoticeText}>
              비회원 목표는 이 기기에만 저장되며, 앱 삭제 시 사라질 수 있어요.
            </Text>
          </View>
        ) : null}

        <Pressable
          style={({ pressed }) => [
            styles.recommendedCard,
            pressed && styles.recommendedCardPressed,
            loading && styles.recommendedCardDisabled,
          ]}
          onPress={handleUseRecommendedGoals}
          disabled={loading}
          accessibilityRole="button"
        >
          <View style={styles.recommendedHeader}>
            <View>
              <Text style={styles.recommendedTitle}>추천 목표로 설정하기</Text>
            </View>
            <Ionicons name="refresh-outline" size={20} color={COLORS.primary.caramel} />
          </View>
          <View style={styles.recommendedValues}>
            {slides.map((item) => (
              <RecommendedGoalValue key={item.key} label={item.title} value={`${RECOMMENDED_GOALS[item.key]}${item.unit}`} />
            ))}
          </View>
        </Pressable>
        </View>

        <View style={styles.slideArea}>
          <Animated.View style={[styles.card, { transform: [{ translateX: slideOffset }] }]}>
            <Text style={styles.cardTitle}>{slide.title}({slide.unit})</Text>
            <Text style={styles.cardHint}>{slide.hint}</Text>
            <View style={styles.quickRow}>
              {slide.picks.map((value) => (
                <QuickChip
                  key={`${slide.key}-${value}`}
                  label={`${value}${slide.unit}`}
                  onPress={() => handleQuickPick(slide.key, value)}
                />
              ))}
            </View>
            <LabeledInput
              key={slide.key}
              label={`${slide.title} 직접 입력`}
              value={slide.value}
              onChangeText={slide.setValue}
              suffix={slide.unit}
            />
          </Animated.View>
          <View style={styles.navigation}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="이전 목표"
              disabled={page === 0}
              style={[styles.arrowButton, page === 0 && styles.arrowDisabled]}
              onPress={() => movePage(-1)}
            >
              <Ionicons name="chevron-back" size={24} color={COLORS.semantic.textPrimary} />
            </Pressable>
            <Text style={styles.pageLabel} accessibilityLiveRegion="polite">
              {slide.title} · {page + 1} / {slides.length}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="다음 목표"
              disabled={page === slides.length - 1}
              style={[styles.arrowButton, page === slides.length - 1 && styles.arrowDisabled]}
              onPress={() => movePage(1)}
            >
              <Ionicons name="chevron-forward" size={24} color={COLORS.semantic.textPrimary} />
            </Pressable>
          </View>
        </View>
        <View style={styles.actions}>
        <AppButton
          label="저장하기"
          variant="primary"
          onPress={handleSave}
          disabled={loading}
        />
        <View style={{ height: 10 }} />
        <AppButton
          label="기본값으로 되돌리기"
          variant="secondary"
          onPress={handleReset}
          disabled={loading}
        />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default GoalSettingsScreen;

function QuickChip({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.chip} hitSlop={8}>
      <Text style={styles.chipText}>{label}</Text>
    </Pressable>
  );
}

function RecommendedGoalValue({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.recommendedValuePill}>
      <Text style={styles.recommendedValueLabel}>{label}</Text>
      <Text style={styles.recommendedValueText}>{value}</Text>
    </View>
  );
}

function LabeledInput({
  label,
  value,
  onChangeText,
  suffix,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  suffix: string;
}) {
  return (
    <View style={{ marginTop: 12 }}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          accessibilityLabel={label}
          value={value}
          onChangeText={onChangeText}
          keyboardType="number-pad"
          placeholder="0"
          placeholderTextColor={COLORS.semantic.textSecondary}
          style={[styles.inputText, styles.input]}
        />
        <Text style={[styles.inputText, styles.suffix]}>{suffix}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hidden: { display: "none" },
  safe: { flex: 1, backgroundColor: "transparent" },
  container: {
    flex: 1,
    paddingTop: 70,
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: "transparent",
  },
  slideArea: { flexGrow: 1, justifyContent: "flex-start" },
  keyboardContainer: { paddingTop: 12 },
  navigation: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 12,
  },
  arrowButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    backgroundColor: COLORS.base.creamPaper,
    borderWidth: 1,
    borderColor: COLORS.ui.border,
  },
  arrowDisabled: { opacity: 0.3 },
  pageLabel: { ...TYPOGRAPHY.preset.caption, color: COLORS.semantic.textSecondary },
  actions: { paddingTop: 4 },
  sub: {
    ...TYPOGRAPHY.preset.body,
    color: COLORS.semantic.textSecondary,
    marginTop: 6,
    marginBottom: 14,
  },

  card: {
    backgroundColor: COLORS.semantic.surfaceAlt,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.ui.border,
    marginTop: 12,
  },
  guestNoticeBox: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.ui.border,
    backgroundColor: COLORS.base.white,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 4,
    marginBottom: 8,
  },
  guestNoticeText: {
    ...TYPOGRAPHY.preset.caption,
    color: COLORS.semantic.textSecondary,
    lineHeight: 20,
  },
  recommendedCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.primary.caramel,
    backgroundColor: COLORS.base.creamPaper,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginTop: 8,
  },
  recommendedCardPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  recommendedCardDisabled: {
    opacity: 0.55,
  },
  recommendedHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  recommendedTitle: {
    ...TYPOGRAPHY.preset.h3,
    color: COLORS.semantic.textPrimary,
  },
  recommendedValues: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  recommendedValuePill: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: COLORS.semantic.surface,
    borderWidth: 1,
    borderColor: COLORS.ui.border,
    paddingVertical: 9,
    alignItems: "center",
  },
  recommendedValueLabel: {
    ...TYPOGRAPHY.preset.caption,
    color: COLORS.semantic.textSecondary,
    marginBottom: 2,
  },
  recommendedValueText: {
    ...TYPOGRAPHY.preset.caption,
    color: COLORS.semantic.textPrimary,
  },
  cardTitle: { ...TYPOGRAPHY.preset.h3, color: COLORS.semantic.textPrimary },
  cardHint: {
    ...TYPOGRAPHY.preset.caption,
    color: COLORS.semantic.textSecondary,
    marginTop: 4,
  },

  quickRow: { flexDirection: "row", gap: 8, marginTop: 10, flexWrap: "wrap" },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.ui.border,
    backgroundColor: COLORS.base.creamPaper,
  },
  chipText: {
    ...TYPOGRAPHY.preset.caption,
    color: COLORS.semantic.textPrimary,
  },

  inputLabel: {
    ...TYPOGRAPHY.preset.caption,
    color: COLORS.semantic.textSecondary,
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.ui.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.semantic.surface,
  },
  inputText: {
    fontFamily: TYPOGRAPHY.preset.body.fontFamily,
    fontSize: TYPOGRAPHY.preset.body.fontSize,
    letterSpacing: TYPOGRAPHY.preset.body.letterSpacing,
    includeFontPadding: false,
    textAlignVertical: "center",
    padding: 0,
  },
  input: {
    flex: 1,
    color: COLORS.semantic.textPrimary,
  },
  suffix: {
    color: COLORS.semantic.textSecondary,
    marginLeft: 8,
  },
});
