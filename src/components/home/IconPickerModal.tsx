import { Pressable, StyleSheet, Text, View, Modal, FlatList } from 'react-native'
import React from 'react'
import { IconKey, ICONS } from '@/src/constants/icons';
import DrinkIcon from '../common/DrinkIcon';
import { COLORS } from '@/src/constants/colors';
import { TYPOGRAPHY } from '@/src/constants/typography';

type Props = {
    visible: boolean;
    selectedKey: IconKey;
    onSelect: (key: IconKey) => void;
    onClose: () => void;
    onResetToDefault?: () => void; // 선택 : 덮어쓰기 해제용
};

const ICON_KEYS: IconKey[] = Object.keys(ICONS) as IconKey[];

const IconPickerModal = ({
    visible,
    selectedKey,
    onSelect,
    onClose,
    onResetToDefault,
}: Props) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        {/* 오버레이 */}
        <Pressable style={styles.overlay} onPress={onClose} />

        {/* 아래쪽 패널 */}
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
                contentContainerStyle={styles.grid}
                renderItem={({ item}) => {
                    const isSelected = item === selectedKey;
                    return (
                        <Pressable
                            onPress={() => onSelect(item)}
                            style={[styles.cell, isSelected && styles.cellSelected]}
                        >
                            <View style={styles.iconCircle}>
                                <DrinkIcon iconKey={item} size={34} />
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
    </Modal>
  );
}


export default IconPickerModal

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: COLORS.ui.overlayBrown40
    },
    sheet: {
        position: 'absolute',
        left: 16,
        right: 16,
        bottom: 18,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 12,
        borderWidth: 1,
        borderColor: COLORS.ui.border,
        backgroundColor: COLORS.base.warmBeige,
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
