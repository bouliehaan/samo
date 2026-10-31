import { buildAudioQualityBadgeItems } from '@samo/core/audio-quality';
import {
    formatMobileCount,
    getDetailQualityProfile,
    type MobileMediaDetail,
    MobileMediaDetailType,
    type MobileMediaTrack,
} from '@samo/core/mobile';
import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { FlatList, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { ArtworkImage } from '../components/ArtworkImage';
import { MoreGlyph, PlayPauseGlyph, ShuffleGlyph } from '../components/Glyphs';
import { handlePlayMediaTrack, handleShuffleDetailTracks } from '../handlers/playback-handlers';
import { mediaContextMenuApi } from '../hooks/use-android-context-menu';
import { formatTrackDuration, getTrackMetadataItems } from '../player/track-metadata';
import { formatQualityProfile } from '../services/quality-badge-assets';
import { recentContentItemFromMediaDetail } from '../services/recent-content';
import { useAppNavigationSelector } from '../state/app-navigation';
import { useMiniPlayerPlaybackState } from '../state/playback-store';
import { colors } from '../theme/tokens';
import { getDefaultDetailTrackOrder, getDetailTypeLabel } from '../utils/media-detail';
import { playOnTv } from './tv-actions';
import { TvShelf } from './TvCollections';
import { TvButton, TvFocusScope, TvPressable, type TvFocusMemory } from './TvControls';
import { TvFocusGroup } from './TvFocusGroup';
import { didTvFocusArriveUp } from './tv-focus';
import { TV_SCROLL_EDGE, tvStyles as s } from './tv-styles';

/** What a detail's list holds, by the name the list's own kind gives it. */
const getTrackNoun = (type: MobileMediaDetailType, count: number): string =>
    formatMobileCount(
        count,
        type === MobileMediaDetailType.PODCAST
            ? 'episode'
            : type === MobileMediaDetailType.AUDIOBOOK
              ? 'chapter'
              : 'track',
    );

/**
 * The facts under a detail's title, on one line: the phone hero's year,
 * credits and format, plus how much is in it. (An artist's own lines already
 * count its albums and tracks.)
 */
const getDetailFacts = (detail: MobileMediaDetail, trackCount: number): string => {
    const year = detail.year ? String(detail.year) : undefined;
    const format =
        detail.type === MobileMediaDetailType.ALBUM
            ? formatQualityProfile(getDetailQualityProfile(detail))
            : null;
    return [
        year,
        // A book's lines lead with its author, already the subtitle above.
        ...(detail.metadataLines ?? []).filter(
            (line) => line !== year && line !== detail.subtitle,
        ),
        detail.type !== MobileMediaDetailType.ARTIST && trackCount
            ? getTrackNoun(detail.type, trackCount)
            : undefined,
        format,
    ]
        .filter((fact): fact is string => Boolean(fact))
        .join(' · ');
};

/**
 * One row of a detail's list, read the way the phone reads it: an album's
 * track number, or anything else's own cover; the title; the phone's line of
 * artist, album and format (an episode's date and length). Length stands in
 * its own column at the end. A book's chapters read like an album's tracks:
 * on the book's own page, its cover and title on every row say nothing.
 */
const TvTrackRow = memo(function TvTrackRow({
    detail,
    index,
    onPress,
    playing,
    track,
}: {
    detail: MobileMediaDetail;
    index: number;
    onPress: (track: MobileMediaTrack, index: number) => void;
    /** The track the player has now, picked out from across the room. */
    playing: boolean;
    track: MobileMediaTrack;
}) {
    const isAlbum = detail.type === MobileMediaDetailType.ALBUM;
    const isBook = detail.type === MobileMediaDetailType.AUDIOBOOK;
    const isMusic = isAlbum || detail.type === MobileMediaDetailType.PLAYLIST;
    const isEpisode = detail.type === MobileMediaDetailType.PODCAST;
    const quality =
        isMusic && track.playback
            ? buildAudioQualityBadgeItems({
                  ...track.playback.quality,
                  compact: true,
                  mode: 'playerbar',
              }).map((item) => item.label)
            : [];
    const meta = isBook
        ? ''
        : getTrackMetadataItems(detail, track, quality, false, false).join(' · ');
    return (
        <TvPressable
            id={`track:${index}`}
            label={`${track.title}${meta ? `, ${meta}` : ''}`}
            onPress={() => onPress(track, index)}
            onLongPress={() => mediaContextMenuApi.openForTrack(track, detail)}
            style={s.track}
            focusedStyle={s.trackFocused}
        >
            {(focused) => (
                <>
                    {isAlbum || isBook ? (
                        <Text style={[s.trackIndex, focused && s.trackInkFocused]}>
                            {(isAlbum && track.trackNumber) || index + 1}
                        </Text>
                    ) : (
                        <ArtworkImage
                            // The detail's art stands in only for a track
                            // without any of its own (see MediaDetailTrackRow).
                            artworkImageId={
                                track.artworkImageId ??
                                (track.artworkUrl ? undefined : detail.artworkImageId)
                            }
                            contentSource={detail.source}
                            letter={track.title.slice(0, 1)}
                            style={s.trackArt}
                            uri={track.artworkUrl ?? detail.artworkUrl}
                        />
                    )}
                    <View style={s.trackCopy}>
                        <Text
                            numberOfLines={1}
                            style={[
                                s.trackTitle,
                                playing && s.trackPlaying,
                                focused && s.trackInkFocused,
                            ]}
                        >
                            {track.title}
                        </Text>
                        {meta ? (
                            <Text
                                numberOfLines={1}
                                style={[s.trackSubtitle, focused && s.trackInkFocused]}
                            >
                                {meta}
                            </Text>
                        ) : null}
                    </View>
                    {!isEpisode ? (
                        <Text style={[s.trackMeta, focused && s.trackInkFocused]}>
                            {formatTrackDuration(track.durationSeconds) ?? ''}
                        </Text>
                    ) : null}
                </>
            )}
        </TvPressable>
    );
});

function DetailContent({ detail }: { detail: MobileMediaDetail }) {
    const tracks = useMemo(() => getDefaultDetailTrackOrder(detail), [detail]);
    const item = recentContentItemFromMediaDetail(detail);
    const collection =
        detail.type === MobileMediaDetailType.ALBUM ||
        detail.type === MobileMediaDetailType.PLAYLIST;
    const showDiscs = detail.type === MobileMediaDetailType.ALBUM && (detail.discCount ?? 0) > 1;
    const facts = getDetailFacts(detail, tracks.length);
    const playback = useMiniPlayerPlaybackState();
    const playingId = playback.status === 'idle' ? null : playback.item.id;
    const list = useRef<FlatList<MobileMediaTrack>>(null);
    // The actions sit at the foot of the header: a plain scroll back up would
    // stop with them at the edge margin, and the cover and title cut off.
    const revealTop = useCallback(() => {
        if (didTvFocusArriveUp()) list.current?.scrollToOffset({ animated: true, offset: 0 });
    }, []);
    const playTrack = useCallback(
        (track: MobileMediaTrack, index: number) =>
            playOnTv(() => handlePlayMediaTrack(detail, track, index, tracks)),
        [detail, tracks],
    );
    const openMenu = () => {
        if (item) mediaContextMenuApi.openForItem(item, { suppressOpenAction: true });
    };
    const header = (
        <View>
            <View style={s.detailHeader}>
                <ArtworkImage
                    uri={detail.artworkUrl}
                    artworkImageId={detail.artworkImageId}
                    contentSource={detail.source}
                    letter={detail.title.slice(0, 1)}
                    style={[
                        s.detailArt,
                        detail.type === MobileMediaDetailType.ARTIST && s.detailArtRound,
                    ]}
                />
                <View style={s.detailCopy}>
                    <Text style={s.detailType}>{getDetailTypeLabel(detail.type)}</Text>
                    <Text numberOfLines={3} style={s.detailTitle}>
                        {detail.title}
                    </Text>
                    {detail.subtitle ? (
                        <Text numberOfLines={2} style={s.detailSubtitle}>
                            {detail.subtitle}
                        </Text>
                    ) : null}
                    {facts ? (
                        <Text numberOfLines={2} style={s.muted}>
                            {facts}
                        </Text>
                    ) : null}
                    <TvFocusGroup style={s.detailActions}>
                        {tracks[0] ? (
                            <TvButton
                                id="detail:play"
                                label="Play"
                                onFocus={revealTop}
                                onPress={() => playTrack(tracks[0], 0)}
                                primary
                            >
                                {(focused) => (
                                    <>
                                        <PlayPauseGlyph
                                            color={focused ? colors.background : colors.text}
                                            isPlaying={false}
                                            size={18}
                                        />
                                        <Text
                                            style={[s.buttonText, focused && s.buttonTextFocused]}
                                        >
                                            Play
                                        </Text>
                                    </>
                                )}
                            </TvButton>
                        ) : null}
                        {collection && tracks.length > 1 ? (
                            <TvButton
                                id="detail:shuffle"
                                label="Shuffle"
                                onFocus={revealTop}
                                onPress={() =>
                                    playOnTv(() => handleShuffleDetailTracks(detail, tracks))
                                }
                            >
                                {(focused) => (
                                    <>
                                        <ShuffleGlyph
                                            color={focused ? colors.background : colors.text}
                                            size={20}
                                        />
                                        <Text
                                            style={[s.buttonText, focused && s.buttonTextFocused]}
                                        >
                                            Shuffle
                                        </Text>
                                    </>
                                )}
                            </TvButton>
                        ) : null}
                        {item ? (
                            <TvButton
                                id="detail:more"
                                label="More options"
                                onFocus={revealTop}
                                style={s.iconButton}
                                onPress={openMenu}
                            >
                                {(focused) => (
                                    <MoreGlyph color={focused ? colors.background : colors.text} />
                                )}
                            </TvButton>
                        ) : null}
                    </TvFocusGroup>
                </View>
            </View>
            {tracks.length && !showDiscs ? (
                <Text style={[s.eyebrow, s.trackListHeading]}>
                    {detail.type === MobileMediaDetailType.PODCAST
                        ? 'Episodes'
                        : detail.type === MobileMediaDetailType.AUDIOBOOK
                          ? 'Chapters'
                          : 'Tracks'}
                </Text>
            ) : null}
        </View>
    );
    const footer = (
        <View style={s.detailFooter}>
            {detail.items?.length ? (
                <TvShelf
                    section={{
                        key: 'detail-items',
                        title: 'Albums',
                        items: detail.items,
                        variant: 'album',
                    }}
                />
            ) : null}
            {detail.appearsOnItems?.length ? (
                <TvShelf
                    section={{
                        key: 'detail-appears',
                        title: 'Appears on',
                        items: detail.appearsOnItems,
                        variant: 'album',
                    }}
                />
            ) : null}
            {detail.relatedArtists?.length ? (
                <TvShelf
                    section={{
                        key: 'detail-related',
                        title: 'Related artists',
                        items: detail.relatedArtists,
                        variant: 'artist',
                    }}
                />
            ) : null}
        </View>
    );
    return (
        <>
            <LinearGradient
                colors={['#1b2028', colors.background]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0.6, y: 1 }}
                style={s.detailBackdrop}
                pointerEvents="none"
            />
            <FlatList
                data={tracks}
                extraData={playingId}
                keyExtractor={(track, index) => `${track.id}:${index}`}
                contentContainerStyle={s.pageScroll}
                fadingEdgeLength={{ start: 0, end: TV_SCROLL_EDGE }}
                ListHeaderComponent={header}
                ListFooterComponent={footer}
                initialNumToRender={8}
                maxToRenderPerBatch={5}
                ref={list}
                windowSize={5}
                removeClippedSubviews={false}
                showsVerticalScrollIndicator={false}
                renderItem={({ item: track, index }) => {
                    const disc = track.discNumber ?? 1;
                    const discStarts =
                        showDiscs && (index === 0 || (tracks[index - 1]?.discNumber ?? 1) !== disc);
                    const row = (
                        <TvTrackRow
                            detail={detail}
                            index={index}
                            onPress={playTrack}
                            playing={
                                playingId !== null &&
                                (track.playback?.id ?? track.id) === playingId
                            }
                            track={track}
                        />
                    );
                    return discStarts ? (
                        <>
                            <Text style={[s.eyebrow, s.trackListHeading]}>Disc {disc}</Text>
                            {row}
                        </>
                    ) : (
                        row
                    );
                }}
            />
        </>
    );
}

/**
 * Where focus was on each detail page in the back-stack. A page beneath a
 * nested one is unmounted, so without this Back from an album would land on
 * the artist's Play button instead of the album it opened.
 */
const detailFocusMemory = new Map<string, TvFocusMemory>();

const getDetailFocusMemory = (key: string): TvFocusMemory => {
    let memory = detailFocusMemory.get(key);
    if (!memory) {
        memory = { choice: null };
        detailFocusMemory.set(key, memory);
    }
    return memory;
};

export function TvDetail({ active }: { active: boolean }) {
    const state = useAppNavigationSelector((navigation) => navigation.mediaDetailState);
    const key = useAppNavigationSelector((navigation) => navigation.mediaDetailKey);
    const stack = useAppNavigationSelector((navigation) => navigation.mediaDetailStack);
    useEffect(() => {
        // Only a page still in the back-stack can be returned to; one opened
        // afresh starts from its Play button.
        const kept = new Set(stack.map((frame) => frame.key));
        if (key !== null) kept.add(key);
        for (const stale of detailFocusMemory.keys()) {
            if (!kept.has(stale)) detailFocusMemory.delete(stale);
        }
    }, [key, stack]);
    useEffect(() => () => detailFocusMemory.clear(), []);
    return (
        <TvFocusScope
            key={key}
            active={active}
            defaultFocus="detail:play"
            memory={key === null ? undefined : getDetailFocusMemory(key)}
            name="detail"
            forceInitialFocus
        >
            {state.status === 'loaded' ? (
                <DetailContent detail={state.detail} />
            ) : (
                <View style={s.pageScroll}>
                    <Text style={s.pageTitle}>
                        {state.status === 'loading' ? state.itemTitle : 'Unable to open item'}
                    </Text>
                    <Text style={s.emptyText}>
                        {state.status === 'error' ? state.message : 'Loading…'}
                    </Text>
                </View>
            )}
        </TvFocusScope>
    );
}
