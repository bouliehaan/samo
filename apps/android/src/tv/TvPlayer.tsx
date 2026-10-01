import { useEffect, useState, type ReactNode } from 'react';
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
import { useAndroidPlaybackState, useMiniPlayerPlaybackState } from '../state/playback-store';
import { colors } from '../theme/tokens';
import { getContentSourceFromPlaybackItem } from '../utils/content-source';
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
import { subscribeTvKeys } from './tv-keys';
import { tvStyles as s } from './tv-styles';
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

function TvSeek() {
    const state = useAndroidPlaybackState();
    useEffect(
        () =>
            subscribeTvKeys((key, action) => {
                if (
                    getTvFocusedControl()?.id !== 'player:seek' ||
                    action !== 'down' ||
                    (key !== 'left' && key !== 'right')
                )
                    return;
                runTvAction(() => getPlaybackBridge().skipPlayback(key === 'left' ? -10 : 10));
            }),
        [],
    );
    if (state.status === 'idle') return null;
    if (isLivePlayback(state)) return null;
    const position = getDisplayPositionMs(state.item, state.positionMs);
    const duration = getPlaybackDurationMs(state) ?? 0;
    return (
        <TvPressable
            id="player:seek"
            label="Seek. Press left or right to skip ten seconds"
            onPress={() => undefined}
            pin={{ left: true, right: true }}
            style={s.seek}
            focusedStyle={s.seekFocused}
        >
            {(focused) => (
                <View style={{ width: '100%' }}>
                    <View style={s.seekTrack}>
                        <View
                            style={[
                                s.seekFill,
                                {
                                    width: `${duration ? Math.max(0, Math.min(100, (position / duration) * 100)) : 0}%`,
                                },
                            ]}
                        />
                    </View>
                    <View style={s.seekTimes}>
                        <Text style={s.seekTime}>{formatPlaybackTime(position)}</Text>
                        <Text style={s.seekHint}>{focused ? '‹  10 seconds  ›' : ''}</Text>
                        <Text style={s.seekTime}>{formatPlaybackTime(duration)}</Text>
                    </View>
                </View>
            )}
        </TvPressable>
    );
}

function TvQueue() {
    const queue = usePlaybackQueue();
    const connection = useAuthSessionSelector((state) => state.serverConnection);
    if (!queue) return <Text style={s.muted}>There are no queued tracks.</Text>;
    return (
        <FlatList
            data={queue.items}
            style={s.queuePanel}
            keyExtractor={(item, index) => `${item.id}:${index}`}
            initialNumToRender={8}
            removeClippedSubviews={false}
            windowSize={5}
            ListHeaderComponent={
                <Text style={[s.sectionTitle, s.queueTitle]}>Up next · {queue.items.length}</Text>
            }
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
                                contentSource={getContentSourceFromPlaybackItem(item, connection)}
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
    );
}

export function TvPlayer({ active }: { active: boolean }) {
    const state = useMiniPlayerPlaybackState();
    const shuffled = useAppSessionSelector((session) => session.isShuffled);
    const repeat = useAppSessionSelector((session) => session.repeatMode);
    const connection = useAuthSessionSelector((session) => session.serverConnection);
    const [queueOpen, setQueueOpen] = useState(false);
    const item = state.status === 'idle' ? null : state.item;
    const source = item ? getContentSourceFromPlaybackItem(item, connection) : undefined;
    const display = item ? getPlayableDisplayMetadata(item, 0) : null;
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
                <View style={s.playerTopBar}>
                    <TvButton
                        id="player:close"
                        label="‹  Library"
                        onPress={closeTvPlayer}
                        style={s.quietButton}
                    />
                    <Text style={s.eyebrow}>samo / now playing</Text>
                </View>
                {item && display ? (
                    <View style={s.playerBody}>
                        {!queueOpen ? (
                            <TvPressable
                                id="player:art"
                                label={`Options for ${tvDisplayText(display.title)}`}
                                onPress={() =>
                                    openPlaybackContextMenu(
                                        mediaContextMenuApi.openForItem,
                                        item,
                                        connection,
                                    )
                                }
                                onLongPress={() =>
                                    openPlaybackContextMenu(
                                        mediaContextMenuApi.openForItem,
                                        item,
                                        connection,
                                    )
                                }
                                focusedStyle={s.artFocused}
                            >
                                <ArtworkImage
                                    uri={item.artworkUrl}
                                    artworkImageId={item.artworkImageId}
                                    contentSource={source}
                                    letter={display.title.slice(0, 1)}
                                    style={s.playerArt}
                                />
                            </TvPressable>
                        ) : (
                            <TvQueue />
                        )}
                        <View style={s.playerInfo}>
                            <Text style={s.playerEyebrow}>
                                {live ? 'Live radio' : 'Now playing'}
                            </Text>
                            <Text numberOfLines={2} style={s.playerTitle}>
                                {tvDisplayText(display.title)}
                            </Text>
                            <Text numberOfLines={1} style={s.playerSubtitle}>
                                {tvDisplayText(display.subtitle)}
                            </Text>
                            <TvSeek />
                            <View style={s.transport}>
                                {!live ? (
                                    <TvTransportButton
                                        id="player:shuffle"
                                        label={shuffled ? 'Turn shuffle off' : 'Turn shuffle on'}
                                        selected={shuffled}
                                        onPress={() => getPlaybackBridge().toggleShuffle()}
                                        icon={(color) => <ShuffleGlyph color={color} size={22} />}
                                    />
                                ) : null}
                                {!live ? (
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
                                {!live ? (
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
                                {!live ? (
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
                    <View style={s.playerBody}>
                        <Text style={s.playerTitle}>Choose something to listen to.</Text>
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
                            {!live ? (
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
