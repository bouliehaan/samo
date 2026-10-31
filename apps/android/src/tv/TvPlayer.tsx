import { useEffect, useRef, useState, type ReactNode } from 'react';
import { FlatList, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { ArtworkImage } from '../components/ArtworkImage';
import { PlayPauseGlyph, RepeatGlyph, ShuffleGlyph, TrackSkipGlyph } from '../components/Glyphs';
import { handlePlayQueueIndex } from '../handlers/queue-handlers';
import { mediaContextMenuApi } from '../hooks/use-android-context-menu';
import { openPlaybackContextMenu } from '../player/playback-context-item';
import { useAppSessionSelector } from '../state/app-session';
import { useAuthSessionSelector } from '../state/auth-session';
import { getPlaybackBridge } from '../state/playback-bridge';
import { usePlaybackQueue } from '../state/playback-queue-store';
import {
    getAndroidPlaybackState,
    useAndroidPlaybackState,
    useMiniPlayerPlaybackState,
} from '../state/playback-store';
import { colors } from '../theme/tokens';
import { getContentSourceFromPlaybackItem } from '../utils/content-source';
import { clamp } from '../utils/math';
import {
    formatPlaybackTime,
    getDisplayPositionMs,
    getPlaybackDurationMs,
    getPlayableDisplayMetadata,
    isLivePlayback,
} from '../utils/playback-time';
import { closeTvPlayer, runTvAction } from './tv-actions';
import { TvButton, TvFocusScope, TvPressable } from './TvControls';
import { getTvFocusedControl } from './tv-focus';
import { TV_QUEUE_ROW_HEIGHT, TV_SCROLL_EDGE, tvStyles as s } from './tv-styles';
import { subscribeTvKeys } from './tv-keys';
import { tvDisplayText } from './tv-text';

export function TvTransportButton({
    id,
    label,
    onPress,
    primary,
    selected,
    icon,
}: {
    id: string;
    label: string;
    onPress: () => void;
    primary?: boolean;
    selected?: boolean;
    icon: (color: string) => ReactNode;
}) {
    return (
        <TvPressable
            id={id}
            label={label}
            onPress={onPress}
            selected={selected}
            style={[
                s.transportButton,
                primary && s.transportPrimary,
                selected && s.transportSelected,
            ]}
            focusedStyle={primary ? s.transportPrimaryFocused : s.transportFocused}
        >
            {(focused) => (
                <>
                    {icon(primary || focused ? colors.background : colors.text)}
                    {selected ? (
                        <View style={[s.transportDot, focused && s.transportDotFocused]} />
                    ) : null}
                </>
            )}
        </TvPressable>
    );
}

/** A press of Left or Right on the seek bar: the skip its hint promises. */
const SEEK_TAP_MS = 10_000;

/**
 * How far each key repeat moves a held scrub: the whole item in about six
 * seconds of holding (repeats arrive ~20 a second), within reason at both
 * ends — a song does not fly past, a ten-hour book does not crawl.
 */
const getScrubStepMs = (durationMs: number): number =>
    clamp(durationMs / 120, 2_000, 60_000);

/**
 * The seek bar. Left and Right scrub: a press skips ten seconds, a hold runs
 * faster the longer it is held, and only letting go seeks. Seeking on every
 * key repeat would flood the player with seeks each worked out from a
 * position that has not caught up with the one before it.
 */
function TvSeek() {
    const state = useAndroidPlaybackState();
    // Where a scrub would land, shown in place of the playhead until it does.
    const [scrubMs, setScrubMs] = useState<number | null>(null);
    const scrub = useRef<number | null>(null);
    useEffect(() => {
        const commit = () => {
            const target = scrub.current;
            scrub.current = null;
            if (target === null) return;
            void getPlaybackBridge()
                .seekPlayback(target)
                .finally(() => {
                    // A scrub begun meanwhile keeps its own preview.
                    if (scrub.current === null) setScrubMs(null);
                });
        };
        const unsubscribe = subscribeTvKeys((key, action, repeat) => {
            if (key !== 'left' && key !== 'right') return;
            if (action === 'up') {
                commit();
                return;
            }
            if (getTvFocusedControl()?.id !== 'player:seek') return;
            const playback = getAndroidPlaybackState();
            if (playback.status === 'idle' || isLivePlayback(playback)) return;
            const duration = getPlaybackDurationMs(playback) ?? 0;
            const from = scrub.current ?? getDisplayPositionMs(playback.item, playback.positionMs);
            const step = repeat ? getScrubStepMs(duration) : SEEK_TAP_MS;
            scrub.current = clamp(from + (key === 'left' ? -step : step), 0, duration);
            setScrubMs(scrub.current);
        });
        return () => {
            unsubscribe();
            commit();
        };
    }, []);
    if (state.status === 'idle') return null;
    if (isLivePlayback(state)) return null;
    const position = scrubMs ?? getDisplayPositionMs(state.item, state.positionMs);
    const duration = getPlaybackDurationMs(state) ?? 0;
    return (
        <TvPressable
            id="player:seek"
            label="Seek. Press left or right to skip ten seconds, or hold to scrub"
            onPress={() => undefined}
            pin={{ left: true, right: true }}
            style={s.seek}
            focusedStyle={s.seekFocused}
        >
            {(focused) => (
                <View style={s.seekBody}>
                    <View style={s.seekTrack}>
                        <View
                            style={[
                                s.seekFill,
                                {
                                    width: `${duration ? clamp((position / duration) * 100, 0, 100) : 0}%`,
                                },
                            ]}
                        />
                    </View>
                    <View style={s.seekTimes}>
                        <Text style={[s.seekTime, scrubMs !== null && s.seekTimeScrubbing]}>
                            {formatPlaybackTime(position)}
                        </Text>
                        <Text style={s.seekHint}>
                            {focused && scrubMs === null ? '‹  10 seconds  ›' : ''}
                        </Text>
                        <Text style={s.seekTime}>{formatPlaybackTime(duration)}</Text>
                    </View>
                </View>
            )}
        </TvPressable>
    );
}

/**
 * The queue, opened where it is now: the playing item first, what comes next
 * below it, and what already played above it for anyone who scrolls up.
 */
function TvQueue() {
    const queue = usePlaybackQueue();
    const connection = useAuthSessionSelector((state) => state.serverConnection);
    if (!queue) return <Text style={s.muted}>There are no queued tracks.</Text>;
    const upcoming = queue.items.length - queue.index - 1;
    return (
        <View style={s.queuePanel}>
            <Text style={[s.sectionTitle, s.queueTitle]}>
                {upcoming > 0 ? `Up next · ${upcoming}` : 'Up next'}
            </Text>
            <FlatList
                data={queue.items}
                fadingEdgeLength={{ start: 0, end: TV_SCROLL_EDGE }}
                getItemLayout={(_data, index) => ({
                    index,
                    length: TV_QUEUE_ROW_HEIGHT,
                    offset: TV_QUEUE_ROW_HEIGHT * index,
                })}
                initialNumToRender={8}
                initialScrollIndex={Math.max(0, Math.min(queue.index, queue.items.length - 1))}
                keyExtractor={(item, index) => `${item.id}:${index}`}
                removeClippedSubviews={false}
                windowSize={5}
                renderItem={({ item, index }) => (
                    <TvPressable
                        id={`queue:${index}`}
                        label={`${index === queue.index ? 'Playing: ' : ''}${item.title}`}
                        onPress={() => runTvAction(() => handlePlayQueueIndex(index))}
                        onLongPress={() =>
                            openPlaybackContextMenu(mediaContextMenuApi.openForItem, item, connection)
                        }
                        style={s.queueRow}
                        focusedStyle={s.trackFocused}
                    >
                        {(focused) => (
                            <>
                                <ArtworkImage
                                    uri={item.artworkUrl}
                                    artworkImageId={item.artworkImageId}
                                    contentSource={getContentSourceFromPlaybackItem(
                                        item,
                                        connection,
                                    )}
                                    letter={item.title.slice(0, 1)}
                                    style={s.queueArt}
                                />
                                <View style={s.trackCopy}>
                                    <Text
                                        numberOfLines={1}
                                        style={[
                                            s.trackTitle,
                                            index === queue.index && s.trackPlaying,
                                            focused && s.trackInkFocused,
                                        ]}
                                    >
                                        {item.title}
                                    </Text>
                                    <Text
                                        numberOfLines={1}
                                        style={[s.trackSubtitle, focused && s.trackInkFocused]}
                                    >
                                        {item.artist ?? item.subtitle}
                                    </Text>
                                </View>
                            </>
                        )}
                    </TvPressable>
                )}
            />
        </View>
    );
}

export function TvPlayer({ active }: { active: boolean }) {
    const state = useMiniPlayerPlaybackState();
    const shuffled = useAppSessionSelector((session) => session.isShuffled);
    const repeat = useAppSessionSelector((session) => session.repeatMode);
    const connection = useAuthSessionSelector((session) => session.serverConnection);
    const lastPlayed = useAppSessionSelector((session) => session.lastPlayedItem);
    const [queueOpen, setQueueOpen] = useState(false);
    // Nothing loaded yet this launch: the last thing played, as the phone's
    // dock shows it, with Play resuming it. Stepping, shuffle, repeat and the
    // queue wait until it is loaded.
    const resting = state.status === 'idle';
    const item = resting ? lastPlayed : state.item;
    const source = item ? getContentSourceFromPlaybackItem(item, connection) : undefined;
    // Chapter metadata is position-aware. Passing zero here made a long book
    // stay on its first chapter in the TV player even while the engine moved
    // through the queue.
    const display =
        item
            ? getPlayableDisplayMetadata(
                  item,
                  state.status === 'idle' ? 0 : state.positionMs,
              )
            : null;
    const live = state.status !== 'idle' && isLivePlayback(state);
    const playing = state.status === 'playing' || state.status === 'buffering';
    return (
        <TvFocusScope
            active={active}
            defaultFocus={item ? 'player:toggle' : 'player:close'}
            name="player"
            zone="player"
        >
            <View style={s.player}>
                <LinearGradient
                    colors={['#202731', '#101216', '#0e0f13']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={s.fill}
                    pointerEvents="none"
                />
                {item && display ? (
                    <View style={s.playerBody}>
                        {!queueOpen ? (
                            <ArtworkImage
                                uri={item.artworkUrl}
                                artworkImageId={item.artworkImageId}
                                contentSource={source}
                                letter={display.title.slice(0, 1)}
                                style={s.playerArt}
                            />
                        ) : (
                            <TvQueue />
                        )}
                        <View style={s.playerInfo}>
                            <Text style={s.playerEyebrow}>
                                {live ? 'Live radio' : resting ? 'Last played' : 'Now playing'}
                            </Text>
                            <Text numberOfLines={2} style={s.playerTitle}>
                                {tvDisplayText(display.title)}
                            </Text>
                            <Text numberOfLines={1} style={s.playerSubtitle}>
                                {tvDisplayText(display.subtitle)}
                            </Text>
                            <TvSeek />
                            <View style={s.transport}>
                                {!live && !resting ? (
                                    <TvTransportButton
                                        id="player:shuffle"
                                        label={shuffled ? 'Turn shuffle off' : 'Turn shuffle on'}
                                        selected={shuffled}
                                        onPress={() => getPlaybackBridge().toggleShuffle()}
                                        icon={(color) => <ShuffleGlyph color={color} size={22} />}
                                    />
                                ) : null}
                                {!live && !resting ? (
                                    <TvTransportButton
                                        id="player:previous"
                                        label="Previous track"
                                        onPress={() =>
                                            runTvAction(() =>
                                                getPlaybackBridge().navigatePlayback(-1),
                                            )
                                        }
                                        icon={(color) => (
                                            <TrackSkipGlyph
                                                color={color}
                                                direction={-1}
                                                size={23}
                                            />
                                        )}
                                    />
                                ) : null}
                                <TvTransportButton
                                    id="player:toggle"
                                    label={playing ? 'Pause' : 'Play'}
                                    primary
                                    onPress={() =>
                                        runTvAction(() => getPlaybackBridge().togglePlayback())
                                    }
                                    icon={(color) => (
                                        <PlayPauseGlyph
                                            color={color}
                                            isPlaying={playing}
                                            size={28}
                                        />
                                    )}
                                />
                                {!live && !resting ? (
                                    <TvTransportButton
                                        id="player:next"
                                        label="Next track"
                                        onPress={() =>
                                            runTvAction(() =>
                                                getPlaybackBridge().navigatePlayback(1),
                                            )
                                        }
                                        icon={(color) => (
                                            <TrackSkipGlyph color={color} direction={1} size={23} />
                                        )}
                                    />
                                ) : null}
                                {!live && !resting ? (
                                    <TvTransportButton
                                        id="player:repeat"
                                        label={`Repeat: ${repeat}`}
                                        selected={repeat !== 'off'}
                                        onPress={() => getPlaybackBridge().cycleRepeatMode()}
                                        icon={(color) => (
                                            <RepeatGlyph color={color} mode={repeat} />
                                        )}
                                    />
                                ) : null}
                            </View>
                        </View>
                    </View>
                ) : (
                    <View style={s.playerEmpty}>
                        <Text style={s.playerEmptyTitle}>Nothing is playing</Text>
                        <Text style={s.playerEmptyText}>
                            Choose something from your library to start listening.
                        </Text>
                        <TvButton
                            id="player:close"
                            label="Back to library"
                            onPress={closeTvPlayer}
                            primary
                            style={s.playerEmptyButton}
                        >
                            Back to library
                        </TvButton>
                    </View>
                )}
                {item ? (
                    <View style={s.playerFooter}>
                        <Text numberOfLines={1} style={s.playerStatus}>
                            {state.status !== 'idle'
                                ? (state.message ??
                                  (state.status === 'buffering'
                                      ? 'Buffering…'
                                      : !playing
                                        ? 'Paused'
                                        : ''))
                                : ''}
                        </Text>
                        <View style={s.transportSecondary}>
                            {!live && !resting ? (
                                <TvButton
                                    id="player:queue"
                                    label={queueOpen ? 'Artwork' : 'Up next'}
                                    selected={queueOpen}
                                    style={s.quietButton}
                                    onPress={() => setQueueOpen((value) => !value)}
                                />
                            ) : null}
                            <TvButton
                                id="player:more"
                                label="More options"
                                style={s.quietButton}
                                onPress={() =>
                                    openPlaybackContextMenu(
                                        mediaContextMenuApi.openForItem,
                                        item,
                                        connection,
                                    )
                                }
                            />
                        </View>
                    </View>
                ) : null}
            </View>
        </TvFocusScope>
    );
}
