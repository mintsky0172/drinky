import { cert, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import * as fs from "fs";
import * as path from "path";

function readJson<T = any>(p: string): T {
  const raw = fs.readFileSync(p, "utf-8");
  return JSON.parse(raw) as T;
}

type RecipeSeed = {
  id: string;
  [k: string]: any;
};

function mergeRecipes(seedRecipes: RecipeSeed[], manualRecipes: RecipeSeed[]) {
  const byId = new Map<string, RecipeSeed>();

  seedRecipes.forEach((recipe) => {
    if (recipe?.id) byId.set(recipe.id, recipe);
  });

  // manual 파일의 동일 id는 seed 값을 덮어씀
  manualRecipes.forEach((recipe) => {
    if (recipe?.id) byId.set(recipe.id, recipe);
  });

  return Array.from(byId.values());
}

async function commitInChunks(docs: RecipeSeed[], chunkSize = 450) {
  for (let i = 0; i < docs.length; i += chunkSize) {
    const chunk = docs.slice(i, i + chunkSize);
    const batch = db.batch();

    chunk.forEach((recipe) => {
      const ref = db.collection("recipes").doc(recipe.id);
      batch.set(
        ref,
        {
          ...recipe,
          updatedAt: FieldValue.serverTimestamp(),
          createdAt: FieldValue.serverTimestamp(),
          isPublic: true,
        },
        { merge: true },
      );
    });

    await batch.commit();
    console.log(
      `✅ Uploaded ${Math.min(i + chunkSize, docs.length)}/${docs.length}`,
    );
  }
}

async function filterOnlyNewRecipes(
  docs: RecipeSeed[],
  chunkSize = 300,
): Promise<{ newDocs: RecipeSeed[]; existingCount: number }> {
  const existingIds = new Set<string>();

  for (let i = 0; i < docs.length; i += chunkSize) {
    const chunk = docs.slice(i, i + chunkSize);
    const refs = chunk.map((recipe) => db.collection("recipes").doc(recipe.id));
    const snaps = await db.getAll(...refs);
    snaps.forEach((snap) => {
      if (snap.exists) existingIds.add(snap.id);
    });
  }

  const newDocs = docs.filter((recipe) => !existingIds.has(recipe.id));
  return { newDocs, existingCount: existingIds.size };
}

const serviceAccountPath = path.resolve(
  process.cwd(),
  "seed/serviceAccountKey.json",
);
const serviceAccount = readJson<any>(serviceAccountPath);

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

async function main() {
  const manualPath = path.resolve(process.cwd(), "seed/brand/gongcha.json");

  const manualRecipes = fs.existsSync(manualPath)
    ? readJson<RecipeSeed[]>(manualPath)
    : [];
  const recipes = mergeRecipes([], manualRecipes).filter(
    (r) => typeof r?.id === "string" && r.id.trim().length > 0,
  );

  console.log(
    `Loaded ${recipes.length} recipes (manual only: ${manualRecipes.length})`,
  );

  const { newDocs, existingCount } = await filterOnlyNewRecipes(recipes);
  console.log(
    `New recipes: ${newDocs.length}, already existing: ${existingCount}`,
  );

  if (newDocs.length === 0) {
    console.log("✅ Nothing to upload. All recipes already exist.");
    return;
  }

  await commitInChunks(newDocs);
  console.log(`🚀 Upload complete! Added ${newDocs.length} new recipes.`);
}

main().catch((e) => {
  console.error("❌ Upload failed:", e);
  process.exit(1);
});
