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
import React, { useState } from "react";
import {
  NutritionType,
  ToppingCategory,
  ToppingType,
} from "@/src/types/topping";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
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

const NewToppingScreen = () => {
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [toppingIconKey, setToppingIconKey] =
    useState<ToppingIconKey>("default");

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
  };

  const handleSubmit = async () => {
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

    try {
      setIsSubmitting(true);

      await addDoc(collection(db, "toppings"), {
        name: name.trim(),
        type,
        category,

        brand: type === "branded" ? brand.trim() : null,

        servingLabel: servingLabel.trim(),

        calories: parseNullableNumber(calories),

        caffeine: parseNullableNumber(caffeine),

        sugar: parseNullableNumber(sugar),

        nutritionType,

        iconUrl: null,

        isVisible,

        sourceUrl: sourceUrl.trim() || null,

        note: note.trim() || null,

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      Alert.alert("등록 완료", "토핑을 등록했어요.");

      resetForm();
    } catch (error) {
      console.error(error);

      Alert.alert("등록 실패", "토핑 등록 중 오류가 발생했어요.");
    } finally {
      setIsSubmitting(false);
    }
  };

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

            <AppText preset="h1">새 토핑 추가</AppText>

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
              icon=""
              onPress={() => ""}
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
            onPress={handleSave}
            disabled={saving}
          >
            <AppText preset="h2">{saving ? "추가 중..." : "추가하기"}</AppText>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      {iconPickerTarget === "drink" ? (
        <IconPickerModal
          visible
          type="drink"
          sortOrder="latest"
          selectedKey={resolveDrinkIconKey(drinkIconKey)}
          onSelect={(key) => {
            setDrinkIconKey(key);
            setIconPickerTarget(null);
          }}
          onClose={() => setIconPickerTarget(null)}
          onResetToDefault={() => {
            setDrinkIconKey("");
            setIconPickerTarget(null);
          }}
          title="음료 아이콘 선택"
          subtitle="이 음료를 가장 잘 나타내는 아이콘을 골라 주세요."
        />
      ) : iconPickerTarget === "ingredient" ? (
        <IconPickerModal
          visible
          type="ingredient"
          selectedKey={resolveIngredientIconKey(calendarIconKey)}
          onSelect={(key) => {
            setCalendarIconKey(key);
            setIconPickerTarget(null);
          }}
          onClose={() => setIconPickerTarget(null)}
          onResetToDefault={() => {
            setCalendarIconKey("");
            setIconPickerTarget(null);
          }}
          title="재료 아이콘 선택"
          subtitle="달력과 홈에서 보여줄 대표 아이콘을 골라 주세요."
        />
      ) : null}
    </SafeAreaView>
  );
};

export default NewToppingScreen;

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
