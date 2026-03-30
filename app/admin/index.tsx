import { StyleSheet, Text, View } from 'react-native'
import React, { useEffect, useState } from 'react'
import { InquiryDoc, ReportDoc } from '@/src/types/admin';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/providers/AuthProvider';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';

type TabKey = "reports" | "inquiries";

type ReportListItem = ReportDoc & {
    id: string;
};

type InquiryListItem = InquiryDoc & {
    id: string;
}

const AdminScreen = () => {
    const router = useRouter();
    const {user, initializing} = useAuth();

    const [loadingRole, setLoadingRole] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);

    const [tab, setTab] = useState<TabKey>('reports');

    const [reports, setReports] = useState<ReportListItem[]>([]);
    const [inquiries, setInquiries] = useState<InquiryListItem[]>([]);

    useEffect(() => {
        if(initializing) return;
        if(!user) {
            setLoadingRole(false);
            setIsAdmin(false);
            return;
        }

        const run = async () => {
            const role = await getUserRole(user.uid);
            setIsAdmin(role === "admin");
            setLoadingRole(false);
        };

        run();
    }, [user, initializing]);

    useEffect(() => {
        if(!isAdmin) return;

        const reportsRef = collection(db, "reports");
        const reportsQ = query(reportsRef, orderBy("createdAt", "desc"));

        const unsubscribe = onSnapshot(reportsQ, (snapshot) => {
            const next: ReportListItem[] = snapshot.docs.map((docSnap) => {
                const data = docSnap.data() as ReportDoc;
                return {
                    id: docSnap.id,
                    ...data,
                };
            });
            setReports(next);
        });

        return () => unsubscribe();
    }, [isAdmin]);

    useEffect(() => {
        
    })
  return (
    <View>
      <Text>AdminScreen</Text>
    </View>
  )
}

export default AdminScreen

const styles = StyleSheet.create({})