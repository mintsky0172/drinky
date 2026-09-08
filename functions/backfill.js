const { initializeApp, applicationDefault } = require("firebase-admin/app");
const { getFirestore, FieldPath } = require("firebase-admin/firestore");
const { reconcileEntry, LEDGER, COUNT_FIELD } = require("./popularity");

initializeApp({ credential: applicationDefault() });
const db = getFirestore();

async function visit(query, callback) {
  let last;
  while (true) {
    const page = await (last ? query.startAfter(last) : query).limit(200).get();
    if (page.empty) break;
    for (const doc of page.docs) await callback(doc);
    last = page.docs[page.docs.length - 1];
  }
}

async function main() {
  // Reconcile stale markers too, so reruns repair records deleted during migration.
  await visit(db.collection(LEDGER).orderBy(FieldPath.documentId()), async (doc) => {
    await reconcileEntry(db, doc.data().entryPath);
  });
  let processed = 0;
  await visit(db.collectionGroup("entries").orderBy(FieldPath.documentId()), async (doc) => {
    if (!/^users\/[^/]+\/entries\/[^/]+$/.test(doc.ref.path)) return;
    await reconcileEntry(db, doc.ref.path);
    processed += 1;
    if (processed % 200 === 0) console.log(`Reconciled ${processed} entries`);
  });
  await visit(db.collection("recipes").orderBy(FieldPath.documentId()), async (recipe) => {
    await db.runTransaction(async (tx) => {
      const current = await tx.get(recipe.ref);
      if (current.exists && current.data()[COUNT_FIELD] == null) {
        tx.update(recipe.ref, { [COUNT_FIELD]: 0 });
      }
    });
  });
  console.log(`Done: ${processed} entries reconciled. Safe to rerun.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
