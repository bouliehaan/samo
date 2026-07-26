import { StyleSheet } from 'react-native';
import { colors, fonts, spacing } from '../tokens';

/** Settings + server management screens. */
export const settingsStyles = StyleSheet.create({
    connectedServers: {
        gap: spacing.sm,
        marginTop: spacing.md,
    },
    settingsRoot: {
        // No panel background — settings rows sit directly on the app black
        // so they read as separate "blobs" rather than as one slab.
        marginTop: spacing.lg,
    },
    settingsRootTitle: {
        color: colors.text,
        fontSize: 22,
        fontFamily: fonts.heading,
        marginBottom: spacing.md,
    },
    settingsRow: {
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: 14,
        flexDirection: 'row',
        gap: spacing.md,
        marginTop: spacing.sm,
        paddingHorizontal: spacing.md,
        paddingVertical: 14,
    },
    settingsRowSubtitle: {
        color: colors.muted,
        fontSize: 12,
        fontFamily: fonts.mono,
        fontWeight: '600',
    },
    settingsRowText: {
        flex: 1,
    },
    settingsRowTitle: {
        color: colors.text,
        fontSize: 15,
        fontWeight: '800',
        marginBottom: 2,
    },
    settingsSectionLabel: {
        color: colors.muted,
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 0.4,
        marginTop: spacing.lg,
        textTransform: 'uppercase',
    },
});
