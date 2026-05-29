import { useCallback } from 'react';

import {
    buildSamoAudiobookContentUrl,
    parseSamoAudiobookStreamOffset,
    samoAudiobookSeekNeedsStreamRestart,
} from '/@/renderer/api/samo/samo-audiobook-stream';
import { ensureSamoAudiobookStreamToken } from '/@/renderer/api/samo/samo-audiobook-stream';
import { WebMediaEngine } from '/@/renderer/features/player/audio-player/web-media-engine';
import {
    useAudiobookActions,
    useAudiobookContentUrl,
    useAudiobookDuration,
    useAudiobookItem,
    useAudiobookPosition,
    useAudiobookServer,
    useAudiobookStore,
} from '/@/renderer/store/audiobook.store';
import { ServerType } from '/@/shared/types/domain-types';

export function AudiobookWebPlayer() {
    const contentUrl = useAudiobookContentUrl();
    const resumePosition = useAudiobookPosition();
    const duration = useAudiobookDuration();
    const server = useAudiobookServer();
    const item = useAudiobookItem();
    const { release, seekTo, setPosition } = useAudiobookActions();

    const isSamoAudiobook = server?.type === ServerType.SAMO;
    const streamOffsetSeconds = isSamoAudiobook
        ? parseSamoAudiobookStreamOffset(contentUrl)
        : 0;

    const restartSamoStreamAt = useCallback(
        async (bookPosition: number) => {
            if (!server || !item?.id) {
                return;
            }

            const target = Math.max(0, Math.floor(bookPosition));
            const streamToken = await ensureSamoAudiobookStreamToken(server);
            const nextUrl = buildSamoAudiobookContentUrl(server, item.id, target, streamToken);

            useAudiobookStore.setState({
                contentUrl: nextUrl,
                position: target,
            });
            seekTo(target);
        },
        [item?.id, seekTo, server],
    );

    const handleSeekTransport = useCallback(
        (bookPosition: number) => {
            const needsRestart =
                isSamoAudiobook &&
                samoAudiobookSeekNeedsStreamRestart(contentUrl, bookPosition, duration);

            // Backward seeks before the stream origin are restarted in WebMediaEngine.
            if (needsRestart && bookPosition >= streamOffsetSeconds - 0.25) {
                void restartSamoStreamAt(bookPosition);
                return;
            }

            seekTo(bookPosition);
        },
        [
            contentUrl,
            duration,
            isSamoAudiobook,
            restartSamoStreamAt,
            seekTo,
            streamOffsetSeconds,
        ],
    );

    return (
        <WebMediaEngine
            contentUrl={contentUrl}
            errorMessage="Audiobook playback error. Check the stream URL or server connection."
            isActive={Boolean(contentUrl)}
            mode="abs-resume"
            onEnded={() => release()}
            onError={() => {
                useAudiobookStore
                    .getState()
                    .actions.setError(
                        'Audiobook playback error. Check the stream URL or server connection.',
                    );
            }}
            onProgress={(playedSeconds) => setPosition(playedSeconds)}
            onRestartStreamAt={isSamoAudiobook ? restartSamoStreamAt : undefined}
            onSeekTransport={handleSeekTransport}
            ownsPlayback={() => Boolean(useAudiobookStore.getState().contentUrl)}
            releaseOnError={() => release()}
            resetResumeOnEnd={() => {
                const { item: currentItem } = useAudiobookStore.getState();
                if (currentItem) {
                    useAudiobookStore.setState((state) => ({
                        resumeByItemId: { ...state.resumeByItemId, [currentItem.id]: 0 },
                    }));
                }
            }}
            resumePosition={resumePosition}
            streamOffsetSeconds={streamOffsetSeconds}
        />
    );
}
