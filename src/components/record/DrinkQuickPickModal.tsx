import { FlatList, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import React from "react";
import { COLORS } from "@/src/constants/colors";
import { TYPOGRAPHY } from "@/src/constants/typography";
import { DRINK_ICONS, DrinkIconKey } from "@/src/constants/icons";
import DrinkIcon from "../common/DrinkIcon";

type Item = { id: string; name: string; drinkIconKey?: DrinkIconKey };

type Props = {
  visible: boolean;
  onClose: () => void;
  frequent: Item[];
  recent: Item[];
  onPick: (item: Item) => void;
};

const DrinkQuickPickModal = ({
  visible,
  onClose,
  frequent,
  recent,
  onPick,
}: Props) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} />

      <View style={styles.panel}>
        <Text style={styles.sectionTitle}>자주 마신 음료</Text>
        <FlatList
          data={frequent}
          keyExtractor={(i) => i.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 10 }}
          renderItem={({ item }) => (
            <Pressable style={styles.chip} onPress={() => onPick(item)}>
              <Text style={styles.chipText}>{item.name}</Text>
            </Pressable>
          )}
        />

        <View style={{ height: 16 }} />

        <Text style={styles.sectionTitle}>최근 검색</Text>
        <FlatList
          data={recent}
          keyExtractor={(i) => i.id}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          renderItem={({ item }) => (
            <Pressable style={styles.row} onPress={() => onPick(item)}>
              <DrinkIcon
                iconKey={
                  item.drinkIconKey && item.drinkIconKey in DRINK_ICONS
                    ? (item.drinkIconKey as DrinkIconKey)
                    : undefined
                }
                size={32}
              />
              <Text style={styles.rowText}>{item.name}</Text>
            </Pressable>
          )}
        />
      </View>
    </Modal>
  );
};

export default DrinkQuickPickModal;

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.ui.overlayBrown40,
  },
  panel: {
    position: "absolute",
    left: 16,
    right: 16,
    top: 130,
    borderRadius: 18,
    padding: 15,
    backgroundColor: COLORS.base.creamPaper,
    borderWidth: 1,
    borderColor: COLORS.ui.border,
  },
  sectionTitle: {
    ...TYPOGRAPHY.preset.h3,
    color: COLORS.semantic.textPrimary,
    marginBottom: 10,
  },
  chip: {
    paddingHorizontal: 12,
    height: 34,
    borderRadius: 999,
    backgroundColor: COLORS.base.warmBeige,
    borderWidth: 1,
    borderColor: COLORS.ui.border,
    alignItems: "center",
    justifyContent: "center",
  },
  chipText: { ...TYPOGRAPHY.preset.body, color: COLORS.semantic.textPrimary },
  row: {
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: "center",
    gap: 10,
  },
  rowText: { ...TYPOGRAPHY.preset.body, color: COLORS.semantic.textPrimary },
  sep: { height: 1, backgroundColor: COLORS.ui.border },
});
