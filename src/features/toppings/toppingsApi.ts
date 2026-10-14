import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/src/lib/firebase";
import { Topping } from "../../types/topping";

export async function listVisibleToppings(): Promise<Topping[]> {
  const toppingsQuery = query(
    collection(db, "toppings"),
    where("isVisible", "==", true),
  );

  const snapshot = await getDocs(toppingsQuery);

  const toppings = snapshot.docs.map(
    (docSnap) =>
      ({
        ...docSnap.data(),
        id: docSnap.id,
      }) as Topping,
  );

  return toppings.sort((a, b) => a.name.localeCompare(b.name, "ko"));
}
