const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { initializeApp, deleteApp } = require("firebase/app");
const {
  getFirestore, connectFirestoreEmulator, doc, setDoc, updateDoc,
  getDoc, deleteDoc, deleteField, terminate,
} = require("firebase/firestore");

const projectId = "demo-drinky-rules";
const host = process.env.FIRESTORE_EMULATOR_HOST;
assert.match(host || "", /^127\.0\.0\.1:\d+$/, "Run only through the local Firestore emulator");
const port = Number(host.split(":")[1]);
const clients = [];

function client(uid) {
  const app = initializeApp({ projectId, apiKey: "demo-only" }, uid || "guest");
  const db = getFirestore(app);
  connectFirestoreEmulator(db, "127.0.0.1", port, uid ? { mockUserToken: { sub: uid } } : {});
  clients.push({ app, db });
  return db;
}

const admin = client("admin");
const user = client("user");
const newcomer = client("newcomer");
const guest = client();
const protectedFields = ["popularityLiveCount", "popularityCount", "popularityScore", "popularityUpdatedAt"];
const denied = (operation) => assert.rejects(operation, (error) => error.code === "permission-denied");

async function seed(path, fields) {
  const response = await fetch(`http://${host}/v1/projects/${projectId}/databases/(default)/documents/${path}`, {
    method: "PATCH",
    headers: { Authorization: "Bearer owner", "Content-Type": "application/json" },
    body: JSON.stringify({ fields }),
  });
  assert.equal(response.ok, true, await response.text());
}

before(async () => {
  await seed("users/admin", { role: { stringValue: "admin" } });
  await seed("users/user", { role: { stringValue: "user" } });
  await seed("recipes/existing", {
    name: { stringValue: "Tea" },
    popularityLiveCount: { integerValue: "3" },
    popularityCount: { integerValue: "2" },
    popularityScore: { integerValue: "2" },
    popularityUpdatedAt: { timestampValue: "2026-01-01T00:00:00Z" },
  });
  await seed("_recipePopularityEntries/marker", { recipeId: { stringValue: "existing" } });
});

after(async () => {
  for (const { db, app } of clients) {
    await terminate(db);
    await deleteApp(app);
  }
});

test("profile creation cannot grant admin; ordinary profile and goals updates work", async () => {
  const profile = doc(newcomer, "users/newcomer");
  await denied(setDoc(profile, { role: "admin" }));
  await setDoc(profile, { nickname: "New user" });
  await updateDoc(profile, { goals: { waterMl: 1500, calorieKcal: 500 } });
  await denied(updateDoc(profile, { role: "admin" }));
  await denied(setDoc(doc(user, "users/admin"), { role: "user" }));
});

test("role cannot be elevated, removed, or changed even by its admin owner", async () => {
  await denied(updateDoc(doc(user, "users/user"), { role: "admin" }));
  await denied(updateDoc(doc(user, "users/user"), { role: deleteField() }));
  await denied(updateDoc(doc(admin, "users/admin"), { role: "user" }));
  await updateDoc(doc(admin, "users/admin"), { nickname: "Admin" });
});

test("recipes remain public and admin can edit ordinary fields", async () => {
  assert.equal((await getDoc(doc(guest, "recipes/existing"))).exists(), true);
  await denied(setDoc(doc(user, "recipes/unauthorized"), { name: "No" }));
  await setDoc(doc(admin, "recipes/new"), { name: "New", iconUrl: "https://example.com/icon.png" });
  await updateDoc(doc(admin, "recipes/existing"), { name: "Updated", calorieKcalPerServing: 10 });
  await denied(deleteDoc(doc(admin, "recipes/existing")));
});

test("admin cannot create, overwrite, or remove any popularity field", async () => {
  for (const field of protectedFields) {
    await denied(setDoc(doc(admin, `recipes/blocked-${field}`), { name: "No", [field]: 0 }));
    await denied(updateDoc(doc(admin, "recipes/existing"), { [field]: 9 }));
    await denied(updateDoc(doc(admin, "recipes/existing"), { [field]: deleteField() }));
  }
  await denied(setDoc(doc(admin, "recipes/existing"), { name: "Drops protected fields" }));
});

test("ledger is inaccessible to guests, owners, and administrators", async () => {
  for (const db of [guest, user, admin]) {
    const marker = doc(db, "_recipePopularityEntries/marker");
    await denied(getDoc(marker));
    await denied(setDoc(marker, { recipeId: "forged" }));
    await denied(deleteDoc(marker));
  }
});

test("entry CRUD remains owner-only", async () => {
  const entry = doc(user, "users/user/entries/test");
  await setDoc(entry, { drinkId: "existing", drinkName: "Tea" });
  await updateDoc(entry, { totalCalorieKcal: 20 });
  await getDoc(entry);
  await denied(getDoc(doc(newcomer, "users/user/entries/test")));
  await denied(setDoc(doc(newcomer, "users/user/entries/forged"), { drinkId: "existing" }));
  await deleteDoc(entry);
});

test("guest inquiries retain their existing submission flow", async () => {
  await setDoc(doc(guest, "inquiries/guest-test"), {
    subject: "Question", message: "Test inquiry", createdBy: "guest",
    isAnonymous: true, status: "open", createdAt: new Date(),
  });
  await denied(getDoc(doc(guest, "inquiries/guest-test")));
  assert.equal((await getDoc(doc(admin, "inquiries/guest-test"))).exists(), true);
});
