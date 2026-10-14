import { useLocalSearchParams } from "expo-router";
import ToppingFormScreen from "@/src/screens/admin/ToppingFormScreen";

export default function ToppingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const toppingId = Array.isArray(id) ? id[0] : id;
  return <ToppingFormScreen key={toppingId} toppingId={toppingId} />;
}
