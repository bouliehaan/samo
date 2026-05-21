import {
    ActivityIndicator,
    Modal,
    Pressable,
    ScrollView,
    Text,
    View,
} from 'react-native';

import { ArtworkImage } from './ArtworkImage';
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
    if (state.status === 'idle') {
        return null;
    }

    const variant = state.variant;
    const fallbackItem = state.item;
    const detail = state.status === 'loaded' ? state.detail : null;
    const title = detail?.title ?? fallbackItem.title;
    const subtitle = detail?.subtitle ?? fallbackItem.subtitle;
    const artworkUrl = detail?.artworkUrl ?? fallbackItem.artworkUrl;
    const metadataLines = detail?.metadataLines ?? [];
    const description = detail?.biography;
    const eyebrow = variant === 'audiobook' ? 'About the book' : 'About the podcast';

    return (
        <Modal animationType="fade" onRequestClose={onClose} transparent visible>
            <Pressable onPress={onClose} style={styles.bookInfoBackdrop}>
                <Pressable
                    onPress={(event) => event.stopPropagation()}
                    style={styles.bookInfoSheet}
                >
                    <ScrollView
                        bounces={false}
                        contentContainerStyle={styles.bookInfoScrollContent}
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={styles.bookInfoArtworkWrap}>
                            <ArtworkImage
                                fallbackStyle={styles.bookInfoArtworkFallback}
                                letter={title.slice(0, 1)}
                                style={styles.bookInfoArtwork}
                                uri={artworkUrl}
                            />
                        </View>
                        <Text style={styles.bookInfoEyebrow}>{eyebrow}</Text>
                        <Text style={styles.bookInfoTitle}>{title}</Text>
                        {subtitle ? (
                            <Text style={styles.bookInfoAuthor}>{subtitle}</Text>
                        ) : null}
                        {state.status === 'loading' ? (
                            <View style={styles.bookInfoLoading}>
                                <ActivityIndicator color={colors.accent} />
                            </View>
                        ) : state.status === 'error' ? (
                            <Text style={styles.bookInfoError}>{state.message}</Text>
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
                                        <Text style={styles.bookInfoSectionTitle}>
                                            Description
                                        </Text>
                                        <Text style={styles.bookInfoDescription}>
                                            {description}
                                        </Text>
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
                </Pressable>
            </Pressable>
        </Modal>
    );
};
