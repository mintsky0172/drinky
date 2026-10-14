import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  ScrollView,
  Image,
  Platform,
  StyleProp,
  KeyboardAvoidingView,
  BackHandler,
} from "react-native";
import type { TextStyle } from "react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import TextField from "@/src/components/ui/TextField";
import AppText from "@/src/components/ui/AppText";
import { COLORS } from "@/src/constants/colors";
import AppButton from "@/src/components/ui/AppButton";
import DrinkSearchModal from "@/src/components/record/DrinkSearchModal";
import DrinkQuickPickModal from "@/src/components/record/DrinkQuickPickModal";
import SaveResultModal from "@/src/components/record/SaveResultModal";
import { TYPOGRAPHY } from "@/src/constants/typography";
import { useLocalSearchParams, useRouter } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import Ionicons from "@expo/vector-icons/Ionicons";
import buildEntryPayload from "@/src/lib/entries/buildEntryPayload";
import {
  saveEntry,
  getEntryById,
  updateEntry,
  listEntries,
} from "@/src/features/entries/entriesApi";
import { listVisibleToppings } from "@/src/features/toppings/toppingsApi";
import { calculateToppingNutrition } from "@/src/features/toppings/caculateToppingNutrition";
import { db } from "@/src/lib/firebase";
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import {
  DRINK_ICONS,
  DrinkIconKey,
  INGREDIENT_ICONS,
  IngredientIconKey,
} from "@/src/constants/icons";
import { useAuth } from "@/src/providers/AuthProvider";
import type { EntryTopping, Topping } from "@/src/types/topping";
import ToppingSelectModal from "@/src/components/record/ToppingSelectModal";
import ToppingIcon from "@/src/components/common/ToppingIcon";

type Item = {
  id: string;
  name: string;
  category?: string;
  normalizedName?: string;
  aliases?: string[];
  searchKeywords?: string[];
  drinkIconKey?: string;
  iconUrl?: string | null;
  calendarIconKey?: string;
  ingredientIconUrl?: string | null;
  mlPerServing?: number;
  caffeineMgPerServing?: number;
  sugarGPerServing?: number;
  calorieKcalPerServing?: number;
  isWaterOnly?: boolean;
  createdAtMs?: number;
  popularityScore?: number;
  globalPopularityScore?: number;
};
type Option = { value: string; label: string };
type TextFieldProps = React.ComponentProps<typeof TextField>;

function PlaceholderTextField({
  value,
  placeholder,
  placeholderStyle,
  ...props
}: TextFieldProps & { placeholderStyle?: StyleProp<TextStyle> }) {
  return (
    <View style={styles.placeholderFieldWrap}>
      {!value && placeholder ? (
        <Text
          pointerEvents="none"
          style={[styles.customPlaceholder, placeholderStyle]}
        >
          {placeholder}
        </Text>
      ) : null}
      <TextField value={value} placeholder="" {...props} />
    </View>
  );
}

const pad2 = (n: number) => String(n).padStart(2, "0");
const formatDateDot = (d: Date) =>
  `${d.getFullYear()}.${pad2(d.getMonth() + 1)}.${pad2(d.getDate())}`;
const formatTime = (d: Date) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

function parseDateParam(value: unknown) {
  if (typeof value !== "string") return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  const parsed = new Date(year, monthIndex, day);

  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== monthIndex ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return parsed;
}

function mergeDatePart(datePart: Date, timePart: Date) {
  return new Date(
    datePart.getFullYear(),
    datePart.getMonth(),
    datePart.getDate(),
    timePart.getHours(),
    timePart.getMinutes(),
    timePart.getSeconds(),
    timePart.getMilliseconds(),
  );
}

const UNIT_OPTIONS: Option[] = [
  { value: "cup", label: "잔" },
  { value: "ml", label: "mL" },
];

const SIZE_OPTIONS: Option[] = [
  { value: "S", label: "S" },
  { value: "M", label: "M" },
  { value: "L", label: "L" },
  { value: "XL", label: "XL" },
];

const SIZE_GUIDE_TOOLTIP_TEXT =
  "일반적인 카페 기준으로 S는 약 355mL, M은 약 473mL, L는 약 591mL 정도예요.";

function mapRecipeIconKeyToAppKey(params: {
  drinkIconKey?: string;
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
  if (name.includes("라떼") || category === "latte" || category === "milk")
    return "ice_cafe_latte";
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
  drinkIconKey?: string;
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

function resolveCalendarIconKey(params: {
  calendarIconKey?: unknown;
  name?: string;
  category?: string;
  isWaterOnly?: boolean;
}): IngredientIconKey {
  const normalized = normalizeIngredientIconKey(params.calendarIconKey);
  if (normalized !== "default") return normalized;

  if (params.isWaterOnly) return "water";

  const name = (params.name ?? "").toLowerCase();
  const category = (params.category ?? "").toLowerCase();

  if (name.includes("물") || category === "water") return "water";
  if (
    category === "coffee" ||
    category === "latte" ||
    name.includes("커피") ||
    name.includes("라떼") ||
    name.includes("아메리카노") ||
    name.includes("에스프레소")
  ) {
    return "coffee";
  }
  if (
    category === "tea" ||
    category === "smoothie" ||
    name.includes("말차") ||
    name.includes("녹차") ||
    name.includes("차")
  ) {
    return "leaf";
  }
  if (
    category === "ade" ||
    category === "juice" ||
    name.includes("딸기") ||
    name.includes("berry")
  ) {
    return "strawberry";
  }

  return "default";
}

function buildFallbackItemFromEntry(entry: any): Item | null {
  const drinkName = String(entry?.drinkName ?? "").trim();
  if (!drinkName) return null;

  const servings = Math.max(1, Number(entry?.servings ?? 1));
  const totalMl = Math.max(0, Number(entry?.totalMl ?? 0));
  const unit = entry?.unit === "ml" ? "ml" : "cup";
  const mlPerServing =
    unit === "cup"
      ? Math.max(1, Number(entry?.mlPerUnit ?? (totalMl / servings || 200)))
      : Math.max(1, totalMl);

  const toppingNutrition = calculateToppingNutrition(entry.toppings ?? []);
  const ratio = unit === "cup" ? servings : totalMl / mlPerServing;
  const safeRatio = ratio > 0 ? ratio : 1;
  const basePerServing = (total: unknown, toppingTotal: number) =>
    Math.max(0, Number(total ?? 0) - toppingTotal) / safeRatio;

  return {
    id: String(entry?.drinkId ?? `entry-${drinkName}`),
    name: drinkName,
    category: entry?.category as string | undefined,
    drinkIconKey: resolveDrinkIconKey({
      drinkIconKey: entry?.drinkIconKey as string | undefined,
      name: drinkName,
      category: entry?.category as string | undefined,
      isWaterOnly: Boolean(entry?.isWaterOnly),
    }),
    iconUrl: null,
    ingredientIconUrl: (entry?.calendarIconUrl as string | undefined) ?? null,
    calendarIconKey: resolveCalendarIconKey({
      calendarIconKey: entry?.iconKey ?? entry?.calendarIconKey,
      name: drinkName,
      category: entry?.category as string | undefined,
      isWaterOnly: Boolean(entry?.isWaterOnly),
    }),
    mlPerServing,
    caffeineMgPerServing: basePerServing(
      entry.totalCaffeineMg,
      toppingNutrition.caffeine,
    ),
    sugarGPerServing: basePerServing(entry.totalSugarG, toppingNutrition.sugar),
    calorieKcalPerServing: basePerServing(
      entry.totalCaloriesKcal,
      toppingNutrition.calories,
    ),
  };
}

function SelectModal({
  visible,
  title,
  options,
  value,
  onClose,
  onSelect,
}: {
  visible: boolean;
  title: string;
  options: Option[];
  value: string;
  onClose: () => void;
  onSelect: (v: string) => void;
}) {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose} />
      <View style={styles.modalCard}>
        <Text style={styles.modalTitle}>{title}</Text>
        <View style={{ height: 10 }} />
        {options.map((opt) => {
          const selected = opt.value === value;
          return (
            <Pressable
              key={opt.value}
              style={[styles.modalRow, selected && styles.modalRowSelected]}
              onPress={() => {
                onSelect(opt.value);
                onClose();
              }}
            >
              <Text
                style={[
                  styles.modalRowText,
                  selected && styles.modalRowTextSelected,
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Modal>
  );
}

const RecordCreateScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{ date?: string; entryId?: string }>();
  const { user } = useAuth();
  const scrollRef = useRef<ScrollView>(null);
  const entryId = Array.isArray(params.entryId)
    ? params.entryId[0]
    : params.entryId;
  const isEditMode = Boolean(entryId);
  const initialSelectedDate = useMemo(
    () => parseDateParam(params.date) ?? new Date(),
    [params.date],
  );
  // 검색/선택
  const [search, setSearch] = useState("");
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [quickPickOpen, setQuickPickOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [picked, setPicked] = useState<Item | null>(null);
  const [recipeItems, setRecipeItems] = useState<Item[]>([]);
  const [entryHistory, setEntryHistory] = useState<any[]>([]);

  // 폼 상태
  const [date, setDate] = useState<Date>(initialSelectedDate);
  const [consumedAt, setConsumedAt] = useState<Date>(() =>
    mergeDatePart(initialSelectedDate, new Date()),
  );

  const [brand, setBrand] = useState<string>("");

  const [servings, setServings] = useState<string>("1");
  const [unit, setUnit] = useState<string>("cup");
  const [unitModal, setUnitModal] = useState(false);
  const [sizeGuideToolTipOpen, setSizeGuideToolTipOpen] = useState(false);

  const [sizeLabel, setSizeLabel] = useState<string>("M");
  const [sizeModal, setSizeModal] = useState(false);

  const [memo, setMemo] = useState("");
  const [editLoading, setEditLoading] = useState(isEditMode);
  const [editEntry, setEditEntry] = useState<any | null>(null);

  // 날짜/시간 피커
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [timePickerOpen, setTimePickerOpen] = useState(false);

  const [saveDone, setSaveDone] = useState(false);
  const [saving, setSaving] = useState(false);

  // 토핑
  const [toppingItems, setToppingItems] = useState<Topping[]>([]);
  const [toppingsLoading, setToppingsLoading] = useState(true);
  const [toppingsError, setToppingsError] = useState<string | null>(null);
  const [toppingModalOpen, setToppingModalOpen] = useState(false);
  const [selectedToppings, setSelectedToppings] = useState<EntryTopping[]>([]);

  useEffect(() => {
    if (Platform.OS !== "android" || isEditMode) return;

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (searchModalOpen) {
          setSearchModalOpen(false);
          return true;
        }
        if (quickPickOpen) {
          setQuickPickOpen(false);
          return true;
        }
        if (unitModal) {
          setUnitModal(false);
          return true;
        }
        if (sizeModal) {
          setSizeModal(false);
          return true;
        }
        if (datePickerOpen) {
          setDatePickerOpen(false);
          return true;
        }
        if (timePickerOpen) {
          setTimePickerOpen(false);
          return true;
        }
        if (saveDone) {
          setSaveDone(false);
          router.replace("/(tabs)");
          return true;
        }
        if (saving) {
          return true;
        }

        router.replace("/(tabs)");
        return true;
      },
    );

    return () => subscription.remove();
  }, [
    datePickerOpen,
    isEditMode,
    quickPickOpen,
    router,
    saveDone,
    saving,
    searchModalOpen,
    sizeModal,
    timePickerOpen,
    unitModal,
  ]);

  const calendar = require("@/assets/tabs/calendar_inactive.png");
  const clock = require("@/assets/icons/etc/clock.png");
  const searchIcon = require("@/assets/icons/etc/search.png");

  useEffect(() => {
    const recipesRef = collection(db, "recipes");
    const recipesQ = query(recipesRef, where("isPublic", "==", true));

    const unsub = onSnapshot(recipesQ, (snap) => {
      const rows = snap.docs
        .map((d) => {
          const data = d.data() as any;
          return {
            id: d.id,
            name: (data.name as string) ?? "",
            category: data.category as string | undefined,
            normalizedName: data.normalizedName as string | undefined,
            aliases: (data.aliases as string[] | undefined) ?? [],
            searchKeywords: (data.searchKeywords as string[] | undefined) ?? [],
            drinkIconKey: mapRecipeIconKeyToAppKey({
              drinkIconKey: data.drinkIconKey as string | undefined,
              name: data.name as string | undefined,
              category: data.category as string | undefined,
            }),
            iconUrl: (data.iconUrl as string | undefined) ?? null,
            ingredientIconUrl:
              (data.ingredientIconUrl as string | undefined) ?? null,
            calendarIconKey: resolveCalendarIconKey({
              calendarIconKey: data.calendarIconKey,
              name: data.name as string | undefined,
              category: data.category as string | undefined,
              isWaterOnly: data.isWaterOnly as boolean | undefined,
            }),
            mlPerServing: data.mlPerServing as number | undefined,
            caffeineMgPerServing: data.caffeineMgPerServing as
              | number
              | undefined,
            sugarGPerServing: data.sugarGPerServing as number | undefined,
            calorieKcalPerServing: data.calorieKcalPerServing as
              | number
              | undefined,
            isWaterOnly: data.isWaterOnly as boolean | undefined,
            createdAtMs:
              typeof (data.createdAt as any)?.toMillis === "function"
                ? Number((data.createdAt as any).toMillis())
                : 0,
            globalPopularityScore: Number(
              data.popularityLiveCount ??
                data.popularityCount ??
                data.popularityScore ??
                0,
            ),
          } satisfies Item;
        })
        .filter((item) => item.name.trim().length > 0);

      setRecipeItems(rows);
    });

    return unsub;
  }, []);

  useEffect(() => {
    if (!isEditMode || !entryId) return;

    let cancelled = false;

    const run = async () => {
      try {
        setEditLoading(true);
        const entry = await getEntryById(entryId);
        if (!entry || cancelled) {
          if (!cancelled) {
            Alert.alert("안내", "수정할 기록을 찾지 못했어요.");
            router.back();
          }
          return;
        }

        if (!cancelled) {
          setEditEntry(entry);
        }
      } finally {
        if (!cancelled) {
          setEditLoading(false);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [entryId, isEditMode, router]);

  useEffect(() => {
    if (!editEntry) return;

    const consumedDate =
      typeof (editEntry.consumedAt as any)?.toDate === "function"
        ? (editEntry.consumedAt as any).toDate()
        : new Date();
    const selectedOnlyDate = new Date(
      consumedDate.getFullYear(),
      consumedDate.getMonth(),
      consumedDate.getDate(),
    );

    setDate(selectedOnlyDate);
    setConsumedAt(consumedDate);
    setBrand(editEntry.brandLabel ?? "");
    setServings(String(editEntry.servings ?? 1));
    setUnit(editEntry.unit ?? "cup");
    setMemo(editEntry.memo ?? "");
    setSearch(editEntry.drinkName ?? "");
    setSearchQuery(editEntry.drinkName ?? "");

    const matched =
      recipeItems.find((item) => item.id === editEntry.drinkId) ??
      recipeItems.find(
        (item) =>
          item.name.trim().toLowerCase() ===
          String(editEntry.drinkName ?? "")
            .trim()
            .toLowerCase(),
      );

    setPicked(matched ?? buildFallbackItemFromEntry(editEntry));
  }, [editEntry, recipeItems]);

  useEffect(() => {
    if (!user) {
      let cancelled = false;

      const run = async () => {
        const entries = await listEntries();
        if (!cancelled) {
          setEntryHistory(entries);
        }
      };

      void run();

      return () => {
        cancelled = true;
      };
    }

    const entriesRef = collection(db, "users", user.uid, "entries");
    const entriesQ = query(
      entriesRef,
      orderBy("consumedAt", "desc"),
      limit(200),
    );

    const unsub = onSnapshot(entriesQ, (snap) => {
      setEntryHistory(snap.docs.map((d) => d.data()));
    });

    return unsub;
  }, [user]);

  useEffect(() => {
    const nextDate = parseDateParam(params.date);
    if (!nextDate) return;
    setDate(nextDate);
    setConsumedAt((prev) => mergeDatePart(nextDate, prev));
  }, [params.date]);

  useEffect(() => {
    let cancelled = false;

    listVisibleToppings()
      .then((items) => {
        if (!cancelled) setToppingItems(items);
      })
      .catch((error) => {
        console.error("토핑 조회 실패:", error);
        if (!cancelled) setToppingsError("토핑을 불러오지 못했어요.");
      })
      .finally(() => {
        if (!cancelled) setToppingsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!editEntry) return;
    setSelectedToppings(editEntry.toppings ?? []);
  }, [editEntry]);

  const amountHintText = useMemo(() => {
    if (unit !== "cup") return null;
    if (!picked) return null;
    const defaultMl = Math.max(1, Math.round(Number(picked.mlPerServing ?? 0)));
    if (!defaultMl) return null;
    return `1잔 = ${defaultMl}mL에요!`;
  }, [picked, unit]);

  const handleSelectUnit = (nextUnit: string) => {
    if (nextUnit === unit) return;

    const defaultMl = Math.max(
      1,
      Math.round(Number(picked?.mlPerServing ?? 200)),
    );
    const rawAmount = Number(servings);

    if (nextUnit === "ml") {
      const cupAmount =
        Number.isFinite(rawAmount) && rawAmount > 0 ? rawAmount : 1;
      setServings(String(Math.max(1, Math.round(cupAmount * defaultMl))));
      setUnit("ml");
      return;
    }

    const mlAmount =
      Number.isFinite(rawAmount) && rawAmount > 0 ? rawAmount : defaultMl;
    setServings(String(Math.max(1, Math.round(mlAmount / defaultMl))));
    setUnit("cup");
  };

  const onPick = (item: Item) => {
    if (picked?.id !== item.id) {
      setSelectedToppings([]);
    }
    setPicked(item);
    setSearch(item.name);
    setSearchQuery(item.name);
    setSearchModalOpen(false);
    setQuickPickOpen(false);
  };

  const searchItems = useMemo(() => {
    return recipeItems.map((item) => ({
      ...item,
      popularityScore: Number(item.globalPopularityScore ?? 0),
    }));
  }, [recipeItems]);

  const { frequentItems, recentItems } = useMemo(() => {
    const byRecipeId = new Map<string, Item>();
    const byName = new Map<string, Item>();
    recipeItems.forEach((item) => {
      byRecipeId.set(item.id, item);
      byName.set(item.name.trim().toLowerCase(), item);
    });

    const getResolvedItem = (entry: any, index: number): Item | null => {
      const drinkName = String(entry?.drinkName ?? "").trim();
      if (!drinkName) return null;

      const drinkId =
        typeof entry?.drinkId === "string" ? entry.drinkId : undefined;
      const matched =
        (drinkId ? byRecipeId.get(drinkId) : undefined) ??
        byName.get(drinkName.toLowerCase());

      const category =
        (entry?.category as string | undefined) ?? matched?.category;
      const isWaterOnly = Boolean(entry?.isWaterOnly ?? matched?.isWaterOnly);
      const drinkIconKey = resolveDrinkIconKey({
        drinkIconKey:
          matched?.drinkIconKey ?? (entry?.drinkIconKey as string | undefined),
        name: matched?.name ?? drinkName,
        category,
        isWaterOnly,
      });

      return {
        id: matched?.id ?? drinkId ?? `history-${index}-${drinkName}`,
        name: matched?.name ?? drinkName,
        category,
        normalizedName: matched?.normalizedName,
        aliases: matched?.aliases,
        searchKeywords: matched?.searchKeywords,
        drinkIconKey,
        iconUrl: matched?.iconUrl ?? null,
        ingredientIconUrl:
          (entry?.calendarIconUrl as string | undefined) ??
          matched?.ingredientIconUrl ??
          null,
        calendarIconKey: resolveCalendarIconKey({
          calendarIconKey: entry?.iconKey ?? matched?.calendarIconKey,
          name: matched?.name ?? drinkName,
          category,
          isWaterOnly,
        }),
        mlPerServing: matched?.mlPerServing,
        caffeineMgPerServing: matched?.caffeineMgPerServing,
        sugarGPerServing: matched?.sugarGPerServing,
        calorieKcalPerServing: matched?.calorieKcalPerServing,
        isWaterOnly,
      };
    };

    const recent: Item[] = [];
    const seenRecent = new Set<string>();
    entryHistory.forEach((entry, index) => {
      const item = getResolvedItem(entry, index);
      if (!item) return;
      const key = item.id || item.name.trim().toLowerCase();
      if (seenRecent.has(key)) return;
      seenRecent.add(key);
      recent.push(item);
    });

    const countMap = new Map<
      string,
      { item: Item; count: number; latestMs: number }
    >();
    entryHistory.forEach((entry, index) => {
      const item = getResolvedItem(entry, index);
      if (!item) return;
      const key = item.id || item.name.trim().toLowerCase();
      const consumedAtMs =
        typeof entry?.consumedAt?.toMillis === "function"
          ? Number(entry.consumedAt.toMillis())
          : 0;

      const prev = countMap.get(key);
      if (!prev) {
        countMap.set(key, { item, count: 1, latestMs: consumedAtMs });
        return;
      }
      prev.count += 1;
      prev.latestMs = Math.max(prev.latestMs, consumedAtMs);
    });

    const frequent = Array.from(countMap.values())
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return b.latestMs - a.latestMs;
      })
      .map((v) => v.item);

    return {
      frequentItems: frequent.slice(0, 8),
      recentItems: recent.slice(0, 12),
    };
  }, [entryHistory, recipeItems]);

  const onSearch = () => {
    setSearchQuery(search);
    setSearchModalOpen(true);
  };

  const onSave = async () => {
    if (saving) return;
    if (!picked) {
      Alert.alert("알림", "음료를 선택해 주세요.");
      return;
    }

    setSaving(true);
    try {
      const payload = buildEntryPayload({
        drinkName: picked.name,
        drinkId: picked.id,
        iconKey: resolveCalendarIconKey({
          calendarIconKey: picked.calendarIconKey,
          name: picked.name,
          category: picked.category,
          isWaterOnly: picked.isWaterOnly,
        }),
        calendarIconUrl: picked.ingredientIconUrl ?? null,
        mlPerServing: picked.mlPerServing,
        caffeineMgPerServing: picked.caffeineMgPerServing,
        sugarGPerServing: picked.sugarGPerServing,
        calorieKcalPerServing: picked.calorieKcalPerServing,
        isWaterOnly: picked.isWaterOnly,

        date,
        consumedAt,

        unit: unit as "cup" | "ml",
        amount: Number(servings),

        memo,
        toppings: selectedToppings,
        brandLabel: brand,
      });

      if (isEditMode) {
        if (!entryId) return;
        const { createdAt: _createdAt, ...patch } = payload;
        await updateEntry(entryId, patch);
        Alert.alert("수정 완료", "기록을 수정했어요.", [
          {
            text: "확인",
            onPress: () => router.back(),
          },
        ]);
      } else {
        await saveEntry(payload);
        setSaveDone(true);
      }
    } catch (e: any) {
      Alert.alert("저장 실패", String(e?.message ?? e));
    } finally {
      setSaving(false);
    }
  };

  const handleFocusMemo = () => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 120);
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 320);
  };

  function handleSelectTopping(item: Topping) {
    setSelectedToppings((prev) => {
      if (prev.some((topping) => topping.toppingId === item.id)) {
        return prev.filter((topping) => topping.toppingId !== item.id);
      }
      return [
        ...prev,
        {
          toppingId: item.id,
          name: item.name,
          brand: item.brand ?? null,
          servingLabel: item.servingLabel,
          quantity: 1,
          calories: item.calories ?? null,
          caffeine: item.caffeine ?? null,
          sugar: item.sugar ?? null,
          nutritionType: item.nutritionType,
          iconKey: item.iconKey ?? null,
          iconUrl: item.iconUrl ?? null,
        },
      ];
    });
  }

  function changeToppingQuantity(toppingId: string, delta: number) {
    setSelectedToppings((prev) =>
      prev.map((item) =>
        item.toppingId === toppingId
          ? { ...item, quantity: Math.max(1, item.quantity + delta) }
          : item,
      ),
    );
  }

  function removeTopping(toppingId: string) {
    setSelectedToppings((prev) =>
      prev.filter((item) => item.toppingId !== toppingId),
    );
  }

  const toppingNutrition = calculateToppingNutrition(selectedToppings);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.container}>
        {editLoading ? (
          <View style={styles.editLoadingOverlay}>
            <AppText preset="body">기록을 불러오는 중이에요...</AppText>
          </View>
        ) : null}
        <KeyboardAvoidingView
          style={styles.keyboardAvoiding}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "android" ? 72 : 0}
        >
          {/* Body */}
          <ScrollView
            ref={scrollRef}
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            automaticallyAdjustKeyboardInsets
          >
            {/* 날짜 */}
            <Text style={styles.sectionTitle}>날짜</Text>
            <Pressable
              style={styles.fieldRow}
              onPress={() => setDatePickerOpen(true)}
            >
              <Text style={styles.fieldText}>{formatDateDot(date)}</Text>
              <Image source={calendar} style={styles.icon} />
            </Pressable>

            {/* 음료 */}
            <View style={styles.searchBar}>
              <Text style={[styles.sectionTitle, { marginTop: 14 }]}>
                음료 이름
              </Text>
              <Pressable
                style={styles.quickBtn}
                onPress={() => setQuickPickOpen(true)}
                hitSlop={8}
              >
                <View style={styles.quickBtnRow}>
                  <Image source={clock} style={styles.icon} />
                  <Text style={styles.quickBtnText}>빠르게 불러오기</Text>
                </View>
              </Pressable>
            </View>
            <Pressable style={styles.fieldRow} onPress={onSearch}>
              <Text style={styles.fieldTextMuted}>
                {picked?.name ?? "음료를 검색해 주세요"}
              </Text>
              <Image source={searchIcon} style={styles.icon} />
            </Pressable>

            {/* 브랜드(선택) */}
            <Text style={[styles.sectionTitle, { marginTop: 14 }]}>
              어디서 마셨나요? (선택)
            </Text>
            <PlaceholderTextField
              value={brand}
              onChangeText={setBrand}
              placeholder="예) 집, 회사, 스타벅스"
              style={styles.brandInput}
              placeholderStyle={styles.brandPlaceholder}
            />

            {/* 양 & 사이즈 */}
            <View style={[styles.sectionHeaderRow, { marginTop: 14 }]}>
              <Text style={[styles.sectionTitle, styles.sectionTitleInline]}>
                양 & 사이즈
              </Text>
              <View style={styles.tooltipAnchor}>
                <Pressable
                  hitSlop={8}
                  onPress={() => setSizeGuideToolTipOpen((prev) => !prev)}
                >
                  <Ionicons
                    name="help-circle-outline"
                    size={18}
                    color={COLORS.semantic.textSecondary}
                  />
                </Pressable>

                {sizeGuideToolTipOpen ? (
                  <View style={styles.tooltipBubble}>
                    <View style={styles.tooltipArrow} />

                    <View style={styles.tooltipBubbleHeader}>
                      <AppText style={styles.tooltipBubbleTitle}>
                        음료 사이즈 기준
                      </AppText>

                      <Pressable
                        hitSlop={8}
                        onPress={() => setSizeGuideToolTipOpen(false)}
                      >
                        <Ionicons
                          name="close"
                          size={16}
                          color={COLORS.semantic.textPrimary}
                        />
                      </Pressable>
                    </View>

                    <AppText style={styles.tooltipBubbleText}>
                      {SIZE_GUIDE_TOOLTIP_TEXT}
                    </AppText>
                  </View>
                ) : null}
              </View>
            </View>
            <View style={styles.amountRow}>
              <View style={styles.amountBox}>
                <TextField
                  value={servings}
                  onChangeText={(t) => {
                    const digitsOnly = t.replace(/[^0-9]/g, "");

                    if (digitsOnly === "") {
                      setServings("");
                      return;
                    }

                    const n = Math.min(Math.max(Number(digitsOnly), 1), 9999);
                    setServings(String(n));
                  }}
                  onBlur={() => {
                    if (servings.trim() === "") setServings("1");
                  }}
                  keyboardType="number-pad"
                  style={styles.amountInput}
                />
              </View>

              <Pressable
                style={styles.amountSelect}
                onPress={() => setUnitModal(true)}
              >
                <Text style={styles.amountSelectText}>
                  {unit === "cup" ? "잔" : "mL"}
                </Text>
                <Text style={styles.fieldIcon}>▾</Text>
              </Pressable>
              {amountHintText ? (
                <Text style={styles.amountHint}>{amountHintText}</Text>
              ) : null}
            </View>
            {/* 마신 시간 */}
            <Text style={[styles.sectionTitle, { marginTop: 14 }]}>
              마신 시간
            </Text>
            <Pressable
              style={styles.fieldRow}
              onPress={() => setTimePickerOpen(true)}
            >
              <Text style={styles.fieldText}>{formatTime(consumedAt)}</Text>
              <Image source={clock} style={styles.icon} />
            </Pressable>

            {/* 토핑 */}
            <View style={styles.toppingHeading}>
              <Text style={styles.sectionTitle}>토핑 (선택)</Text>
              {selectedToppings.length > 0 && (
                <Text style={styles.toppingCount}>{selectedToppings.length}종 선택</Text>
              )}
            </View>
            <Pressable
              style={({ pressed }) => [styles.toppingAddButton, pressed && styles.toppingPressed]}
              onPress={() => setToppingModalOpen(true)}
              accessibilityRole="button"
            >
              <Ionicons name="add-circle-outline" size={20} color={COLORS.primary.caramel} />
              <Text style={styles.toppingAddText}>토핑 추가하기</Text>
              <Ionicons name="chevron-forward" size={16} color={COLORS.primary.caramel} />
            </Pressable>

            {selectedToppings.map((item) => (
              <View key={item.toppingId} style={styles.toppingRow}>
                <View style={styles.toppingCardHeader}>
                  <View style={styles.toppingIconWrap}>
                    <ToppingIcon iconKey={item.iconKey} iconUrl={item.iconUrl} size={32} />
                  </View>
                  <View style={styles.toppingInfo}>
                    <Text style={styles.toppingName}>{item.name}</Text>
                    {item.brand ? <Text style={styles.toppingCaption}>{item.brand}</Text> : null}
                  </View>
                  <Pressable
                    style={({ pressed }) => [styles.toppingRemove, pressed && styles.toppingPressed]}
                    accessibilityRole="button"
                    accessibilityLabel={`${item.name} 삭제`}
                    onPress={() => removeTopping(item.toppingId)}
                  >
                    <Ionicons name="close" size={20} color={COLORS.semantic.textSecondary} />
                  </Pressable>
                </View>
                <View style={styles.toppingCardFooter}>
                  <Text style={[styles.toppingCaption, styles.toppingServing]}>
                    1회 기준 · {item.servingLabel}
                  </Text>
                  <View style={styles.toppingStepper}>
                    <Pressable
                      style={({ pressed }) => [styles.toppingAction, pressed && styles.toppingPressed]}
                      disabled={item.quantity <= 1}
                      accessibilityRole="button"
                      accessibilityState={{ disabled: item.quantity <= 1 }}
                      accessibilityLabel={`${item.name} 수량 줄이기`}
                      onPress={() => changeToppingQuantity(item.toppingId, -1)}
                    >
                      <Ionicons name="remove" size={18} color={item.quantity <= 1 ? COLORS.ui.disabledText : COLORS.semantic.textPrimary} />
                    </Pressable>
                    <Text style={styles.toppingQuantity} accessibilityLiveRegion="polite">{item.quantity}회</Text>
                    <Pressable
                      style={({ pressed }) => [styles.toppingAction, pressed && styles.toppingPressed]}
                      accessibilityRole="button"
                      accessibilityLabel={`${item.name} 수량 늘리기`}
                      onPress={() => changeToppingQuantity(item.toppingId, 1)}
                    >
                      <Ionicons name="add" size={18} color={COLORS.semantic.textPrimary} />
                    </Pressable>
                  </View>
                </View>
              </View>
            ))}

            {selectedToppings.length > 0 && (
              <View style={styles.toppingSummary}>
                <Text style={styles.toppingName}>토핑으로 추가되는 영양정보</Text>
                <View style={styles.toppingNutrients}>
                  <Text style={styles.toppingNutrient}>열량 {Number(toppingNutrition.calories.toFixed(1))} kcal</Text>
                  <Text style={styles.toppingNutrient}>카페인 {Number(toppingNutrition.caffeine.toFixed(1))} mg</Text>
                  <Text style={styles.toppingNutrient}>당류 {Number(toppingNutrition.sugar.toFixed(1))} g</Text>
                </View>
                <Text style={styles.toppingCaption}>횟수는 잔당이 아닌, 이 기록 전체에 추가한 양이에요.</Text>
                {toppingNutrition.hasUnknownNutrition && (
                  <Text style={styles.toppingWarning}>일부 영양정보가 없어 확인된 값만 표시해요.</Text>
                )}
              </View>
            )}

            {/* 메모 */}
            <Text style={[styles.sectionTitle, { marginTop: 14 }]}>
              메모 (선택)
            </Text>
            <PlaceholderTextField
              value={memo}
              onChangeText={setMemo}
              placeholder="이 음료는 어땠나요?"
              style={styles.memo}
              placeholderStyle={styles.memoPlaceholder}
              multiline
              onFocus={handleFocusMemo}
            />
          </ScrollView>
        </KeyboardAvoidingView>

        {/* 저장 버튼 */}
        <View style={{ paddingHorizontal: 16, paddingVertical: 22 }}>
          <AppButton
            label={isEditMode ? "수정" : "저장"}
            variant="primary"
            onPress={onSave}
            loading={saving}
          />
        </View>

        {/* 검색/추천 모달 */}
        <DrinkSearchModal
          visible={searchModalOpen}
          query={searchQuery}
          items={searchItems}
          onChangeQuery={setSearchQuery}
          onPick={onPick}
          onClose={() => setSearchModalOpen(false)}
        />

        <DrinkQuickPickModal
          visible={quickPickOpen}
          onClose={() => setQuickPickOpen(false)}
          frequent={frequentItems}
          recent={recentItems}
          onPick={onPick}
        />

        <ToppingSelectModal
          visible={toppingModalOpen}
          items={toppingItems}
          loading={toppingsLoading}
          error={toppingsError}
          selectedIds={selectedToppings.map((item) => item.toppingId)}
          onSelect={handleSelectTopping}
          onClose={() => setToppingModalOpen(false)}
        />

        {/* Select 모달들 */}
        <SelectModal
          visible={unitModal}
          title="단위 선택"
          options={UNIT_OPTIONS}
          value={unit}
          onClose={() => setUnitModal(false)}
          onSelect={handleSelectUnit}
        />
        <SelectModal
          visible={sizeModal}
          title="사이즈 선택"
          options={SIZE_OPTIONS}
          value={sizeLabel}
          onClose={() => setSizeModal(false)}
          onSelect={setSizeLabel}
        />

        {/* 날짜/시간 피커 */}
        {Platform.OS === "ios" ? (
          <>
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
                    value={date}
                    mode="date"
                    display="spinner"
                    style={styles.picker}
                    onChange={(_, selected) => {
                      if (selected) {
                        setDate(selected);
                        setConsumedAt((prev) => mergeDatePart(selected, prev));
                      }
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

            <Modal
              transparent
              visible={timePickerOpen}
              animationType="fade"
              onRequestClose={() => setTimePickerOpen(false)}
            >
              <Pressable
                style={styles.modalOverlay}
                onPress={() => setTimePickerOpen(false)}
              />
              <View style={styles.pickerCard}>
                <Text style={styles.modalTitle}>시간 선택</Text>
                <View style={styles.pickerWrap}>
                  <DateTimePicker
                    value={consumedAt}
                    mode="time"
                    display="spinner"
                    style={styles.picker}
                    onChange={(_, selected) => {
                      if (selected) setConsumedAt(selected);
                    }}
                  />
                </View>
                <AppButton
                  label="완료"
                  variant="primary"
                  onPress={() => setTimePickerOpen(false)}
                />
              </View>
            </Modal>
          </>
        ) : (
          <>
            {datePickerOpen && (
              <DateTimePicker
                value={date}
                mode="date"
                display="default"
                onChange={(_, selected) => {
                  setDatePickerOpen(false);
                  if (selected) {
                    setDate(selected);
                    setConsumedAt((prev) => mergeDatePart(selected, prev));
                  }
                }}
              />
            )}
            {timePickerOpen && (
              <DateTimePicker
                value={consumedAt}
                mode="time"
                display="default"
                onChange={(_, selected) => {
                  setTimePickerOpen(false);
                  if (selected) setConsumedAt(selected);
                }}
              />
            )}
          </>
        )}

        {/* 저장 완료 모달 */}
        {!isEditMode ? (
          <SaveResultModal
            visible={saveDone}
            onGoHome={() => {
              setSaveDone(false);
              router.replace("/(tabs)");
            }}
            onContinue={() => {
              setSaveDone(false);
              setPicked(null);
              setSearch("");
              setBrand("");
              setServings("1");
              setUnit("cup");
              setSizeLabel("M");
              setMemo("");
              setSelectedToppings([]);
              setToppingModalOpen(false);
              Alert.alert("안내", "계속 기록해 보아요!");
            }}
          />
        ) : null}
      </View>
    </SafeAreaView>
  );
};

export default RecordCreateScreen;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "transparent" },
  container: { flex: 1, paddingTop: 20, paddingHorizontal: 20 },
  keyboardAvoiding: {
    flex: 1,
  },
  editLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.75)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  searchWrap: {
    paddingHorizontal: 16,
    paddingTop: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchFieldWrap: {
    flex: 1,
  },
  searchInputContainer: {
    height: 44,
    borderWidth: 1,
    borderColor: COLORS.ui.border,
    backgroundColor: "#F3EDE5",
    borderRadius: 14,
  },
  searchInputText: {
    fontFamily: TYPOGRAPHY.fontFamily.title,
    fontSize: TYPOGRAPHY.size.body,
    lineHeight: 18,
    color: COLORS.semantic.textPrimary,
    paddingVertical: 0,
    textAlignVertical: "center",
  },
  quickBtn: {
    height: 36,

    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  quickBtnRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  quickBtnText: {
    ...TYPOGRAPHY.preset.caption,
    color: COLORS.semantic.textSecondary,
  },
  searchBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 20,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 28,
  },
  sectionTitle: {
    ...TYPOGRAPHY.preset.h3,
    color: COLORS.semantic.textPrimary,
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sectionTitleInline: {
    marginBottom: 0,
  },
  card: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.ui.border,
    backgroundColor: COLORS.semantic.surface,
  },
  label: {
    ...TYPOGRAPHY.preset.caption,
    color: COLORS.semantic.textSecondary,
    marginBottom: 6,
  },
  value: { ...TYPOGRAPHY.preset.h3, color: COLORS.semantic.textPrimary },
  fieldRow: {
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.ui.border,
    backgroundColor: COLORS.semantic.surface,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "space-between",
    flexDirection: "row",
  },
  fieldText: { ...TYPOGRAPHY.preset.body, color: COLORS.semantic.textPrimary },
  fieldTextMuted: {
    ...TYPOGRAPHY.preset.body,
    color: COLORS.semantic.textSecondary,
  },
  fieldIcon: {
    ...TYPOGRAPHY.preset.body,
    color: COLORS.semantic.textSecondary,
  },
  placeholderFieldWrap: {
    position: "relative",
  },
  customPlaceholder: {
    position: "absolute",
    top: 15,
    left: 22,
    right: 22,
    zIndex: 1,
    ...TYPOGRAPHY.preset.body,
    color: COLORS.semantic.textMuted,
  },
  brandPlaceholder: {
    top: 13,
    left: 14,
    right: 14,
  },
  memoPlaceholder: {
    top: 8,
    left: 14,
    right: 14,
  },

  icon: {
    width: 24,
    height: 24,
  },
  brandInput: {
    height: 44,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingTop: 0,
    paddingBottom: 0,
    textAlignVertical: "center",
    lineHeight: 18,
  },

  amountRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    flexWrap: "wrap",
  },
  amountBox: {
    width: 70,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.ui.border,
    backgroundColor: COLORS.semantic.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  amountInput: {
    width: "100%",
    height: "100%",
    borderWidth: 0,
    borderRadius: 0,
    backgroundColor: "transparent",
    paddingHorizontal: 0,
    paddingVertical: 0,
    textAlign: "center",
    textAlignVertical: "center",
    ...TYPOGRAPHY.preset.body,
    color: COLORS.semantic.textPrimary,
    lineHeight: 18,
  },
  amountSelect: {
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.ui.border,
    backgroundColor: COLORS.semantic.surface,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "space-between",
    flexDirection: "row",
  },
  amountSelectText: {
    ...TYPOGRAPHY.preset.body,
    color: COLORS.semantic.textPrimary,
  },
  amountHint: {
    ...TYPOGRAPHY.preset.caption,
    color: COLORS.semantic.textSecondary,
  },
  tooltipAnchor: {
    position: "relative",
  },
  tooltipBubble: {
    position: "absolute",
    top: 26,
    left: -50,
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
    left: 50,
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
  memo: {
    minHeight: 92,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.ui.border,
    backgroundColor: COLORS.semantic.surface,
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 12,
    color: COLORS.semantic.textPrimary,
    textAlignVertical: "top",
  },

  // 모달
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.ui.overlayBrown40,
  },
  modalCard: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 24,
    borderRadius: 18,
    padding: 16,
    backgroundColor: COLORS.semantic.surface,
    borderWidth: 1,
    borderColor: COLORS.ui.border,
  },
  pickerCard: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 24,
    borderRadius: 18,
    padding: 16,
    backgroundColor: COLORS.semantic.surface,
    borderWidth: 1,
    borderColor: COLORS.ui.border,
  },
  pickerWrap: {
    marginTop: 8,
    marginBottom: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 160,
  },
  picker: {
    width: "100%",
    height: 160,
  },
  modalTitle: { ...TYPOGRAPHY.preset.h3, color: COLORS.semantic.textPrimary },
  modalRow: {
    height: 44,
    borderRadius: 14,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.semantic.surface,
    borderWidth: 1,
    borderColor: COLORS.ui.border,
    marginTop: 10,
  },
  modalRowSelected: {
    backgroundColor: COLORS.semantic.surfaceAlt ?? COLORS.semantic.surface,
    borderColor: COLORS.semantic.primary,
  },
  modalRowText: {
    ...TYPOGRAPHY.preset.body,
    color: COLORS.semantic.textPrimary,
  },
  modalRowTextSelected: {
    ...TYPOGRAPHY.preset.body,
    color: COLORS.semantic.textPrimary,
  },
  toppingRow: {
    marginTop: 10,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.ui.border,
    backgroundColor: COLORS.base.creamPaper,
    gap: 12,
  },
  toppingHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 18,
    gap: 8,
  },
  toppingCount: {
    ...TYPOGRAPHY.preset.caption,
    color: COLORS.primary.caramel,
  },
  toppingAddButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: COLORS.primary.latte,
    borderRadius: 14,
    backgroundColor: COLORS.base.creamPaper,
  },
  toppingAddText: {
    ...TYPOGRAPHY.preset.body,
    color: COLORS.primary.caramel,
    flex: 1,
  },
  toppingCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  toppingIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.semantic.background,
  },
  toppingInfo: { flex: 1, minWidth: 0, gap: 2 },
  toppingName: {
    ...TYPOGRAPHY.preset.body,
    color: COLORS.semantic.textPrimary,
  },
  toppingCaption: {
    ...TYPOGRAPHY.preset.caption,
    color: COLORS.semantic.textSecondary,
  },
  toppingRemove: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
  },
  toppingCardFooter: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  toppingServing: { flexGrow: 1, flexShrink: 1, flexBasis: 100 },
  toppingStepper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: COLORS.semantic.background,
  },
  toppingQuantity: {
    ...TYPOGRAPHY.preset.numberSm,
    color: COLORS.semantic.textPrimary,
    minWidth: 40,
    textAlign: "center",
  },
  toppingSummary: {
    marginTop: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: COLORS.base.warmBeige,
    gap: 8,
  },
  toppingNutrients: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  toppingNutrient: {
    ...TYPOGRAPHY.preset.caption,
    color: COLORS.semantic.textPrimary,
    backgroundColor: COLORS.base.creamPaper,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  toppingWarning: {
    ...TYPOGRAPHY.preset.caption,
    color: COLORS.primary.espresso,
  },
  toppingPressed: {
    opacity: 0.6,
  },
  toppingAction: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
});
