import { type SamoMobileTabId } from '@samo/core/navigation';
import { memo, useCallback, useState } from 'react';
import { Image, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import samoLogo from '../../assets/samo-logo.png';
import { ArtworkImage } from '../components/ArtworkImage';
import { GearGlyph, SearchGlyph, TabIcon } from '../components/Glyphs';
import { useAppNavigationSelector } from '../state/app-navigation';
import { useAppSessionSelector } from '../state/app-session';
import { useAuthSessionSelector } from '../state/auth-session';
import { useMiniPlayerPlaybackState } from '../state/playback-store';
import { colors } from '../theme/tokens';
import { getContentSourceFromPlaybackItem } from '../utils/content-source';
import { openTvPage, openTvPlayer } from './tv-actions';
import { selectTvPage, TV_RAIL_PAGES, type TvPage } from './tv-navigation';
import { TvFocusScope, TvPressable } from './TvControls';
import { TvFocusZone } from './TvFocusZone';
import { tvFocus, tvStyles as s } from './tv-styles';

type RailDestination = TvPage | 'player';

/** The page's background, opaque to clear: what covers pass under. */
const RAIL_FADE = [colors.background, 'rgba(14, 15, 19, 0.82)', 'rgba(14, 15, 19, 0)'];
/** Nearly opaque for its first third, so a title's last letters do not
 *  linger beside the rail; the cover's edge still shows there is more. */
const RAIL_FADE_STOPS = [0, 0.35, 1];
const FADE_START = { x: 0, y: 0 };
const FADE_END = { x: 1, y: 0 };

/**
 * One destination. Lit while it is the page being shown, ringed while focus
 * is on it; and while focus is on it, named, since an icon alone is a guess.
 */
const RailItem = memo(function RailItem({
    children,
    focused,
    id,
    label,
    name,
    onFocusChange,
    selected,
}: {
    children: React.ReactNode;
    focused: boolean;
    id: RailDestination;
    /** What a screen reader says. */
    label: string;
    /** What the rail shows beside the icon while it has focus. */
    name: string;
    onFocusChange: (id: RailDestination, focused: boolean) => void;
    selected: boolean;
}) {
    const handleFocusChange = useCallback(
        (isFocused: boolean) => onFocusChange(id, isFocused),
        [id, onFocusChange],
    );
    return (
        <TvPressable
            id={`rail:${id}`}
            label={label}
            look={tvFocus.rail}
            onFocusChange={handleFocusChange}
            onPress={() => (id === 'player' ? openTvPlayer() : openTvPage(id))}
            selected={selected}
            style={[s.railItem, selected && s.railItemSelected]}
        >
            {children}
            {focused ? (
                <View pointerEvents="none" style={s.railLabel}>
                    <View style={s.railLabelPill}>
                        <Text numberOfLines={1} style={s.railLabelText}>
                            {name}
                        </Text>
                    </View>
                </View>
            ) : null}
        </TvPressable>
    );
});

/** `gate`: the seam guide, where a move right off the rail goes. */
export function TvRail({ active, gate }: { active: boolean; gate: number | undefined }) {
    const page = useAppNavigationSelector(selectTvPage);
    const playback = useMiniPlayerPlaybackState();
    const connection = useAuthSessionSelector((state) => state.serverConnection);
    const lastPlayed = useAppSessionSelector((session) => session.lastPlayedItem);
    // Which destination focus is on, for its label: the one thing here that
    // React draws for focus, and only on the rail's eight icons.
    const [focusedId, setFocusedId] = useState<RailDestination | null>(null);
    const handleFocusChange = useCallback((id: RailDestination, focused: boolean) => {
        setFocusedId((current) => (focused ? id : current === id ? null : current));
    }, []);
    // Now Playing is a place only while there is something in it — loaded,
    // or the last thing played, which its Play resumes: its cover, with a dot
    // while it plays. (A play/pause glyph read as a button that would pause,
    // not a way in.)
    const now = playback.status === 'idle' ? lastPlayed : playback.item;
    const ink = (id: RailDestination) => (page === id ? colors.text : colors.muted);
    return (
        <>
            <LinearGradient
                colors={RAIL_FADE}
                end={FADE_END}
                locations={RAIL_FADE_STOPS}
                pointerEvents="none"
                start={FADE_START}
                style={s.railFade}
            />
            <TvFocusScope active={active} defaultFocus={`rail:${page}`} name="rail" zone="rail">
                <TvFocusZone covered={!active} gateRight={gate} style={s.rail}>
                    <Image
                        accessible={false}
                        resizeMode="contain"
                        source={samoLogo}
                        style={s.railLogo}
                    />
                    {TV_RAIL_PAGES.map(({ id, label }) => (
                        <RailItem
                            focused={focusedId === id}
                            id={id}
                            key={id}
                            label={label}
                            name={label}
                            onFocusChange={handleFocusChange}
                            selected={page === id}
                        >
                            {id === 'search' ? (
                                <SearchGlyph color={ink(id)} />
                            ) : (
                                <TabIcon
                                    active={page === id}
                                    color={ink(id)}
                                    id={id as SamoMobileTabId}
                                />
                            )}
                        </RailItem>
                    ))}
                    <View style={s.railSpacer} />
                    {now ? (
                        <RailItem
                            focused={focusedId === 'player'}
                            id="player"
                            label={`Now playing: ${now.title}`}
                            name="Now playing"
                            onFocusChange={handleFocusChange}
                            selected={false}
                        >
                            <View>
                                <ArtworkImage
                                    artworkImageId={now.artworkImageId}
                                    contentSource={getContentSourceFromPlaybackItem(
                                        now,
                                        connection,
                                    )}
                                    letter={now.title.slice(0, 1)}
                                    style={s.railNowArt}
                                    uri={now.artworkUrl}
                                    width={s.railNowArt.width}
                                />
                                {playback.status === 'playing' ? (
                                    <View style={s.railNowDot} />
                                ) : null}
                            </View>
                        </RailItem>
                    ) : null}
                    <RailItem
                        focused={focusedId === 'settings'}
                        id="settings"
                        label="Settings"
                        name="Settings"
                        onFocusChange={handleFocusChange}
                        selected={page === 'settings'}
                    >
                        <GearGlyph color={ink('settings')} />
                    </RailItem>
                </TvFocusZone>
            </TvFocusScope>
        </>
    );
}
