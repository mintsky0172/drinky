import { DrinkRecipe, EntryDoc, SizeLabel, Unit } from '@/src/types/drinky'
import { serverTimestamp, Timestamp } from 'firebase/firestore';
import { scaleByMl } from '../nutrition';
import { toDateKey } from '../dateKey';

type BuildEntryInput = {
    recipe: DrinkRecipe;
    consumedAt: Date;
    servings: number;
    unit: Unit;
    mlPerUnit: number;
    sizeLabel?: SizeLabel;
}

function buildEntryPayload(input: BuildEntryInput): Omit<EntryDoc, "createdAt" | "updatedAt"> & {
    createdAt: ReturnType<typeof serverTimestamp>;
    updatedAt: ReturnType<typeof serverTimestamp>;
} {
  const { recipe, consumedAt, servings, unit, mlPerUnit, sizeLabel } = input;
  
  const safeServings = Math.max(1, Math.floor(servings || 1));
  const safeMlPerUnit = Math.max(0, Math.floor(mlPerUnit || 0));

  const totalMl = safeServings * safeMlPerUnit;

  const caffeinePer1 = scaleByMl({
    baseMl: recipe.baseMl,
    baseValue: recipe.caffeineMgPerBase,
    targetMl: safeMlPerUnit,
  });

  const sugarPer1 = scaleByMl({
    baseMl: recipe.baseMl,
    baseValue: recipe.sugarGPerBase,
    targetMl: safeMlPerUnit
  });

  const totalCaffeineMg = caffeinePer1 * safeServings;
  const totalSugarG = sugarPer1 * safeServings;

  const isWaterOnly = !!recipe.isWaterOnly;
  const waterMl = isWaterOnly ? totalMl : 0;

  return {
    dateKey: toDateKey(consumedAt),
    consumedAt: Timestamp.fromDate(consumedAt),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),

    drinkId: recipe.id,
    drinkName: recipe.name,
    brand: recipe.brand,

    iconKey: recipe.iconKey,
    isWaterOnly,

    sizeLabel: sizeLabel ?? "custom",

    servings: safeServings,
    unit,
    mlPerUnit: safeMlPerUnit,
    totalMl,

    totalCaffeineMg,
    totalSugarG,

    waterMl,
  }
};

export default buildEntryPayload