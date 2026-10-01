import { type MobileMediaDetail, MobileMediaDetailType } from '@samo/core/mobile';
import { useMemo } from 'react';
import { FlatList, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { ArtworkImage } from '../components/ArtworkImage';
import { MoreGlyph, PlayPauseGlyph, ShuffleGlyph } from '../components/Glyphs';
import { handlePlayMediaTrack, handleShuffleDetailTracks } from '../handlers/playback-handlers';
import { mediaContextMenuApi } from '../hooks/use-android-context-menu';
import { recentContentItemFromMediaDetail } from '../services/recent-content';
import { useAppNavigationSelector } from '../state/app-navigation';
import { colors } from '../theme/tokens';
import { getDefaultDetailTrackOrder, getDetailTypeLabel } from '../utils/media-detail';
import { formatPlaybackTime } from '../utils/playback-time';
import { playOnTv } from './tv-actions';
import { TvShelf } from './TvCollections';
import { TvButton, TvFocusScope, TvPressable } from './TvControls';
import { tvStyles as s } from './tv-styles';

function DetailContent({ detail }: { detail: MobileMediaDetail }) {
    const tracks = useMemo(() => getDefaultDetailTrackOrder(detail), [detail]);
    const item = recentContentItemFromMediaDetail(detail);
    const collection =
        detail.type === MobileMediaDetailType.ALBUM ||
        detail.type === MobileMediaDetailType.PLAYLIST;
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
                    <Text numberOfLines={2} style={s.detailSubtitle}>
                        {detail.subtitle}
                    </Text>
                    {!detail.subtitle?.includes(`${tracks.length} tracks`) ? (
                        <Text style={s.muted}>
                            {tracks.length
                                ? `${tracks.length} ${detail.type === MobileMediaDetailType.PODCAST ? 'episodes' : 'tracks'}`
                                : ''}
                        </Text>
                    ) : null}
                    <View style={s.detailActions}>
                        {tracks[0] ? (
                            <TvButton
                                id="detail:play"
                                label="Play"
                                onPress={() =>
                                    playOnTv(() =>
                                        handlePlayMediaTrack(detail, tracks[0], 0, tracks),
                                    )
                                }
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
                                style={s.iconButton}
                                onPress={openMenu}
                            >
                                {(focused) => (
                                    <MoreGlyph color={focused ? colors.background : colors.text} />
                                )}
                            </TvButton>
                        ) : null}
                    </View>
                </View>
            </View>
            {tracks.length ? (
                <View style={s.trackListHeading}>
                    <Text style={s.eyebrow}>
                        {detail.type === MobileMediaDetailType.PODCAST ? 'Episodes' : 'Tracks'}
                    </Text>
                    <Text style={s.menuSubtitle}>Hold OK for options</Text>
                </View>
            ) : null}
        </View>
    );
    const footer = (
        <View style={{ marginTop: 24 }}>
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
                style={s.fill}
                pointerEvents="none"
            />
            <FlatList
                data={tracks}
                keyExtractor={(track, index) => `${track.id}:${index}`}
                contentContainerStyle={s.pageScroll}
                ListHeaderComponent={header}
                ListFooterComponent={footer}
                initialNumToRender={8}
                maxToRenderPerBatch={5}
                windowSize={5}
                removeClippedSubviews={false}
                showsVerticalScrollIndicator={false}
                renderItem={({ item: track, index }) => (
                    <TvPressable
                        id={`track:${index}`}
                        label={`${index + 1}. ${track.title}`}
                        onPress={() =>
                            playOnTv(() => handlePlayMediaTrack(detail, track, index, tracks))
                        }
                        onLongPress={() => mediaContextMenuApi.openForTrack(track, detail)}
                        style={s.track}
                        focusedStyle={s.trackFocused}
                    >
                        {(focused) => (
                            <>
                                <Text style={[s.trackIndex, focused && s.trackInkFocused]}>
                                    {index + 1}
                                </Text>
                                <View style={s.trackCopy}>
                                    <Text
                                        numberOfLines={1}
                                        style={[s.trackTitle, focused && s.trackInkFocused]}
                                    >
                                        {track.title}
                                    </Text>
                                    <Text
                                        numberOfLines={1}
                                        style={[s.trackSubtitle, focused && s.trackInkFocused]}
                                    >
                                        {track.subtitle ?? track.artist}
                                    </Text>
                                </View>
                                <Text style={[s.trackMeta, focused && s.trackInkFocused]}>
                                    {track.durationSeconds
                                        ? formatPlaybackTime(track.durationSeconds * 1000)
                                        : ''}
                                </Text>
                            </>
                        )}
                    </TvPressable>
                )}
            />
        </>
    );
}

export function TvDetail({ active }: { active: boolean }) {
    const state = useAppNavigationSelector((navigation) => navigation.mediaDetailState);
    const key = useAppNavigationSelector((navigation) => navigation.mediaDetailKey);
    return (
        <TvFocusScope
            key={key}
            active={active}
            defaultFocus="detail:play"
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
