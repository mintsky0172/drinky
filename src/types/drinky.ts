import type { Timestamp, FieldValue } from 'firebase/firestore';

export type SizeLabel = "S" | "M" | "L" | "custom";
export type Unit = "cup" | "ml";

// 레시피북에서 오는 데이터
export type DrinkRecipe = {
    id: string;
    name: string;
    brand?: string;
    iconKey: string;
    isWaterOnly: boolean; // 수분 합산 여부(순수 물만 true)
    baseMl: number; // 355, 473, 200 등
    caffeineMgPerBase: number; // baseMl 기준 카페인
    sugarGPerBase: number; // baseMl 기준 당
};

// Firestore entries 문서 스키마
export type EntryDoc = {
    dateKey: string; // YYYY-MM-DD;
    consumedAt: Timestamp; // 유저가 마신 시각
    createdAt: Timestamp | FieldValue; // serverTimestamp()
    updatedAt: Timestamp | FieldValue;

    drinkId?: string;
    drinkName: string;
    brand?: string;

    iconKey: string;
    isWaterOnly: boolean;

    sizeLabel?: SizeLabel;

    servings: number;
    unit: Unit;
    mlPerUnit: number;
    totalMl: number;

    totalCaffeineMg: number;
    totalSugarG: number;

    waterMl: number; // isWaterOnly ? totalMl : 0
};