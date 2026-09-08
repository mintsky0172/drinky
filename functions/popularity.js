const { createHash } = require("node:crypto");
const { FieldValue } = require("firebase-admin/firestore");

const LEDGER = "_recipePopularityEntries";
const COUNT_FIELD = "popularityLiveCount";

async function resolveRecipe(tx, db, entry) {
  if (!entry) return null;
  const id = typeof entry.drinkId === "string" ? entry.drinkId.trim() : "";
  if (id && !id.includes("/")) {
    const recipe = await tx.get(db.collection("recipes").doc(id));
    if (recipe.exists) return recipe;
  }

  // Legacy entries may only contain a name. Never guess among duplicate names.
  const name = typeof entry.drinkName === "string" ? entry.drinkName.trim() : "";
  if (!name) return null;
  for (const [field, value] of [["normalizedName", name.toLowerCase()], ["name", name]]) {
    const matches = await tx.get(db.collection("recipes").where(field, "==", value).limit(2));
    if (matches.size > 1) return null;
    if (matches.size === 1) return matches.docs[0];
  }
  return null;
}

async function reconcileEntry(db, entryPath) {
  if (!/^users\/[^/]+\/entries\/[^/]+$/.test(entryPath)) {
    throw new Error("Invalid entry path");
  }
  const entryRef = db.doc(entryPath);
  const markerRef = db.collection(LEDGER).doc(createHash("sha256").update(entryPath).digest("hex"));

  return db.runTransaction(async (tx) => {
    // Read current state, not event snapshots: delivery can be duplicated or reordered.
    const entry = await tx.get(entryRef);
    const marker = await tx.get(markerRef);
    const next = await resolveRecipe(tx, db, entry.exists ? entry.data() : null);
    const previousId = marker.data()?.recipeId ?? null;
    const nextId = next?.id ?? null;
    if (previousId === nextId) return;

    const previous = previousId
      ? await tx.get(db.collection("recipes").doc(previousId))
      : null;

    // All reads precede writes. The marker and both counters commit together.
    for (const [recipe, delta] of [[previous, -1], [next, 1]]) {
      if (!recipe?.exists) continue;
      const count = Number(recipe.data()[COUNT_FIELD] ?? 0);
      if (!Number.isSafeInteger(count) || count < 0 || count + delta < 0) {
        throw new Error(`Invalid popularity counter for ${recipe.id}`);
      }
      tx.update(recipe.ref, {
        [COUNT_FIELD]: count + delta,
        popularityUpdatedAt: FieldValue.serverTimestamp(),
      });
    }
    if (nextId) {
      tx.set(markerRef, { entryPath, recipeId: nextId });
    } else if (marker.exists) {
      tx.delete(markerRef);
    }
  });
}

module.exports = { reconcileEntry, LEDGER, COUNT_FIELD };
