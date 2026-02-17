import { Slot } from "expo-router";
import Toast, { BaseToast, ErrorToast } from "react-native-toast-message";
import { COLORS } from "@/src/constants/colors";

const toastConfig = {
  success: (props: any) => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: COLORS.semantic.primary,
        backgrundColor: COLORS.base.creamPaper,
        padding: 12,
      }}
      contentContainerStyle={{ paddingHorizontal: 12 }}
      text1Style={{
        fontSize: 16,
        fontWeight: "600",
        color: COLORS.semantic.textPrimary,
        fontFamily: "Iseoyun",
      }}
      text2Style={{
        fontSize: 14,
        color: COLORS.semantic.textSecondary,
        fontFamily: "Iseoyun",
      }}
    />
  ),
  error: (props: any) => (
    <ErrorToast
      {...props}
      style={{
        borderLeftColor: "#D96C6C",
        backgroundColor: COLORS.base.creamPaper,
      }}
      text1Style={{
        fontSize: 16,
        fontWeight: "600",
        fontFamily: "Iseoyun",
      }}
    />
  ),
};

export default function RootLayout() {
  return (
    <>
      <Slot />
      <Toast config={toastConfig} />
    </>
  );
}
