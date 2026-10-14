import type { Topping, ToppingCategory } from "@/src/types/topping";

function normalizeSearch(value: string) {
  return value.normalize("NFKC").toLowerCase().replace(/\s+/g, "");
}

export function filterToppings(
  items: Topping[],
  category: ToppingCategory | "all",
  search: string,
): Topping[] {
  const query = normalizeSearch(search);
  return items.filter((item) => {
    if (category !== "all" && item.category !== category) return false;
    return !query || [item.name, item.brand ?? ""].some(
      (value) => normalizeSearch(value).includes(query),
    );
  });
}
