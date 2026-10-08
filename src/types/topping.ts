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
