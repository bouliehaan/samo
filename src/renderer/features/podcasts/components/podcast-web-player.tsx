import { parseSamoAudiobookStreamOffset } from '/@/renderer/api/samo/samo-audiobook-stream';
import { WebMediaEngine } from '/@/renderer/features/player/audio-player/web-media-engine';
import {
    usePodcastActions,
    usePodcastContentUrl,
    usePodcastPosition,
    usePodcastServer,
    usePodcastStore,
} from '/@/renderer/store/podcast.store';
import { ServerType } from '/@/shared/types/domain-types';

export function PodcastWebPlayer() {
    const contentUrl = usePodcastContentUrl();
    const resumePosition = usePodcastPosition();
    const server = usePodcastServer();
    const { release, seekTo, setPosition } = usePodcastActions();
    const streamOffsetSeconds =
        server?.type === ServerType.SAMO ? parseSamoAudiobookStreamOffset(contentUrl) : 0;

    return (
        <WebMediaEngine
            contentUrl={contentUrl}
            errorMessage="Podcast playback error. Check the stream URL or server connection."
            isActive={Boolean(contentUrl)}
            mode="abs-resume"
            onEnded={() => release()}
            onError={() => {
                usePodcastStore
                    .getState()
                    .actions.setError(
                        'Podcast playback error. Check the stream URL or server connection.',
                    );
            }}
            onProgress={(playedSeconds) => setPosition(playedSeconds)}
            onSeekTransport={seekTo}
            ownsPlayback={() => Boolean(usePodcastStore.getState().contentUrl)}
            releaseOnError={() => release()}
            resetResumeOnEnd={() => {
                const { episode, item } = usePodcastStore.getState();
                if (item && episode) {
                    usePodcastStore.setState((state) => ({
                        resumeByEpisodeKey: {
                            ...state.resumeByEpisodeKey,
                            [`${item.id}::${episode.id}`]: 0,
                        },
                    }));
                }
            }}
            resumePosition={resumePosition}
            streamOffsetSeconds={streamOffsetSeconds}
        />
    );
}
