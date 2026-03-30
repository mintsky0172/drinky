import { COLORS } from "./colors";
import { TYPOGRAPHY } from "./typography";

export const TAB_BAR = {
    height: 64,
    paddingTop: 4,
    paddingBottom: 6,

    style: {
        height: 64,
        backgroundColor: COLORS.base.warmBeige,
        borderTopColor: COLORS.ui.border,
        borderTopWidth: 1,
        paddingTop: 4,
        paddingBottom: 6,
    },
    itemStyle: {
        paddingTop: 0,
        paddingBottom: 6,
    },
    labelStyle: {
        ...TYPOGRAPHY.preset.caption,
        fontSize: 11,
        lineHeight: 14,
        letterSpacing: 0.2,
    },
    activeTintColor: COLORS.primary.caramel,
    inactiveTintColor: COLORS.semantic.textMuted,

    iconSize: 22,
} as const;
