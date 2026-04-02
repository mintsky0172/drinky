import { Pressable, StyleSheet, Text, View } from "react-native";
import React from "react";
import AppText from "../ui/AppText";
import TextField from "../ui/TextField";
import { COLORS } from "@/src/constants/colors";

const BRAND_OPTIONS = [
  "스타벅스",
  "메가커피",
  "컴포즈커피",
  "빽다방",
  "공차",
  "우지커피",
  "편의점/마트",
] as const;

const BrandField = ({
  value,
  onChangeText,
}: {
  value: string;
  onChangeText: (text: string) => void;
}) => {
  return (
    <View style={styles.inputGroup}>
      <AppText preset="caption" style={styles.inputLabel}>
        브랜드
      </AppText>

      <TextField
        value={value}
        onChangeText={onChangeText}
        placeholder="브랜드 직접 입력 가능"
        placeholderTextColor={COLORS.semantic.textMuted}
        style={styles.input}
      />

      <View style={styles.brandChipWrap}>
        {BRAND_OPTIONS.map((brand) => {  
          const selected = value.trim() === brand;

          return (
            <Pressable  
              key={brand}
              style={[
                styles.brandChip,
                selected && styles.brandChipActive,
              ]}
              onPress={() => onChangeText(brand)}
            >
              <AppText
                preset='body'
                style={[
                  styles.brandChipText,
                  selected && styles.brandChipActive,
                ]}
              >
                {brand}
              </AppText>
            </Pressable>
          )
        })}
      </View>
    </View>
  );
};

export default BrandField;

const styles = StyleSheet.create({
  brandChipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 10,
  },
  brandChip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.ui.border,
    backgroundColor: COLORS.base.warmBeige,
  },
  brandChipActive: {
    backgroundColor: COLORS.semantic.primary,
  },
  brandChipText: {
    color: COLORS.semantic.textSecondary,
  },
  brandChipTextActive: {
    color: COLORS.base.creamPaper,
  }
});
