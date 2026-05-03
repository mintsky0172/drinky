import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from "react-native";
import React, { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "@/src/providers/AuthProvider";
import {
  getRecipeById,
  saveDrinkIcon,
  saveIngredientIcon,
  updateRecipe,
  type Recipe,
  updateReportStatus,
} from "@/src/lib/admin/adminApi";
import Toast from "react-native-toast-message";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/src/constants/colors";
import AppText from "@/src/components/ui/AppText";
import IconPickerModal from "@/src/components/home/IconPickerModal";
import DrinkIcon from "@/src/components/common/DrinkIcon";
import IngredientIcon from "@/src/components/common/IngredientIcon";
import {
  DRINK_ICONS,
  INGREDIENT_ICONS,
  type DrinkIconKey,
  type IngredientIconKey,
} from "@/src/constants/icons";
import BrandField from "@/src/components/common/BrandField";
import * as ImagePicker from "expo-image-picker";

const CATEGORY_OPTIONS = [
  { value: "other", label: "기타" },
  { value: "latte", label: "라떼" },
  { value: "water", label: "물" },
  { value: "shake", label: "쉐이크" },
  { value: "smoothie", label: "스무디" },
  { value: "ade", label: "에이드" },
  { value: "milk", label: "우유" },
  { value: "juice", label: "주스" },
  { value: "tea", label: "차" },
  { value: "coffee", label: "커피" },
  { value: "carbonated", label: "탄산" },
  { value: "frappe", label: "프라페" },
] as const;

async function pickIconImage() {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
  });

  if (result.canceled) return null;

  return result.assets[0].uri;
}

type RecipeFormValues = {
  name: string;
  category: string;
  hasDrinkIcon: boolean;
  hasIngredientIcon: boolean;
  mlPerServing: string;
  caffeineMgPerServing: string;
  sugarGPerServing: string;
  isWaterOnly: boolean;
};

function validateRecipeForm(values: RecipeFormValues) {
  const errors: string[] = [];
  const warnings: string[] = [];

  const ml = Number(values.mlPerServing || 0);
  const caffeine = Number(values.caffeineMgPerServing || 0);
  const sugar = Number(values.sugarGPerServing || 0);

  if (!values.name.trim()) {
    errors.push("음료명을 입력해 주세요.");
  }

  if (!values.category.trim()) {
    errors.push("카테고리를 선택해 주세요.");
  }

  if (!values.hasDrinkIcon) {
    errors.push("음료 아이콘 또는 커스텀 아이콘을 선택해 주세요.");
  }

  if (!values.hasIngredientIcon) {
    errors.push("재료 아이콘 또는 커스텀 아이콘을 선택해 주세요.");
  }

  if (!Number.isFinite(ml) || ml <= 0) {
    errors.push("1회 제공량은 0보다 큰 숫자여야 해요.");
  }

  if (!Number.isFinite(caffeine) || caffeine < 0) {
    errors.push("카페인 값은 0 이상이어야 해요.");
  }

  if (!Number.isFinite(sugar) || sugar < 0) {
    errors.push("당류 값은 0 이상이어야 해요.");
  }

  if (values.isWaterOnly && values.category !== "물") {
    warnings.push("수분 섭취로 인정되는데 카테고리가 물이 아니에요.");
  }

  if (ml > 2000) {
    warnings.push("1회 제공량이 2000mL를 넘어요. 값이 맞는지 확인해 주세요.");
  }

  if (caffeine > 500) {
    warnings.push("카페인 값이 500mg를 넘어요. 오타가 아닌지 확인해 주세요.");
  }

  if (sugar > 150) {
    warnings.push("당류 값이 150g을 넘어요. 오타가 아닌지 확인해 주세요.");
  }

  return { errors, warnings };
}

const RecipeDetailScreen = () => {
  const router = useRouter();
  const { id, reportId } = useLocalSearchParams<{
    id: string;
    reportId?: string;
  }>();
  const { user } = useAuth();
  const reportIdParam = Array.isArray(reportId) ? reportId[0] : reportId;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState<string>("other");
  const [drinkIconKey, setDrinkIconKey] = useState("");
  const [drinkIconUrl, setDrinkIconUrl] = useState<string | null>(null);
  const [pendingDrinkIconUri, setPendingDrinkIconUri] = useState<string | null>(null);
  const [calendarIconKey, setCalendarIconKey] = useState("");
  const [ingredientIconUrl, setIngredientIconUrl] = useState<string | null>(null);
  const [pendingIngredientIconUri, setPendingIngredientIconUri] = useState<string | null>(null);
  const [mlPerServing, setMlPerServing] = useState("");
  const [caffeineMgPerServing, setCaffeineMgPerServing] = useState("");
  const [sugarGPerServing, setSugarGPerServing] = useState("");
  const [isWaterOnly, setIsWaterOnly] = useState(false);
  const [isPublic, setIsPublic] = useState(true);

  const [aliases, setAliases] = useState<string[]>([]);
  const [searchKeywords, setSearchKeywords] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [iconPickerTarget, setIconPickerTarget] = useState<
    "drink" | "ingredient" | null
  >(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);

  useEffect(() => {
    const run = async () => {
      if (!id) return;

      const recipe = (await getRecipeById(id)) as Recipe | null;

      if (!recipe) {
        setLoading(false);
        return;
      }

      setName(recipe.name ?? "");
      setBrand(recipe.brand ?? "");
      setCategory(recipe.category ?? "other");
      setDrinkIconKey(recipe.drinkIconKey ?? "");
      setDrinkIconUrl(recipe.iconUrl ?? null);
      setCalendarIconKey(recipe.calendarIconKey ?? "");
      setIngredientIconUrl(recipe.ingredientIconUrl ?? null);
      setMlPerServing(String(recipe.mlPerServing ?? ""));
      setCaffeineMgPerServing(String(recipe.caffeineMgPerServing ?? ""));
      setSugarGPerServing(String(recipe.sugarGPerServing ?? ""));
      setIsWaterOnly(Boolean(recipe.isWaterOnly));
      setIsPublic(recipe.isPublic !== false);

      setAliases(recipe.aliases ?? []);
      setSearchKeywords(recipe.searchKeywords ?? []);
      setTags(recipe.tags ?? []);

      setLoading(false);
    };
    run();
  }, [id]);

  const handleSave = async () => {
    if (!id || !user) return;

    const { errors, warnings } = validateRecipeForm({
      name,
      category,
      hasDrinkIcon:
        drinkIconKey.trim().length > 0 ||
        Boolean(pendingDrinkIconUri) ||
        Boolean(drinkIconUrl),
      hasIngredientIcon:
        calendarIconKey.trim().length > 0 ||
        Boolean(pendingIngredientIconUri) ||
        Boolean(ingredientIconUrl),
      mlPerServing,
      caffeineMgPerServing,
      sugarGPerServing,
      isWaterOnly,
    });

    setValidationErrors(errors);
    setValidationWarnings(warnings);

    if (errors.length > 0) {
      return;
    }

    let saveStage: "update" | "drinkIcon" | "ingredientIcon" | "report" = "update";

    try {
      setSaving(true);

      await updateRecipe(
        id,
        {
          name: name.trim(),
          brand: brand.trim(),
          category,
          drinkIconKey: drinkIconKey.trim(),
          calendarIconKey: calendarIconKey.trim(),
          mlPerServing: Number(mlPerServing || 0),
          caffeineMgPerServing: Number(caffeineMgPerServing || 0),
          sugarGPerServing: Number(sugarGPerServing || 0),
          isWaterOnly,
          isPublic,
          normalizedName: name.replace(/\s/g, ""),
          aliases,
          searchKeywords,
          tags,
        },
        user.uid,
      );

      if (pendingDrinkIconUri) {
        saveStage = "drinkIcon";
        const uploadedIconUrl = await saveDrinkIcon(
          id,
          pendingDrinkIconUri,
          drinkIconKey.trim() || undefined,
          user.uid,
        );
        setDrinkIconUrl(uploadedIconUrl);
        setPendingDrinkIconUri(null);
      }

      if (pendingIngredientIconUri) {
        saveStage = "ingredientIcon";
        const uploadedIngredientIconUrl = await saveIngredientIcon(
          id,
          pendingIngredientIconUri,
          calendarIconKey.trim() || undefined,
          user.uid,
        );
        setIngredientIconUrl(uploadedIngredientIconUrl);
        setPendingIngredientIconUri(null);
      }

      if (reportIdParam) {
        saveStage = "report";
        await updateReportStatus(reportIdParam, {
          status: "done",
          adminMemo: "제보 반영 완료",
        });
      }

      Toast.show({ type: "success", text1: "레시피를 저장했어요" });
      setValidationErrors([]);
      setValidationWarnings([]);
      router.back();
    } catch {
      if (saveStage === "drinkIcon" || saveStage === "ingredientIcon") {
        Toast.show({
          type: "error",
          text1: "기본 정보는 저장됐지만 아이콘 업로드는 실패했어요",
        });
      } else if (saveStage === "report") {
        Toast.show({
          type: "error",
          text1: "레시피는 저장됐지만 제보 상태 업데이트는 실패했어요",
        });
        router.back();
      } else {
        Toast.show({ type: "error", text1: "저장에 실패했어요" });
      }
    } finally {
      setSaving(false);
    }
  };

  const handlePickDrinkCustomIcon = async () => {
    const uri = await pickIconImage();
    if (!uri) return;
    setPendingDrinkIconUri(uri);
  };

  const handlePickIngredientCustomIcon = async () => {
    const uri = await pickIconImage();
    if (!uri) return;
    setPendingIngredientIconUri(uri);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
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

            <AppText preset="h1">레시피 수정</AppText>

            <View style={{ width: 22 }} />
          </View>

          <View style={styles.sectionCard}>
            <AppText preset="h2" style={styles.sectionTitle}>
              기본 정보
            </AppText>

            <Input label="음료명" value={name} onChangeText={setName} />
            <BrandField value={brand} onChangeText={setBrand} />
            <IconSelectField
              label="음료 아이콘"
              value={drinkIconKey}
              placeholder="음료 아이콘을 선택해 주세요"
              icon={
                <DrinkIcon
                  iconKey={resolveOptionalDrinkIconKey(drinkIconKey)}
                  iconUrl={pendingDrinkIconUri ?? drinkIconUrl}
                  size={28}
                />
              }
              onPress={() => setIconPickerTarget("drink")}
            />
            <UploadIconField
              label="커스텀 음료 아이콘"
              status={
                pendingDrinkIconUri
                  ? "새 이미지가 선택됐어요. 저장하면 업로드돼요."
                  : drinkIconUrl
                    ? "Firebase Storage 아이콘이 연결돼 있어요."
                    : "기본 로컬 아이콘 대신 사용할 이미지를 업로드할 수 있어요."
              }
              onPress={handlePickDrinkCustomIcon}
            />
            <IconSelectField
              label="재료 아이콘"
              value={calendarIconKey}
              placeholder="재료 아이콘을 선택해 주세요"
              icon={
                <IngredientIcon
                  iconKey={resolveIngredientIconKey(calendarIconKey)}
                  iconUrl={pendingIngredientIconUri ?? ingredientIconUrl}
                  size={28}
                />
              }
              onPress={() => setIconPickerTarget("ingredient")}
            />
            <UploadIconField
              label="커스텀 재료 아이콘"
              status={
                pendingIngredientIconUri
                  ? "새 이미지가 선택됐어요. 저장하면 업로드돼요."
                  : ingredientIconUrl
                    ? "Firebase Storage 아이콘이 연결돼 있어요."
                    : "기본 로컬 아이콘 대신 사용할 이미지를 업로드할 수 있어요."
              }
              onPress={handlePickIngredientCustomIcon}
            />
          </View>

          <View style={styles.sectionCard}>
            <AppText preset="h2" style={styles.sectionTitle}>
              카테고리
            </AppText>

            <View style={styles.chipWrap}>
              {CATEGORY_OPTIONS.map((option) => {
                const selected = category === option.value;

                return (
                  <Pressable
                    key={option.value}
                    style={[styles.chip, selected && styles.chipActive]}
                    onPress={() => setCategory(option.value)}
                  >
                    <AppText
                      preset="body"
                      style={[
                        styles.chipText,
                        selected && styles.chipTextActive,
                      ]}
                    >
                      {option.label}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.sectionCard}>
            <AppText preset="h2" style={styles.sectionTitle}>
              영양 정보
            </AppText>

            <Input
              label="1회 제공량(mL)"
              value={mlPerServing}
              onChangeText={setMlPerServing}
              keyboardType="decimal-pad"
            />
            <Input
              label="카페인(mg)"
              value={caffeineMgPerServing}
              onChangeText={setCaffeineMgPerServing}
              keyboardType="decimal-pad"
            />
            <Input
              label="당류(g)"
              value={sugarGPerServing}
              onChangeText={setSugarGPerServing}
              keyboardType="decimal-pad"
            />
          </View>

          <View style={styles.sectionCard}>
            <AppText preset="h2" style={styles.sectionTitle}>
              기타 설정
            </AppText>

            <ToggleRow
              label="수분 섭취로 계산"
              value={isWaterOnly}
              onValueChange={setIsWaterOnly}
            />
            <ToggleRow
              label="공개 상태"
              value={isPublic}
              onValueChange={setIsPublic}
            />
          </View>

          <View style={styles.sectionCard}>
            <AppText preset="h2" style={styles.sectionTitle}>
              검색용 필드
            </AppText>

            <ChipInput
              label="동의어"
              values={aliases}
              onChangeValues={setAliases}
              placeholder="입력 후 엔터 또는 쉼표"
            />
            <ChipInput
              label="검색 키워드"
              values={searchKeywords}
              onChangeValues={setSearchKeywords}
              placeholder="입력 후 엔터 또는 쉼표"
            />
            <ChipInput
              label="태그"
              values={tags}
              onChangeValues={setTags}
              placeholder="입력 후 엔터 또는 쉼표"
            />
          </View>

          {validationErrors.length > 0 ? (
            <View style={styles.validationBoxError}>
              <AppText preset="caption" style={styles.validationBoxTitleError}>
                저장 전에 확인해 주세요
              </AppText>

              {validationErrors.map((message) => (
                <AppText key={message} preset="body" style={styles.validationBoxText}>
                  • {message}
                </AppText>
              ))}
            </View>
          ) : null}

          {validationWarnings.length > 0 ? (
            <View style={styles.validationBoxWarning}>
              <AppText preset="caption" style={styles.validationBoxTitleWarning}>
                참고하면 좋은 항목
              </AppText>

              {validationWarnings.map((message) => (
                <AppText key={message} preset="body" style={styles.validationBoxText}>
                  • {message}
                </AppText>
              ))}
            </View>
          ) : null}

          <Pressable
            style={[
              styles.saveButton,
              !(
                name.trim().length > 0 &&
                category.trim().length > 0 &&
                (drinkIconKey.trim().length > 0 ||
                  Boolean(pendingDrinkIconUri) ||
                  Boolean(drinkIconUrl)) &&
                (calendarIconKey.trim().length > 0 ||
                  Boolean(pendingIngredientIconUri) ||
                  Boolean(ingredientIconUrl)) &&
                Number(mlPerServing || 0) > 0
              ) && styles.saveButtonInactive,
              saving && styles.saveButtonDisabled,
            ]}
            onPress={handleSave}
            disabled={saving}
          >
            <AppText preset="h2">{saving ? "저장 중..." : "저장하기"}</AppText>
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

export default RecipeDetailScreen;

function splitCommaText(text: string) {
  return text
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.map((v) => v.trim()).filter(Boolean)));
}

function Input({
  label,
  value,
  onChangeText,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  keyboardType?: "default" | "number-pad" | "decimal-pad";
}) {
  return (
    <View style={styles.inputGroup}>
      <AppText preset="caption" style={styles.inputLabel}>
        {label}
      </AppText>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholderTextColor={COLORS.semantic.textSecondary}
        style={styles.input}
      />
    </View>
  );
}

function ToggleRow({
  label,
  value,
  onValueChange,
}: {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleLabelWrap}>
        <AppText preset="body" style={styles.toggleLabel}>
          {label}
        </AppText>
      </View>
      <View style={styles.toggleSwitchWrap}>
        <Switch value={value} onValueChange={onValueChange} />
      </View>
    </View>
  );
}

function ChipInput({
  label,
  values,
  onChangeValues,
  placeholder,
}: {
  label: string;
  values: string[];
  onChangeValues: (values: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");

  const commitDraft = () => {
    const next = uniqueValues([...values, ...splitCommaText(draft)]);
    if (next.length !== values.length) {
      onChangeValues(next);
    }
    setDraft("");
  };

  const handleChangeText = (text: string) => {
    if (text.includes(",") || text.includes("\n")) {
      const parts = splitCommaText(text.replace(/\n/g, ","));
      if (parts.length > 0) {
        onChangeValues(uniqueValues([...values, ...parts]));
      }
      setDraft("");
      return;
    }
    setDraft(text);
  };

  return (
    <View style={styles.inputGroup}>
      <AppText preset="caption" style={styles.inputLabel}>
        {label}
      </AppText>

      <View style={styles.chipInputWrap}>
        {values.length > 0 ? (
          <View style={styles.valueChipWrap}>
            {values.map((value) => (
              <View key={value} style={styles.valueChip}>
                <AppText preset="caption" style={styles.valueChipText}>
                  {value}
                </AppText>
                <Pressable
                  hitSlop={8}
                  onPress={() =>
                    onChangeValues(values.filter((item) => item !== value))
                  }
                >
                  <Ionicons
                    name="close"
                    size={14}
                    color={COLORS.semantic.textSecondary}
                  />
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}

        <TextInput
          value={draft}
          onChangeText={handleChangeText}
          onBlur={commitDraft}
          onSubmitEditing={commitDraft}
          blurOnSubmit={false}
          placeholder={placeholder}
          placeholderTextColor={COLORS.semantic.textSecondary}
          style={styles.input}
          returnKeyType="done"
        />
      </View>
    </View>
  );
}

function IconSelectField({
  label,
  value,
  icon,
  placeholder,
  onPress,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  placeholder: string;
  onPress: () => void;
}) {
  return (
    <View style={styles.inputGroup}>
      <AppText preset="caption" style={styles.inputLabel}>
        {label}
      </AppText>

      <Pressable style={styles.iconSelectField} onPress={onPress}>
        <View style={styles.iconSelectPreview}>{icon}</View>
        <View style={styles.iconSelectTextWrap}>
          <AppText
            preset="body"
            style={styles.iconSelectValue}
            numberOfLines={1}
          >
            {value || "자동(기본)"}
          </AppText>
          <AppText
            preset="caption"
            style={styles.iconSelectHint}
            numberOfLines={1}
          >
            {placeholder}
          </AppText>
        </View>
        <Ionicons
          name="chevron-down"
          size={18}
          color={COLORS.semantic.textSecondary}
        />
      </Pressable>
    </View>
  );
}

function UploadIconField({
  label,
  status,
  onPress,
}: {
  label: string;
  status: string;
  onPress: () => void;
}) {
  return (
    <View style={styles.inputGroup}>
      <AppText preset="caption" style={styles.inputLabel}>
        {label}
      </AppText>

      <Pressable style={styles.iconUploadField} onPress={onPress}>
        <View style={styles.iconUploadTextWrap}>
          <AppText preset="body" style={styles.iconUploadTitle}>
            이미지 선택
          </AppText>
          <AppText preset="caption" style={styles.iconUploadHint}>
            {status}
          </AppText>
        </View>
        <Ionicons
          name="image-outline"
          size={18}
          color={COLORS.semantic.textSecondary}
        />
      </Pressable>
    </View>
  );
}

function resolveDrinkIconKey(key?: string): DrinkIconKey {
  return key && key in DRINK_ICONS ? (key as DrinkIconKey) : "ice_americano";
}

function resolveOptionalDrinkIconKey(key?: string): DrinkIconKey | null {
  return key && key in DRINK_ICONS ? (key as DrinkIconKey) : null;
}

function resolveIngredientIconKey(key?: string): IngredientIconKey {
  return key && key in INGREDIENT_ICONS
    ? (key as IngredientIconKey)
    : "default";
}

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
