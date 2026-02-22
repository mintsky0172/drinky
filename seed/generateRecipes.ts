import * as fs from "fs";
import * as path from "path";
import { fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type Category =
  | "water"
  | "coffee"
  | "latte"
  | "tea"
  | "ade"
  | "smoothie"
  | "carbonated"
  | "milk"
  | "juice"
  | "energy"
  | "other";

type IngredientIconKey =
  | "water"
  | "coffee"
  | "milk"
  | "tea_leaf"
  | "ice"
  | "fizzy"
  | "matcha"
  | "choco"
  | "vanilla"
  | "caramel"
  | "honey"
  | "mint"
  | "strawberry"
  | "lemon"
  | "peach"
  | "grapefruit"
  | "apple"
  | "banana"
  | "blueberry"
  | "cherry"
  | "yogurt"
  | "cream"
  | "cheese_foam"
  | 'mango'
  | "default";

type DrinkIconKey = string;

type RecipeSeed = {
  id: string;
  name: string;
  brand: string | null;
  category: Category;
  drinkIconKey: DrinkIconKey;
  calendarIconKey: IngredientIconKey;

  mlPerServing: number;
  caffeineMgPerServing: number;
  sugarGPerServing: number;
  isWaterOnly: boolean;

  // 검색 풍성함 핵심
  normalizedName: string;
  aliases: string[];
  searchKeywords: string[];

  // 선택 사항(나중에 확장)
  tags: string[];
  isPublic: true;
};

function normalizeKorean(s: string) {
  return s.toLowerCase().replace(/\s+/g, "");
}

function uniq(arr: string[]) {
  return Array.from(new Set(arr.filter(Boolean)));
}

function slugifyId(s: string) {
  // 한글도 id로 쓸 수 있지만, 안정적으로 영문/숫자/언더스코어만
  const cleaned = s
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s_-]/g, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 60);
  return cleaned || `recipe_${Date.now()}`;
}

function makeId(category: Category, name: string) {
  return `${category}_${slugifyId(normalizeKorean(name))}`;
}

/**
 * 대충 합리적인 영양치 프리셋(초기용)
 * 나중에 네 기준치로 조절 가능
 */
const NUTRI = {
  // coffee 기반(ml 355)
  espressoShotCaf: 75,
  americanoCaf: 150,
  coldBrewCaf: 180,
  latteCaf: 150,
  teaCaf: 30,
  blackTeaCaf: 40,
  matchaCaf: 70,

  // 당 프리셋
  syrupSugar: 12, // 시럽 1펌프 느낌
  sweetLatteBase: 10,
  adeSugar: 30,
  smoothieSugar: 24,
  juiceSugar: 22,
  milkSugar: 12,
  chocoSugar: 28,
  energySugar: 27,
};

type Flavor = {
  key:
    | "vanilla"
    | "caramel"
    | "hazelnut"
    | "choco"
    | "strawberry"
    | "matcha"
    | "lemon"
    | "peach"
    | "grapefruit"
    | "blueberry"
    | "mint"
    | "honey"
    | "plain";
  label: string;
  calendarIconKey: IngredientIconKey;
  extraSugarG: number;
};

const FLAVORS: Flavor[] = [
  { key: "plain", label: "기본", calendarIconKey: "default", extraSugarG: 0 },
  { key: "vanilla", label: "바닐라", calendarIconKey: "vanilla", extraSugarG: NUTRI.syrupSugar },
  { key: "caramel", label: "카라멜", calendarIconKey: "caramel", extraSugarG: NUTRI.syrupSugar },
  { key: "hazelnut", label: "헤이즐넛", calendarIconKey: "coffee", extraSugarG: NUTRI.syrupSugar },
  { key: "choco", label: "초코", calendarIconKey: "choco", extraSugarG: NUTRI.chocoSugar },
  { key: "strawberry", label: "딸기", calendarIconKey: "strawberry", extraSugarG: 18 },
  { key: "matcha", label: "말차", calendarIconKey: "matcha", extraSugarG: 10 },
  { key: "lemon", label: "레몬", calendarIconKey: "lemon", extraSugarG: 14 },
  { key: "peach", label: "복숭아", calendarIconKey: "peach", extraSugarG: 14 },
  { key: "grapefruit", label: "자몽", calendarIconKey: "grapefruit", extraSugarG: 14 },
  { key: "blueberry", label: "블루베리", calendarIconKey: "blueberry", extraSugarG: 14 },
  { key: "mint", label: "민트", calendarIconKey: "mint", extraSugarG: 10 },
  { key: "honey", label: "허니", calendarIconKey: "honey", extraSugarG: 12 },
];

type Temp = "hot" | "iced";

function tempLabel(t: Temp) {
  return t === "iced" ? "아이스 " : "";
}

function tempAliases(t: Temp) {
  return t === "iced" ? ["아이스", "차가운", "cold", "iced"] : ["따뜻한", "hot"];
}

function baseKeywords(base: string) {
  const map: Record<string, string[]> = {
    americano: ["아메리카노", "아아", "americano", "블랙커피"],
    latte: ["라떼", "latte",],
    mocha: ["모카", "mocha", ],
    caramel_macchiato: ["카라멜마끼아또", "마끼아또", "macchiato"],
    cold_brew: ["콜드브루", "더치", "coldbrew", "더치커피"],
    espresso: ["에스프레소", "espresso", "샷"],
    tea: ["티", "차", "tea"],
    milk_tea: ["밀크티", "milk tea", "버블티"],
    ade: ["에이드", "ade", "탄산", "소다"],
    smoothie: ["스무디", "smoothie", "블렌디드"],
    juice: ["주스", "juice"],
    milk: ["우유", "milk"],
    yogurt: ["요거트", "yogurt"],
    carbonated: ["탄산", "soda", ],
    energy: ["에너지드링크", "energy", "레드불", "몬스터"],
  };
  return map[base] ?? [base];
}

function buildRecipe(params: {
  name: string;
  category: Category;
  drinkIconKey: DrinkIconKey;
  calendarIconKey: IngredientIconKey;
  ml: number;
  caffeine: number;
  sugar: number;
  isWaterOnly?: boolean;
  aliases?: string[];
  keywords?: string[];
  tags?: string[];
  brand?: string | null;
}): RecipeSeed {
  const name = params.name.trim();
  const id = makeId(params.category, name);

  const aliases = uniq([name, ...(params.aliases ?? [])]);
  const keywords = uniq([
    name,
    normalizeKorean(name),
    ...(params.keywords ?? []),
    ...(params.aliases ?? []),
  ]);

  return {
    id,
    name,
    brand: params.brand ?? null,
    category: params.category,
    drinkIconKey: params.drinkIconKey,
    calendarIconKey: params.calendarIconKey,

    mlPerServing: params.ml,
    caffeineMgPerServing: Math.max(0, Math.round(params.caffeine)),
    sugarGPerServing: Math.max(0, Math.round(params.sugar)),
    isWaterOnly: !!params.isWaterOnly,

    normalizedName: normalizeKorean(name),
    aliases,
    searchKeywords: keywords,

    tags: uniq(params.tags ?? []),
    isPublic: true,
  };
}

/**
 * 150개 만들기: 카테고리별 "현실적인 메뉴 풀"을 자동 생성
 */
function generate150(): RecipeSeed[] {
  const out: RecipeSeed[] = [];

  // 0) 물(다양한 용량)
  const waterMl = [150, 200, 250, 330, 500, 750];
  waterMl.forEach((ml) => {
    out.push(
      buildRecipe({
        name: `물 ${ml}mL`,
        category: "water",
        drinkIconKey: "water_cup",
        calendarIconKey: "water",
        ml,
        caffeine: 0,
        sugar: 0,
        isWaterOnly: true,
        aliases: ["물", "워터", "water"],
        keywords: ["수분", "hydration"],
        tags: ["기본", "수분"],
      }),
    );
  });

  // 1) 커피/라떼: 베이스 x 온도 x 일부 맛
  const temps: Temp[] = ["hot", "iced"];

  // 커피 베이스들
  const coffeeBases = [
    { base: "americano", label: "아메리카노", cat: "coffee" as const, caf: NUTRI.americanoCaf, sugarBase: 0, icon: "americano" },
    { base: "cold_brew", label: "콜드브루", cat: "coffee" as const, caf: NUTRI.coldBrewCaf, sugarBase: 0, icon: "coldbrew" },
    { base: "espresso", label: "에스프레소", cat: "coffee" as const, caf: NUTRI.espressoShotCaf, sugarBase: 0, icon: "espresso" },
    { base: "cappuccino", label: "카푸치노", cat: "latte" as const, caf: NUTRI.latteCaf, sugarBase: 6, icon: "cappuccino" },
    { base: "flat_white", label: "플랫화이트", cat: "latte" as const, caf: NUTRI.latteCaf, sugarBase: 6, icon: "flatwhite" },
    { base: "cafe_latte", label: "카페라떼", cat: "latte" as const, caf: NUTRI.latteCaf, sugarBase: 8, icon: "latte" },
    { base: "mocha", label: "카페모카", cat: "latte" as const, caf: NUTRI.latteCaf, sugarBase: 18, icon: "mocha" },
    { base: "caramel_macchiato", label: "카라멜 마끼아또", cat: "latte" as const, caf: NUTRI.latteCaf, sugarBase: 20, icon: "caramel_macchiato" },
  ];

  // 커피에 붙이기 좋은 맛들(너무 과하면 현실감 떨어져서 제한)
  const coffeeFlavorKeys: Flavor["key"][] = ["plain", "vanilla", "caramel", "hazelnut", "mint"];

  coffeeBases.forEach((b) => {
    temps.forEach((t) => {
      // 기본 버전 1개
      const baseName = `${tempLabel(t)}${b.label}`;
      out.push(
        buildRecipe({
          name: baseName,
          category: b.cat,
          drinkIconKey: b.icon,
          calendarIconKey: "coffee",
          ml: b.base === "espresso" ? 30 : 355,
          caffeine: b.base === "espresso" ? b.caf : b.caf,
          sugar: b.sugarBase,
          aliases: [...tempAliases(t), b.label],
          keywords: [...baseKeywords(b.base), b.label],
          tags: ["카페", t],
        }),
      );

      // 맛 버전 몇 개 추가(plain 제외)
      coffeeFlavorKeys
        .filter((k) => k !== "plain")
        .forEach((fk) => {
          const f = FLAVORS.find((x) => x.key === fk)!;

          // 아메리카노+바닐라 같은 건 "바닐라 아메리카노"로 만들면 현실적
          const flavoredName =
            b.base === "americano" || b.base === "cold_brew"
              ? `${tempLabel(t)}${f.label} ${b.label}`
              : `${tempLabel(t)}${f.label} ${b.label}`;

          const calKey =
            f.calendarIconKey === "default" ? "coffee" : (f.calendarIconKey as IngredientIconKey);

          out.push(
            buildRecipe({
              name: flavoredName,
              category: b.cat,
              drinkIconKey: `${b.icon}_${f.key}`,
              calendarIconKey: calKey,
              ml: b.base === "espresso" ? 30 : 355,
              caffeine: b.caf,
              sugar: b.sugarBase + f.extraSugarG,
              aliases: [f.label, b.label, ...tempAliases(t)],
              keywords: [...baseKeywords(b.base), f.label, f.key],
              tags: ["카페", "맛", t],
            }),
          );
        });
    });
  });

  // 2) 티/밀크티
  const teas = [
    { name: "녹차", caf: NUTRI.teaCaf, cal: "tea_leaf" as IngredientIconKey, icon: "green_tea" },
    { name: "홍차", caf: NUTRI.blackTeaCaf, cal: "tea_leaf" as IngredientIconKey, icon: "black_tea" },
    { name: "얼그레이", caf: NUTRI.blackTeaCaf, cal: "tea_leaf" as IngredientIconKey, icon: "earl_grey" },
    { name: "루이보스", caf: 0, cal: "tea_leaf" as IngredientIconKey, icon: "rooibos" },
    { name: "캐모마일", caf: 0, cal: "tea_leaf" as IngredientIconKey, icon: "chamomile" },
    { name: "허브티", caf: 0, cal: "tea_leaf" as IngredientIconKey, icon: "herbal_tea" },
    { name: "보이차", caf: 20, cal: "tea_leaf" as IngredientIconKey, icon: "pu_erh" },
  ];

  teas.forEach((tea) => {
    (["hot", "iced"] as Temp[]).forEach((t) => {
      out.push(
        buildRecipe({
          name: `${tempLabel(t)}${tea.name}`,
          category: "tea",
          drinkIconKey: tea.icon,
          calendarIconKey: tea.cal,
          ml: 240,
          caffeine: tea.caf,
          sugar: 0,
          aliases: [...tempAliases(t), "티", "차"],
          keywords: ["tea", "차", tea.name],
          tags: ["티", t],
        }),
      );
    });
  });

  // 밀크티/말차라떼 계열
  const milkTeas = [
    { name: "밀크티", caf: 40, sugar: 22, cal: "tea_leaf" as IngredientIconKey, icon: "milk_tea" },
    { name: "말차 라떼", caf: NUTRI.matchaCaf, sugar: 18, cal: "matcha" as IngredientIconKey, icon: "matcha_latte" },
    { name: "흑당 밀크티", caf: 40, sugar: 28, cal: "caramel" as IngredientIconKey, icon: "brown_sugar_milk_tea" },
  ];
  milkTeas.forEach((m) => {
    (["hot", "iced"] as Temp[]).forEach((t) => {
      out.push(
        buildRecipe({
          name: `${tempLabel(t)}${m.name}`,
          category: "tea",
          drinkIconKey: m.icon,
          calendarIconKey: m.cal,
          ml: 355,
          caffeine: m.caf,
          sugar: m.sugar,
          aliases: [...tempAliases(t), m.name],
          keywords: ["밀크티", "라떼", "티", m.name],
          tags: ["달달", t],
        }),
      );
    });
  });

  // 3) 에이드/아이스티(과일)
  const fruits = [
    { k: "lemon", label: "레몬", cal: "lemon" as IngredientIconKey },
    { k: "grapefruit", label: "자몽", cal: "grapefruit" as IngredientIconKey },
    { k: "peach", label: "복숭아", cal: "peach" as IngredientIconKey },
    { k: "strawberry", label: "딸기", cal: "strawberry" as IngredientIconKey },
    { k: "blueberry", label: "블루베리", cal: "blueberry" as IngredientIconKey },
    { k: "apple", label: "사과", cal: "apple" as IngredientIconKey },
    { k: "banana", label: "바나나", cal: "banana" as IngredientIconKey },
    { k: "cherry", label: "체리", cal: "cherry" as IngredientIconKey },
  ];

  fruits.forEach((f) => {
    // 에이드
    out.push(
      buildRecipe({
        name: `${f.label}에이드`,
        category: "ade",
        drinkIconKey: `${f.k}_ade`,
        calendarIconKey: f.cal,
        ml: 355,
        caffeine: 0,
        sugar: NUTRI.adeSugar,
        aliases: ["에이드", "ade", f.label],
        keywords: ["에이드", "탄산", "소다", f.label, f.k],
        tags: ["상큼", "탄산"],
      }),
    );

    // 아이스티
    if (["peach", "lemon"].includes(f.k)) {
      out.push(
        buildRecipe({
          name: `${f.label} 아이스티`,
          category: "tea",
          drinkIconKey: `${f.k}_iced_tea`,
          calendarIconKey: f.cal,
          ml: 355,
          caffeine: 15,
          sugar: 18,
          aliases: ["아이스티", "티", f.label],
          keywords: ["아이스티", "iced tea", f.label, f.k],
          tags: ["시원", "티"],
        }),
      );
    }
  });

  // 4) 스무디/요거트
  const smoothieFruits = ["strawberry", "blueberry", "banana", "mango", "peach"];
  smoothieFruits.forEach((k) => {
    const labelMap: Record<string, string> = {
      strawberry: "딸기",
      blueberry: "블루베리",
      banana: "바나나",
      mango: "망고",
      peach: "복숭아",
    };
    const calMap: Record<string, IngredientIconKey> = {
      strawberry: "strawberry",
      blueberry: "blueberry",
      banana: "banana",
      mango: "mango",
      peach: "peach",
    };
    out.push(
      buildRecipe({
        name: `${labelMap[k]} 요거트 스무디`,
        category: "smoothie",
        drinkIconKey: `${k}_yogurt_smoothie`,
        calendarIconKey: calMap[k],
        ml: 355,
        caffeine: 0,
        sugar: NUTRI.smoothieSugar,
        aliases: ["요거트", "스무디", labelMap[k]],
        keywords: ["스무디", "요거트", k, labelMap[k]],
        tags: ["블렌디드", "요거트"],
      }),
    );
  });

  // 5) 탄산/제로
  const sodas = [
    { name: "콜라", key: "cola", sugar: 27 },
    { name: "제로콜라", key: "cola_zero", sugar: 0 },
    { name: "사이다", key: "cider", sugar: 25 },
    { name: "제로사이다", key: "cider_zero", sugar: 0 },
    { name: "탄산수", key: "sparkling_water", sugar: 0 },
    { name: "토닉워터", key: "tonic", sugar: 10 },
  ];
  sodas.forEach((s) => {
    out.push(
      buildRecipe({
        name: s.name,
        category: "carbonated",
        drinkIconKey: s.key,
        calendarIconKey: s.name.includes("탄산") || s.name.includes("토닉") ? "fizzy" : "fizzy",
        ml: 355,
        caffeine: s.name.includes("콜라") ? 35 : 0,
        sugar: s.sugar,
        aliases: ["탄산", "soda", s.name],
        keywords: ["탄산", "soda", "fizzy", s.name],
        tags: ["탄산"],
      }),
    );
  });

  // 6) 우유/두유/초코우유/딸기우유
  const milks = [
    { name: "우유", key: "milk_plain", sugar: 12, cal: "milk" as IngredientIconKey },
    { name: "저지방 우유", key: "milk_lowfat", sugar: 10, cal: "milk" as IngredientIconKey },
    { name: "두유", key: "soy_milk", sugar: 8, cal: "milk" as IngredientIconKey },
    { name: "초코우유", key: "choco_milk", sugar: 18, cal: "choco" as IngredientIconKey },
    { name: "딸기우유", key: "strawberry_milk", sugar: 20, cal: "strawberry" as IngredientIconKey },
    { name: "바나나우유", key: "banana_milk", sugar: 22, cal: "banana" as IngredientIconKey },
  ];
  milks.forEach((m) => {
    out.push(
      buildRecipe({
        name: m.name,
        category: "milk",
        drinkIconKey: m.key,
        calendarIconKey: m.cal,
        ml: 240,
        caffeine: 0,
        sugar: m.sugar,
        aliases: ["우유", "milk", m.name],
        keywords: ["우유", "milk", m.name],
        tags: ["유제품"],
      }),
    );
  });

  // 7) 주스
  const juices = [
    { name: "오렌지주스", key: "orange_juice", cal: "default" as IngredientIconKey },
    { name: "사과주스", key: "apple_juice", cal: "apple" as IngredientIconKey },
    { name: "포도주스", key: "grape_juice", cal: "default" as IngredientIconKey },
    { name: "토마토주스", key: "tomato_juice", cal: "default" as IngredientIconKey },
    { name: "자몽주스", key: "grapefruit_juice", cal: "grapefruit" as IngredientIconKey },
  ];
  juices.forEach((j) => {
    out.push(
      buildRecipe({
        name: j.name,
        category: "juice",
        drinkIconKey: j.key,
        calendarIconKey: j.cal,
        ml: 240,
        caffeine: 0,
        sugar: NUTRI.juiceSugar,
        aliases: ["주스", "juice", j.name],
        keywords: ["주스", "juice", j.name],
        tags: ["과일"],
      }),
    );
  });

  // 8) 에너지드링크
  const energies = [
    { name: "에너지드링크", key: "energy", caf: 80, sugar: NUTRI.energySugar },
    { name: "제로 에너지드링크", key: "energy_zero", caf: 80, sugar: 0 },
  ];
  energies.forEach((e) => {
    out.push(
      buildRecipe({
        name: e.name,
        category: "energy",
        drinkIconKey: e.key,
        calendarIconKey: "default",
        ml: 250,
        caffeine: e.caf,
        sugar: e.sugar,
        aliases: ["에너지", "energy", e.name],
        keywords: ["에너지", "에너지드링크", "energy", "카페인"],
        tags: ["각성"],
      }),
    );
  });

  // 9) 기타(치즈폼/크림 토핑 느낌)
  const specials = [
    { name: "치즈폼 라떼", base: "cafe_latte", cal: "cheese_foam" as IngredientIconKey },
    { name: "휘핑크림 초코", base: "choco", cal: "cream" as IngredientIconKey },
  ];
  specials.forEach((s) => {
    out.push(
      buildRecipe({
        name: s.name,
        category: "other",
        drinkIconKey: slugifyId(s.name),
        calendarIconKey: s.cal,
        ml: 355,
        caffeine: s.base === "cafe_latte" ? NUTRI.latteCaf : 0,
        sugar: s.base === "cafe_latte" ? 22 : 30,
        aliases: ["토핑", s.name],
        keywords: ["치즈폼", "크림", "휘핑", s.name],
        tags: ["토핑"],
      }),
    );
  });

  // ---- 목표 개수 맞추기 ----
  // 현재 out은 150보다 많거나 적을 수 있음. 여기서 "현실적"인 쪽으로 맞춤.

  // 1) 중복 id 제거(혹시 같은 이름이 들어가면)
  const byId = new Map<string, RecipeSeed>();
  out.forEach((r) => byId.set(r.id, r));
  const uniqList = Array.from(byId.values());

  // 2) 정렬(카테고리 -> 이름)로 안정적인 결과
  uniqList.sort((a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return a.name.localeCompare(b.name);
  });

  // 3) 정확히 150개로 맞추기(많으면 자르고, 적으면 기본 recipes 추가)
  const TARGET = 150;

  if (uniqList.length > TARGET) return uniqList.slice(0, TARGET);

  if (uniqList.length < TARGET) {
    const missing = TARGET - uniqList.length;

    // 부족하면 "기본 커스텀" 카테고리(Other)로 채움(사용자 입력용 만능 레시피)
    for (let i = 1; i <= missing; i++) {
      uniqList.push(
        buildRecipe({
          name: `커스텀 음료 ${i}`,
          category: "other",
          drinkIconKey: "custom",
          calendarIconKey: "default",
          ml: 355,
          caffeine: 0,
          sugar: 0,
          aliases: ["커스텀", "내가만든", "custom"],
          keywords: ["커스텀", "내가 만든", "custom", "레시피"],
          tags: ["커스텀"],
        }),
      );
    }
  }

  return uniqList.slice(0, TARGET);
}

function main() {
  const recipes = generate150();
  const outPath = path.join(__dirname, "recipes.seed.json");
  fs.writeFileSync(outPath, JSON.stringify(recipes, null, 2), "utf-8");

  // 간단 리포트
  const counts = recipes.reduce<Record<string, number>>((acc, r) => {
    acc[r.category] = (acc[r.category] ?? 0) + 1;
    return acc;
  }, {});
  console.log("✅ recipes.seed.json generated:", recipes.length);
  console.table(counts);
}

main();