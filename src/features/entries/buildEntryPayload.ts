import { serverTimestamp, Timestamp } from "firebase/firestore";

import { toDateKey } from "@/src/lib/dateKey";
import type { EntryDoc, SizeLabel, Unit } from "@/src/types/drinky";
import type { EntryTopping } from "@/src/types/topping";
import { calculateToppingNutrition } from "../toppings/caculateToppingNutrition";

const DEFAULT_ML_PER_CUP = 200;

export type BuildEntryInput = {
  drinkName: string;
  drinkId?: string | null;
  iconKey?: string | null;
  calendarIconUrl?: string | null;
  sizeLabel?: SizeLabel | null;
  mlPerServing?: number | null;
  caffeineMgPerServing?: number | null;
  sugarGPerServing?: number | null;
  calorieKcalPerServing?: number | null;
  isWaterOnly?: boolean;
  date: Date;
  consumedAt: Date;
  unit: Unit;
  amount: number;
  memo?: string | null;
  brandLabel?: string | null;
  toppings?: EntryTopping[];
};

export type EntryWritePayload = Omit<EntryDoc, "createdAt" | "updatedAt"> & {
  createdAt: ReturnType<typeof serverTimestamp>;
  updatedAt: ReturnType<typeof serverTimestamp>;
};

function toPositiveNumber(value: unknown, fallback: number) {
  const next = Number(value);
  return Number.isFinite(next) && next > 0 ? next : fallback;
}

function toNonNegativeNumber(value: unknown) {
  const next = Number(value);
  return Number.isFinite(next) && next > 0 ? next : 0;
}

function normalizeEntryTopping(item: EntryTopping): EntryTopping {
  if (!item.toppingId?.trim() || !item.name?.trim()) {
    throw new Error("토핑의 ID 또는 이름이 없어요. 토핑을 다시 선택해 주세요.");
  }
  if (!item.servingLabel?.trim()) {
    throw new Error(`${item.name}: 관리자 화면에서 토핑의 1회 기준을 확인해 주세요.`);
  }
  if (item.nutritionType !== "official" && item.nutritionType !== "estimated") {
    throw new Error(`${item.name}: 관리자 화면에서 영양정보 유형을 설정해 주세요.`);
  }

  return {
    toppingId: item.toppingId,
    name: item.name,
    brand: item.brand ?? null,
    servingLabel: item.servingLabel,
    quantity: item.quantity,
    calories: item.calories ?? null,
    caffeine: item.caffeine ?? null,
    sugar: item.sugar ?? null,
    nutritionType: item.nutritionType,
    iconKey: item.iconKey ?? null,
    iconUrl: item.iconUrl ?? null,
  };
}

export default function buildEntryPayload(
  input: BuildEntryInput,
): EntryWritePayload {
  const drinkName = input.drinkName.trim();
  if (!drinkName) {
    throw new Error("DRINK_NAME_REQUIRED");
  }

  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("AMOUNT_INVALID");
  }

  const unit = input.unit;
  const safeMlPerServing = toPositiveNumber(
    input.mlPerServing,
    DEFAULT_ML_PER_CUP,
  );
  const mlPerUnit = unit === "cup" ? safeMlPerServing : 1;
  const totalMl = Math.round(amount * mlPerUnit);
  const servingRatio = unit === "cup" ? amount : totalMl / safeMlPerServing;

  const toppings = (input.toppings ?? []).map(normalizeEntryTopping);
  const toppingNutrition = calculateToppingNutrition(toppings);

  const caffeinePerServing = toNonNegativeNumber(input.caffeineMgPerServing);
  const sugarPerServing = toNonNegativeNumber(input.sugarGPerServing);
  const caloriePerServing = toNonNegativeNumber(input.calorieKcalPerServing);

  const totalCaffeineMg = Math.round(
    caffeinePerServing * servingRatio + toppingNutrition.caffeine,
  );
  const totalSugarG = Math.round(
    sugarPerServing * servingRatio + toppingNutrition.sugar,
  );
  const totalCalorieKcal = Math.round(
    caloriePerServing * servingRatio + toppingNutrition.calories,
  );

  const rawMemo = input.memo?.trim() ?? "";
  const rawBrandLabel = input.brandLabel?.trim() ?? "";
  const isWaterOnly = input.isWaterOnly ?? drinkName === "물";

  return {
    dateKey: toDateKey(input.date),
    consumedAt: Timestamp.fromDate(input.consumedAt),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...(input.drinkId ? { drinkId: input.drinkId } : {}),
    drinkName,
    ...(input.sizeLabel ? { sizeLabel: input.sizeLabel } : {}),
    ...(input.iconKey ? { iconKey: input.iconKey } : { iconKey: "default" }),
    calendarIconUrl: input.calendarIconUrl?.trim() || null,
    brandLabel: rawBrandLabel || null,
    brandNormalized: rawBrandLabel ? rawBrandLabel.toLowerCase() : null,
    isWaterOnly,
    servings: amount,
    unit,
    mlPerUnit,
    totalMl,
    totalCaffeineMg: Math.max(0, totalCaffeineMg),
    totalSugarG: Math.max(0, totalSugarG),
    calorieKcalPerServing: caloriePerServing,
    totalCalorieKcal: Math.max(0, totalCalorieKcal),
    waterMl: isWaterOnly ? totalMl : 0,
    memo: rawMemo || null,
    toppings,
  };
}
