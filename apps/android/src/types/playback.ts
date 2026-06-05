import { type MobilePlayableAudio } from '@samo/core/mobile';

import {
    type AndroidAudioDeviceInfo,
    type AndroidNativePlaybackEvent,
    type AndroidPlaybackTruth,
} from '../services/audio-playback';

export type AndroidPlaybackStatus =
    | 'loading'
    | Exclude<AndroidNativePlaybackEvent['status'], 'idle'>;

export type AndroidPlaybackState =
    | {
          bitPerfect?: AndroidPlaybackTruth;
          deviceInfo?: AndroidAudioDeviceInfo;
          durationMs?: number;
          item: MobilePlayableAudio;
          message?: string;
          /** Wall-clock ms the pending seek was dispatched. */
          pendingSeekAtMs?: number;
          /** Optimistic seek target while the engine confirms the new position. */
          pendingSeekTargetMs?: number;
          positionMs?: number;
          sessionId: string;
          status: AndroidPlaybackStatus;
      }
    | {
          status: 'idle';
      };

export type ActiveAndroidPlaybackState = Exclude<AndroidPlaybackState, { status: 'idle' }>;
