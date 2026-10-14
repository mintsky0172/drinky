import {
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import React, { useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { Topping, ToppingCategory } from "@/src/types/topping";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import ToppingIcon from "../common/ToppingIcon";
import AppButton from "../ui/AppButton";
import TextField from "../ui/TextField";
import { filterToppings } from "@/src/features/toppings/filterToppings";
import { COLORS } from "@/src/constants/colors";
import { TYPOGRAPHY } from "@/src/constants/typography";

type Props = {
  visible: boolean;
  items: Topping[];
  loading: boolean;
  error: string | null;
  selectedIds: string[];
  onSelect: (item: Topping) => void;
  onClose: () => void;
};

const CATEGORIES: { value: ToppingCategory | "all"; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "pearl", label: "펄" },
  { value: "jelly", label: "젤리" },
  { value: "syrup", label: "시럽" },
  { value: "shot", label: "샷" },
  { value: "foam", label: "폼" },
  { value: "whippedCream", label: "휘핑크림" },
  { value: "other", label: "기타" },
];

const ToppingSelectModal = ({
  visible,
  items,
  loading,
  error,
  selectedIds,
  onSelect,
  onClose,
}: Props) => {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<ToppingCategory | "all">("all");
  const filteredItems = filterToppings(items, category, search);
  const resetFilters = () => {
    setSearch("");
    setCategory("all");
  };
  const handleClose = () => {
    Keyboard.dismiss();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose} onShow={resetFilters}>
      <SafeAreaProvider>
        <SafeAreaView style={styles.container} edges={["top", "bottom", "left", "right"]}>
          <KeyboardAvoidingView style={styles.body} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <View style={styles.header}>
              <Text style={styles.title}>토핑 선택</Text>
              <Text style={styles.subtitle}>추가할 토핑을 모두 선택해 주세요.</Text>
            </View>
            <TextField
              value={search}
              onChangeText={setSearch}
              placeholder="토핑명 또는 브랜드명 검색"
              accessibilityLabel="토핑명 또는 브랜드명 검색"
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="none"
              onSubmitEditing={Keyboard.dismiss}
              leftIcon={<Ionicons name="search-outline" size={20} color={COLORS.semantic.textSecondary} />}
              rightIcon={search ? (
                <Pressable style={styles.clearButton} onPress={() => setSearch("")} accessibilityRole="button" accessibilityLabel="검색어 지우기">
                  <Ionicons name="close-circle" size={20} color={COLORS.semantic.textMuted} />
                </Pressable>
              ) : undefined}
            />
            <View style={styles.categoryArea}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.categories}>
                {CATEGORIES.map((option) => (
                  <Pressable
                    key={option.value}
                    style={[styles.chip, category === option.value && styles.activeChip]}
                    onPress={() => setCategory(option.value)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: category === option.value }}
                  >
                    <Text style={[styles.chipText, category === option.value && styles.activeChipText]}>{option.label}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
            <View style={styles.body}>
              {loading ? (
                <Text style={styles.subtitle}>토핑을 불러오는 중이에요.</Text>
              ) : error ? (
                <Text style={styles.subtitle} accessibilityRole="alert">{error}</Text>
              ) : (
                <>
                  <Text style={styles.resultCount}>토핑 {filteredItems.length}개</Text>
                  <FlatList
                    style={styles.body}
                    contentContainerStyle={styles.listContent}
                    data={filteredItems}
                    extraData={selectedIds}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    keyExtractor={(item) => item.id}
                    ListEmptyComponent={
                      <View style={styles.empty}>
                        <Text style={styles.name}>{items.length ? "조건에 맞는 토핑이 없어요." : "등록된 토핑이 없어요."}</Text>
                        {items.length > 0 && <AppButton label="필터 초기화" variant="ghost" size="sm" onPress={resetFilters} />}
                      </View>
                    }
                    renderItem={({ item }) => {
                      const selected = selectedIds.includes(item.id);
                      return (
                        <Pressable
                          style={[styles.row, selected && styles.selectedRow]}
                          onPress={() => onSelect(item)}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: selected }}
                        >
                          <ToppingIcon iconKey={item.iconKey} iconUrl={item.iconUrl} />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.name}>{item.name}</Text>
                            <Text style={styles.subtitle}>{[item.brand, item.servingLabel].filter(Boolean).join(" • ")}</Text>
                          </View>
                          <Text style={styles.selection}>{selected ? "선택됨" : "선택"}</Text>
                        </Pressable>
                      );
                    }}
                  />
                </>
              )}
            </View>
            <View style={styles.footer}>
              <AppButton label={selectedIds.length ? `${selectedIds.length}개 선택 완료` : "완료"} onPress={handleClose} />
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
};

export default ToppingSelectModal;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    backgroundColor: COLORS.base.creamPaper,
  },
  header: {
    paddingVertical: 20,
    gap: 6,
  },
  title: {
    ...TYPOGRAPHY.preset.h2,
    color: COLORS.semantic.textPrimary,
  },
  subtitle: {
    ...TYPOGRAPHY.preset.h3,
    opacity: 0.8,
    color: COLORS.semantic.textSecondary,
  },
  name: {
    ...TYPOGRAPHY.preset.body,
    color: COLORS.semantic.textPrimary,
  },
  selection: {
    ...TYPOGRAPHY.preset.caption,
    color: COLORS.primary.caramel,
  },
  body: {
    flex: 1,
  },
  listContent: {
    gap: 10,
    paddingBottom: 16,
  },
  footer: {
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.ui.border,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.ui.border,
  },
  selectedRow: {
    backgroundColor: COLORS.base.warmBeige,
    borderColor: COLORS.primary.caramel,
  },
  clearButton: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  categoryArea: { paddingVertical: 14 },
  categories: { gap: 8, paddingRight: 4 },
  chip: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.ui.border,
    backgroundColor: COLORS.base.creamPaper,
    alignItems: "center",
    justifyContent: "center",
  },
  activeChip: { backgroundColor: COLORS.primary.caramel, borderColor: COLORS.primary.caramel },
  chipText: { ...TYPOGRAPHY.preset.body, color: COLORS.semantic.textSecondary },
  activeChipText: { color: COLORS.base.white },
  resultCount: { ...TYPOGRAPHY.preset.caption, color: COLORS.semantic.textSecondary, marginBottom: 10 },
  empty: { alignItems: "center", paddingVertical: 32, gap: 12 },
});
