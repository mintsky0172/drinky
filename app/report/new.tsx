import AppText from "@/src/components/ui/AppText";
import DrinkSearchModal, {
  type SearchableDrinkItem,
} from "@/src/components/record/DrinkSearchModal";
import TextField from "@/src/components/ui/TextField";
import { COLORS } from "@/src/constants/colors";
import { db } from "@/src/lib/firebase";
import { submitReport } from "@/src/lib/reports/reportsApi";
import { useAuth } from "@/src/providers/AuthProvider";
import { ReportType } from "@/src/types/admin";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { TYPOGRAPHY } from "@/src/constants/typography";
import { collection, onSnapshot, query, where } from "firebase/firestore";


const REPORT_TYPES: { key: ReportType; label: string}[] = [
    { key: "new_drink", label: "새로운 음료 제보"},
    { key: "discontinued_drink", label: "단종된 음료 제보"},
];

function toBrandLabel(raw: string | null | undefined) {
    const brand = raw?.trim().toLowerCase();
    if (!brand) return "";

    const labelMap: Record<string, string> = {
        starbucks: "스타벅스",
        mega: "메가커피",
        compose: "컴포즈커피",
        paik: "빽다방",
        gongcha: "공차",
        oozy: "우지커피",
        twosome: '투썸플레이스',
    };

    return labelMap[brand] ?? raw ?? "";
}

export default function NewReportScreen() {
    const router = useRouter();
    const { user } = useAuth();
    
    const [type, setType] = useState<ReportType>("new_drink");
    const [brand, setBrand] = useState('');
    const [drinkName, setDrinkName] = useState('');
    const [message, setMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const messageInputRef = useRef<TextInput>(null);
    const [recipeItems, setRecipeItems] = useState<SearchableDrinkItem[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchOpen, setSearchOpen] = useState(false);
    const searchIcon = require("@/assets/icons/etc/search.png");

    const title = useMemo(
        () => (type === "new_drink" ? "새로운 음료 제보하기" : "단종된 음료 제보하기"),
        [type],
     );

    useEffect(() => {
      const recipesRef = collection(db, "recipes");
      const recipesQ = query(recipesRef, where("isPublic", "==", true));

      const unsubscribe = onSnapshot(recipesQ, (snap) => {
        const rows: SearchableDrinkItem[] = [];

        snap.docs.forEach((docSnap) => {
          const data = docSnap.data() as {
            name?: string;
            brand?: string | null;
            category?: string;
            normalizedName?: string;
            aliases?: string[];
            searchKeywords?: string[];
            drinkIconKey?: string;
            iconUrl?: string | null;
            createdAt?: { toMillis?: () => number };
            popularityCount?: number;
            popularityScore?: number;
          };

          const name = (data.name ?? "").trim();
          if (!name) return;

          rows.push({
            id: docSnap.id,
            name,
            brand: data.brand ?? null,
            category: data.category,
            normalizedName: data.normalizedName,
            aliases: data.aliases ?? [],
            searchKeywords: data.searchKeywords ?? [],
            drinkIconKey: data.drinkIconKey,
            iconUrl: data.iconUrl ?? null,
            createdAtMs:
              typeof data.createdAt?.toMillis === "function"
                ? Number(data.createdAt.toMillis())
                : 0,
            popularityScore: Number(
              data.popularityCount ?? data.popularityScore ?? 0,
            ),
          });
        });

        setRecipeItems(rows);
      });

      return () => unsubscribe();
    }, []);

    useEffect(() => {
      if (type !== "discontinued_drink") {
        setSearchOpen(false);
        setSearchQuery("");
      }
    }, [type]);

    const canSubmit = 
     drinkName.trim().length > 0 &&
     message.trim().length > 0 &&
     !submitting;

     const handleSubmit = async () => {
        if(!canSubmit) {
            Toast.show({type: 'error', text1: '내용을 모두 입력해 주세요.'});
            return;
        }

        try {
            setSubmitting(true);

            await submitReport({
                type,
                brand: brand.trim(),
                drinkName: drinkName.trim(),
                title,
                message: message.trim(),
                createdBy: user?.uid ?? 'guest',
                createdByNickname: user?.displayName?.trim() ?? '',
                isAnonymous: !user,
             });

             Toast.show({
                type: 'success',
                text1: '제보가 접수되었어요!',
                text2: '확인 후 데이터에 반영할게요.'
             });

             router.back();
        } catch (e: any) {
            const message = String(e?.message ?? e);
            Toast.show({
                type: 'error',
                text1: '제보 접수에 실패했어요',
                text2: message,
            });
        } finally {
            setSubmitting(false);
        }
     };

     const handlePickRecipe = (item: SearchableDrinkItem) => {
        setDrinkName(item.name);
        setBrand(toBrandLabel(item.brand));
        setSearchQuery(item.name);
        setSearchOpen(false);
     };

     return (
        <SafeAreaView style={styles.safe}>
            <KeyboardAvoidingView
                style={styles.safe}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView
                    contentContainerStyle={styles.container}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.headerRow}>
                        <Pressable onPress={() => router.back()} hitSlop={8}>
                            <Ionicons
                                name="chevron-back"
                                size={22}
                                color={COLORS.semantic.textPrimary}
                            />
                        </Pressable>
                        <AppText preset="h1">
                            음료 제보
                        </AppText>
                        <View style={{ width: 22 }} />
                    </View>

                    <View style={styles.sectionCard}>
                        <AppText preset="h2" style={styles.sectionTitle}>제보 종류</AppText>

                        <View style={styles.typeRow}>
                            {REPORT_TYPES.map((option) => {
                                const selected = option.key === type;
                                return (
                                    <Pressable
                                        key={option.key}
                                        style={[styles.typeChip, selected && styles.typeChipActive]}
                                        onPress={() => setType(option.key)}
                                    >
                                        <AppText
                                            style={[
                                                styles.typeChipText,
                                                selected && styles.typeChipTextActive,
                                            ]}
                                        >
                                            {option.label}
                                        </AppText>
                                    </Pressable>
                                )
                            })}
                        </View>
                    </View>

                    <View style={styles.sectionCard}>
                        <AppText preset="h2" style={styles.sectionTitle}>음료 정보</AppText>
                        <View style={styles.inputGroup}>
                            <AppText preset="h3" style={styles.inputLabel}>브랜드(선택)</AppText>
                            <TextField
                                value={brand}
                                onChangeText={setBrand}
                                placeholder={
                                  type === "discontinued_drink"
                                    ? "음료를 선택하면 자동으로 입력돼요"
                                    : "예) 스타벅스, 메가커피"
                                }
                                placeholderTextColor={COLORS.semantic.textMuted}
                                style={styles.input}
                                editable={type !== "discontinued_drink"}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <AppText preset="h3" style={styles.inputLabel}>음료명</AppText>
                            {type === "discontinued_drink" ? (
                                <Pressable
                                    style={styles.searchField}
                                    onPress={() => setSearchOpen(true)}
                                >
                                    <AppText
                                        style={
                                            drinkName
                                                ? styles.searchFieldText
                                                : styles.searchFieldPlaceholder
                                        }
                                    >
                                        {drinkName || "단종된 음료를 검색해 주세요"}
                                    </AppText>
                                    <Image source={searchIcon} style={styles.searchIcon} />
                                </Pressable>
                            ) : (
                                <TextField
                                    value={drinkName}
                                    onChangeText={setDrinkName}
                                    placeholder="예) 피스타치오 밀크티"
                                    placeholderTextColor={COLORS.semantic.textMuted}
                                    style={styles.input}
                                />
                            )}
                        </View>

                        <View style={styles.inputGroup}>
                            <AppText preset="h3" style={styles.inputLabel}>상세 내용</AppText>
                            <View style={styles.textAreaWrap}>
                                {!message ? (
                                    <Pressable
                                        style={styles.placeholderOverlay}
                                        onPress={() => messageInputRef.current?.focus()}
                                    >
                                        <AppText style={styles.textAreaPlaceholder}>
                                            {type === 'discontinued_drink' ? '언제부터 안 보였는지, 어떤 매장에서 확인했는지, 시즌 종료인지 등을 적어 주시면 좋아요.' : '핫/아이스 여부, 사이즈, 맛의 특징 등 자세히 적어주시면 좋아요!'}
                                        </AppText>
                                    </Pressable>
                                ) : null}

                                <TextInput
                                    ref={messageInputRef}
                                    value={message}
                                    onChangeText={setMessage}
                                    style={[styles.input, styles.textArea]}
                                    multiline
                                    textAlignVertical='top'
                                />
                            </View>
                        </View>
                    </View>

                    <View>
                        <AppText preset="body" style={styles.infoText}>
                          제보해주신 내용은 관리자가 확인 후{'\n'}데이터에 반영될 예정이에요.
                        </AppText>
                    </View>

                    <Pressable
                        style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
                        onPress={handleSubmit}
                        disabled={submitting}
                    >
                        <AppText preset="h2">
                            {submitting ? '제출 중 ...' : '제보하기'}
                        </AppText>
                    </Pressable>
             </ScrollView>
            </KeyboardAvoidingView>

            <DrinkSearchModal
                visible={searchOpen}
                query={searchQuery}
                items={recipeItems}
                onChangeQuery={setSearchQuery}
                onPick={handlePickRecipe}
                onClose={() => setSearchOpen(false)}
            />
        </SafeAreaView>
     )
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
    headerRow: {
        height: 40,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
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
    typeRow: {
        flexDirection: 'row',
        gap: 10,
    },
    typeChip: {
        flex: 1,
        minHeight: 42,
        borderRadius : 999,
        borderWidth: 1,
        borderColor: COLORS.ui.border,
        backgroundColor: COLORS.semantic.surfaceAlt,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 12,
    },
    typeChipActive: {
        backgroundColor: COLORS.semantic.primary,
    },
    typeChipText: {
        color: COLORS.semantic.textSecondary,
    },
    typeChipTextActive: {
        color: COLORS.base.creamPaper,
    },
    inputGroup: {
        marginBottom: 12,
    },
    inputLabel: {
        marginBottom: 6,
    },
    input: {
        minHeight: 46,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: COLORS.ui.border,
        backgroundColor: COLORS.semantic.surface,
        paddingHorizontal: 12,
        paddingTop: 0,
        paddingBottom: 0,
        color: COLORS.semantic.textPrimary,
        fontFamily: "Iseoyun",
        fontSize: 14,
        lineHeight: 15,
        textAlignVertical: "center",
    },
    searchField: {
        minHeight: 46,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: COLORS.ui.border,
        backgroundColor: COLORS.semantic.surface,
        paddingHorizontal: 12,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
    },
    searchFieldText: {
        ...TYPOGRAPHY.preset.h3,
        flex: 1,
        color: COLORS.semantic.textPrimary,
    },
    searchFieldPlaceholder: {
        ...TYPOGRAPHY.preset.h3,
        flex: 1,
        color: COLORS.semantic.textMuted,
    },
    searchIcon: {
        width: 18,
        height: 18,
        resizeMode: "contain",
    },
    textArea: {
        minHeight: 140,
        paddingTop: 12,
        paddingBottom: 12,
        textAlignVertical: "top",
    },
    textAreaWrap: {
        position: "relative",
    },
    placeholderOverlay: {
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        zIndex: 1,
        paddingHorizontal: 12,
        paddingTop: 12,
    },
    textAreaPlaceholder: {
        ...TYPOGRAPHY.preset.h3,
        color: COLORS.semantic.textMuted,
    },
    infoText: {
        textAlign: 'center',
    },
    submitButton: {
        height: 50,
        borderRadius: 16,
        backgroundColor: COLORS.base.warmBeige,
        alignItems: 'center',
        justifyContent: 'center'
    },
    submitButtonDisabled: {
        opacity: 0.45,
    },

})
