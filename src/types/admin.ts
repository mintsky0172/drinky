export type UserRole = "user" | "admin";

export type ReportType = "new_drink" | "discontinued_drink"

export type ReportStatus = "open" | "reviewing" | "done" | "rejected"

export type InquiryStatus = "open" | "done"

export type ReportDoc = {
    type: ReportType;
    brand?: string;
    drinkName?: string;
    title: string;
    message: string;
    createdBy: string;
    createdByNickname?: string;
    createdAt: any;
    status: ReportStatus;
    adminMemo?: string;
};

export type InquiryDoc ={
    subject: string;
    message: string;
    createdBy: string;
    createdByNickname?: string;
    createdAt: any;
    status: InquiryStatus;
    adminMemo?: string; 
    email: string;
}
