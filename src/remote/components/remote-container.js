import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import formatDuration from 'format-duration';
import debounce from 'lodash/debounce';
import { useCallback } from 'react';
import { RiPauseFill, RiPlayFill, RiVolumeUpFill } from 'react-icons/ri';
import { PlayerImage } from '/@/remote/components/player-image';
import { WrappedSlider } from '/@/remote/components/wrapped-slider';
import { useInfo, useSend, useShowImage } from '/@/remote/store';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
import { Flex } from '/@/shared/components/flex/flex';
import { Group } from '/@/shared/components/group/group';
import { Rating } from '/@/shared/components/rating/rating';
import { Stack } from '/@/shared/components/stack/stack';
import { Text } from '/@/shared/components/text/text';
import { Tooltip } from '/@/shared/components/tooltip/tooltip';
import { PlayerRepeat, PlayerStatus } from '/@/shared/types/types';
export const RemoteContainer = () => {
    const { position, repeat, shuffle, song, status, volume } = useInfo();
    const send = useSend();
    const showImage = useShowImage();
    const id = song?.id;
    const setRating = useCallback((rating) => {
        send({ event: 'rating', id: id, rating });
    }, [send, id]);
    const debouncedSetRating = debounce(setRating, 400);
    return (_jsxs(Stack, { gap: "md", h: "100dvh", w: "100%", children: [showImage && (_jsx(Flex, { align: "center", justify: "center", w: "100%", children: _jsx(PlayerImage, { src: song?.imageUrl }) })), id && (_jsxs(Stack, { gap: "xs", children: [_jsx(Text, { fw: 700, size: "xl", style: {
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }, children: song.name }), _jsx(Text, { isMuted: true, style: {
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }, children: song.album }), _jsx(Text, { isMuted: true, style: {
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }, children: song.artistName }), _jsxs(Group, { justify: "space-between", children: [song.releaseDate && (_jsx(Text, { isMuted: true, children: new Date(song.releaseDate).toLocaleDateString() })), _jsxs(Text, { isMuted: true, children: ["Plays: ", song.playCount] })] })] })), _jsxs(Group, { gap: 0, grow: true, children: [_jsx(ActionIcon, { disabled: !id, icon: "favorite", iconProps: {
                            fill: song?.userFavorite ? 'primary' : 'default',
                        }, onClick: () => {
                            if (!id)
                                return;
                            send({ event: 'favorite', favorite: !song.userFavorite, id });
                        }, tooltip: {
                            label: song?.userFavorite ? 'Unfavorite' : 'Favorite',
                        }, variant: "transparent" }), (song?._serverType === 'navidrome' || song?._serverType === 'subsonic') && (_jsx("div", { style: { margin: 'auto' }, children: _jsx(Tooltip, { label: "Double click to clear", openDelay: 1000, children: _jsx(Rating, { onChange: debouncedSetRating, onDoubleClick: () => debouncedSetRating(0), style: { margin: 'auto' }, value: song.userRating ?? 0 }) }) }))] }), _jsxs(Group, { gap: "xs", grow: true, children: [_jsx(ActionIcon, { disabled: !id, icon: "mediaPrevious", iconProps: {
                            fill: 'default',
                            size: 'lg',
                        }, onClick: () => send({ event: 'previous' }), tooltip: {
                            label: 'Previous track',
                        }, variant: "default" }), _jsx(ActionIcon, { disabled: !id, onClick: () => {
                            if (status === PlayerStatus.PLAYING) {
                                send({ event: 'pause' });
                            }
                            else if (status === PlayerStatus.PAUSED) {
                                send({ event: 'play' });
                            }
                        }, tooltip: {
                            label: id && status === PlayerStatus.PLAYING ? 'Pause' : 'Play',
                        }, variant: "default", children: id && status === PlayerStatus.PLAYING ? (_jsx(RiPauseFill, { size: 25 })) : (_jsx(RiPlayFill, { size: 25 })) }), _jsx(ActionIcon, { disabled: !id, icon: "mediaNext", iconProps: {
                            fill: 'default',
                            size: 'lg',
                        }, onClick: () => send({ event: 'next' }), tooltip: {
                            label: 'Next track',
                        }, variant: "default" })] }), _jsxs(Group, { gap: "xs", grow: true, children: [_jsx(ActionIcon, { icon: "mediaShuffle", iconProps: {
                            fill: shuffle ? 'primary' : 'default',
                            size: 'lg',
                        }, onClick: () => send({ event: 'shuffle' }), tooltip: {
                            label: shuffle ? 'Shuffle tracks' : 'Shuffle disabled',
                        }, variant: "default" }), _jsx(ActionIcon, { icon: repeat === undefined || repeat === PlayerRepeat.ONE
                            ? 'mediaRepeatOne'
                            : 'mediaRepeat', iconProps: {
                            fill: repeat !== undefined && repeat !== PlayerRepeat.NONE
                                ? 'primary'
                                : 'default',
                            size: 'lg',
                        }, onClick: () => send({ event: 'repeat' }), tooltip: {
                            label: `Repeat ${repeat === PlayerRepeat.ONE
                                ? 'One'
                                : repeat === PlayerRepeat.ALL
                                    ? 'all'
                                    : 'none'}`,
                        }, variant: "default" })] }), _jsxs(Stack, { gap: "lg", children: [id && position !== undefined && (_jsx(WrappedSlider, { label: (value) => formatDuration(value * 1e3), leftLabel: formatDuration(position * 1e3), max: song.duration / 1e3, onChangeEnd: (e) => send({ event: 'position', position: e }), rightLabel: formatDuration(song.duration), value: position })), _jsx(WrappedSlider, { leftLabel: _jsx(RiVolumeUpFill, { size: 20 }), max: 100, onChangeEnd: (e) => send({ event: 'volume', volume: e }), rightLabel: _jsx(Text, { fw: 600, size: "xs", children: volume ?? 0 }), value: volume ?? 0 })] })] }));
};
