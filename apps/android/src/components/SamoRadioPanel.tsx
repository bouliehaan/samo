import { memo, type ReactNode, useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import {
    type SamoRadioDevice,
    type SamoRadioStationRef,
} from '@samo/core/server';
import LinearGradient from 'react-native-linear-gradient';

import { ArtworkImage } from './ArtworkImage';
import {
    DownloadGlyph,
    MediaKindGlyph,
    MoreGlyph,
    PlayPauseGlyph,
    PowerGlyph,
    RadioWaveGlyph,
    StationReturnGlyph,
    TrackSkipGlyph,
} from './Glyphs';
import { MotionSheet } from './MotionSheet';
import { PressableScale } from './PressableScale';
import { SamoRadioVolumeSlider } from './SamoRadioVolumeSlider';
import {
    type SamoRadioDeviceActionId,
    useSamoRadioDevice,
    useSamoRadioPolling,
} from '../hooks/use-samo-radio-device';
import { triggerImpact } from '../services/haptics';
import { useAppNavigationSelector } from '../state/app-navigation';
import { presses } from '../theme/motion';
import { useSamoRadioSelector } from '../state/samo-radio';
import { styles } from '../theme/styles';
import { colors } from '../theme/tokens';

/**
 * The card's wash: the airing picture blurred past recognition, so the panel
 * takes the colour of whatever the stereo is playing. Same strength as the
 * Explore hero's, for the same reason.
 */
const SAMO_RADIO_BLUR = 34;

/**
 * Dims the wash to a legible bed — densest at the bottom-left under the copy
 * and the controls, thinning towards the picture at the top-right.
 */
const SAMO_RADIO_SCRIM = [
    'rgba(14, 15, 19, 0.5)',
    'rgba(14, 15, 19, 0.84)',
    'rgba(14, 15, 19, 0.96)',
];
const SAMO_RADIO_SCRIM_START = { x: 1, y: 0 };
const SAMO_RADIO_SCRIM_END = { x: 0, y: 1 };

/**
 * A transport control on the panel.
 *
 * Same shape as the player's own `PlayerIconButton` — borderless glyph, one
 * filled primary — at the smaller size a card inside a scroll page can carry.
 * `chrome` because the row is fixed furniture within the card: nothing under
 * the thumb here is going to turn into a scroll, so the press starts sinking on
 * the frame the finger lands rather than after the scroll-safety window.
 */
const SamoRadioIconButton = ({
    accessibilityLabel,
    children,
    onPress,
    primary,
}: {
    accessibilityLabel: string;
    children: ReactNode;
    onPress: () => void;
    primary?: boolean;
}) => (
    <PressableScale
        {...presses.control}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        chrome
        onPress={onPress}
        style={[styles.samoRadioIconButton, primary && styles.samoRadioIconButtonPrimary]}
    >
        {children}
    </PressableScale>
);

const ACTION_GLYPHS: Record<SamoRadioDeviceActionId, ReactNode> = {
    'keep-in-library': <DownloadGlyph color={colors.text} />,
    'next-kind': <MediaKindGlyph color={colors.text} />,
    standby: <PowerGlyph color={colors.text} />,
    stop: <StationReturnGlyph color={colors.text} />,
};

/**
 * One device's status and controls — the behavior is `useSamoRadioDevice`'s;
 * this is the phone's drawing of it.
 */
const SamoRadioDeviceCard = memo(
    ({ device, stations }: { device: SamoRadioDevice; stations: SamoRadioStationRef[] }) => {
        const [isTuneOpen, setIsTuneOpen] = useState(false);
        const [isMenuOpen, setIsMenuOpen] = useState(false);
        const {
            actions,
            artworkUrl,
            canStep,
            clearKeepFeedback,
            commitVolume,
            contentSource,
            error,
            isPaused,
            isTogglingPlayback,
            keepFeedback,
            meta,
            now,
            onChannel,
            runAction,
            sendCommand,
            serverConnection,
            state,
            tune,
        } = useSamoRadioDevice(device);

        const closeMenu = useCallback(() => setIsMenuOpen(false), []);

        // Only devices samo can reach are ever in the store, so a card without
        // a state snapshot is one that dropped off between a poll and this
        // render — it is already on its way out of the list. Nothing to draw,
        // and certainly not a row of controls that would all fail.
        if (!state || !now) {
            return null;
        }

        return (
            <View style={styles.samoRadioPanel}>
                {artworkUrl ? (
                    <ArtworkImage
                        blurRadius={SAMO_RADIO_BLUR}
                        contentSource={contentSource}
                        // No letter fallback behind the scrim: a picture that
                        // has not loaded leaves the panel colour, never a
                        // giant ghost initial.
                        letter=""
                        serverConnection={serverConnection}
                        style={styles.samoRadioBackdrop}
                        uri={artworkUrl}
                    />
                ) : null}
                <LinearGradient
                    colors={SAMO_RADIO_SCRIM}
                    end={SAMO_RADIO_SCRIM_END}
                    pointerEvents="none"
                    start={SAMO_RADIO_SCRIM_START}
                    style={styles.samoRadioScrim}
                />
                <View style={styles.samoRadioHead}>
                    <View style={styles.samoRadioCopy}>
                        <Text numberOfLines={1} style={styles.samoRadioEyebrow}>
                            {`${device.name} · ${state.status}`}
                        </Text>
                        <Text numberOfLines={2} style={styles.samoRadioTitle}>
                            {now.title}
                        </Text>
                        {meta ? (
                            <Text numberOfLines={1} style={styles.samoRadioMeta}>
                                {meta}
                            </Text>
                        ) : null}
                    </View>
                    {artworkUrl ? (
                        <View style={styles.samoRadioSleeve}>
                            <ArtworkImage
                                contentSource={contentSource}
                                letter={now.title.slice(0, 1)}
                                serverConnection={serverConnection}
                                style={styles.samoRadioSleeveArt}
                                uri={artworkUrl}
                            />
                        </View>
                    ) : null}
                </View>

                <View style={styles.samoRadioTransport}>
                    {/* On a channel these move the STATION on — everyone
                        listening hears it. An internet station is somebody
                        else's stream with nothing to skip to, and the device
                        refuses: no buttons there. */}
                    {canStep ? (
                        <SamoRadioIconButton
                            accessibilityLabel={
                                onChannel ? 'Back to the previous programme' : 'Previous'
                            }
                            onPress={() => sendCommand('previous')}
                        >
                            <TrackSkipGlyph color={colors.text} direction={-1} size={19} />
                        </SamoRadioIconButton>
                    ) : null}
                    <SamoRadioIconButton
                        accessibilityLabel={isPaused ? 'Resume' : 'Pause'}
                        onPress={() => sendCommand(isPaused ? 'resume' : 'pause')}
                        primary
                    >
                        {isTogglingPlayback ? (
                            <ActivityIndicator color={colors.background} size="small" />
                        ) : (
                            <PlayPauseGlyph
                                color={colors.background}
                                isPlaying={!isPaused}
                                size={18}
                            />
                        )}
                    </SamoRadioIconButton>
                    {canStep ? (
                        <SamoRadioIconButton
                            accessibilityLabel={
                                onChannel ? 'Skip what the station is playing' : 'Next'
                            }
                            onPress={() => sendCommand('next')}
                        >
                            <TrackSkipGlyph color={colors.text} direction={1} size={19} />
                        </SamoRadioIconButton>
                    ) : null}
                    <View style={styles.samoRadioTransportSpacer} />
                    {stations.length > 0 ? (
                        <SamoRadioIconButton
                            accessibilityLabel={isTuneOpen ? 'Close the station list' : 'Tune'}
                            onPress={() => {
                                triggerImpact('light');
                                setIsTuneOpen((open) => !open);
                            }}
                        >
                            <RadioWaveGlyph color={isTuneOpen ? colors.accent : colors.text} />
                        </SamoRadioIconButton>
                    ) : null}
                    <SamoRadioIconButton
                        accessibilityLabel="More controls"
                        onPress={() => {
                            triggerImpact('light');
                            // Cleared on the way in rather than on the way out,
                            // so last time's answer is gone before the sheet
                            // draws and the closing animation stays clean.
                            clearKeepFeedback();
                            setIsMenuOpen(true);
                        }}
                    >
                        <MoreGlyph color={colors.text} />
                    </SamoRadioIconButton>
                </View>

                <SamoRadioVolumeSlider onCommit={commitVolume} volume={state.volume ?? 0} />

                <MotionSheet
                    backdropStyle={styles.mediaContextBackdrop}
                    onRequestClose={closeMenu}
                    sheetStyle={styles.mediaContextSheet}
                    variant="bottom"
                    visible={isMenuOpen}
                >
                    <View style={styles.samoRadioMenuHeader}>
                        <Text style={styles.mediaContextEyebrow}>{device.name}</Text>
                        <Text numberOfLines={1} style={styles.mediaContextTitle}>
                            {now.title}
                        </Text>
                    </View>
                    <View style={styles.mediaContextDivider} />
                    <View style={styles.mediaContextActions}>
                        {actions.map((action, index) => (
                            <Pressable
                                accessibilityRole="button"
                                android_ripple={{
                                    borderless: false,
                                    color: 'rgba(255, 255, 255, 0.06)',
                                }}
                                key={action.id}
                                onPress={() => {
                                    // Keep deliberately does NOT close the
                                    // sheet: the answer renders inside it, and
                                    // closing first would write the result into
                                    // something already gone.
                                    if (action.id !== 'keep-in-library') {
                                        closeMenu();
                                    }
                                    runAction(action.id);
                                }}
                                style={[
                                    styles.mediaContextActionRow,
                                    index === actions.length - 1 &&
                                        styles.mediaContextActionRowLast,
                                ]}
                            >
                                <View style={styles.mediaContextActionIcon}>
                                    {ACTION_GLYPHS[action.id]}
                                </View>
                                <Text numberOfLines={1} style={styles.mediaContextActionLabel}>
                                    {action.label}
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                    {keepFeedback ? (
                        <Text style={styles.mediaContextFeedback}>{keepFeedback}</Text>
                    ) : null}
                </MotionSheet>

                {isTuneOpen && stations.length > 0 ? (
                    <ScrollView
                        contentContainerStyle={styles.samoRadioChannelRow}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                    >
                        {stations.map((station) => (
                            <Pressable
                                accessibilityLabel={`Tune to ${station.name ?? station.id}`}
                                accessibilityRole="button"
                                key={`${station.kind}:${station.id}`}
                                onPress={() => {
                                    setIsTuneOpen(false);
                                    tune(station);
                                }}
                                style={[
                                    styles.samoRadioChannelChip,
                                    state.channel?.id === station.id &&
                                        styles.samoRadioChannelChipActive,
                                ]}
                            >
                                <Text numberOfLines={1} style={styles.samoRadioChannelText}>
                                    {station.name ?? station.id}
                                </Text>
                            </Pressable>
                        ))}
                    </ScrollView>
                ) : null}

                {error ? <Text style={styles.samoRadioError}>{error}</Text> : null}
            </View>
        );
    },
);
SamoRadioDeviceCard.displayName = 'SamoRadioDeviceCard';

/**
 * The samo-radio control surface on the phone.
 *
 * Playback lives on the server, so this is a remote: it renders each device's
 * own state and posts commands back. It polls rather than holding a stream
 * open — a phone that sleeps mid-SSE learns nothing, and a full snapshot every
 * few seconds is both cheaper and always correct on wake.
 */
export const SamoRadioPanel = memo(() => {
    // The device list is shared with the output picker and every long-press
    // menu, so it lives in a store rather than here: this panel is the surface
    // that polls it, not the one that owns it.
    const devices = useSamoRadioSelector((state) => state.devices);
    const stations = useSamoRadioSelector((state) => state.stations);

    // Poll ONLY while the Radio tab is on screen — tab scenes are not unmounted
    // on switch (react-freeze only suspends their rendering), so this panel is
    // often mounted behind a tab nobody is looking at.
    const isRadioTabActive = useAppNavigationSelector((state) => state.activeTab === 'radio');
    useSamoRadioPolling(isRadioTabActive);

    // No device the server can reach right now — a server without samo-radio,
    // one whose device has never been paired, or one that is switched off.
    // Render nothing at all rather than a panel of dead controls explaining a
    // feature this install may not even have.
    if (devices.length === 0) {
        return null;
    }

    return (
        <>
            {devices.map((device) => (
                <SamoRadioDeviceCard device={device} key={device.id} stations={stations} />
            ))}
        </>
    );
});
SamoRadioPanel.displayName = 'SamoRadioPanel';
