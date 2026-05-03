import { serverTimestamp, Timestamp } from "firebase/firestore";

import { toDateKey } from "@/src/lib/dateKey";
import type { EntryDoc, SizeLabel, Unit } from "@/src/types/drinky";

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
  isWaterOnly?: boolean;
  date: Date;
  consumedAt: Date;
  unit: Unit;
  amount: number;
  memo?: string | null;
  brandLabel?: string | null;
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
  const servingRatio =
    unit === "cup" ? amount : totalMl / safeMlPerServing;

  const caffeinePerServing = toNonNegativeNumber(input.caffeineMgPerServing);
  const sugarPerServing = toNonNegativeNumber(input.sugarGPerServing);
  const totalCaffeineMg = Math.round(caffeinePerServing * servingRatio);
  const totalSugarG = Math.round(sugarPerServing * servingRatio);

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
    waterMl: isWaterOnly ? totalMl : 0,
    memo: rawMemo || null,
  };
}
