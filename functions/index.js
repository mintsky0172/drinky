const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { reconcileEntry } = require("./popularity");

initializeApp();

exports.syncDrinkPopularity = onDocumentWritten(
  {
    document: "users/{uid}/entries/{entryId}",
    region: process.env.POPULARITY_FUNCTION_REGION || "asia-northeast3",
    retry: true,
    maxInstances: 10,
  },
  async (event) => {
    await reconcileEntry(
      getFirestore(),
      `users/${event.params.uid}/entries/${event.params.entryId}`,
    );
  },
);
