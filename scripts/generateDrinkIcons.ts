import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const DRINKS_DIR = path.join(ROOT, "assets", "icons", "drinks");
const OUTPUT_FILE = path.join(ROOT, "src", "constants", "icons.generated.ts");

const ALIASES: Record<string, string> = {
  ice_cafe_latte: "ice_cafelatte",
  matcha_latte: "matchalatte",
  ice_matcha_latte: "ice_matchalatte",
  ice_milk_tea: "ice_milktea",
  yuzu_tea: "yuzutea",
  black_white_coldbrew: "black_white_coldbrew",
};

function walkPngFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkPngFiles(fullPath));
      continue;
    }
    if (!entry.isFile()) continue;
    if (!entry.name.toLowerCase().endsWith(".png")) continue;
    files.push(fullPath);
  }

  return files;
}

function toPosixPath(input: string): string {
  return input.split(path.sep).join("/");
}

function readExistingGeneratedMap(filePath: string): Map<string, string> {
  if (!fs.existsSync(filePath)) return new Map();
  const content = fs.readFileSync(filePath, "utf8");
  const map = new Map<string, string>();
  const lineRegex = /^\s*"([^"]+)":\s*require\("([^"]+)"\),\s*$/gm;
  let match: RegExpExecArray | null = lineRegex.exec(content);
  while (match) {
    const key = match[1];
    const requirePath = match[2];
    map.set(key, requirePath);
    match = lineRegex.exec(content);
  }
  return map;
}

function build() {
  if (!fs.existsSync(DRINKS_DIR)) {
    throw new Error(`Directory not found: ${DRINKS_DIR}`);
  }

  const pngFiles = walkPngFiles(DRINKS_DIR);
  const existingMap = readExistingGeneratedMap(OUTPUT_FILE);
  const keyToRequirePath = new Map<string, string>(existingMap);
  const newlyAdded: string[] = [];

  for (const absoluteFile of pngFiles) {
    const key = path.basename(absoluteFile, ".png");
    const relFromDrinks = toPosixPath(path.relative(DRINKS_DIR, absoluteFile));
    const requirePath = `@/assets/icons/drinks/${relFromDrinks}`;

    const existing = keyToRequirePath.get(key);
    if (existing) continue;

    keyToRequirePath.set(key, requirePath);
    newlyAdded.push(key);
  }

  for (const [alias, target] of Object.entries(ALIASES)) {
    if (keyToRequirePath.has(alias)) continue;
    const targetPath = keyToRequirePath.get(target);
    if (!targetPath) {
      console.warn(
        `[generateDrinkIcons] Skipped alias "${alias}" -> "${target}" (target missing)`,
      );
      continue;
    }
    keyToRequirePath.set(alias, targetPath);
    newlyAdded.push(alias);
  }

  const sortedKeys = Array.from(keyToRequirePath.keys()).sort((a, b) =>
    a.localeCompare(b),
  );

  const lines: string[] = [];
  lines.push("// AUTO-GENERATED FILE. DO NOT EDIT.");
  lines.push("// Run: npm run icons:gen");
  lines.push("");
  lines.push("export const GENERATED_DRINK_ICONS = {");
  for (const key of sortedKeys) {
    const requirePath = keyToRequirePath.get(key)!;
    lines.push(`  "${key}": require("${requirePath}"),`);
  }
  lines.push("} as const;");
  lines.push("");
  lines.push("export type GeneratedDrinkIconKey = keyof typeof GENERATED_DRINK_ICONS;");
  lines.push("");

  fs.writeFileSync(OUTPUT_FILE, `${lines.join("\n")}`, "utf8");
  console.log(
    `[generateDrinkIcons] Wrote ${sortedKeys.length} keys to ${path.relative(ROOT, OUTPUT_FILE)} (+${newlyAdded.length} new)`,
  );
}

build();
