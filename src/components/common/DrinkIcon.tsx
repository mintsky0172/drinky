import { Image, StyleSheet } from "react-native";
import React from "react";
import { DrinkIconKey, DRINK_ICONS } from "@/src/constants/icons";

type DrinkIconProps = {
  iconUrl?: string | null;
  iconKey?: DrinkIconKey | null;
  size?: number;
};

const DrinkIcon = ({ iconUrl, iconKey, size = 32 }: DrinkIconProps) => {
  const localSource =
    iconKey && iconKey in DRINK_ICONS
      ? DRINK_ICONS[iconKey as DrinkIconKey]
      : undefined;

  const source = localSource ?? (iconUrl ? { uri: iconUrl } : undefined);

  if (source) {
    return (
      <Image
        source={source}
        style={[styles.image, { width: size, height: size }]}
        resizeMode="contain"
      />
    );
  }

  return (
    <Image
      source={require("@/assets/icons/ingredients/default.png")}
      style={[styles.image, { width: size, height: size }]}
      resizeMode="contain"
    />
  );
};

export default DrinkIcon;

const styles = StyleSheet.create({
  image: {
    borderRadius: 0,
  },
});
