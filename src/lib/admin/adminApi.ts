import {
  arrayUnion,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { InquiryDoc, ReportDoc } from "@/src/types/admin";

export async function getUserRole(uid: string) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) return "user";

  const data = snap.data();

  return data.role ?? "user";
}

export async function getAdminMeta(uid: string) {
    const ref = doc(db, 'users', uid);
    const snap = await getDoc(ref);

    if(!snap.exists()) return null;

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

export async function hideRecipe(recipeId: string, adminUid: string) {
  const ref = doc(db, "recipes", recipeId);

  await updateDoc(ref, {
    isPublic: false,
    updatedAt: serverTimestamp(),
    updatedBy: adminUid,
    source: "admin",
  });
}

export async function unhideRecipe(recipeId: string, adminUid: string) {
  const ref = doc(db, "recipes", recipeId);

  await updateDoc(ref, {
    isPublic: true,
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
