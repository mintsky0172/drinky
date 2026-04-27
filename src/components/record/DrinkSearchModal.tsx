import {
  FlatList,
  ListRenderItemInfo,
  Modal,
  Pressable,
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

export type SearchableDrinkItem = {
  id: string;
  name: string;
  category?: string;
  normalizedName?: string;
  aliases?: string[];
  searchKeywords?: string[];
  drinkIconKey?: string;
  createdAtMs?: number;
  popularityScore?: number;
  brand?: string | null;
};

type Props = {
  visible: boolean;
  query: string;
  items: SearchableDrinkItem[];
  onChangeQuery: (text: string) => void;
  onPick: (item: SearchableDrinkItem) => void;
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
  water: "물",
  other: "기타",
  shake: "쉐이크",
  frappe: '프라페',
};

type SortMode = "name" | "latest" | "popular";
const SORT_OPTIONS: { key: SortMode; label: string }[] = [
  { key: "name", label: "가나다순" },
  { key: "latest", label: "최신등록순" },
  { key: "popular", label: "인기순" },
];

const DrinkSearchModal = ({
  visible,
  query,
  items,
  onChangeQuery,
  onPick,
  onClose,
}: Props) => {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sortMode, setSortMode] = useState<SortMode>("name");
  const [sortSelectOpen, setSortSelectOpen] = useState(false);

  const categoryLabel = (category: string) => {
    if (category === "all") return "전체";
    return CATEGORY_LABELS[category] ?? category;
  };

  const categories = useMemo(() => {
    const raw = Array.from(
      new Set(items.map((item) => item.category).filter(Boolean)),
    ) as string[];
    const sorted = raw.sort((a, b) =>
      categoryLabel(a).localeCompare(categoryLabel(b), "ko"),
    );
    return ["all", ...sorted];
  }, [items]);

  useEffect(() => {
    if (!visible) return;
    setSelectedCategory("all");
    setSortMode("name");
  }, [visible]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    const compareBySort = (a: SearchableDrinkItem, b: SearchableDrinkItem) => {
      if (sortMode === "latest") {
        const diff = Number(b.createdAtMs ?? 0) - Number(a.createdAtMs ?? 0);
        if (diff !== 0) return diff;
      } else if (sortMode === "popular") {
        const diff =
          Number(b.popularityScore ?? 0) - Number(a.popularityScore ?? 0);
        if (diff !== 0) return diff;
      }
      return a.name.localeCompare(b.name, "ko");
    };

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
          item.searchKeywords?.some((k) => k.toLowerCase().includes(q)) ??
          false;

        return inName || inNormalized || inAliases || inKeywords;
      })
      .sort(compareBySort);
  }, [items, query, selectedCategory, sortMode]);

  const renderItem = ({ item, index }: ListRenderItemInfo<SearchableDrinkItem>) => (
    <View>
      <Pressable style={styles.row} onPress={() => onPick(item)}>
        <DrinkIcon
          iconKey={
            item.drinkIconKey && item.drinkIconKey in DRINK_ICONS
              ? (item.drinkIconKey as DrinkIconKey)
              : undefined
          }
          size={32}
        />
        <Text
          style={styles.rowText}
          numberOfLines={2}
          ellipsizeMode="tail"
          lineBreakStrategyIOS="hangul-word"
        >
          {item.name}
        </Text>
      </Pressable>
      {index < filtered.length - 1 ? <View style={styles.sep} /> : null}
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose} />

      <View style={styles.panel}>
        <View style={styles.topBar}>
          <Text style={styles.title}>음료 검색</Text>
          <View style={styles.topBarRight}>
            <Text style={styles.lengthText}>
              {query.trim().length > 0
                ? `검색 결과 ${filtered.length}개`
                : selectedCategory !== "all"
                  ? `카테고리 결과 ${filtered.length}개`
                  : `총 ${items.length}개`}
            </Text>
            <Pressable
              style={styles.sortSelect}
              onPress={() => setSortSelectOpen(true)}
            >
              <Text style={styles.sortSelectText}>
                {SORT_OPTIONS.find((o) => o.key === sortMode)?.label ?? "가나다순"}
              </Text>
              <Ionicons
                name="chevron-down"
                size={14}
                color={COLORS.semantic.textSecondary}
              />
            </Pressable>
          </View>
        </View>

        <View style={styles.searchInputWrap}>
          {!query ? (
            <Text pointerEvents="none" style={styles.searchPlaceholder}>
              음료 이름을 검색해 주세요
            </Text>
          ) : null}
          <TextField
            value={query}
            onChangeText={onChangeQuery}
            placeholder=""
            autoFocus
            leftIcon={
              <Ionicons
                name="search"
                size={18}
                color={COLORS.semantic.textSecondary}
              />
            }
            containerStyle={styles.searchInputContainer}
            style={styles.searchInputText}
          />
        </View>

        <View style={{ height: 6 }} />

        <View style={styles.listSection}>
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            initialNumToRender={12}
            maxToRenderPerBatch={12}
            windowSize={7}
            removeClippedSubviews
            ListHeaderComponent={
              <>
                <FlatList
                  data={categories}
                  keyExtractor={(item) => item}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.categoryRow}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item: category }) => {
                    const selected = selectedCategory === category;
                    return (
                      <Pressable
                        style={[
                          styles.categoryChip,
                          selected && styles.categoryChipActive,
                        ]}
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
                  }}
                />

                <View style={{ height: 4 }} />
              </>
            }
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyText}>검색 결과가 없어요</Text>
              </View>
            }
          />
        </View>
      </View>

      <Modal
        transparent
        visible={sortSelectOpen}
        animationType="fade"
        onRequestClose={() => setSortSelectOpen(false)}
      >
        <Pressable
          style={styles.selectOverlay}
          onPress={() => setSortSelectOpen(false)}
        />
        <View style={styles.selectCard}>
          {SORT_OPTIONS.map((option) => {
            const selected = option.key === sortMode;
            return (
              <Pressable
                key={option.key}
                style={[styles.selectRow, selected && styles.selectRowActive]}
                onPress={() => {
                  setSortMode(option.key);
                  setSortSelectOpen(false);
                }}
              >
                <Text
                  style={[styles.selectRowText, selected && styles.selectRowTextActive]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Modal>
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
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  topBarRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  lengthText: {
    ...TYPOGRAPHY.preset.caption,
    color: COLORS.semantic.textSecondary,
  },
  sortSelect: {
    height: 28,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.ui.border,
    backgroundColor: COLORS.semantic.surface,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  sortSelectText: {
    ...TYPOGRAPHY.preset.caption,
    color: COLORS.semantic.textSecondary,
  },
  searchInputWrap: {
    position: "relative",
  },
  searchPlaceholder: {
    position: "absolute",
    top: 13,
    left: 42,
    right: 12,
    zIndex: 1,
    ...TYPOGRAPHY.preset.body,
    color: COLORS.semantic.textMuted,
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
    paddingBottom: 6,
    paddingRight: 8,
    paddingLeft: 0,
  },
  listSection: {
    flex: 1,
    alignSelf: "stretch",
    width: "100%",
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
  selectOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
  },
  selectCard: {
    position: "absolute",
    right: 24,
    top: 138,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.ui.border,
    backgroundColor: COLORS.base.creamPaper,
    overflow: "hidden",
  },
  selectRow: {
    minWidth: 120,
    paddingHorizontal: 12,
    height: 38,
    justifyContent: "center",
  },
  selectRowActive: {
    backgroundColor: COLORS.base.warmBeige,
  },
  selectRowText: {
    ...TYPOGRAPHY.preset.caption,
    color: COLORS.semantic.textSecondary,
  },
  selectRowTextActive: {
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
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
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
