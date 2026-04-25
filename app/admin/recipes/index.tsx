import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Switch,
  View,
} from "react-native";
import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { collection, onSnapshot } from "firebase/firestore";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AppText from "@/src/components/ui/AppText";
import TextField from "@/src/components/ui/TextField";
import { useAuth } from "@/src/providers/AuthProvider";
import {
  getUserRole,
  setRecipePublic,
  updateReportStatus,
} from "@/src/lib/admin/adminApi";
import { COLORS } from "@/src/constants/colors";
import { db } from "@/src/lib/firebase";
import DrinkIcon from "@/src/components/common/DrinkIcon";
import { DrinkIconKey } from "@/src/constants/icons";

type RecipeItem = {
  id: string;
  name: string;
  brand?: string;
  category?: string;
  isPublic?: boolean;
  updatedAt?: any;
  drinkIconKey?: DrinkIconKey;
};

type VisibilityFilter = "all" | "public" | "hidden";

type SortOption = "name" | "brand" | "category" | "updatedAt";

const CATEGORY_OPTIONS = [
  "전체",
  "기타",
  "라떼",
  "물",
  "쉐이크",
  "스무디",
  "에이드",
  "우유",
  "주스",
  "차",
  "커피",
  "탄산",
  "프라페",
] as const;

const CATEGORY_VALUE_MAP: Record<
  (typeof CATEGORY_OPTIONS)[number],
  string | null
> = {
  전체: null,
  기타: "other",
  라떼: "latte",
  물: "water",
  쉐이크: "shake",
  스무디: "smoothie",
  에이드: "ade",
  우유: "milk",
  주스: "juice",
  차: "tea",
  커피: "coffee",
  탄산: "carbonated",
  프라페: "frappe",
};

const CATEGORY_LABEL_MAP: Record<string, string> = {
  other: "기타",
  latte: "라떼",
  water: "물",
  shake: "쉐이크",
  smoothie: "스무디",
  ade: "에이드",
  milk: "우유",
  juice: "주스",
  tea: "차",
  coffee: "커피",
  carbonated: "탄산",
  frappe: "프라페",
};

const BRAND_LABEL_MAP: Record<string, string> = {
  starbucks: "스타벅스",
  mega: "메가커피",
  compose: "컴포즈커피",
  paik: "빽다방",
  gongcha: "공차",
  oozy: "우지커피",
  twosome: '투썸플레이스',
};

const SORT_OPTIONS: { key: SortOption; label: string }[] = [
  { key: "name", label: "이름순" },
  { key: "brand", label: "브랜드순" },
  { key: "category", label: "카테고리순" },
  { key: "updatedAt", label: "최근 수정순" },
];

function getCategoryLabel(category?: string) {
  if (!category) return "미분류";
  return CATEGORY_LABEL_MAP[category] ?? category;
}

function getBrandLabel(brand?: string) {
  if (!brand) return "공통";
  return BRAND_LABEL_MAP[brand] ?? brand;
}

const VISIBILITY_OPTIONS: { key: VisibilityFilter; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "public", label: "공개만" },
  { key: "hidden", label: "숨김만" },
];

const AdminRecipesScreen = () => {
  const router = useRouter();
  const { user, initializing } = useAuth();
  const params = useLocalSearchParams<{
    reportId?: string;
    prefillBrand?: string;
    prefillName?: string;
  }>();
  const reportIdParam = Array.isArray(params.reportId)
    ? params.reportId[0]
    : params.reportId;

  const [loadingRole, setLoadingRole] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [recipes, setRecipes] = useState<RecipeItem[]>([]);

  const initialSearch = [params.prefillName].filter(Boolean).join(" ").trim();
  const [search, setSearch] = useState(initialSearch);

  const [selectedCategory, setSelectedCategory] =
    useState<(typeof CATEGORY_OPTIONS)[number]>("전체");
  const [visibilityFilter, setVisibilityFilter] =
    useState<VisibilityFilter>("all");

  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [sortBy, setSortBy] = useState<SortOption>("name");

  useEffect(() => {
    if (initializing) return;
    if (!user) {
      setLoadingRole(false);
      setIsAdmin(false);
      return;
    }

    const run = async () => {
      const role = await getUserRole(user.uid);
      setIsAdmin(role === "admin");
      setLoadingRole(false);
    };

    run();
  }, [user, initializing]);

  useEffect(() => {
    if (!isAdmin) return;

    const recipesRef = collection(db, "recipes");

    const unsubscribe = onSnapshot(recipesRef, (snapshot) => {
      const next: RecipeItem[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data() as any;
        return {
          id: docSnap.id,
          name: data.name ?? "이름 없음",
          brand: data.brand ?? "",
          category: data.category ?? "",
          isPublic: data.isPublic ?? true,
          updatedAt: data.updatedAt,
          drinkIconKey: data.drinkIconKey ?? "default",
        };
      });

      setRecipes(next);
    });

    return () => unsubscribe();
  }, [isAdmin]);

  const filteredRecipes = useMemo(() => {
    const q = search.trim().toLowerCase();
    const selectedCategoryValue = CATEGORY_VALUE_MAP[selectedCategory];

    const filtered = recipes
      .filter((item) => {
        const matchesCategory =
          selectedCategoryValue === null ||
          item.category === selectedCategoryValue;

        const isPublic = item.isPublic !== false;
        const matchesVisibility =
          visibilityFilter === "all" ||
          (visibilityFilter === "public" && isPublic) ||
          (visibilityFilter === "hidden" && !isPublic);

        if (!matchesCategory || !matchesVisibility) return false;
        if (!q) return true;

        return (
          item.name.toLowerCase().includes(q) ||
          (item.brand ?? "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.name.localeCompare(b.name, "ko"));

    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "brand":
          return (a.brand ?? "").localeCompare(b.brand ?? "", "ko");
        case "category":
          return (a.category ?? "").localeCompare(b.category ?? "", "ko");
        case "updatedAt": {
          const aTime = a.updatedAt?.toDate?.()?.getTime?.() ?? 0;
          const bTime = b.updatedAt?.toDate?.()?.getTime?.() ?? 0;
          return bTime - aTime;
        }
        case "name":
        default:
          return a.name.localeCompare(b.name, "ko");
      }
    });

    return sorted;
  }, [recipes, search, selectedCategory, visibilityFilter, sortBy]);

  const handleTogglePublic = async (item: RecipeItem) => {
    if (!user) return;

    try {
      setTogglingId(item.id);
      await setRecipePublic(item.id, !(item.isPublic ?? true), user.uid);
      if (reportIdParam) {
        await updateReportStatus(reportIdParam, {
          status: "done",
          adminMemo: "제보를 통해 수정 완료",
        });
      }
    } finally {
      setTogglingId(null);
    }
  };

  if (loadingRole) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <AppText preset="h2">관리자 전용 페이지에요.</AppText>
        </View>
      </SafeAreaView>
    );
  }

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <AppText preset="h3" style={styles.blockedTitle}>
            관리자 전용 페이지에요.
          </AppText>
          <AppText preset="h3" style={styles.blockedText}>
            현재 계정에는 접근 권한이 없어요.
          </AppText>

          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <AppText preset="h2" style={styles.backButtonText}>
              돌아가기
            </AppText>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={filteredRecipes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <View style={styles.headerRow}>
              <View style={styles.headerSide}>
                <Pressable onPress={() => router.back()} hitSlop={8}>
                  <Ionicons
                    name="chevron-back"
                    size={22}
                    color={COLORS.semantic.textPrimary}
                  />
                </Pressable>
              </View>

              <View style={styles.headerTitleWrap}>
                <AppText preset="h1">음료 메뉴 관리</AppText>
              </View>

              <View style={[styles.headerSide, styles.headerSideRight]}>
                <Pressable
                  style={styles.addRecipeButton}
                  onPress={() => router.push("/admin/recipes/new")}
                >
                  <Ionicons
                    name="add"
                    size={18}
                    color={COLORS.semantic.textPrimary}
                  />
                </Pressable>
              </View>
            </View>

            <View style={[styles.sectionCard, styles.searchCard]}>
              <AppText preset="h2" style={styles.sectionTitle}>
                검색
              </AppText>

              <TextField
                value={search}
                onChangeText={setSearch}
                placeholder="브랜드명 또는 음료명 검색"
                placeholderTextColor={COLORS.semantic.textMuted}
                style={styles.searchInput}
                rightIcon={
                  <Image
                    source={require("@/assets/icons/etc/search.png")}
                    style={styles.searchIcon}
                  />
                }
              />
            </View>

            <View style={[styles.sectionCard, styles.categoryCard]}>
              <AppText preset="h2" style={styles.sectionTitle}>
                카테고리
              </AppText>

              <View style={styles.categoryWrap}>
                {CATEGORY_OPTIONS.map((category) => {
                  const selected = selectedCategory === category;

                  return (
                    <Pressable
                      key={category}
                      style={[
                        styles.categoryChip,
                        selected && styles.categoryChipActive,
                      ]}
                      onPress={() => setSelectedCategory(category)}
                    >
                      <AppText
                        preset="body"
                        style={[
                          styles.categoryChipText,
                          selected && styles.categoryChipTextActive,
                        ]}
                      >
                        {category}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={[styles.sectionCard, { marginBottom: 14 }]}>
              <AppText preset="h2" style={styles.sectionTitle}>
                공개 상태
              </AppText>

              <View style={styles.categoryWrap}>
                {VISIBILITY_OPTIONS.map((option) => {
                  const selected = visibilityFilter === option.key;

                  return (
                    <Pressable
                      key={option.key}
                      style={[
                        styles.categoryChip,
                        selected && styles.categoryChipActive,
                      ]}
                      onPress={() => setVisibilityFilter(option.key)}
                    >
                      <AppText
                        preset="body"
                        style={[
                          styles.categoryChipText,
                          selected && styles.categoryChipTextActive,
                        ]}
                      >
                        {option.label}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={[styles.sectionCard, { marginBottom: 14 }]}>
              <AppText preset="h2" style={styles.sectionTitle}>
                정렬
              </AppText>

              <View style={styles.categoryWrap}>
                {SORT_OPTIONS.map((option) => {
                  const selected = sortBy === option.key;

                  return (
                    <Pressable
                      key={option.key}
                      style={[
                        styles.categoryChip,
                        selected && styles.categoryChipActive,
                      ]}
                      onPress={() => setSortBy(option.key)}
                    >
                      <AppText
                        preset="body"
                        style={[
                          styles.categoryChipText,
                          selected && styles.categoryChipTextActive,
                        ]}
                      >
                        {option.label}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.menuCard}>
              <View style={[styles.menuCardHeader, { marginBottom: 0 }]}>
                <AppText preset="h2">메뉴 {filteredRecipes.length}개</AppText>
              </View>
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.menuCardEmpty}>
            <AppText preset="h3" style={styles.emptyText}>
              검색 조건에 맞는 음료가 없어요.
            </AppText>
          </View>
        }
        renderItem={({ item, index }) => (
          <View
            style={[
              styles.menuCardRow,
              index === filteredRecipes.length - 1 && styles.menuCardRowLast,
            ]}
          >
            <Pressable
              style={styles.recipeRow}
              onPress={() => {
                if (reportIdParam) return;

                router.push({
                  pathname: "/admin/recipes/[id]",
                  params: { id: item.id },
                });
              }}
            >
              <View style={styles.recipeMain}>
                <DrinkIcon iconKey={item.drinkIconKey} size={28} />
                <AppText preset="h3" numberOfLines={1}>
                  {item.name}
                </AppText>

                <AppText preset="caption" style={styles.recipeMeta}>
                  {getBrandLabel(item.brand)} /{" "}
                  {getCategoryLabel(item.category)}
                </AppText>

              <View style={styles.footerRow}>
                  <View
                  style={[
                    styles.publicBadge,
                    item.isPublic === false
                      ? styles.publicBadgeOff
                      : styles.publicBadgeOn,
                  ]}
                >
                  <AppText preset="body" style={styles.publicBadgeText}>
                    {item.isPublic === false ? "숨김" : "공개"}
                  </AppText>
                </View>
                <AppText preset="caption" style={styles.recipeMeta}>
                  수정일: {formatDate(item.updatedAt)}
                </AppText>
              </View>
              
              </View>

              <Switch
                value={item.isPublic !== false}
                onValueChange={() => handleTogglePublic(item)}
                disabled={togglingId === item.id}
              />
            </Pressable>

            {index < filteredRecipes.length - 1 ? (
              <View style={styles.divider} />
            ) : null}
          </View>
        )}
      />
    </SafeAreaView>
  );
};

export default AdminRecipesScreen;

function formatDate(value: any) {
  const date = value?.toDate?.() ?? null;
  if (!date) return "없음";

  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return `${y}.${m}.${d}`;
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 64,
    paddingBottom: 28,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  blockedTitle: {
    marginBottom: 8,
  },
  blockedText: {
    textAlign: "center",
    marginBottom: 16,
  },
  backButton: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: COLORS.base.warmBeige,
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonText: {
    color: COLORS.base.creamPaper,
  },
  emptyText: {
    color: COLORS.semantic.textSecondary,
  },
  headerRow: {
    alignSelf: "stretch",
    height: 40,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  headerSide: {
    width: 48,
    justifyContent: "center",
  },
  headerSideRight: {
    alignItems: "flex-end",
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  addRecipeButton: {
    height: 22,
    borderRadius: 999,
    backgroundColor: COLORS.semantic.primary,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  sectionCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.ui.border,
    backgroundColor: COLORS.base.white,
    padding: 16,
  },
  searchCard: {
    marginBottom: 14,
  },
  categoryCard: {
    marginBottom: 14,
  },
  menuCard: {
    backgroundColor: COLORS.base.white,
  },
  menuCardHeader: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: COLORS.ui.border,
    backgroundColor: COLORS.base.white,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  menuCardRow: {
    backgroundColor: COLORS.base.white,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderLeftColor: COLORS.ui.border,
    borderRightColor: COLORS.ui.border,
  },
  menuCardRowLast: {
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.ui.border,
  },
  menuCardEmpty: {
    backgroundColor: COLORS.base.white,
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: COLORS.ui.border,
    borderLeftColor: COLORS.ui.border,
    borderRightColor: COLORS.ui.border,
    borderBottomColor: COLORS.ui.border,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  searchInput: {
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.ui.border,
    backgroundColor: COLORS.semantic.surface,
    paddingHorizontal: 12,
    color: COLORS.semantic.textPrimary,
  },
  searchIcon: {
    width: 20,
    height: 20,
  },
  categoryWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.ui.border,
    backgroundColor: COLORS.base.warmBeige,
  },
  categoryChipActive: {
    backgroundColor: COLORS.semantic.primary,
  },
  categoryChipText: {
    color: COLORS.semantic.textSecondary,
  },
  categoryChipTextActive: {
    color: COLORS.base.creamPaper,
  },
  recipeRow: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  recipeMain: {
    flex: 1,
    minWidth: 0,
  },
  recipeMeta: {
    marginTop: 4,
    color: COLORS.semantic.textSecondary,
  },
  publicBadge: {
    alignSelf: "flex-start",
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.ui.border,
  },
  publicBadgeOn: {
    backgroundColor: "#EEF6FF",
  },
  publicBadgeOff: {
    backgroundColor: "#FFF1F3",
  },
  publicBadgeText: {
    color: COLORS.semantic.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.ui.border,
    marginVertical: 10,
  },
  footerRow: {
    width:'100%',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: 10
  }
});
