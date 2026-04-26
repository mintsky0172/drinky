import React, { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { COLORS } from "@/src/constants/colors";
import { TYPOGRAPHY } from "@/src/constants/typography";
import {
  DRINK_ICON_KEYS,
  DRINK_ICON_KEYS_LATEST,
  DrinkIconKey,
  INGREDIENT_ICON_KEYS,
  IngredientIconKey,
} from "@/src/constants/icons";
import {
  DRINK_ICON_LABELS,
  INGREDIENT_ICON_LABELS,
} from "@/src/constants/iconLabels.generated";
import DrinkIcon from "../common/DrinkIcon";
import IngredientIcon from "../common/IngredientIcon";
import { Ionicons } from "@expo/vector-icons";
import TextField from "../ui/TextField";

type SharedProps = {
  visible: boolean;
  onClose: () => void;
  onResetToDefault?: () => void;
  title?: string;
  subtitle?: string;
  sortOrder?: "default" | "latest";
};

type DrinkProps = SharedProps & {
  type: "drink";
  selectedKey: DrinkIconKey;
  onSelect: (key: DrinkIconKey) => void;
};

type IngredientProps = SharedProps & {
  type: "ingredient";
  selectedKey: IngredientIconKey;
  onSelect: (key: IngredientIconKey) => void;
};

type Props = DrinkProps | IngredientProps;

const DEFAULT_TITLES = {
  drink: "음료 아이콘 선택",
  ingredient: "대표 아이콘 선택",
} as const;

const DEFAULT_SUBTITLES = {
  drink: "음료를 가장 잘 나타내는 아이콘을 골라 주세요.",
  ingredient: "오늘을 가장 잘 나타내는 아이콘은 무엇인가요?",
} as const;

const INGREDIENT_SEARCH_ALIASES: Partial<
  Record<IngredientIconKey, string[]>
> = {
  water: ["생수", "물"],
  coffee: ["커피", "콜드브루"],
  milk: ["우유", "라떼"],
  default: ["기본", "없음"],
  ice: ["얼음", "아이스"],
  chocolate: ["초코", "초콜릿"],
  white_chcolate: ["화이트초코", "화이트 초코", "화이트초콜릿"],
  strawberry: ["딸기", "스트로베리"],
  lemon: ["레몬"],
  orange: ["오렌지"],
  grapefruit: ["자몽"],
  lime: ["라임"],
  peach: ["복숭아"],
  apple: ["사과"],
  banana: ["바나나"],
  blueberry: ["블루베리"],
  cherry: ["체리"],
  mango: ["망고"],
  grape: ["포도"],
  green_grape: ["청포도", "샤인머스캣"],
  leaf: ["말차", "녹차", "그린티"],
  mint: ["민트"],
  teabag: ["티백", "차"],
  fizzy: ["탄산", "소다", "사이다"],
  vanilla: ["바닐라"],
  yogurt: ["요거트"],
  energy: ["에너지", "에너지드링크"],
  honey: ["허니", "꿀"],
  caramel: ["카라멜"],
  hazelnut: ["헤이즐넛", "헤즐넛"],
  cinnamon: ["시나몬", "계피"],
  black_sesame: ["흑임자", "검은깨"],
  hibiscus: ["히비스커스"],
  lychee: ["리치"],
  kiwi: ["키위"],
  gold_kiwi: ["골드키위"],
  coconut: ["코코넛"],
  cookie: ["쿠키"],
  sweet_potato: ["고구마"],
  grain: ["곡물", "미숫가루"],
  jujube: ["대추"],
  maesil: ["매실"],
  red_bean: ["팥", "단팥"],
  passion_fruit: ["패션후르츠", "패션프루트"],
  plum: ["자두"],
  omija: ["오미자"],
  pineapple: ["파인애플"],
  melon: ["멜론"],
  pomegranate: ["석류"],
  tomato: ["토마토"],
  pistachio: ["피스타치오"],
  corn: ["옥수수"],
  watermelon: ["수박"],
  persimmon: ["감"],
  ginger: ["생강", "진저"],
};

const IconPickerModal = (props: Props) => {
  const {
    visible,
    type,
    selectedKey,
    onSelect,
    onClose,
    onResetToDefault,
    title,
    subtitle,
    sortOrder = "default",
  } = props;

  const [query, setQuery] = useState("");

  const keys =
    type === "drink"
      ? sortOrder === "latest"
        ? DRINK_ICON_KEYS_LATEST
        : DRINK_ICON_KEYS
      : INGREDIENT_ICON_KEYS;
  const labels: Readonly<Record<string, string>> =
    type === "drink" ? DRINK_ICON_LABELS : INGREDIENT_ICON_LABELS;
  const resolvedTitle = title ?? DEFAULT_TITLES[type];
  const resolvedSubtitle = subtitle ?? DEFAULT_SUBTITLES[type];

  const filteredKeys = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return keys;

    return keys.filter((key) => {
      const label = labels[key] ?? "";
      const aliases =
        type === "ingredient"
          ? INGREDIENT_SEARCH_ALIASES[key as IngredientIconKey] ?? []
          : [];
      return `${key} ${label} ${aliases.join(" ")}`
        .toLowerCase()
        .includes(q);
    });
  }, [keys, labels, query, type]);

  const handleClose = () => {
    setQuery("");
    onClose();
  };

  useEffect(() => {
    if (!visible) {
      setQuery("");
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.overlay} onPress={handleClose} />

      <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
        <KeyboardAvoidingView
          style={styles.keyboardAvoid}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.sheet}>
            <View style={styles.headerRow}>
              <Text style={styles.title}>{resolvedTitle}</Text>

              <Pressable onPress={handleClose} hitSlop={10}>
                <Text style={styles.closeText}>닫기</Text>
              </Pressable>
            </View>

            <Text style={styles.subTitle}>{resolvedSubtitle}</Text>

            <View style={styles.searchRow}>
              <TextField
                value={query}
                onChangeText={setQuery}
                placeholder={
                  type === "drink" ? "음료 아이콘 검색" : "재료 아이콘 검색"
                }
                placeholderTextColor={COLORS.semantic.textMuted}
                style={styles.searchInput}
                leftIcon={
                  <Ionicons
                    name="search"
                    size={18}
                    color={COLORS.semantic.textSecondary}
                  />
                }
              />

              {query ? (
                <Pressable onPress={() => setQuery("")} hitSlop={8}>
                  <Ionicons
                    name="close-circle"
                    size={18}
                    color={COLORS.semantic.textSecondary}
                  />
                </Pressable>
              ) : null}
            </View>

            <Text style={styles.resultText}>{filteredKeys.length}개</Text>

            <FlatList
              data={filteredKeys}
              keyExtractor={(k) => k}
              numColumns={4}
              style={styles.gridList}
              contentContainerStyle={styles.grid}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const isSelected = item === selectedKey;
                const icon =
                  type === "drink" ? (
                    <DrinkIcon iconKey={item as DrinkIconKey} size={34} />
                  ) : (
                    <IngredientIcon
                      iconKey={item as IngredientIconKey}
                      size={34}
                    />
                  );

                return (
                  <Pressable
                    onPress={() => {
                      if (type === "drink") {
                        onSelect(item as DrinkIconKey);
                        return;
                      }

                      onSelect(item as IngredientIconKey);
                    }}
                    style={[styles.cell, isSelected && styles.cellSelected]}
                  >
                    <View style={styles.iconCircle}>{icon}</View>
                  </Pressable>
                );
              }}
            />

            {onResetToDefault ? (
              <Pressable style={styles.resetBtn} onPress={onResetToDefault}>
                <Text style={styles.resetText}>자동(기본)으로 되돌리기</Text>
              </Pressable>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

export default IconPickerModal;

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.ui.overlayBrown40,
  },
  safeArea: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
  },
  keyboardAvoid: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.ui.border,
    backgroundColor: COLORS.base.warmBeige,
    height: "78%",
    flexShrink: 1,
  },
  gridList: {
    flex: 1,
    minHeight: 0,
    alignSelf: "stretch",
    width: "100%",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    ...TYPOGRAPHY.preset.h3,
    color: COLORS.semantic.textPrimary,
  },
  closeText: {
    ...TYPOGRAPHY.preset.body,
    color: COLORS.semantic.textSecondary,
  },
  subTitle: {
    ...TYPOGRAPHY.preset.caption,
    color: COLORS.semantic.textSecondary,
    marginTop: 6,
    marginBottom: 12,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
  },
  resultText: {
    ...TYPOGRAPHY.preset.caption,
    color: COLORS.semantic.textSecondary,
    marginBottom: 8,
  },
  grid: {
    paddingBottom: 8,
  },
  cell: {
    width: "25%",
    alignItems: "center",
    paddingVertical: 10,
  },
  cellSelected: {
    backgroundColor: COLORS.ui.border,
    borderRadius: 20,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: COLORS.ui.border,
    backgroundColor: COLORS.base.creamPaper,
    alignItems: "center",
    justifyContent: "center",
  },
  resetBtn: {
    marginTop: 6,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.ui.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.base.creamPaper,
  },
  resetText: {
    ...TYPOGRAPHY.preset.body,
    color: COLORS.semantic.textPrimary,
  },
});
