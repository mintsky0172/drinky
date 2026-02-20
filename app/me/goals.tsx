import {
  Pressable,
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
} from "react-native";
import React, { useCallback, useMemo, useState } from "react";
import { updateUserGoals, UserGoals } from "@/src/lib/user";
import { useRouter } from "expo-router";
import { useAuth } from "@/src/providers/AuthProvider";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/src/lib/firebase";
import Toast from "react-native-toast-message";
import { SafeAreaView } from "react-native-safe-area-context";

import AppButton from "@/src/components/ui/AppButton";

import TextField from "@/src/components/ui/TextField";
import { COLORS } from "@/src/constants/colors";
import { TYPOGRAPHY } from "@/src/constants/typography";

const DEFAULT_GOALS: UserGoals = {
  waterMl: 2000,
  caffeineMg: 300,
  sugarG: 50,
};

const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));
const toInt = (s: string) => {
  const n = parseInt((s ?? "").replace(/[^\d]/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
};

const GoalSettingsScreen = () => {
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);

  // 입력은 문자열로 들고, 저장할 때 숫자로 변환
  const [waterText, setWaterText] = useState(String(DEFAULT_GOALS.waterMl));
  const [caffeineText, setCaffeineText] = useState(
    String(DEFAULT_GOALS.caffeineMg),
  );
  const [sugarText, setSugarText] = useState(String(DEFAULT_GOALS.sugarG));

  React.useEffect(() => {
    const run = async () => {
      if (!user) return;
      try {
        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);
        const g = (snap.data()?.goals ?? {}) as Partial<UserGoals>;
        setWaterText(String(g.waterMl ?? DEFAULT_GOALS.waterMl));
        setCaffeineText(String(g.caffeineMg ?? DEFAULT_GOALS.caffeineMg));
        setSugarText(String(g.sugarG ?? DEFAULT_GOALS.sugarG));
      } catch {
        // TODO: 불러오기 실패해도 기본값으로 진행
      }
    };
    run();
  }, [user]);

  const parsed = useMemo(() => {
    const waterMl = clamp(toInt(waterText), 0, 6000);
    const caffeineMg = clamp(toInt(caffeineText), 0, 800);
    const sugarG = clamp(toInt(sugarText), 0, 200);
    return { waterMl, caffeineMg, sugarG };
  }, [waterText, caffeineText, sugarText]);

  const handleQuickPick = useCallback((key: keyof UserGoals, value: number) => {
    if (key === "waterMl") setWaterText(String(value));
    if (key === "caffeineMg") setCaffeineText(String(value));
    if (key === "sugarG") setSugarText(String(value));
  }, []);

  const handleReset = useCallback(() => {
    setWaterText(String(DEFAULT_GOALS.waterMl));
    setCaffeineText(String(DEFAULT_GOALS.caffeineMg));
    setSugarText(String(DEFAULT_GOALS.sugarG));
    Toast.show({ type: "error", text1: "로그인이 필요해요" });
  }, []);

  const handleSave = useCallback(async () => {
    if (!user) {
      Toast.show({ type: "error", text1: "로그인이 필요해요" });
      return;
    }

    if (parsed.waterMl === 0) {
      Toast.show({
        type: "info",
        text1: "수분 목표가 0이에요. 괜찮다면 저장할게요!",
      });
    }

    setLoading(true);
    try {
      await updateUserGoals(user.uid, parsed);
      Toast.show({ type: "success", text1: "목표를 저장했어요!" });
      router.back();
    } catch {
      Toast.show({ type: "error", text1: "저장에 실패했어요" });
    } finally {
      setLoading(false);
    }
  }, [user, parsed, router]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>목표 설정</Text>
        <Text style={styles.sub}>
          하루 목표를 정해두면{"\n"}홈 카드와 요약이 더 정확해져요.
        </Text>

        {/* 수분 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>수분(mL)</Text>
          <Text style={styles.cardHint}>※ 수분은 순수 물만 계산돼요.</Text>

          <View style={styles.quickRow}>
            {[1500, 2000, 2500].map((v) => (
              <QuickChip
                key={v}
                label={`${v}mL`}
                onPress={() => handleQuickPick("waterMl", v)}
              />
            ))}
          </View>

          <LabeledInput
            label="직접 입력"
            value={waterText}
            onChangeText={setWaterText}
            suffix="mL"
          />
        </View>

        {/* 카페인 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>카페인(mg)</Text>
          <View style={styles.quickRow}>
            {[200, 300, 400].map((v) => (
              <QuickChip
                key={v}
                label={`${v}mg`}
                onPress={() => handleQuickPick("caffeineMg", v)}
              />
            ))}
          </View>

          <LabeledInput
            label="직접 입력"
            value={caffeineText}
            onChangeText={setCaffeineText}
            suffix="mg"
          />
        </View>

        {/* 당 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>당류(g)</Text>
          <View style={styles.quickRow}>
            {[25, 50, 75].map((v) => (
              <QuickChip
                key={v}
                label={`${v}g`}
                onPress={() => handleQuickPick("sugarG", v)}
              />
            ))}
          </View>

          <LabeledInput
            label="직접 입력"
            value={sugarText}
            onChangeText={setSugarText}
            suffix="g"
          />
        </View>

        <View style={{ height: 10 }} />

        <AppButton
          label="저장하기"
          variant="primary"
          onPress={handleSave}
          disabled={loading}
        />
        <View style={{ height: 10 }} />
        <AppButton
          label="기본값으로 되돌리기"
          variant="secondary"
          onPress={handleReset}
          disabled={loading}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

export default GoalSettingsScreen;

function QuickChip({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.chip} hitSlop={8}>
      <Text style={styles.chipText}>{label}</Text>
    </Pressable>
  );
}

function LabeledInput({
  label,
  value,
  onChangeText,
  suffix,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  suffix: string;
}) {
  return (
    <View style={{ marginTop: 12 }}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          keyboardType="number-pad"
          placeholder="0"
          placeholderTextColor={COLORS.semantic.textSecondary}
          style={styles.input}
        />
        <Text style={styles.suffix}>{suffix}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "transparent" },
  screen: { flex: 1, backgroundColor: "transparent" },
  container: {
    flexGrow: 1,
    paddingTop: 20,
    paddingHorizontal: 40,
    paddingBottom: 28,
    backgroundColor: "transparent",
  },
  title: { ...TYPOGRAPHY.preset.h2, color: COLORS.semantic.textPrimary },
  sub: {
    ...TYPOGRAPHY.preset.body,
    color: COLORS.semantic.textSecondary,
    marginTop: 6,
    marginBottom: 14,
  },

  card: {
    backgroundColor: COLORS.semantic.surfaceAlt,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.ui.border,
    marginTop: 12,
  },
  cardTitle: { ...TYPOGRAPHY.preset.h3, color: COLORS.semantic.textPrimary },
  cardHint: {
    ...TYPOGRAPHY.preset.caption,
    color: COLORS.semantic.textSecondary,
    marginTop: 4,
  },

  quickRow: { flexDirection: "row", gap: 8, marginTop: 10, flexWrap: "wrap" },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.ui.border,
    backgroundColor: COLORS.base.creamPaper,
  },
  chipText: {
    ...TYPOGRAPHY.preset.caption,
    color: COLORS.semantic.textPrimary,
  },

  inputLabel: {
    ...TYPOGRAPHY.preset.caption,
    color: COLORS.semantic.textSecondary,
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.ui.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.semantic.surface,
  },
  input: {
    textAlignVertical: "center",
    flex: 1,
    ...TYPOGRAPHY.preset.body,
    color: COLORS.semantic.textPrimary,
    paddingVertical: 0,
    lineHeight: 0,
  },
  suffix: {
    ...TYPOGRAPHY.preset.body,
    color: COLORS.semantic.textSecondary,
    marginLeft: 8,
  },
});
