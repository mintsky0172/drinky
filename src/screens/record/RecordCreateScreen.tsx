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
import React, { useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import TextField from "@/src/components/ui/TextField";
import { COLORS } from "@/src/constants/colors";
import AppButton from "@/src/components/ui/AppButton";
import DrinkSearchOverlay from "@/src/components/record/DrinkSearchOverlay";
import SaveResultModal from "@/src/components/record/SaveResultModal";
import { TYPOGRAPHY } from "@/src/constants/typography";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import buildEntryPayload from "@/src/lib/entries/buildEntryPayload";
import { addEntry } from "@/src/lib/entries/entriesApi";

type Item = { id: string; name: string };
type Option = { value: string; label: string };

const pad2 = (n: number) => String(n).padStart(2, "0");
const formatDateKey = (d: Date) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
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
  // 검색/선택
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [picked, setPicked] = useState<Item | null>(null);

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

  // 더미데이터
  const frequent: Item[] = [
    { id: "1", name: "아이스 아메리카노" },
    { id: "2", name: "물" },
    { id: "3", name: "바닐라 라떼" },
  ];

  const recent: Item[] = [
    { id: "4", name: "말차 프라푸치노" },
    { id: "5", name: "오렌지 주스" },
  ];

  const unitLabel = useMemo(
    () => UNIT_OPTIONS.find((o) => o.value === unit)?.label ?? "잔",
    [unit],
  );

  const helperText = useMemo(() => {
    if (unit === "ml") return null;
    const baseMl = 200; // TODO: 레시피/사이즈 연결되면 바꾸기
    return `1잔 = ${baseMl}mL에요!`;
  }, [unit]);

  const onPick = (item: Item) => {
    setPicked(item);
    setSearch(item.name);
    setSearchOpen(false);
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
            drinkId: undefined,
            iconKey: undefined,

            date,
            consumedAt,

            unit: unit as 'cup' | 'ml',
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
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.container}>
        {/* 서치바(상단 고정) */}
        <Pressable
          onPress={() => setSearchOpen(true)}
          style={styles.searchWrap}
        >
          <TextField
            value={search}
            onChangeText={setSearch}
            placeholder="음료 검색"
            placeholderTextColor={COLORS.semantic.textSecondary}
            containerStyle={styles.searchInputContainer}
            style={styles.searchInputText}
            leftIcon={
              <Ionicons
                name="search"
                size={18}
                color={COLORS.semantic.textSecondary}
              />
            }
            editable={false}
            pointerEvents="none"
          />
        </Pressable>

        {/* Body */}
        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
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
          <Text style={[styles.sectionTitle, { marginTop: 14 }]}>
            음료 이름
          </Text>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldTextMuted}>
              {picked?.name ?? "검색창에서 음료를 선택해 주세요"}
            </Text>
          </View>

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
          />
        </ScrollView>

        {/* 저장 버튼 */}
        <View style={{ paddingHorizontal: 16, paddingVertical: 22 }}>
          <AppButton label="저장" variant="primary" onPress={onSave} loading={saving} />
        </View>

        {/* 오버레이 + 저장 모달 */}
        <DrinkSearchOverlay
          visible={searchOpen}
          onClose={() => setSearchOpen(false)}
          frequent={frequent}
          recent={recent}
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
