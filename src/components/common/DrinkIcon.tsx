import { Image, StyleSheet } from "react-native";
import React from "react";
import { DrinkIconKey, DRINK_ICONS } from "@/src/constants/icons";

type Props = {
  iconKey?: DrinkIconKey;
  size?: number;
};

const DrinkIcon = ({ iconKey = "ice_americano", size = 32 }: Props) => {
  return (
    <Image
      source={DRINK_ICONS[iconKey]}
      style={[styles.image, { width: size, height: size }]}
      resizeMode="contain"
    />
  );
};

export default DrinkIcon;

const styles = StyleSheet.create({
    image: {
        borderRadius: 0,
    }
});
