import { EntryDoc, Unit } from '@/src/types/drinky'
import { serverTimestamp, Timestamp } from 'firebase/firestore';
import { toDateKey } from '../dateKey';


type BuildEntryInput = {
    drinkName: string;
    drinkId?: string | undefined;
    iconKey?: string;
    mlPerServing?: number;
    caffeineMgPerServing?: number;
    sugarGPerServing?: number;
    isWaterOnly?: boolean;

    date: Date;
    consumedAt: Date;

    unit: Unit;
    amount: number;

    memo?: string;
    brandLabel?: string;
}
function buildEntryPayload(input: BuildEntryInput): Omit<EntryDoc, "createdAt" | "updatedAt"> & {
    createdAt: ReturnType<typeof serverTimestamp>;
    updatedAt: ReturnType<typeof serverTimestamp>;
} {
  const drinkName = input.drinkName.trim();
  if(!drinkName) throw new Error('DRINK_NAME_REQUIRED');
  

  const amount = Number.isFinite(input.amount) ? input.amount : 0;
  if(amount <= 0) throw new Error('AMOUNT_INVALID');

  const dateKey = toDateKey(input.date);

  // 양 계산(컵 단위는 레시피 serving 용량 우선, 없으면 200mL)
  const DEFAULT_ML_PER_CUP = 200;
  const recipeMlPerServing = Number(input.mlPerServing ?? DEFAULT_ML_PER_CUP);
  const safeRecipeMlPerServing = recipeMlPerServing > 0 ? recipeMlPerServing : DEFAULT_ML_PER_CUP;
  const mlPerUnit = input.unit === 'cup' ? safeRecipeMlPerServing : 1;
  const totalMl = amount * mlPerUnit;
  const isWaterOnly = input.isWaterOnly ?? (drinkName === "물");

  // 영양은 레시피 1회분 기준으로 선형 스케일
  const recipeServings = totalMl / safeRecipeMlPerServing;
  const totalCaffeineMg = Math.max(
    0,
    Math.round(Number(input.caffeineMgPerServing ?? 0) * recipeServings),
  );
  const totalSugarG = Math.max(
    0,
    Math.round(Number(input.sugarGPerServing ?? 0) * recipeServings),
  );

  const rawBrand = input.brandLabel?.trim() ?? '';
  const brandLabel = rawBrand.length ? rawBrand : null;
  const brandNormalized = brandLabel ? brandLabel.toLowerCase() : null;

  return {
    dateKey,
    consumedAt: Timestamp.fromDate(input.consumedAt),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),

    drinkName,
    ...(input.drinkId ? { drinkId: input.drinkId } : {}),
    iconKey: input.iconKey ?? "default",

    unit: input.unit,
    servings: amount,
    mlPerUnit,
    totalMl,

    totalCaffeineMg,
    totalSugarG,

    memo: input.memo?.trim() ? input.memo.trim() : null,
    brandLabel,
    brandNormalized,

    isWaterOnly,
    waterMl: isWaterOnly ? totalMl : 0,
  }
};

export default buildEntryPayload
