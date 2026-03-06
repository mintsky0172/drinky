import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type Category =
  | "ade"
  | "carbonated"
  | "coffee"
  | "energy"
  | "juice"
  | "latte"
  | "milk"
  | "other"
  | "smoothie"
  | "tea"
  | "water"
  | "shake"
  | "frappe";

const VALID_CATEGORIES: Category[] = [
  "ade",
  "carbonated",
  "coffee",
  "energy",
  "juice",
  "latte",
  "milk",
  "other",
  "smoothie",
  "tea",
  "water",
  "shake",
  "frappe",
];

type Recipe = {
  id: string;
  name: string;
  brand?: string | null;
  category: string;
  drinkIconKey: string;
  calendarIconKey: string;
  normalizedName?: string;
  aliases?: string[];
  searchKeywords?: string[];
  tags?: string[];
};

type LoadedRecipe = {
  file: string;
  index: number;
  recipe: Recipe;
};

function readJson<T>(filePath: string): T {
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as T;
}

function extractQuotedKeysFromTsObject(filePath: string, objectName: string) {
  const source = fs.readFileSync(filePath, "utf-8");
  const objectStart = source.indexOf(`const ${objectName} = {`);
  if (objectStart === -1) return [] as string[];

  const objectSource = source.slice(objectStart);
  const objectEnd = objectSource.indexOf("} as const;");
  const block =
    objectEnd === -1 ? objectSource : objectSource.slice(0, objectEnd);

  return Array.from(
    block.matchAll(/^\s*(?:["']([A-Za-z0-9_&-]+)["']|([A-Za-z0-9_&-]+))\s*:/gm),
  ).map((match) => match[1] ?? match[2]);
}

function extractGeneratedDrinkKeys(filePath: string) {
  const source = fs.readFileSync(filePath, "utf-8");
  return Array.from(source.matchAll(/^\s*"([^"]+)":\s*require\(/gm)).map(
    (match) => match[1],
  );
}

function getJsonFiles(dir: string) {
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .filter((name) => name !== "serviceAccountKey.json")
    .map((name) => path.join(dir, name));
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}

function addError(errors: string[], file: string, index: number, msg: string) {
  errors.push(`[${path.basename(file)} #${index}] ${msg}`);
}

function findClosestKey(input: string, candidates: readonly string[]) {
  const lowered = input.toLowerCase();

  const exactish = candidates.find(
    (c) =>
      c.toLowerCase().includes(lowered) || lowered.includes(c.toLowerCase()),
  );
  if (exactish) return exactish;

  const samePrefix = candidates.find(
    (c) => c.toLowerCase().slice(0, 3) === lowered.slice(0, 3),
  );
  if (samePrefix) return samePrefix;

  return null;
}

function main() {
  const projectRoot = path.resolve(__dirname, "..");
  const seedDir = path.join(__dirname, "brand");
  const generatedIconsFile = path.join(
    projectRoot,
    "src/constants/icons.generated.ts",
  );
  const iconsFile = path.join(projectRoot, "src/constants/icons.ts");

  const VALID_DRINK_ICON_KEYS = extractGeneratedDrinkKeys(generatedIconsFile);
  const VALID_CALENDAR_ICON_KEYS = extractQuotedKeysFromTsObject(
    iconsFile,
    "INGREDIENT_ICONS",
  );

  const jsonFiles = getJsonFiles(seedDir).filter((file) => {
    const base = path.basename(file);
    return (
      base.includes("gongcha") 
    );
  });

  if (jsonFiles.length === 0) {
    console.log(
      "검사할 JSON 파일이 없어요. 현재는 seed/brand 안의 브랜드 JSON만 검사해요.",
    );
    process.exit(0);
  }

  const loaded: LoadedRecipe[] = [];
  const errors: string[] = [];

  for (const file of jsonFiles) {
    try {
      const data = readJson<unknown>(file);

      if (!Array.isArray(data)) {
        errors.push(`[${path.basename(file)}] 파일 최상위가 배열이 아니에요.`);
        continue;
      }

      data.forEach((item, index) => {
        loaded.push({
          file,
          index,
          recipe: item as Recipe,
        });
      });
    } catch (e) {
      errors.push(`[${path.basename(file)}] JSON 파싱 실패: ${String(e)}`);
    }
  }

  const idMap = new Map<string, LoadedRecipe[]>();
  const categoryCount = new Map<string, number>();
  const brandCount = new Map<string, number>();

  for (const row of loaded) {
    const { file, index, recipe } = row;

    // 필수 필드
    if (!recipe.id || typeof recipe.id !== "string") {
      addError(errors, file, index, "id가 없거나 문자열이 아니에요.");
    }
    if (!recipe.name || typeof recipe.name !== "string") {
      addError(errors, file, index, "name이 없거나 문자열이 아니에요.");
    }
    if (!recipe.category || typeof recipe.category !== "string") {
      addError(errors, file, index, "category가 없거나 문자열이 아니에요.");
    }
    if (!recipe.drinkIconKey || typeof recipe.drinkIconKey !== "string") {
      addError(errors, file, index, "drinkIconKey가 없거나 문자열이 아니에요.");
    }
    if (!recipe.calendarIconKey || typeof recipe.calendarIconKey !== "string") {
      addError(
        errors,
        file,
        index,
        "calendarIconKey가 없거나 문자열이 아니에요.",
      );
    }

    // category 검사
    if (
      recipe.category &&
      !VALID_CATEGORIES.includes(recipe.category as Category)
    ) {
      addError(
        errors,
        file,
        index,
        `category "${recipe.category}"가 유효하지 않아요.`,
      );
    }

    // drinkIconKey 검사
    if (
      recipe.drinkIconKey &&
      !VALID_DRINK_ICON_KEYS.includes(
        recipe.drinkIconKey as (typeof VALID_DRINK_ICON_KEYS)[number],
      )
    ) {
      const suggestion = findClosestKey(
        recipe.drinkIconKey,
        VALID_DRINK_ICON_KEYS,
      );
      addError(
        errors,
        file,
        index,
        suggestion
          ? `drinkIconKey "${recipe.drinkIconKey}"가 목록에 없어요. 혹시 "${suggestion}"?`
          : `drinkIconKey "${recipe.drinkIconKey}"가 목록에 없어요.`,
      );
    }

    // calendarIconKey 검사
    if (
      recipe.calendarIconKey &&
      !VALID_CALENDAR_ICON_KEYS.includes(
        recipe.calendarIconKey as (typeof VALID_CALENDAR_ICON_KEYS)[number],
      )
    ) {
      const suggestion = findClosestKey(
        recipe.calendarIconKey,
        VALID_CALENDAR_ICON_KEYS,
      );
      addError(
        errors,
        file,
        index,
        suggestion
          ? `calendarIconKey "${recipe.calendarIconKey}"가 목록에 없어요. 혹시 "${suggestion}"?`
          : `calendarIconKey "${recipe.calendarIconKey}"가 목록에 없어요.`,
      );
    }

    // 배열 필드 검사
    if (recipe.aliases !== undefined && !isStringArray(recipe.aliases)) {
      addError(errors, file, index, "aliases가 문자열 배열이 아니에요.");
    }

    if (
      recipe.searchKeywords !== undefined &&
      !isStringArray(recipe.searchKeywords)
    ) {
      addError(errors, file, index, "searchKeywords가 문자열 배열이 아니에요.");
    }

    if (recipe.tags !== undefined && !isStringArray(recipe.tags)) {
      addError(errors, file, index, "tags가 문자열 배열이 아니에요.");
    }

    // normalizedName 체크
    if (!recipe.normalizedName || typeof recipe.normalizedName !== "string") {
      addError(errors, file, index, "normalizedName이 없어요.");
    }

    // id 중복 체크
    if (recipe.id) {
      const arr = idMap.get(recipe.id) ?? [];
      arr.push(row);
      idMap.set(recipe.id, arr);
    }

    // 리포트용 카운트
    if (recipe.category) {
      categoryCount.set(
        recipe.category,
        (categoryCount.get(recipe.category) ?? 0) + 1,
      );
    }

    const brandKey = recipe.brand ?? "공통";
    brandCount.set(brandKey, (brandCount.get(brandKey) ?? 0) + 1);
  }

  // id 중복 에러
  for (const [id, rows] of idMap.entries()) {
    if (rows.length > 1) {
      const sources = rows
        .map((r) => `${path.basename(r.file)} #${r.index}`)
        .join(", ");
      errors.push(`[DUPLICATE ID] "${id}" -> ${sources}`);
    }
  }

  console.log("\n📊 카테고리별 개수");
  console.table(
    Object.fromEntries(
      [...categoryCount.entries()].sort((a, b) =>
        a[0].localeCompare(b[0], "ko"),
      ),
    ),
  );

  console.log("\n🏷 브랜드별 개수");
  console.table(
    Object.fromEntries(
      [...brandCount.entries()].sort((a, b) => a[0].localeCompare(b[0], "ko")),
    ),
  );

  if (errors.length > 0) {
    console.log(`\n❌ 검증 실패: ${errors.length}개 문제 발견\n`);
    errors.forEach((e) => console.log(e));
    process.exit(1);
  } else {
    console.log("\n✅ 검증 통과! 문제 없음.");
  }
}

main();
