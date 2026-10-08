import { Image } from "react-native";
import React from "react";
import { TOPPING_ICONS, ToppingIconKey } from "@/src/constants/icons";

type Props = {
  iconKey?: ToppingIconKey | null;
  iconUrl?: string | null;
  size?: number;
};

const ToppingIcon = ({ iconKey, iconUrl, size = 32 }: Props) => {
  const localSource =
    iconKey && iconKey in TOPPING_ICONS
      ? TOPPING_ICONS[iconKey]
      : TOPPING_ICONS.default;

  return (
    <Image
      source={iconUrl ? { uri: iconUrl } : localSource}
      style={{ width: size, height: size }}
      resizeMode="contain"
    />
  );
};

export default ToppingIcon;
