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
    console.log(`✅ Uploaded ${Math.min(i + chunkSize, docs.length)}/${docs.length}`);
  }
}

const serviceAccountPath = path.resolve(process.cwd(), "seed/serviceAccountKey.json");
const serviceAccount = readJson<any>(serviceAccountPath);

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

async function main() {
  
  const manualPath = path.resolve(process.cwd(), "seed/recipes.manual.json");

  
  const manualRecipes = fs.existsSync(manualPath)
    ? readJson<RecipeSeed[]>(manualPath)
    : [];
  const recipes = manualRecipes;

  console.log(
    `Uploading ${recipes.length} recipes... manual: ${manualRecipes.length})`,
  );
  await commitInChunks(recipes);
  console.log("🚀 Upload complete!");
}

main().catch((e) => {
  console.error("❌ Upload failed:", e);
  process.exit(1);
});
