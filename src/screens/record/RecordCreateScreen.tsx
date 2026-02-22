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
} from "react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import TextField from "@/src/components/ui/TextField";
import { COLORS } from "@/src/constants/colors";
import AppButton from "@/src/components/ui/AppButton";
import DrinkSearchModal from "@/src/components/record/DrinkSearchModal";
import DrinkQuickPickModal from "@/src/components/record/DrinkQuickPickModal";
import SaveResultModal from "@/src/components/record/SaveResultModal";
import { TYPOGRAPHY } from "@/src/constants/typography";
import { useRouter } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import buildEntryPayload from "@/src/lib/entries/buildEntryPayload";
import { addEntry } from "@/src/lib/entries/entriesApi";
import { db } from "@/src/lib/firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import {
  DRINK_ICONS,
  DrinkIconKey,
  INGREDIENT_ICONS,
  IngredientIconKey,
} from "@/src/constants/icons";

type Item = {
  id: string;
  name: string;
  category?: string;
  normalizedName?: string;
  aliases?: string[];
  searchKeywords?: string[];
  drinkIconKey?: string;
  calendarIconKey?: string;
  mlPerServing?: number;
  caffeineMgPerServing?: number;
  sugarGPerServing?: number;
  isWaterOnly?: boolean;
};
type Option = { value: string; label: string };

const pad2 = (n: number) => String(n).padStart(2, "0");
const formatDateDot = (d: Date) =>
  `${d.getFullYear()}.${pad2(d.getMonth() + 1)}.${pad2(d.getDate())}`;
const formatTime = (d: Date) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

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

const FREQUENT_ITEMS: Item[] = [
  { id: "1", name: "아이스 아메리카노", drinkIconKey: "ice_americano", calendarIconKey: "bean", mlPerServing: 355, caffeineMgPerServing: 120, sugarGPerServing: 0, isWaterOnly: false },
  { id: "2", name: "물", calendarIconKey: "water", mlPerServing: 200, caffeineMgPerServing: 0, sugarGPerServing: 0, isWaterOnly: true },
  { id: "3", name: "바닐라 라떼", drinkIconKey: "ice_cafe_latte", calendarIconKey: "bean", mlPerServing: 355, caffeineMgPerServing: 100, sugarGPerServing: 20, isWaterOnly: false },
];

const RECENT_ITEMS: Item[] = [
  { id: "4", name: "말차 프라푸치노", drinkIconKey: "matcha_frappe", calendarIconKey: "leaf", mlPerServing: 473, caffeineMgPerServing: 80, sugarGPerServing: 45, isWaterOnly: false },
  { id: "5", name: "오렌지 주스", drinkIconKey: "orange_juice", calendarIconKey: "default", mlPerServing: 355, caffeineMgPerServing: 0, sugarGPerServing: 30, isWaterOnly: false },
];

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
    if (name.includes("프라푸치노") || category === "smoothie") return "matcha_frappe";
    if (name.includes("아이스")) return "ice_matcha_latte";
    return "matcha_latte";
  }
  if (name.includes("라떼") || category === "latte" || category === "milk") return "ice_cafe_latte";
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
  return mapped in INGREDIENT_ICONS
    ? (mapped as IngredientIconKey)
    : "default";
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
  const scrollRef = useRef<ScrollView>(null);
  // 검색/선택
  const [search, setSearch] = useState("");
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [quickPickOpen, setQuickPickOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [picked, setPicked] = useState<Item | null>(null);
  const [recipeItems, setRecipeItems] = useState<Item[]>([]);

  // 폼 상태
  const [date, setDate] = useState<Date>(new Date());
  const [consumedAt, setConsumedAt] = useState<Date>(new Date());

  const [brand, setBrand] = useState<string>("");

  const [servings, setServings] = useState<string>("1");
  const [unit, setUnit] = useState<string>("cup");
  const [unitModal, setUnitModal] = useState(false);

  const [sizeLabel, setSizeLabel] = useState<string>("M");
  const [sizeModal, setSizeModal] = useState(false);

  const [memo, setMemo] = useState("");

  // 날짜/시간 피커
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [timePickerOpen, setTimePickerOpen] = useState(false);

  const [saveDone, setSaveDone] = useState(false);
  const [saving, setSaving] = useState(false);

  const calendar = require("@/assets/tabs/calendar_inactive.png");
  const clock = require("@/assets/icons/etc/clock.png");
  const searchIcon = require('@/assets/icons/etc/search.png');

  useEffect(() => {
    const recipesRef = collection(db, "recipes");
    const recipesQ = query(recipesRef, where("isPublic", "==", true));

    const unsub = onSnapshot(recipesQ, (snap) => {
      const rows = snap.docs.map((d) => {
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
          calendarIconKey: resolveCalendarIconKey({
            calendarIconKey: data.calendarIconKey,
            name: data.name as string | undefined,
            category: data.category as string | undefined,
            isWaterOnly: data.isWaterOnly as boolean | undefined,
          }),
          mlPerServing: data.mlPerServing as number | undefined,
          caffeineMgPerServing: data.caffeineMgPerServing as number | undefined,
          sugarGPerServing: data.sugarGPerServing as number | undefined,
          isWaterOnly: data.isWaterOnly as boolean | undefined,
        } satisfies Item;
      }).filter((item) => item.name.trim().length > 0);

      setRecipeItems(rows);
    });

    return unsub;
  }, []);

  const helperText = useMemo(() => {
    if (unit === "ml") return null;
    const baseMl = 200; // TODO: 레시피/사이즈 연결되면 바꾸기
    return `1잔 = ${baseMl}mL에요!`;
  }, [unit]);

  const onPick = (item: Item) => {
    setPicked(item);
    setSearch(item.name);
    setSearchQuery(item.name);
    setSearchModalOpen(false);
    setQuickPickOpen(false);
  };

  const searchItems = useMemo(() => {
    if (recipeItems.length > 0) return recipeItems;

    const map = new Map<string, Item>();
    [...FREQUENT_ITEMS, ...RECENT_ITEMS].forEach((item) => {
      const key = item.name.trim().toLowerCase();
      if (!map.has(key)) map.set(key, item);
    });
    return Array.from(map.values());
  }, [recipeItems]);

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
        mlPerServing: picked.mlPerServing,
        caffeineMgPerServing: picked.caffeineMgPerServing,
        sugarGPerServing: picked.sugarGPerServing,
        isWaterOnly: picked.isWaterOnly,

        date,
        consumedAt,

        unit: unit as "cup" | "ml",
        amount: Number(servings),

        memo,
        brandLabel: brand,
      });

      await addEntry(payload);
      setSaveDone(true);
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
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.container}>
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
                <Text style={styles.quickBtnText}>
                  빠르게 불러오기
                </Text>
              </View>
            </Pressable>
          </View>
          <Pressable style={styles.fieldRow} onPress={onSearch}>
            <Text style={styles.fieldTextMuted}>
              {picked?.name ?? "음료를 검색해 주세요"}
            </Text>
           <Image source={searchIcon} style={styles.icon}/>
          </Pressable>

          {/* 브랜드(선택) */}
          <Text style={[styles.sectionTitle, { marginTop: 14 }]}>
            어디서 마셨나요? (선택)
          </Text>
          <TextField
            value={brand}
            onChangeText={setBrand}
            placeholder="예) 집, 회사, 스타벅스"
          />

          {/* 양 & 사이즈 */}
          <Text style={[styles.sectionTitle, { marginTop: 14 }]}>
            양 & 사이즈
          </Text>
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
            {helperText ? (
              <Text style={styles.helper}>{helperText}</Text>
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

          {/* 메모 */}
          <Text style={[styles.sectionTitle, { marginTop: 14 }]}>
            메모 (선택)
          </Text>
          <TextField
            value={memo}
            onChangeText={setMemo}
            placeholder="이 음료는 어땠나요?"
            style={styles.memo}
            multiline
            onFocus={handleFocusMemo}
          />
        </ScrollView>

        {/* 저장 버튼 */}
        <View style={{ paddingHorizontal: 16, paddingVertical: 22 }}>
          <AppButton
            label="저장"
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
          frequent={FREQUENT_ITEMS}
          recent={RECENT_ITEMS}
          onPick={onPick}
        />

        {/* Select 모달들 */}
        <SelectModal
          visible={unitModal}
          title="단위 선택"
          options={UNIT_OPTIONS}
          value={unit}
          onClose={() => setUnitModal(false)}
          onSelect={setUnit}
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
                      if (selected) setDate(selected);
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
                  if (selected) setDate(selected);
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
            Alert.alert("안내", "계속 기록해 보아요!");
          }}
        />
      </View>
    </SafeAreaView>
  );
};

export default RecordCreateScreen;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "transparent" },
  container: { flex: 1, paddingTop: 20, paddingHorizontal: 20 },
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
    justifyContent: 'space-between',
    alignItems: "center",
    gap: 20
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

  icon: {
    width: 24,
    height: 24,
  },

  amountRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
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
    lineHeight: 0,
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
  helper: {
    marginTop: 8,
    ...TYPOGRAPHY.preset.caption,
    color: COLORS.semantic.textSecondary,
    textAlign: "center",
  },
  memo: {
    minHeight: 92,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.ui.border,
    backgroundColor: COLORS.semantic.surface,
    paddingHorizontal: 14,
    paddingVertical: 12,
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
});
