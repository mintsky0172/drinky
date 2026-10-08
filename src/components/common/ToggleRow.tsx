import { StyleSheet, Switch, Text, View } from "react-native";
import React from "react";
import AppText from "../ui/AppText";

type Props = {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
};

const ToggleRow = ({ label, value, onValueChange }: Props) => {
  return (
    <View style={styles.row}>
      <View style={styles.labelWrap}>
        <AppText preset="body" style={styles.label}>
          {label}
        </AppText>
      </View>
      <View style={styles.switchWrap}>
        <Switch value={value} onValueChange={onValueChange} />
      </View>
    </View>
  );
};

export default ToggleRow;

const styles = StyleSheet.create({
  row: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  labelWrap: {
    flex: 1,
    justifyContent: "center",
    marginRight: 12,
    minHeight: 31,
  },
  label: { lineHeight: 20 },
  switchWrap: { height: 31, justifyContent: "center" },
});
