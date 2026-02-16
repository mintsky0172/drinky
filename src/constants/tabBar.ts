import { COLORS } from "./colors";
import { TYPOGRAPHY } from "./typography";

export const TAB_BAR = {
    height: 62,
    paddingTop: 8,
    paddingBottom: 10,

    style: {
        backgroundColor: COLORS.base.warmBeige,
        borderTopColor: COLORS.ui.border,
        borderTopWidth: 1,
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