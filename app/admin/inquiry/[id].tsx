import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import React, { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { getInquiryById, updateInquiryStatus } from "@/src/lib/admin/adminApi";
import Toast from "react-native-toast-message";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AppText from "@/src/components/ui/AppText";
import TextField from "@/src/components/ui/TextField";
import { COLORS } from "@/src/constants/colors";

const STATUS_OPTIONS = [
  { key: "open", label: "접수" },
  { key: "done", label: "처리 완료" },
];

const AdminInquiryDetailScreen = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState<any>(null);

  const [status, setStatus] = useState<"open" | "done">("open");
  const [adminMemo, setAdminMemo] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const run = async () => {
      if (!id) return;

      const data = await getInquiryById(id);
      setItem(data);

      if (data) {
        setStatus(data.status ?? "open");
        setAdminMemo(data.adminMemo ?? "");
      }
      setLoading(false);
    };
    run();
  }, [id]);

  const handleSave = async () => {
    if (!id) return;

    try {
      setSaving(true);

      await updateInquiryStatus(id, {
        status,
        adminMemo: adminMemo.trim(),
      });

      Toast.show({
        type: "success",
        text1: "문의 상태를 저장했어요.",
      });

      router.back();
    } catch {
      Toast.show({
        type: "error",
        text1: "문의 상태 저장에 실패했어요.",
      });
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

  if (!item) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <AppText preset="h3" style={styles.emptyText}>
            문의를 찾을 수 없어요.
          </AppText>
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
            <AppText preset="h1">문의 상세</AppText>
            <View style={{ width: 22 }} />
          </View>

          <View style={styles.sectionCard}>
            <AppText preset="h2" style={styles.sectionTitle}>
              {item.subject}
            </AppText>

            <AppText preset="h3" style={styles.metaText}>
              • 작성자: {item.createdByNickname || "익명"}
            </AppText>

            <AppText preset="body" style={styles.messageText}>
              {item.message}
            </AppText>
          </View>

          <View style={styles.sectionCard}>
            <AppText preset="h2" style={styles.sectionTitle}>
              처리 상태
            </AppText>

            <View style={styles.statusRow}>
              {STATUS_OPTIONS.map((option) => {
                const selected = option.key === status;

                return (
                  <Pressable
                    key={option.key}
                    style={[
                      styles.statusChip,
                      selected && styles.statusChipActive,
                    ]}
                    onPress={() => setStatus(option.key)}
                  >
                    <AppText
                      preset="body"
                      style={[
                        styles.statusChipText,
                        selected && styles.statusChipTextActive,
                      ]}
                    >
                      {option.label}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.inputGroup}>
              <AppText preset="h2" style={styles.inputLabel}>
                관리자 메모
              </AppText>
              <TextField
                value={adminMemo}
                onChangeText={setAdminMemo}
                placeholder="응답 여부나 비고 등을 적어 주세요."
                placeholderTextColor={COLORS.semantic.textMuted}
                style={[styles.input, styles.textArea]}
                multiline
                textAlignVertical="top"
              />
            </View>
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

export default AdminInquiryDetailScreen;

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
  emptyText: {
    color: COLORS.semantic.textMuted,
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
  metaText: {
    marginBottom: 4,
  },
  messageText: {
    marginTop: 8,
    lineHeight: 22,
  },
  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  statusChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.ui.border,
    backgroundColor: COLORS.base.warmBeige,
  },
  statusChipActive: {
    backgroundColor: COLORS.semantic.primary,
  },
  statusChipText: {
    color: COLORS.semantic.textSecondary,
  },
  statusChipTextActive: {
    color: COLORS.base.creamPaper,
  },
  inputGroup: {
    marginTop: 4,
  },
  inputLabel: {
    marginBottom: 6,
  },
  input: {
    paddingHorizontal: 12,
  },
  textArea: {
    minHeight: 120,
    paddingTop: 12,
    paddingBottom: 12,
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
