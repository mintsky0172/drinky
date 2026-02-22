import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import React, { useEffect, useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/src/constants/colors";
import { TYPOGRAPHY } from "@/src/constants/typography";
import TextField from "@/src/components/ui/TextField";
import DrinkIcon from "@/src/components/common/DrinkIcon";
import { DRINK_ICONS, DrinkIconKey } from "@/src/constants/icons";

type Item = { id: string; name: string };
type SearchableItem = Item & {
  category?: string;
  normalizedName?: string;
  aliases?: string[];
  searchKeywords?: string[];
  drinkIconKey?: string;
};

type Props = {
  visible: boolean;
  query: string;
  items: SearchableItem[];
  onChangeQuery: (text: string) => void;
  onPick: (item: Item) => void;
  onClose: () => void;
};

const CATEGORY_LABELS: Record<string, string> = {
  coffee: "커피",
  latte: "라떼",
  tea: "차",
  ade: "에이드",
  smoothie: "스무디",
  juice: "주스",
  milk: "우유",
  carbonated: "탄산",
  energy: "에너지",
  water: "물",
  other: "기타",
};

const DrinkSearchModal = ({
  visible,
  query,
  items,
  onChangeQuery,
  onPick,
  onClose,
}: Props) => {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const categoryLabel = (category: string) => {
    if (category === "all") return "전체";
    return CATEGORY_LABELS[category] ?? category;
  };

  const categories = useMemo(() => {
    const raw = Array.from(
      new Set(items.map((item) => item.category).filter(Boolean))
    ) as string[];
    const sorted = raw.sort((a, b) =>
      categoryLabel(a).localeCompare(categoryLabel(b), "ko")
    );
    return ["all", ...sorted];
  }, [items]);

  useEffect(() => {
    if (!visible) return;
    setSelectedCategory("all");
  }, [visible]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .filter((item) => {
        const inCategory =
          selectedCategory === "all" || item.category === selectedCategory;
        if (!inCategory) return false;

        if (!q) return true;

        const inName = item.name.toLowerCase().includes(q);
        const inNormalized =
          item.normalizedName?.toLowerCase().includes(q) ?? false;
        const inAliases =
          item.aliases?.some((a) => a.toLowerCase().includes(q)) ?? false;
        const inKeywords =
          item.searchKeywords?.some((k) => k.toLowerCase().includes(q)) ?? false;
        return inName || inNormalized || inAliases || inKeywords;
      })
      .sort((a, b) => a.name.localeCompare(b.name, "ko"));
  }, [items, query, selectedCategory]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} />

      <View style={styles.panel}>
        <Text style={styles.title}>음료 검색</Text>
        <TextField
          value={query}
          onChangeText={onChangeQuery}
          placeholder="음료 이름을 검색해 주세요"
          autoFocus
          leftIcon={<Ionicons name="search" size={18} color={COLORS.semantic.textSecondary} />}
          containerStyle={styles.searchInputContainer}
          style={styles.searchInputText}
        />

        <View style={{ height: 6 }} />

        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryRow}
          >
            {categories.map((category) => {
              const selected = selectedCategory === category;
              return (
                <Pressable
                  key={category}
                  style={[styles.categoryChip, selected && styles.categoryChipActive]}
                  onPress={() => setSelectedCategory(category)}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      selected && styles.categoryChipTextActive,
                    ]}
                  >
                    {categoryLabel(category)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={{ height: 4 }} />

          {filtered.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>검색 결과가 없어요</Text>
            </View>
          ) : (
            filtered.map((item, index) => (
              <View key={item.id}>
                <Pressable style={styles.row} onPress={() => onPick(item)}>
                  <DrinkIcon
                    iconKey={
                      item.drinkIconKey && item.drinkIconKey in DRINK_ICONS
                        ? (item.drinkIconKey as DrinkIconKey)
                        : undefined
                    }
                    size={32}
                  />
                  <Text style={styles.rowText}>{item.name}</Text>
                </Pressable>
                {index < filtered.length - 1 ? <View style={styles.sep} /> : null}
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

export default DrinkSearchModal;

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.ui.overlayBrown40,
  },
  panel: {
    position: "absolute",
    left: 16,
    right: 16,
    top: 90,
    bottom: 24,
    borderRadius: 18,
    padding: 15,
    backgroundColor: COLORS.base.creamPaper,
    borderWidth: 1,
    borderColor: COLORS.ui.border,
  },
  title: {
    ...TYPOGRAPHY.preset.h3,
    color: COLORS.semantic.textPrimary,
    marginBottom: 10,
  },
  searchInputContainer: {
    height: 44,
    borderWidth: 1,
    borderColor: COLORS.ui.border,
    backgroundColor: COLORS.semantic.surface,
    borderRadius: 14,
  },
  searchInputText: {
    ...TYPOGRAPHY.preset.body,
    color: COLORS.semantic.textPrimary,
    lineHeight: 18,
  },
  categoryRow: {
    gap: 8,
    paddingTop: 4,
    paddingBottom: 8,
    paddingRight: 8,
  },
  list: {
    flex: 1,
    alignSelf: "stretch",
    width: "100%",
  },
  listContent: {
    alignItems: "stretch",
    paddingTop: 0,
    paddingBottom: 8,
    justifyContent: "flex-start",
  },
  categoryChip: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.ui.border,
    backgroundColor: COLORS.semantic.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryChipActive: {
    backgroundColor: COLORS.base.warmBeige,
    borderColor: COLORS.semantic.textPrimary,
  },
  categoryChipText: {
    ...TYPOGRAPHY.preset.caption,
    color: COLORS.semantic.textSecondary,
  },
  categoryChipTextActive: {
    color: COLORS.semantic.textPrimary,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    width: "100%",
    gap: 10,
    paddingVertical: 12,
  },
  rowText: {
    ...TYPOGRAPHY.preset.body,
    color: COLORS.semantic.textPrimary,
  },
  sep: {
    height: 1,
    backgroundColor: COLORS.ui.border,
  },
  emptyWrap: {
    paddingVertical: 24,
    alignItems: "center",
  },
  emptyText: {
    ...TYPOGRAPHY.preset.caption,
    color: COLORS.semantic.textSecondary,
  },
});
