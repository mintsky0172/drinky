import { Pressable, StyleSheet, Text, View, Modal, FlatList } from 'react-native'
import React from 'react'
import { IngredientIconKey, INGREDIENT_ICONS } from '@/src/constants/icons';
import IngredientIcon from '../common/IngredientIcon';
import { COLORS } from '@/src/constants/colors';
import { TYPOGRAPHY } from '@/src/constants/typography';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = {
    visible: boolean;
    selectedKey: IngredientIconKey;
    onSelect: (key: IngredientIconKey) => void;
    onClose: () => void;
    onResetToDefault?: () => void; // 선택 : 덮어쓰기 해제용
};

const ICON_KEYS: IngredientIconKey[] = Object.keys(INGREDIENT_ICONS) as IngredientIconKey[];

const IconPickerModal = ({
    visible,
    selectedKey,
    onSelect,
    onClose,
    onResetToDefault,
}: Props) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} />

      <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
        <View style={styles.sheet}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>대표 아이콘 선택</Text>

            <Pressable onPress={onClose} hitSlop={10}>
              <Text style={styles.closeText}>닫기</Text>
            </Pressable>
          </View>

          <Text style={styles.subTitle}>오늘을 가장 잘 나타내는 아이콘은 무엇인가요?</Text>

          <FlatList
            data={ICON_KEYS}
            keyExtractor={(k) => k}
            numColumns={4}
            style={styles.gridList}
            contentContainerStyle={styles.grid}
            showsVerticalScrollIndicator={false}
            renderItem={({ item}) => {
              const isSelected = item === selectedKey;
              return (
                <Pressable
                  onPress={() => onSelect(item)}
                  style={[styles.cell, isSelected && styles.cellSelected]}
                >
                  <View style={styles.iconCircle}>
                    <IngredientIcon iconKey={item} size={34} />
                  </View>
                </Pressable>
              )
            }}
          />

          {onResetToDefault && (
            <Pressable style={styles.resetBtn} onPress={onResetToDefault}>
              <Text style={styles.resetText}>자동(기본)으로 되돌리기</Text>
            </Pressable>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}


export default IconPickerModal

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: COLORS.ui.overlayBrown40
    },
    safeArea: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: "flex-end",
    },
    sheet: {
        marginHorizontal: 16,
        marginBottom: 12,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 12,
        borderWidth: 1,
        borderColor: COLORS.ui.border,
        backgroundColor: COLORS.base.warmBeige,
        maxHeight: "78%",
    },
    gridList: {
        flexGrow: 0,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    title: {
        ...TYPOGRAPHY.preset.h3,
        color: COLORS.semantic.textPrimary,
    },
    closeText: {
        ...TYPOGRAPHY.preset.body,
        color: COLORS.semantic.textSecondary,
    },
    subTitle: {
        ...TYPOGRAPHY.preset.caption,
        color: COLORS.semantic.textSecondary,
        marginTop: 6,
        marginBottom: 12,
    },
    grid: {
        paddingBottom: 8,
    },
    cell: {
        width: '25%',
        alignItems: 'center',
        paddingVertical: 10,
    },
    cellSelected: {
        backgroundColor: COLORS.ui.border,
        borderRadius: 20,
    },
    iconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        borderWidth: 1,
        borderColor: COLORS.ui.border,
        backgroundColor: COLORS.base.creamPaper,
        alignItems: 'center',
        justifyContent: 'center',
    },
    icon: {
        width: 34,
        height: 34,
    },
    resetBtn: {
        marginTop: 6,
        height: 44,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: COLORS.ui.border,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.base.creamPaper,
    },
    resetText: {
        ...TYPOGRAPHY.preset.body,
        color: COLORS.semantic.textPrimary
    }

})
