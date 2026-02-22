export const DRINK_ICONS = {
  ice_americano: require("@/assets/icons/drinks/coffee/ice_americano.png"),
  ice_cafe_latte: require("@/assets/icons/drinks/coffee/ice_cafelatte.png"),
  ice_einspanner: require('@/assets/icons/drinks/coffee/ice_einspanner.png'),
  vanilla_coldbrew: require('@/assets/icons/drinks/coffee/vanilla_coldbrew.png'),
  espresso: require('@/assets/icons/drinks/coffee/espresso.png'),
  ice_cafe_mocha: require('@/assets/icons/drinks/coffee/ice_cafe_mocha.png'),
  ice_vanilla_cafe_mocha: require('@/assets/icons/drinks/coffee/ice_vanilla_cafe_mocha.png'),
  ice_caramel_cafe_mocha: require('@/assets/icons/drinks/coffee/ice_caramel_cafe_mocha.png'),
  ice_mint_cafe_mocha: require('@/assets/icons/drinks/coffee/ice_mint_cafe_mocha.png'),
  cafe_mocha: require('@/assets/icons/drinks/coffee/cafe_mocha.png'),
  vanilla_cafe_mocha: require('@/assets/icons/drinks/coffee/vanilla_cafe_mocha.png'),
  caramel_cafe_mocha: require('@/assets/icons/drinks/coffee/caramel_cafe_mocha.png'),
  mint_cafe_mocha: require('@/assets/icons/drinks/coffee/mint_cafe_mocha.png'),
  caramel_machiato: require('@/assets/icons/drinks/coffee/caramel_machiato.png'),
  ice_caramel_machiato: require('@/assets/icons/drinks/coffee/ice_caramel_machiato.png'),
  cappuccino: require('@/assets/icons/drinks/coffee/cappuccino.png'),
  cafe_latte: require('@/assets/icons/drinks/coffee/cafe_latte.png'),

  matcha_frappe: require("@/assets/icons/drinks/frappe/matcha_frappe.png"),
  
  strawberry_yogurt_smoothie: require('@/assets/icons/drinks/smoothie/strawberry_yogurt_smoothie.png'),
  mango_yogurt_smoothie: require('@/assets/icons/drinks/smoothie/mango_yogurt_smoothie.png'),
  banana_yogurt_smoothie: require('@/assets/icons/drinks/smoothie/banana_yogurt_smoothie.png'),
  peach_yogurt_smoothie: require('@/assets/icons/drinks/smoothie/peach_yogurt_smoothie.png'),
  blueberry_yogurt_smoothie: require('@/assets/icons/drinks/smoothie/blueberry_yogurt_smoothie.png'),

  orange_juice: require("@/assets/icons/drinks/juice/orange_juice.png"),
  apple_juice: require('@/assets/icons/drinks/juice/apple_juice.png'),
  grapefruit_juice: require('@/assets/icons/drinks/juice/grapefruit_juice.png'),
  tomato_juice: require('@/assets/icons/drinks/juice/tomato_juice.png'),
  grape_juice: require('@/assets/icons/drinks/juice/grape_juice.png'),

  strawberry_ade: require('@/assets/icons/drinks/ade/strawberry_ade.png'),
  lemon_ade: require('@/assets/icons/drinks/ade/lemon_ade.png'),
  peach_ade: require('@/assets/icons/drinks/ade/peach_ade.png'),
  blueberry_ade: require('@/assets/icons/drinks/ade/blueberry_ade.png'),
  grapefruit_ade: require('@/assets/icons/drinks/ade/grapefruit_ade.png'),
  cherry_ade: require('@/assets/icons/drinks/ade/cherry_ade.png'),

  cider: require('@/assets/icons/drinks/carbonated/cider.png'),
  coke: require('@/assets/icons/drinks/carbonated/coke.png'),

  energy_drink: require('@/assets/icons/drinks/can/energy_drink.png'),

  matcha_latte: require("@/assets/icons/drinks/non-coffee/matchalatte.png"),
  ice_matcha_latte: require("@/assets/icons/drinks/non-coffee/ice_matchalatte.png"),
  ice_milk_tea: require("@/assets/icons/drinks/non-coffee/ice_milktea.png"),
  ice_brownsugar_milk_tea: require('@/assets/icons/drinks/non-coffee/ice_brownsugar_milk_tea.png'),
  ice_brownsugar_bubble_milk_tea: require('@/assets/icons/drinks/non-coffee/ice_brownsugar_bubble_milk_tea.png'),

  yuzu_tea: require("@/assets/icons/drinks/tea/yuzutea.png"),
  green_tea: require('@/assets/icons/drinks/tea/green_tea.png'),
  lemon_ice_tea: require('@/assets/icons/drinks/tea/lemon_ice_tea.png'),
  rooibos_tea: require('@/assets/icons/drinks/tea/rooibos_tea.png'),
  milk_tea: require('@/assets/icons/drinks/tea/milk_tea.png'),
  puer_tea: require('@/assets/icons/drinks/tea/puer_tea.png'),
  peach_ice_tea: require('@/assets/icons/drinks/tea/peach_ice_tea.png'),
  ice_green_tea: require('@/assets/icons/drinks/tea/ice_green_tea.png'),
  ice_rooibos_tea: require('@/assets/icons/drinks/tea/ice_rooibos_tea.png'),
  ice_puer_tea: require('@/assets/icons/drinks/tea/ice_puer_tea.png'),
  ice_earlgrey_tea: require('@/assets/icons/drinks/tea/ice_earlgrey_tea.png'),
  ice_camomile_tea: require('@/assets/icons/drinks/tea/ice_camomile_tea.png'),
  ice_herb_tea: require('@/assets/icons/drinks/tea/ice_herb_tea.png'),
  ice_black_tea: require('@/assets/icons/drinks/tea/ice_black_tea.png'),
  earlgrey_tea: require('@/assets/icons/drinks/tea/earlgrey_tea.png'),
  camomile_tea: require('@/assets/icons/drinks/tea/camomile_tea.png'),
  herb_tea: require('@/assets/icons/drinks/tea/herb_tea.png'),
  black_tea: require('@/assets/icons/drinks/tea/black_tea.png'),

  soybean: require('@/assets/icons/drinks/milk/soybean.png'),
  milk: require('@/assets/icons/drinks/milk/milk.png'),
  strawberry_milk: require('@/assets/icons/drinks/milk/strawberry_milk.png'),
  banana_milk: require('@/assets/icons/drinks/milk/banana_milk.png'),
  choco_milk: require('@/assets/icons/drinks/milk/choco_milk.png'),

  water: require('@/assets/icons/drinks/water/water.png'),

} as const;

export type DrinkIconKey = keyof typeof DRINK_ICONS;

export const INGREDIENT_ICONS = {
    water: require('@/assets/icons/ingredients/water.png'),
    coffee: require('@/assets/icons/ingredients/coffee.png'),
    strawberry: require('@/assets/icons/ingredients/strawberry.png'),
    leaf: require('@/assets/icons/ingredients/matcha.png'),
    default: require('@/assets/icons/ingredients/default.png')
}

export type IngredientIconKey = keyof typeof INGREDIENT_ICONS;
