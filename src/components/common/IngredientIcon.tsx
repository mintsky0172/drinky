import { Image, StyleSheet } from "react-native";
import React from "react";
import { IngredientIconKey, INGREDIENT_ICONS } from "@/src/constants/icons";

type Props = {
  iconKey?: IngredientIconKey;
  size?: number;
};

const IngredientIcon = ({ iconKey = "default", size = 32 }: Props) => {
  return (
    <Image
      source={INGREDIENT_ICONS[iconKey]}
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
