import { type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { type MobileContentSource } from '@samo/core/mobile';

import { ArtworkImage } from './ArtworkImage';
import { MotionSheet } from './MotionSheet';
import { type MediaContextMenuTarget } from '../contexts/media-context-menu';
import { triggerImpact } from '../services/haptics';
import { styles } from '../theme/styles';

export interface MediaContextMenuAction {
    destructive?: boolean;
    icon?: ReactNode;
    id: string;
    label: string;
    onPress: () => void;
}

export const MediaContextMenu = ({
    actions,
    artworkImageId,
    artworkUrl,
    contentSource,
    eyebrow,
    feedback,
    isCircularArtwork,
    onClose,
    subtitle,
    target,
    title,
}: {
    actions: MediaContextMenuAction[];
    artworkImageId?: string;
    artworkUrl?: string;
    contentSource?: MobileContentSource;
    eyebrow: string;
    feedback: string | null;
    isCircularArtwork?: boolean;
    onClose: () => void;
    subtitle?: string;
    target: MediaContextMenuTarget | null;
    title: string;
}) => {
    // Was three hand-rolled legacy `Animated` values with their own spring
    // constants, and — because the old code bailed early when not visible — no
    // exit at all: the menu vanished on dismissal. MotionSheet carries both
    // directions on the app's shared physics.
    return (
        <MotionSheet
            backdropStyle={styles.mediaContextBackdrop}
            onRequestClose={onClose}
            sheetStyle={styles.mediaContextSheet}
            variant="bottom"
            visible={target !== null}
        >
            <View style={styles.mediaContextHeaderRow}>
                <ArtworkImage
                    artworkImageId={artworkImageId}
                    contentSource={contentSource}
                    fallbackStyle={[
                        styles.mediaContextArtworkFallback,
                        isCircularArtwork && styles.mediaContextArtworkRound,
                    ]}
                    letter={title.slice(0, 1)}
                    style={[
                        styles.mediaContextArtwork,
                        isCircularArtwork && styles.mediaContextArtworkRound,
                    ]}
                    uri={artworkUrl}
                />
                <View style={styles.mediaContextHeaderText}>
                    <Text style={styles.mediaContextEyebrow}>{eyebrow}</Text>
                    <Text numberOfLines={1} style={styles.mediaContextTitle}>
                        {title}
                    </Text>
                    {subtitle ? (
                        <Text numberOfLines={1} style={styles.mediaContextSubtitle}>
                            {subtitle}
                        </Text>
                    ) : null}
                </View>
            </View>
            <View style={styles.mediaContextDivider} />
            <View style={styles.mediaContextActions}>
                {actions.length === 0 ? (
                    <Text style={styles.mediaContextEmpty}>No actions available.</Text>
                ) : (
                    actions.map((action, index) => (
                        <Pressable
                            accessibilityRole="button"
                            android_ripple={{
                                borderless: false,
                                color: 'rgba(255, 255, 255, 0.06)',
                            }}
                            key={action.id}
                            onPress={() => {
                                triggerImpact('light');
                                action.onPress();
                            }}
                            style={[
                                styles.mediaContextActionRow,
                                index === actions.length - 1 && styles.mediaContextActionRowLast,
                            ]}
                        >
                            <View style={styles.mediaContextActionIcon}>{action.icon ?? null}</View>
                            <Text
                                numberOfLines={1}
                                style={[
                                    styles.mediaContextActionLabel,
                                    action.destructive && styles.mediaContextActionDestructive,
                                ]}
                            >
                                {action.label}
                            </Text>
                        </Pressable>
                    ))
                )}
            </View>
            {feedback ? <Text style={styles.mediaContextFeedback}>{feedback}</Text> : null}
        </MotionSheet>
    );
};
