import { getItemQualityProfile, MobileHomeItemType } from '@samo/core/mobile';
import { type ServerAuthenticationResult } from '@samo/core/server';
import { memo, useMemo } from 'react';
import { Text, View } from 'react-native';

import { ArtworkImage } from '../../components/ArtworkImage';
import { PressableScale } from '../../components/PressableScale';
import { TrackDownloadedGlyph } from '../../components/Glyphs';
import { QualityBadge } from '../../components/QualityBadge';
import {
    useDownloadedCollectionKeys,
    useDownloadedTrackKeys,
} from '../../contexts/downloaded-keys';
import { useMediaContextMenu } from '../../contexts/media-context-menu';
import { type AndroidRecentContentSourceItem } from '../../services/recent-content';
import { presses } from '../../theme/motion';
import { styles } from '../../theme/styles';
import { type HomeDisplaySection } from '../../types/home';
import { type LibraryMediaType } from '../../types/library-display';
import {
    getDownloadedCollectionKey,
    getDownloadedTrackKey,
} from '../../utils/download-keys';
import { getContentItemProgress } from '../../utils/home-display';
import { getLibraryMediaType } from '../../utils/library-display';
import { androidTrimCaptionFont, getHomeItemSubtitle } from './shared';

interface HomeMediaTileProps {
    allowRemoveFromHome?: boolean;
    item: AndroidRecentContentSourceItem;
    onPrefetchItem?: (item: AndroidRecentContentSourceItem) => void;
    onSelectItem: (item: AndroidRecentContentSourceItem) => void;
    sectionVariant: HomeDisplaySection['variant'];
    serverConnection: ServerAuthenticationResult | null;
}

const isDownloadableCollectionMediaType = (mediaType: LibraryMediaType | undefined): boolean =>
    mediaType === 'albums' ||
    mediaType === 'audiobooks' ||
    mediaType === 'playlists' ||
    mediaType === 'podcasts';

export const HomeMediaTile = memo(({
    allowRemoveFromHome,
    item,
    onPrefetchItem,
    onSelectItem,
    sectionVariant,
    serverConnection,
}: HomeMediaTileProps) => {
    const contextMenu = useMediaContextMenu();
    const downloadedCollectionKeys = useDownloadedCollectionKeys();
    const downloadedTrackKeys = useDownloadedTrackKeys();

    const isAlbum = sectionVariant === 'album';
    const isArtist = sectionVariant === 'artist';
    const isBook = sectionVariant === 'book';
    const isContinue = sectionVariant === 'continue';
    const isPlaylist = sectionVariant === 'playlist';
    const isPodcast = sectionVariant === 'podcast' || sectionVariant === 'podcast-feed';
    const isRadioSection = sectionVariant === 'radio';
    const isRecent = sectionVariant === 'recents';
    // 'explo' never reaches a tile — that shelf is a single full-width hero
    // (HomeExploreHero), not a carousel.
    const isWide = sectionVariant === 'wide' || isContinue;
    const isRadio = item.type === MobileHomeItemType.RADIO;
    const mediaType = getLibraryMediaType(item);
    // An artist tile rendered inside a Recents/mixed row must still
    // be circular — never a square with a letter.
    const isArtistItem = item.type === MobileHomeItemType.ARTIST;
    const progress = getContentItemProgress(item);
    const subtitle = getHomeItemSubtitle(item, sectionVariant);
    const isDownloadedTrack =
        mediaType === 'songs' &&
        downloadedTrackKeys.has(getDownloadedTrackKey(item.source?.id, item.id));
    const isDownloadedCollection =
        isDownloadableCollectionMediaType(mediaType) &&
        downloadedCollectionKeys.has(getDownloadedCollectionKey(item.source?.id, item.id));
    const isDownloaded = isDownloadedTrack || isDownloadedCollection;
    // Playlists are never a single quality, so per the UX rule we
    // suppress the format badge on playlist tiles even when the
    // item happens to carry an isHiRes flag from an older path.
    const tileBadgeProfile =
        item.type === MobileHomeItemType.PLAYLIST ? undefined : getItemQualityProfile(item);
    // THE STYLE ARRAYS ARE MEMOISED BECAUSE THIS TILE IS RECYCLED, NOT REMOUNTED.
    //
    // A FlashList cell scrolling past hands the same tile instance a new `item`,
    // and everything these three arrays actually depend on — the shelf's variant
    // and the item's kind — is the same for every item in a shelf. Rebuilt inline
    // they were a fresh array identity on every recycle, so React Native re-
    // flattened and re-diffed ~33 style entries per tile against a result that
    // had not changed. Memoised, the recycle sends no style update at all.
    const tileStyle = useMemo(
        () => [
            styles.mediaTile,
            isAlbum && styles.mediaTileAlbum,
            isArtist && styles.mediaTileArtist,
            isRecent && styles.mediaTileCompact,
            isRadioSection && styles.mediaTileGrid,
            isWide && styles.mediaTileWide,
            isContinue && styles.mediaTileContinue,
            isBook && styles.mediaTileBook,
            isPlaylist && styles.mediaTilePlaylist,
            isPodcast && styles.mediaTilePodcast,
        ],
        [isAlbum, isArtist, isBook, isContinue, isPlaylist, isPodcast, isRadioSection, isRecent, isWide],
    );
    const artworkStyle = useMemo(
        () => [
            styles.mediaArtwork,
            isAlbum && styles.mediaArtworkAlbum,
            isArtist && styles.mediaArtworkArtist,
            isRecent && styles.mediaArtworkCompact,
            isRadioSection && styles.mediaArtworkGrid,
            isWide && styles.mediaArtworkWide,
            isBook && styles.mediaArtworkBook,
            isPlaylist && styles.mediaArtworkPlaylist,
            isPodcast && styles.mediaArtworkPodcast,
            isRadio && styles.mediaArtworkRadio,
            isArtistItem && styles.libraryArtworkRound,
        ],
        [isAlbum, isArtist, isArtistItem, isBook, isPlaylist, isPodcast, isRadio, isRadioSection, isRecent, isWide],
    );
    const fallbackStyle = useMemo(
        () => [
            styles.mediaArtworkFallback,
            isAlbum && styles.mediaArtworkAlbum,
            isArtist && styles.mediaArtworkArtist,
            isRecent && styles.mediaArtworkCompact,
            isRadioSection && styles.mediaArtworkGrid,
            isWide && styles.mediaArtworkWide,
            isBook && styles.mediaArtworkBook,
            isPlaylist && styles.mediaArtworkPlaylist,
            isPodcast && styles.mediaArtworkPodcast,
            isRadio && styles.mediaArtworkRadio,
            isArtistItem && styles.libraryArtworkRound,
        ],
        [isAlbum, isArtist, isArtistItem, isBook, isPlaylist, isPodcast, isRadio, isRadioSection, isRecent, isWide],
    );

    return (
        <PressableScale
            {...presses.tile}
            accessibilityRole="button"
            onLongPress={() => contextMenu.openForItem(item, { allowRemoveFromHome })}
            onPress={() => onSelectItem(item)}
            onPressIn={() => onPrefetchItem?.(item)}
            style={tileStyle}
        >
            <ArtworkImage
                artworkImageId={item.artworkImageId}
                contentSource={item.source}
                fallbackStyle={fallbackStyle}
                letter={item.title.slice(0, 1)}
                serverConnection={serverConnection}
                style={artworkStyle}
                uri={item.artworkUrl}
            />
            <View style={[styles.tileMetaRow, isWide && styles.tileMetaRowFill]}>
                <View
                    style={[
                        styles.mediaText,
                        styles.tileMetaTextCol,
                        isWide && styles.mediaTextWide,
                        isArtist && styles.mediaTextCentered,
                    ]}
                >
                    <Text
                        numberOfLines={isRecent ? 1 : 2}
                        style={[
                            styles.mediaTitle,
                            (isArtist || isRadioSection) && styles.mediaTitleCentered,
                            isWide && styles.mediaTitleWide,
                        ]}
                        {...androidTrimCaptionFont}
                    >
                        {item.title}
                    </Text>
                    {subtitle || isDownloaded ? (
                        <View
                            style={[
                                styles.mediaInfoRow,
                                isArtist && styles.mediaInfoRowCentered,
                            ]}
                        >
                            {isDownloaded ? (
                                <View style={styles.mediaDownloadIndicator}>
                                    <TrackDownloadedGlyph size={11} />
                                </View>
                            ) : null}
                            {subtitle ? (
                                <Text
                                    numberOfLines={isWide ? 2 : 1}
                                    style={[
                                        styles.mediaSubtitle,
                                        styles.mediaSubtitleInline,
                                        isArtist && styles.mediaSubtitleCentered,
                                        androidTrimCaptionFont,
                                    ]}
                                >
                                    {subtitle}
                                </Text>
                            ) : null}
                        </View>
                    ) : null}
                    {(isContinue ||
                        (isPodcast && sectionVariant === 'podcast-feed') ||
                        isBook) &&
                    progress !== undefined ? (
                        <View style={styles.continueProgressTrack}>
                            <View
                                style={[
                                    styles.continueProgressFill,
                                    { width: `${progress * 100}%` },
                                ]}
                            />
                        </View>
                    ) : null}
                </View>
                <QualityBadge tile profile={tileBadgeProfile} />
            </View>
        </PressableScale>
    );
});

HomeMediaTile.displayName = 'HomeMediaTile';
