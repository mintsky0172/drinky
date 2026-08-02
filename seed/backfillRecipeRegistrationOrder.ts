import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as fs from "fs";
import * as path from "path";

type RecipeSeed = { id: string };

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
}

function getSeedPaths() {
  const suppliedPaths = process.argv.slice(2);
  if (suppliedPaths.length > 0) return suppliedPaths;

  return ["seed/recipes.seed.json"];
}

async function main() {
  const seedPaths = getSeedPaths().map((seedPath) => path.resolve(process.cwd(), seedPath));
  const recipes = seedPaths.flatMap((seedPath) => readJson<RecipeSeed[]>(seedPath));
  const orderById = new Map<string, number>();

  recipes.forEach((recipe, index) => {
    if (typeof recipe.id === "string" && recipe.id.trim()) {
      orderById.set(recipe.id, index);
    }
  });

  const serviceAccountPath = path.resolve(process.cwd(), "seed/serviceAccountKey.json");
  const serviceAccount = readJson<Record<string, unknown>>(serviceAccountPath);
  initializeApp({ credential: cert(serviceAccount) });

  const db = getFirestore();
  const refs = Array.from(orderById.keys()).map((id) => db.collection("recipes").doc(id));
  let updated = 0;
  let missing = 0;

  for (let i = 0; i < refs.length; i += 450) {
    const chunk = refs.slice(i, i + 450);
    const snaps = await db.getAll(...chunk);
    const batch = db.batch();

    snaps.forEach((snap) => {
      if (!snap.exists) {
        missing += 1;
        return;
      }

      batch.update(snap.ref, { registrationOrder: orderById.get(snap.id) });
      updated += 1;
    });

    await batch.commit();
  }

  console.log(`Updated registrationOrder for ${updated} recipes. Missing: ${missing}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
