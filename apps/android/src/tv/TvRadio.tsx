import { type SamoRadioDevice } from '@samo/core/server';
import { createContext, useContext } from 'react';
import { FlatList, ScrollView, Text, View } from 'react-native';
import { ArtworkImage } from '../components/ArtworkImage';
import { PlayPauseGlyph, SpeakerGlyph, TrackSkipGlyph } from '../components/Glyphs';
import { useSamoRadioDevice } from '../hooks/use-samo-radio-device';
import { useSamoRadioSelector } from '../state/samo-radio';
import { colors } from '../theme/tokens';
import { type HomeDisplaySection } from '../types/home';
import { TvShelf } from './TvCollections';
import { TvButton, TvFocusScope, TvPressable } from './TvControls';
import { TvTransportButton } from './TvPlayer';
import { tvStyles as s } from './tv-styles';
import { tvDisplayText } from './tv-text';

export type TvRadioPanelSelection = { deviceId: string; kind: 'tune' | 'options' };
export const TvRadioPanelContext = createContext<(panel: TvRadioPanelSelection) => void>(
    () => undefined,
);

function RadioDevice({ device }: { device: SamoRadioDevice }) {
    const radio = useSamoRadioDevice(device);
    const openPanel = useContext(TvRadioPanelContext);
    const id = `radio:${device.id}`;
    const volume = Math.round((radio.state?.volume ?? 0) * 100);
    return (
        <View style={s.radioCard}>
            <View style={s.radioDeviceHeader}>
                <Text numberOfLines={1} style={s.eyebrow}>
                    {device.name}
                </Text>
                <Text style={s.radioDeviceLabel}>samo radio</Text>
            </View>
            <View style={s.radioHead}>
                <ArtworkImage
                    uri={radio.artworkUrl}
                    contentSource={radio.contentSource}
                    letter={device.name.slice(0, 1)}
                    style={s.radioSleeve}
                />
                <View style={s.radioCopy}>
                    <Text style={s.playerEyebrow}>
                        {radio.state?.item
                            ? radio.onChannel
                                ? 'On air'
                                : 'Now playing'
                            : 'Ready when you are'}
                    </Text>
                    <Text numberOfLines={2} style={s.radioTitle}>
                        {tvDisplayText(radio.now?.title) || 'Connecting…'}
                    </Text>
                    <Text numberOfLines={2} style={s.radioMeta}>
                        {radio.state?.item
                            ? tvDisplayText(radio.meta)
                            : 'Choose a station to fill the room.'}
                    </Text>
                    <Text numberOfLines={1} style={s.radioStatus}>
                        {radio.busyCommand
                            ? 'Updating…'
                            : radio.isPaused
                              ? 'Paused'
                              : (radio.state?.channel?.name ?? '')}
                    </Text>
                </View>
            </View>
            {radio.state ? (
                <>
                    <View style={s.radioControls}>
                        <View style={s.radioTransport}>
                            {radio.canStep ? (
                                <TvTransportButton
                                    id={`${id}:previous`}
                                    label={`Previous on ${device.name}`}
                                    onPress={() => radio.sendCommand('previous')}
                                    icon={(color) => (
                                        <TrackSkipGlyph color={color} direction={-1} size={20} />
                                    )}
                                />
                            ) : null}
                            <TvTransportButton
                                id={`${id}:toggle`}
                                label={`${radio.isPaused ? 'Resume' : 'Pause'} ${device.name}`}
                                primary
                                onPress={() =>
                                    radio.sendCommand(radio.isPaused ? 'resume' : 'pause')
                                }
                                icon={(color) => (
                                    <PlayPauseGlyph
                                        color={color}
                                        isPlaying={!radio.isPaused}
                                        size={26}
                                    />
                                )}
                            />
                            {radio.canStep ? (
                                <TvTransportButton
                                    id={`${id}:next`}
                                    label={`Skip on ${device.name}`}
                                    onPress={() => radio.sendCommand('next')}
                                    icon={(color) => (
                                        <TrackSkipGlyph color={color} direction={1} size={20} />
                                    )}
                                />
                            ) : null}
                        </View>
                        <View style={s.radioVolumeGroup}>
                            <SpeakerGlyph color={colors.muted} size={18} />
                            <TvButton
                                id={`${id}:quieter`}
                                label={`Lower volume on ${device.name}`}
                                style={s.volumeStep}
                                onPress={() =>
                                    radio.commitVolume(Math.max(0, radio.state!.volume - 0.05))
                                }
                            >
                                {(focused) => (
                                    <Text
                                        style={[s.volumeStepText, focused && s.buttonTextFocused]}
                                    >
                                        −
                                    </Text>
                                )}
                            </TvButton>
                            <View style={s.radioVolumeReadout}>
                                <Text style={s.radioVolumeLabel}>{volume}%</Text>
                                <View style={s.radioVolumeTrack}>
                                    <View style={[s.radioVolumeFill, { width: `${volume}%` }]} />
                                </View>
                            </View>
                            <TvButton
                                id={`${id}:louder`}
                                label={`Raise volume on ${device.name}`}
                                style={s.volumeStep}
                                onPress={() =>
                                    radio.commitVolume(Math.min(1, radio.state!.volume + 0.05))
                                }
                            >
                                {(focused) => (
                                    <Text
                                        style={[s.volumeStepText, focused && s.buttonTextFocused]}
                                    >
                                        +
                                    </Text>
                                )}
                            </TvButton>
                        </View>
                        <View style={s.radioActions}>
                            <TvButton
                                id={`${id}:tune`}
                                label="Stations"
                                style={s.quietButton}
                                onPress={() => openPanel({ deviceId: device.id, kind: 'tune' })}
                            />
                            <TvButton
                                id={`${id}:options`}
                                label="Options"
                                style={s.quietButton}
                                onPress={() => openPanel({ deviceId: device.id, kind: 'options' })}
                            />
                        </View>
                    </View>
                    {radio.keepFeedback ? (
                        <Text style={s.radioFeedback}>{radio.keepFeedback}</Text>
                    ) : null}
                </>
            ) : (
                <Text style={s.muted}>{device.lastError ?? 'Waiting for the device'}</Text>
            )}
            {radio.error ? <Text style={s.error}>{radio.error}</Text> : null}
        </View>
    );
}

export function TvRadioContent({ sections }: { sections: HomeDisplaySection[] }) {
    const devices = useSamoRadioSelector((state) => state.devices);
    const reach = useSamoRadioSelector((state) => state.reach);
    const stations = sections.filter((section) => section.variant === 'radio');
    return (
        <>
            {devices.length > 1 ? <Text style={s.radioSectionLabel}>Around your home</Text> : null}
            {devices.map((device) => (
                <RadioDevice key={device.id} device={device} />
            ))}
            {reach.status === 'unreachable' ? (
                <Text style={s.emptyText}>{reach.message}</Text>
            ) : null}
            {stations.map((section) => (
                <TvShelf key={section.key} section={{ ...section, title: 'Listen on this TV' }} />
            ))}
            {!devices.length && !stations.length ? (
                <View style={s.radioNotice}>
                    <Text style={s.sectionTitle}>A room full of sound.</Text>
                    <Text style={s.emptyText}>
                        Your stations and connected samo-radio devices will appear here.
                    </Text>
                </View>
            ) : null}
        </>
    );
}

export function TvRadio({ active, sections }: { active: boolean; sections: HomeDisplaySection[] }) {
    const firstDevice = useSamoRadioSelector((state) => state.devices[0]?.id);
    return (
        <TvFocusScope
            active={active}
            defaultFocus={firstDevice ? `radio:${firstDevice}:toggle` : 'radio:first'}
            name="page:radio"
        >
            <ScrollView contentContainerStyle={s.pageScroll} showsVerticalScrollIndicator={false}>
                <View style={s.radioPageHeader}>
                    <Text style={s.pageTitle}>Radio</Text>
                    <Text style={s.muted}>Good sound. Everywhere.</Text>
                </View>
                <TvRadioContent sections={sections} />
            </ScrollView>
        </TvFocusScope>
    );
}

/** An in-tree panel keeps remote events in MainActivity and restores the
 * covered page's remembered focus when it closes. Native Modal has its own
 * Android window, which would bypass the TV key bridge. */
export function TvRadioPanel({
    selection,
    onClose,
}: {
    selection: TvRadioPanelSelection;
    onClose: () => void;
}) {
    const device = useSamoRadioSelector((state) =>
        state.devices.find((item) => item.id === selection.deviceId),
    );
    return (
        <TvFocusScope
            defaultFocus="radio-panel:first"
            name="radio-panel"
            zone="menu"
            forceInitialFocus
        >
            <View style={s.menuBackdrop}>
                <View style={s.menuPanel}>
                    {device ? (
                        <RadioPanelContent device={device} kind={selection.kind} />
                    ) : (
                        <Text style={s.emptyText}>This radio is no longer connected.</Text>
                    )}
                    <TvButton
                        id="radio-panel:close"
                        label="Done"
                        onPress={onClose}
                        style={s.radioPanelClose}
                        pin={{ left: true, right: true, down: true }}
                    />
                </View>
            </View>
        </TvFocusScope>
    );
}

function RadioPanelContent({
    device,
    kind,
}: {
    device: SamoRadioDevice;
    kind: TvRadioPanelSelection['kind'];
}) {
    const radio = useSamoRadioDevice(device);
    const stations = useSamoRadioSelector((state) => state.stations);
    const choices =
        kind === 'tune'
            ? stations.map((station) => ({
                  id: `${station.kind}:${station.id}`,
                  label: station.name ?? station.id,
                  run: () => radio.tune(station),
              }))
            : radio.actions.map((action) => ({
                  id: action.id,
                  label: action.label,
                  run: () => radio.runAction(action.id),
              }));
    return (
        <>
            <Text style={s.eyebrow}>{device.name}</Text>
            <Text style={[s.pageTitle, s.radioPanelTitle]}>
                {kind === 'tune' ? 'Choose a station' : 'Device options'}
            </Text>
            <Text numberOfLines={2} style={s.radioPanelStatus}>
                {radio.busyCommand ? 'Updating…' : (radio.state?.channel?.name ?? radio.now?.title)}
            </Text>
            <FlatList
                data={choices}
                keyExtractor={(choice) => choice.id}
                initialNumToRender={7}
                maxToRenderPerBatch={4}
                windowSize={3}
                removeClippedSubviews={false}
                ListEmptyComponent={<Text style={s.emptyText}>No stations available yet.</Text>}
                renderItem={({ item, index }) => (
                    <TvPressable
                        id={`radio-panel:${item.id}`}
                        label={item.label}
                        onPress={item.run}
                        pin={{ left: true, right: true, up: index === 0 }}
                        style={s.menuItem}
                        focusedStyle={s.menuItemFocused}
                    >
                        {(focused) => (
                            <Text style={[s.menuLabel, focused && s.buttonTextFocused]}>
                                {item.label}
                            </Text>
                        )}
                    </TvPressable>
                )}
            />
            {radio.keepFeedback ? <Text style={s.menuFeedback}>{radio.keepFeedback}</Text> : null}
            {radio.error ? <Text style={s.error}>{radio.error}</Text> : null}
        </>
    );
}
