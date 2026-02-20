import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import React from 'react'
import { COLORS } from '@/src/constants/colors';
import { TYPOGRAPHY } from '@/src/constants/typography';
import AppButton from '../ui/AppButton';

type Props = {
    visible: boolean;
    onContinue: () => void;
    onGoHome: () => void;
}

const SaveResultModal = ({ visible, onContinue, onGoHome }: Props) => {
  return (
    <Modal visible={visible} transparent animationType='fade'>
        <View style={styles.overlay}>
            <View style={styles.card}>
                <Text style={styles.title}>저장 완료!</Text>
                <Text style={styles.sub}>계속 기록할까요?</Text>

                <View style={styles.btnRow}>
                    <AppButton label="홈으로" variant="secondary" onPress={onGoHome}/>
                    <AppButton label="계속 기록하기" variant="primary" onPress={onContinue} />
                </View>
            </View>
        </View>
    </Modal>
  )
}

export default SaveResultModal

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: COLORS.ui.overlayBrown40,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    card: {
        width: '100%',
        borderRadius: 18,
        padding: 18,
        backgroundColor: COLORS.base.creamPaper,
        borderWidth: 1,
        borderColor: COLORS.ui.border,
    },
    title: { ...TYPOGRAPHY.preset.h2, color: COLORS.semantic.textPrimary, marginBottom : 6},
    sub:  {...TYPOGRAPHY.preset.body, color: COLORS.semantic.textSecondary, marginBottom: 16},
    btnRow: { flexDirection: 'row', gap : 10},
 
})