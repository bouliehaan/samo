import { StyleSheet } from 'react-native';
import { colors, fonts, spacing } from '../tokens';

/** Downloads screen: groups, rows, storage panel. */
export const downloadStyles = StyleSheet.create({
    downloadActionButton: {
        paddingHorizontal: 8,
        paddingVertical: 6,
    },
    downloadActionDestructive: {
        color: '#ff7a6e',
    },
    downloadActionLabel: {
        color: colors.text,
        fontSize: 11,
        fontWeight: '700',
    },
    downloadGroup: {
        backgroundColor: colors.surface,
        borderRadius: 10,
        marginTop: spacing.sm,
        padding: spacing.sm,
    },
    downloadGroupArtwork: {
        backgroundColor: '#2a2a2c',
        borderRadius: 6,
        height: 40,
        width: 40,
    },
    downloadGroupArtworkFallback: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    downloadGroupHeader: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: 10,
        marginBottom: 6,
    },
    downloadGroupSubtitle: {
        color: colors.muted,
        fontSize: 11,
        fontFamily: fonts.mono,
        fontWeight: '600',
        textTransform: 'capitalize',
    },
    downloadGroupText: {
        flex: 1,
    },
    downloadGroupTitle: {
        color: colors.text,
        fontSize: 14,
        fontWeight: '800',
    },
    downloadProgressFill: {
        backgroundColor: colors.accent,
        height: 3,
    },
    downloadProgressTrack: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 2,
        height: 3,
        marginTop: 4,
        overflow: 'hidden',
    },
    downloadRow: {
        alignItems: 'center',
        flexDirection: 'row',
        paddingVertical: 8,
    },
    downloadRowActions: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: 4,
    },
    downloadRowStatus: {
        color: colors.muted,
        fontSize: 11,
        marginTop: 2,
    },
    downloadRowText: {
        flex: 1,
    },
    downloadRowTitle: {
        color: colors.text,
        fontSize: 13,
        fontWeight: '700',
    },
    downloadsStorageActions: {
        flexWrap: 'wrap',
        flexDirection: 'row',
        gap: spacing.sm,
        marginTop: spacing.sm,
    },
    downloadsStorageButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        borderColor: 'rgba(255, 255, 255, 0.12)',
        borderRadius: 8,
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    downloadsStorageButtonLabel: {
        color: colors.text,
        fontSize: 12,
        fontWeight: '700',
    },
    downloadsStorageLabel: {
        color: colors.accent,
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    downloadsStorageNote: {
        color: colors.muted,
        fontSize: 11,
        marginTop: 6,
    },
    downloadsStorageRow: {
        backgroundColor: colors.surface,
        borderRadius: 10,
        marginBottom: spacing.md,
        padding: spacing.md,
    },
    downloadsStorageValue: {
        color: colors.text,
        fontSize: 13,
        fontWeight: '700',
        marginTop: 4,
    },
    downloadsClearAllButton: {
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(255, 69, 58, 0.10)',
        borderColor: 'rgba(255, 69, 58, 0.28)',
        borderRadius: 8,
        borderWidth: 1,
        marginBottom: spacing.md,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    downloadsSummary: {
        color: colors.muted,
        fontSize: 13,
        lineHeight: 18,
        marginBottom: spacing.md,
        marginTop: spacing.xs,
    },
});
