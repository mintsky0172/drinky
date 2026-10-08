import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppText from "@/src/components/ui/AppText";
import { COLORS } from "@/src/constants/colors";

export default function IconSelectField({
  label,
  value,
  icon,
  placeholder,
  onPress,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  placeholder: string;
  onPress: () => void;
}) {
  return (
    <View style={styles.inputGroup}>
      <AppText preset="caption" style={styles.inputLabel}>
        {label}
      </AppText>

      <Pressable style={styles.iconSelectField} onPress={onPress}>
        <View style={styles.iconSelectPreview}>{icon}</View>
        <View style={styles.iconSelectTextWrap}>
          <AppText
            preset="body"
            style={styles.iconSelectValue}
            numberOfLines={1}
          >
            {value || "자동(기본)"}
          </AppText>
          <AppText
            preset="caption"
            style={styles.iconSelectHint}
            numberOfLines={1}
          >
            {placeholder}
          </AppText>
        </View>
        <Ionicons
          name="chevron-down"
          size={18}
          color={COLORS.semantic.textSecondary}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    marginBottom: 6,
    color: COLORS.semantic.textSecondary,
  },
  iconSelectField: {
    minHeight: 56,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.ui.border,
    backgroundColor: COLORS.semantic.surface,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconSelectPreview: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: COLORS.ui.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.base.creamPaper,
  },
  iconSelectTextWrap: {
    flex: 1,
    gap: 2,
  },
  iconSelectValue: {
    color: COLORS.semantic.textPrimary,
  },
  iconSelectHint: {
    color: COLORS.semantic.textSecondary,
  },
});
