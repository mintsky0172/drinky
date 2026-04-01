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
  updateRecipe,
  type Recipe,
} from "@/src/lib/admin/adminApi";
import Toast from "react-native-toast-message";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/src/constants/colors";
import AppText from "@/src/components/ui/AppText";

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

const RecipeDetailScreen = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState<string>("other");
  const [drinkIconKey, setDrinkIconKey] = useState("");
  const [calendarIconKey, setCalendarIconKey] = useState("");
  const [mlPerServing, setMlPerServing] = useState("");
  const [caffeineMgPerServing, setCaffeineMgPerServing] = useState("");
  const [sugarGPerServing, setSugarGPerServing] = useState("");
  const [isWaterOnly, setIsWaterOnly] = useState(false);
  const [isPublic, setIsPublic] = useState(true);

  const [aliases, setAliases] = useState<string[]>([]);
  const [searchKeywords, setSearchKeywords] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);

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
      setCalendarIconKey(recipe.calendarIconKey ?? "");
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

    if (!name.trim()) {
      Toast.show({ type: "error", text1: "음료명을 입력해 주세요" });
      return;
    }

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

      Toast.show({ type: "success", text1: "레시피를 저장했어요" });
      router.back();
    } catch {
      Toast.show({ type: "error", text1: "저장에 실패했어요" });
    } finally {
      setSaving(false);
    }
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
            <Input label="브랜드" value={brand} onChangeText={setBrand} />
            <Input
              label="drinkIconKey"
              value={drinkIconKey}
              onChangeText={setDrinkIconKey}
            />
            <Input
              label="calendarIconKey"
              value={calendarIconKey}
              onChangeText={setCalendarIconKey}
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
              keyboardType="number-pad"
            />
            <Input
              label="카페인(mg)"
              value={caffeineMgPerServing}
              onChangeText={setCaffeineMgPerServing}
              keyboardType="number-pad"
            />
            <Input
              label="당류(g)"
              value={sugarGPerServing}
              onChangeText={setSugarGPerServing}
              keyboardType="number-pad"
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

          <Pressable
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <AppText preset="h2">{saving ? "저장 중..." : "저장하기"}</AppText>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
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
  keyboardType?: "default" | "number-pad";
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
    paddingVertical: 8,
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
  saveButtonDisabled: {
    opacity: 0.45,
  },
});
