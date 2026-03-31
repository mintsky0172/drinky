import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { ReportDoc, ReportType } from "../../types/admin";
import { db } from "../firebase";

type SubmitReportInput = {
    type: ReportType;
    brand?: string;
    drinkName?: string;
    title: string;
    message: string;
    createdBy: string;
    createdByNickname?: string;
}

export async function submitReport(input: SubmitReportInput) {
    const payload: ReportDoc = {
        type: input.type,
        brand: input.brand ?? '',
        drinkName: input.drinkName ?? '',
        title: input.title,
        message: input.message,
        createdBy: input.createdBy,
        createdByNickname: input.createdByNickname ?? '',
        createdAt: serverTimestamp(),
        status: "open",
        adminMemo: '',
    };

    await addDoc(collection(db, "reports"), payload);
}