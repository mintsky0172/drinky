import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const DRINK_KEYS_FILE = path.join(ROOT, "src", "constants", "icons.generated.ts");
const INGREDIENT_KEYS_FILE = path.join(ROOT, "src", "constants", "icons.ts");
const OUTPUT_FILE = path.join(ROOT, "src", "constants", "iconLabels.generated.ts");

const DRINK_TOKEN_LABELS: Record<string, string> = {
  adlay: "율무",
  almond: "아몬드",
  americano: "아메리카노",
  affogato: "아포가토",
  air: "에어",
  aerocano: "에어로카노",
  apple: "사과",
  basic: "기본",
  banana: "바나나",
  basil: "바질",
  berry: "베리",
  black: "블랙",
  white: "화이트",
  blue: "블루",
  blueberry: "블루베리",
  brown: "브라운",
  bubbles: "버블",
  bubble: "버블",
  caramel: "카라멜",
  cafe: "카페",
  coffee: "커피",
  coldbrew: "콜드브루",
  cold: "콜드",
  brew: "브루",
  cream: "크림",
  creamy: "크리미",
  cookie: "쿠키",
  choco: "초코",
  chocolate: "초코",
  chip: "칩",
  choux: "슈",
  cinnamon: "시나몬",
  chestnut: "밤",
  citrus: "시트러스",
  citrusy: "시트러스",
  citron: "유자",
  coco: "코코",
  coconut: "코코넛",
  cola: "콜라",
  condensed: "연유",
  corn: "옥수수",
  cotton: "코튼",
  cider: "사이다",
  calamansi: "깔라만시",
  camomile: "캐모마일",
  cappuccino: "카푸치노",
  carrot: "당근",
  dark: "다크",
  deep: "딥",
  dolce: "돌체",
  double: "더블",
  fish: "피쉬",
  earlgrey: "얼그레이",
  espresso: "에스프레소",
  energy: "에너지",
  english: "잉글리시",
  frappe: "프라페",
  frappuccino: "프라푸치노",
  fizzy: "피지",
  fizzio: "피지오",
  float: "플로트",
  fruit: "프루트",
  fresh: "프레시",
  grape: "포도",
  grapefruit: "자몽",
  green: "그린",
  ginger: "생강",
  gold: "골드",
  honey: "허니",
  hibiscus: "히비스커스",
  hot: "핫",
  hotteok: "호떡",
  ice: "아이스",
  kiwi: "키위",
  latte: "라떼",
  lemon: "레몬",
  lemonade: "레모네이드",
  lychee: "리치",
  macadamia: "마카다미아",
  machiato: "마키아토",
  macchiato: "마키아토",
  matcha: "말차",
  malcha: "말차",
  mango: "망고",
  melon: "멜론",
  milk: "밀크",
  milkshake: "밀크쉐이크",
  mocha: "모카",
  muscat: "머스캣",
  mint: "민트",
  oat: "오트",
  omija: "오미자",
  peach: "복숭아",
  pearl: "펄",
  paiksccino: "빽스치노",
  pistachio: "피스타치오",
  plum: "자두",
  pomegranate: "석류",
  pineapple: "파인애플",
  pumpkin: "호박",
  raw: "생",
  rating: "라팅",
  shake: "쉐이크",
  soda: "소다",
  sparkling: "스파클링",
  smoothie: "스무디",
  strawberry: "딸기",
  sugar: "슈가",
  tea: "티",
  teabag: "티백",
  tiramisu: "티라미수",
  tomato: "토마토",
  vanilla: "바닐라",
  watermelon: "수박",
  yogurt: "요거트",
  yuzu: "유자",
  java: "자바",
  creme: "크림",
  milktea: "밀크티",
  bubbletea: "버블티",
  blackwhite: "블랙화이트",
  brownsugar: "브라운슈가",
  lemontea: "레몬티",
  greentea: "녹차",
  herb: "허브",
  jalapeno: "할라피뇨",
  jujube: "대추",
  jewelry: "쥬얼리",
  passion: "패션",
  passionfruit: "패션후르츠",
  persimmon: "감",
  peanut: "땅콩",
  pineapplejuice: "파인애플주스",
  grapefruitjuice: "자몽주스",
  applejuice: "사과주스",
  orangejuice: "오렌지주스",
  strawberryjuice: "딸기주스",
  bluelemonade: "블루레몬에이드",
  cool: "쿨",
  frozen: "프로즌",
  floral: "플로럴",
  flower: "플라워",
  blossom: "블로썸",
  garden: "가든",
  jeju: "제주",
  jasmin: "자스민",
  mello: "멜로",
  mini: "미니",
  oranmang: "오렌지 망고",
  panda: "판다",
  panna: "판나",
  pongcrush: "퐁크러쉬",
  shine: "샤인",
  signature: "시그니처",
  soft: "소프트",
  sweet: "스위트",
  with: "위드",
  mangojuice: "망고주스",
  redbean: "팥",
  fruitade: "과일에이드",
};

const INGREDIENT_LABELS: Record<string, string> = {
  water: "물",
  coffee: "커피",
  milk: "우유",
  default: "기본",
  ice: "얼음",
  chocolate: "초코",
  white_chcolate: "화이트초코",
  strawberry: "딸기",
  lemon: "레몬",
  orange: "오렌지",
  grapefruit: "자몽",
  lime: "라임",
  peach: "복숭아",
  apple: "사과",
  banana: "바나나",
  blueberry: "블루베리",
  cherry: "체리",
  mango: "망고",
  grape: "포도",
  green_grape: "청포도",
  leaf: "말차",
  mint: "민트",
  teabag: "티백",
  fizzy: "탄산",
  vanilla: "바닐라",
  yogurt: "요거트",
  energy: "에너지",
  honey: "허니",
  caramel: "카라멜",
  hazelnut: "헤이즐넛",
  cinnamon: "시나몬",
  black_sesame: "흑임자",
  hibiscus: "히비스커스",
  lychee: "리치",
  kiwi: "키위",
  gold_kiwi: "골드키위",
  coconut: "코코넛",
  cookie: "쿠키",
  sweet_potato: "고구마",
  grain: "곡물",
  jujube: "대추",
  maesil: "매실",
  red_bean: "팥",
  passion_fruit: "패션후르츠",
  plum: "자두",
  omija: "오미자",
  pineapple: "파인애플",
  melon: "멜론",
  pomegranate: "석류",
  tomato: "토마토",
  pistachio: "피스타치오",
  corn: "옥수수",
  watermelon: "수박",
  persimmon: "감",
  ginger: "생강",
};

function toPosixPath(input: string): string {
  return input.split(path.sep).join("/");
}

function parseKeys(filePath: string, blockName: string): string[] {
  const content = fs.readFileSync(filePath, "utf8");
  const start = content.indexOf(blockName);
  if (start < 0) return [];

  const block = content.slice(start);
  const keys: string[] = [];
  const keyRegex = /^\s*["']?([A-Za-z0-9_]+)["']?:\s*require\("([^"]+)"\),?\s*$/gm;
  let match: RegExpExecArray | null = keyRegex.exec(block);
  while (match) {
    keys.push(match[1]);
    match = keyRegex.exec(block);
  }
  return keys;
}

function buildDrinkLabel(key: string): string {
  return key
    .split("_")
    .filter(Boolean)
    .map((part) => DRINK_TOKEN_LABELS[part] ?? part)
    .join(" ");
}

function buildIngredientLabel(key: string): string {
  return INGREDIENT_LABELS[key] ?? key.replaceAll("_", " ");
}

function build() {
  const drinkKeys = parseKeys(
    DRINK_KEYS_FILE,
    "export const GENERATED_DRINK_ICONS = {",
  );
  const ingredientKeys = parseKeys(
    INGREDIENT_KEYS_FILE,
    "export const INGREDIENT_ICONS = {",
  );

  const lines: string[] = [];
  lines.push("// AUTO-GENERATED FILE. DO NOT EDIT.");
  lines.push("// Run: npm run icons:labels");
  lines.push("");
  lines.push('import type { DrinkIconKey, IngredientIconKey } from "./icons";');
  lines.push("");
  lines.push(
    "export const DRINK_ICON_LABELS: Record<DrinkIconKey, string> = {",
  );
  for (const key of drinkKeys.sort((a, b) => a.localeCompare(b))) {
    lines.push(`  "${key}": "${buildDrinkLabel(key)}",`);
  }
  lines.push("} as const;");
  lines.push("");
  lines.push(
    "export const INGREDIENT_ICON_LABELS: Record<IngredientIconKey, string> = {",
  );
  for (const key of ingredientKeys.sort((a, b) => a.localeCompare(b))) {
    lines.push(`  "${key}": "${buildIngredientLabel(key)}",`);
  }
  lines.push("} as const;");
  lines.push("");

  fs.writeFileSync(OUTPUT_FILE, `${lines.join("\n")}`, "utf8");
  console.log(
    `[generateIconLabels] Wrote ${drinkKeys.length} drink labels and ${ingredientKeys.length} ingredient labels to ${toPosixPath(
      path.relative(ROOT, OUTPUT_FILE),
    )}`,
  );
}

build();
