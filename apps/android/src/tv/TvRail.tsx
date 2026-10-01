import { type SamoMobileTabId } from '@samo/core/navigation';
import { Text, View } from 'react-native';
import { GearGlyph, PlayPauseGlyph, SearchGlyph, TabIcon } from '../components/Glyphs';
import { useAppNavigationSelector } from '../state/app-navigation';
import { useMiniPlayerPlaybackState } from '../state/playback-store';
import { colors } from '../theme/tokens';
import { openTvPage, openTvPlayer } from './tv-actions';
import { selectTvPage, TV_RAIL_PAGES } from './tv-navigation';
import { TvFocusScope, TvPressable } from './TvControls';
import { tvStyles as s } from './tv-styles';

export function TvRail({ active }: { active: boolean }) {
    const page = useAppNavigationSelector(selectTvPage);
    const playback = useMiniPlayerPlaybackState();
    const destinations = [
        ...TV_RAIL_PAGES,
        { id: 'player', label: 'Now playing' },
        { id: 'settings', label: 'Settings' },
    ] as const;
    return (
        <TvFocusScope active={active} defaultFocus={`rail:${page}`} name="rail" zone="rail">
            <View style={s.rail}>
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
                                    ) : id === 'player' ? (
                                        <PlayPauseGlyph
                                            color={ink}
                                            isPlaying={playback.status === 'playing'}
                                            size={21}
                                        />
                                    ) : (
                                        <TabIcon
                                            id={id as SamoMobileTabId}
                                            color={ink}
                                            active={page === id}
                                        />
                                    )}
                                    {focused ? (
                                        <View pointerEvents="none" style={s.railTooltip}>
                                            <Text style={s.railTooltipText}>{label}</Text>
                                        </View>
                                    ) : null}
                                </>
                            );
                        }}
                    </TvPressable>
                ))}
            </View>
        </TvFocusScope>
    );
}
