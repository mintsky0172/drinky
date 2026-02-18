import { Pressable, StyleSheet, Text, View } from "react-native";
import React, { useState } from "react";
import Toast from "react-native-toast-message";
import { SafeAreaView } from "react-native-safe-area-context";
import TextField from "@/src/components/ui/TextField";
import { COLORS } from "@/src/constants/colors";
import AppButton from "@/src/components/ui/AppButton";
import DrinkSearchOverlay from "@/src/components/record/DrinkSearchOverlay";
import SaveResultModal from "@/src/components/record/SaveResultModal";
import { TYPOGRAPHY } from "@/src/constants/typography";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

type Item = { id: string; name: string };
type Option = { value: string; label: string };

const pad2 = (n: number) => String(n).padStart(2, '0');

const RecordCreateScreen = () => {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  const [picked, setPicked] = useState<Item | null>(null);

  const [saveDone, setSaveDone] = useState(false);

  // 더미데이터
  const frequent: Item[] = [
    { id: "1", name: "아이스 아메리카노" },
    { id: "2", name: "물" },
    { id: "3", name: "바닐라 라떼" },
  ];

  const recent: Item[] = [
    { id: "4", name: "말차 프라푸치노" },
    { id: "5", name: "오렌지 주스" },
  ];

  const onPick = (item: Item) => {
    setPicked(item);
    setSearch(item.name);
    setSearchOpen(false);
  };

  const onSave = async () => {
    if (!picked) {
      Toast.show({ type: "error", text1: "음료를 먼저 선택해 주세요." });
      return;
    }
    // TODO: Firestore entries 저장 붙이기
    setSaveDone(true);
  };
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* 서치바(상단 고정) */}
        <Pressable
          onPress={() => setSearchOpen(true)}
          style={styles.searchWrap}
        >
          <TextField
            value={search}
            onChangeText={setSearch}
            placeholder="음료 검색"
            placeholderTextColor={COLORS.semantic.textSecondary}
            containerStyle={styles.searchInputContainer}
            style={styles.searchInputText}
            leftIcon={
              <Ionicons
                name="search"
                size={18}
                color={COLORS.semantic.textSecondary}
              />
            }
            editable={false}
            pointerEvents="none"
          />
        </Pressable>

        {/* Body */}
        <View style={styles.body}>
          <Text style={styles.sectionTitle}>기록하기</Text>

          <View style={styles.card}>
            <Text style={styles.label}>선택한 음료</Text>
            <Text style={styles.value}>
              {picked?.name ?? "아직 선택되지 않았어요"}
            </Text>

            {/* TODO: 사이즈/잔수/시간/메모 UI 추가 */}
          </View>
        </View>

        {/* 저장 버튼 */}
        <AppButton label="저장" variant="primary" />

        {/* 오버레이 + 저장 모달 */}
        <DrinkSearchOverlay
          visible={searchOpen}
          onClose={() => setSearchOpen(false)}
          frequent={frequent}
          recent={recent}
          onPick={onPick}
        />

        <SaveResultModal
          visible={saveDone}
          onGoHome={() => {
            setSaveDone(false);
            router.replace("/(tabs)");
          }}
          onContinue={() => {
            setSaveDone(false);
            setPicked(null);
            setSearch("");
            Toast.show({ type: "info", text1: "계속 기록해 보아요!" });
          }}
        />
      </View>
    </SafeAreaView>
  );
};

export default RecordCreateScreen;

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: COLORS.base.creamPaper},
    container: { flex: 1, paddingHorizontal: 20},
    searchWrap : {
        paddingHorizontal: 16,
        paddingTop: 10,
    },
    searchInputContainer: {
        height: 44,
        borderWidth: 1,
        borderColor: COLORS.ui.border,
        backgroundColor: COLORS.semantic.surface,
        borderRadius: 14,
    },
    searchInputText: {
        fontFamily: TYPOGRAPHY.fontFamily.title,
        fontSize: TYPOGRAPHY.size.body,
        lineHeight: 18,
        color: COLORS.semantic.textPrimary,
        paddingVertical: 0,
        textAlignVertical: "center",
    },
    body: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    sectionTitle: {
        ...TYPOGRAPHY.preset.h2,
        color: COLORS.semantic.textPrimary,
        marginBottom: 12,
    },
    card: {
        borderRadius: 18,
        padding: 16,
        borderWidth: 1,
        borderColor: COLORS.ui.border,
        backgroundColor: COLORS.semantic.surface,
    },
    label: { ...TYPOGRAPHY.preset.caption, color: COLORS.semantic.textSecondary, marginBottom: 6
    },
    value: { ...TYPOGRAPHY.preset.h3, color: COLORS.semantic.textPrimary},
  
});
