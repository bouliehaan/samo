import { TranscodingConfig } from '/@/renderer/store';
import { QueueSong } from '/@/shared/types/domain-types';
export declare function useSongUrl(song: QueueSong | undefined, current: boolean, transcode: TranscodingConfig, enabled?: boolean): string | undefined;
export declare const getSongUrl: (song: QueueSong, transcode: TranscodingConfig, skipAutoTranscode?: boolean) => Promise<string>;
