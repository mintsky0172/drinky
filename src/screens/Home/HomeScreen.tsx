import {
  Alert,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
  ScrollView,
  Image,
  Modal,
  Platform,
} from "react-native";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ConfettiCannon from "react-native-confetti-cannon";
import * as StoreReview from "expo-store-review";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { COLORS } from "@/src/constants/colors";
import { TYPOGRAPHY } from "@/src/constants/typography";
import AppButton from "@/src/components/ui/AppButton";
import TodayMemoCard from "@/src/components/home/TodayMemoCard";
import { INGREDIENT_ICONS, IngredientIconKey } from "@/src/constants/icons";
import Toast from "react-native-toast-message";
import IconPickerModal from "@/src/components/home/IconPickerModal";
import {
  collection,
  doc,
  query,
  serverTimestamp,
  setDoc,
  deleteField,
  where,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/src/lib/firebase";
import { addDays, toDateKey, toKoreanDateLabel } from "@/src/lib/dateKey";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useAuth } from "@/src/providers/AuthProvider";
import IngredientIcon from "@/src/components/common/IngredientIcon";
import AppText from "@/src/components/ui/AppText";

type SummaryCard = {
  label: "수분💧" | "카페인☕️" | "당류🍭";
  value: string;
  status: VariantLevelLabel;
  variant: "water" | "caffeine" | "sugar";
};

type TodayDrinkItem = {
  name: string;
  servingsText: string;
};

type SummaryTotals = {
  waterMl: number;
  caffeineMg: number;
  sugarG: number;
};

const DEFAULT_GOALS = {
  waterMl: 2000,
  caffeineMg: 300,
  sugarG: 50,
};

const REVIEW_PROMPT_LAST_SHOWN_KEY = "reviewPrompt:lastShownDate";
const REVIEW_PROMPT_RANDOM_THRESHOLD = 0.25;

const balancedMessages = [
  "균형 잡힌 하루에요!",
  "오늘 컨디션 좋아 보여요.",
  "딱 좋게 잘 마셨어요.",
  "부담 없이 깔끔한 하루였어요.",
];

const NUTRITION_TOOLTIP_TEXT =
  "수분은 순수 물 및 일부 차 종류로만 계산되며, 카페인과 당은 기록한 음료의 일반적인 레시피 기준으로 합산돼요. 목표 수치는 마이페이지에서 바꿀 수 있어요.\n\n* 수분과 달리 카페인과 당류는 부족해도 괜찮아요.\n* 수분 섭취로 인정되는 차 : 보리차, 루이보스 차, 히비스커스 차, 비트차, 현미차, 옥수수차";

type VariantLevelLabel = "조금 적음" | "적절" | "조금 많음";

function scoreForIcon(entry: { isWaterOnly?: boolean; totalMl?: number }) {
  const base = Number(entry.totalMl ?? 0);
  const weight = entry.isWaterOnly ? 0.7 : 1;
  return base * weight;
}

function normalizeIngredientIconKey(raw: unknown): IngredientIconKey {
  if (typeof raw !== "string") return "default";
  const key = raw.trim().toLowerCase();

  const aliasMap: Record<string, IngredientIconKey> = {
    bean: "coffee",
    beans: "coffee",
    coffee_bean: "coffee",
    matcha: "leaf",
    tea_leaf: "leaf",
  };

  const mapped = aliasMap[key] ?? key;
  return mapped in INGREDIENT_ICONS ? (mapped as IngredientIconKey) : "default";
}

function inferIngredientIconFromEntry(entry: {
  iconKey?: unknown;
  calendarIconKey?: unknown;
  drinkName?: unknown;
  isWaterOnly?: unknown;
}): IngredientIconKey {
  const normalized = normalizeIngredientIconKey(
    entry.iconKey ?? entry.calendarIconKey,
  );
  if (normalized !== "default") return normalized;

  if (Boolean(entry.isWaterOnly)) return "water";

  const name =
    typeof entry.drinkName === "string" ? entry.drinkName.toLowerCase() : "";

  if (name.includes("물")) return "water";
  if (
    name.includes("커피") ||
    name.includes("라떼") ||
    name.includes("아메리카노") ||
    name.includes("에스프레소")
  ) {
    return "coffee";
  }
  if (name.includes("말차") || name.includes("녹차") || name.includes("차")) {
    return "leaf";
  }
  if (name.includes("딸기") || name.includes("berry")) {
    return "strawberry";
  }

  return "default";
}

function getLevelWater(value: number, goal: number): VariantLevelLabel {
  if (value <= 0) return "조금 적음"; // water 0은 무조건 부족
  if (!goal || goal <= 0) return "적절";
  const ratio = value / goal;
  if (ratio < 0.8) return "조금 적음";
  return "적절";
}

function getLevelOptional(value: number, goal: number): VariantLevelLabel {
  if (value <= 0) return "적절"; // caffeine, sugar는 0이어도 괜찮음
  if (!goal || goal <= 0) return "적절";
  const ratio = value / goal;
  if (ratio > 1.2) return "조금 많음";
  return "적절";
}

function pickSummaryText(levels: {
  water: VariantLevelLabel;
  caffeine: VariantLevelLabel;
  sugar: VariantLevelLabel;
}) {
  const { water: w, caffeine: c, sugar: s } = levels;

  // 완전 균형
  if (w === "적절" && c === "적절" && s === "적절") {
    return "균형 잡힌 하루에요!";
  }

  // 가장 우선순위 높은 경고 : 카페인/당 높을 때
  if (c === "조금 많음" && s === "조금 많음")
    return "오늘은 자극이 좀 강했어요. 물을 좀 더 마시는 건 어때요?";
  if (c === "조금 많음")
    return "오늘은 카페인이 조금 많았어요. 다음 음료는 디카페인 어때요?";
  if (s === "조금 많음")
    return "오늘은 당이 조금 많았어요. 다음 음료는 덜 달게 어때요?";

  // 수분 부족
  if (w === "조금 적음") return "오늘은 물이 조금 부족해요. 한 잔만 더!";

  // 나머지
  return balancedMessages[Math.floor(Math.random() * balancedMessages.length)];
}

const HomeScreen = () => {
  const router = useRouter();
  const { user, initializing } = useAuth();
  const { width, height } = Dimensions.get("window");

  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const todayKey = useMemo(() => toDateKey(selectedDate), [selectedDate]);
  const todayLabel = useMemo(
    () => toKoreanDateLabel(selectedDate),
    [selectedDate],
  );
  const todayWeekday = useMemo(
    () =>
      new Intl.DateTimeFormat("ko-KR", { weekday: "long" }).format(
        selectedDate,
      ),
    [selectedDate],
  );
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const calendar = require("@/assets/tabs/calendar_inactive.png");

  const [todayDrinks, setTodayDrinks] = useState<TodayDrinkItem[]>([]);
  const [totals, setTotals] = useState<SummaryTotals>({
    waterMl: 0,
    caffeineMg: 0,
    sugarG: 0,
  });

  const [goals, setGoals] = useState(DEFAULT_GOALS);

  const [nutritionToolTipOpen, setNutritionToolTipOpen] = useState(false);

  const cards: SummaryCard[] = useMemo(
    () => [
      {
        label: "수분💧",
        value: `${totals.waterMl.toLocaleString()}mL`,
        status: getLevelWater(totals.waterMl, goals.waterMl),
        variant: "water",
      },
      {
        label: "카페인☕️",
        value: `${totals.caffeineMg.toLocaleString()}mg`,
        status: getLevelOptional(totals.caffeineMg, goals.caffeineMg),
        variant: "caffeine",
      },
      {
        label: "당류🍭",
        value: `${totals.sugarG.toLocaleString()}g`,
        status: getLevelOptional(totals.sugarG, goals.sugarG),
        variant: "sugar",
      },
    ],
    [goals, totals],
  );

  const isBalanced = useMemo(() => {
    const waterLevel = getLevelWater(totals.waterMl, goals.waterMl);
    const caffeineLevel = getLevelOptional(totals.caffeineMg, goals.caffeineMg);
    const sugarLevel = getLevelOptional(totals.sugarG, goals.sugarG);

    return (
      waterLevel === "적절" && caffeineLevel === "적절" && sugarLevel === "적절"
    );
  }, [totals, goals]);

  const [todayOneLine, setTodayOneLine] = useState("");
  const [goalsAchieved, setGoalsAchieved] = useState(false);
  const [hasSeenGoalConfettiToday, setHasSeenGoalConfettiToday] =
    useState(false);
  const [topIconKey, setTopIconKey] = useState<IngredientIconKey | null>(null);
  const [overrideIconKey, setOverrideIconKey] =
    useState<IngredientIconKey | null>(null);
  const todayIconKey = useMemo<IngredientIconKey>(
    () => overrideIconKey ?? topIconKey ?? "default",
    [overrideIconKey, topIconKey],
  );
  const [showConfetti, setShowConfetti] = useState(false);
  const [reviewPromptOpen, setReviewPromptOpen] = useState(false);

  const summaryText = useMemo(
    () =>
      pickSummaryText({
        water: getLevelWater(totals.waterMl, goals.waterMl),
        caffeine: getLevelOptional(totals.caffeineMg, goals.caffeineMg),
        sugar: getLevelOptional(totals.sugarG, goals.sugarG),
      }),
    [totals, goals],
  );

  const [iconPickerOpen, setIconPickerOpen] = useState(false);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const reviewPromptCheckedDateRef = useRef<string | null>(null);

  const getSummaryRef = useCallback(() => {
    if (!user) return null;
    return doc(db, "users", user.uid, "dailySummaries", todayKey);
  }, [todayKey, user]);

  // 날짜 갱신
  useFocusEffect(useCallback(() => {}, []));

  // 자정 넘어가면 다음날로 갱신
  useEffect(() => {
    const id = setInterval(() => {
      const now = new Date();
      if (toDateKey(selectedDate) !== toDateKey(now)) {
        setSelectedDate(now);
      }
    }, 60 * 1000);
    return () => clearInterval(id);
  }, [selectedDate]);

  /** 1) 홈 진입 시 : summary 불러오기 */
  useEffect(() => {
    if (initializing) return;

    // 로그인 전 상태
    if (!user) {
      setTodayDrinks([]);
      setTotals({ waterMl: 0, caffeineMg: 0, sugarG: 0 });
      setGoals(DEFAULT_GOALS);
      setTopIconKey(null);
      setTodayOneLine("");
      setOverrideIconKey(null);
      setGoalsAchieved(false);
      setHasSeenGoalConfettiToday(false);
      return;
    }

    const uid = user.uid;

    const userRef = doc(db, "users", uid);
    const summaryRef = doc(db, "users", uid, "dailySummaries", todayKey);
    const entriesRef = collection(db, "users", uid, "entries");
    const entriesQ = query(entriesRef, where("dateKey", "==", todayKey));

    // 1) goals 구독
    const unsubUser = onSnapshot(
      userRef,
      (snap) => {
        const userData = snap.data() as
          | { goals?: { waterMl?: number; caffeineMg?: number; sugarG?: number } }
          | undefined;

        const userGoals = userData?.goals as
          | { waterMl?: number; caffeineMg?: number; sugarG?: number }
          | undefined;

        setGoals({
          waterMl: userGoals?.waterMl ?? DEFAULT_GOALS.waterMl,
          caffeineMg: userGoals?.caffeineMg ?? DEFAULT_GOALS.caffeineMg,
          sugarG: userGoals?.sugarG ?? DEFAULT_GOALS.sugarG,
        });
      },
      () => {
        // goals 실패해도 기본값 유지
        setGoals(DEFAULT_GOALS);
      },
    );

    // 2) summary (오늘의 한 줄/overrideIcon) 구독
    const unsubSummary = onSnapshot(
      summaryRef,
      async (snap) => {
        if (snap.exists()) {
          const data = snap.data() as any;
          setTodayOneLine(data.oneLine ?? "");
          setGoalsAchieved(Boolean(data.goalsAchieved));
          setHasSeenGoalConfettiToday(Boolean(data.confettiShown));
          const overrideRaw = data.overrideIconKey;
          setOverrideIconKey(
            overrideRaw == null
              ? null
              : normalizeIngredientIconKey(overrideRaw),
          );
        } else {
          setOverrideIconKey(null);
          setTodayOneLine("");
          setGoalsAchieved(false);
          setHasSeenGoalConfettiToday(false);

          // 문서 없으면 생성(메모 저장용으로만)
          await setDoc(
            summaryRef,
            {
              dateKey: todayKey,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            },
            { merge: true },
          );
        }
      },
      () => {
        // 실패하면 그냥 빈 값
        setOverrideIconKey(null);
        setTodayOneLine("");
        setGoalsAchieved(false);
        setHasSeenGoalConfettiToday(false);
      },
    );

    // 3) entries 구독 -> totals, todayDrinks, topIconKey 계산
    const unsubEntries = onSnapshot(
      entriesQ,
      (snap) => {
        const dailyEntryDocs = snap.docs;

        // 음료별 합치기
        const byDrink = new Map<
          string,
          {
            name: string;
            unit: "cup" | "ml";
            servings: number;
            totalMl: number;
          }
        >();

        let nextTotals: SummaryTotals = {
          waterMl: 0,
          caffeineMg: 0,
          sugarG: 0,
        };
        const iconScores = new Map<IngredientIconKey, number>();

        dailyEntryDocs.forEach((entryDoc) => {
          const e = entryDoc.data() as any;

          const name = (e.drinkName as string) ?? "알 수 없는 음료";
          const unit = (e.unit as "cup" | "ml") ?? "cup";
          const servings = Number(e.servings ?? 0);
          const totalMl = Number(e.totalMl ?? 0);

          const key = `${name}::${unit}`;
          const prev = byDrink.get(key);

          byDrink.set(key, {
            name,
            unit,
            servings: (prev?.servings ?? 0) + servings,
            totalMl: (prev?.totalMl ?? 0) + totalMl,
          });

          // waterMl은 isWaterOnly + totalMl로 계산
          nextTotals = {
            waterMl: nextTotals.waterMl + (e.isWaterOnly ? totalMl : 0),
            caffeineMg: nextTotals.caffeineMg + Number(e.totalCaffeineMg ?? 0),
            sugarG: nextTotals.sugarG + Number(e.totalSugarG ?? 0),
          };

          // entries 스키마는 iconKey를 사용하고, 과거 데이터 호환을 위해 calendarIconKey도 fallback 처리
          const iconKey = inferIngredientIconFromEntry(e);
          const prevIconScore = iconScores.get(iconKey) ?? 0;
          iconScores.set(iconKey, prevIconScore + scoreForIcon(e));
        });

        setTotals({
          waterMl: Math.max(0, Math.round(nextTotals.waterMl)),
          caffeineMg: Math.max(0, Math.round(nextTotals.caffeineMg)),
          sugarG: Math.max(0, Math.round(nextTotals.sugarG)),
        });

        setTodayDrinks(
          Array.from(byDrink.values()).map((d) => ({
            name: d.name,
            servingsText:
              d.unit === "cup"
                ? `${Math.round(d.servings)}잔`
                : `${Math.round(d.totalMl)}mL`,
          })),
        );

        // topIconKey 계산
        let nextTopIconKey: IngredientIconKey | null = null;
        let nextTopIconScore = -1;
        iconScores.forEach((score, key) => {
          if (score > nextTopIconScore) {
            nextTopIconScore = score;
            nextTopIconKey = key;
          }
        });
        setTopIconKey(nextTopIconKey);
      },
      () => {
        // entries 구독 실패 시 초기화
        setTodayDrinks([]);
        setTotals({ waterMl: 0, caffeineMg: 0, sugarG: 0 });
        setTopIconKey(null);
      },
    );

    // 언마운트 시 구독 해제 + 타이머 정리
    return () => {
      unsubUser();
      unsubSummary();
      unsubEntries();
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [todayKey, user, initializing]);

  useEffect(() => {
    setGoalsAchieved(isBalanced);
  }, [isBalanced]);

  /** 공통 저장 함수 */
  const saveSummary = useCallback(
    async (patch: Partial<{ oneLine: string }> & Record<string, any>) => {
      const ref = getSummaryRef();
      if (!ref) {
        throw new Error("로그인이 필요해요");
      }

      const payload: any = {
        dateKey: todayKey,
        ...patch,
        updatedAt: serverTimestamp(),
      };

      await setDoc(ref, payload, { merge: true });
    },
    [getSummaryRef, todayKey],
  );

  useEffect(() => {
    if (!isBalanced || !goalsAchieved || hasSeenGoalConfettiToday) {
      setShowConfetti(false);
      return;
    }

    setShowConfetti(true);
    setHasSeenGoalConfettiToday(true);
    void saveSummary({
      confettiShown: true,
    });

    const timer = setTimeout(() => setShowConfetti(false), 2400);
    return () => clearTimeout(timer);
  }, [hasSeenGoalConfettiToday, isBalanced, goalsAchieved, saveSummary]);

  useEffect(() => {
    const checkReviewPrompt = async () => {
      if (initializing || !user) return;
      if (reviewPromptOpen) return;
      if (todayKey !== toDateKey(new Date())) return;
      if (todayDrinks.length === 0) return;
      if (reviewPromptCheckedDateRef.current === todayKey) return;

      reviewPromptCheckedDateRef.current = todayKey;

      const hasReviewAction = await StoreReview.hasAction();
      if (!hasReviewAction) return;

      const lastShownDate = await AsyncStorage.getItem(
        REVIEW_PROMPT_LAST_SHOWN_KEY,
      );
      if (lastShownDate === todayKey) return;

      if (Math.random() >= REVIEW_PROMPT_RANDOM_THRESHOLD) return;

      await AsyncStorage.setItem(REVIEW_PROMPT_LAST_SHOWN_KEY, todayKey);
      setReviewPromptOpen(true);
    };

    void checkReviewPrompt();
  }, [initializing, reviewPromptOpen, todayDrinks.length, todayKey, user]);

  const handleCloseReviewPrompt = useCallback(() => {
    setReviewPromptOpen(false);
  }, []);

  const handlePressReview = useCallback(async () => {
    setReviewPromptOpen(false);

    try {
      await StoreReview.requestReview();
    } catch {
      Toast.show({
        type: "info",
        text1: "리뷰 요청을 열 수 없어요.",
      });
    }
  }, []);

  /** 2) 아이콘 선택: 즉시 저장 */
  const handleSelectIcon = async (key: IngredientIconKey) => {
    setIconPickerOpen(false);
    setOverrideIconKey(key);

    try {
      await saveSummary({ overrideIconKey: key });
      Toast.show({ type: "success", text1: "대표 아이콘 변경 완료!" });
    } catch (e: any) {
      Toast.show({
        type: "error",
        text1: "아이콘 저장 실패",
        text2: String(e?.message ?? e),
      });
      Alert.alert("아이콘 저장 실패", String(e?.message ?? e));
    }
  };

  /** 3) 아이콘 자동(기본)으로 되돌리기 */
  const handleResetIcon = async () => {
    setIconPickerOpen(false);

    setOverrideIconKey(null);

    try {
      await saveSummary({ overrideIconKey: deleteField() });
      Toast.show({ type: "info", text1: "기본으로 되돌렸어요." });
    } catch (e: any) {
      Toast.show({
        type: "error",
        text1: "저장 실패",
        text2: String(e?.message ?? e),
      });
      Alert.alert("저장 실패", String(e?.message ?? e));
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
      } catch {
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
    } catch {
      Toast.show({ type: "error", text1: "오늘의 한 줄 저장 실패" });
    }
  };

  const onPressWrite = () => {
    router.push({
      pathname: "/record/create",
      params: { date: todayKey },
    });
  };

  const handleFocusOneLine = () => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 120);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {showConfetti ? (
        <View pointerEvents="none" style={styles.confettiOverlay}>
          <ConfettiCannon
            key={todayKey}
            count={120}
            origin={{ x: width / 2, y: height / 2 - 80 }}
            explosionSpeed={250}
            fallSpeed={3800}
            fadeOut
          />
          <View style={styles.confettiModal}>
            <AppText preset="body">하루 목표를 달성했어요. 축하드려요!</AppText>
          </View>
        </View>
      ) : null}
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
        onTouchStart={() => {
          if (nutritionToolTipOpen) setNutritionToolTipOpen(false);
        }}
      >
        {/* 날짜 */}
        <Pressable
          style={styles.calendar}
          onPress={() => setDatePickerOpen(true)}
          hitSlop={10}
        >
          <Image source={calendar} style={styles.calendarIcon} />
        </Pressable>
        <View style={styles.sectionTop}>
          <View style={styles.dateBar}>
            <Pressable
              style={styles.iconBtn}
              onPress={() => setSelectedDate((d) => addDays(d, -1))}
              hitSlop={10}
            >
              <Ionicons
                name="chevron-back"
                size={18}
                color={COLORS.semantic.textPrimary}
              />
            </Pressable>
            <View style={styles.dateCenter}>
              <Text style={styles.dateText}>
                {todayLabel} <Text style={styles.dayText}>{todayWeekday}</Text>
              </Text>
            </View>
            <Pressable
              style={styles.iconBtn}
              onPress={() => setSelectedDate((d) => addDays(d, +1))}
              hitSlop={10}
            >
              <Ionicons
                name="chevron-forward"
                size={18}
                color={COLORS.semantic.textPrimary}
              />
            </Pressable>
          </View>
        </View>
        {/* 오늘의 음료 목록 */}
        <Text style={styles.sectionTitle}>오늘 마신 음료</Text>
        <View style={styles.listCard}>
          {todayDrinks.length ? (
            todayDrinks.map((d, idx) => (
              <Text key={`${d.name}-${idx}`} style={styles.bulletItem}>
                • {d.name} {d.servingsText}
              </Text>
            ))
          ) : (
            <Text style={styles.bulletItem}>• 아직 기록한 음료가 없어요</Text>
          )}
        </View>
        {/* 요약 타이틀 + 정보 */}
        <View style={styles.summaryHeaderRow}>
          <Text style={styles.summaryHeaderTitle}>
            오늘의 수분/카페인/당 섭취량
          </Text>

          <View style={styles.tooltipAnchor}>
            <Pressable
              hitSlop={8}
              onPress={() => {
                setNutritionToolTipOpen(true);
              }}
            >
              <Ionicons
                name="help-circle-outline"
                size={18}
                color={COLORS.semantic.textSecondary}
              />
            </Pressable>

            {nutritionToolTipOpen ? (
              <View style={styles.tooltipBubble}>
                <View style={styles.tooltipArrow} />

                <View style={styles.tooltipBubbleHeader}>
                  <AppText style={styles.tooltipBubbleTitle}>
                    수분/카페인/당 계산 기준
                  </AppText>

                  <Pressable
                    hitSlop={8}
                    onPress={() => setNutritionToolTipOpen(false)}
                  >
                    <Ionicons
                      name="close"
                      size={16}
                      color={COLORS.semantic.textPrimary}
                    />
                  </Pressable>
                </View>

                <AppText style={styles.tooltipBubbleText}>
                  {NUTRITION_TOOLTIP_TEXT}
                </AppText>
              </View>
            ) : null}
          </View>
        </View>
        {/* 수분/카페인/당 카드 */}
        <View style={styles.cardRow}>
          {cards.map((c) => (
            <View
              key={c.variant}
              style={[styles.miniCard, miniCardVariant(c.status)]}
            >
              <Text style={styles.miniCardLabel}>{c.label}</Text>
              <Text style={styles.miniCardValue}>{c.value}</Text>
              <Text
                style={[styles.miniCardStatus, miniCardStatusVariant(c.status)]}
              >
                {c.status}
              </Text>
            </View>
          ))}
        </View>
        {/* 오늘의 요약 */}
        <Text style={styles.statusLine}>{summaryText}</Text>
        {/* 오늘의 한줄 */}
        <TodayMemoCard
          icon={<IngredientIcon iconKey={todayIconKey} size={32} />}
          oneLine={todayOneLine}
          onPressIcon={() => setIconPickerOpen(true)}
          onChangeOneLine={handleChangeOneLine}
          onSubmitOneLine={handleSubmitOneLine}
          onFocusOneLine={handleFocusOneLine}
        />
        <IconPickerModal
          visible={iconPickerOpen}
          type="ingredient"
          selectedKey={todayIconKey}
          onSelect={handleSelectIcon}
          onClose={() => setIconPickerOpen(false)}
          onResetToDefault={handleResetIcon}
        />
        {datePickerOpen && Platform.OS === "ios" ? (
          <Modal
            transparent
            visible={datePickerOpen}
            animationType="fade"
            onRequestClose={() => setDatePickerOpen(false)}
          >
            <Pressable
              style={styles.modalOverlay}
              onPress={() => setDatePickerOpen(false)}
            />
            <View style={styles.pickerCard}>
              <Text style={styles.modalTitle}>날짜 선택</Text>
              <View style={styles.pickerWrap}>
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display="spinner"
                  style={styles.picker}
                  onChange={(_, pickedDate) => {
                    if (pickedDate) setSelectedDate(pickedDate);
                  }}
                />
              </View>
              <AppButton
                label="완료"
                variant="primary"
                onPress={() => setDatePickerOpen(false)}
              />
            </View>
          </Modal>
        ) : null}
        {datePickerOpen && Platform.OS !== "ios" ? (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="default"
            onChange={(_, pickedDate) => {
              setDatePickerOpen(false);
              if (pickedDate) setSelectedDate(pickedDate);
            }}
          />
        ) : null}
        <Modal
          transparent
          visible={reviewPromptOpen}
          animationType="fade"
          onRequestClose={handleCloseReviewPrompt}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={handleCloseReviewPrompt}
          />
          <View style={styles.reviewPromptCard}>
            <AppText style={styles.reviewPromptEyebrow}>
              REVIEW REQUEST
            </AppText>
            <AppText style={styles.reviewPromptTitle}>
              Drinky가 도움이 되고 있나요?
            </AppText>
            <AppText style={styles.reviewPromptDescription}>
              앱스토어에 리뷰를 남겨주시면 큰 도움이 돼요.
            </AppText>
            <View style={styles.reviewPromptActions}>
              <Pressable
                style={styles.reviewPromptSecondaryButton}
                onPress={handleCloseReviewPrompt}
              >
                <AppText style={styles.reviewPromptSecondaryLabel}>
                  다음에
                </AppText>
              </Pressable>
              <Pressable
                style={styles.reviewPromptPrimaryButton}
                onPress={handlePressReview}
              >
                <AppText style={styles.reviewPromptPrimaryLabel}>
                  리뷰 남기기
                </AppText>
              </Pressable>
            </View>
          </View>
        </Modal>

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
function miniCardVariant(status: "조금 적음" | "적절" | "조금 많음") {
  switch (status) {
    case "조금 적음":
      return {
        borderColor: COLORS.status.low,
        backgroundColor: COLORS.ui.cardYellowBg,
      };
    case "조금 많음":
      return {
        borderColor: COLORS.status.high,
        backgroundColor: COLORS.ui.cardRedBg,
      };
    case "적절":
      return {
        borderColor: COLORS.status.balanced,
        backgroundColor: COLORS.ui.cardGreenBg,
      };
  }
}

function miniCardStatusVariant(status: "조금 적음" | "적절" | "조금 많음") {
  switch (status) {
    case "조금 적음":
      return { color: COLORS.status.low };
    case "조금 많음":
      return { color: COLORS.status.high };
    case "적절":
      return { color: COLORS.status.balanced };
  }
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "transparent",
  },
  container: {
    flexGrow: 1,
    paddingTop: 20,
    backgroundColor: "transparent",
  },
  confettiOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
    elevation: 100,
  },
  sectionTop: {
    paddingHorizontal: 20,
    paddingTop: 0,
  },
  dateBar: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 10,
  },
  dateCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtn: {
    width: 36,
    height: 36,

    alignItems: "center",
    justifyContent: "center",
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
  calendar: {
    alignSelf: "flex-end",
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 20,
    marginBottom: 2,
    borderRadius: 99,
    borderColor: COLORS.ui.border,
    backgroundColor: COLORS.semantic.surface,
    borderWidth: 1,
  },
  calendarIcon: {
    width: 30,
    height: 30,
    resizeMode: "contain",
    tintColor: COLORS.semantic.textSecondary,
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  pickerCard: {
    marginHorizontal: 16,
    marginTop: "auto",
    marginBottom: 24,
    borderRadius: 16,
    backgroundColor: COLORS.semantic.surface,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.ui.border,
  },
  modalTitle: {
    ...TYPOGRAPHY.preset.h3,
    color: COLORS.semantic.textPrimary,
    marginBottom: 8,
  },
  pickerWrap: {
    height: 200,
    justifyContent: "center",
  },
  picker: {
    height: 200,
    alignSelf: "stretch",
  },
  tooltipAnchor: {
    position: "relative",
  },
  tooltipBubble: {
    position: "absolute",
    top: 26,
    right: 0,
    width: 260,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.ui.border,
    backgroundColor: "#FFFFFF",
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
    zIndex: 30,
  },
  tooltipArrow: {
    position: "absolute",
    top: -7,
    right: 16,
    width: 12,
    height: 12,
    backgroundColor: "#FFFFFF",
    borderLeftWidth: 1,
    borderTopWidth: 1,
    borderColor: COLORS.ui.border,
    transform: [{ rotate: "45deg" }],
  },
  tooltipBubbleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  tooltipBubbleTitle: {
    ...TYPOGRAPHY.preset.h3,
  },
  tooltipBubbleText: {
    ...TYPOGRAPHY.preset.body,
    lineHeight: 20,
  },
  confettiModal: {
    backgroundColor: COLORS.base.white,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.ui.border,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    minWidth: 240,
    maxWidth: "82%",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  reviewPromptCard: {
    marginHorizontal: 20,
    marginVertical: "auto",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.ui.border,
    backgroundColor: COLORS.base.white,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  reviewPromptEyebrow: {
    ...TYPOGRAPHY.preset.caption,
    color: COLORS.semantic.textSecondary,
    marginBottom: 6,
  },
  reviewPromptTitle: {
    ...TYPOGRAPHY.preset.h2,
    color: COLORS.semantic.textPrimary,
    marginBottom: 8,
  },
  reviewPromptDescription: {
    ...TYPOGRAPHY.preset.body,
    color: COLORS.semantic.textSecondary,
    lineHeight: 20,
  },
  reviewPromptActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  reviewPromptSecondaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.ui.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.semantic.surface,
  },
  reviewPromptPrimaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.base.warmBeige,
  },
  reviewPromptSecondaryLabel: {
    ...TYPOGRAPHY.preset.body,
    color: COLORS.semantic.textPrimary,
  },
  reviewPromptPrimaryLabel: {
    ...TYPOGRAPHY.preset.body,
    color: COLORS.semantic.textPrimary,
  },
});
