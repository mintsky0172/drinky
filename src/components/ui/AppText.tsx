import { COLORS } from "@/src/constants/colors";
import { TYPOGRAPHY, TypographyPresetKey } from "@/src/constants/typography";
import React from "react";
import { StyleProp, Text, TextProps, TextStyle } from "react-native";

type AppTextProps = TextProps & {
  preset?: TypographyPresetKey;
  color?: string;
  style?: StyleProp<TextStyle>;
};

function AppText({
  preset = "body",
  color = COLORS.semantic.textPrimary,
  style,
  ...rest
}: AppTextProps) {
  return (
    <Text
      {...rest}
      style={[TYPOGRAPHY.preset[preset], { color }, style]}
      allowFontScaling={false}
    />
  );
}

export default AppText;
