import { EntryDoc, Unit } from '@/src/types/drinky'
import { serverTimestamp, Timestamp } from 'firebase/firestore';
import { toDateKey } from '../dateKey';


type BuildEntryInput = {
    drinkName: string;
    drinkId?: string | undefined;
    iconKey?: string;

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

  // 양 계산(1컵 = 200mL 고정)
  const DEFAULT_ML_PER_CUP = 200;
  const mlPerUnit = input.unit === 'cup' ? DEFAULT_ML_PER_CUP : 1;
  const totalMl = amount * mlPerUnit;
  const isWaterOnly = drinkName === "물";

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

    totalCaffeineMg: 0,
    totalSugarG: 0,

    memo: input.memo?.trim() ? input.memo.trim() : null,
    brandLabel,
    brandNormalized,

    isWaterOnly,
    waterMl: isWaterOnly ? totalMl : 0,
  }
};

export default buildEntryPayload
