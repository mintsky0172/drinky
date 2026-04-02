import {
    addDoc,
  arrayUnion,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { InquiryDoc, ReportDoc } from "@/src/types/admin";

export type Recipe = {
  id: string;
  name?: string;
  brand?: string;
  category?: string;
  drinkIconKey?: string;
  calendarIconKey?: string;
  mlPerServing?: number;
  caffeineMgPerServing?: number;
  sugarGPerServing?: number;
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
  calendarIconKey?: string;
  mlPerServing: number;
  caffeineMgPerServing: number;
  sugarGPerServing: number;
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
    calendarIconKey?: string;
    mlPerServing: number;
    caffeineMgPerServing: number;
    sugarGPerServing: number;
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
