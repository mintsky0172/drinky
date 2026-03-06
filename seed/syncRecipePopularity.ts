import { cert, initializeApp } from "firebase-admin/app";
import {
  FieldValue,
  getFirestore,
  Timestamp,
} from "firebase-admin/firestore";
import * as fs from "fs";
import * as path from "path";

type RecipeDoc = {
  id: string;
  name?: string;
  normalizedName?: string;
};

function readJson<T = unknown>(p: string): T {
  const raw = fs.readFileSync(p, "utf-8");
  return JSON.parse(raw) as T;
}

const serviceAccountPath = path.resolve(process.cwd(), "seed/serviceAccountKey.json");
const serviceAccount = readJson<any>(serviceAccountPath);

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

function normalizeName(v: unknown): string {
  return typeof v === "string" ? v.trim().toLowerCase() : "";
}

async function main() {
  console.log("Loading recipes...");
  const recipesSnap = await db.collection("recipes").get();
  const recipes = recipesSnap.docs.map((d) => {
    const data = d.data() as RecipeDoc;
    return {
      id: d.id,
      name: data.name ?? "",
      normalizedName: data.normalizedName ?? "",
    };
  });

  const recipeIdSet = new Set(recipes.map((r) => r.id));
  const recipeIdByName = new Map<string, string>();
  recipes.forEach((r) => {
    const keys = [normalizeName(r.normalizedName), normalizeName(r.name)];
    keys.forEach((k) => {
      if (!k) return;
      if (!recipeIdByName.has(k)) recipeIdByName.set(k, r.id);
    });
  });

  console.log("Loading all entries (collectionGroup: entries)...");
  const entriesSnap = await db.collectionGroup("entries").get();
  console.log(`Entries loaded: ${entriesSnap.size}`);

  const counts = new Map<string, number>();
  let unmatched = 0;

  entriesSnap.docs.forEach((docSnap) => {
    const e = docSnap.data() as any;
    const drinkId = typeof e?.drinkId === "string" ? e.drinkId : "";
    if (drinkId && recipeIdSet.has(drinkId)) {
      counts.set(drinkId, (counts.get(drinkId) ?? 0) + 1);
      return;
    }

    const nameKey = normalizeName(e?.drinkName);
    if (!nameKey) {
      unmatched += 1;
      return;
    }

    const resolvedId = recipeIdByName.get(nameKey);
    if (!resolvedId) {
      unmatched += 1;
      return;
    }

    counts.set(resolvedId, (counts.get(resolvedId) ?? 0) + 1);
  });

  console.log(`Matched recipes: ${counts.size}, unmatched entries: ${unmatched}`);

  const now = Timestamp.now();
  const allRecipeIds = recipes.map((r) => r.id);
  const chunkSize = 450;

  for (let i = 0; i < allRecipeIds.length; i += chunkSize) {
    const chunk = allRecipeIds.slice(i, i + chunkSize);
    const batch = db.batch();

    chunk.forEach((recipeId) => {
      const ref = db.collection("recipes").doc(recipeId);
      batch.set(
        ref,
        {
          popularityCount: counts.get(recipeId) ?? 0,
          popularityUpdatedAt: now,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    });

    await batch.commit();
    console.log(`Updated ${Math.min(i + chunkSize, allRecipeIds.length)}/${allRecipeIds.length}`);
  }

  console.log("Done: recipes.popularityCount synced.");
}

main().catch((e) => {
  console.error("syncRecipePopularity failed:", e);
  process.exit(1);
});
