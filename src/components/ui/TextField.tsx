import {
  StyleProp,
  StyleSheet,
  TextInput,
  TextInputProps,
  TextStyle,
} from "react-native";
import React from "react";
import { COLORS } from "@/src/constants/colors";
import { TYPOGRAPHY } from "@/src/constants/typography";

type Props = TextInputProps & {
  value: string;
  onChangeText: (text: string) => void;
  style?: StyleProp<TextStyle>;
};

const TextField = ({ value, onChangeText, placeholder, style, ...inputProps }: Props) => {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={COLORS.ui.disabledText}
      style={[styles.input, style]}
      {...inputProps}
    />
  );
};

export default TextField;

const styles = StyleSheet.create({
  input: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.ui.border,
    paddingHorizontal: 22,
    backgroundColor: COLORS.semantic.surface,
    color: COLORS.semantic.textPrimary,
    ...TYPOGRAPHY.preset.body,
    fontSize: 14,
    lineHeight: 0
  },
});
