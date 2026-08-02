import { cert, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import * as fs from "fs";
import * as path from "path";

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
}

function getServingRatio(entry: Record<string, unknown>, mlPerServing: number) {
  const servings = Number(entry.servings ?? 0);
  if (entry.unit === "cup" && Number.isFinite(servings) && servings > 0) {
    return servings;
  }

  const totalMl = Number(entry.totalMl ?? 0);
  return Number.isFinite(totalMl) && totalMl > 0 ? totalMl / mlPerServing : 0;
}

async function main() {
  const recipeId = process.argv[2];
  if (!recipeId) {
    throw new Error("Usage: npm run entries:calories:recalculate -- <recipeId>");
  }

  const serviceAccountPath = path.resolve(process.cwd(), "seed/serviceAccountKey.json");
  initializeApp({ credential: cert(readJson<Record<string, unknown>>(serviceAccountPath)) });

  const db = getFirestore();
  const recipeSnap = await db.collection("recipes").doc(recipeId).get();
  if (!recipeSnap.exists) throw new Error(`Recipe not found: ${recipeId}`);

  const recipe = recipeSnap.data() as Record<string, unknown>;
  const calories = Math.max(0, Number(recipe.calorieKcalPerServing) || 0);
  const mlPerServing = Math.max(1, Number(recipe.mlPerServing) || 1);
  const usersSnap = await db.collection("users").get();
  let updated = 0;

  for (const userSnap of usersSnap.docs) {
    const entriesSnap = await userSnap.ref
      .collection("entries")
      .where("drinkId", "==", recipeId)
      .get();

    for (let i = 0; i < entriesSnap.docs.length; i += 450) {
      const batch = db.batch();

      entriesSnap.docs.slice(i, i + 450).forEach((entrySnap) => {
        const entry = entrySnap.data() as Record<string, unknown>;
        batch.update(entrySnap.ref, {
          calorieKcalPerServing: calories,
          totalCalorieKcal: Math.round(
            calories * getServingRatio(entry, mlPerServing),
          ),
          updatedAt: FieldValue.serverTimestamp(),
        });
        updated += 1;
      });

      await batch.commit();
    }
  }

  console.log(`Recalculated ${updated} entries for ${recipeId}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
