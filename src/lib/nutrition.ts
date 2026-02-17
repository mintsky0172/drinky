export function scaleByMl(params: {
    baseMl: number;
    baseValue: number; // caffeineMgPerBase or sugarGPerBase
    targetMl: number;
}): number {
    const { baseMl, baseValue, targetMl } = params;
    if(!baseMl || baseMl <= 0) return 0;
    const v = baseValue * (targetMl / baseMl);
    return Math.round(v);
}