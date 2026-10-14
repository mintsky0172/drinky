import { Timestamp } from "firebase/firestore";
import { ToppingIconKey } from "../constants/icons";

export type ToppingType = "generic" | "branded";

export type NutritionType = "estimated" | "official";

export type ToppingCategory =
  | "pearl"
  | "jelly"
  | "syrup"
  | "shot"
  | "foam"
  | "whippedCream"
  | "other";

export type Topping = {
  id: string;

  name: string;
  type: ToppingType;
  nutritionType: NutritionType;
  category: ToppingCategory;

  iconKey: ToppingIconKey | null;

  // branded일 때만 사용
  brand: string | null;

  // 영양정보의 기준 단위
  servingLabel: string;

  calories: number | null;
  caffeine: number | null;
  sugar: number | null;

  iconUrl: string | null;

  isVisible: boolean;

  sourceUrl: string | null;
  note: string | null;

  createdAt: Timestamp;
  updatedAt: Timestamp;
};

// 음료 기록에 사용하는 선택 당시의 토핑 정보
export type EntryTopping = {
  toppingId: string; // 원본 토핑 식별
  name: string; // 선택 당시 이름
  brand: string | null;

  servingLabel: string; // 영양정보의 기준 단위
  quantity: number; // 해당 음료 기록 전체에 추가한 횟수

  // 토핑 1회 기준 영양정보
  calories: number | null; // 1회당 열량
  caffeine: number | null; // 1회당 카페인
  sugar: number | null; // 1회당 당류
  nutritionType: NutritionType;

  iconKey: ToppingIconKey | null;
  iconUrl: string | null; 
}