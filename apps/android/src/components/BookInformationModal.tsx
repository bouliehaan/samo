import { useRef } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { ArtworkImage } from './ArtworkImage';
import { MotionSheet } from './MotionSheet';
import { styles } from '../theme/styles';
import { colors } from '../theme/tokens';
import { type BookInfoState } from '../types/book-info';

export const BookInformationModal = ({
    onClose,
    state,
}: {
    onClose: () => void;
    state: BookInfoState;
}) => {
    // Same reason as StreamInfoModal: `state` flips to idle on dismissal, and
    // bailing on idle is what stopped the sheet from ever animating out.
    const lastShownRef = useRef(state.status === 'idle' ? null : state);
    if (state.status !== 'idle') {
        lastShownRef.current = state;
    }
    const shown = state.status === 'idle' ? lastShownRef.current : state;

    if (!shown) {
        return null;
    }

    const variant = shown.variant;
    const fallbackItem = shown.item;
    const detail = shown.status === 'loaded' ? shown.detail : null;
    const title = detail?.title ?? fallbackItem.title;
    const subtitle = detail?.subtitle ?? fallbackItem.subtitle;
    const artworkUrl = detail?.artworkUrl ?? fallbackItem.artworkUrl;
    const artworkImageId = detail?.artworkImageId ?? fallbackItem.artworkImageId;
    const contentSource = detail?.source ?? fallbackItem.source;
    const metadataLines = detail?.metadataLines ?? [];
    const description = detail?.biography;
    const eyebrow = variant === 'audiobook' ? 'About the book' : 'About the podcast';

    return (
        <MotionSheet
            backdropStyle={styles.bookInfoBackdrop}
            onRequestClose={onClose}
            sheetStyle={styles.bookInfoSheet}
            variant="bottom"
            visible={state.status !== 'idle'}
        >
            <ScrollView
                bounces={false}
                contentContainerStyle={styles.bookInfoScrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.bookInfoArtworkWrap}>
                    <ArtworkImage
                        artworkImageId={artworkImageId}
                        contentSource={contentSource}
                        fallbackStyle={styles.bookInfoArtworkFallback}
                        letter={title.slice(0, 1)}
                        style={styles.bookInfoArtwork}
                        uri={artworkUrl}
                    />
                </View>
                <Text style={styles.bookInfoEyebrow}>{eyebrow}</Text>
                <Text style={styles.bookInfoTitle}>{title}</Text>
                {subtitle ? <Text style={styles.bookInfoAuthor}>{subtitle}</Text> : null}
                {shown.status === 'loading' ? (
                    <View style={styles.bookInfoLoading}>
                        <ActivityIndicator color={colors.accent} />
                    </View>
                ) : shown.status === 'error' ? (
                    <Text style={styles.bookInfoError}>{shown.message}</Text>
                ) : (
                    <>
                        {metadataLines.length > 0 ? (
                            <View style={styles.bookInfoMetadata}>
                                {metadataLines.map((line, index) => (
                                    <Text
                                        key={`${line}:${index}`}
                                        style={styles.bookInfoMetadataLine}
                                    >
                                        {line}
                                    </Text>
                                ))}
                            </View>
                        ) : null}
                        {description ? (
                            <>
                                <Text style={styles.bookInfoSectionTitle}>Description</Text>
                                <Text style={styles.bookInfoDescription}>{description}</Text>
                            </>
                        ) : metadataLines.length === 0 ? (
                            <Text style={styles.bookInfoEmpty}>
                                No additional information available from the server.
                            </Text>
                        ) : null}
                    </>
                )}
            </ScrollView>
            <Pressable
                accessibilityRole="button"
                onPress={onClose}
                style={styles.bookInfoCloseButton}
            >
                <Text style={styles.bookInfoCloseLabel}>Done</Text>
            </Pressable>
        </MotionSheet>
    );
};
