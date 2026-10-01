import { ScrollView, Text, View } from 'react-native';
import { ArtworkImage } from '../components/ArtworkImage';
import { handlePlayCollectionNow } from '../handlers/queue-handlers';
import { handlePlayMediaTrack } from '../handlers/playback-handlers';
import { useAndroidContextMenu } from '../hooks/use-android-context-menu';
import { getPlaybackBridge } from '../state/playback-bridge';
import { setIsFullPlayerOpen } from '../state/app-navigation';
import { playOnTv, runTvAction, selectTvItem } from './tv-actions';
import { TvFocusScope, TvPressable } from './TvControls';
import { tvStyles as s } from './tv-styles';

// These phone actions open touch-only secondary sheets. Only mount actions
// with a TV destination; the playback, queue, favorite and device handlers are shared.
const PHONE_SHEETS = new Set([
    'book-info',
    'create-playlist',
    'delete-playlist',
    'episode-info',
    'playlist',
    'podcast-info',
    'stream-info',
]);

export function TvContextMenu() {
    const menu = useAndroidContextMenu();
    const target = menu.target;
    if (!target) return null;
    const play = (shuffled = false) => {
        menu.onClose();
        if (target.kind === 'album' || target.kind === 'playlist')
            playOnTv(() => handlePlayCollectionNow(target.item, { shuffled }));
        else if (target.kind === 'song') {
            if (target.detail)
                playOnTv(() =>
                    handlePlayMediaTrack(
                        target.detail!,
                        target.track,
                        Math.max(
                            0,
                            target.detail!.tracks.findIndex(
                                (track) => track.id === target.track.id,
                            ),
                        ),
                    ),
                );
            else if (target.track.playback)
                playOnTv(() => getPlaybackBridge().handlePlayItem(target.track.playback!));
        } else if (target.kind !== 'artist' && target.kind !== 'podcast') selectTvItem(target.item);
    };
    const canPlay = target.kind !== 'artist' && target.kind !== 'podcast';
    const actions = [
        ...(canPlay ? [{ id: 'tv-play', label: 'Play now', onPress: () => play() }] : []),
        ...(target.kind === 'playlist' || target.kind === 'album'
            ? [{ id: 'tv-shuffle', label: 'Shuffle', onPress: () => play(true) }]
            : []),
        ...menu.actions
            .filter((action) => !PHONE_SHEETS.has(action.id))
            .map((action) => ({
                ...action,
                onPress: () => {
                    // Keep feedback actions open so the shared handler can answer here.
                    if (
                        action.id === 'open' ||
                        action.id.startsWith('open-') ||
                        action.id.startsWith('go-') ||
                        action.id.startsWith('view-')
                    ) {
                        menu.onClose();
                        setIsFullPlayerOpen(false);
                    }
                    runTvAction(action.onPress);
                },
            })),
        { id: 'close', label: 'Close', onPress: menu.onClose },
    ];
    return (
        <TvFocusScope defaultFocus={`menu:${actions[0].id}`} name="menu" zone="menu">
            <View style={s.menuBackdrop}>
                <View style={s.menuPanel}>
                    <View style={s.menuHeader}>
                        <ArtworkImage
                            uri={menu.artworkUrl}
                            artworkImageId={menu.artworkImageId}
                            contentSource={menu.contentSource}
                            letter={menu.title.slice(0, 1)}
                            style={s.menuArt}
                        />
                        <View style={s.menuCopy}>
                            <Text numberOfLines={2} style={s.menuTitle}>
                                {menu.title}
                            </Text>
                            <Text numberOfLines={2} style={s.menuSubtitle}>
                                {menu.subtitle}
                            </Text>
                        </View>
                    </View>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        {actions.map((action, index) => (
                            <TvPressable
                                key={action.id}
                                id={`menu:${action.id}`}
                                label={action.label}
                                onPress={action.onPress}
                                pin={{
                                    left: true,
                                    right: true,
                                    up: index === 0,
                                    down: index === actions.length - 1,
                                }}
                                style={s.menuItem}
                                focusedStyle={s.menuItemFocused}
                            >
                                {(focused) => (
                                    <Text style={[s.menuLabel, focused && s.trackInkFocused]}>
                                        {action.label}
                                    </Text>
                                )}
                            </TvPressable>
                        ))}
                    </ScrollView>
                    {menu.feedback ? <Text style={s.menuFeedback}>{menu.feedback}</Text> : null}
                </View>
            </View>
        </TvFocusScope>
    );
}
