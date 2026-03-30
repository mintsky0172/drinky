import AppText from "@/src/components/ui/AppText";
import TextField from "@/src/components/ui/TextField";
import { COLORS } from "@/src/constants/colors";
import { useAuth } from "@/src/providers/AuthProvider";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { submitInquiry } from "@/src/lib/inquiries/inquiriesApi";

export default function NewInquiryScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canSubmit =
    subject.trim().length > 0 && message.trim().length > 0 && !submitting;

  const handleSubmit = async () => {
    if (!user) {
      Toast.show({ type: "error", text1: "로그인이 필요해요." });
      return;
    }

    if (!canSubmit) {
      Toast.show({ type: "error", text1: "제목과 내용을 입력해 주세요." });
      return;
    }

    try {
      setSubmitting(true);

      await submitInquiry({
        subject: subject.trim(),
        message: message.trim(),
        createdBy: user.uid,
        createdByNickName: user.displayName ?? "",
        email: email.trim()
      });

      Toast.show({
        type: "success",
        text1: "문의가 접수되었어요.",
      });

      router.back();
    } catch {
      Toast.show({
        type: "error",
        text1: "문의 접수에 실패했어요.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.safe}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
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
            <AppText preset="h1">문의하기</AppText>
            <View style={{ width: 22 }} />
          </View>

          <View style={styles.sectionCard}>
            <AppText preset="h2" style={styles.sectionTitle}>
              문의 내용
            </AppText>
            <View style={styles.inputGroup}>
              <AppText preset="h3" style={styles.inputLabel}>
                제목
              </AppText>
              <TextField
                value={subject}
                onChangeText={setSubject}
                placeholder="문의 제목을 입력해 주세요"
                placeholderTextColor={COLORS.semantic.textMuted}
                style={styles.input}
              />
            </View>

            <View style={styles.inputGroup}>
              <AppText preset="h3" style={styles.inputLabel}>
                내용
              </AppText>
              <TextInput
                value={message}
                onChangeText={setMessage}
                placeholder="불편하셨던 점이나 궁금하신 점을 자유롭게 적어 주세요."
                placeholderTextColor={COLORS.semantic.textMuted}
                style={[styles.input, styles.textArea]}
                multiline
                textAlignVertical="top"
              />
            </View>

            <View style={styles.inputGroup}>
              <AppText preset="h3" style={styles.inputLabel}>
                이메일
              </AppText>
              <TextField
                value={email}
                onChangeText={setEmail}
                placeholder="답변 받으실 이메일을 적어 주세요."
                placeholderTextColor={COLORS.semantic.textMuted}
                style={styles.input}
              />
            </View>
          </View>

          <View>
            <AppText preset="body" style={styles.infoText}>
              문의해주신 내용은 관리자가 확인 후{"\n"}답변 드릴 예정이에요.
            </AppText>
          </View>

          <Pressable
            style={[
              styles.submitButton,
              !canSubmit && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <AppText preset="h2">
              {submitting ? "제출 중 ..." : "문의하기"}
            </AppText>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
  headerRow: {
    height: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
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
    marginBottom: 16,
  },
  inputLabel: {
    marginBottom: 8,
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
    fontSize: 14,
  },

  textArea: {
    minHeight: 120,
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 12,
  },
  infoText: {
    textAlign: "center",
    lineHeight: 22,
  },
  submitButton: {
    height: 50,
    borderRadius: 16,
    backgroundColor: COLORS.base.warmBeige,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  submitButtonDisabled: {
    opacity: 0.45,
  },
});
