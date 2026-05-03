import { Image, StyleSheet } from "react-native";
import React from "react";
import { IngredientIconKey, INGREDIENT_ICONS } from "@/src/constants/icons";

type Props = {
  iconKey?: IngredientIconKey | null;
  iconUrl?: string | null;
  size?: number;
};

const IngredientIcon = ({ iconKey = "default", iconUrl, size = 32 }: Props) => {
  const localSource =
    iconKey && iconKey in INGREDIENT_ICONS
      ? INGREDIENT_ICONS[iconKey as IngredientIconKey]
      : undefined;

  const source = (iconUrl ? { uri: iconUrl } : undefined) ?? localSource;

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

export default IngredientIcon;

const styles = StyleSheet.create({
    image: {
        borderRadius: 999,
    }
});
