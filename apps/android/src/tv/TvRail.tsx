import { type SamoMobileTabId } from '@samo/core/navigation';
import { Image, View } from 'react-native';
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
import { tvStyles as s } from './tv-styles';

/** `gate`: the seam guide, where a move right off the rail goes. */
export function TvRail({ active, gate }: { active: boolean; gate: number | undefined }) {
    const page = useAppNavigationSelector(selectTvPage);
    const playback = useMiniPlayerPlaybackState();
    const connection = useAuthSessionSelector((state) => state.serverConnection);
    const lastPlayed = useAppSessionSelector((session) => session.lastPlayedItem);
    // Now Playing is a place only while there is something in it — loaded,
    // or the last thing played, which its Play resumes: its cover, with a dot
    // while it plays. (A play/pause glyph read as a button that would pause,
    // not a way in.)
    const now = playback.status === 'idle' ? lastPlayed : playback.item;
    const destinations: ReadonlyArray<{ id: TvPage | 'player'; label: string }> = [
        ...TV_RAIL_PAGES,
        ...(now ? [{ id: 'player' as const, label: `Now playing: ${now.title}` }] : []),
        { id: 'settings', label: 'Settings' },
    ];
    return (
        <TvFocusScope active={active} defaultFocus={`rail:${page}`} name="rail" zone="rail">
            <TvFocusZone covered={!active} gateRight={gate} style={s.rail}>
                <Image
                    accessible={false}
                    resizeMode="contain"
                    source={samoLogo}
                    style={s.railLogo}
                />
                {destinations.map(({ id, label }) => (
                    <TvPressable
                        key={id}
                        id={`rail:${id}`}
                        label={label}
                        selected={page === id}
                        style={s.railItem}
                        onPress={() => (id === 'player' ? openTvPlayer() : openTvPage(id))}
                    >
                        {(focused) => {
                            const ink = focused
                                ? colors.background
                                : page === id
                                  ? colors.text
                                  : colors.muted;
                            return (
                                <>
                                    <View
                                        // Never flattened away while it has no
                                        // fill: re-created when focus gives it
                                        // one, it lost its rounded corners.
                                        collapsable={false}
                                        style={[
                                            s.railPill,
                                            page === id && s.railPillSelected,
                                            focused && s.railPillFocused,
                                        ]}
                                    />
                                    {id === 'search' ? (
                                        <SearchGlyph color={ink} />
                                    ) : id === 'settings' ? (
                                        <GearGlyph color={ink} />
                                    ) : id === 'player' && now ? (
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
                                            />
                                            {playback.status === 'playing' ? (
                                                <View style={s.railNowDot} />
                                            ) : null}
                                        </View>
                                    ) : (
                                        <TabIcon
                                            id={id as SamoMobileTabId}
                                            color={ink}
                                            active={page === id}
                                        />
                                    )}
                                </>
                            );
                        }}
                    </TvPressable>
                ))}
            </TvFocusZone>
        </TvFocusScope>
    );
}
