import { Image, StyleSheet, Text, View } from "react-native";
import React from "react";
import { IconKey, ICONS } from "@/src/constants/icons";

type Props = {
  iconKey?: IconKey;
  size?: number;
};

const DrinkIcon = ({ iconKey = "default", size = 32 }: Props) => {
  return (
    <Image
      source={ICONS[iconKey] ?? ICONS.default}
      style={[styles.image, { width: size, height: size }]}
      resizeMode="contain"
    />
  );
};

export default DrinkIcon;

const styles = StyleSheet.create({
    image: {
        borderRadius: 999,
    }
});
