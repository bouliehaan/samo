import { useEffect, useRef, type ReactNode } from 'react';
import {
    ActivityIndicator,
    Animated,
    Modal,
    Pressable,
    ScrollView,
    Text,
    View,
} from 'react-native';

import { type MobileContentSource } from '@samo/core/mobile';

import { ArtworkImage } from './ArtworkImage';
import { type MediaContextMenuTarget } from '../contexts/media-context-menu';
import { triggerImpact } from '../services/haptics';
import { styles } from '../theme/styles';
import { colors } from '../theme/tokens';

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
    const opacityAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.92)).current;
    const translateAnim = useRef(new Animated.Value(24)).current;
    const visible = target !== null;

    useEffect(() => {
        if (!visible) {
            return;
        }

        Animated.parallel([
            Animated.timing(opacityAnim, {
                duration: 140,
                toValue: 1,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                bounciness: 7,
                speed: 22,
                toValue: 1,
                useNativeDriver: true,
            }),
            Animated.spring(translateAnim, {
                bounciness: 7,
                speed: 22,
                toValue: 0,
                useNativeDriver: true,
            }),
        ]).start();

        return () => {
            opacityAnim.setValue(0);
            scaleAnim.setValue(0.92);
            translateAnim.setValue(24);
        };
    }, [opacityAnim, scaleAnim, translateAnim, visible]);

    return (
        <Modal animationType="none" onRequestClose={onClose} transparent visible={visible}>
            <Animated.View style={[styles.mediaContextBackdrop, { opacity: opacityAnim }]}>
                <Pressable onPress={onClose} style={styles.mediaContextBackdropPress} />
                <Animated.View
                    style={[
                        styles.mediaContextSheet,
                        {
                            opacity: opacityAnim,
                            transform: [{ scale: scaleAnim }, { translateY: translateAnim }],
                        },
                    ]}
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
                                        index === actions.length - 1 &&
                                            styles.mediaContextActionRowLast,
                                    ]}
                                >
                                    <View style={styles.mediaContextActionIcon}>
                                        {action.icon ?? null}
                                    </View>
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
                    {feedback ? (
                        <Text style={styles.mediaContextFeedback}>{feedback}</Text>
                    ) : null}
                </Animated.View>
            </Animated.View>
        </Modal>
    );
};

