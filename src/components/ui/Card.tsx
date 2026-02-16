import { StyleProp, StyleSheet, Text, View, ViewProps, ViewStyle } from 'react-native'
import React from 'react'
import { COLORS } from '@/src/constants/colors';

type CardProps = ViewProps & {
    variant?: "default" | "soft";
    padding?: number;
    style?: StyleProp<ViewStyle>
}

const Card = ({
    variant = "default",
    padding = 14,
    style,
    ...rest
}: CardProps) => {
    const baseStyle =
        variant === "soft" ? styles.cardSoft : styles.cardDefault;
  return 
    <View {...rest} style={[baseStyle, { padding }, style]} />;
  
}

export default Card

const styles = StyleSheet.create({
    cardDefault: {
        backgroundColor: COLORS.semantic.surface,
        borderColor: COLORS.ui.border,
        borderWidth: 1,
        borderRadius: 16
    },
    cardSoft: {
        backgroundColor: COLORS.base.warmBeige,
        borderColor: COLORS.ui.divider,
        borderWidth: 1,
        borderRadius: 16
    }
})