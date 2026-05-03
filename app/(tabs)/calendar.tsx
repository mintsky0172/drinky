import AppText from "@/src/components/ui/AppText";
import { COLORS } from "@/src/constants/colors";
import {
  DRINK_ICONS,
  type DrinkIconKey,
  INGREDIENT_ICONS,
  type IngredientIconKey,
} from "@/src/constants/icons";
import { TYPOGRAPHY } from "@/src/constants/typography";
import {
  addMonths,
  buildMonthCells,
  DAY_LABELS,
  getMonthLabel,
  getMonthRange,
  isSameDay,
  toDateKey,
} from "@/src/lib/calendar/calendarUtils";
import { db } from "@/src/lib/firebase";
import { DEFAULT_GOALS, type UserGoals } from "@/src/lib/user";
import { useAuth } from "@/src/providers/AuthProvider";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  View,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import IngredientIcon from "@/src/components/common/IngredientIcon";
import DrinkIcon from "@/src/components/common/DrinkIcon";
import { deleteEntry, listEntries } from "@/src/features/entries/entriesApi";
import { listGuestDailySummariesByDateRange } from "@/src/features/entries/repositories/guestDailySummariesRepository";
import { getGuestGoals } from "@/src/features/entries/repositories/guestGoalsRepository";

type EntryRecord = {
  id: string;
  dateKey: string;
  drinkName: string;
  category?: string;
  totalMl?: number;
  totalCaffeineMg: number;
  totalSugarG: number;
  isWaterOnly: boolean;
  drinkId?: string | null;
  drinkIconKey?: string | null;
  iconKey?: string | null;
  calendarIconKey?: string | null;
  calendarIconUrl?: string | null;
  unit: "cup" | "ml";
  servings?: number;
};

type RecipeLookupItem = {
  id: string;
  name: string;
  drinkIconKey: DrinkIconKey;
  iconUrl?: string | null;
};

type DayTotals = {
  waterMl: number;
  caffeineMg: number;
  sugarG: number;
};

type DaySummaryRecord = {
  dateKey: string;
  oneLine: string;
  overrideIconKey?: string | null;
};

type CalendarDayMeta = {
  iconKey: IngredientIconKey | null;
  iconUrl?: string | null;
  oneLine: string;
};

const EMPTY_TOTALS: DayTotals = {
  waterMl: 0,
  caffeineMg: 0,
  sugarG: 0,
};

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

function mapRecipeIconKeyToAppKey(params: {
  drinkIconKey?: string | null;
  name?: string;
  category?: string;
}): DrinkIconKey {
  const rawKey = params.drinkIconKey ?? "";
  if (rawKey in DRINK_ICONS) return rawKey as DrinkIconKey;

  const name = (params.name ?? "").toLowerCase();
  const category = (params.category ?? "").toLowerCase();

  if (name.includes("밀크티")) return "ice_milk_tea";
  if (name.includes("말차")) {
    if (name.includes("프라푸치노") || category === "smoothie")
      return "matcha_frappe";
    if (name.includes("아이스")) return "ice_matcha_latte";
    return "matcha_latte";
  }
  if (name.includes("라떼") || category === "latte" || category === "milk") {
    return "ice_cafe_latte";
  }
  if (
    name.includes("주스") ||
    category === "juice" ||
    category === "ade" ||
    category === "carbonated" ||
    category === "energy"
  ) {
    return "orange_juice";
  }
  if (category === "tea") return "yuzu_tea";
  if (category === "coffee") return "ice_americano";
  if (category === "smoothie") return "matcha_frappe";

  return "ice_americano";
}

function resolveDrinkIconKey(params: {
  drinkIconKey?: string | null;
  name?: string;
  category?: string;
  isWaterOnly?: boolean;
}): DrinkIconKey {
  if (params.drinkIconKey && params.drinkIconKey in DRINK_ICONS) {
    return params.drinkIconKey as DrinkIconKey;
  }
  if (params.isWaterOnly || (params.name ?? "").includes("물")) {
    return "water";
  }
  return mapRecipeIconKeyToAppKey({
    drinkIconKey: params.drinkIconKey,
    name: params.name,
    category: params.category,
  });
}

function getGoalStatus(
  current: number,
  goal: number,
  mode: "min" | "max",
): "달성" | "거의" | "부족" {
  const ratio = goal > 0 ? current / goal : 1;

  if (mode === "min") {
    if (ratio >= 1) return "달성";
    if (ratio >= 0.85) return "거의";
    return "부족";
  }

  if (ratio <= 1) return "달성";
  if (ratio <= 1.15) return "거의";
  return "부족";
}

function getGoalSummaryText(statuses: ("달성" | "거의" | "부족")[]) {
  if (statuses.every((status) => status === "달성")) {
    return "목표를 달성했어요!";
  }

  if (
    statuses.filter((status) => status === "달성").length >= 2 ||
    statuses.includes("거의")
  ) {
    return "목표에 거의 가까워졌어요.";
  }

  return "목표보다 조금 부족해요.";
}

function Calendar() {
  const { user, initializing } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const calendarIconSize = isTablet ? 64 : 30;

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const [entriesByDateKey, setEntriesByDateKey] = useState<
    Record<string, EntryRecord[]>
  >({});
  const [summariesByDateKey, setSummariesByDateKey] = useState<
    Record<string, DaySummaryRecord>
  >({});
  const [recipesById, setRecipesById] = useState<
    Record<string, RecipeLookupItem>
  >({});
  const [recipesByName, setRecipesByName] = useState<
    Record<string, RecipeLookupItem>
  >({});
  const [goals, setGoals] = useState<UserGoals>(DEFAULT_GOALS);

  const [deleting, setDeleting] = useState(false);

  const monthLabel = useMemo(() => getMonthLabel(currentMonth), [currentMonth]);

  const cells = useMemo(() => buildMonthCells(currentMonth), [currentMonth]);

  const monthRange = useMemo(() => getMonthRange(currentMonth), [currentMonth]);

  const selectedDateKey = useMemo(
    () => toDateKey(selectedDate),
    [selectedDate],
  );


  useEffect(() => {
    const recipesRef = collection(db, "recipes");
    const recipesQ = query(recipesRef, where("isPublic", "==", true));

    const unsubscribe = onSnapshot(recipesQ, (snapshot) => {
      const nextById: Record<string, RecipeLookupItem> = {};
      const nextByName: Record<string, RecipeLookupItem> = {};

      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as {
          name?: string;
          category?: string;
          drinkIconKey?: string;
          iconUrl?: string | null;
        };

        const name = (data.name ?? "").trim();
        if (!name) return;

        const recipe: RecipeLookupItem = {
          id: docSnap.id,
          name,
          drinkIconKey: mapRecipeIconKeyToAppKey({
            drinkIconKey: data.drinkIconKey,
            name,
            category: data.category,
          }),
          iconUrl: data.iconUrl ?? null,
        };

        nextById[recipe.id] = recipe;
        nextByName[name.toLowerCase()] = recipe;
      });

      setRecipesById(nextById);
      setRecipesByName(nextByName);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (initializing) return;
    if (!user) {
      let cancelled = false;

      const run = async () => {
        const entries = await listEntries();
        if (cancelled) return;

        const nextMap: Record<string, EntryRecord[]> = {};
        entries.forEach((raw: any) => {
          const entry: EntryRecord = {
            id: raw.id,
            dateKey: raw.dateKey,
            drinkName: raw.drinkName ?? "알 수 없는 음료",
            category: raw.category,
            totalMl: Number(raw.totalMl ?? 0),
            totalCaffeineMg: Number(raw.totalCaffeineMg ?? 0),
            totalSugarG: Number(raw.totalSugarG ?? 0),
            isWaterOnly: Boolean(raw.isWaterOnly),
            drinkId: raw.drinkId ?? null,
            drinkIconKey: raw.drinkIconKey ?? null,
            iconKey: raw.iconKey ?? null,
            calendarIconKey: raw.calendarIconKey ?? null,
            calendarIconUrl: raw.calendarIconUrl ?? null,
            unit: raw.unit ?? "cup",
            servings: Number(raw.servings ?? 0),
          };

          if (
            entry.dateKey >= monthRange.startKey &&
            entry.dateKey < monthRange.endKey
          ) {
            if (!nextMap[entry.dateKey]) {
              nextMap[entry.dateKey] = [];
            }
            nextMap[entry.dateKey].push(entry);
          }
        });

        setEntriesByDateKey(nextMap);
      };

      void run();

      return () => {
        cancelled = true;
      };
    }

    const entriesRef = collection(db, "users", user.uid, "entries");
    const q = query(
      entriesRef,
      where("dateKey", ">=", monthRange.startKey),
      where("dateKey", "<", monthRange.endKey),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const nextMap: Record<string, EntryRecord[]> = {};

        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Omit<EntryRecord, "id">;
          const entry: EntryRecord = {
            id: docSnap.id,
            dateKey: data.dateKey,
            drinkName: data.drinkName ?? "알 수 없는 음료",
            category: data.category,
            totalMl: Number(data.totalMl ?? 0),
            totalCaffeineMg: Number(data.totalCaffeineMg ?? 0),
            totalSugarG: Number(data.totalSugarG ?? 0),
            isWaterOnly: Boolean(data.isWaterOnly),
            drinkId: data.drinkId ?? null,
            drinkIconKey: data.drinkIconKey ?? null,
            iconKey: data.iconKey ?? null,
            calendarIconKey: data.calendarIconKey,
            calendarIconUrl: data.calendarIconUrl ?? null,
            unit: data.unit,
            servings: Number(data.servings ?? 0),
          };

          if (!nextMap[entry.dateKey]) {
            nextMap[entry.dateKey] = [];
          }
          nextMap[entry.dateKey].push(entry);
        });

        setEntriesByDateKey(nextMap);
      },
      () => {
        setEntriesByDateKey({});
      },
    );
    return () => unsubscribe();
  }, [user, initializing, monthRange.startKey, monthRange.endKey]);

  useEffect(() => {
    if (initializing) return;
    if (!user) {
      let cancelled = false;

      const run = async () => {
        const guestGoals = await getGuestGoals();
        if (cancelled) return;
        setGoals(guestGoals);
      };

      void run();

      return () => {
        cancelled = true;
      };
    }

    const userRef = doc(db, "users", user.uid);

    const unsubscribe = onSnapshot(
      userRef,
      (snap) => {
        const userGoals = snap.data()?.goals as Partial<UserGoals> | undefined;

        setGoals({
          waterMl: userGoals?.waterMl ?? DEFAULT_GOALS.waterMl,
          caffeineMg: userGoals?.caffeineMg ?? DEFAULT_GOALS.caffeineMg,
          sugarG: userGoals?.sugarG ?? DEFAULT_GOALS.sugarG,
        });
      },
      () => {
        setGoals(DEFAULT_GOALS);
      },
    );

    return () => unsubscribe();
  }, [user, initializing]);

  useEffect(() => {
    if (initializing) return;
    if (!user) {
      let cancelled = false;

      const run = async () => {
        const summaries = await listGuestDailySummariesByDateRange(
          monthRange.startKey,
          monthRange.endKey,
        );
        if (cancelled) return;

        const nextMap: Record<string, DaySummaryRecord> = {};
        summaries.forEach((summary) => {
          nextMap[summary.dateKey] = {
            dateKey: summary.dateKey,
            oneLine: summary.oneLine ?? "",
            overrideIconKey: summary.overrideIconKey ?? null,
          };
        });

        setSummariesByDateKey(nextMap);
      };

      void run();

      return () => {
        cancelled = true;
      };
    }

    const summariesRef = collection(db, "users", user.uid, "dailySummaries");
    const q = query(
      summariesRef,
      where("dateKey", ">=", monthRange.startKey),
      where("dateKey", "<", monthRange.endKey),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const nextMap: Record<string, DaySummaryRecord> = {};

        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Partial<DaySummaryRecord>;
          const dateKey = data.dateKey ?? docSnap.id;

          nextMap[dateKey] = {
            dateKey,
            oneLine: data.oneLine ?? "",
            overrideIconKey: data.overrideIconKey ?? null,
          };
        });

        setSummariesByDateKey(nextMap);
      },
      () => {
        setSummariesByDateKey({});
      },
    );

    return () => unsubscribe();
  }, [user, initializing, monthRange.startKey, monthRange.endKey]);

  const selectedEntries = useMemo(
    () => entriesByDateKey[selectedDateKey] ?? [],
    [entriesByDateKey, selectedDateKey],
  );

  const selectedTotals = useMemo(() => {
    return selectedEntries.reduce<DayTotals>((acc, entry) => {
      const ml = Number(entry.totalMl ?? 0);
      const caffeine = Number(entry.totalCaffeineMg ?? 0);
      const sugar = Number(entry.totalSugarG ?? 0);

      return {
        waterMl: acc.waterMl + (entry.isWaterOnly ? ml : 0),
        caffeineMg: acc.caffeineMg + caffeine,
        sugarG: acc.sugarG + sugar,
      };
    }, EMPTY_TOTALS);
  }, [selectedEntries]);

  const monthTotals = useMemo(() => {
    const allEntries = Object.values(entriesByDateKey).flat();
    const activeDays = Object.values(entriesByDateKey).filter(
      (entries) => entries.length > 0,
    ).length;

    const totals = allEntries.reduce(
      (acc, entry) => {
        const ml = Number(entry.totalMl ?? 0);
        const caffeine = Number(entry.totalCaffeineMg ?? 0);
        const sugar = Number(entry.totalSugarG ?? 0);

        acc.entryCount += 1;
        acc.waterMl += entry.isWaterOnly ? ml : 0;
        acc.caffeineMg += caffeine;
        acc.sugarG += sugar;

        return acc;
      },
      {
        entryCount: 0,
        waterMl: 0,
        caffeineMg: 0,
        sugarG: 0,
      },
    );

    const divisor = activeDays > 0 ? activeDays : 1;

    return {
      ...totals,
      activeDays,
      avgWaterMl: Math.round(totals.waterMl / divisor),
      avgCaffeineMg: Math.round(totals.caffeineMg / divisor),
      avgSugarG: Math.round(totals.sugarG / divisor),
    };
  }, [entriesByDateKey]);

  const monthGoalComparison = useMemo(() => {
    if (monthTotals.entryCount === 0) {
      return "이번 달에는 기록이 없어서 목표와 비교할 수 없어요.";
    }

    const statuses = [
      getGoalStatus(monthTotals.avgWaterMl, goals.waterMl, "min"),
      getGoalStatus(monthTotals.avgCaffeineMg, goals.caffeineMg, "max"),
      getGoalStatus(monthTotals.avgSugarG, goals.sugarG, "max"),
    ];

    return `${getGoalSummaryText(statuses)}`;
  }, [goals, monthTotals]);

  const selectedEntriesWithIcons = useMemo(
    () =>
      selectedEntries.map((entry) => {
        const matchedRecipe =
          (entry.drinkId ? recipesById[entry.drinkId] : undefined) ??
          recipesByName[entry.drinkName.trim().toLowerCase()];

        return {
          ...entry,
          resolvedDrinkIconKey: resolveDrinkIconKey({
            drinkIconKey: matchedRecipe?.drinkIconKey ?? entry.drinkIconKey,
            name: matchedRecipe?.name ?? entry.drinkName,
            category: entry.category,
            isWaterOnly: entry.isWaterOnly,
          }),
          resolvedIconUrl: matchedRecipe?.iconUrl ?? null,
        };
      }),
    [selectedEntries, recipesById, recipesByName],
  );

  const selectedSummary = summariesByDateKey[selectedDateKey]?.oneLine ?? "";

  const calendarMetaByDateKey = useMemo<Record<string, CalendarDayMeta>>(() => {
    const result: Record<string, CalendarDayMeta> = {};

    const allDateKeys = new Set([
      ...Object.keys(entriesByDateKey),
      ...Object.keys(summariesByDateKey),
    ]);

    allDateKeys.forEach((dateKey) => {
      const entries = entriesByDateKey[dateKey] ?? [];
      const summary = summariesByDateKey[dateKey];

      const overrideKey = summary?.overrideIconKey
        ? normalizeIngredientIconKey(summary.overrideIconKey)
        : null;

      let computedIconKey: IngredientIconKey | null = null;
      let computedIconUrl: string | null = null;

      if (!overrideKey) {
        const iconScores = new Map<
          string,
          { iconKey: IngredientIconKey; iconUrl: string | null; score: number }
        >();

        entries.forEach((entry) => {
          const key = inferIngredientIconFromEntry(entry);
          const iconUrl =
            typeof entry.calendarIconUrl === "string"
              ? entry.calendarIconUrl
              : null;
          const ml = Number(entry.totalMl ?? 0);
          const weight = entry.isWaterOnly ? 0.7 : 1;
          const score = ml * weight;
          const mapKey = iconUrl ? `url:${iconUrl}` : `key:${key}`;
          const prev = iconScores.get(mapKey);

          iconScores.set(mapKey, {
            iconKey: key,
            iconUrl,
            score: (prev?.score ?? 0) + score,
          });
        });

        let max = -1;
        iconScores.forEach((value) => {
          if (value.score > max) {
            max = value.score;
            computedIconKey = value.iconKey;
            computedIconUrl = value.iconUrl;
          }
        });
      }

      result[dateKey] = {
        iconKey: overrideKey ?? computedIconKey ?? null,
        iconUrl: overrideKey ? null : computedIconUrl,
        oneLine: summary?.oneLine ?? "",
      };
    });
    return result;
  }, [entriesByDateKey, summariesByDateKey]);

  const openDeleteConfirm = (entry: EntryRecord) => {
    if (deleting) return;

    Alert.alert("기록 삭제", "이 기록을 삭제할까요?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: () => {
          void handleDeleteEntry(entry);
        },
      },
    ]);
  };

  const handleDeleteEntry = async (entry: EntryRecord) => {
    try {
      setDeleting(true);
      await deleteEntry(entry.id);
      setEntriesByDateKey((prev) => {
        const current = prev[entry.dateKey] ?? [];
        const nextEntries = current.filter((item) => item.id !== entry.id);
        return {
          ...prev,
          [entry.dateKey]: nextEntries,
        };
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleEditEntry = (entryId: string) => {
    router.push({ pathname: "/record/edit", params: { entryId } });
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* 헤더 */}
        <View style={styles.header}>
          <Pressable
            style={styles.iconButton}
            onPress={() => setCurrentMonth((prev) => addMonths(prev, -1))}
          >
            <Ionicons
              name="chevron-back"
              size={20}
              color={COLORS.semantic.textPrimary}
            />
          </Pressable>

          <AppText style={styles.headerTitle}>{monthLabel}</AppText>

          <Pressable
            style={styles.iconButton}
            onPress={() => setCurrentMonth((prev) => addMonths(prev, 1))}
          >
            <Ionicons
              name="chevron-forward"
              size={20}
              color={COLORS.semantic.textPrimary}
            />
          </Pressable>
        </View>

        {/* 요일 */}
        <View style={styles.weekRow}>
          {DAY_LABELS.map((label) => (
            <View key={label} style={styles.weekCell}>
              <AppText
                style={[
                  styles.weekText,
                  label === "일" && styles.sundayText,
                  label === "토" && styles.saturdayText,
                ]}
              >
                {label}
              </AppText>
            </View>
          ))}
        </View>

        {/* 날짜 그리드 */}
        <View style={styles.grid}>
          {cells.map((cell) => {
            const isSelected = isSameDay(cell.date, selectedDate);
            const dayEntries = entriesByDateKey[cell.dateKey] ?? [];
            const dayMeta = calendarMetaByDateKey[cell.dateKey];
            const iconKey = dayMeta?.iconKey ?? null;

            return (
              <Pressable
                key={cell.dateKey}
                style={styles.dayCell}
                onPress={() => setSelectedDate(cell.date)}
              >
                <View
                  key={`${cell.dateKey}-${iconKey ? "icon" : "date"}`}
                  style={[
                    styles.dayInner,
                    cell.isToday && styles.todayCell,
                    isSelected && styles.selectedCell,
                  ]}
                >
                  {iconKey ? (
                    <View style={styles.iconSlot}>
                      <View
                        style={[
                          styles.iconAnchor,
                          {
                            width: calendarIconSize,
                            height: calendarIconSize,
                          },
                        ]}
                      >
                        <IngredientIcon
                          iconKey={iconKey}
                          iconUrl={calendarMetaByDateKey[cell.dateKey]?.iconUrl}
                          size={calendarIconSize}
                        />

                        {dayEntries.length > 1 ? (
                          <View
                            style={[
                              styles.countBadge,
                              isTablet && styles.countBadgeTablet,
                            ]}
                          >
                            <AppText style={styles.countBadgeText}>
                              {dayEntries.length}
                            </AppText>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  ) : (
                    <View style={styles.dayNumberSlot}>
                      <AppText
                        style={[
                          styles.dayText,
                          !cell.inCurrentMonth && styles.outsideMonthText,
                          cell.isToday && styles.todayText,
                          isSelected && styles.selectedText,
                        ]}
                      >
                        {cell.date.getDate()}
                      </AppText>
                    </View>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* 월간 요약 */}
        <View style={styles.monthSummaryCard}>
          <View style={styles.monthSummaryHeader}>
            <View>
              <AppText style={styles.monthSummaryEyebrow}>
                MONTHLY OVERVIEW
              </AppText>
              <AppText style={styles.monthSummaryTitle}>이번 달 요약</AppText>
            </View>

            <View style={styles.monthBadge}>
              <AppText style={styles.monthBadgeText}>
                기록 수: {monthTotals.entryCount.toLocaleString()}개
              </AppText>
            </View>
          </View>

          <View style={styles.monthSummaryGrid}>
            <View style={[styles.metricCard, styles.metricCardBlue]}>
              <AppText style={styles.metricValue}>
                {monthTotals.avgWaterMl.toLocaleString()} mL
              </AppText>
              <AppText style={styles.metricLabel}>일평균{"\n"}수분💧</AppText>
            </View>

            <View style={[styles.metricCard, styles.metricCardBrown]}>
              <AppText style={styles.metricValue}>
                {monthTotals.avgCaffeineMg.toLocaleString()} mg
              </AppText>
              <AppText style={styles.metricLabel}>일평균{"\n"}카페인☕️</AppText>
            </View>

            <View style={[styles.metricCard, styles.metricCardPink]}>
              <AppText style={styles.metricValue}>
                {monthTotals.avgSugarG.toLocaleString()} g
              </AppText>
              <AppText style={styles.metricLabel}>일평균{"\n"}당류🍭</AppText>
            </View>
          </View>

          <View style={styles.monthSummaryComparison}>
            <AppText style={styles.monthSummaryComparisonLabel}>
              목표와 비교하면...
            </AppText>
            <AppText style={styles.monthSummaryComparisonText}>
              {monthGoalComparison}
            </AppText>
          </View>
        </View>

        {/* 하단 상세 */}
        <View style={styles.footerCard}>
          <View style={styles.footerRow}>
            <AppText style={styles.footerDate}>
              {selectedDate.getFullYear()}년 {selectedDate.getMonth() + 1}월{" "}
              {selectedDate.getDate()}일
            </AppText>
            <AppText style={styles.footerSub}>
              기록 수: {selectedEntries.length}개
            </AppText>
          </View>

          {selectedSummary ? (
            <View style={styles.oneLineBox}>
              <View style={styles.oneLineQuoteRow}>
                <AppText style={styles.oneLineQuoteMark}>“</AppText>
                <AppText style={styles.oneLineText}>{selectedSummary}</AppText>
                <AppText style={styles.oneLineQuoteMark}>”</AppText>
              </View>
            </View>
          ) : null}

          <View style={styles.footerMetricsRow}>
            <View style={styles.footerMetricPill}>
              <AppText style={styles.footerMetricValue}>
                {selectedTotals.waterMl.toLocaleString()} mL
              </AppText>
              <AppText style={styles.footerMetricLabel}>수분</AppText>
            </View>

            <View style={styles.footerMetricPill}>
              <AppText style={styles.footerMetricValue}>
                {selectedTotals.caffeineMg.toLocaleString()} mg
              </AppText>
              <AppText style={styles.footerMetricLabel}>카페인</AppText>
            </View>

            <View style={styles.footerMetricPill}>
              <AppText style={styles.footerMetricValue}>
                {selectedTotals.sugarG.toLocaleString()} g
              </AppText>
              <AppText style={styles.footerMetricLabel}>당류</AppText>
            </View>
          </View>

          <View style={styles.entrySection}>
            <AppText
              style={{
                ...TYPOGRAPHY.preset.h3,
                color: COLORS.semantic.textPrimary,
              }}
            >
              마신 음료
            </AppText>

            <View style={styles.entryList}>
              {selectedEntriesWithIcons.length > 0 ? (
                selectedEntriesWithIcons.map((entry) => {
                  const amountText =
                    entry.unit === "cup"
                      ? `${Math.round(entry.servings ?? 0)}잔`
                      : `${Math.round(entry.totalMl ?? 0)}mL`;

                  return (
                    <View key={entry.id} style={styles.entryRow}>
                      <View style={styles.entryLeft}>
                        <DrinkIcon
                          iconKey={entry.resolvedDrinkIconKey}
                          iconUrl={entry.resolvedIconUrl}
                          size={28}
                        />
                        <View style={styles.entryInfo}>
                          <AppText style={styles.entryName}>
                            {entry.drinkName}
                          </AppText>
                          <AppText style={styles.entryMeta}>
                            {amountText}
                          </AppText>
                        </View>
                      </View>

                      <View style={styles.entryActions}>
                        <Pressable
                          style={styles.entryActionButton}
                          onPress={() => handleEditEntry(entry.id)}
                        >
                          <Ionicons
                            name="create-outline"
                            size={16}
                            color={COLORS.semantic.textMuted}
                          />
                        </Pressable>

                        <Pressable
                          style={styles.entryActionButton}
                          onPress={() => openDeleteConfirm(entry)}
                        >
                          <Ionicons
                            name="trash-outline"
                            size={16}
                            color={COLORS.semantic.textMuted}
                          />
                        </Pressable>
                      </View>
                    </View>
                  );
                })
              ) : (
                <AppText style={styles.footerHint}>
                  이 날짜에는 기록이 없어요.
                </AppText>
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default Calendar;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 64,
    paddingBottom: 6,
  },
  header: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  headerTitle: {
    ...TYPOGRAPHY.preset.h1,
    color: COLORS.semantic.textPrimary,
  },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  weekRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  weekCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 6,
  },
  weekText: {
    ...TYPOGRAPHY.preset.h3,
    color: COLORS.semantic.textPrimary,
  },
  sundayText: {
    color: COLORS.status.high,
  },
  saturdayText: {
    color: COLORS.semantic.textSecondary,
    opacity: 0.8,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    width: "14.2857%",
    aspectRatio: 1,
    padding: 3,
  },
  dayInner: {
    flex: 1,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  dayNumberSlot: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ translateY: -1 }],
  },
  todayCell: {
    backgroundColor: COLORS.base.warmBeige,
  },
  selectedCell: {
    borderColor: "#8C6D5A",
    borderWidth: 1.5,
    backgroundColor: "#d8bc9c",
  },
  dayText: {
    ...TYPOGRAPHY.preset.h3,
    lineHeight: 20,
    color: COLORS.semantic.textPrimary,
    textAlign: "center",
  },
  outsideMonthText: {
    color: COLORS.semantic.textSecondary,
    opacity: 0.45,
  },
  todayText: {
    color: COLORS.semantic.textPrimary,
  },
  selectedText: {
    color: "#5E4638",
  },
  iconSlot: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  iconAnchor: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  countBadge: {
    position: "absolute",
    right: -6,
    top: -4,
    minWidth: 14,
    height: 14,
    paddingHorizontal: 3,
    borderRadius: 999,
    backgroundColor: COLORS.semantic.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  countBadgeTablet: {
    right: -4,
    top: -2,
  },
  countBadgeText: {
    ...TYPOGRAPHY.preset.caption,
    fontSize: 9,
    lineHeight: 10,
    color: COLORS.base.creamPaper,
  },
  monthSummaryCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.ui.border,
    backgroundColor: COLORS.base.creamPaper,
    padding: 16,
    marginBottom: 12,
  },
  monthSummaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  monthSummaryEyebrow: {
    ...TYPOGRAPHY.preset.caption,
    color: COLORS.semantic.textSecondary,
  },
  monthBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: COLORS.ui.border,
  },
  monthBadgeText: {
    ...TYPOGRAPHY.preset.caption,
    color: COLORS.semantic.textPrimary,
  },
  monthSummaryCaption: {
    ...TYPOGRAPHY.preset.caption,
    color: COLORS.semantic.textSecondary,
    marginBottom: 12,
  },
  monthSummaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  monthSummaryComparison: {
    marginTop: 12,
    padding: 12,
    borderRadius: 16,
    backgroundColor: "#FFF8F1",
    borderWidth: 1,
    borderColor: COLORS.ui.border,
  },
  monthSummaryComparisonLabel: {
    ...TYPOGRAPHY.preset.caption,
    color: COLORS.semantic.textSecondary,
    marginBottom: 4,
  },
  monthSummaryComparisonText: {
    ...TYPOGRAPHY.preset.body,
    color: COLORS.semantic.textPrimary,
    lineHeight: 22,
  },
  metricCard: {
    flex: 1,
    minHeight: 76,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.ui.border,
    justifyContent: "center",
    alignItems: "center",
  },
  metricCardBlue: {
    backgroundColor: "#EEF6FF",
  },
  metricCardBrown: {
    backgroundColor: COLORS.base.warmBeige,
  },
  metricCardPink: {
    backgroundColor: "#FFF1F3",
  },
  metricValue: {
    ...TYPOGRAPHY.preset.h2,
    color: COLORS.semantic.textPrimary,
    textAlign: 'center'
  },
  metricLabel: {
    ...TYPOGRAPHY.preset.body,
    color: COLORS.semantic.textSecondary,
    marginTop: 4,
    textAlign: "center",
  },
  monthSummaryTitle: {
    ...TYPOGRAPHY.preset.h2,
    color: COLORS.semantic.textPrimary,
    marginBottom: 10,
  },
  monthSummaryItem: {
    width: "50%",
    gap: 2,
  },
  monthSummaryValue: {
    ...TYPOGRAPHY.preset.body,
    color: COLORS.semantic.textPrimary,
  },
  monthSummaryLabel: {
    ...TYPOGRAPHY.preset.caption,
    color: COLORS.semantic.textSecondary,
  },
  footerCard: {
    marginTop: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.ui.border,
    backgroundColor: COLORS.base.creamPaper,
    padding: 14,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  footerDate: {
    ...TYPOGRAPHY.preset.h2,
    color: COLORS.semantic.textPrimary,
    marginBottom: 4,
  },
  footerSub: {
    ...TYPOGRAPHY.preset.caption,
    color: COLORS.semantic.textSecondary,
    marginBottom: 8,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: COLORS.ui.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  footerHint: {
    ...TYPOGRAPHY.preset.body,
    opacity: 0.7,
  },
  summaryRow: {
    gap: 4,
    marginBottom: 10,
  },
  summaryText: {
    ...TYPOGRAPHY.preset.h3,
    color: COLORS.semantic.textSecondary,
  },
  entrySection: {
    marginTop: 2,
  },
  entryList: {
    gap: 8,
  },
  entryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 4,
  },
  entryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  entryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  entryActionButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center'
  },
  entryInfo: {
    flex: 1,
    minWidth: 0,
  },
  entryName: {
    ...TYPOGRAPHY.preset.body,
    color: COLORS.semantic.textPrimary,
  },
  entryMeta: {
    ...TYPOGRAPHY.preset.caption,
    color: COLORS.semantic.textSecondary,
    marginTop: 2,
  },

  oneLineBox: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#FFF8F1",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.ui.border,
  },
  oneLineQuoteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  oneLineQuoteMark: {
    ...TYPOGRAPHY.preset.h2,
    color: COLORS.semantic.textSecondary,
    lineHeight: 22,
  },
  oneLineText: {
    ...TYPOGRAPHY.preset.body,
    color: COLORS.semantic.textPrimary,
    textAlign: "center",
    flexShrink: 1,
  },
  footerMetricsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  footerMetricPill: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: COLORS.ui.border,
    alignItems: "center",
  },
  footerMetricValue: {
    ...TYPOGRAPHY.preset.h3,
    color: COLORS.semantic.textPrimary,
  },
  footerMetricLabel: {
    ...TYPOGRAPHY.preset.body,
    color: COLORS.semantic.textSecondary,
    marginTop: 2,
  },
});
