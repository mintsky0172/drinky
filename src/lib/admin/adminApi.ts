import {
    addDoc,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase";
import { InquiryDoc, ReportDoc } from "@/src/types/admin";
import { uploadIconToStorage } from "@/src/features/admin/uploadDrinkIcon";

export type Recipe = {
  id: string;
  name?: string;
  brand?: string;
  category?: string;
  drinkIconKey?: string;
  iconUrl?: string;
  calendarIconKey?: string;
  ingredientIconUrl?: string;
  mlPerServing?: number;
  caffeineMgPerServing?: number;
  sugarGPerServing?: number;
  calorieKcalPerServing?: number;
  isWaterOnly?: boolean;
  isPublic?: boolean;
  normalizedName?: string;
  aliases?: string[];
  searchKeywords?: string[];
  tags?: string[];
  createdAt?: unknown;
  updatedAt?: unknown;
  updatedBy?: string;
  source?: string;
};

type UpdateRecipeInput = {
  name: string;
  brand?: string;
  category?: string;
  drinkIconKey?: string;
  iconUrl?: string;
  calendarIconKey?: string;
  ingredientIconUrl?: string;
  mlPerServing: number;
  caffeineMgPerServing: number;
  sugarGPerServing: number;
  calorieKcalPerServing: number;
  isWaterOnly: boolean;
  isPublic: boolean;
  normalizedName?: string;
  aliases?: string[];
  searchKeywords?: string[];
  tags?: string[];
};

type CreateRecipeInput = {
    name: string;
    brand?: string;
    category?: string;
    drinkIconKey?: string;
    iconUrl?: string;
    calendarIconKey?: string;
    ingredientIconUrl?: string;
    mlPerServing: number;
    caffeineMgPerServing: number;
    sugarGPerServing: number;
    calorieKcalPerServing: number;
    isWaterOnly: boolean;
    isPublic: boolean;
    normalizedName?: string;
    aliases?: string[];
    searchKeywords?: string[];
    tags?: string[];
}

export async function getUserRole(uid: string) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) return "user";

  const data = snap.data();

  return data.role ?? "user";
}

export async function getAdminMeta(uid: string) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) return null;

  const data = snap.data();
  return data.adminMeta ?? null;
}

export async function markReportSeen(uid: string, reportId: string) {
  const ref = doc(db, "users", uid);
  await updateDoc(ref, {
    "adminMeta.reportSeenIds": arrayUnion(reportId),
    "adminMeta.reportsLastSeenAt": serverTimestamp(),
  });
}

export async function markInquirySeen(uid: string, inquiryId: string) {
  const ref = doc(db, "users", uid);
  await updateDoc(ref, {
    "adminMeta.inquirySeenIds": arrayUnion(inquiryId),
    "adminMeta.inquiriesLastSeenAt": serverTimestamp(),
  });
}

export async function setRecipePublic(
  recipeId: string,
  isPublic: boolean,
  adminUid: string,
) {
  const ref = doc(db, "recipes", recipeId);

  await updateDoc(ref, {
    isPublic,
    updatedAt: serverTimestamp(),
    updatedBy: adminUid,
    source: "admin",
  });
}

export async function getReportById(id: string) {
  const ref = doc(db, "reports", id);
  const snap = await getDoc(ref);

  if (!snap.exists()) return null;

  return {
    id: snap.id,
    ...(snap.data() as ReportDoc),
  };
}

export async function getInquiryById(id: string) {
  const ref = doc(db, "inquiries", id);
  const snap = await getDoc(ref);

  if (!snap.exists()) return null;

  return {
    id: snap.id,
    ...(snap.data() as InquiryDoc),
  };
}

export async function updateReportStatus(
  id: string,
  input: {
    status: "open" | "reviewing" | "done" | "rejected";
    adminMemo?: string;
  },
) {
  const ref = doc(db, "reports", id);

  await updateDoc(ref, {
    status: input.status,
    adminMemo: input.adminMemo ?? "",
    updatedAt: serverTimestamp(),
  });
}

export async function updateInquiryStatus(
  id: string,
  input: {
    status: "open" | "done";
    adminMemo?: string;
  },
) {
  const ref = doc(db, "inquiries", id);

  await updateDoc(ref, {
    status: input.status,
    adminMemo: input.adminMemo ?? "",
    updatedAt: serverTimestamp(),
  });
}

export async function getRecipeById(recipeId: string) {
  const ref = doc(db, "recipes", recipeId);
  const snap = await getDoc(ref);

  if (!snap.exists()) return null;

  return {
    id: snap.id,
    ...snap.data(),
  };
}

export async function updateRecipe(
  recipeId: string,
  input: UpdateRecipeInput,
  adminUid: string,
) {
  const ref = doc(db, "recipes", recipeId);

  await updateDoc(ref, {
    ...input,
    updatedAt: serverTimestamp(),
    updatedBy: adminUid,
    source: "admin",
  });

  return recalculateRecipeEntryCalories(
    recipeId,
    input.calorieKcalPerServing,
    input.mlPerServing,
    adminUid,
  );
}

function getServingRatio(
  entry: Record<string, unknown>,
  mlPerServing: number,
) {
  const servings = Number(entry.servings ?? 0);
  if (entry.unit === "cup" && Number.isFinite(servings) && servings > 0) {
    return servings;
  }

  const totalMl = Number(entry.totalMl ?? 0);
  if (Number.isFinite(totalMl) && totalMl > 0 && mlPerServing > 0) {
    return totalMl / mlPerServing;
  }

  return 0;
}

async function recalculateRecipeEntryCalories(
  recipeId: string,
  calorieKcalPerServing: number,
  mlPerServing: number,
  uid: string,
) {
  const calories = Math.max(0, Number(calorieKcalPerServing) || 0);
  const servingMl = Math.max(1, Number(mlPerServing) || 1);
  const entriesQuery = query(
    collection(db, "users", uid, "entries"),
    where("drinkId", "==", recipeId),
  );
  const snapshot = await getDocs(entriesQuery);

  for (let i = 0; i < snapshot.docs.length; i += 450) {
    const batch = writeBatch(db);

    snapshot.docs.slice(i, i + 450).forEach((entryDoc) => {
      const entry = entryDoc.data() as Record<string, unknown>;
      const servingRatio = getServingRatio(entry, servingMl);

      batch.update(entryDoc.ref, {
        calorieKcalPerServing: calories,
        totalCalorieKcal: Math.round(calories * servingRatio),
        updatedAt: serverTimestamp(),
      });
    });

    await batch.commit();
  }

  return snapshot.size;
}

export async function createRecipe(
    input: CreateRecipeInput,
    adminUid: string,
) {
    const payload = {
        ...input,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        updatedBy: adminUid,
        source: 'admin',
    };

    const ref = await addDoc(collection(db, 'recipes'), payload);
    return ref.id;
}

export async function saveDrinkIcon(
  recipeId: string,
  imageUri: string,
  iconKey?: string,
  adminUid?: string,
) {
  const { iconUrl, storagePath } = await uploadIconToStorage({
    uri: imageUri,
    folder: 'drink-icons',
    entityId: recipeId,
    fileBaseName: iconKey
  });

  await updateDoc(doc(db, "recipes", recipeId), {
    iconUrl,
    iconStoragePath: storagePath,
    iconUpdatedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...(adminUid ? { updatedBy: adminUid } : {}),
    source: "admin",
  });

  return iconUrl;
}

export async function saveIngredientIcon(
  recipeId: string,
  imageUri: string,
  iconKey?: string,
  adminUid?: string,
) {
  const { iconUrl, storagePath } = await uploadIconToStorage({
    uri: imageUri,
    folder: 'ingredient-icons',
    entityId: recipeId,
    fileBaseName: iconKey,
  });

  await updateDoc(doc(db, "recipes", recipeId), {
    ingredientIconUrl: iconUrl,
    ingredientIconStoragePath: storagePath,
    ingredientIconUpdatedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...(adminUid ? { updatedBy: adminUid } : {}),
    source: "admin",
  });

  return iconUrl;
}
