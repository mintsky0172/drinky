import type { EntryTopping } from "@/src/types/topping";

export function hasUnknownToppingNutritiion(
  entries: { toppings?: EntryTopping[] }[],
): boolean {
  return entries.some((entry) =>
    (entry.toppings ?? []).some((item) =>
      [item.calories, item.caffeine, item.sugar].some((value) => value == null),
    ),
  );
}
