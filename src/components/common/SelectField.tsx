import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import React, { useState } from "react";
import AppText from "../ui/AppText";
import { COLORS } from "@/src/constants/colors";

type Props<T extends string> = {
  label: string;
  value: T;
  options: readonly { label: string; value: T }[];
  onChange: (value: T) => void;
};

export default function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: Props<T>) {
  const [open, setOpen] = useState(false);

  return (
    <View style={{ marginBottom: 12 }}>
      <AppText preset="caption">{label}</AppText>
      <Pressable style={styles.field} onPress={() => setOpen(true)}>
        <AppText>{options.find((o) => o.value === value)?.label} ▾</AppText>
      </Pressable>
      <Modal transparent visible={open} onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setOpen(false)}
          />
          <View style={styles.menu}>
            {options.map((option) => (
              <Pressable
                key={option.value}
                style={styles.field}
                onPress={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                <AppText>
                  {option.label}
                  {option.value === value ? " ✔︎" : ""}{" "}
                </AppText>
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    minHeight: 46,
    justifyContent: "center",
    padding: 12,
    marginTop: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.ui.border,
    backgroundColor: COLORS.semantic.surface,
  },
  overlay: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: COLORS.ui.overlayBrown40,
  },
  menu: {
    padding: 12,
    borderRadius: 16,
    backgroundColor: COLORS.semantic.surface,
  },
});
