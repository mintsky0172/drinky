import { Pressable, StyleSheet, Text, View } from 'react-native'
import React from 'react'
import TextField from '../ui/TextField';
import { COLORS } from '@/src/constants/colors';
import { TYPOGRAPHY } from '@/src/constants/typography';

type Props = {
    icon: React.ReactNode;
    oneLine: string;
    onPressIcon: () => void;
    onChangeOneLine: (text: string) => void;
    onSubmitOneLine?: () => void;
}

const TodayMemoCard = ({
    icon,
    oneLine,
    onPressIcon,
    onChangeOneLine,
    onSubmitOneLine,
}: Props) => {
  return (
    <>
    <Text style={styles.label}>오늘의 한 줄</Text>
    <View style={styles.card}>
        
     <Pressable onPress={onPressIcon} style={styles.iconWrap} hitSlop={10}>
        <View style={styles.iconCircle}>{icon}</View>
        <Text style={styles.iconHint}>대표</Text>
    </Pressable>

    <View style={styles.right}>
        
        <TextField
            value={oneLine}
            onChangeText={onChangeOneLine}
            placeholder="어떤 하루였나요?"
            placeholderTextColor={COLORS.semantic.textMuted}
            style={styles.input}
            multiline
            maxLength={100}
            returnKeyType="done"
            onSubmitEditing={onSubmitOneLine}
        />
    </View>
    </View>
    </>
  )
}

export default TodayMemoCard

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingVertical: 14,
        paddingHorizontal: 20,
    

    },
    iconWrap: { alignItems: 'center', width: 72},
    iconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: COLORS.semantic.surfaceAlt,
        borderWidth: 1,
        borderColor: COLORS.ui.border,
        alignItems: 'center',
        justifyContent: 'center'
    },
    iconHint: {
        marginTop: 6,
        ...TYPOGRAPHY.preset.caption,
        color: COLORS.semantic.textMuted,
    },
    right: { flex: 1 },
    label: {
        ...TYPOGRAPHY.preset.h3,
        color: COLORS.semantic.textPrimary,
        paddingHorizontal: 20,
        marginTop: 18,
        marginBottom: 10
    },
    input: {
        ...TYPOGRAPHY.preset.body,
        color: COLORS.semantic.textPrimary,
        paddingVertical: 15,
        minHeight: 80,

    }
})
