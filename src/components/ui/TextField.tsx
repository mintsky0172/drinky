import {
  StyleProp,
  StyleSheet,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import React from "react";
import { COLORS } from "@/src/constants/colors";

type Props = TextInputProps & {
  value: string;
  onChangeText: (text: string) => void;
  style?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
};

const TextField = ({
  value,
  onChangeText,
  placeholder,
  style,
  containerStyle,
  leftIcon,
  rightIcon,
  ...inputProps
}: Props) => {
  const hasIcon = Boolean(leftIcon || rightIcon);

  return (
    <View style={[styles.container, hasIcon && styles.containerWithIcon, containerStyle]}>
      {leftIcon ? <View style={styles.iconSlot}>{leftIcon}</View> : null}

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.ui.disabledText}
        style={[styles.input, style, hasIcon && styles.inputWithIcon]}
        {...inputProps}
      />

      {rightIcon ? <View style={styles.iconSlot}>{rightIcon}</View> : null}
    </View>
  );
};

export default TextField;

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  containerWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.ui.border,
    backgroundColor: COLORS.semantic.surface,
    paddingHorizontal: 12,
    overflow: "hidden",
  },
  iconSlot: {
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.ui.border,
    paddingHorizontal: 22,
    backgroundColor: COLORS.semantic.surface,
    color: COLORS.semantic.textPrimary,
    fontFamily: "Iseoyun",
    fontSize: 14,
    paddingVertical: 0,
    textAlignVertical: "center",
  },
  inputWithIcon: {
    flex: 1,
    height: "100%",
    borderWidth: 0,
    borderRadius: 0,
    backgroundColor: "transparent",
    paddingHorizontal: 10,
    paddingVertical: 0,
    lineHeight: 15,
    textAlignVertical: "center",
  },
});
