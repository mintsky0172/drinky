import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from "react-native";
import React from "react";
import { COLORS } from "@/src/constants/colors";
import AppText from "./AppText";
import { TYPOGRAPHY } from "@/src/constants/typography";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

type AppButtonProps = {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: ButtonVariant;
  size?: "md" | "sm";
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

const AppButton = ({
  label,
  onPress,
  disabled = false,
  loading = false,
  variant = "primary",
  size = "md",
  style,
  testID,
}: AppButtonProps) => {
  const isDisabled = disabled || loading;

  const containerStyle = [
    styles.base,
    size === "sm" ? styles.sm : styles.md,
    variantStyles[variant].container,
    isDisabled && styles.disabled,
    style,
  ];

  const textColor = isDisabled
    ? COLORS.ui.disabledText
    : variantStyles[variant].textColor;

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        containerStyle,
        pressed && !isDisabled ? styles.pressed : null,
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={
            variant === "primary" ? COLORS.semantic.primaryTextOn : textColor
          }
        />
      ) : (
        <AppText
          preset={size === "sm" ? "buttonSmall" : "button"}
          color={textColor}
          style={styles.label}
        >
          {label}
        </AppText>
      )}
    </Pressable>
  );
};

export default AppButton;

const variantStyles: Record<
  ButtonVariant,
  { container: ViewStyle; textColor: string }
> = {
  primary: {
    container: {
      backgroundColor: COLORS.semantic.primary,
      borderColor: COLORS.semantic.primary,
      borderWidth: 1,
    },
    textColor: COLORS.semantic.primaryTextOn,
  },
  secondary: {
    container: {
      backgroundColor: "transparent",
      borderColor: COLORS.primary.caramel,
      borderWidth: 1,
    },
    textColor: COLORS.primary.caramel,
  },
  ghost: {
    container: {
      backgroundColor: "transparent",
      borderColor: "transparent",
      borderWidth: 1,
    },
    textColor: COLORS.primary.espresso,
  },
  danger: {
    container: {
      backgroundColor: COLORS.semantic.danger,
      borderColor: COLORS.semantic.danger,
      borderWidth: 1,
    },
    textColor: "#FFFFFF",
  },
};

const styles = StyleSheet.create({
  base: {
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  md: {
    height: 48,
    paddingHorizontal: 16,
  },
  sm: {
    height: 40,
    paddingHorizontal: 14,
  },
  label: {
    ...TYPOGRAPHY.preset.button,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    backgroundColor: COLORS.ui.disabledBg,
    borderColor: COLORS.ui.disabledBg,
  },
});
