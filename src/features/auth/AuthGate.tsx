import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { auth, db } from "../../lib/firebase";

type RouteState = "LOADING" | "AUTH" | "NICKNAME" | "APP";

export function useAuthGate(){
    const [route, setRoute] = useState<RouteState>("LOADING");

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async(user) => {
            console.log('auth user: ', user?.uid)
            if(!user) {
                setRoute('AUTH');
                return;
            }

            try {
                // Firestore users/{uid} 문서 확인
                const ref = doc(db, "users", user.uid);
                const snap = await getDoc(ref);

                const nickname = snap.exists() ? (snap.data()?.nickname as string | undefined) : undefined;
                const normalizedNickname = nickname?.trim();

                if(!normalizedNickname || normalizedNickname === "닉네임입니다") setRoute('NICKNAME');
                else setRoute('APP');
            } catch {
                // 권한/네트워크 이슈 시에도 첫 진입을 막지 않도록 닉네임 화면으로 유도
                setRoute('NICKNAME');
            }

        })

        return () => unsub();
    }, []);

    return route;
}
