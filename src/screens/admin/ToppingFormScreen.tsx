import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import React, { useEffect, useState } from "react";
import {
  NutritionType,
  ToppingCategory,
  ToppingType,
} from "@/src/types/topping";
import { addDoc, collection, doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/src/lib/firebase";
import BrandField from "@/src/components/common/BrandField";
import IconPickerModal from "@/src/components/home/IconPickerModal";
import AppText from "@/src/components/ui/AppText";
import Input from "@/src/components/ui/Input";
import { COLORS } from "@/src/constants/colors";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ToppingIconKey } from "@/src/constants/icons";
import SelectField from "@/src/components/common/SelectField";
import IconSelectField from "@/src/components/common/IconSelectField";
import ToggleRow from "@/src/components/common/ToggleRow";
import ToppingIcon from "@/src/components/common/ToppingIcon";

function validateToppingForm(values: {
  name: string;
  type: ToppingType;
  brand: string;
  servingLabel: string;
}) {
  const { name, type, brand, servingLabel } = values;
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!name.trim()) {
    errors.push("토핑명을 입력해 주세요.");
  }

  if (type === "branded" && !brand.trim()) {
    errors.push("브랜드명을 입력해 주세요.");
  }

  if (!servingLabel.trim()) {
    errors.push("기준 단위를 입력해 주세요.");
  }

  return { errors, warnings };
}

const ToppingFormScreen = ({ toppingId }: { toppingId?: string }) => {
  const isEditMode = !!toppingId;
  const [loading, setLoading] = useState(isEditMode);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [iconUrl, setIconUrl] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<ToppingType>("generic");

  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState<ToppingCategory>("other");

  const [servingLabel, setServingLabel] = useState("1회 추가");

  const [calories, setCalories] = useState("");
  const [caffeine, setCaffeine] = useState("");
  const [sugar, setSugar] = useState("");

  const [nutritionType, setNutritionType] =
    useState<NutritionType>("estimated");

  const [sourceUrl, setSourceUrl] = useState("");
  const [note, setNote] = useState("");

  const [isVisible, setIsVisible] = useState(true);
  const [saving, setSaving] = useState(false);

  const [toppingIconKey, setToppingIconKey] =
    useState<ToppingIconKey>("default");
  const [iconPickerOpen, setIconPickerOpen] = useState(false);

  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);

  useEffect(() => {
    if (!toppingId) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    getDoc(doc(db, "toppings", toppingId))
      .then((snapshot) => {
        if (cancelled) return;
        if (!snapshot.exists()) throw new Error("토핑을 찾을 수 없어요.");
        const data = snapshot.data();
        setName(data.name ?? "");
        setType(data.type ?? "generic");
        setBrand(data.brand ?? "");
        setCategory(data.category ?? "other");
        setServingLabel(data.servingLabel ?? "1회 추가");
        setCalories(data.calories == null ? "" : String(data.calories));
        setCaffeine(data.caffeine == null ? "" : String(data.caffeine));
        setSugar(data.sugar == null ? "" : String(data.sugar));
        setNutritionType(data.nutritionType === "official" ? "official" : "estimated");
        setSourceUrl(data.sourceUrl ?? "");
        setNote(data.note ?? "");
        setIsVisible(data.isVisible ?? true);
        setToppingIconKey(data.iconKey ?? "default");
        setIconUrl(data.iconUrl ?? null);
        if (data.nutritionType !== "official" && data.nutritionType !== "estimated") {
          setValidationWarnings(["영양정보 유형이 없어 추정치로 표시했어요. 정확한 유형을 확인하고 저장해 주세요."]);
        }
      })
      .catch((error) => {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : "토핑을 불러오지 못했어요.");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [toppingId]);

  const canSave =
    name.trim() !== "" &&
    servingLabel.trim() !== "" &&
    (type !== "branded" || brand.trim() !== "");
    
  const parseNullableNumber = (value: string) => {
    if (value.trim() === "") return null;

    const parsed = Number(value);

    return Number.isNaN(parsed) ? null : parsed;
  };

  const resetForm = () => {
    setName("");
    setType("generic");
    setBrand("");
    setCategory("other");

    setServingLabel("1회 추가");

    setCalories("");
    setCaffeine("");
    setSugar("");

    setNutritionType("estimated");

    setSourceUrl("");
    setNote("");

    setIsVisible(true);
    setIsVisible(true);

    setToppingIconKey("default");
    setIconUrl(null);
  };

  const handleSubmit = async () => {
    if (saving || loading || loadError) return;
    if (!name.trim()) {
      Alert.alert("토핑명을 입력해 주세요.");
      return;
    }

    if (type === "branded" && !brand.trim()) {
      Alert.alert("브랜드명을 입력해 주세요.");
      return;
    }

    if (!servingLabel.trim()) {
      Alert.alert("기준 단위를 입력해 주세요.");
      return;
    }

    const { errors, warnings } = validateToppingForm({
      name,
      type,
      brand,
      servingLabel,
    });

    setValidationErrors(errors);
    setValidationWarnings(warnings);
    if (errors.length) return;

    try {
      setSaving(true);

      const payload = {
        name: name.trim(),
        type,
        category,

        brand: type === "branded" ? brand.trim() : null,

        servingLabel: servingLabel.trim(),

        calories: parseNullableNumber(calories),

        caffeine: parseNullableNumber(caffeine),

        sugar: parseNullableNumber(sugar),

        nutritionType,

        iconUrl,

        isVisible,

        sourceUrl: sourceUrl.trim() || null,

        note: note.trim() || null,

        updatedAt: serverTimestamp(),

        iconKey: toppingIconKey,
      };
      if (toppingId) {
        await updateDoc(doc(db, "toppings", toppingId), payload);
        Alert.alert("수정 완료", "토핑을 수정했어요.", [{ text: "확인", onPress: () => router.back() }]);
      } else {
        await addDoc(collection(db, "toppings"), { ...payload, createdAt: serverTimestamp() });
        Alert.alert("등록 완료", "토핑을 등록했어요.");
        resetForm();
      }
    } catch (error) {
      console.error(error);

      Alert.alert("저장 실패", "토핑 저장 중 오류가 발생했어요.");
    } finally {
      setSaving(false);
    }
  };

  if (loading || loadError) {
    return (
      <SafeAreaView style={[styles.safe, styles.center]}>
        <AppText preset="body">{loadError ?? "토핑을 불러오는 중이에요..."}</AppText>
        <Pressable onPress={() => router.back()} style={styles.saveButton}>
          <AppText preset="body">돌아가기</AppText>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.safe}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.headerRow}>
            <Pressable onPress={() => router.back()} hitSlop={8}>
              <Ionicons
                name="chevron-back"
                size={22}
                color={COLORS.semantic.textPrimary}
              />
            </Pressable>

            <AppText preset="h1">{isEditMode ? "토핑 수정" : "새 토핑 추가"}</AppText>

            <View style={{ width: 22 }} />
          </View>

          <View style={styles.sectionCard}>
            <AppText preset="h2" style={styles.sectionTitle}>
              기본 정보
            </AppText>

            <Input label="토핑명" value={name} onChangeText={setName} />

            <SelectField<ToppingType>
              label="토핑 종류"
              value={type}
              onChange={setType}
              options={[
                { label: "일반 토핑", value: "generic" },
                { label: "브랜드 토핑", value: "branded" },
              ]}
            />

            {type === "branded" && (
              <BrandField value={brand} onChangeText={setBrand} />
            )}

            <IconSelectField
              label="토핑 아이콘"
              value={toppingIconKey}
              placeholder="토핑 아이콘을 선택해 주세요"
              icon={<ToppingIcon iconKey={toppingIconKey} iconUrl={iconUrl} size={28} />}
              onPress={() => setIconPickerOpen(true)}
            />
          </View>

          <View style={styles.sectionCard}>
            <AppText preset="h2" style={styles.sectionTitle}>
              카테고리
            </AppText>
            <SelectField<ToppingCategory>
              label="토핑 카테고리"
              value={category}
              onChange={setCategory}
              options={[
                { label: "펄", value: "pearl" },
                { label: "젤리", value: "jelly" },
                { label: "시럽", value: "syrup" },
                { label: "샷", value: "shot" },
                { label: "폼", value: "foam" },
                { label: "휘핑크림", value: "whippedCream" },
                { label: "기타", value: "other" },
              ]}
            />
          </View>

          <View style={styles.sectionCard}>
            <AppText preset="h2" style={styles.sectionTitle}>
              영양 정보
            </AppText>

            <SelectField<NutritionType>
              label="영양 정보 유형"
              value={nutritionType}
              onChange={setNutritionType}
              options={[
                { label: "추정치", value: "estimated" },
                { label: "공식 정보", value: "official" },
              ]}
            />

            <Input
              label="1회 기준"
              value={servingLabel}
              onChangeText={setServingLabel}
            />
            <Input
              label="칼로리(kcal)"
              value={calories}
              onChangeText={setCalories}
              keyboardType="decimal-pad"
            />
            <Input
              label="카페인(mg)"
              value={caffeine}
              onChangeText={setCaffeine}
              keyboardType="decimal-pad"
            />
            <Input
              label="당류(g)"
              value={sugar}
              onChangeText={setSugar}
              keyboardType="decimal-pad"
            />
          </View>

          <View style={styles.sectionCard}>
            <AppText preset="h2" style={styles.sectionTitle}>
              기타 설정
            </AppText>

            <ToggleRow
              label="공개 상태"
              value={isVisible}
              onValueChange={setIsVisible}
            />
          </View>

          {validationErrors.length > 0 ? (
            <View style={styles.validationBoxError}>
              <AppText preset="caption" style={styles.validationBoxTitleError}>
                저장 전에 확인해 주세요
              </AppText>

              {validationErrors.map((message) => (
                <AppText
                  key={message}
                  preset="body"
                  style={styles.validationBoxText}
                >
                  • {message}
                </AppText>
              ))}
            </View>
          ) : null}

          {validationWarnings.length > 0 ? (
            <View style={styles.validationBoxWarning}>
              <AppText
                preset="caption"
                style={styles.validationBoxTitleWarning}
              >
                참고하면 좋은 항목
              </AppText>

              {validationWarnings.map((message) => (
                <AppText
                  key={message}
                  preset="body"
                  style={styles.validationBoxText}
                >
                  • {message}
                </AppText>
              ))}
            </View>
          ) : null}

          <Pressable
            style={[
              styles.saveButton,
              !canSave && styles.saveButtonInactive,
              saving && styles.saveButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={saving}
          >
            <AppText preset="h2">{saving ? "저장 중..." : isEditMode ? "수정하기" : "추가하기"}</AppText>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      <IconPickerModal
        visible={iconPickerOpen}
        type="topping"
        selectedKey={toppingIconKey}
        onSelect={(key) => {
          setToppingIconKey(key);
          setIconUrl(null);
          setIconPickerOpen(false);
        }}
        onClose={() => setIconPickerOpen(false)}
      />
    </SafeAreaView>
  );
};

export default ToppingFormScreen;

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
  },
  headerRow: {
    height: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    marginBottom: 6,
    color: COLORS.semantic.textSecondary,
  },
  input: {
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.ui.border,
    backgroundColor: COLORS.semantic.surface,
    paddingHorizontal: 12,
    color: COLORS.semantic.textPrimary,
    fontFamily: "Iseoyun",
  },
  chipInputWrap: {
    gap: 8,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  valueChipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  valueChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.ui.border,
    backgroundColor: COLORS.base.warmBeige,
    alignSelf: "flex-start",
  },
  valueChipText: {
    color: COLORS.semantic.textSecondary,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.ui.border,
    backgroundColor: COLORS.base.warmBeige,
  },
  chipActive: {
    backgroundColor: COLORS.semantic.primary,
  },
  chipText: {
    color: COLORS.semantic.textSecondary,
  },
  chipTextActive: {
    color: COLORS.base.creamPaper,
  },
  iconSelectField: {
    minHeight: 56,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.ui.border,
    backgroundColor: COLORS.semantic.surface,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconSelectPreview: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: COLORS.ui.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.base.creamPaper,
  },
  iconSelectTextWrap: {
    flex: 1,
    gap: 2,
  },
  iconSelectValue: {
    color: COLORS.semantic.textPrimary,
  },
  iconSelectHint: {
    color: COLORS.semantic.textSecondary,
  },
  iconUploadField: {
    minHeight: 56,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.ui.border,
    backgroundColor: COLORS.semantic.surface,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconUploadTextWrap: {
    flex: 1,
    gap: 2,
  },
  iconUploadTitle: {
    color: COLORS.semantic.textPrimary,
  },
  iconUploadHint: {
    color: COLORS.semantic.textSecondary,
  },
  toggleRow: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  toggleLabelWrap: {
    flex: 1,
    justifyContent: "center",
    marginRight: 12,
    minHeight: 31,
  },
  toggleLabel: {
    lineHeight: 20,
  },
  toggleSwitchWrap: {
    height: 31,
    justifyContent: "center",
  },
  saveButton: {
    height: 50,
    borderRadius: 16,
    backgroundColor: COLORS.base.warmBeige,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonInactive: {
    opacity: 0.7,
  },
  saveButtonDisabled: {
    opacity: 0.45,
  },
  validationBoxError: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E7B6B6",
    backgroundColor: "#FFF4F4",
    padding: 12,
    gap: 4,
  },
  validationBoxWarning: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E6D4A8",
    backgroundColor: "#FFF9EC",
    padding: 12,
    gap: 4,
  },
  validationBoxTitleError: {
    color: "#B24A4A",
    marginBottom: 2,
  },
  validationBoxTitleWarning: {
    color: "#8A6A1F",
    marginBottom: 2,
  },
  validationBoxText: {
    color: COLORS.semantic.textSecondary,
  },
});
