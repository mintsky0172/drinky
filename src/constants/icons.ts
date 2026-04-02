import { GENERATED_DRINK_ICONS } from "./icons.generated";

export const DRINK_ICONS = GENERATED_DRINK_ICONS;

export type DrinkIconKey = keyof typeof DRINK_ICONS;

export const INGREDIENT_ICONS = {
  water: require("@/assets/icons/ingredients/water.png"),
  coffee: require("@/assets/icons/ingredients/coffee.png"),
  milk: require("@/assets/icons/ingredients/milk.png"),
  default: require("@/assets/icons/ingredients/default.png"),
  ice: require("@/assets/icons/ingredients/ice.png"),
  chocolate: require("@/assets/icons/ingredients/chocolate.png"),
  white_chcolate: require("@/assets/icons/ingredients/white_chocolate.png"),
  strawberry: require("@/assets/icons/ingredients/strawberry.png"),
  lemon: require("@/assets/icons/ingredients/lemon.png"),
  orange: require("@/assets/icons/ingredients/orange.png"),
  grapefruit: require("@/assets/icons/ingredients/grapefruit.png"),
  lime: require("@/assets/icons/ingredients/lime.png"),
  peach: require("@/assets/icons/ingredients/peach.png"),
  apple: require("@/assets/icons/ingredients/apple.png"),
  banana: require("@/assets/icons/ingredients/banana.png"),
  blueberry: require("@/assets/icons/ingredients/blueberry.png"),
  cherry: require("@/assets/icons/ingredients/cherry.png"),
  mango: require("@/assets/icons/ingredients/mango.png"),
  grape: require("@/assets/icons/ingredients/grape.png"),
  green_grape: require("@/assets/icons/ingredients/green_grape.png"),
  leaf: require("@/assets/icons/ingredients/matcha.png"),
  mint: require("@/assets/icons/ingredients/mint.png"),
  teabag: require("@/assets/icons/ingredients/teabag.png"),
  fizzy: require("@/assets/icons/ingredients/fizzy.png"),
  vanilla: require("@/assets/icons/ingredients/vanilla.png"),
  yogurt: require("@/assets/icons/ingredients/yogurt.png"),
  energy: require("@/assets/icons/ingredients/energy.png"),
  honey: require("@/assets/icons/ingredients/honey.png"),
  caramel: require("@/assets/icons/ingredients/caramel.png"),
  hazelnut: require("@/assets/icons/ingredients/hazelnut.png"),
  cinnamon: require("@/assets/icons/ingredients/cinnamon.png"),
  black_sesame: require("@/assets/icons/ingredients/black_sesame.png"),
  hibiscus: require("@/assets/icons/ingredients/hibiscus.png"),
  lychee: require("@/assets/icons/ingredients/lychee.png"),
  kiwi: require("@/assets/icons/ingredients/kiwi.png"),
  gold_kiwi: require("@/assets/icons/ingredients/gold_kiwi.png"),
  coconut: require("@/assets/icons/ingredients/coconut.png"),
  cookie: require("@/assets/icons/ingredients/cookie.png"),
  sweet_potato: require("@/assets/icons/ingredients/sweet_potato.png"),
  grain: require("@/assets/icons/ingredients/grain.png"),
  jujube: require("@/assets/icons/ingredients/jujube.png"),
  maesil: require("@/assets/icons/ingredients/maesil.png"),
  red_bean: require("@/assets/icons/ingredients/red_bean.png"),
  passion_fruit: require("@/assets/icons/ingredients/passion_fruit.png"),
  plum: require("@/assets/icons/ingredients/plum.png"),
  omija: require('@/assets/icons/ingredients/omija.png'),
  pineapple: require('@/assets/icons/ingredients/pineapple.png'),
  melon: require('@/assets/icons/ingredients/melon.png'),
  pomegranate: require('@/assets/icons/ingredients/pomegranate.png'),
  tomato: require('@/assets/icons/ingredients/tomato.png'),
  pistachio: require('@/assets/icons/ingredients/pistachio.png'),
  corn: require('@/assets/icons/ingredients/corn.png'),
  watermelon: require('@/assets/icons/ingredients/watermelon.png'),
  persimmon: require('@/assets/icons/ingredients/persimmon.png'),
  ginger: require('@/assets/icons/ingredients/ginger.png')
};

export type IngredientIconKey = keyof typeof INGREDIENT_ICONS;

export const DRINK_ICON_KEYS = Object.keys(DRINK_ICONS) as DrinkIconKey[];
export const INGREDIENT_ICON_KEYS = Object.keys(
  INGREDIENT_ICONS,
) as IngredientIconKey[];

