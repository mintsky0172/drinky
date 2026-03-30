import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { InquiryDoc } from "@/src/types/admin";


type SubmitInquiryInput = {
    subject: string;
    message: string;
    createdBy: string;
    createdByNickName: string;
    email: string;
};

export async function submitInquiry(input: SubmitInquiryInput) {
    const payload: InquiryDoc = {
        subject: input.subject,
        message: input.message,
        createdBy: input.createdBy,
        createdByNickName: input.createdByNickName ?? '',
        createdAt: serverTimestamp(),
        status: "open",
        adminMemo: '',
        email: input.email ?? ''
    };

    await addDoc(collection(db, "inquiries"), payload);
    }