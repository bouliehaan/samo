import { useCallback } from 'react';

import {
    buildSamoAudiobookFileUrl,
    ensureSamoAudiobookStreamToken,
    pickSamoAudiobookFileIndex,
} from '/@/renderer/api/samo/samo-audiobook-stream';
import { WebMediaEngine } from '/@/renderer/features/player/audio-player/web-media-engine';
import {
    useAudiobookActions,
    useAudiobookContentUrl,
    useAudiobookFiles,
    useAudiobookItem,
    useAudiobookPosition,
    useAudiobookServer,
    useAudiobookStore,
    useAudiobookStreamOffset,
} from '/@/renderer/store/audiobook.store';
import { ServerType } from '/@/shared/types/domain-types';

export function AudiobookWebPlayer() {
    const contentUrl = useAudiobookContentUrl();
    const resumePosition = useAudiobookPosition();
    const server = useAudiobookServer();
    const item = useAudiobookItem();
    const files = useAudiobookFiles();
    const streamOffsetSeconds = useAudiobookStreamOffset();
    const { release, seekTo } = useAudiobookActions();

    const isSamoAudiobook = server?.type === ServerType.SAMO;

    /**
     * Switch the player to the underlying file that contains `bookPosition` and
     * resume there. With whole-file serving this is how a cross-file seek works:
     * the new file streams whole (mediaFileId) and the media element seeks
     * locally to the in-file remainder. Backward seeks into an earlier file just
     * load that file — no byte-offset restart, so they always succeed.
     */
    const switchToFileAtBookPosition = useCallback(
        async (bookPosition: number) => {
            if (!server || !item?.id || files.length === 0) {
                return;
            }
            const target = Math.max(0, bookPosition);
            const fileIndex = pickSamoAudiobookFileIndex(files, target);
            const file = files[fileIndex];
            if (!file) {
                return;
            }
            const streamToken = await ensureSamoAudiobookStreamToken(server);
            const nextUrl = buildSamoAudiobookFileUrl(
                server,
                item.id,
                file.mediaFileId,
                streamToken,
            );

            // Point the engine at the new file and update the book offset so its
            // progress/seek math stays book-global. position is book-global; the
            // engine subtracts the new offset to seek inside the file.
            useAudiobookStore.setState({
                contentUrl: nextUrl,
                position: target,
                streamOffsetSeconds: file.startOffsetSeconds,
            });
            seekTo(target);
        },
        [files, item, seekTo, server],
    );

    const handleSeekTransport = useCallback(
        (bookPosition: number) => {
            if (isSamoAudiobook && files.length > 0) {
                const fileIndex = pickSamoAudiobookFileIndex(files, bookPosition);
                const file = files[fileIndex];
                // A seek that lands outside the file currently loaded must switch
                // files; otherwise the in-file local seek (handled by the engine)
                // is enough.
                if (file && file.startOffsetSeconds !== streamOffsetSeconds) {
                    void switchToFileAtBookPosition(bookPosition);
                    return;
                }
            }

            seekTo(bookPosition);
        },
        [files, isSamoAudiobook, seekTo, streamOffsetSeconds, switchToFileAtBookPosition],
    );

    /**
     * When the CURRENT FILE ends mid-book, advance to the next file instead of
     * releasing playback. Only the final file's end means the book is over. (The
     * media element only knows its own file's duration now, so it fires "ended"
     * at every file boundary.)
     */
    const handleEnded = useCallback(() => {
        if (isSamoAudiobook && files.length > 0) {
            const currentIndex = files.findIndex(
                (file) => file.startOffsetSeconds === streamOffsetSeconds,
            );
            const nextFile = currentIndex >= 0 ? files[currentIndex + 1] : undefined;
            if (nextFile) {
                void switchToFileAtBookPosition(nextFile.startOffsetSeconds);
                return;
            }
        }
        release();
    }, [files, isSamoAudiobook, release, streamOffsetSeconds, switchToFileAtBookPosition]);

    return (
        <WebMediaEngine
            contentUrl={contentUrl}
            errorMessage="Audiobook playback error. Check the stream URL or server connection."
            isActive={Boolean(contentUrl)}
            mode="abs-resume"
            onEnded={handleEnded}
            onError={() => {
                useAudiobookStore
                    .getState()
                    .actions.setError(
                        'Audiobook playback error. Check the stream URL or server connection.',
                    );
            }}
            onProgress={(playedSeconds) =>
                useAudiobookStore.getState().actions.setPosition(playedSeconds)
            }
            onRestartStreamAt={isSamoAudiobook ? switchToFileAtBookPosition : undefined}
            onSeekTransport={handleSeekTransport}
            ownsPlayback={() => Boolean(useAudiobookStore.getState().contentUrl)}
            releaseOnError={() => release()}
            resetResumeOnEnd={() => {
                // Only the FINAL file's end means the book is finished — resetting
                // the saved resume at an intermediate file boundary would wipe the
                // listener's progress mid-book.
                if (isSamoAudiobook && files.length > 0) {
                    const lastFile = files[files.length - 1];
                    if (lastFile && lastFile.startOffsetSeconds !== streamOffsetSeconds) {
                        return;
                    }
                }
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
