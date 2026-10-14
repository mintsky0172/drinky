import type { EntryTopping } from "@/src/types/topping";

export function calculateToppingNutrition(toppings: EntryTopping[]) {
  let calories = 0;
  let caffeine = 0;
  let sugar = 0;
  let hasUnknownNutrition = false;

  for (const item of toppings) {
    if (!Number.isInteger(item.quantity) || item.quantity < 1) {
      throw new Error("토핑 수량은 1 이상의 정수여야 해요.");
    }

    const subtotal = (value: number | null) => {
      if (value == null) {
        hasUnknownNutrition = true;
        return 0;
      }
      if (!Number.isFinite(value) || value < 0) {
        throw new Error("토핑 영양정보가 올바르지 않아요.");
      }
      return value * item.quantity;
    };

    calories += subtotal(item.calories);
    caffeine += subtotal(item.caffeine);
    sugar += subtotal(item.sugar);
  }

  return { calories, caffeine, sugar, hasUnknownNutrition };
}
