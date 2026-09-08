const { test } = require("node:test");
const assert = require("node:assert/strict");
const { reconcileEntry, COUNT_FIELD, LEDGER } = require("../popularity");

// In-memory transaction boundary for testing reconciliation independently of delivery order.
function database(initial) {
  const data = new Map(Object.entries(initial));
  const ref = (path) => ({ path, id: path.split("/").at(-1) });
  const snapshot = (r) => ({ ref: r, id: r.id, exists: data.has(r.path), data: () => data.get(r.path) });
  const db = {
    data,
    doc: ref,
    collection: (path) => ({
      doc: (id) => ref(`${path}/${id}`),
      where: (field, operator, value) => ({
        limit: (limit) => ({ path, field, value, limit, query: true }),
      }),
    }),
    runTransaction: async (callback) => {
      const writes = [];
      const result = await callback({
        get: async (r) => {
          assert.equal(writes.length, 0, "Firestore requires reads before writes");
          if (!r.query) return snapshot(r);
          const docs = [...data.entries()]
            .filter(([path, value]) => path.startsWith(`${r.path}/`) && value[r.field] === r.value)
            .slice(0, r.limit)
            .map(([path]) => snapshot(ref(path)));
          return { size: docs.length, docs };
        },
        update: (r, patch) => writes.push(() => data.set(r.path, { ...data.get(r.path), ...patch })),
        set: (r, value) => writes.push(() => data.set(r.path, value)),
        delete: (r) => writes.push(() => data.delete(r.path)),
      });
      writes.forEach((write) => write());
      return result;
    },
  };
  return db;
}

const entryPath = "users/user-1/entries/entry-1";
const count = (db, id) => db.data.get(`recipes/${id}`)[COUNT_FIELD] ?? 0;
const createDb = () => database({ "recipes/a": { name: "A" }, "recipes/b": { name: "B" } });

test("create, duplicate delivery, metadata edit, drink change, and duplicate delete", async () => {
  const db = createDb();
  db.data.set(entryPath, { drinkId: "a" });
  await reconcileEntry(db, entryPath);
  await reconcileEntry(db, entryPath);
  assert.equal(count(db, "a"), 1);
  db.data.set(entryPath, { drinkId: "a", servings: 3, memo: "updated" });
  await reconcileEntry(db, entryPath);
  assert.equal(count(db, "a"), 1);
  db.data.set(entryPath, { drinkId: "b" });
  await reconcileEntry(db, entryPath);
  assert.equal(count(db, "a"), 0);
  assert.equal(count(db, "b"), 1);
  db.data.delete(entryPath);
  await reconcileEntry(db, entryPath);
  await reconcileEntry(db, entryPath);
  assert.equal(count(db, "b"), 0);
  assert.equal([...db.data.keys()].some((key) => key.startsWith(LEDGER)), false);
});

test("delayed events reconcile current state, including deletion before creation delivery", async () => {
  const db = createDb();
  await reconcileEntry(db, entryPath);
  assert.equal(count(db, "a"), 0);
  db.data.set(entryPath, { drinkId: "b" });
  await reconcileEntry(db, entryPath);
  await reconcileEntry(db, entryPath);
  assert.equal(count(db, "a"), 0);
  assert.equal(count(db, "b"), 1);
});

test("backfill and live events share markers and do not add to legacy counts", async () => {
  const db = createDb();
  db.data.set("recipes/a", { name: "A", popularityCount: 40 });
  db.data.set(entryPath, { drinkId: "a" });
  const secondPath = "users/user-2/entries/entry-1";
  db.data.set(secondPath, { drinkId: "a" });
  for (const path of [entryPath, secondPath, entryPath, secondPath]) {
    await reconcileEntry(db, path);
  }
  assert.equal(count(db, "a"), 2);
  assert.equal(db.data.get("recipes/a").popularityCount, 40);
});

test("unique legacy names resolve, ambiguous and missing recipes do not", async () => {
  const db = createDb();
  db.data.set(entryPath, { drinkName: "A" });
  await reconcileEntry(db, entryPath);
  assert.equal(count(db, "a"), 1);
  db.data.set(entryPath, { drinkId: "missing", drinkName: "missing" });
  await reconcileEntry(db, entryPath);
  assert.equal(count(db, "a"), 0);
  db.data.set("recipes/b", { name: "A" });
  db.data.set(entryPath, { drinkName: "A" });
  await reconcileEntry(db, entryPath);
  assert.equal(count(db, "a"), 0);
  assert.equal(count(db, "b"), 0);
});

test("deleted recipes are not recreated by delayed entry events", async () => {
  const db = createDb();
  db.data.set(entryPath, { drinkId: "a" });
  await reconcileEntry(db, entryPath);
  db.data.delete("recipes/a");
  db.data.delete(entryPath);
  await reconcileEntry(db, entryPath);
  assert.equal(db.data.has("recipes/a"), false);
});

test("invalid counters abort the entire transaction", async () => {
  const db = createDb();
  db.data.set(entryPath, { drinkId: "a" });
  await reconcileEntry(db, entryPath);
  db.data.set("recipes/b", { [COUNT_FIELD]: -1 });
  db.data.set(entryPath, { drinkId: "b" });
  await assert.rejects(reconcileEntry(db, entryPath), /Invalid popularity counter/);
  assert.equal(count(db, "a"), 1);
});

test("reject paths outside user entries", async () => {
  await assert.rejects(reconcileEntry(createDb(), "recipes/a"), /Invalid entry path/);
});
