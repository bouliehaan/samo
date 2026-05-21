import { z } from 'zod';
import { ServerListItemWithCredential } from '/@/shared/types/domain-types';
export declare const contract: {
    addToPlaylist: {
        method: "POST";
        body: z.ZodNull;
        query: z.ZodObject<{
            Ids: z.ZodString;
            UserId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            Ids: string;
            UserId: string;
        }, {
            Ids: string;
            UserId: string;
        }>;
        path: "playlists/:id/items";
        responses: {
            204: z.ZodObject<{
                Added: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                Added: number;
            }, {
                Added: number;
            }>;
            400: z.ZodObject<{
                errors: z.ZodObject<{
                    recursive: z.ZodArray<z.ZodString, "many">;
                }, "strip", z.ZodTypeAny, {
                    recursive: string[];
                }, {
                    recursive: string[];
                }>;
                status: z.ZodNumber;
                title: z.ZodString;
                traceId: z.ZodString;
                type: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                title: string;
                type: string;
                status: number;
                errors: {
                    recursive: string[];
                };
                traceId: string;
            }, {
                title: string;
                type: string;
                status: number;
                errors: {
                    recursive: string[];
                };
                traceId: string;
            }>;
        };
    };
    authenticate: {
        method: "POST";
        body: z.ZodObject<{
            Pw: z.ZodString;
            Username: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            Pw: string;
            Username: string;
        }, {
            Pw: string;
            Username: string;
        }>;
        path: "users/authenticatebyname";
        responses: {
            200: z.ZodObject<{
                AccessToken: z.ZodString;
                ServerId: z.ZodString;
                SessionInfo: z.ZodObject<{
                    AdditionalUsers: z.ZodArray<z.ZodAny, "many">;
                    ApplicationVersion: z.ZodString;
                    Capabilities: z.ZodObject<{
                        PlayableMediaTypes: z.ZodArray<z.ZodAny, "many">;
                        SupportedCommands: z.ZodArray<z.ZodAny, "many">;
                        SupportsContentUploading: z.ZodBoolean;
                        SupportsMediaControl: z.ZodBoolean;
                        SupportsPersistentIdentifier: z.ZodBoolean;
                        SupportsSync: z.ZodBoolean;
                    }, "strip", z.ZodTypeAny, {
                        PlayableMediaTypes: any[];
                        SupportedCommands: any[];
                        SupportsContentUploading: boolean;
                        SupportsMediaControl: boolean;
                        SupportsPersistentIdentifier: boolean;
                        SupportsSync: boolean;
                    }, {
                        PlayableMediaTypes: any[];
                        SupportedCommands: any[];
                        SupportsContentUploading: boolean;
                        SupportsMediaControl: boolean;
                        SupportsPersistentIdentifier: boolean;
                        SupportsSync: boolean;
                    }>;
                    Client: z.ZodString;
                    DeviceId: z.ZodString;
                    DeviceName: z.ZodString;
                    HasCustomDeviceName: z.ZodBoolean;
                    Id: z.ZodString;
                    IsActive: z.ZodBoolean;
                    LastActivityDate: z.ZodString;
                    LastPlaybackCheckIn: z.ZodString;
                    NowPlayingQueue: z.ZodArray<z.ZodAny, "many">;
                    NowPlayingQueueFullItems: z.ZodArray<z.ZodAny, "many">;
                    PlayableMediaTypes: z.ZodArray<z.ZodAny, "many">;
                    PlayState: z.ZodObject<{
                        CanSeek: z.ZodBoolean;
                        IsMuted: z.ZodBoolean;
                        IsPaused: z.ZodBoolean;
                        PositionTicks: z.ZodOptional<z.ZodNumber>;
                        RepeatMode: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        IsPaused: boolean;
                        CanSeek: boolean;
                        IsMuted: boolean;
                        RepeatMode: string;
                        PositionTicks?: number | undefined;
                    }, {
                        IsPaused: boolean;
                        CanSeek: boolean;
                        IsMuted: boolean;
                        RepeatMode: string;
                        PositionTicks?: number | undefined;
                    }>;
                    RemoteEndPoint: z.ZodString;
                    ServerId: z.ZodString;
                    SupportedCommands: z.ZodArray<z.ZodAny, "many">;
                    SupportsMediaControl: z.ZodBoolean;
                    SupportsRemoteControl: z.ZodBoolean;
                    UserId: z.ZodString;
                    UserName: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    UserId: string;
                    Id: string;
                    NowPlayingQueue: any[];
                    ServerId: string;
                    AdditionalUsers: any[];
                    ApplicationVersion: string;
                    Capabilities: {
                        PlayableMediaTypes: any[];
                        SupportedCommands: any[];
                        SupportsContentUploading: boolean;
                        SupportsMediaControl: boolean;
                        SupportsPersistentIdentifier: boolean;
                        SupportsSync: boolean;
                    };
                    PlayableMediaTypes: any[];
                    SupportedCommands: any[];
                    SupportsMediaControl: boolean;
                    Client: string;
                    DeviceId: string;
                    DeviceName: string;
                    HasCustomDeviceName: boolean;
                    IsActive: boolean;
                    LastActivityDate: string;
                    LastPlaybackCheckIn: string;
                    NowPlayingQueueFullItems: any[];
                    PlayState: {
                        IsPaused: boolean;
                        CanSeek: boolean;
                        IsMuted: boolean;
                        RepeatMode: string;
                        PositionTicks?: number | undefined;
                    };
                    RemoteEndPoint: string;
                    SupportsRemoteControl: boolean;
                    UserName: string;
                }, {
                    UserId: string;
                    Id: string;
                    NowPlayingQueue: any[];
                    ServerId: string;
                    AdditionalUsers: any[];
                    ApplicationVersion: string;
                    Capabilities: {
                        PlayableMediaTypes: any[];
                        SupportedCommands: any[];
                        SupportsContentUploading: boolean;
                        SupportsMediaControl: boolean;
                        SupportsPersistentIdentifier: boolean;
                        SupportsSync: boolean;
                    };
                    PlayableMediaTypes: any[];
                    SupportedCommands: any[];
                    SupportsMediaControl: boolean;
                    Client: string;
                    DeviceId: string;
                    DeviceName: string;
                    HasCustomDeviceName: boolean;
                    IsActive: boolean;
                    LastActivityDate: string;
                    LastPlaybackCheckIn: string;
                    NowPlayingQueueFullItems: any[];
                    PlayState: {
                        IsPaused: boolean;
                        CanSeek: boolean;
                        IsMuted: boolean;
                        RepeatMode: string;
                        PositionTicks?: number | undefined;
                    };
                    RemoteEndPoint: string;
                    SupportsRemoteControl: boolean;
                    UserName: string;
                }>;
                User: z.ZodObject<{
                    Configuration: z.ZodObject<{
                        DisplayCollectionsView: z.ZodBoolean;
                        DisplayMissingEpisodes: z.ZodBoolean;
                        EnableLocalPassword: z.ZodBoolean;
                        EnableNextEpisodeAutoPlay: z.ZodBoolean;
                        GroupedFolders: z.ZodArray<z.ZodAny, "many">;
                        HidePlayedInLatest: z.ZodBoolean;
                        LatestItemsExcludes: z.ZodArray<z.ZodAny, "many">;
                        MyMediaExcludes: z.ZodArray<z.ZodAny, "many">;
                        OrderedViews: z.ZodArray<z.ZodAny, "many">;
                        PlayDefaultAudioTrack: z.ZodBoolean;
                        RememberAudioSelections: z.ZodBoolean;
                        RememberSubtitleSelections: z.ZodBoolean;
                        SubtitleLanguagePreference: z.ZodString;
                        SubtitleMode: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        DisplayCollectionsView: boolean;
                        DisplayMissingEpisodes: boolean;
                        EnableLocalPassword: boolean;
                        EnableNextEpisodeAutoPlay: boolean;
                        GroupedFolders: any[];
                        HidePlayedInLatest: boolean;
                        LatestItemsExcludes: any[];
                        MyMediaExcludes: any[];
                        OrderedViews: any[];
                        PlayDefaultAudioTrack: boolean;
                        RememberAudioSelections: boolean;
                        RememberSubtitleSelections: boolean;
                        SubtitleLanguagePreference: string;
                        SubtitleMode: string;
                    }, {
                        DisplayCollectionsView: boolean;
                        DisplayMissingEpisodes: boolean;
                        EnableLocalPassword: boolean;
                        EnableNextEpisodeAutoPlay: boolean;
                        GroupedFolders: any[];
                        HidePlayedInLatest: boolean;
                        LatestItemsExcludes: any[];
                        MyMediaExcludes: any[];
                        OrderedViews: any[];
                        PlayDefaultAudioTrack: boolean;
                        RememberAudioSelections: boolean;
                        RememberSubtitleSelections: boolean;
                        SubtitleLanguagePreference: string;
                        SubtitleMode: string;
                    }>;
                    EnableAutoLogin: z.ZodBoolean;
                    HasConfiguredEasyPassword: z.ZodBoolean;
                    HasConfiguredPassword: z.ZodBoolean;
                    HasPassword: z.ZodBoolean;
                    Id: z.ZodString;
                    LastActivityDate: z.ZodString;
                    LastLoginDate: z.ZodString;
                    Name: z.ZodString;
                    Policy: z.ZodObject<{
                        AccessSchedules: z.ZodArray<z.ZodAny, "many">;
                        AuthenticationProviderId: z.ZodString;
                        BlockedChannels: z.ZodArray<z.ZodAny, "many">;
                        BlockedMediaFolders: z.ZodArray<z.ZodAny, "many">;
                        BlockedTags: z.ZodArray<z.ZodAny, "many">;
                        BlockUnratedItems: z.ZodArray<z.ZodAny, "many">;
                        EnableAllChannels: z.ZodBoolean;
                        EnableAllDevices: z.ZodBoolean;
                        EnableAllFolders: z.ZodBoolean;
                        EnableAudioPlaybackTranscoding: z.ZodBoolean;
                        EnableContentDeletion: z.ZodBoolean;
                        EnableContentDeletionFromFolders: z.ZodArray<z.ZodAny, "many">;
                        EnableContentDownloading: z.ZodBoolean;
                        EnabledChannels: z.ZodArray<z.ZodAny, "many">;
                        EnabledDevices: z.ZodArray<z.ZodAny, "many">;
                        EnabledFolders: z.ZodArray<z.ZodAny, "many">;
                        EnableLiveTvAccess: z.ZodBoolean;
                        EnableLiveTvManagement: z.ZodBoolean;
                        EnableMediaConversion: z.ZodBoolean;
                        EnableMediaPlayback: z.ZodBoolean;
                        EnablePlaybackRemuxing: z.ZodBoolean;
                        EnablePublicSharing: z.ZodBoolean;
                        EnableRemoteAccess: z.ZodBoolean;
                        EnableRemoteControlOfOtherUsers: z.ZodBoolean;
                        EnableSharedDeviceControl: z.ZodBoolean;
                        EnableSyncTranscoding: z.ZodBoolean;
                        EnableUserPreferenceAccess: z.ZodBoolean;
                        EnableVideoPlaybackTranscoding: z.ZodBoolean;
                        ForceRemoteSourceTranscoding: z.ZodBoolean;
                        InvalidLoginAttemptCount: z.ZodNumber;
                        IsAdministrator: z.ZodBoolean;
                        IsDisabled: z.ZodBoolean;
                        IsHidden: z.ZodBoolean;
                        LoginAttemptsBeforeLockout: z.ZodNumber;
                        MaxActiveSessions: z.ZodNumber;
                        PasswordResetProviderId: z.ZodString;
                        RemoteClientBitrateLimit: z.ZodNumber;
                        SyncPlayAccess: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        AccessSchedules: any[];
                        AuthenticationProviderId: string;
                        BlockedChannels: any[];
                        BlockedMediaFolders: any[];
                        BlockedTags: any[];
                        BlockUnratedItems: any[];
                        EnableAllChannels: boolean;
                        EnableAllDevices: boolean;
                        EnableAllFolders: boolean;
                        EnableAudioPlaybackTranscoding: boolean;
                        EnableContentDeletion: boolean;
                        EnableContentDeletionFromFolders: any[];
                        EnableContentDownloading: boolean;
                        EnabledChannels: any[];
                        EnabledDevices: any[];
                        EnabledFolders: any[];
                        EnableLiveTvAccess: boolean;
                        EnableLiveTvManagement: boolean;
                        EnableMediaConversion: boolean;
                        EnableMediaPlayback: boolean;
                        EnablePlaybackRemuxing: boolean;
                        EnablePublicSharing: boolean;
                        EnableRemoteAccess: boolean;
                        EnableRemoteControlOfOtherUsers: boolean;
                        EnableSharedDeviceControl: boolean;
                        EnableSyncTranscoding: boolean;
                        EnableUserPreferenceAccess: boolean;
                        EnableVideoPlaybackTranscoding: boolean;
                        ForceRemoteSourceTranscoding: boolean;
                        InvalidLoginAttemptCount: number;
                        IsAdministrator: boolean;
                        IsDisabled: boolean;
                        IsHidden: boolean;
                        LoginAttemptsBeforeLockout: number;
                        MaxActiveSessions: number;
                        PasswordResetProviderId: string;
                        RemoteClientBitrateLimit: number;
                        SyncPlayAccess: string;
                    }, {
                        AccessSchedules: any[];
                        AuthenticationProviderId: string;
                        BlockedChannels: any[];
                        BlockedMediaFolders: any[];
                        BlockedTags: any[];
                        BlockUnratedItems: any[];
                        EnableAllChannels: boolean;
                        EnableAllDevices: boolean;
                        EnableAllFolders: boolean;
                        EnableAudioPlaybackTranscoding: boolean;
                        EnableContentDeletion: boolean;
                        EnableContentDeletionFromFolders: any[];
                        EnableContentDownloading: boolean;
                        EnabledChannels: any[];
                        EnabledDevices: any[];
                        EnabledFolders: any[];
                        EnableLiveTvAccess: boolean;
                        EnableLiveTvManagement: boolean;
                        EnableMediaConversion: boolean;
                        EnableMediaPlayback: boolean;
                        EnablePlaybackRemuxing: boolean;
                        EnablePublicSharing: boolean;
                        EnableRemoteAccess: boolean;
                        EnableRemoteControlOfOtherUsers: boolean;
                        EnableSharedDeviceControl: boolean;
                        EnableSyncTranscoding: boolean;
                        EnableUserPreferenceAccess: boolean;
                        EnableVideoPlaybackTranscoding: boolean;
                        ForceRemoteSourceTranscoding: boolean;
                        InvalidLoginAttemptCount: number;
                        IsAdministrator: boolean;
                        IsDisabled: boolean;
                        IsHidden: boolean;
                        LoginAttemptsBeforeLockout: number;
                        MaxActiveSessions: number;
                        PasswordResetProviderId: string;
                        RemoteClientBitrateLimit: number;
                        SyncPlayAccess: string;
                    }>;
                    ServerId: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    Name: string;
                    Id: string;
                    ServerId: string;
                    LastActivityDate: string;
                    Configuration: {
                        DisplayCollectionsView: boolean;
                        DisplayMissingEpisodes: boolean;
                        EnableLocalPassword: boolean;
                        EnableNextEpisodeAutoPlay: boolean;
                        GroupedFolders: any[];
                        HidePlayedInLatest: boolean;
                        LatestItemsExcludes: any[];
                        MyMediaExcludes: any[];
                        OrderedViews: any[];
                        PlayDefaultAudioTrack: boolean;
                        RememberAudioSelections: boolean;
                        RememberSubtitleSelections: boolean;
                        SubtitleLanguagePreference: string;
                        SubtitleMode: string;
                    };
                    EnableAutoLogin: boolean;
                    HasConfiguredEasyPassword: boolean;
                    HasConfiguredPassword: boolean;
                    HasPassword: boolean;
                    LastLoginDate: string;
                    Policy: {
                        AccessSchedules: any[];
                        AuthenticationProviderId: string;
                        BlockedChannels: any[];
                        BlockedMediaFolders: any[];
                        BlockedTags: any[];
                        BlockUnratedItems: any[];
                        EnableAllChannels: boolean;
                        EnableAllDevices: boolean;
                        EnableAllFolders: boolean;
                        EnableAudioPlaybackTranscoding: boolean;
                        EnableContentDeletion: boolean;
                        EnableContentDeletionFromFolders: any[];
                        EnableContentDownloading: boolean;
                        EnabledChannels: any[];
                        EnabledDevices: any[];
                        EnabledFolders: any[];
                        EnableLiveTvAccess: boolean;
                        EnableLiveTvManagement: boolean;
                        EnableMediaConversion: boolean;
                        EnableMediaPlayback: boolean;
                        EnablePlaybackRemuxing: boolean;
                        EnablePublicSharing: boolean;
                        EnableRemoteAccess: boolean;
                        EnableRemoteControlOfOtherUsers: boolean;
                        EnableSharedDeviceControl: boolean;
                        EnableSyncTranscoding: boolean;
                        EnableUserPreferenceAccess: boolean;
                        EnableVideoPlaybackTranscoding: boolean;
                        ForceRemoteSourceTranscoding: boolean;
                        InvalidLoginAttemptCount: number;
                        IsAdministrator: boolean;
                        IsDisabled: boolean;
                        IsHidden: boolean;
                        LoginAttemptsBeforeLockout: number;
                        MaxActiveSessions: number;
                        PasswordResetProviderId: string;
                        RemoteClientBitrateLimit: number;
                        SyncPlayAccess: string;
                    };
                }, {
                    Name: string;
                    Id: string;
                    ServerId: string;
                    LastActivityDate: string;
                    Configuration: {
                        DisplayCollectionsView: boolean;
                        DisplayMissingEpisodes: boolean;
                        EnableLocalPassword: boolean;
                        EnableNextEpisodeAutoPlay: boolean;
                        GroupedFolders: any[];
                        HidePlayedInLatest: boolean;
                        LatestItemsExcludes: any[];
                        MyMediaExcludes: any[];
                        OrderedViews: any[];
                        PlayDefaultAudioTrack: boolean;
                        RememberAudioSelections: boolean;
                        RememberSubtitleSelections: boolean;
                        SubtitleLanguagePreference: string;
                        SubtitleMode: string;
                    };
                    EnableAutoLogin: boolean;
                    HasConfiguredEasyPassword: boolean;
                    HasConfiguredPassword: boolean;
                    HasPassword: boolean;
                    LastLoginDate: string;
                    Policy: {
                        AccessSchedules: any[];
                        AuthenticationProviderId: string;
                        BlockedChannels: any[];
                        BlockedMediaFolders: any[];
                        BlockedTags: any[];
                        BlockUnratedItems: any[];
                        EnableAllChannels: boolean;
                        EnableAllDevices: boolean;
                        EnableAllFolders: boolean;
                        EnableAudioPlaybackTranscoding: boolean;
                        EnableContentDeletion: boolean;
                        EnableContentDeletionFromFolders: any[];
                        EnableContentDownloading: boolean;
                        EnabledChannels: any[];
                        EnabledDevices: any[];
                        EnabledFolders: any[];
                        EnableLiveTvAccess: boolean;
                        EnableLiveTvManagement: boolean;
                        EnableMediaConversion: boolean;
                        EnableMediaPlayback: boolean;
                        EnablePlaybackRemuxing: boolean;
                        EnablePublicSharing: boolean;
                        EnableRemoteAccess: boolean;
                        EnableRemoteControlOfOtherUsers: boolean;
                        EnableSharedDeviceControl: boolean;
                        EnableSyncTranscoding: boolean;
                        EnableUserPreferenceAccess: boolean;
                        EnableVideoPlaybackTranscoding: boolean;
                        ForceRemoteSourceTranscoding: boolean;
                        InvalidLoginAttemptCount: number;
                        IsAdministrator: boolean;
                        IsDisabled: boolean;
                        IsHidden: boolean;
                        LoginAttemptsBeforeLockout: number;
                        MaxActiveSessions: number;
                        PasswordResetProviderId: string;
                        RemoteClientBitrateLimit: number;
                        SyncPlayAccess: string;
                    };
                }>;
            }, "strip", z.ZodTypeAny, {
                ServerId: string;
                AccessToken: string;
                SessionInfo: {
                    UserId: string;
                    Id: string;
                    NowPlayingQueue: any[];
                    ServerId: string;
                    AdditionalUsers: any[];
                    ApplicationVersion: string;
                    Capabilities: {
                        PlayableMediaTypes: any[];
                        SupportedCommands: any[];
                        SupportsContentUploading: boolean;
                        SupportsMediaControl: boolean;
                        SupportsPersistentIdentifier: boolean;
                        SupportsSync: boolean;
                    };
                    PlayableMediaTypes: any[];
                    SupportedCommands: any[];
                    SupportsMediaControl: boolean;
                    Client: string;
                    DeviceId: string;
                    DeviceName: string;
                    HasCustomDeviceName: boolean;
                    IsActive: boolean;
                    LastActivityDate: string;
                    LastPlaybackCheckIn: string;
                    NowPlayingQueueFullItems: any[];
                    PlayState: {
                        IsPaused: boolean;
                        CanSeek: boolean;
                        IsMuted: boolean;
                        RepeatMode: string;
                        PositionTicks?: number | undefined;
                    };
                    RemoteEndPoint: string;
                    SupportsRemoteControl: boolean;
                    UserName: string;
                };
                User: {
                    Name: string;
                    Id: string;
                    ServerId: string;
                    LastActivityDate: string;
                    Configuration: {
                        DisplayCollectionsView: boolean;
                        DisplayMissingEpisodes: boolean;
                        EnableLocalPassword: boolean;
                        EnableNextEpisodeAutoPlay: boolean;
                        GroupedFolders: any[];
                        HidePlayedInLatest: boolean;
                        LatestItemsExcludes: any[];
                        MyMediaExcludes: any[];
                        OrderedViews: any[];
                        PlayDefaultAudioTrack: boolean;
                        RememberAudioSelections: boolean;
                        RememberSubtitleSelections: boolean;
                        SubtitleLanguagePreference: string;
                        SubtitleMode: string;
                    };
                    EnableAutoLogin: boolean;
                    HasConfiguredEasyPassword: boolean;
                    HasConfiguredPassword: boolean;
                    HasPassword: boolean;
                    LastLoginDate: string;
                    Policy: {
                        AccessSchedules: any[];
                        AuthenticationProviderId: string;
                        BlockedChannels: any[];
                        BlockedMediaFolders: any[];
                        BlockedTags: any[];
                        BlockUnratedItems: any[];
                        EnableAllChannels: boolean;
                        EnableAllDevices: boolean;
                        EnableAllFolders: boolean;
                        EnableAudioPlaybackTranscoding: boolean;
                        EnableContentDeletion: boolean;
                        EnableContentDeletionFromFolders: any[];
                        EnableContentDownloading: boolean;
                        EnabledChannels: any[];
                        EnabledDevices: any[];
                        EnabledFolders: any[];
                        EnableLiveTvAccess: boolean;
                        EnableLiveTvManagement: boolean;
                        EnableMediaConversion: boolean;
                        EnableMediaPlayback: boolean;
                        EnablePlaybackRemuxing: boolean;
                        EnablePublicSharing: boolean;
                        EnableRemoteAccess: boolean;
                        EnableRemoteControlOfOtherUsers: boolean;
                        EnableSharedDeviceControl: boolean;
                        EnableSyncTranscoding: boolean;
                        EnableUserPreferenceAccess: boolean;
                        EnableVideoPlaybackTranscoding: boolean;
                        ForceRemoteSourceTranscoding: boolean;
                        InvalidLoginAttemptCount: number;
                        IsAdministrator: boolean;
                        IsDisabled: boolean;
                        IsHidden: boolean;
                        LoginAttemptsBeforeLockout: number;
                        MaxActiveSessions: number;
                        PasswordResetProviderId: string;
                        RemoteClientBitrateLimit: number;
                        SyncPlayAccess: string;
                    };
                };
            }, {
                ServerId: string;
                AccessToken: string;
                SessionInfo: {
                    UserId: string;
                    Id: string;
                    NowPlayingQueue: any[];
                    ServerId: string;
                    AdditionalUsers: any[];
                    ApplicationVersion: string;
                    Capabilities: {
                        PlayableMediaTypes: any[];
                        SupportedCommands: any[];
                        SupportsContentUploading: boolean;
                        SupportsMediaControl: boolean;
                        SupportsPersistentIdentifier: boolean;
                        SupportsSync: boolean;
                    };
                    PlayableMediaTypes: any[];
                    SupportedCommands: any[];
                    SupportsMediaControl: boolean;
                    Client: string;
                    DeviceId: string;
                    DeviceName: string;
                    HasCustomDeviceName: boolean;
                    IsActive: boolean;
                    LastActivityDate: string;
                    LastPlaybackCheckIn: string;
                    NowPlayingQueueFullItems: any[];
                    PlayState: {
                        IsPaused: boolean;
                        CanSeek: boolean;
                        IsMuted: boolean;
                        RepeatMode: string;
                        PositionTicks?: number | undefined;
                    };
                    RemoteEndPoint: string;
                    SupportsRemoteControl: boolean;
                    UserName: string;
                };
                User: {
                    Name: string;
                    Id: string;
                    ServerId: string;
                    LastActivityDate: string;
                    Configuration: {
                        DisplayCollectionsView: boolean;
                        DisplayMissingEpisodes: boolean;
                        EnableLocalPassword: boolean;
                        EnableNextEpisodeAutoPlay: boolean;
                        GroupedFolders: any[];
                        HidePlayedInLatest: boolean;
                        LatestItemsExcludes: any[];
                        MyMediaExcludes: any[];
                        OrderedViews: any[];
                        PlayDefaultAudioTrack: boolean;
                        RememberAudioSelections: boolean;
                        RememberSubtitleSelections: boolean;
                        SubtitleLanguagePreference: string;
                        SubtitleMode: string;
                    };
                    EnableAutoLogin: boolean;
                    HasConfiguredEasyPassword: boolean;
                    HasConfiguredPassword: boolean;
                    HasPassword: boolean;
                    LastLoginDate: string;
                    Policy: {
                        AccessSchedules: any[];
                        AuthenticationProviderId: string;
                        BlockedChannels: any[];
                        BlockedMediaFolders: any[];
                        BlockedTags: any[];
                        BlockUnratedItems: any[];
                        EnableAllChannels: boolean;
                        EnableAllDevices: boolean;
                        EnableAllFolders: boolean;
                        EnableAudioPlaybackTranscoding: boolean;
                        EnableContentDeletion: boolean;
                        EnableContentDeletionFromFolders: any[];
                        EnableContentDownloading: boolean;
                        EnabledChannels: any[];
                        EnabledDevices: any[];
                        EnabledFolders: any[];
                        EnableLiveTvAccess: boolean;
                        EnableLiveTvManagement: boolean;
                        EnableMediaConversion: boolean;
                        EnableMediaPlayback: boolean;
                        EnablePlaybackRemuxing: boolean;
                        EnablePublicSharing: boolean;
                        EnableRemoteAccess: boolean;
                        EnableRemoteControlOfOtherUsers: boolean;
                        EnableSharedDeviceControl: boolean;
                        EnableSyncTranscoding: boolean;
                        EnableUserPreferenceAccess: boolean;
                        EnableVideoPlaybackTranscoding: boolean;
                        ForceRemoteSourceTranscoding: boolean;
                        InvalidLoginAttemptCount: number;
                        IsAdministrator: boolean;
                        IsDisabled: boolean;
                        IsHidden: boolean;
                        LoginAttemptsBeforeLockout: number;
                        MaxActiveSessions: number;
                        PasswordResetProviderId: string;
                        RemoteClientBitrateLimit: number;
                        SyncPlayAccess: string;
                    };
                };
            }>;
            400: z.ZodObject<{
                errors: z.ZodObject<{
                    recursive: z.ZodArray<z.ZodString, "many">;
                }, "strip", z.ZodTypeAny, {
                    recursive: string[];
                }, {
                    recursive: string[];
                }>;
                status: z.ZodNumber;
                title: z.ZodString;
                traceId: z.ZodString;
                type: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                title: string;
                type: string;
                status: number;
                errors: {
                    recursive: string[];
                };
                traceId: string;
            }, {
                title: string;
                type: string;
                status: number;
                errors: {
                    recursive: string[];
                };
                traceId: string;
            }>;
        };
    };
    createFavorite: {
        method: "POST";
        body: z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
        path: "users/:userId/favoriteitems/:id";
        responses: {
            200: z.ZodObject<{
                IsFavorite: z.ZodBoolean;
                ItemId: z.ZodString;
                Key: z.ZodString;
                LastPlayedDate: z.ZodString;
                Likes: z.ZodBoolean;
                PlaybackPositionTicks: z.ZodNumber;
                PlayCount: z.ZodNumber;
                Played: z.ZodBoolean;
                PlayedPercentage: z.ZodNumber;
                Rating: z.ZodNumber;
                UnplayedItemCount: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                PlayCount: number;
                IsFavorite: boolean;
                ItemId: string;
                Key: string;
                PlaybackPositionTicks: number;
                Played: boolean;
                LastPlayedDate: string;
                Likes: boolean;
                PlayedPercentage: number;
                Rating: number;
                UnplayedItemCount: number;
            }, {
                PlayCount: number;
                IsFavorite: boolean;
                ItemId: string;
                Key: string;
                PlaybackPositionTicks: number;
                Played: boolean;
                LastPlayedDate: string;
                Likes: boolean;
                PlayedPercentage: number;
                Rating: number;
                UnplayedItemCount: number;
            }>;
            400: z.ZodObject<{
                errors: z.ZodObject<{
                    recursive: z.ZodArray<z.ZodString, "many">;
                }, "strip", z.ZodTypeAny, {
                    recursive: string[];
                }, {
                    recursive: string[];
                }>;
                status: z.ZodNumber;
                title: z.ZodString;
                traceId: z.ZodString;
                type: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                title: string;
                type: string;
                status: number;
                errors: {
                    recursive: string[];
                };
                traceId: string;
            }, {
                title: string;
                type: string;
                status: number;
                errors: {
                    recursive: string[];
                };
                traceId: string;
            }>;
        };
    };
    createPlaylist: {
        method: "POST";
        body: z.ZodObject<{
            IsPublic: z.ZodOptional<z.ZodBoolean>;
            MediaType: z.ZodLiteral<"Audio">;
            Name: z.ZodString;
            UserId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            Name: string;
            UserId: string;
            MediaType: "Audio";
            IsPublic?: boolean | undefined;
        }, {
            Name: string;
            UserId: string;
            MediaType: "Audio";
            IsPublic?: boolean | undefined;
        }>;
        path: "playlists";
        responses: {
            200: z.ZodObject<{
                Id: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                Id: string;
            }, {
                Id: string;
            }>;
            400: z.ZodObject<{
                errors: z.ZodObject<{
                    recursive: z.ZodArray<z.ZodString, "many">;
                }, "strip", z.ZodTypeAny, {
                    recursive: string[];
                }, {
                    recursive: string[];
                }>;
                status: z.ZodNumber;
                title: z.ZodString;
                traceId: z.ZodString;
                type: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                title: string;
                type: string;
                status: number;
                errors: {
                    recursive: string[];
                };
                traceId: string;
            }, {
                title: string;
                type: string;
                status: number;
                errors: {
                    recursive: string[];
                };
                traceId: string;
            }>;
        };
    };
    deletePlaylist: {
        method: "DELETE";
        body: null;
        path: "items/:id";
        responses: {
            204: z.ZodNull;
            400: z.ZodObject<{
                errors: z.ZodObject<{
                    recursive: z.ZodArray<z.ZodString, "many">;
                }, "strip", z.ZodTypeAny, {
                    recursive: string[];
                }, {
                    recursive: string[];
                }>;
                status: z.ZodNumber;
                title: z.ZodString;
                traceId: z.ZodString;
                type: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                title: string;
                type: string;
                status: number;
                errors: {
                    recursive: string[];
                };
                traceId: string;
            }, {
                title: string;
                type: string;
                status: number;
                errors: {
                    recursive: string[];
                };
                traceId: string;
            }>;
        };
    };
    getAlbumArtistDetail: {
        method: "GET";
        query: z.ZodObject<{
            AlbumArtistIds: z.ZodOptional<z.ZodString>;
            ArtistIds: z.ZodOptional<z.ZodString>;
            ContributingArtistIds: z.ZodOptional<z.ZodString>;
            EnableImageTypes: z.ZodOptional<z.ZodString>;
            EnableTotalRecordCount: z.ZodOptional<z.ZodBoolean>;
            EnableUserData: z.ZodOptional<z.ZodBoolean>;
            EnableUserDataTypes: z.ZodOptional<z.ZodBoolean>;
            ExcludeArtistIds: z.ZodOptional<z.ZodString>;
            ExcludeItemIds: z.ZodOptional<z.ZodString>;
            ExcludeItemTypes: z.ZodOptional<z.ZodString>;
            Fields: z.ZodOptional<z.ZodReadonly<z.ZodArray<z.ZodString, "many">>>;
            FolderId: z.ZodOptional<z.ZodString>;
            ImageTypeLimit: z.ZodOptional<z.ZodNumber>;
            IncludeArtists: z.ZodOptional<z.ZodBoolean>;
            IncludeGenres: z.ZodOptional<z.ZodBoolean>;
            IncludeItemTypes: z.ZodOptional<z.ZodString>;
            IncludeMedia: z.ZodOptional<z.ZodBoolean>;
            IncludePeople: z.ZodOptional<z.ZodBoolean>;
            IncludeStudios: z.ZodOptional<z.ZodBoolean>;
            IsFavorite: z.ZodOptional<z.ZodBoolean>;
            Limit: z.ZodOptional<z.ZodNumber>;
            MediaTypes: z.ZodOptional<z.ZodString>;
            NameStartsWith: z.ZodOptional<z.ZodString>;
            ParentId: z.ZodOptional<z.ZodString>;
            Recursive: z.ZodOptional<z.ZodBoolean>;
            SearchTerm: z.ZodOptional<z.ZodString>;
            SortBy: z.ZodOptional<z.ZodString>;
            SortOrder: z.ZodOptional<z.ZodEnum<["Ascending", "Descending"]>>;
            StartIndex: z.ZodOptional<z.ZodNumber>;
            Tags: z.ZodOptional<z.ZodString>;
            UserId: z.ZodOptional<z.ZodString>;
            Years: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            Limit?: number | undefined;
            UserId?: string | undefined;
            AlbumArtistIds?: string | undefined;
            ArtistIds?: string | undefined;
            ContributingArtistIds?: string | undefined;
            EnableImageTypes?: string | undefined;
            EnableTotalRecordCount?: boolean | undefined;
            EnableUserData?: boolean | undefined;
            EnableUserDataTypes?: boolean | undefined;
            ExcludeArtistIds?: string | undefined;
            ExcludeItemIds?: string | undefined;
            ExcludeItemTypes?: string | undefined;
            Fields?: readonly string[] | undefined;
            FolderId?: string | undefined;
            ImageTypeLimit?: number | undefined;
            IncludeArtists?: boolean | undefined;
            IncludeGenres?: boolean | undefined;
            IncludeItemTypes?: string | undefined;
            IncludeMedia?: boolean | undefined;
            IncludePeople?: boolean | undefined;
            IncludeStudios?: boolean | undefined;
            IsFavorite?: boolean | undefined;
            MediaTypes?: string | undefined;
            NameStartsWith?: string | undefined;
            ParentId?: string | undefined;
            Recursive?: boolean | undefined;
            SearchTerm?: string | undefined;
            SortBy?: string | undefined;
            SortOrder?: "Ascending" | "Descending" | undefined;
            StartIndex?: number | undefined;
            Tags?: string | undefined;
            Years?: string | undefined;
        }, {
            Limit?: number | undefined;
            UserId?: string | undefined;
            AlbumArtistIds?: string | undefined;
            ArtistIds?: string | undefined;
            ContributingArtistIds?: string | undefined;
            EnableImageTypes?: string | undefined;
            EnableTotalRecordCount?: boolean | undefined;
            EnableUserData?: boolean | undefined;
            EnableUserDataTypes?: boolean | undefined;
            ExcludeArtistIds?: string | undefined;
            ExcludeItemIds?: string | undefined;
            ExcludeItemTypes?: string | undefined;
            Fields?: readonly string[] | undefined;
            FolderId?: string | undefined;
            ImageTypeLimit?: number | undefined;
            IncludeArtists?: boolean | undefined;
            IncludeGenres?: boolean | undefined;
            IncludeItemTypes?: string | undefined;
            IncludeMedia?: boolean | undefined;
            IncludePeople?: boolean | undefined;
            IncludeStudios?: boolean | undefined;
            IsFavorite?: boolean | undefined;
            MediaTypes?: string | undefined;
            NameStartsWith?: string | undefined;
            ParentId?: string | undefined;
            Recursive?: boolean | undefined;
            SearchTerm?: string | undefined;
            SortBy?: string | undefined;
            SortOrder?: "Ascending" | "Descending" | undefined;
            StartIndex?: number | undefined;
            Tags?: string | undefined;
            Years?: string | undefined;
        }>;
        path: "users/:userId/items/:id";
        responses: {
            200: z.ZodObject<{
                AlbumCount: z.ZodOptional<z.ZodNumber>;
                BackdropImageTags: z.ZodArray<z.ZodString, "many">;
                ChannelId: z.ZodNull;
                DateCreated: z.ZodString;
                ExternalUrls: z.ZodArray<z.ZodObject<{
                    Name: z.ZodString;
                    Url: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    Name: string;
                    Url: string;
                }, {
                    Name: string;
                    Url: string;
                }>, "many">;
                GenreItems: z.ZodArray<z.ZodObject<{
                    Id: z.ZodString;
                    Name: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    Name: string;
                    Id: string;
                }, {
                    Name: string;
                    Id: string;
                }>, "many">;
                Genres: z.ZodArray<z.ZodString, "many">;
                Id: z.ZodString;
                ImageBlurHashes: z.ZodObject<{
                    Backdrop: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
                    Logo: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
                    Primary: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
                }, "strip", z.ZodTypeAny, {
                    Backdrop?: Record<string, string> | undefined;
                    Logo?: Record<string, string> | undefined;
                    Primary?: Record<string, string> | undefined;
                }, {
                    Backdrop?: Record<string, string> | undefined;
                    Logo?: Record<string, string> | undefined;
                    Primary?: Record<string, string> | undefined;
                }>;
                ImageTags: z.ZodObject<{
                    Logo: z.ZodOptional<z.ZodString>;
                    Primary: z.ZodOptional<z.ZodString>;
                }, "strip", z.ZodTypeAny, {
                    Logo?: string | undefined;
                    Primary?: string | undefined;
                }, {
                    Logo?: string | undefined;
                    Primary?: string | undefined;
                }>;
                LocationType: z.ZodString;
                Name: z.ZodString;
                Overview: z.ZodString;
                ProviderIds: z.ZodOptional<z.ZodObject<{
                    MusicBrainzAlbum: z.ZodOptional<z.ZodString>;
                    MusicBrainzAlbumArtist: z.ZodOptional<z.ZodString>;
                    MusicBrainzArtist: z.ZodOptional<z.ZodString>;
                    MusicBrainzRecording: z.ZodOptional<z.ZodString>;
                    MusicBrainzReleaseGroup: z.ZodOptional<z.ZodString>;
                    MusicBrainzTrack: z.ZodOptional<z.ZodString>;
                }, "strip", z.ZodTypeAny, {
                    MusicBrainzAlbum?: string | undefined;
                    MusicBrainzAlbumArtist?: string | undefined;
                    MusicBrainzArtist?: string | undefined;
                    MusicBrainzRecording?: string | undefined;
                    MusicBrainzReleaseGroup?: string | undefined;
                    MusicBrainzTrack?: string | undefined;
                }, {
                    MusicBrainzAlbum?: string | undefined;
                    MusicBrainzAlbumArtist?: string | undefined;
                    MusicBrainzArtist?: string | undefined;
                    MusicBrainzRecording?: string | undefined;
                    MusicBrainzReleaseGroup?: string | undefined;
                    MusicBrainzTrack?: string | undefined;
                }>>;
                RunTimeTicks: z.ZodNumber;
                ServerId: z.ZodString;
                SongCount: z.ZodOptional<z.ZodNumber>;
                Type: z.ZodString;
                UserData: z.ZodOptional<z.ZodObject<{
                    IsFavorite: z.ZodBoolean;
                    Key: z.ZodString;
                    PlaybackPositionTicks: z.ZodNumber;
                    PlayCount: z.ZodNumber;
                    Played: z.ZodBoolean;
                }, "strip", z.ZodTypeAny, {
                    PlayCount: number;
                    IsFavorite: boolean;
                    Key: string;
                    PlaybackPositionTicks: number;
                    Played: boolean;
                }, {
                    PlayCount: number;
                    IsFavorite: boolean;
                    Key: string;
                    PlaybackPositionTicks: number;
                    Played: boolean;
                }>>;
            }, "strip", z.ZodTypeAny, {
                Name: string;
                Genres: string[];
                Id: string;
                ChannelId: null;
                DateCreated: string;
                ExternalUrls: {
                    Name: string;
                    Url: string;
                }[];
                GenreItems: {
                    Name: string;
                    Id: string;
                }[];
                ImageBlurHashes: {
                    Backdrop?: Record<string, string> | undefined;
                    Logo?: Record<string, string> | undefined;
                    Primary?: Record<string, string> | undefined;
                };
                ImageTags: {
                    Logo?: string | undefined;
                    Primary?: string | undefined;
                };
                LocationType: string;
                Type: string;
                RunTimeTicks: number;
                ServerId: string;
                BackdropImageTags: string[];
                Overview: string;
                ProviderIds?: {
                    MusicBrainzAlbum?: string | undefined;
                    MusicBrainzAlbumArtist?: string | undefined;
                    MusicBrainzArtist?: string | undefined;
                    MusicBrainzRecording?: string | undefined;
                    MusicBrainzReleaseGroup?: string | undefined;
                    MusicBrainzTrack?: string | undefined;
                } | undefined;
                UserData?: {
                    PlayCount: number;
                    IsFavorite: boolean;
                    Key: string;
                    PlaybackPositionTicks: number;
                    Played: boolean;
                } | undefined;
                AlbumCount?: number | undefined;
                SongCount?: number | undefined;
            }, {
                Name: string;
                Genres: string[];
                Id: string;
                ChannelId: null;
                DateCreated: string;
                ExternalUrls: {
                    Name: string;
                    Url: string;
                }[];
                GenreItems: {
                    Name: string;
                    Id: string;
                }[];
                ImageBlurHashes: {
                    Backdrop?: Record<string, string> | undefined;
                    Logo?: Record<string, string> | undefined;
                    Primary?: Record<string, string> | undefined;
                };
                ImageTags: {
                    Logo?: string | undefined;
                    Primary?: string | undefined;
                };
                LocationType: string;
                Type: string;
                RunTimeTicks: number;
                ServerId: string;
                BackdropImageTags: string[];
                Overview: string;
                ProviderIds?: {
                    MusicBrainzAlbum?: string | undefined;
                    MusicBrainzAlbumArtist?: string | undefined;
                    MusicBrainzArtist?: string | undefined;
                    MusicBrainzRecording?: string | undefined;
                    MusicBrainzReleaseGroup?: string | undefined;
                    MusicBrainzTrack?: string | undefined;
                } | undefined;
                UserData?: {
                    PlayCount: number;
                    IsFavorite: boolean;
                    Key: string;
                    PlaybackPositionTicks: number;
                    Played: boolean;
                } | undefined;
                AlbumCount?: number | undefined;
                SongCount?: number | undefined;
            }>;
            400: z.ZodObject<{
                errors: z.ZodObject<{
                    recursive: z.ZodArray<z.ZodString, "many">;
                }, "strip", z.ZodTypeAny, {
                    recursive: string[];
                }, {
                    recursive: string[];
                }>;
                status: z.ZodNumber;
                title: z.ZodString;
                traceId: z.ZodString;
                type: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                title: string;
                type: string;
                status: number;
                errors: {
                    recursive: string[];
                };
                traceId: string;
            }, {
                title: string;
                type: string;
                status: number;
                errors: {
                    recursive: string[];
                };
                traceId: string;
            }>;
        };
    };
    getAlbumArtistList: {
        method: "GET";
        query: z.ZodObject<{} & {
            AlbumArtistIds: z.ZodOptional<z.ZodString>;
            ArtistIds: z.ZodOptional<z.ZodString>;
            ContributingArtistIds: z.ZodOptional<z.ZodString>;
            EnableImageTypes: z.ZodOptional<z.ZodString>;
            EnableTotalRecordCount: z.ZodOptional<z.ZodBoolean>;
            EnableUserData: z.ZodOptional<z.ZodBoolean>;
            EnableUserDataTypes: z.ZodOptional<z.ZodBoolean>;
            ExcludeArtistIds: z.ZodOptional<z.ZodString>;
            ExcludeItemIds: z.ZodOptional<z.ZodString>;
            ExcludeItemTypes: z.ZodOptional<z.ZodString>;
            Fields: z.ZodOptional<z.ZodReadonly<z.ZodArray<z.ZodString, "many">>>;
            FolderId: z.ZodOptional<z.ZodString>;
            ImageTypeLimit: z.ZodOptional<z.ZodNumber>;
            IncludeArtists: z.ZodOptional<z.ZodBoolean>;
            IncludeGenres: z.ZodOptional<z.ZodBoolean>;
            IncludeItemTypes: z.ZodOptional<z.ZodString>;
            IncludeMedia: z.ZodOptional<z.ZodBoolean>;
            IncludePeople: z.ZodOptional<z.ZodBoolean>;
            IncludeStudios: z.ZodOptional<z.ZodBoolean>;
            IsFavorite: z.ZodOptional<z.ZodBoolean>;
            Limit: z.ZodOptional<z.ZodNumber>;
            MediaTypes: z.ZodOptional<z.ZodString>;
            NameStartsWith: z.ZodOptional<z.ZodString>;
            ParentId: z.ZodOptional<z.ZodString>;
            Recursive: z.ZodOptional<z.ZodBoolean>;
            SearchTerm: z.ZodOptional<z.ZodString>;
            SortOrder: z.ZodOptional<z.ZodEnum<["Ascending", "Descending"]>>;
            StartIndex: z.ZodOptional<z.ZodNumber>;
            Tags: z.ZodOptional<z.ZodString>;
            UserId: z.ZodOptional<z.ZodString>;
            Filters: z.ZodOptional<z.ZodString>;
            Genres: z.ZodOptional<z.ZodString>;
            SortBy: z.ZodOptional<z.ZodNativeEnum<{
                readonly ALBUM: "Album,SortName";
                readonly DURATION: "Runtime,AlbumArtist,Album,SortName";
                readonly NAME: "SortName,Name";
                readonly RANDOM: "Random,SortName";
                readonly RECENTLY_ADDED: "DateCreated,SortName";
                readonly RELEASE_DATE: "PremiereDate,AlbumArtist,Album,SortName";
            }>>;
            Years: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            Limit?: number | undefined;
            Genres?: string | undefined;
            UserId?: string | undefined;
            AlbumArtistIds?: string | undefined;
            ArtistIds?: string | undefined;
            ContributingArtistIds?: string | undefined;
            EnableImageTypes?: string | undefined;
            EnableTotalRecordCount?: boolean | undefined;
            EnableUserData?: boolean | undefined;
            EnableUserDataTypes?: boolean | undefined;
            ExcludeArtistIds?: string | undefined;
            ExcludeItemIds?: string | undefined;
            ExcludeItemTypes?: string | undefined;
            Fields?: readonly string[] | undefined;
            FolderId?: string | undefined;
            ImageTypeLimit?: number | undefined;
            IncludeArtists?: boolean | undefined;
            IncludeGenres?: boolean | undefined;
            IncludeItemTypes?: string | undefined;
            IncludeMedia?: boolean | undefined;
            IncludePeople?: boolean | undefined;
            IncludeStudios?: boolean | undefined;
            IsFavorite?: boolean | undefined;
            MediaTypes?: string | undefined;
            NameStartsWith?: string | undefined;
            ParentId?: string | undefined;
            Recursive?: boolean | undefined;
            SearchTerm?: string | undefined;
            SortBy?: "Album,SortName" | "Runtime,AlbumArtist,Album,SortName" | "SortName,Name" | "Random,SortName" | "DateCreated,SortName" | "PremiereDate,AlbumArtist,Album,SortName" | undefined;
            SortOrder?: "Ascending" | "Descending" | undefined;
            StartIndex?: number | undefined;
            Tags?: string | undefined;
            Years?: string | undefined;
            Filters?: string | undefined;
        }, {
            Limit?: number | undefined;
            Genres?: string | undefined;
            UserId?: string | undefined;
            AlbumArtistIds?: string | undefined;
            ArtistIds?: string | undefined;
            ContributingArtistIds?: string | undefined;
            EnableImageTypes?: string | undefined;
            EnableTotalRecordCount?: boolean | undefined;
            EnableUserData?: boolean | undefined;
            EnableUserDataTypes?: boolean | undefined;
            ExcludeArtistIds?: string | undefined;
            ExcludeItemIds?: string | undefined;
            ExcludeItemTypes?: string | undefined;
            Fields?: readonly string[] | undefined;
            FolderId?: string | undefined;
            ImageTypeLimit?: number | undefined;
            IncludeArtists?: boolean | undefined;
            IncludeGenres?: boolean | undefined;
            IncludeItemTypes?: string | undefined;
            IncludeMedia?: boolean | undefined;
            IncludePeople?: boolean | undefined;
            IncludeStudios?: boolean | undefined;
            IsFavorite?: boolean | undefined;
            MediaTypes?: string | undefined;
            NameStartsWith?: string | undefined;
            ParentId?: string | undefined;
            Recursive?: boolean | undefined;
            SearchTerm?: string | undefined;
            SortBy?: "Album,SortName" | "Runtime,AlbumArtist,Album,SortName" | "SortName,Name" | "Random,SortName" | "DateCreated,SortName" | "PremiereDate,AlbumArtist,Album,SortName" | undefined;
            SortOrder?: "Ascending" | "Descending" | undefined;
            StartIndex?: number | undefined;
            Tags?: string | undefined;
            Years?: string | undefined;
            Filters?: string | undefined;
        }>;
        path: "artists/albumArtists";
        responses: {
            200: z.ZodObject<{
                StartIndex: z.ZodNumber;
                TotalRecordCount: z.ZodNumber;
            } & {
                Items: z.ZodArray<z.ZodObject<{
                    AlbumCount: z.ZodOptional<z.ZodNumber>;
                    BackdropImageTags: z.ZodArray<z.ZodString, "many">;
                    ChannelId: z.ZodNull;
                    DateCreated: z.ZodString;
                    ExternalUrls: z.ZodArray<z.ZodObject<{
                        Name: z.ZodString;
                        Url: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        Name: string;
                        Url: string;
                    }, {
                        Name: string;
                        Url: string;
                    }>, "many">;
                    GenreItems: z.ZodArray<z.ZodObject<{
                        Id: z.ZodString;
                        Name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        Name: string;
                        Id: string;
                    }, {
                        Name: string;
                        Id: string;
                    }>, "many">;
                    Genres: z.ZodArray<z.ZodString, "many">;
                    Id: z.ZodString;
                    ImageBlurHashes: z.ZodObject<{
                        Backdrop: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
                        Logo: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
                        Primary: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
                    }, "strip", z.ZodTypeAny, {
                        Backdrop?: Record<string, string> | undefined;
                        Logo?: Record<string, string> | undefined;
                        Primary?: Record<string, string> | undefined;
                    }, {
                        Backdrop?: Record<string, string> | undefined;
                        Logo?: Record<string, string> | undefined;
                        Primary?: Record<string, string> | undefined;
                    }>;
                    ImageTags: z.ZodObject<{
                        Logo: z.ZodOptional<z.ZodString>;
                        Primary: z.ZodOptional<z.ZodString>;
                    }, "strip", z.ZodTypeAny, {
                        Logo?: string | undefined;
                        Primary?: string | undefined;
                    }, {
                        Logo?: string | undefined;
                        Primary?: string | undefined;
                    }>;
                    LocationType: z.ZodString;
                    Name: z.ZodString;
                    Overview: z.ZodString;
                    ProviderIds: z.ZodOptional<z.ZodObject<{
                        MusicBrainzAlbum: z.ZodOptional<z.ZodString>;
                        MusicBrainzAlbumArtist: z.ZodOptional<z.ZodString>;
                        MusicBrainzArtist: z.ZodOptional<z.ZodString>;
                        MusicBrainzRecording: z.ZodOptional<z.ZodString>;
                        MusicBrainzReleaseGroup: z.ZodOptional<z.ZodString>;
                        MusicBrainzTrack: z.ZodOptional<z.ZodString>;
                    }, "strip", z.ZodTypeAny, {
                        MusicBrainzAlbum?: string | undefined;
                        MusicBrainzAlbumArtist?: string | undefined;
                        MusicBrainzArtist?: string | undefined;
                        MusicBrainzRecording?: string | undefined;
                        MusicBrainzReleaseGroup?: string | undefined;
                        MusicBrainzTrack?: string | undefined;
                    }, {
                        MusicBrainzAlbum?: string | undefined;
                        MusicBrainzAlbumArtist?: string | undefined;
                        MusicBrainzArtist?: string | undefined;
                        MusicBrainzRecording?: string | undefined;
                        MusicBrainzReleaseGroup?: string | undefined;
                        MusicBrainzTrack?: string | undefined;
                    }>>;
                    RunTimeTicks: z.ZodNumber;
                    ServerId: z.ZodString;
                    SongCount: z.ZodOptional<z.ZodNumber>;
                    Type: z.ZodString;
                    UserData: z.ZodOptional<z.ZodObject<{
                        IsFavorite: z.ZodBoolean;
                        Key: z.ZodString;
                        PlaybackPositionTicks: z.ZodNumber;
                        PlayCount: z.ZodNumber;
                        Played: z.ZodBoolean;
                    }, "strip", z.ZodTypeAny, {
                        PlayCount: number;
                        IsFavorite: boolean;
                        Key: string;
                        PlaybackPositionTicks: number;
                        Played: boolean;
                    }, {
                        PlayCount: number;
                        IsFavorite: boolean;
                        Key: string;
                        PlaybackPositionTicks: number;
                        Played: boolean;
                    }>>;
                }, "strip", z.ZodTypeAny, {
                    Name: string;
                    Genres: string[];
                    Id: string;
                    ChannelId: null;
                    DateCreated: string;
                    ExternalUrls: {
                        Name: string;
                        Url: string;
                    }[];
                    GenreItems: {
                        Name: string;
                        Id: string;
                    }[];
                    ImageBlurHashes: {
                        Backdrop?: Record<string, string> | undefined;
                        Logo?: Record<string, string> | undefined;
                        Primary?: Record<string, string> | undefined;
                    };
                    ImageTags: {
                        Logo?: string | undefined;
                        Primary?: string | undefined;
                    };
                    LocationType: string;
                    Type: string;
                    RunTimeTicks: number;
                    ServerId: string;
                    BackdropImageTags: string[];
                    Overview: string;
                    ProviderIds?: {
                        MusicBrainzAlbum?: string | undefined;
                        MusicBrainzAlbumArtist?: string | undefined;
                        MusicBrainzArtist?: string | undefined;
                        MusicBrainzRecording?: string | undefined;
                        MusicBrainzReleaseGroup?: string | undefined;
                        MusicBrainzTrack?: string | undefined;
                    } | undefined;
                    UserData?: {
                        PlayCount: number;
                        IsFavorite: boolean;
                        Key: string;
                        PlaybackPositionTicks: number;
                        Played: boolean;
                    } | undefined;
                    AlbumCount?: number | undefined;
                    SongCount?: number | undefined;
                }, {
                    Name: string;
                    Genres: string[];
                    Id: string;
                    ChannelId: null;
                    DateCreated: string;
                    ExternalUrls: {
                        Name: string;
                        Url: string;
                    }[];
                    GenreItems: {
                        Name: string;
                        Id: string;
                    }[];
                    ImageBlurHashes: {
                        Backdrop?: Record<string, string> | undefined;
                        Logo?: Record<string, string> | undefined;
                        Primary?: Record<string, string> | undefined;
                    };
                    ImageTags: {
                        Logo?: string | undefined;
                        Primary?: string | undefined;
                    };
                    LocationType: string;
                    Type: string;
                    RunTimeTicks: number;
                    ServerId: string;
                    BackdropImageTags: string[];
                    Overview: string;
                    ProviderIds?: {
                        MusicBrainzAlbum?: string | undefined;
                        MusicBrainzAlbumArtist?: string | undefined;
                        MusicBrainzArtist?: string | undefined;
                        MusicBrainzRecording?: string | undefined;
                        MusicBrainzReleaseGroup?: string | undefined;
                        MusicBrainzTrack?: string | undefined;
                    } | undefined;
                    UserData?: {
                        PlayCount: number;
                        IsFavorite: boolean;
                        Key: string;
                        PlaybackPositionTicks: number;
                        Played: boolean;
                    } | undefined;
                    AlbumCount?: number | undefined;
                    SongCount?: number | undefined;
                }>, "many">;
            }, "strip", z.ZodTypeAny, {
                StartIndex: number;
                TotalRecordCount: number;
                Items: {
                    Name: string;
                    Genres: string[];
                    Id: string;
                    ChannelId: null;
                    DateCreated: string;
                    ExternalUrls: {
                        Name: string;
                        Url: string;
                    }[];
                    GenreItems: {
                        Name: string;
                        Id: string;
                    }[];
                    ImageBlurHashes: {
                        Backdrop?: Record<string, string> | undefined;
                        Logo?: Record<string, string> | undefined;
                        Primary?: Record<string, string> | undefined;
                    };
                    ImageTags: {
                        Logo?: string | undefined;
                        Primary?: string | undefined;
                    };
                    LocationType: string;
                    Type: string;
                    RunTimeTicks: number;
                    ServerId: string;
                    BackdropImageTags: string[];
                    Overview: string;
                    ProviderIds?: {
                        MusicBrainzAlbum?: string | undefined;
                        MusicBrainzAlbumArtist?: string | undefined;
                        MusicBrainzArtist?: string | undefined;
                        MusicBrainzRecording?: string | undefined;
                        MusicBrainzReleaseGroup?: string | undefined;
                        MusicBrainzTrack?: string | undefined;
                    } | undefined;
                    UserData?: {
                        PlayCount: number;
                        IsFavorite: boolean;
                        Key: string;
                        PlaybackPositionTicks: number;
                        Played: boolean;
                    } | undefined;
                    AlbumCount?: number | undefined;
                    SongCount?: number | undefined;
                }[];
            }, {
                StartIndex: number;
                TotalRecordCount: number;
                Items: {
                    Name: string;
                    Genres: string[];
                    Id: string;
                    ChannelId: null;
                    DateCreated: string;
                    ExternalUrls: {
                        Name: string;
                        Url: string;
                    }[];
                    GenreItems: {
                        Name: string;
                        Id: string;
                    }[];
                    ImageBlurHashes: {
                        Backdrop?: Record<string, string> | undefined;
                        Logo?: Record<string, string> | undefined;
                        Primary?: Record<string, string> | undefined;
                    };
                    ImageTags: {
                        Logo?: string | undefined;
                        Primary?: string | undefined;
                    };
                    LocationType: string;
                    Type: string;
                    RunTimeTicks: number;
                    ServerId: string;
                    BackdropImageTags: string[];
                    Overview: string;
                    ProviderIds?: {
                        MusicBrainzAlbum?: string | undefined;
                        MusicBrainzAlbumArtist?: string | undefined;
                        MusicBrainzArtist?: string | undefined;
                        MusicBrainzRecording?: string | undefined;
                        MusicBrainzReleaseGroup?: string | undefined;
                        MusicBrainzTrack?: string | undefined;
                    } | undefined;
                    UserData?: {
                        PlayCount: number;
                        IsFavorite: boolean;
                        Key: string;
                        PlaybackPositionTicks: number;
                        Played: boolean;
                    } | undefined;
                    AlbumCount?: number | undefined;
                    SongCount?: number | undefined;
                }[];
            }>;
            400: z.ZodObject<{
                errors: z.ZodObject<{
                    recursive: z.ZodArray<z.ZodString, "many">;
                }, "strip", z.ZodTypeAny, {
                    recursive: string[];
                }, {
                    recursive: string[];
                }>;
                status: z.ZodNumber;
                title: z.ZodString;
                traceId: z.ZodString;
                type: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                title: string;
                type: string;
                status: number;
                errors: {
                    recursive: string[];
                };
                traceId: string;
            }, {
                title: string;
                type: string;
                status: number;
                errors: {
                    recursive: string[];
                };
                traceId: string;
            }>;
        };
    };
    getAlbumDetail: {
        method: "GET";
        query: z.ZodObject<{
            AlbumArtistIds: z.ZodOptional<z.ZodString>;
            ArtistIds: z.ZodOptional<z.ZodString>;
            ContributingArtistIds: z.ZodOptional<z.ZodString>;
            EnableImageTypes: z.ZodOptional<z.ZodString>;
            EnableTotalRecordCount: z.ZodOptional<z.ZodBoolean>;
            EnableUserData: z.ZodOptional<z.ZodBoolean>;
            EnableUserDataTypes: z.ZodOptional<z.ZodBoolean>;
            ExcludeArtistIds: z.ZodOptional<z.ZodString>;
            ExcludeItemIds: z.ZodOptional<z.ZodString>;
            ExcludeItemTypes: z.ZodOptional<z.ZodString>;
            Fields: z.ZodOptional<z.ZodReadonly<z.ZodArray<z.ZodString, "many">>>;
            FolderId: z.ZodOptional<z.ZodString>;
            ImageTypeLimit: z.ZodOptional<z.ZodNumber>;
            IncludeArtists: z.ZodOptional<z.ZodBoolean>;
            IncludeGenres: z.ZodOptional<z.ZodBoolean>;
            IncludeItemTypes: z.ZodOptional<z.ZodString>;
            IncludeMedia: z.ZodOptional<z.ZodBoolean>;
            IncludePeople: z.ZodOptional<z.ZodBoolean>;
            IncludeStudios: z.ZodOptional<z.ZodBoolean>;
            IsFavorite: z.ZodOptional<z.ZodBoolean>;
            Limit: z.ZodOptional<z.ZodNumber>;
            MediaTypes: z.ZodOptional<z.ZodString>;
            NameStartsWith: z.ZodOptional<z.ZodString>;
            ParentId: z.ZodOptional<z.ZodString>;
            Recursive: z.ZodOptional<z.ZodBoolean>;
            SearchTerm: z.ZodOptional<z.ZodString>;
            SortBy: z.ZodOptional<z.ZodString>;
            SortOrder: z.ZodOptional<z.ZodEnum<["Ascending", "Descending"]>>;
            StartIndex: z.ZodOptional<z.ZodNumber>;
            Tags: z.ZodOptional<z.ZodString>;
            UserId: z.ZodOptional<z.ZodString>;
            Years: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            Limit?: number | undefined;
            UserId?: string | undefined;
            AlbumArtistIds?: string | undefined;
            ArtistIds?: string | undefined;
            ContributingArtistIds?: string | undefined;
            EnableImageTypes?: string | undefined;
            EnableTotalRecordCount?: boolean | undefined;
            EnableUserData?: boolean | undefined;
            EnableUserDataTypes?: boolean | undefined;
            ExcludeArtistIds?: string | undefined;
            ExcludeItemIds?: string | undefined;
            ExcludeItemTypes?: string | undefined;
            Fields?: readonly string[] | undefined;
            FolderId?: string | undefined;
            ImageTypeLimit?: number | undefined;
            IncludeArtists?: boolean | undefined;
            IncludeGenres?: boolean | undefined;
            IncludeItemTypes?: string | undefined;
            IncludeMedia?: boolean | undefined;
            IncludePeople?: boolean | undefined;
            IncludeStudios?: boolean | undefined;
            IsFavorite?: boolean | undefined;
            MediaTypes?: string | undefined;
            NameStartsWith?: string | undefined;
            ParentId?: string | undefined;
            Recursive?: boolean | undefined;
            SearchTerm?: string | undefined;
            SortBy?: string | undefined;
            SortOrder?: "Ascending" | "Descending" | undefined;
            StartIndex?: number | undefined;
            Tags?: string | undefined;
            Years?: string | undefined;
        }, {
            Limit?: number | undefined;
            UserId?: string | undefined;
            AlbumArtistIds?: string | undefined;
            ArtistIds?: string | undefined;
            ContributingArtistIds?: string | undefined;
            EnableImageTypes?: string | undefined;
            EnableTotalRecordCount?: boolean | undefined;
            EnableUserData?: boolean | undefined;
            EnableUserDataTypes?: boolean | undefined;
            ExcludeArtistIds?: string | undefined;
            ExcludeItemIds?: string | undefined;
            ExcludeItemTypes?: string | undefined;
            Fields?: readonly string[] | undefined;
            FolderId?: string | undefined;
            ImageTypeLimit?: number | undefined;
            IncludeArtists?: boolean | undefined;
            IncludeGenres?: boolean | undefined;
            IncludeItemTypes?: string | undefined;
            IncludeMedia?: boolean | undefined;
            IncludePeople?: boolean | undefined;
            IncludeStudios?: boolean | undefined;
            IsFavorite?: boolean | undefined;
            MediaTypes?: string | undefined;
            NameStartsWith?: string | undefined;
            ParentId?: string | undefined;
            Recursive?: boolean | undefined;
            SearchTerm?: string | undefined;
            SortBy?: string | undefined;
            SortOrder?: "Ascending" | "Descending" | undefined;
            StartIndex?: number | undefined;
            Tags?: string | undefined;
            Years?: string | undefined;
        }>;
        path: "users/:userId/items/:id";
        responses: {
            200: z.ZodObject<{
                AlbumArtist: z.ZodString;
                AlbumArtists: z.ZodArray<z.ZodObject<{
                    Id: z.ZodString;
                    Name: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    Name: string;
                    Id: string;
                }, {
                    Name: string;
                    Id: string;
                }>, "many">;
                AlbumPrimaryImageTag: z.ZodString;
                ArtistItems: z.ZodArray<z.ZodObject<{
                    Id: z.ZodString;
                    Name: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    Name: string;
                    Id: string;
                }, {
                    Name: string;
                    Id: string;
                }>, "many">;
                Artists: z.ZodArray<z.ZodString, "many">;
                ChannelId: z.ZodNull;
                ChildCount: z.ZodOptional<z.ZodNumber>;
                DateCreated: z.ZodString;
                DateLastMediaAdded: z.ZodOptional<z.ZodString>;
                ExternalUrls: z.ZodArray<z.ZodObject<{
                    Name: z.ZodString;
                    Url: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    Name: string;
                    Url: string;
                }, {
                    Name: string;
                    Url: string;
                }>, "many">;
                GenreItems: z.ZodArray<z.ZodObject<{
                    Id: z.ZodString;
                    Name: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    Name: string;
                    Id: string;
                }, {
                    Name: string;
                    Id: string;
                }>, "many">;
                Genres: z.ZodArray<z.ZodString, "many">;
                Id: z.ZodString;
                ImageBlurHashes: z.ZodObject<{
                    Backdrop: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
                    Logo: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
                    Primary: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
                }, "strip", z.ZodTypeAny, {
                    Backdrop?: Record<string, string> | undefined;
                    Logo?: Record<string, string> | undefined;
                    Primary?: Record<string, string> | undefined;
                }, {
                    Backdrop?: Record<string, string> | undefined;
                    Logo?: Record<string, string> | undefined;
                    Primary?: Record<string, string> | undefined;
                }>;
                ImageTags: z.ZodObject<{
                    Logo: z.ZodOptional<z.ZodString>;
                    Primary: z.ZodOptional<z.ZodString>;
                }, "strip", z.ZodTypeAny, {
                    Logo?: string | undefined;
                    Primary?: string | undefined;
                }, {
                    Logo?: string | undefined;
                    Primary?: string | undefined;
                }>;
                IsFolder: z.ZodBoolean;
                LocationType: z.ZodString;
                Name: z.ZodString;
                ParentLogoImageTag: z.ZodString;
                ParentLogoItemId: z.ZodString;
                People: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    Id: z.ZodString;
                    Name: z.ZodString;
                    Type: z.ZodOptional<z.ZodString>;
                }, "strip", z.ZodTypeAny, {
                    Name: string;
                    Id: string;
                    Type?: string | undefined;
                }, {
                    Name: string;
                    Id: string;
                    Type?: string | undefined;
                }>, "many">>;
                PremiereDate: z.ZodOptional<z.ZodString>;
                ProductionYear: z.ZodNumber;
                ProviderIds: z.ZodOptional<z.ZodObject<{
                    MusicBrainzAlbum: z.ZodOptional<z.ZodString>;
                    MusicBrainzAlbumArtist: z.ZodOptional<z.ZodString>;
                    MusicBrainzArtist: z.ZodOptional<z.ZodString>;
                    MusicBrainzRecording: z.ZodOptional<z.ZodString>;
                    MusicBrainzReleaseGroup: z.ZodOptional<z.ZodString>;
                    MusicBrainzTrack: z.ZodOptional<z.ZodString>;
                }, "strip", z.ZodTypeAny, {
                    MusicBrainzAlbum?: string | undefined;
                    MusicBrainzAlbumArtist?: string | undefined;
                    MusicBrainzArtist?: string | undefined;
                    MusicBrainzRecording?: string | undefined;
                    MusicBrainzReleaseGroup?: string | undefined;
                    MusicBrainzTrack?: string | undefined;
                }, {
                    MusicBrainzAlbum?: string | undefined;
                    MusicBrainzAlbumArtist?: string | undefined;
                    MusicBrainzArtist?: string | undefined;
                    MusicBrainzRecording?: string | undefined;
                    MusicBrainzReleaseGroup?: string | undefined;
                    MusicBrainzTrack?: string | undefined;
                }>>;
                RunTimeTicks: z.ZodNumber;
                ServerId: z.ZodString;
                Songs: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    Album: z.ZodString;
                    AlbumArtist: z.ZodString;
                    AlbumArtists: z.ZodArray<z.ZodObject<{
                        Id: z.ZodString;
                        Name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        Name: string;
                        Id: string;
                    }, {
                        Name: string;
                        Id: string;
                    }>, "many">;
                    AlbumId: z.ZodOptional<z.ZodString>;
                    AlbumPrimaryImageTag: z.ZodString;
                    ArtistItems: z.ZodArray<z.ZodObject<{
                        Id: z.ZodString;
                        Name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        Name: string;
                        Id: string;
                    }, {
                        Name: string;
                        Id: string;
                    }>, "many">;
                    Artists: z.ZodArray<z.ZodString, "many">;
                    BackdropImageTags: z.ZodArray<z.ZodString, "many">;
                    ChannelId: z.ZodNull;
                    DateCreated: z.ZodString;
                    ExternalUrls: z.ZodArray<z.ZodObject<{
                        Name: z.ZodString;
                        Url: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        Name: string;
                        Url: string;
                    }, {
                        Name: string;
                        Url: string;
                    }>, "many">;
                    GenreItems: z.ZodArray<z.ZodObject<{
                        Id: z.ZodString;
                        Name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        Name: string;
                        Id: string;
                    }, {
                        Name: string;
                        Id: string;
                    }>, "many">;
                    Genres: z.ZodArray<z.ZodString, "many">;
                    Id: z.ZodString;
                    ImageBlurHashes: z.ZodObject<{
                        Backdrop: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
                        Logo: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
                        Primary: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
                    }, "strip", z.ZodTypeAny, {
                        Backdrop?: Record<string, string> | undefined;
                        Logo?: Record<string, string> | undefined;
                        Primary?: Record<string, string> | undefined;
                    }, {
                        Backdrop?: Record<string, string> | undefined;
                        Logo?: Record<string, string> | undefined;
                        Primary?: Record<string, string> | undefined;
                    }>;
                    ImageTags: z.ZodObject<{
                        Logo: z.ZodOptional<z.ZodString>;
                        Primary: z.ZodOptional<z.ZodString>;
                    }, "strip", z.ZodTypeAny, {
                        Logo?: string | undefined;
                        Primary?: string | undefined;
                    }, {
                        Logo?: string | undefined;
                        Primary?: string | undefined;
                    }>;
                    IndexNumber: z.ZodNumber;
                    IsFolder: z.ZodBoolean;
                    LocationType: z.ZodString;
                    LUFS: z.ZodOptional<z.ZodNumber>;
                    MediaSources: z.ZodArray<z.ZodObject<{
                        Bitrate: z.ZodNumber;
                        Container: z.ZodString;
                        DefaultAudioStreamIndex: z.ZodNumber;
                        ETag: z.ZodString;
                        Formats: z.ZodArray<z.ZodAny, "many">;
                        GenPtsInput: z.ZodBoolean;
                        Id: z.ZodString;
                        IgnoreDts: z.ZodBoolean;
                        IgnoreIndex: z.ZodBoolean;
                        IsInfiniteStream: z.ZodBoolean;
                        IsRemote: z.ZodBoolean;
                        MediaAttachments: z.ZodArray<z.ZodAny, "many">;
                        MediaStreams: z.ZodArray<z.ZodObject<{
                            AspectRatio: z.ZodOptional<z.ZodString>;
                            BitDepth: z.ZodOptional<z.ZodNumber>;
                            BitRate: z.ZodOptional<z.ZodNumber>;
                            ChannelLayout: z.ZodOptional<z.ZodString>;
                            Channels: z.ZodOptional<z.ZodNumber>;
                            Codec: z.ZodString;
                            CodecTimeBase: z.ZodString;
                            ColorSpace: z.ZodOptional<z.ZodString>;
                            Comment: z.ZodOptional<z.ZodString>;
                            DisplayTitle: z.ZodOptional<z.ZodString>;
                            Height: z.ZodOptional<z.ZodNumber>;
                            Index: z.ZodNumber;
                            IsDefault: z.ZodBoolean;
                            IsExternal: z.ZodBoolean;
                            IsForced: z.ZodBoolean;
                            IsInterlaced: z.ZodBoolean;
                            IsTextSubtitleStream: z.ZodBoolean;
                            Level: z.ZodNumber;
                            PixelFormat: z.ZodOptional<z.ZodString>;
                            Profile: z.ZodOptional<z.ZodString>;
                            RealFrameRate: z.ZodOptional<z.ZodNumber>;
                            RefFrames: z.ZodOptional<z.ZodNumber>;
                            SampleRate: z.ZodOptional<z.ZodNumber>;
                            SupportsExternalStream: z.ZodBoolean;
                            TimeBase: z.ZodString;
                            Type: z.ZodString;
                            Width: z.ZodOptional<z.ZodNumber>;
                        }, "strip", z.ZodTypeAny, {
                            Codec: string;
                            Level: number;
                            Type: string;
                            CodecTimeBase: string;
                            Index: number;
                            IsDefault: boolean;
                            IsExternal: boolean;
                            IsForced: boolean;
                            IsInterlaced: boolean;
                            IsTextSubtitleStream: boolean;
                            SupportsExternalStream: boolean;
                            TimeBase: string;
                            AspectRatio?: string | undefined;
                            BitDepth?: number | undefined;
                            BitRate?: number | undefined;
                            ChannelLayout?: string | undefined;
                            Channels?: number | undefined;
                            ColorSpace?: string | undefined;
                            Comment?: string | undefined;
                            DisplayTitle?: string | undefined;
                            Height?: number | undefined;
                            PixelFormat?: string | undefined;
                            Profile?: string | undefined;
                            RealFrameRate?: number | undefined;
                            RefFrames?: number | undefined;
                            SampleRate?: number | undefined;
                            Width?: number | undefined;
                        }, {
                            Codec: string;
                            Level: number;
                            Type: string;
                            CodecTimeBase: string;
                            Index: number;
                            IsDefault: boolean;
                            IsExternal: boolean;
                            IsForced: boolean;
                            IsInterlaced: boolean;
                            IsTextSubtitleStream: boolean;
                            SupportsExternalStream: boolean;
                            TimeBase: string;
                            AspectRatio?: string | undefined;
                            BitDepth?: number | undefined;
                            BitRate?: number | undefined;
                            ChannelLayout?: string | undefined;
                            Channels?: number | undefined;
                            ColorSpace?: string | undefined;
                            Comment?: string | undefined;
                            DisplayTitle?: string | undefined;
                            Height?: number | undefined;
                            PixelFormat?: string | undefined;
                            Profile?: string | undefined;
                            RealFrameRate?: number | undefined;
                            RefFrames?: number | undefined;
                            SampleRate?: number | undefined;
                            Width?: number | undefined;
                        }>, "many">;
                        Name: z.ZodString;
                        Path: z.ZodString;
                        Protocol: z.ZodString;
                        ReadAtNativeFramerate: z.ZodBoolean;
                        RequiredHttpHeaders: z.ZodAny;
                        RequiresClosing: z.ZodBoolean;
                        RequiresLooping: z.ZodBoolean;
                        RequiresOpening: z.ZodBoolean;
                        RunTimeTicks: z.ZodNumber;
                        Size: z.ZodNumber;
                        SupportsDirectPlay: z.ZodBoolean;
                        SupportsDirectStream: z.ZodBoolean;
                        SupportsProbing: z.ZodBoolean;
                        SupportsTranscoding: z.ZodBoolean;
                        Type: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        Name: string;
                        Bitrate: number;
                        Id: string;
                        Type: string;
                        RunTimeTicks: number;
                        Container: string;
                        DefaultAudioStreamIndex: number;
                        ETag: string;
                        Formats: any[];
                        GenPtsInput: boolean;
                        IgnoreDts: boolean;
                        IgnoreIndex: boolean;
                        IsInfiniteStream: boolean;
                        IsRemote: boolean;
                        MediaAttachments: any[];
                        MediaStreams: {
                            Codec: string;
                            Level: number;
                            Type: string;
                            CodecTimeBase: string;
                            Index: number;
                            IsDefault: boolean;
                            IsExternal: boolean;
                            IsForced: boolean;
                            IsInterlaced: boolean;
                            IsTextSubtitleStream: boolean;
                            SupportsExternalStream: boolean;
                            TimeBase: string;
                            AspectRatio?: string | undefined;
                            BitDepth?: number | undefined;
                            BitRate?: number | undefined;
                            ChannelLayout?: string | undefined;
                            Channels?: number | undefined;
                            ColorSpace?: string | undefined;
                            Comment?: string | undefined;
                            DisplayTitle?: string | undefined;
                            Height?: number | undefined;
                            PixelFormat?: string | undefined;
                            Profile?: string | undefined;
                            RealFrameRate?: number | undefined;
                            RefFrames?: number | undefined;
                            SampleRate?: number | undefined;
                            Width?: number | undefined;
                        }[];
                        Path: string;
                        Protocol: string;
                        ReadAtNativeFramerate: boolean;
                        RequiresClosing: boolean;
                        RequiresLooping: boolean;
                        RequiresOpening: boolean;
                        Size: number;
                        SupportsDirectPlay: boolean;
                        SupportsDirectStream: boolean;
                        SupportsProbing: boolean;
                        SupportsTranscoding: boolean;
                        RequiredHttpHeaders?: any;
                    }, {
                        Name: string;
                        Bitrate: number;
                        Id: string;
                        Type: string;
                        RunTimeTicks: number;
                        Container: string;
                        DefaultAudioStreamIndex: number;
                        ETag: string;
                        Formats: any[];
                        GenPtsInput: boolean;
                        IgnoreDts: boolean;
                        IgnoreIndex: boolean;
                        IsInfiniteStream: boolean;
                        IsRemote: boolean;
                        MediaAttachments: any[];
                        MediaStreams: {
                            Codec: string;
                            Level: number;
                            Type: string;
                            CodecTimeBase: string;
                            Index: number;
                            IsDefault: boolean;
                            IsExternal: boolean;
                            IsForced: boolean;
                            IsInterlaced: boolean;
                            IsTextSubtitleStream: boolean;
                            SupportsExternalStream: boolean;
                            TimeBase: string;
                            AspectRatio?: string | undefined;
                            BitDepth?: number | undefined;
                            BitRate?: number | undefined;
                            ChannelLayout?: string | undefined;
                            Channels?: number | undefined;
                            ColorSpace?: string | undefined;
                            Comment?: string | undefined;
                            DisplayTitle?: string | undefined;
                            Height?: number | undefined;
                            PixelFormat?: string | undefined;
                            Profile?: string | undefined;
                            RealFrameRate?: number | undefined;
                            RefFrames?: number | undefined;
                            SampleRate?: number | undefined;
                            Width?: number | undefined;
                        }[];
                        Path: string;
                        Protocol: string;
                        ReadAtNativeFramerate: boolean;
                        RequiresClosing: boolean;
                        RequiresLooping: boolean;
                        RequiresOpening: boolean;
                        Size: number;
                        SupportsDirectPlay: boolean;
                        SupportsDirectStream: boolean;
                        SupportsProbing: boolean;
                        SupportsTranscoding: boolean;
                        RequiredHttpHeaders?: any;
                    }>, "many">;
                    MediaType: z.ZodString;
                    Name: z.ZodString;
                    NormalizationGain: z.ZodOptional<z.ZodNumber>;
                    ParentId: z.ZodOptional<z.ZodString>;
                    ParentIndexNumber: z.ZodNumber;
                    People: z.ZodOptional<z.ZodArray<z.ZodObject<{
                        Id: z.ZodString;
                        Name: z.ZodString;
                        Type: z.ZodOptional<z.ZodString>;
                    }, "strip", z.ZodTypeAny, {
                        Name: string;
                        Id: string;
                        Type?: string | undefined;
                    }, {
                        Name: string;
                        Id: string;
                        Type?: string | undefined;
                    }>, "many">>;
                    PlaylistItemId: z.ZodOptional<z.ZodString>;
                    PremiereDate: z.ZodOptional<z.ZodString>;
                    ProductionYear: z.ZodNumber;
                    ProviderIds: z.ZodOptional<z.ZodObject<{
                        MusicBrainzAlbum: z.ZodOptional<z.ZodString>;
                        MusicBrainzAlbumArtist: z.ZodOptional<z.ZodString>;
                        MusicBrainzArtist: z.ZodOptional<z.ZodString>;
                        MusicBrainzRecording: z.ZodOptional<z.ZodString>;
                        MusicBrainzReleaseGroup: z.ZodOptional<z.ZodString>;
                        MusicBrainzTrack: z.ZodOptional<z.ZodString>;
                    }, "strip", z.ZodTypeAny, {
                        MusicBrainzAlbum?: string | undefined;
                        MusicBrainzAlbumArtist?: string | undefined;
                        MusicBrainzArtist?: string | undefined;
                        MusicBrainzRecording?: string | undefined;
                        MusicBrainzReleaseGroup?: string | undefined;
                        MusicBrainzTrack?: string | undefined;
                    }, {
                        MusicBrainzAlbum?: string | undefined;
                        MusicBrainzAlbumArtist?: string | undefined;
                        MusicBrainzArtist?: string | undefined;
                        MusicBrainzRecording?: string | undefined;
                        MusicBrainzReleaseGroup?: string | undefined;
                        MusicBrainzTrack?: string | undefined;
                    }>>;
                    RunTimeTicks: z.ZodNumber;
                    ServerId: z.ZodString;
                    SortName: z.ZodOptional<z.ZodString>;
                    Tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                    Type: z.ZodString;
                    UserData: z.ZodOptional<z.ZodObject<{
                        IsFavorite: z.ZodBoolean;
                        Key: z.ZodString;
                        PlaybackPositionTicks: z.ZodNumber;
                        PlayCount: z.ZodNumber;
                        Played: z.ZodBoolean;
                    }, "strip", z.ZodTypeAny, {
                        PlayCount: number;
                        IsFavorite: boolean;
                        Key: string;
                        PlaybackPositionTicks: number;
                        Played: boolean;
                    }, {
                        PlayCount: number;
                        IsFavorite: boolean;
                        Key: string;
                        PlaybackPositionTicks: number;
                        Played: boolean;
                    }>>;
                }, "strip", z.ZodTypeAny, {
                    Name: string;
                    Genres: string[];
                    Album: string;
                    MediaType: string;
                    Id: string;
                    AlbumArtist: string;
                    AlbumArtists: {
                        Name: string;
                        Id: string;
                    }[];
                    AlbumPrimaryImageTag: string;
                    ArtistItems: {
                        Name: string;
                        Id: string;
                    }[];
                    Artists: string[];
                    ChannelId: null;
                    DateCreated: string;
                    ExternalUrls: {
                        Name: string;
                        Url: string;
                    }[];
                    GenreItems: {
                        Name: string;
                        Id: string;
                    }[];
                    ImageBlurHashes: {
                        Backdrop?: Record<string, string> | undefined;
                        Logo?: Record<string, string> | undefined;
                        Primary?: Record<string, string> | undefined;
                    };
                    ImageTags: {
                        Logo?: string | undefined;
                        Primary?: string | undefined;
                    };
                    IsFolder: boolean;
                    LocationType: string;
                    Type: string;
                    ProductionYear: number;
                    RunTimeTicks: number;
                    ServerId: string;
                    BackdropImageTags: string[];
                    IndexNumber: number;
                    MediaSources: {
                        Name: string;
                        Bitrate: number;
                        Id: string;
                        Type: string;
                        RunTimeTicks: number;
                        Container: string;
                        DefaultAudioStreamIndex: number;
                        ETag: string;
                        Formats: any[];
                        GenPtsInput: boolean;
                        IgnoreDts: boolean;
                        IgnoreIndex: boolean;
                        IsInfiniteStream: boolean;
                        IsRemote: boolean;
                        MediaAttachments: any[];
                        MediaStreams: {
                            Codec: string;
                            Level: number;
                            Type: string;
                            CodecTimeBase: string;
                            Index: number;
                            IsDefault: boolean;
                            IsExternal: boolean;
                            IsForced: boolean;
                            IsInterlaced: boolean;
                            IsTextSubtitleStream: boolean;
                            SupportsExternalStream: boolean;
                            TimeBase: string;
                            AspectRatio?: string | undefined;
                            BitDepth?: number | undefined;
                            BitRate?: number | undefined;
                            ChannelLayout?: string | undefined;
                            Channels?: number | undefined;
                            ColorSpace?: string | undefined;
                            Comment?: string | undefined;
                            DisplayTitle?: string | undefined;
                            Height?: number | undefined;
                            PixelFormat?: string | undefined;
                            Profile?: string | undefined;
                            RealFrameRate?: number | undefined;
                            RefFrames?: number | undefined;
                            SampleRate?: number | undefined;
                            Width?: number | undefined;
                        }[];
                        Path: string;
                        Protocol: string;
                        ReadAtNativeFramerate: boolean;
                        RequiresClosing: boolean;
                        RequiresLooping: boolean;
                        RequiresOpening: boolean;
                        Size: number;
                        SupportsDirectPlay: boolean;
                        SupportsDirectStream: boolean;
                        SupportsProbing: boolean;
                        SupportsTranscoding: boolean;
                        RequiredHttpHeaders?: any;
                    }[];
                    ParentIndexNumber: number;
                    SortName?: string | undefined;
                    ParentId?: string | undefined;
                    Tags?: string[] | undefined;
                    PlaylistItemId?: string | undefined;
                    People?: {
                        Name: string;
                        Id: string;
                        Type?: string | undefined;
                    }[] | undefined;
                    PremiereDate?: string | undefined;
                    ProviderIds?: {
                        MusicBrainzAlbum?: string | undefined;
                        MusicBrainzAlbumArtist?: string | undefined;
                        MusicBrainzArtist?: string | undefined;
                        MusicBrainzRecording?: string | undefined;
                        MusicBrainzReleaseGroup?: string | undefined;
                        MusicBrainzTrack?: string | undefined;
                    } | undefined;
                    AlbumId?: string | undefined;
                    LUFS?: number | undefined;
                    NormalizationGain?: number | undefined;
                    UserData?: {
                        PlayCount: number;
                        IsFavorite: boolean;
                        Key: string;
                        PlaybackPositionTicks: number;
                        Played: boolean;
                    } | undefined;
                }, {
                    Name: string;
                    Genres: string[];
                    Album: string;
                    MediaType: string;
                    Id: string;
                    AlbumArtist: string;
                    AlbumArtists: {
                        Name: string;
                        Id: string;
                    }[];
                    AlbumPrimaryImageTag: string;
                    ArtistItems: {
                        Name: string;
                        Id: string;
                    }[];
                    Artists: string[];
                    ChannelId: null;
                    DateCreated: string;
                    ExternalUrls: {
                        Name: string;
                        Url: string;
                    }[];
                    GenreItems: {
                        Name: string;
                        Id: string;
                    }[];
                    ImageBlurHashes: {
                        Backdrop?: Record<string, string> | undefined;
                        Logo?: Record<string, string> | undefined;
                        Primary?: Record<string, string> | undefined;
                    };
                    ImageTags: {
                        Logo?: string | undefined;
                        Primary?: string | undefined;
                    };
                    IsFolder: boolean;
                    LocationType: string;
                    Type: string;
                    ProductionYear: number;
                    RunTimeTicks: number;
                    ServerId: string;
                    BackdropImageTags: string[];
                    IndexNumber: number;
                    MediaSources: {
                        Name: string;
                        Bitrate: number;
                        Id: string;
                        Type: string;
                        RunTimeTicks: number;
                        Container: string;
                        DefaultAudioStreamIndex: number;
                        ETag: string;
                        Formats: any[];
                        GenPtsInput: boolean;
                        IgnoreDts: boolean;
                        IgnoreIndex: boolean;
                        IsInfiniteStream: boolean;
                        IsRemote: boolean;
                        MediaAttachments: any[];
                        MediaStreams: {
                            Codec: string;
                            Level: number;
                            Type: string;
                            CodecTimeBase: string;
                            Index: number;
                            IsDefault: boolean;
                            IsExternal: boolean;
                            IsForced: boolean;
                            IsInterlaced: boolean;
                            IsTextSubtitleStream: boolean;
                            SupportsExternalStream: boolean;
                            TimeBase: string;
                            AspectRatio?: string | undefined;
                            BitDepth?: number | undefined;
                            BitRate?: number | undefined;
                            ChannelLayout?: string | undefined;
                            Channels?: number | undefined;
                            ColorSpace?: string | undefined;
                            Comment?: string | undefined;
                            DisplayTitle?: string | undefined;
                            Height?: number | undefined;
                            PixelFormat?: string | undefined;
                            Profile?: string | undefined;
                            RealFrameRate?: number | undefined;
                            RefFrames?: number | undefined;
                            SampleRate?: number | undefined;
                            Width?: number | undefined;
                        }[];
                        Path: string;
                        Protocol: string;
                        ReadAtNativeFramerate: boolean;
                        RequiresClosing: boolean;
                        RequiresLooping: boolean;
                        RequiresOpening: boolean;
                        Size: number;
                        SupportsDirectPlay: boolean;
                        SupportsDirectStream: boolean;
                        SupportsProbing: boolean;
                        SupportsTranscoding: boolean;
                        RequiredHttpHeaders?: any;
                    }[];
                    ParentIndexNumber: number;
                    SortName?: string | undefined;
                    ParentId?: string | undefined;
                    Tags?: string[] | undefined;
                    PlaylistItemId?: string | undefined;
                    People?: {
                        Name: string;
                        Id: string;
                        Type?: string | undefined;
                    }[] | undefined;
                    PremiereDate?: string | undefined;
                    ProviderIds?: {
                        MusicBrainzAlbum?: string | undefined;
                        MusicBrainzAlbumArtist?: string | undefined;
                        MusicBrainzArtist?: string | undefined;
                        MusicBrainzRecording?: string | undefined;
                        MusicBrainzReleaseGroup?: string | undefined;
                        MusicBrainzTrack?: string | undefined;
                    } | undefined;
                    AlbumId?: string | undefined;
                    LUFS?: number | undefined;
                    NormalizationGain?: number | undefined;
                    UserData?: {
                        PlayCount: number;
                        IsFavorite: boolean;
                        Key: string;
                        PlaybackPositionTicks: number;
                        Played: boolean;
                    } | undefined;
                }>, "many">>;
                SortName: z.ZodOptional<z.ZodString>;
                Studios: z.ZodArray<z.ZodObject<{
                    Id: z.ZodString;
                    Name: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    Name: string;
                    Id: string;
                }, {
                    Name: string;
                    Id: string;
                }>, "many">;
                Tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                Type: z.ZodString;
                UserData: z.ZodOptional<z.ZodObject<{
                    IsFavorite: z.ZodBoolean;
                    Key: z.ZodString;
                    PlaybackPositionTicks: z.ZodNumber;
                    PlayCount: z.ZodNumber;
                    Played: z.ZodBoolean;
                }, "strip", z.ZodTypeAny, {
                    PlayCount: number;
                    IsFavorite: boolean;
                    Key: string;
                    PlaybackPositionTicks: number;
                    Played: boolean;
                }, {
                    PlayCount: number;
                    IsFavorite: boolean;
                    Key: string;
                    PlaybackPositionTicks: number;
                    Played: boolean;
                }>>;
            }, "strip", z.ZodTypeAny, {
                Name: string;
                Genres: string[];
                Id: string;
                AlbumArtist: string;
                AlbumArtists: {
                    Name: string;
                    Id: string;
                }[];
                AlbumPrimaryImageTag: string;
                ArtistItems: {
                    Name: string;
                    Id: string;
                }[];
                Artists: string[];
                ChannelId: null;
                DateCreated: string;
                ExternalUrls: {
                    Name: string;
                    Url: string;
                }[];
                GenreItems: {
                    Name: string;
                    Id: string;
                }[];
                ImageBlurHashes: {
                    Backdrop?: Record<string, string> | undefined;
                    Logo?: Record<string, string> | undefined;
                    Primary?: Record<string, string> | undefined;
                };
                ImageTags: {
                    Logo?: string | undefined;
                    Primary?: string | undefined;
                };
                IsFolder: boolean;
                LocationType: string;
                ParentLogoImageTag: string;
                ParentLogoItemId: string;
                Type: string;
                ProductionYear: number;
                RunTimeTicks: number;
                ServerId: string;
                Studios: {
                    Name: string;
                    Id: string;
                }[];
                SortName?: string | undefined;
                ChildCount?: number | undefined;
                Tags?: string[] | undefined;
                DateLastMediaAdded?: string | undefined;
                People?: {
                    Name: string;
                    Id: string;
                    Type?: string | undefined;
                }[] | undefined;
                PremiereDate?: string | undefined;
                ProviderIds?: {
                    MusicBrainzAlbum?: string | undefined;
                    MusicBrainzAlbumArtist?: string | undefined;
                    MusicBrainzArtist?: string | undefined;
                    MusicBrainzRecording?: string | undefined;
                    MusicBrainzReleaseGroup?: string | undefined;
                    MusicBrainzTrack?: string | undefined;
                } | undefined;
                UserData?: {
                    PlayCount: number;
                    IsFavorite: boolean;
                    Key: string;
                    PlaybackPositionTicks: number;
                    Played: boolean;
                } | undefined;
                Songs?: {
                    Name: string;
                    Genres: string[];
                    Album: string;
                    MediaType: string;
                    Id: string;
                    AlbumArtist: string;
                    AlbumArtists: {
                        Name: string;
                        Id: string;
                    }[];
                    AlbumPrimaryImageTag: string;
                    ArtistItems: {
                        Name: string;
                        Id: string;
                    }[];
                    Artists: string[];
                    ChannelId: null;
                    DateCreated: string;
                    ExternalUrls: {
                        Name: string;
                        Url: string;
                    }[];
                    GenreItems: {
                        Name: string;
                        Id: string;
                    }[];
                    ImageBlurHashes: {
                        Backdrop?: Record<string, string> | undefined;
                        Logo?: Record<string, string> | undefined;
                        Primary?: Record<string, string> | undefined;
                    };
                    ImageTags: {
                        Logo?: string | undefined;
                        Primary?: string | undefined;
                    };
                    IsFolder: boolean;
                    LocationType: string;
                    Type: string;
                    ProductionYear: number;
                    RunTimeTicks: number;
                    ServerId: string;
                    BackdropImageTags: string[];
                    IndexNumber: number;
                    MediaSources: {
                        Name: string;
                        Bitrate: number;
                        Id: string;
                        Type: string;
                        RunTimeTicks: number;
                        Container: string;
                        DefaultAudioStreamIndex: number;
                        ETag: string;
                        Formats: any[];
                        GenPtsInput: boolean;
                        IgnoreDts: boolean;
                        IgnoreIndex: boolean;
                        IsInfiniteStream: boolean;
                        IsRemote: boolean;
                        MediaAttachments: any[];
                        MediaStreams: {
                            Codec: string;
                            Level: number;
                            Type: string;
                            CodecTimeBase: string;
                            Index: number;
                            IsDefault: boolean;
                            IsExternal: boolean;
                            IsForced: boolean;
                            IsInterlaced: boolean;
                            IsTextSubtitleStream: boolean;
                            SupportsExternalStream: boolean;
                            TimeBase: string;
                            AspectRatio?: string | undefined;
                            BitDepth?: number | undefined;
                            BitRate?: number | undefined;
                            ChannelLayout?: string | undefined;
                            Channels?: number | undefined;
                            ColorSpace?: string | undefined;
                            Comment?: string | undefined;
                            DisplayTitle?: string | undefined;
                            Height?: number | undefined;
                            PixelFormat?: string | undefined;
                            Profile?: string | undefined;
                            RealFrameRate?: number | undefined;
                            RefFrames?: number | undefined;
                            SampleRate?: number | undefined;
                            Width?: number | undefined;
                        }[];
                        Path: string;
                        Protocol: string;
                        ReadAtNativeFramerate: boolean;
                        RequiresClosing: boolean;
                        RequiresLooping: boolean;
                        RequiresOpening: boolean;
                        Size: number;
                        SupportsDirectPlay: boolean;
                        SupportsDirectStream: boolean;
                        SupportsProbing: boolean;
                        SupportsTranscoding: boolean;
                        RequiredHttpHeaders?: any;
                    }[];
                    ParentIndexNumber: number;
                    SortName?: string | undefined;
                    ParentId?: string | undefined;
                    Tags?: string[] | undefined;
                    PlaylistItemId?: string | undefined;
                    People?: {
                        Name: string;
                        Id: string;
                        Type?: string | undefined;
                    }[] | undefined;
                    PremiereDate?: string | undefined;
                    ProviderIds?: {
                        MusicBrainzAlbum?: string | undefined;
                        MusicBrainzAlbumArtist?: string | undefined;
                        MusicBrainzArtist?: string | undefined;
                        MusicBrainzRecording?: string | undefined;
                        MusicBrainzReleaseGroup?: string | undefined;
                        MusicBrainzTrack?: string | undefined;
                    } | undefined;
                    AlbumId?: string | undefined;
                    LUFS?: number | undefined;
                    NormalizationGain?: number | undefined;
                    UserData?: {
                        PlayCount: number;
                        IsFavorite: boolean;
                        Key: string;
                        PlaybackPositionTicks: number;
                        Played: boolean;
                    } | undefined;
                }[] | undefined;
            }, {
                Name: string;
                Genres: string[];
                Id: string;
                AlbumArtist: string;
                AlbumArtists: {
                    Name: string;
                    Id: string;
                }[];
                AlbumPrimaryImageTag: string;
                ArtistItems: {
                    Name: string;
                    Id: string;
                }[];
                Artists: string[];
                ChannelId: null;
                DateCreated: string;
                ExternalUrls: {
                    Name: string;
                    Url: string;
                }[];
                GenreItems: {
                    Name: string;
                    Id: string;
                }[];
                ImageBlurHashes: {
                    Backdrop?: Record<string, string> | undefined;
                    Logo?: Record<string, string> | undefined;
                    Primary?: Record<string, string> | undefined;
                };
                ImageTags: {
                    Logo?: string | undefined;
                    Primary?: string | undefined;
                };
                IsFolder: boolean;
                LocationType: string;
                ParentLogoImageTag: string;
                ParentLogoItemId: string;
                Type: string;
                ProductionYear: number;
                RunTimeTicks: number;
                ServerId: string;
                Studios: {
                    Name: string;
                    Id: string;
                }[];
                SortName?: string | undefined;
                ChildCount?: number | undefined;
                Tags?: string[] | undefined;
                DateLastMediaAdded?: string | undefined;
                People?: {
                    Name: string;
                    Id: string;
                    Type?: string | undefined;
                }[] | undefined;
                PremiereDate?: string | undefined;
                ProviderIds?: {
                    MusicBrainzAlbum?: string | undefined;
                    MusicBrainzAlbumArtist?: string | undefined;
                    MusicBrainzArtist?: string | undefined;
                    MusicBrainzRecording?: string | undefined;
                    MusicBrainzReleaseGroup?: string | undefined;
                    MusicBrainzTrack?: string | undefined;
                } | undefined;
                UserData?: {
                    PlayCount: number;
                    IsFavorite: boolean;
                    Key: string;
                    PlaybackPositionTicks: number;
                    Played: boolean;
                } | undefined;
                Songs?: {
                    Name: string;
                    Genres: string[];
                    Album: string;
                    MediaType: string;
                    Id: string;
                    AlbumArtist: string;
                    AlbumArtists: {
                        Name: string;
                        Id: string;
                    }[];
                    AlbumPrimaryImageTag: string;
                    ArtistItems: {
                        Name: string;
                        Id: string;
                    }[];
                    Artists: string[];
                    ChannelId: null;
                    DateCreated: string;
                    ExternalUrls: {
                        Name: string;
                        Url: string;
                    }[];
                    GenreItems: {
                        Name: string;
                        Id: string;
                    }[];
                    ImageBlurHashes: {
                        Backdrop?: Record<string, string> | undefined;
                        Logo?: Record<string, string> | undefined;
                        Primary?: Record<string, string> | undefined;
                    };
                    ImageTags: {
                        Logo?: string | undefined;
                        Primary?: string | undefined;
                    };
                    IsFolder: boolean;
                    LocationType: string;
                    Type: string;
                    ProductionYear: number;
                    RunTimeTicks: number;
                    ServerId: string;
                    BackdropImageTags: string[];
                    IndexNumber: number;
                    MediaSources: {
                        Name: string;
                        Bitrate: number;
                        Id: string;
                        Type: string;
                        RunTimeTicks: number;
                        Container: string;
                        DefaultAudioStreamIndex: number;
                        ETag: string;
                        Formats: any[];
                        GenPtsInput: boolean;
                        IgnoreDts: boolean;
                        IgnoreIndex: boolean;
                        IsInfiniteStream: boolean;
                        IsRemote: boolean;
                        MediaAttachments: any[];
                        MediaStreams: {
                            Codec: string;
                            Level: number;
                            Type: string;
                            CodecTimeBase: string;
                            Index: number;
                            IsDefault: boolean;
                            IsExternal: boolean;
                            IsForced: boolean;
                            IsInterlaced: boolean;
                            IsTextSubtitleStream: boolean;
                            SupportsExternalStream: boolean;
                            TimeBase: string;
                            AspectRatio?: string | undefined;
                            BitDepth?: number | undefined;
                            BitRate?: number | undefined;
                            ChannelLayout?: string | undefined;
                            Channels?: number | undefined;
                            ColorSpace?: string | undefined;
                            Comment?: string | undefined;
                            DisplayTitle?: string | undefined;
                            Height?: number | undefined;
                            PixelFormat?: string | undefined;
                            Profile?: string | undefined;
                            RealFrameRate?: number | undefined;
                            RefFrames?: number | undefined;
                            SampleRate?: number | undefined;
                            Width?: number | undefined;
                        }[];
                        Path: string;
                        Protocol: string;
                        ReadAtNativeFramerate: boolean;
                        RequiresClosing: boolean;
                        RequiresLooping: boolean;
                        RequiresOpening: boolean;
                        Size: number;
                        SupportsDirectPlay: boolean;
                        SupportsDirectStream: boolean;
                        SupportsProbing: boolean;
                        SupportsTranscoding: boolean;
                        RequiredHttpHeaders?: any;
                    }[];
                    ParentIndexNumber: number;
                    SortName?: string | undefined;
                    ParentId?: string | undefined;
                    Tags?: string[] | undefined;
                    PlaylistItemId?: string | undefined;
                    People?: {
                        Name: string;
                        Id: string;
                        Type?: string | undefined;
                    }[] | undefined;
                    PremiereDate?: string | undefined;
                    ProviderIds?: {
                        MusicBrainzAlbum?: string | undefined;
                        MusicBrainzAlbumArtist?: string | undefined;
                        MusicBrainzArtist?: string | undefined;
                        MusicBrainzRecording?: string | undefined;
                        MusicBrainzReleaseGroup?: string | undefined;
                        MusicBrainzTrack?: string | undefined;
                    } | undefined;
                    AlbumId?: string | undefined;
                    LUFS?: number | undefined;
                    NormalizationGain?: number | undefined;
                    UserData?: {
                        PlayCount: number;
                        IsFavorite: boolean;
                        Key: string;
                        PlaybackPositionTicks: number;
                        Played: boolean;
                    } | undefined;
                }[] | undefined;
            }>;
            400: z.ZodObject<{
                errors: z.ZodObject<{
                    recursive: z.ZodArray<z.ZodString, "many">;
                }, "strip", z.ZodTypeAny, {
                    recursive: string[];
                }, {
                    recursive: string[];
                }>;
                status: z.ZodNumber;
                title: z.ZodString;
                traceId: z.ZodString;
                type: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                title: string;
                type: string;
                status: number;
                errors: {
                    recursive: string[];
                };
                traceId: string;
            }, {
                title: string;
                type: string;
                status: number;
                errors: {
                    recursive: string[];
                };
                traceId: string;
            }>;
        };
    };
    getAlbumList: {
        method: "GET";
        query: z.ZodObject<{} & {
            AlbumArtistIds: z.ZodOptional<z.ZodString>;
            ArtistIds: z.ZodOptional<z.ZodString>;
            ContributingArtistIds: z.ZodOptional<z.ZodString>;
            EnableImageTypes: z.ZodOptional<z.ZodString>;
            EnableTotalRecordCount: z.ZodOptional<z.ZodBoolean>;
            EnableUserData: z.ZodOptional<z.ZodBoolean>;
            EnableUserDataTypes: z.ZodOptional<z.ZodBoolean>;
            ExcludeArtistIds: z.ZodOptional<z.ZodString>;
            ExcludeItemIds: z.ZodOptional<z.ZodString>;
            ExcludeItemTypes: z.ZodOptional<z.ZodString>;
            Fields: z.ZodOptional<z.ZodReadonly<z.ZodArray<z.ZodString, "many">>>;
            FolderId: z.ZodOptional<z.ZodString>;
            ImageTypeLimit: z.ZodOptional<z.ZodNumber>;
            IncludeArtists: z.ZodOptional<z.ZodBoolean>;
            IncludeGenres: z.ZodOptional<z.ZodBoolean>;
            IncludeMedia: z.ZodOptional<z.ZodBoolean>;
            IncludePeople: z.ZodOptional<z.ZodBoolean>;
            IncludeStudios: z.ZodOptional<z.ZodBoolean>;
            Limit: z.ZodOptional<z.ZodNumber>;
            MediaTypes: z.ZodOptional<z.ZodString>;
            NameStartsWith: z.ZodOptional<z.ZodString>;
            ParentId: z.ZodOptional<z.ZodString>;
            Recursive: z.ZodOptional<z.ZodBoolean>;
            SortOrder: z.ZodOptional<z.ZodEnum<["Ascending", "Descending"]>>;
            StartIndex: z.ZodOptional<z.ZodNumber>;
            UserId: z.ZodOptional<z.ZodString>;
            Filters: z.ZodOptional<z.ZodString>;
            GenreIds: z.ZodOptional<z.ZodString>;
            Genres: z.ZodOptional<z.ZodString>;
            IncludeItemTypes: z.ZodLiteral<"MusicAlbum">;
            IsFavorite: z.ZodOptional<z.ZodBoolean>;
            SearchTerm: z.ZodOptional<z.ZodString>;
            SortBy: z.ZodOptional<z.ZodNativeEnum<{
                readonly ALBUM_ARTIST: "AlbumArtist,SortName";
                readonly COMMUNITY_RATING: "CommunityRating,SortName";
                readonly CRITIC_RATING: "CriticRating,SortName";
                readonly NAME: "SortName";
                readonly PLAY_COUNT: "PlayCount";
                readonly RANDOM: "Random,SortName";
                readonly RECENTLY_ADDED: "DateCreated,SortName";
                readonly RELEASE_DATE: "ProductionYear,PremiereDate,SortName";
            }>>;
            Tags: z.ZodOptional<z.ZodString>;
            Years: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            IncludeItemTypes: "MusicAlbum";
            Limit?: number | undefined;
            Genres?: string | undefined;
            UserId?: string | undefined;
            AlbumArtistIds?: string | undefined;
            ArtistIds?: string | undefined;
            ContributingArtistIds?: string | undefined;
            EnableImageTypes?: string | undefined;
            EnableTotalRecordCount?: boolean | undefined;
            EnableUserData?: boolean | undefined;
            EnableUserDataTypes?: boolean | undefined;
            ExcludeArtistIds?: string | undefined;
            ExcludeItemIds?: string | undefined;
            ExcludeItemTypes?: string | undefined;
            Fields?: readonly string[] | undefined;
            FolderId?: string | undefined;
            ImageTypeLimit?: number | undefined;
            IncludeArtists?: boolean | undefined;
            IncludeGenres?: boolean | undefined;
            IncludeMedia?: boolean | undefined;
            IncludePeople?: boolean | undefined;
            IncludeStudios?: boolean | undefined;
            IsFavorite?: boolean | undefined;
            MediaTypes?: string | undefined;
            NameStartsWith?: string | undefined;
            ParentId?: string | undefined;
            Recursive?: boolean | undefined;
            SearchTerm?: string | undefined;
            SortBy?: "Random,SortName" | "DateCreated,SortName" | "AlbumArtist,SortName" | "CommunityRating,SortName" | "CriticRating,SortName" | "SortName" | "PlayCount" | "ProductionYear,PremiereDate,SortName" | undefined;
            SortOrder?: "Ascending" | "Descending" | undefined;
            StartIndex?: number | undefined;
            Tags?: string | undefined;
            Years?: string | undefined;
            Filters?: string | undefined;
            GenreIds?: string | undefined;
        }, {
            IncludeItemTypes: "MusicAlbum";
            Limit?: number | undefined;
            Genres?: string | undefined;
            UserId?: string | undefined;
            AlbumArtistIds?: string | undefined;
            ArtistIds?: string | undefined;
            ContributingArtistIds?: string | undefined;
            EnableImageTypes?: string | undefined;
            EnableTotalRecordCount?: boolean | undefined;
            EnableUserData?: boolean | undefined;
            EnableUserDataTypes?: boolean | undefined;
            ExcludeArtistIds?: string | undefined;
            ExcludeItemIds?: string | undefined;
            ExcludeItemTypes?: string | undefined;
            Fields?: readonly string[] | undefined;
            FolderId?: string | undefined;
            ImageTypeLimit?: number | undefined;
            IncludeArtists?: boolean | undefined;
            IncludeGenres?: boolean | undefined;
            IncludeMedia?: boolean | undefined;
            IncludePeople?: boolean | undefined;
            IncludeStudios?: boolean | undefined;
            IsFavorite?: boolean | undefined;
            MediaTypes?: string | undefined;
            NameStartsWith?: string | undefined;
            ParentId?: string | undefined;
            Recursive?: boolean | undefined;
            SearchTerm?: string | undefined;
            SortBy?: "Random,SortName" | "DateCreated,SortName" | "AlbumArtist,SortName" | "CommunityRating,SortName" | "CriticRating,SortName" | "SortName" | "PlayCount" | "ProductionYear,PremiereDate,SortName" | undefined;
            SortOrder?: "Ascending" | "Descending" | undefined;
            StartIndex?: number | undefined;
            Tags?: string | undefined;
            Years?: string | undefined;
            Filters?: string | undefined;
            GenreIds?: string | undefined;
        }>;
        path: "users/:userId/items";
        responses: {
            200: z.ZodObject<{
                StartIndex: z.ZodNumber;
                TotalRecordCount: z.ZodNumber;
            } & {
                Items: z.ZodArray<z.ZodObject<{
                    AlbumArtist: z.ZodString;
                    AlbumArtists: z.ZodArray<z.ZodObject<{
                        Id: z.ZodString;
                        Name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        Name: string;
                        Id: string;
                    }, {
                        Name: string;
                        Id: string;
                    }>, "many">;
                    AlbumPrimaryImageTag: z.ZodString;
                    ArtistItems: z.ZodArray<z.ZodObject<{
                        Id: z.ZodString;
                        Name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        Name: string;
                        Id: string;
                    }, {
                        Name: string;
                        Id: string;
                    }>, "many">;
                    Artists: z.ZodArray<z.ZodString, "many">;
                    ChannelId: z.ZodNull;
                    ChildCount: z.ZodOptional<z.ZodNumber>;
                    DateCreated: z.ZodString;
                    DateLastMediaAdded: z.ZodOptional<z.ZodString>;
                    ExternalUrls: z.ZodArray<z.ZodObject<{
                        Name: z.ZodString;
                        Url: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        Name: string;
                        Url: string;
                    }, {
                        Name: string;
                        Url: string;
                    }>, "many">;
                    GenreItems: z.ZodArray<z.ZodObject<{
                        Id: z.ZodString;
                        Name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        Name: string;
                        Id: string;
                    }, {
                        Name: string;
                        Id: string;
                    }>, "many">;
                    Genres: z.ZodArray<z.ZodString, "many">;
                    Id: z.ZodString;
                    ImageBlurHashes: z.ZodObject<{
                        Backdrop: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
                        Logo: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
                        Primary: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
                    }, "strip", z.ZodTypeAny, {
                        Backdrop?: Record<string, string> | undefined;
                        Logo?: Record<string, string> | undefined;
                        Primary?: Record<string, string> | undefined;
                    }, {
                        Backdrop?: Record<string, string> | undefined;
                        Logo?: Record<string, string> | undefined;
                        Primary?: Record<string, string> | undefined;
                    }>;
                    ImageTags: z.ZodObject<{
                        Logo: z.ZodOptional<z.ZodString>;
                        Primary: z.ZodOptional<z.ZodString>;
                    }, "strip", z.ZodTypeAny, {
                        Logo?: string | undefined;
                        Primary?: string | undefined;
                    }, {
                        Logo?: string | undefined;
                        Primary?: string | undefined;
                    }>;
                    IsFolder: z.ZodBoolean;
                    LocationType: z.ZodString;
                    Name: z.ZodString;
                    ParentLogoImageTag: z.ZodString;
                    ParentLogoItemId: z.ZodString;
                    People: z.ZodOptional<z.ZodArray<z.ZodObject<{
                        Id: z.ZodString;
                        Name: z.ZodString;
                        Type: z.ZodOptional<z.ZodString>;
                    }, "strip", z.ZodTypeAny, {
                        Name: string;
                        Id: string;
                        Type?: string | undefined;
                    }, {
                        Name: string;
                        Id: string;
                        Type?: string | undefined;
                    }>, "many">>;
                    PremiereDate: z.ZodOptional<z.ZodString>;
                    ProductionYear: z.ZodNumber;
                    ProviderIds: z.ZodOptional<z.ZodObject<{
                        MusicBrainzAlbum: z.ZodOptional<z.ZodString>;
                        MusicBrainzAlbumArtist: z.ZodOptional<z.ZodString>;
                        MusicBrainzArtist: z.ZodOptional<z.ZodString>;
                        MusicBrainzRecording: z.ZodOptional<z.ZodString>;
                        MusicBrainzReleaseGroup: z.ZodOptional<z.ZodString>;
                        MusicBrainzTrack: z.ZodOptional<z.ZodString>;
                    }, "strip", z.ZodTypeAny, {
                        MusicBrainzAlbum?: string | undefined;
                        MusicBrainzAlbumArtist?: string | undefined;
                        MusicBrainzArtist?: string | undefined;
                        MusicBrainzRecording?: string | undefined;
                        MusicBrainzReleaseGroup?: string | undefined;
                        MusicBrainzTrack?: string | undefined;
                    }, {
                        MusicBrainzAlbum?: string | undefined;
                        MusicBrainzAlbumArtist?: string | undefined;
                        MusicBrainzArtist?: string | undefined;
                        MusicBrainzRecording?: string | undefined;
                        MusicBrainzReleaseGroup?: string | undefined;
                        MusicBrainzTrack?: string | undefined;
                    }>>;
                    RunTimeTicks: z.ZodNumber;
                    ServerId: z.ZodString;
                    Songs: z.ZodOptional<z.ZodArray<z.ZodObject<{
                        Album: z.ZodString;
                        AlbumArtist: z.ZodString;
                        AlbumArtists: z.ZodArray<z.ZodObject<{
                            Id: z.ZodString;
                            Name: z.ZodString;
                        }, "strip", z.ZodTypeAny, {
                            Name: string;
                            Id: string;
                        }, {
                            Name: string;
                            Id: string;
                        }>, "many">;
                        AlbumId: z.ZodOptional<z.ZodString>;
                        AlbumPrimaryImageTag: z.ZodString;
                        ArtistItems: z.ZodArray<z.ZodObject<{
                            Id: z.ZodString;
                            Name: z.ZodString;
                        }, "strip", z.ZodTypeAny, {
                            Name: string;
                            Id: string;
                        }, {
                            Name: string;
                            Id: string;
                        }>, "many">;
                        Artists: z.ZodArray<z.ZodString, "many">;
                        BackdropImageTags: z.ZodArray<z.ZodString, "many">;
                        ChannelId: z.ZodNull;
                        DateCreated: z.ZodString;
                        ExternalUrls: z.ZodArray<z.ZodObject<{
                            Name: z.ZodString;
                            Url: z.ZodString;
                        }, "strip", z.ZodTypeAny, {
                            Name: string;
                            Url: string;
                        }, {
                            Name: string;
                            Url: string;
                        }>, "many">;
                        GenreItems: z.ZodArray<z.ZodObject<{
                            Id: z.ZodString;
                            Name: z.ZodString;
                        }, "strip", z.ZodTypeAny, {
                            Name: string;
                            Id: string;
                        }, {
                            Name: string;
                            Id: string;
                        }>, "many">;
                        Genres: z.ZodArray<z.ZodString, "many">;
                        Id: z.ZodString;
                        ImageBlurHashes: z.ZodObject<{
                            Backdrop: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
                            Logo: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
                            Primary: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
                        }, "strip", z.ZodTypeAny, {
                            Backdrop?: Record<string, string> | undefined;
                            Logo?: Record<string, string> | undefined;
                            Primary?: Record<string, string> | undefined;
                        }, {
                            Backdrop?: Record<string, string> | undefined;
                            Logo?: Record<string, string> | undefined;
                            Primary?: Record<string, string> | undefined;
                        }>;
                        ImageTags: z.ZodObject<{
                            Logo: z.ZodOptional<z.ZodString>;
                            Primary: z.ZodOptional<z.ZodString>;
                        }, "strip", z.ZodTypeAny, {
                            Logo?: string | undefined;
                            Primary?: string | undefined;
                        }, {
                            Logo?: string | undefined;
                            Primary?: string | undefined;
                        }>;
                        IndexNumber: z.ZodNumber;
                        IsFolder: z.ZodBoolean;
                        LocationType: z.ZodString;
                        LUFS: z.ZodOptional<z.ZodNumber>;
                        MediaSources: z.ZodArray<z.ZodObject<{
                            Bitrate: z.ZodNumber;
                            Container: z.ZodString;
                            DefaultAudioStreamIndex: z.ZodNumber;
                            ETag: z.ZodString;
                            Formats: z.ZodArray<z.ZodAny, "many">;
                            GenPtsInput: z.ZodBoolean;
                            Id: z.ZodString;
                            IgnoreDts: z.ZodBoolean;
                            IgnoreIndex: z.ZodBoolean;
                            IsInfiniteStream: z.ZodBoolean;
                            IsRemote: z.ZodBoolean;
                            MediaAttachments: z.ZodArray<z.ZodAny, "many">;
                            MediaStreams: z.ZodArray<z.ZodObject<{
                                AspectRatio: z.ZodOptional<z.ZodString>;
                                BitDepth: z.ZodOptional<z.ZodNumber>;
                                BitRate: z.ZodOptional<z.ZodNumber>;
                                ChannelLayout: z.ZodOptional<z.ZodString>;
                                Channels: z.ZodOptional<z.ZodNumber>;
                                Codec: z.ZodString;
                                CodecTimeBase: z.ZodString;
                                ColorSpace: z.ZodOptional<z.ZodString>;
                                Comment: z.ZodOptional<z.ZodString>;
                                DisplayTitle: z.ZodOptional<z.ZodString>;
                                Height: z.ZodOptional<z.ZodNumber>;
                                Index: z.ZodNumber;
                                IsDefault: z.ZodBoolean;
                                IsExternal: z.ZodBoolean;
                                IsForced: z.ZodBoolean;
                                IsInterlaced: z.ZodBoolean;
                                IsTextSubtitleStream: z.ZodBoolean;
                                Level: z.ZodNumber;
                                PixelFormat: z.ZodOptional<z.ZodString>;
                                Profile: z.ZodOptional<z.ZodString>;
                                RealFrameRate: z.ZodOptional<z.ZodNumber>;
                                RefFrames: z.ZodOptional<z.ZodNumber>;
                                SampleRate: z.ZodOptional<z.ZodNumber>;
                                SupportsExternalStream: z.ZodBoolean;
                                TimeBase: z.ZodString;
                                Type: z.ZodString;
                                Width: z.ZodOptional<z.ZodNumber>;
                            }, "strip", z.ZodTypeAny, {
                                Codec: string;
                                Level: number;
                                Type: string;
                                CodecTimeBase: string;
                                Index: number;
                                IsDefault: boolean;
                                IsExternal: boolean;
                                IsForced: boolean;
                                IsInterlaced: boolean;
                                IsTextSubtitleStream: boolean;
                                SupportsExternalStream: boolean;
                                TimeBase: string;
                                AspectRatio?: string | undefined;
                                BitDepth?: number | undefined;
                                BitRate?: number | undefined;
                                ChannelLayout?: string | undefined;
                                Channels?: number | undefined;
                                ColorSpace?: string | undefined;
                                Comment?: string | undefined;
                                DisplayTitle?: string | undefined;
                                Height?: number | undefined;
                                PixelFormat?: string | undefined;
                                Profile?: string | undefined;
                                RealFrameRate?: number | undefined;
                                RefFrames?: number | undefined;
                                SampleRate?: number | undefined;
                                Width?: number | undefined;
                            }, {
                                Codec: string;
                                Level: number;
                                Type: string;
                                CodecTimeBase: string;
                                Index: number;
                                IsDefault: boolean;
                                IsExternal: boolean;
                                IsForced: boolean;
                                IsInterlaced: boolean;
                                IsTextSubtitleStream: boolean;
                                SupportsExternalStream: boolean;
                                TimeBase: string;
                                AspectRatio?: string | undefined;
                                BitDepth?: number | undefined;
                                BitRate?: number | undefined;
                                ChannelLayout?: string | undefined;
                                Channels?: number | undefined;
                                ColorSpace?: string | undefined;
                                Comment?: string | undefined;
                                DisplayTitle?: string | undefined;
                                Height?: number | undefined;
                                PixelFormat?: string | undefined;
                                Profile?: string | undefined;
                                RealFrameRate?: number | undefined;
                                RefFrames?: number | undefined;
                                SampleRate?: number | undefined;
                                Width?: number | undefined;
                            }>, "many">;
                            Name: z.ZodString;
                            Path: z.ZodString;
                            Protocol: z.ZodString;
                            ReadAtNativeFramerate: z.ZodBoolean;
                            RequiredHttpHeaders: z.ZodAny;
                            RequiresClosing: z.ZodBoolean;
                            RequiresLooping: z.ZodBoolean;
                            RequiresOpening: z.ZodBoolean;
                            RunTimeTicks: z.ZodNumber;
                            Size: z.ZodNumber;
                            SupportsDirectPlay: z.ZodBoolean;
                            SupportsDirectStream: z.ZodBoolean;
                            SupportsProbing: z.ZodBoolean;
                            SupportsTranscoding: z.ZodBoolean;
                            Type: z.ZodString;
                        }, "strip", z.ZodTypeAny, {
                            Name: string;
                            Bitrate: number;
                            Id: string;
                            Type: string;
                            RunTimeTicks: number;
                            Container: string;
                            DefaultAudioStreamIndex: number;
                            ETag: string;
                            Formats: any[];
                            GenPtsInput: boolean;
                            IgnoreDts: boolean;
                            IgnoreIndex: boolean;
                            IsInfiniteStream: boolean;
                            IsRemote: boolean;
                            MediaAttachments: any[];
                            MediaStreams: {
                                Codec: string;
                                Level: number;
                                Type: string;
                                CodecTimeBase: string;
                                Index: number;
                                IsDefault: boolean;
                                IsExternal: boolean;
                                IsForced: boolean;
                                IsInterlaced: boolean;
                                IsTextSubtitleStream: boolean;
                                SupportsExternalStream: boolean;
                                TimeBase: string;
                                AspectRatio?: string | undefined;
                                BitDepth?: number | undefined;
                                BitRate?: number | undefined;
                                ChannelLayout?: string | undefined;
                                Channels?: number | undefined;
                                ColorSpace?: string | undefined;
                                Comment?: string | undefined;
                                DisplayTitle?: string | undefined;
                                Height?: number | undefined;
                                PixelFormat?: string | undefined;
                                Profile?: string | undefined;
                                RealFrameRate?: number | undefined;
                                RefFrames?: number | undefined;
                                SampleRate?: number | undefined;
                                Width?: number | undefined;
                            }[];
                            Path: string;
                            Protocol: string;
                            ReadAtNativeFramerate: boolean;
                            RequiresClosing: boolean;
                            RequiresLooping: boolean;
                            RequiresOpening: boolean;
                            Size: number;
                            SupportsDirectPlay: boolean;
                            SupportsDirectStream: boolean;
                            SupportsProbing: boolean;
                            SupportsTranscoding: boolean;
                            RequiredHttpHeaders?: any;
                        }, {
                            Name: string;
                            Bitrate: number;
                            Id: string;
                            Type: string;
                            RunTimeTicks: number;
                            Container: string;
                            DefaultAudioStreamIndex: number;
                            ETag: string;
                            Formats: any[];
                            GenPtsInput: boolean;
                            IgnoreDts: boolean;
                            IgnoreIndex: boolean;
                            IsInfiniteStream: boolean;
                            IsRemote: boolean;
                            MediaAttachments: any[];
                            MediaStreams: {
                                Codec: string;
                                Level: number;
                                Type: string;
                                CodecTimeBase: string;
                                Index: number;
                                IsDefault: boolean;
                                IsExternal: boolean;
                                IsForced: boolean;
                                IsInterlaced: boolean;
                                IsTextSubtitleStream: boolean;
                                SupportsExternalStream: boolean;
                                TimeBase: string;
                                AspectRatio?: string | undefined;
                                BitDepth?: number | undefined;
                                BitRate?: number | undefined;
                                ChannelLayout?: string | undefined;
                                Channels?: number | undefined;
                                ColorSpace?: string | undefined;
                                Comment?: string | undefined;
                                DisplayTitle?: string | undefined;
                                Height?: number | undefined;
                                PixelFormat?: string | undefined;
                                Profile?: string | undefined;
                                RealFrameRate?: number | undefined;
                                RefFrames?: number | undefined;
                                SampleRate?: number | undefined;
                                Width?: number | undefined;
                            }[];
                            Path: string;
                            Protocol: string;
                            ReadAtNativeFramerate: boolean;
                            RequiresClosing: boolean;
                            RequiresLooping: boolean;
                            RequiresOpening: boolean;
                            Size: number;
                            SupportsDirectPlay: boolean;
                            SupportsDirectStream: boolean;
                            SupportsProbing: boolean;
                            SupportsTranscoding: boolean;
                            RequiredHttpHeaders?: any;
                        }>, "many">;
                        MediaType: z.ZodString;
                        Name: z.ZodString;
                        NormalizationGain: z.ZodOptional<z.ZodNumber>;
                        ParentId: z.ZodOptional<z.ZodString>;
                        ParentIndexNumber: z.ZodNumber;
                        People: z.ZodOptional<z.ZodArray<z.ZodObject<{
                            Id: z.ZodString;
                            Name: z.ZodString;
                            Type: z.ZodOptional<z.ZodString>;
                        }, "strip", z.ZodTypeAny, {
                            Name: string;
                            Id: string;
                            Type?: string | undefined;
                        }, {
                            Name: string;
                            Id: string;
                            Type?: string | undefined;
                        }>, "many">>;
                        PlaylistItemId: z.ZodOptional<z.ZodString>;
                        PremiereDate: z.ZodOptional<z.ZodString>;
                        ProductionYear: z.ZodNumber;
                        ProviderIds: z.ZodOptional<z.ZodObject<{
                            MusicBrainzAlbum: z.ZodOptional<z.ZodString>;
                            MusicBrainzAlbumArtist: z.ZodOptional<z.ZodString>;
                            MusicBrainzArtist: z.ZodOptional<z.ZodString>;
                            MusicBrainzRecording: z.ZodOptional<z.ZodString>;
                            MusicBrainzReleaseGroup: z.ZodOptional<z.ZodString>;
                            MusicBrainzTrack: z.ZodOptional<z.ZodString>;
                        }, "strip", z.ZodTypeAny, {
                            MusicBrainzAlbum?: string | undefined;
                            MusicBrainzAlbumArtist?: string | undefined;
                            MusicBrainzArtist?: string | undefined;
                            MusicBrainzRecording?: string | undefined;
                            MusicBrainzReleaseGroup?: string | undefined;
                            MusicBrainzTrack?: string | undefined;
                        }, {
                            MusicBrainzAlbum?: string | undefined;
                            MusicBrainzAlbumArtist?: string | undefined;
                            MusicBrainzArtist?: string | undefined;
                            MusicBrainzRecording?: string | undefined;
                            MusicBrainzReleaseGroup?: string | undefined;
                            MusicBrainzTrack?: string | undefined;
                        }>>;
                        RunTimeTicks: z.ZodNumber;
                        ServerId: z.ZodString;
                        SortName: z.ZodOptional<z.ZodString>;
                        Tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                        Type: z.ZodString;
                        UserData: z.ZodOptional<z.ZodObject<{
                            IsFavorite: z.ZodBoolean;
                            Key: z.ZodString;
                            PlaybackPositionTicks: z.ZodNumber;
                            PlayCount: z.ZodNumber;
                            Played: z.ZodBoolean;
                        }, "strip", z.ZodTypeAny, {
                            PlayCount: number;
                            IsFavorite: boolean;
                            Key: string;
                            PlaybackPositionTicks: number;
                            Played: boolean;
                        }, {
                            PlayCount: number;
                            IsFavorite: boolean;
                            Key: string;
                            PlaybackPositionTicks: number;
                            Played: boolean;
                        }>>;
                    }, "strip", z.ZodTypeAny, {
                        Name: string;
                        Genres: string[];
                        Album: string;
                        MediaType: string;
                        Id: string;
                        AlbumArtist: string;
                        AlbumArtists: {
                            Name: string;
                            Id: string;
                        }[];
                        AlbumPrimaryImageTag: string;
                        ArtistItems: {
                            Name: string;
                            Id: string;
                        }[];
                        Artists: string[];
                        ChannelId: null;
                        DateCreated: string;
                        ExternalUrls: {
                            Name: string;
                            Url: string;
                        }[];
                        GenreItems: {
                            Name: string;
                            Id: string;
                        }[];
                        ImageBlurHashes: {
                            Backdrop?: Record<string, string> | undefined;
                            Logo?: Record<string, string> | undefined;
                            Primary?: Record<string, string> | undefined;
                        };
                        ImageTags: {
                            Logo?: string | undefined;
                            Primary?: string | undefined;
                        };
                        IsFolder: boolean;
                        LocationType: string;
                        Type: string;
                        ProductionYear: number;
                        RunTimeTicks: number;
                        ServerId: string;
                        BackdropImageTags: string[];
                        IndexNumber: number;
                        MediaSources: {
                            Name: string;
                            Bitrate: number;
                            Id: string;
                            Type: string;
                            RunTimeTicks: number;
                            Container: string;
                            DefaultAudioStreamIndex: number;
                            ETag: string;
                            Formats: any[];
                            GenPtsInput: boolean;
                            IgnoreDts: boolean;
                            IgnoreIndex: boolean;
                            IsInfiniteStream: boolean;
                            IsRemote: boolean;
                            MediaAttachments: any[];
                            MediaStreams: {
                                Codec: string;
                                Level: number;
                                Type: string;
                                CodecTimeBase: string;
                                Index: number;
                                IsDefault: boolean;
                                IsExternal: boolean;
                                IsForced: boolean;
                                IsInterlaced: boolean;
                                IsTextSubtitleStream: boolean;
                                SupportsExternalStream: boolean;
                                TimeBase: string;
                                AspectRatio?: string | undefined;
                                BitDepth?: number | undefined;
                                BitRate?: number | undefined;
                                ChannelLayout?: string | undefined;
                                Channels?: number | undefined;
                                ColorSpace?: string | undefined;
                                Comment?: string | undefined;
                                DisplayTitle?: string | undefined;
                                Height?: number | undefined;
                                PixelFormat?: string | undefined;
                                Profile?: string | undefined;
                                RealFrameRate?: number | undefined;
                                RefFrames?: number | undefined;
                                SampleRate?: number | undefined;
                                Width?: number | undefined;
                            }[];
                            Path: string;
                            Protocol: string;
                            ReadAtNativeFramerate: boolean;
                            RequiresClosing: boolean;
                            RequiresLooping: boolean;
                            RequiresOpening: boolean;
                            Size: number;
                            SupportsDirectPlay: boolean;
                            SupportsDirectStream: boolean;
                            SupportsProbing: boolean;
                            SupportsTranscoding: boolean;
                            RequiredHttpHeaders?: any;
                        }[];
                        ParentIndexNumber: number;
                        SortName?: string | undefined;
                        ParentId?: string | undefined;
                        Tags?: string[] | undefined;
                        PlaylistItemId?: string | undefined;
                        People?: {
                            Name: string;
                            Id: string;
                            Type?: string | undefined;
                        }[] | undefined;
                        PremiereDate?: string | undefined;
                        ProviderIds?: {
                            MusicBrainzAlbum?: string | undefined;
                            MusicBrainzAlbumArtist?: string | undefined;
                            MusicBrainzArtist?: string | undefined;
                            MusicBrainzRecording?: string | undefined;
                            MusicBrainzReleaseGroup?: string | undefined;
                            MusicBrainzTrack?: string | undefined;
                        } | undefined;
                        AlbumId?: string | undefined;
                        LUFS?: number | undefined;
                        NormalizationGain?: number | undefined;
                        UserData?: {
                            PlayCount: number;
                            IsFavorite: boolean;
                            Key: string;
                            PlaybackPositionTicks: number;
                            Played: boolean;
                        } | undefined;
                    }, {
                        Name: string;
                        Genres: string[];
                        Album: string;
                        MediaType: string;
                        Id: string;
                        AlbumArtist: string;
                        AlbumArtists: {
                            Name: string;
                            Id: string;
                        }[];
                        AlbumPrimaryImageTag: string;
                        ArtistItems: {
                            Name: string;
                            Id: string;
                        }[];
                        Artists: string[];
                        ChannelId: null;
                        DateCreated: string;
                        ExternalUrls: {
                            Name: string;
                            Url: string;
                        }[];
                        GenreItems: {
                            Name: string;
                            Id: string;
                        }[];
                        ImageBlurHashes: {
                            Backdrop?: Record<string, string> | undefined;
                            Logo?: Record<string, string> | undefined;
                            Primary?: Record<string, string> | undefined;
                        };
                        ImageTags: {
                            Logo?: string | undefined;
                            Primary?: string | undefined;
                        };
                        IsFolder: boolean;
                        LocationType: string;
                        Type: string;
                        ProductionYear: number;
                        RunTimeTicks: number;
                        ServerId: string;
                        BackdropImageTags: string[];
                        IndexNumber: number;
                        MediaSources: {
                            Name: string;
                            Bitrate: number;
                            Id: string;
                            Type: string;
                            RunTimeTicks: number;
                            Container: string;
                            DefaultAudioStreamIndex: number;
                            ETag: string;
                            Formats: any[];
                            GenPtsInput: boolean;
                            IgnoreDts: boolean;
                            IgnoreIndex: boolean;
                            IsInfiniteStream: boolean;
                            IsRemote: boolean;
                            MediaAttachments: any[];
                            MediaStreams: {
                                Codec: string;
                                Level: number;
                                Type: string;
                                CodecTimeBase: string;
                                Index: number;
                                IsDefault: boolean;
                                IsExternal: boolean;
                                IsForced: boolean;
                                IsInterlaced: boolean;
                                IsTextSubtitleStream: boolean;
                                SupportsExternalStream: boolean;
                                TimeBase: string;
                                AspectRatio?: string | undefined;
                                BitDepth?: number | undefined;
                                BitRate?: number | undefined;
                                ChannelLayout?: string | undefined;
                                Channels?: number | undefined;
                                ColorSpace?: string | undefined;
                                Comment?: string | undefined;
                                DisplayTitle?: string | undefined;
                                Height?: number | undefined;
                                PixelFormat?: string | undefined;
                                Profile?: string | undefined;
                                RealFrameRate?: number | undefined;
                                RefFrames?: number | undefined;
                                SampleRate?: number | undefined;
                                Width?: number | undefined;
                            }[];
                            Path: string;
                            Protocol: string;
                            ReadAtNativeFramerate: boolean;
                            RequiresClosing: boolean;
                            RequiresLooping: boolean;
                            RequiresOpening: boolean;
                            Size: number;
                            SupportsDirectPlay: boolean;
                            SupportsDirectStream: boolean;
                            SupportsProbing: boolean;
                            SupportsTranscoding: boolean;
                            RequiredHttpHeaders?: any;
                        }[];
                        ParentIndexNumber: number;
                        SortName?: string | undefined;
                        ParentId?: string | undefined;
                        Tags?: string[] | undefined;
                        PlaylistItemId?: string | undefined;
                        People?: {
                            Name: string;
                            Id: string;
                            Type?: string | undefined;
                        }[] | undefined;
                        PremiereDate?: string | undefined;
                        ProviderIds?: {
                            MusicBrainzAlbum?: string | undefined;
                            MusicBrainzAlbumArtist?: string | undefined;
                            MusicBrainzArtist?: string | undefined;
                            MusicBrainzRecording?: string | undefined;
                            MusicBrainzReleaseGroup?: string | undefined;
                            MusicBrainzTrack?: string | undefined;
                        } | undefined;
                        AlbumId?: string | undefined;
                        LUFS?: number | undefined;
                        NormalizationGain?: number | undefined;
                        UserData?: {
                            PlayCount: number;
                            IsFavorite: boolean;
                            Key: string;
                            PlaybackPositionTicks: number;
                            Played: boolean;
                        } | undefined;
                    }>, "many">>;
                    SortName: z.ZodOptional<z.ZodString>;
                    Studios: z.ZodArray<z.ZodObject<{
                        Id: z.ZodString;
                        Name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        Name: string;
                        Id: string;
                    }, {
                        Name: string;
                        Id: string;
                    }>, "many">;
                    Tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                    Type: z.ZodString;
                    UserData: z.ZodOptional<z.ZodObject<{
                        IsFavorite: z.ZodBoolean;
                        Key: z.ZodString;
                        PlaybackPositionTicks: z.ZodNumber;
                        PlayCount: z.ZodNumber;
                        Played: z.ZodBoolean;
                    }, "strip", z.ZodTypeAny, {
                        PlayCount: number;
                        IsFavorite: boolean;
                        Key: string;
                        PlaybackPositionTicks: number;
                        Played: boolean;
                    }, {
                        PlayCount: number;
                        IsFavorite: boolean;
                        Key: string;
                        PlaybackPositionTicks: number;
                        Played: boolean;
                    }>>;
                }, "strip", z.ZodTypeAny, {
                    Name: string;
                    Genres: string[];
                    Id: string;
                    AlbumArtist: string;
                    AlbumArtists: {
                        Name: string;
                        Id: string;
                    }[];
                    AlbumPrimaryImageTag: string;
                    ArtistItems: {
                        Name: string;
                        Id: string;
                    }[];
                    Artists: string[];
                    ChannelId: null;
                    DateCreated: string;
                    ExternalUrls: {
                        Name: string;
                        Url: string;
                    }[];
                    GenreItems: {
                        Name: string;
                        Id: string;
                    }[];
                    ImageBlurHashes: {
                        Backdrop?: Record<string, string> | undefined;
                        Logo?: Record<string, string> | undefined;
                        Primary?: Record<string, string> | undefined;
                    };
                    ImageTags: {
                        Logo?: string | undefined;
                        Primary?: string | undefined;
                    };
                    IsFolder: boolean;
                    LocationType: string;
                    ParentLogoImageTag: string;
                    ParentLogoItemId: string;
                    Type: string;
                    ProductionYear: number;
                    RunTimeTicks: number;
                    ServerId: string;
                    Studios: {
                        Name: string;
                        Id: string;
                    }[];
                    SortName?: string | undefined;
                    ChildCount?: number | undefined;
                    Tags?: string[] | undefined;
                    DateLastMediaAdded?: string | undefined;
                    People?: {
                        Name: string;
                        Id: string;
                        Type?: string | undefined;
                    }[] | undefined;
                    PremiereDate?: string | undefined;
                    ProviderIds?: {
                        MusicBrainzAlbum?: string | undefined;
                        MusicBrainzAlbumArtist?: string | undefined;
                        MusicBrainzArtist?: string | undefined;
                        MusicBrainzRecording?: string | undefined;
                        MusicBrainzReleaseGroup?: string | undefined;
                        MusicBrainzTrack?: string | undefined;
                    } | undefined;
                    UserData?: {
                        PlayCount: number;
                        IsFavorite: boolean;
                        Key: string;
                        PlaybackPositionTicks: number;
                        Played: boolean;
                    } | undefined;
                    Songs?: {
                        Name: string;
                        Genres: string[];
                        Album: string;
                        MediaType: string;
                        Id: string;
                        AlbumArtist: string;
                        AlbumArtists: {
                            Name: string;
                            Id: string;
                        }[];
                        AlbumPrimaryImageTag: string;
                        ArtistItems: {
                            Name: string;
                            Id: string;
                        }[];
                        Artists: string[];
                        ChannelId: null;
                        DateCreated: string;
                        ExternalUrls: {
                            Name: string;
                            Url: string;
                        }[];
                        GenreItems: {
                            Name: string;
                            Id: string;
                        }[];
                        ImageBlurHashes: {
                            Backdrop?: Record<string, string> | undefined;
                            Logo?: Record<string, string> | undefined;
                            Primary?: Record<string, string> | undefined;
                        };
                        ImageTags: {
                            Logo?: string | undefined;
                            Primary?: string | undefined;
                        };
                        IsFolder: boolean;
                        LocationType: string;
                        Type: string;
                        ProductionYear: number;
                        RunTimeTicks: number;
                        ServerId: string;
                        BackdropImageTags: string[];
                        IndexNumber: number;
                        MediaSources: {
                            Name: string;
                            Bitrate: number;
                            Id: string;
                            Type: string;
                            RunTimeTicks: number;
                            Container: string;
                            DefaultAudioStreamIndex: number;
                            ETag: string;
                            Formats: any[];
                            GenPtsInput: boolean;
                            IgnoreDts: boolean;
                            IgnoreIndex: boolean;
                            IsInfiniteStream: boolean;
                            IsRemote: boolean;
                            MediaAttachments: any[];
                            MediaStreams: {
                                Codec: string;
                                Level: number;
                                Type: string;
                                CodecTimeBase: string;
                                Index: number;
                                IsDefault: boolean;
                                IsExternal: boolean;
                                IsForced: boolean;
                                IsInterlaced: boolean;
                                IsTextSubtitleStream: boolean;
                                SupportsExternalStream: boolean;
                                TimeBase: string;
                                AspectRatio?: string | undefined;
                                BitDepth?: number | undefined;
                                BitRate?: number | undefined;
                                ChannelLayout?: string | undefined;
                                Channels?: number | undefined;
                                ColorSpace?: string | undefined;
                                Comment?: string | undefined;
                                DisplayTitle?: string | undefined;
                                Height?: number | undefined;
                                PixelFormat?: string | undefined;
                                Profile?: string | undefined;
                                RealFrameRate?: number | undefined;
                                RefFrames?: number | undefined;
                                SampleRate?: number | undefined;
                                Width?: number | undefined;
                            }[];
                            Path: string;
                            Protocol: string;
                            ReadAtNativeFramerate: boolean;
                            RequiresClosing: boolean;
                            RequiresLooping: boolean;
                            RequiresOpening: boolean;
                            Size: number;
                            SupportsDirectPlay: boolean;
                            SupportsDirectStream: boolean;
                            SupportsProbing: boolean;
                            SupportsTranscoding: boolean;
                            RequiredHttpHeaders?: any;
                        }[];
                        ParentIndexNumber: number;
                        SortName?: string | undefined;
                        ParentId?: string | undefined;
                        Tags?: string[] | undefined;
                        PlaylistItemId?: string | undefined;
                        People?: {
                            Name: string;
                            Id: string;
                            Type?: string | undefined;
                        }[] | undefined;
                        PremiereDate?: string | undefined;
                        ProviderIds?: {
                            MusicBrainzAlbum?: string | undefined;
                            MusicBrainzAlbumArtist?: string | undefined;
                            MusicBrainzArtist?: string | undefined;
                            MusicBrainzRecording?: string | undefined;
                            MusicBrainzReleaseGroup?: string | undefined;
                            MusicBrainzTrack?: string | undefined;
                        } | undefined;
                        AlbumId?: string | undefined;
                        LUFS?: number | undefined;
                        NormalizationGain?: number | undefined;
                        UserData?: {
                            PlayCount: number;
                            IsFavorite: boolean;
                            Key: string;
                            PlaybackPositionTicks: number;
                            Played: boolean;
                        } | undefined;
                    }[] | undefined;
                }, {
                    Name: string;
                    Genres: string[];
                    Id: string;
                    AlbumArtist: string;
                    AlbumArtists: {
                        Name: string;
                        Id: string;
                    }[];
                    AlbumPrimaryImageTag: string;
                    ArtistItems: {
                        Name: string;
                        Id: string;
                    }[];
                    Artists: string[];
                    ChannelId: null;
                    DateCreated: string;
                    ExternalUrls: {
                        Name: string;
                        Url: string;
                    }[];
                    GenreItems: {
                        Name: string;
                        Id: string;
                    }[];
                    ImageBlurHashes: {
                        Backdrop?: Record<string, string> | undefined;
                        Logo?: Record<string, string> | undefined;
                        Primary?: Record<string, string> | undefined;
                    };
                    ImageTags: {
                        Logo?: string | undefined;
                        Primary?: string | undefined;
                    };
                    IsFolder: boolean;
                    LocationType: string;
                    ParentLogoImageTag: string;
                    ParentLogoItemId: string;
                    Type: string;
                    ProductionYear: number;
                    RunTimeTicks: number;
                    ServerId: string;
                    Studios: {
                        Name: string;
                        Id: string;
                    }[];
                    SortName?: string | undefined;
                    ChildCount?: number | undefined;
                    Tags?: string[] | undefined;
                    DateLastMediaAdded?: string | undefined;
                    People?: {
                        Name: string;
                        Id: string;
                        Type?: string | undefined;
                    }[] | undefined;
                    PremiereDate?: string | undefined;
                    ProviderIds?: {
                        MusicBrainzAlbum?: string | undefined;
                        MusicBrainzAlbumArtist?: string | undefined;
                        MusicBrainzArtist?: string | undefined;
                        MusicBrainzRecording?: string | undefined;
                        MusicBrainzReleaseGroup?: string | undefined;
                        MusicBrainzTrack?: string | undefined;
                    } | undefined;
                    UserData?: {
                        PlayCount: number;
                        IsFavorite: boolean;
                        Key: string;
                        PlaybackPositionTicks: number;
                        Played: boolean;
                    } | undefined;
                    Songs?: {
                        Name: string;
                        Genres: string[];
                        Album: string;
                        MediaType: string;
                        Id: string;
                        AlbumArtist: string;
                        AlbumArtists: {
                            Name: string;
                            Id: string;
                        }[];
                        AlbumPrimaryImageTag: string;
                        ArtistItems: {
                            Name: string;
                            Id: string;
                        }[];
                        Artists: string[];
                        ChannelId: null;
                        DateCreated: string;
                        ExternalUrls: {
                            Name: string;
                            Url: string;
                        }[];
                        GenreItems: {
                            Name: string;
                            Id: string;
                        }[];
                        ImageBlurHashes: {
                            Backdrop?: Record<string, string> | undefined;
                            Logo?: Record<string, string> | undefined;
                            Primary?: Record<string, string> | undefined;
                        };
                        ImageTags: {
                            Logo?: string | undefined;
                            Primary?: string | undefined;
                        };
                        IsFolder: boolean;
                        LocationType: string;
                        Type: string;
                        ProductionYear: number;
                        RunTimeTicks: number;
                        ServerId: string;
                        BackdropImageTags: string[];
                        IndexNumber: number;
                        MediaSources: {
                            Name: string;
                            Bitrate: number;
                            Id: string;
                            Type: string;
                            RunTimeTicks: number;
                            Container: string;
                            DefaultAudioStreamIndex: number;
                            ETag: string;
                            Formats: any[];
                            GenPtsInput: boolean;
                            IgnoreDts: boolean;
                            IgnoreIndex: boolean;
                            IsInfiniteStream: boolean;
                            IsRemote: boolean;
                            MediaAttachments: any[];
                            MediaStreams: {
                                Codec: string;
                                Level: number;
                                Type: string;
                                CodecTimeBase: string;
                                Index: number;
                                IsDefault: boolean;
                                IsExternal: boolean;
                                IsForced: boolean;
                                IsInterlaced: boolean;
                                IsTextSubtitleStream: boolean;
                                SupportsExternalStream: boolean;
                                TimeBase: string;
                                AspectRatio?: string | undefined;
                                BitDepth?: number | undefined;
                                BitRate?: number | undefined;
                                ChannelLayout?: string | undefined;
                                Channels?: number | undefined;
                                ColorSpace?: string | undefined;
                                Comment?: string | undefined;
                                DisplayTitle?: string | undefined;
                                Height?: number | undefined;
                                PixelFormat?: string | undefined;
                                Profile?: string | undefined;
                                RealFrameRate?: number | undefined;
                                RefFrames?: number | undefined;
                                SampleRate?: number | undefined;
                                Width?: number | undefined;
                            }[];
                            Path: string;
                            Protocol: string;
                            ReadAtNativeFramerate: boolean;
                            RequiresClosing: boolean;
                            RequiresLooping: boolean;
                            RequiresOpening: boolean;
                            Size: number;
                            SupportsDirectPlay: boolean;
                            SupportsDirectStream: boolean;
                            SupportsProbing: boolean;
                            SupportsTranscoding: boolean;
                            RequiredHttpHeaders?: any;
                        }[];
                        ParentIndexNumber: number;
                        SortName?: string | undefined;
                        ParentId?: string | undefined;
                        Tags?: string[] | undefined;
                        PlaylistItemId?: string | undefined;
                        People?: {
                            Name: string;
                            Id: string;
                            Type?: string | undefined;
                        }[] | undefined;
                        PremiereDate?: string | undefined;
                        ProviderIds?: {
                            MusicBrainzAlbum?: string | undefined;
                            MusicBrainzAlbumArtist?: string | undefined;
                            MusicBrainzArtist?: string | undefined;
                            MusicBrainzRecording?: string | undefined;
                            MusicBrainzReleaseGroup?: string | undefined;
                            MusicBrainzTrack?: string | undefined;
                        } | undefined;
                        AlbumId?: string | undefined;
                        LUFS?: number | undefined;
                        NormalizationGain?: number | undefined;
                        UserData?: {
                            PlayCount: number;
                            IsFavorite: boolean;
                            Key: string;
                            PlaybackPositionTicks: number;
                            Played: boolean;
                        } | undefined;
                    }[] | undefined;
                }>, "many">;
            }, "strip", z.ZodTypeAny, {
                StartIndex: number;
                TotalRecordCount: number;
                Items: {
                    Name: string;
                    Genres: string[];
                    Id: string;
                    AlbumArtist: string;
                    AlbumArtists: {
                        Name: string;
                        Id: string;
                    }[];
                    AlbumPrimaryImageTag: string;
                    ArtistItems: {
                        Name: string;
                        Id: string;
                    }[];
                    Artists: string[];
                    ChannelId: null;
                    DateCreated: string;
                    ExternalUrls: {
                        Name: string;
                        Url: string;
                    }[];
                    GenreItems: {
                        Name: string;
                        Id: string;
                    }[];
                    ImageBlurHashes: {
                        Backdrop?: Record<string, string> | undefined;
                        Logo?: Record<string, string> | undefined;
                        Primary?: Record<string, string> | undefined;
                    };
                    ImageTags: {
                        Logo?: string | undefined;
                        Primary?: string | undefined;
                    };
                    IsFolder: boolean;
                    LocationType: string;
                    ParentLogoImageTag: string;
                    ParentLogoItemId: string;
                    Type: string;
                    ProductionYear: number;
                    RunTimeTicks: number;
                    ServerId: string;
                    Studios: {
                        Name: string;
                        Id: string;
                    }[];
                    SortName?: string | undefined;
                    ChildCount?: number | undefined;
                    Tags?: string[] | undefined;
                    DateLastMediaAdded?: string | undefined;
                    People?: {
                        Name: string;
                        Id: string;
                        Type?: string | undefined;
                    }[] | undefined;
                    PremiereDate?: string | undefined;
                    ProviderIds?: {
                        MusicBrainzAlbum?: string | undefined;
                        MusicBrainzAlbumArtist?: string | undefined;
                        MusicBrainzArtist?: string | undefined;
                        MusicBrainzRecording?: string | undefined;
                        MusicBrainzReleaseGroup?: string | undefined;
                        MusicBrainzTrack?: string | undefined;
                    } | undefined;
                    UserData?: {
                        PlayCount: number;
                        IsFavorite: boolean;
                        Key: string;
                        PlaybackPositionTicks: number;
                        Played: boolean;
                    } | undefined;
                    Songs?: {
                        Name: string;
                        Genres: string[];
                        Album: string;
                        MediaType: string;
                        Id: string;
                        AlbumArtist: string;
                        AlbumArtists: {
                            Name: string;
                            Id: string;
                        }[];
                        AlbumPrimaryImageTag: string;
                        ArtistItems: {
                            Name: string;
                            Id: string;
                        }[];
                        Artists: string[];
                        ChannelId: null;
                        DateCreated: string;
                        ExternalUrls: {
                            Name: string;
                            Url: string;
                        }[];
                        GenreItems: {
                            Name: string;
                            Id: string;
                        }[];
                        ImageBlurHashes: {
                            Backdrop?: Record<string, string> | undefined;
                            Logo?: Record<string, string> | undefined;
                            Primary?: Record<string, string> | undefined;
                        };
                        ImageTags: {
                            Logo?: string | undefined;
                            Primary?: string | undefined;
                        };
                        IsFolder: boolean;
                        LocationType: string;
                        Type: string;
                        ProductionYear: number;
                        RunTimeTicks: number;
                        ServerId: string;
                        BackdropImageTags: string[];
                        IndexNumber: number;
                        MediaSources: {
                            Name: string;
                            Bitrate: number;
                            Id: string;
                            Type: string;
                            RunTimeTicks: number;
                            Container: string;
                            DefaultAudioStreamIndex: number;
                            ETag: string;
                            Formats: any[];
                            GenPtsInput: boolean;
                            IgnoreDts: boolean;
                            IgnoreIndex: boolean;
                            IsInfiniteStream: boolean;
                            IsRemote: boolean;
                            MediaAttachments: any[];
                            MediaStreams: {
                                Codec: string;
                                Level: number;
                                Type: string;
                                CodecTimeBase: string;
                                Index: number;
                                IsDefault: boolean;
                                IsExternal: boolean;
                                IsForced: boolean;
                                IsInterlaced: boolean;
                                IsTextSubtitleStream: boolean;
                                SupportsExternalStream: boolean;
                                TimeBase: string;
                                AspectRatio?: string | undefined;
                                BitDepth?: number | undefined;
                                BitRate?: number | undefined;
                                ChannelLayout?: string | undefined;
                                Channels?: number | undefined;
                                ColorSpace?: string | undefined;
                                Comment?: string | undefined;
                                DisplayTitle?: string | undefined;
                                Height?: number | undefined;
                                PixelFormat?: string | undefined;
                                Profile?: string | undefined;
                                RealFrameRate?: number | undefined;
                                RefFrames?: number | undefined;
                                SampleRate?: number | undefined;
                                Width?: number | undefined;
                            }[];
                            Path: string;
                            Protocol: string;
                            ReadAtNativeFramerate: boolean;
                            RequiresClosing: boolean;
                            RequiresLooping: boolean;
                            RequiresOpening: boolean;
                            Size: number;
                            SupportsDirectPlay: boolean;
                            SupportsDirectStream: boolean;
                            SupportsProbing: boolean;
                            SupportsTranscoding: boolean;
                            RequiredHttpHeaders?: any;
                        }[];
                        ParentIndexNumber: number;
                        SortName?: string | undefined;
                        ParentId?: string | undefined;
                        Tags?: string[] | undefined;
                        PlaylistItemId?: string | undefined;
                        People?: {
                            Name: string;
                            Id: string;
                            Type?: string | undefined;
                        }[] | undefined;
                        PremiereDate?: string | undefined;
                        ProviderIds?: {
                            MusicBrainzAlbum?: string | undefined;
                            MusicBrainzAlbumArtist?: string | undefined;
                            MusicBrainzArtist?: string | undefined;
                            MusicBrainzRecording?: string | undefined;
                            MusicBrainzReleaseGroup?: string | undefined;
                            MusicBrainzTrack?: string | undefined;
                        } | undefined;
                        AlbumId?: string | undefined;
                        LUFS?: number | undefined;
                        NormalizationGain?: number | undefined;
                        UserData?: {
                            PlayCount: number;
                            IsFavorite: boolean;
                            Key: string;
                            PlaybackPositionTicks: number;
                            Played: boolean;
                        } | undefined;
                    }[] | undefined;
                }[];
            }, {
                StartIndex: number;
                TotalRecordCount: number;
                Items: {
                    Name: string;
                    Genres: string[];
                    Id: string;
                    AlbumArtist: string;
                    AlbumArtists: {
                        Name: string;
                        Id: string;
                    }[];
                    AlbumPrimaryImageTag: string;
                    ArtistItems: {
                        Name: string;
                        Id: string;
                    }[];
                    Artists: string[];
                    ChannelId: null;
                    DateCreated: string;
                    ExternalUrls: {
                        Name: string;
                        Url: string;
                    }[];
                    GenreItems: {
                        Name: string;
                        Id: string;
                    }[];
                    ImageBlurHashes: {
                        Backdrop?: Record<string, string> | undefined;
                        Logo?: Record<string, string> | undefined;
                        Primary?: Record<string, string> | undefined;
                    };
                    ImageTags: {
                        Logo?: string | undefined;
                        Primary?: string | undefined;
                    };
                    IsFolder: boolean;
                    LocationType: string;
                    ParentLogoImageTag: string;
                    ParentLogoItemId: string;
                    Type: string;
                    ProductionYear: number;
                    RunTimeTicks: number;
                    ServerId: string;
                    Studios: {
                        Name: string;
                        Id: string;
                    }[];
                    SortName?: string | undefined;
                    ChildCount?: number | undefined;
                    Tags?: string[] | undefined;
                    DateLastMediaAdded?: string | undefined;
                    People?: {
                        Name: string;
                        Id: string;
                        Type?: string | undefined;
                    }[] | undefined;
                    PremiereDate?: string | undefined;
                    ProviderIds?: {
                        MusicBrainzAlbum?: string | undefined;
                        MusicBrainzAlbumArtist?: string | undefined;
                        MusicBrainzArtist?: string | undefined;
                        MusicBrainzRecording?: string | undefined;
                        MusicBrainzReleaseGroup?: string | undefined;
                        MusicBrainzTrack?: string | undefined;
                    } | undefined;
                    UserData?: {
                        PlayCount: number;
                        IsFavorite: boolean;
                        Key: string;
                        PlaybackPositionTicks: number;
                        Played: boolean;
                    } | undefined;
                    Songs?: {
                        Name: string;
                        Genres: string[];
                        Album: string;
                        MediaType: string;
                        Id: string;
                        AlbumArtist: string;
                        AlbumArtists: {
                            Name: string;
                            Id: string;
                        }[];
                        AlbumPrimaryImageTag: string;
                        ArtistItems: {
                            Name: string;
                            Id: string;
                        }[];
                        Artists: string[];
                        ChannelId: null;
                        DateCreated: string;
                        ExternalUrls: {
                            Name: string;
                            Url: string;
                        }[];
                        GenreItems: {
                            Name: string;
                            Id: string;
                        }[];
                        ImageBlurHashes: {
                            Backdrop?: Record<string, string> | undefined;
                            Logo?: Record<string, string> | undefined;
                            Primary?: Record<string, string> | undefined;
                        };
                        ImageTags: {
                            Logo?: string | undefined;
                            Primary?: string | undefined;
                        };
                        IsFolder: boolean;
                        LocationType: string;
                        Type: string;
                        ProductionYear: number;
                        RunTimeTicks: number;
                        ServerId: string;
                        BackdropImageTags: string[];
                        IndexNumber: number;
                        MediaSources: {
                            Name: string;
                            Bitrate: number;
                            Id: string;
                            Type: string;
                            RunTimeTicks: number;
                            Container: string;
                            DefaultAudioStreamIndex: number;
                            ETag: string;
                            Formats: any[];
                            GenPtsInput: boolean;
                            IgnoreDts: boolean;
                            IgnoreIndex: boolean;
                            IsInfiniteStream: boolean;
                            IsRemote: boolean;
                            MediaAttachments: any[];
                            MediaStreams: {
                                Codec: string;
                                Level: number;
                                Type: string;
                                CodecTimeBase: string;
                                Index: number;
                                IsDefault: boolean;
                                IsExternal: boolean;
                                IsForced: boolean;
                                IsInterlaced: boolean;
                                IsTextSubtitleStream: boolean;
                                SupportsExternalStream: boolean;
                                TimeBase: string;
                                AspectRatio?: string | undefined;
                                BitDepth?: number | undefined;
                                BitRate?: number | undefined;
                                ChannelLayout?: string | undefined;
                                Channels?: number | undefined;
                                ColorSpace?: string | undefined;
                                Comment?: string | undefined;
                                DisplayTitle?: string | undefined;
                                Height?: number | undefined;
                                PixelFormat?: string | undefined;
                                Profile?: string | undefined;
                                RealFrameRate?: number | undefined;
                                RefFrames?: number | undefined;
                                SampleRate?: number | undefined;
                                Width?: number | undefined;
                            }[];
                            Path: string;
                            Protocol: string;
                            ReadAtNativeFramerate: boolean;
                            RequiresClosing: boolean;
                            RequiresLooping: boolean;
                            RequiresOpening: boolean;
                            Size: number;
                            SupportsDirectPlay: boolean;
                            SupportsDirectStream: boolean;
                            SupportsProbing: boolean;
                            SupportsTranscoding: boolean;
                            RequiredHttpHeaders?: any;
                        }[];
                        ParentIndexNumber: number;
                        SortName?: string | undefined;
                        ParentId?: string | undefined;
                        Tags?: string[] | undefined;
                        PlaylistItemId?: string | undefined;
                        People?: {
                            Name: string;
                            Id: string;
                            Type?: string | undefined;
                        }[] | undefined;
                        PremiereDate?: string | undefined;
                        ProviderIds?: {
                            MusicBrainzAlbum?: string | undefined;
                            MusicBrainzAlbumArtist?: string | undefined;
                            MusicBrainzArtist?: string | undefined;
                            MusicBrainzRecording?: string | undefined;
                            MusicBrainzReleaseGroup?: string | undefined;
                            MusicBrainzTrack?: string | undefined;
                        } | undefined;
                        AlbumId?: string | undefined;
                        LUFS?: number | undefined;
                        NormalizationGain?: number | undefined;
                        UserData?: {
                            PlayCount: number;
                            IsFavorite: boolean;
                            Key: string;
                            PlaybackPositionTicks: number;
                            Played: boolean;
                        } | undefined;
                    }[] | undefined;
                }[];
            }>;
            400: z.ZodObject<{
                errors: z.ZodObject<{
                    recursive: z.ZodArray<z.ZodString, "many">;
                }, "strip", z.ZodTypeAny, {
                    recursive: string[];
                }, {
                    recursive: string[];
                }>;
                status: z.ZodNumber;
                title: z.ZodString;
                traceId: z.ZodString;
                type: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                title: string;
                type: string;
                status: number;
                errors: {
                    recursive: string[];
                };
                traceId: string;
            }, {
                title: string;
                type: string;
                status: number;
                errors: {
                    recursive: string[];
                };
                traceId: string;
            }>;
        };
    };
    getArtistList: {
        method: "GET";
        query: z.ZodObject<{} & {
            AlbumArtistIds: z.ZodOptional<z.ZodString>;
            ArtistIds: z.ZodOptional<z.ZodString>;
            ContributingArtistIds: z.ZodOptional<z.ZodString>;
            EnableImageTypes: z.ZodOptional<z.ZodString>;
            EnableTotalRecordCount: z.ZodOptional<z.ZodBoolean>;
            EnableUserData: z.ZodOptional<z.ZodBoolean>;
            EnableUserDataTypes: z.ZodOptional<z.ZodBoolean>;
            ExcludeArtistIds: z.ZodOptional<z.ZodString>;
            ExcludeItemIds: z.ZodOptional<z.ZodString>;
            ExcludeItemTypes: z.ZodOptional<z.ZodString>;
            Fields: z.ZodOptional<z.ZodReadonly<z.ZodArray<z.ZodString, "many">>>;
            FolderId: z.ZodOptional<z.ZodString>;
            ImageTypeLimit: z.ZodOptional<z.ZodNumber>;
            IncludeArtists: z.ZodOptional<z.ZodBoolean>;
            IncludeGenres: z.ZodOptional<z.ZodBoolean>;
            IncludeItemTypes: z.ZodOptional<z.ZodString>;
            IncludeMedia: z.ZodOptional<z.ZodBoolean>;
            IncludePeople: z.ZodOptional<z.ZodBoolean>;
            IncludeStudios: z.ZodOptional<z.ZodBoolean>;
            IsFavorite: z.ZodOptional<z.ZodBoolean>;
            Limit: z.ZodOptional<z.ZodNumber>;
            MediaTypes: z.ZodOptional<z.ZodString>;
            NameStartsWith: z.ZodOptional<z.ZodString>;
            ParentId: z.ZodOptional<z.ZodString>;
            Recursive: z.ZodOptional<z.ZodBoolean>;
            SearchTerm: z.ZodOptional<z.ZodString>;
            SortOrder: z.ZodOptional<z.ZodEnum<["Ascending", "Descending"]>>;
            StartIndex: z.ZodOptional<z.ZodNumber>;
            Tags: z.ZodOptional<z.ZodString>;
            UserId: z.ZodOptional<z.ZodString>;
            Filters: z.ZodOptional<z.ZodString>;
            Genres: z.ZodOptional<z.ZodString>;
            SortBy: z.ZodOptional<z.ZodNativeEnum<{
                readonly ALBUM: "Album,SortName";
                readonly DURATION: "Runtime,AlbumArtist,Album,SortName";
                readonly NAME: "SortName,Name";
                readonly RANDOM: "Random,SortName";
                readonly RECENTLY_ADDED: "DateCreated,SortName";
                readonly RELEASE_DATE: "PremiereDate,AlbumArtist,Album,SortName";
            }>>;
            Years: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            Limit?: number | undefined;
            Genres?: string | undefined;
            UserId?: string | undefined;
            AlbumArtistIds?: string | undefined;
            ArtistIds?: string | undefined;
            ContributingArtistIds?: string | undefined;
            EnableImageTypes?: string | undefined;
            EnableTotalRecordCount?: boolean | undefined;
            EnableUserData?: boolean | undefined;
            EnableUserDataTypes?: boolean | undefined;
            ExcludeArtistIds?: string | undefined;
            ExcludeItemIds?: string | undefined;
            ExcludeItemTypes?: string | undefined;
            Fields?: readonly string[] | undefined;
            FolderId?: string | undefined;
            ImageTypeLimit?: number | undefined;
            IncludeArtists?: boolean | undefined;
            IncludeGenres?: boolean | undefined;
            IncludeItemTypes?: string | undefined;
            IncludeMedia?: boolean | undefined;
            IncludePeople?: boolean | undefined;
            IncludeStudios?: boolean | undefined;
            IsFavorite?: boolean | undefined;
            MediaTypes?: string | undefined;
            NameStartsWith?: string | undefined;
            ParentId?: string | undefined;
            Recursive?: boolean | undefined;
            SearchTerm?: string | undefined;
            SortBy?: "Album,SortName" | "Runtime,AlbumArtist,Album,SortName" | "SortName,Name" | "Random,SortName" | "DateCreated,SortName" | "PremiereDate,AlbumArtist,Album,SortName" | undefined;
            SortOrder?: "Ascending" | "Descending" | undefined;
            StartIndex?: number | undefined;
            Tags?: string | undefined;
            Years?: string | undefined;
            Filters?: string | undefined;
        }, {
            Limit?: number | undefined;
            Genres?: string | undefined;
            UserId?: string | undefined;
            AlbumArtistIds?: string | undefined;
            ArtistIds?: string | undefined;
            ContributingArtistIds?: string | undefined;
            EnableImageTypes?: string | undefined;
            EnableTotalRecordCount?: boolean | undefined;
            EnableUserData?: boolean | undefined;
            EnableUserDataTypes?: boolean | undefined;
            ExcludeArtistIds?: string | undefined;
            ExcludeItemIds?: string | undefined;
            ExcludeItemTypes?: string | undefined;
            Fields?: readonly string[] | undefined;
            FolderId?: string | undefined;
            ImageTypeLimit?: number | undefined;
            IncludeArtists?: boolean | undefined;
            IncludeGenres?: boolean | undefined;
            IncludeItemTypes?: string | undefined;
            IncludeMedia?: boolean | undefined;
            IncludePeople?: boolean | undefined;
            IncludeStudios?: boolean | undefined;
            IsFavorite?: boolean | undefined;
            MediaTypes?: string | undefined;
            NameStartsWith?: string | undefined;
            ParentId?: string | undefined;
            Recursive?: boolean | undefined;
            SearchTerm?: string | undefined;
            SortBy?: "Album,SortName" | "Runtime,AlbumArtist,Album,SortName" | "SortName,Name" | "Random,SortName" | "DateCreated,SortName" | "PremiereDate,AlbumArtist,Album,SortName" | undefined;
            SortOrder?: "Ascending" | "Descending" | undefined;
            StartIndex?: number | undefined;
            Tags?: string | undefined;
            Years?: string | undefined;
            Filters?: string | undefined;
        }>;
        path: "artists";
        responses: {
            200: z.ZodObject<{
                StartIndex: z.ZodNumber;
                TotalRecordCount: z.ZodNumber;
            } & {
                Items: z.ZodArray<z.ZodObject<{
                    AlbumCount: z.ZodOptional<z.ZodNumber>;
                    BackdropImageTags: z.ZodArray<z.ZodString, "many">;
                    ChannelId: z.ZodNull;
                    DateCreated: z.ZodString;
                    ExternalUrls: z.ZodArray<z.ZodObject<{
                        Name: z.ZodString;
                        Url: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        Name: string;
                        Url: string;
                    }, {
                        Name: string;
                        Url: string;
                    }>, "many">;
                    GenreItems: z.ZodArray<z.ZodObject<{
                        Id: z.ZodString;
                        Name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        Name: string;
                        Id: string;
                    }, {
                        Name: string;
                        Id: string;
                    }>, "many">;
                    Genres: z.ZodArray<z.ZodString, "many">;
                    Id: z.ZodString;
                    ImageBlurHashes: z.ZodObject<{
                        Backdrop: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
                        Logo: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
                        Primary: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
                    }, "strip", z.ZodTypeAny, {
                        Backdrop?: Record<string, string> | undefined;
                        Logo?: Record<string, string> | undefined;
                        Primary?: Record<string, string> | undefined;
                    }, {
                        Backdrop?: Record<string, string> | undefined;
                        Logo?: Record<string, string> | undefined;
                        Primary?: Record<string, string> | undefined;
                    }>;
                    ImageTags: z.ZodObject<{
                        Logo: z.ZodOptional<z.ZodString>;
                        Primary: z.ZodOptional<z.ZodString>;
                    }, "strip", z.ZodTypeAny, {
                        Logo?: string | undefined;
                        Primary?: string | undefined;
                    }, {
                        Logo?: string | undefined;
                        Primary?: string | undefined;
                    }>;
                    LocationType: z.ZodString;
                    Name: z.ZodString;
                    Overview: z.ZodString;
                    ProviderIds: z.ZodOptional<z.ZodObject<{
                        MusicBrainzAlbum: z.ZodOptional<z.ZodString>;
                        MusicBrainzAlbumArtist: z.ZodOptional<z.ZodString>;
                        MusicBrainzArtist: z.ZodOptional<z.ZodString>;
                        MusicBrainzRecording: z.ZodOptional<z.ZodString>;
                        MusicBrainzReleaseGroup: z.ZodOptional<z.ZodString>;
                        MusicBrainzTrack: z.ZodOptional<z.ZodString>;
                    }, "strip", z.ZodTypeAny, {
                        MusicBrainzAlbum?: string | undefined;
                        MusicBrainzAlbumArtist?: string | undefined;
                        MusicBrainzArtist?: string | undefined;
                        MusicBrainzRecording?: string | undefined;
                        MusicBrainzReleaseGroup?: string | undefined;
                        MusicBrainzTrack?: string | undefined;
                    }, {
                        MusicBrainzAlbum?: string | undefined;
                        MusicBrainzAlbumArtist?: string | undefined;
                        MusicBrainzArtist?: string | undefined;
                        MusicBrainzRecording?: string | undefined;
                        MusicBrainzReleaseGroup?: string | undefined;
                        MusicBrainzTrack?: string | undefined;
                    }>>;
                    RunTimeTicks: z.ZodNumber;
                    ServerId: z.ZodString;
                    SongCount: z.ZodOptional<z.ZodNumber>;
                    Type: z.ZodString;
                    UserData: z.ZodOptional<z.ZodObject<{
                        IsFavorite: z.ZodBoolean;
                        Key: z.ZodString;
                        PlaybackPositionTicks: z.ZodNumber;
                        PlayCount: z.ZodNumber;
                        Played: z.ZodBoolean;
                    }, "strip", z.ZodTypeAny, {
                        PlayCount: number;
                        IsFavorite: boolean;
                        Key: string;
                        PlaybackPositionTicks: number;
                        Played: boolean;
                    }, {
                        PlayCount: number;
                        IsFavorite: boolean;
                        Key: string;
                        PlaybackPositionTicks: number;
                        Played: boolean;
                    }>>;
                }, "strip", z.ZodTypeAny, {
                    Name: string;
                    Genres: string[];
                    Id: string;
                    ChannelId: null;
                    DateCreated: string;
                    ExternalUrls: {
                        Name: string;
                        Url: string;
                    }[];
                    GenreItems: {
                        Name: string;
                        Id: string;
                    }[];
                    ImageBlurHashes: {
                        Backdrop?: Record<string, string> | undefined;
                        Logo?: Record<string, string> | undefined;
                        Primary?: Record<string, string> | undefined;
                    };
                    ImageTags: {
                        Logo?: string | undefined;
                        Primary?: string | undefined;
                    };
                    LocationType: string;
                    Type: string;
                    RunTimeTicks: number;
                    ServerId: string;
                    BackdropImageTags: string[];
                    Overview: string;
                    ProviderIds?: {
                        MusicBrainzAlbum?: string | undefined;
                        MusicBrainzAlbumArtist?: string | undefined;
                        MusicBrainzArtist?: string | undefined;
                        MusicBrainzRecording?: string | undefined;
                        MusicBrainzReleaseGroup?: string | undefined;
                        MusicBrainzTrack?: string | undefined;
                    } | undefined;
                    UserData?: {
                        PlayCount: number;
                        IsFavorite: boolean;
                        Key: string;
                        PlaybackPositionTicks: number;
                        Played: boolean;
                    } | undefined;
                    AlbumCount?: number | undefined;
                    SongCount?: number | undefined;
                }, {
                    Name: string;
                    Genres: string[];
                    Id: string;
                    ChannelId: null;
                    DateCreated: string;
                    ExternalUrls: {
                        Name: string;
                        Url: string;
                    }[];
                    GenreItems: {
                        Name: string;
                        Id: string;
                    }[];
                    ImageBlurHashes: {
                        Backdrop?: Record<string, string> | undefined;
                        Logo?: Record<string, string> | undefined;
                        Primary?: Record<string, string> | undefined;
                    };
                    ImageTags: {
                        Logo?: string | undefined;
                        Primary?: string | undefined;
                    };
                    LocationType: string;
                    Type: string;
                    RunTimeTicks: number;
                    ServerId: string;
                    BackdropImageTags: string[];
                    Overview: string;
                    ProviderIds?: {
                        MusicBrainzAlbum?: string | undefined;
                        MusicBrainzAlbumArtist?: string | undefined;
                        MusicBrainzArtist?: string | undefined;
                        MusicBrainzRecording?: string | undefined;
                        MusicBrainzReleaseGroup?: string | undefined;
                        MusicBrainzTrack?: string | undefined;
                    } | undefined;
                    UserData?: {
                        PlayCount: number;
                        IsFavorite: boolean;
                        Key: string;
                        PlaybackPositionTicks: number;
                        Played: boolean;
                    } | undefined;
                    AlbumCount?: number | undefined;
                    SongCount?: number | undefined;
                }>, "many">;
            }, "strip", z.ZodTypeAny, {
                StartIndex: number;
                TotalRecordCount: number;
                Items: {
                    Name: string;
                    Genres: string[];
                    Id: string;
                    ChannelId: null;
                    DateCreated: string;
                    ExternalUrls: {
                        Name: string;
                        Url: string;
                    }[];
                    GenreItems: {
                        Name: string;
                        Id: string;
                    }[];
                    ImageBlurHashes: {
                        Backdrop?: Record<string, string> | undefined;
                        Logo?: Record<string, string> | undefined;
                        Primary?: Record<string, string> | undefined;
                    };
                    ImageTags: {
                        Logo?: string | undefined;
                        Primary?: string | undefined;
                    };
                    LocationType: string;
                    Type: string;
                    RunTimeTicks: number;
                    ServerId: string;
                    BackdropImageTags: string[];
                    Overview: string;
                    ProviderIds?: {
                        MusicBrainzAlbum?: string | undefined;
                        MusicBrainzAlbumArtist?: string | undefined;
                        MusicBrainzArtist?: string | undefined;
                        MusicBrainzRecording?: string | undefined;
                        MusicBrainzReleaseGroup?: string | undefined;
                        MusicBrainzTrack?: string | undefined;
                    } | undefined;
                    UserData?: {
                        PlayCount: number;
                        IsFavorite: boolean;
                        Key: string;
                        PlaybackPositionTicks: number;
                        Played: boolean;
                    } | undefined;
                    AlbumCount?: number | undefined;
                    SongCount?: number | undefined;
                }[];
            }, {
                StartIndex: number;
                TotalRecordCount: number;
                Items: {
                    Name: string;
                    Genres: string[];
                    Id: string;
                    ChannelId: null;
                    DateCreated: string;
                    ExternalUrls: {
                        Name: string;
                        Url: string;
                    }[];
                    GenreItems: {
                        Name: string;
                        Id: string;
                    }[];
                    ImageBlurHashes: {
                        Backdrop?: Record<string, string> | undefined;
                        Logo?: Record<string, string> | undefined;
                        Primary?: Record<string, string> | undefined;
                    };
                    ImageTags: {
                        Logo?: string | undefined;
                        Primary?: string | undefined;
                    };
                    LocationType: string;
                    Type: string;
                    RunTimeTicks: number;
                    ServerId: string;
                    BackdropImageTags: string[];
                    Overview: string;
                    ProviderIds?: {
                        MusicBrainzAlbum?: string | undefined;
                        MusicBrainzAlbumArtist?: string | undefined;
                        MusicBrainzArtist?: string | undefined;
                        MusicBrainzRecording?: string | undefined;
                        MusicBrainzReleaseGroup?: string | undefined;
                        MusicBrainzTrack?: string | undefined;
                    } | undefined;
                    UserData?: {
                        PlayCount: number;
                        IsFavorite: boolean;
                        Key: string;
                        PlaybackPositionTicks: number;
                        Played: boolean;
                    } | undefined;
                    AlbumCount?: number | undefined;
                    SongCount?: number | undefined;
                }[];
            }>;
            400: z.ZodObject<{
                errors: z.ZodObject<{
                    recursive: z.ZodArray<z.ZodString, "many">;
                }, "strip", z.ZodTypeAny, {
                    recursive: string[];
                }, {
                    recursive: string[];
                }>;
                status: z.ZodNumber;
                title: z.ZodString;
                traceId: z.ZodString;
                type: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                title: string;
                type: string;
                status: number;
                errors: {
                    recursive: string[];
                };
                traceId: string;
            }, {
                title: string;
                type: string;
                status: number;
                errors: {
                    recursive: string[];
                };
                traceId: string;
            }>;
        };
    };
    getFilterList: {
        method: "GET";
        query: z.ZodObject<{
            IncludeItemTypes: z.ZodOptional<z.ZodString>;
            ParentId: z.ZodOptional<z.ZodString>;
            UserId: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            UserId?: string | undefined;
            IncludeItemTypes?: string | undefined;
            ParentId?: string | undefined;
        }, {
            UserId?: string | undefined;
            IncludeItemTypes?: string | undefined;
            ParentId?: string | undefined;
        }>;
        path: "items/filters";
        responses: {
            200: z.ZodObject<{
                Genres: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                Tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                Years: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
            }, "strip", z.ZodTypeAny, {
                Genres?: string[] | undefined;
                Tags?: string[] | undefined;
                Years?: number[] | undefined;
            }, {
                Genres?: string[] | undefined;
                Tags?: string[] | undefined;
                Years?: number[] | undefined;
            }>;
            400: z.ZodObject<{
                errors: z.ZodObject<{
                    recursive: z.ZodArray<z.ZodString, "many">;
                }, "strip", z.ZodTypeAny, {
                    recursive: string[];
                }, {
                    recursive: string[];
                }>;
                status: z.ZodNumber;
                title: z.ZodString;
                traceId: z.ZodString;
                type: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                title: string;
                type: string;
                status: number;
                errors: {
                    recursive: string[];
                };
                traceId: string;
            }, {
                title: string;
                type: string;
                status: number;
                errors: {
                    recursive: string[];
                };
                traceId: string;
            }>;
        };
    };
    getFolder: {
        method: "GET";
        query: z.ZodObject<{
            Fields: z.ZodOptional<z.ZodReadonly<z.ZodArray<z.ZodString, "many">>>;
            ParentId: z.ZodOptional<z.ZodString>;
            SortBy: z.ZodOptional<z.ZodString>;
            SortOrder: z.ZodOptional<z.ZodEnum<["Ascending", "Descending"]>>;
        }, "strip", z.ZodTypeAny, {
            Fields?: readonly string[] | undefined;
            ParentId?: string | undefined;
            SortBy?: string | undefined;
            SortOrder?: "Ascending" | "Descending" | undefined;
        }, {
            Fields?: readonly string[] | undefined;
            ParentId?: string | undefined;
            SortBy?: string | undefined;
            SortOrder?: "Ascending" | "Descending" | undefined;
        }>;
        path: "users/:userId/items";
        responses: {
            200: z.ZodObject<{
                StartIndex: z.ZodNumber;
                TotalRecordCount: z.ZodNumber;
            } & {
                Items: z.ZodArray<z.ZodObject<{
                    BackdropImageTags: z.ZodArray<z.ZodString, "many">;
                    ChannelId: z.ZodNull;
                    CollectionType: z.ZodString;
                    Id: z.ZodString;
                    ImageBlurHashes: z.ZodObject<{
                        Backdrop: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
                        Logo: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
                        Primary: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
                    }, "strip", z.ZodTypeAny, {
                        Backdrop?: Record<string, string> | undefined;
                        Logo?: Record<string, string> | undefined;
                        Primary?: Record<string, string> | undefined;
                    }, {
                        Backdrop?: Record<string, string> | undefined;
                        Logo?: Record<string, string> | undefined;
                        Primary?: Record<string, string> | undefined;
                    }>;
                    ImageTags: z.ZodObject<{
                        Logo: z.ZodOptional<z.ZodString>;
                        Primary: z.ZodOptional<z.ZodString>;
                    }, "strip", z.ZodTypeAny, {
                        Logo?: string | undefined;
                        Primary?: string | undefined;
                    }, {
                        Logo?: string | undefined;
                        Primary?: string | undefined;
                    }>;
                    IsFolder: z.ZodBoolean;
                    LocationType: z.ZodString;
                    MediaType: z.ZodString;
                    Name: z.ZodString;
                    ParentId: z.ZodOptional<z.ZodString>;
                    ServerId: z.ZodString;
                    Type: z.ZodString;
                    UserData: z.ZodOptional<z.ZodObject<{
                        IsFavorite: z.ZodBoolean;
                        Key: z.ZodString;
                        PlaybackPositionTicks: z.ZodNumber;
                        PlayCount: z.ZodNumber;
                        Played: z.ZodBoolean;
                    }, "strip", z.ZodTypeAny, {
                        PlayCount: number;
                        IsFavorite: boolean;
                        Key: string;
                        PlaybackPositionTicks: number;
                        Played: boolean;
                    }, {
                        PlayCount: number;
                        IsFavorite: boolean;
                        Key: string;
                        PlaybackPositionTicks: number;
                        Played: boolean;
                    }>>;
                }, "strip", z.ZodTypeAny, {
                    Name: string;
                    MediaType: string;
                    Id: string;
                    ChannelId: null;
                    ImageBlurHashes: {
                        Backdrop?: Record<string, string> | undefined;
                        Logo?: Record<string, string> | undefined;
                        Primary?: Record<string, string> | undefined;
                    };
                    ImageTags: {
                        Logo?: string | undefined;
                        Primary?: string | undefined;
                    };
                    IsFolder: boolean;
                    LocationType: string;
                    Type: string;
                    ServerId: string;
                    BackdropImageTags: string[];
                    CollectionType: string;
                    ParentId?: string | undefined;
                    UserData?: {
                        PlayCount: number;
                        IsFavorite: boolean;
                        Key: string;
                        PlaybackPositionTicks: number;
                        Played: boolean;
                    } | undefined;
                }, {
                    Name: string;
                    MediaType: string;
                    Id: string;
                    ChannelId: null;
                    ImageBlurHashes: {
                        Backdrop?: Record<string, string> | undefined;
                        Logo?: Record<string, string> | undefined;
                        Primary?: Record<string, string> | undefined;
                    };
                    ImageTags: {
                        Logo?: string | undefined;
                        Primary?: string | undefined;
                    };
                    IsFolder: boolean;
                    LocationType: string;
                    Type: string;
                    ServerId: string;
                    BackdropImageTags: string[];
                    CollectionType: string;
                    ParentId?: string | undefined;
                    UserData?: {
                        PlayCount: number;
                        IsFavorite: boolean;
                        Key: string;
                        PlaybackPositionTicks: number;
                        Played: boolean;
                    } | undefined;
                }>, "many">;
            }, "strip", z.ZodTypeAny, {
                StartIndex: number;
                TotalRecordCount: number;
                Items: {
                    Name: string;
                    MediaType: string;
                    Id: string;
                    ChannelId: null;
                    ImageBlurHashes: {
                        Backdrop?: Record<string, string> | undefined;
                        Logo?: Record<string, string> | undefined;
                        Primary?: Record<string, string> | undefined;
                    };
                    ImageTags: {
                        Logo?: string | undefined;
                        Primary?: string | undefined;
                    };
                    IsFolder: boolean;
                    LocationType: string;
                    Type: string;
                    ServerId: string;
                    BackdropImageTags: string[];
                    CollectionType: string;
                    ParentId?: string | undefined;
                    UserData?: {
                        PlayCount: number;
                        IsFavorite: boolean;
                        Key: string;
                        PlaybackPositionTicks: number;
                        Played: boolean;
                    } | undefined;
                }[];
            }, {
                StartIndex: number;
                TotalRecordCount: number;
                Items: {
                    Name: string;
                    MediaType: string;
                    Id: string;
                    ChannelId: null;
                    ImageBlurHashes: {
                        Backdrop?: Record<string, string> | undefined;
                        Logo?: Record<string, string> | undefined;
                        Primary?: Record<string, string> | undefined;
                    };
                    ImageTags: {
                        Logo?: string | undefined;
                        Primary?: string | undefined;
                    };
                    IsFolder: boolean;
                    LocationType: string;
                    Type: string;
                    ServerId: string;
                    BackdropImageTags: string[];
                    CollectionType: string;
                    ParentId?: string | undefined;
                    UserData?: {
                        PlayCount: number;
                        IsFavorite: boolean;
                        Key: string;
                        PlaybackPositionTicks: number;
                        Played: boolean;
                    } | undefined;
                }[];
            }>;
            400: z.ZodObject<{
                errors: z.ZodObject<{
                    recursive: z.ZodArray<z.ZodString, "many">;
                }, "strip", z.ZodTypeAny, {
                    recursive: string[];
                }, {
                    recursive: string[];
                }>;
                status: z.ZodNumber;
                title: z.ZodString;
                traceId: z.ZodString;
                type: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                title: string;
                type: string;
                status: number;
                errors: {
                    recursive: string[];
                };
                traceId: string;
            }, {
                title: string;
                type: string;
                status: number;
                errors: {
                    recursive: string[];
                };
                traceId: string;
            }>;
        };
    };
    getGenreList: {
        method: "GET";
        query: z.ZodObject<{} & {
            AlbumArtistIds: z.ZodOptional<z.ZodString>;
            ArtistIds: z.ZodOptional<z.ZodString>;
            ContributingArtistIds: z.ZodOptional<z.ZodString>;
            EnableImageTypes: z.ZodOptional<z.ZodString>;
            EnableTotalRecordCount: z.ZodOptional<z.ZodBoolean>;
            EnableUserData: z.ZodOptional<z.ZodBoolean>;
            EnableUserDataTypes: z.ZodOptional<z.ZodBoolean>;
            ExcludeArtistIds: z.ZodOptional<z.ZodString>;
            ExcludeItemIds: z.ZodOptional<z.ZodString>;
            ExcludeItemTypes: z.ZodOptional<z.ZodString>;
            Fields: z.ZodOptional<z.ZodReadonly<z.ZodArray<z.ZodString, "many">>>;
            FolderId: z.ZodOptional<z.ZodString>;
            ImageTypeLimit: z.ZodOptional<z.ZodNumber>;
            IncludeArtists: z.ZodOptional<z.ZodBoolean>;
            IncludeGenres: z.ZodOptional<z.ZodBoolean>;
            IncludeItemTypes: z.ZodOptional<z.ZodString>;
            IncludeMedia: z.ZodOptional<z.ZodBoolean>;
            IncludePeople: z.ZodOptional<z.ZodBoolean>;
            IncludeStudios: z.ZodOptional<z.ZodBoolean>;
            IsFavorite: z.ZodOptional<z.ZodBoolean>;
            Limit: z.ZodOptional<z.ZodNumber>;
            MediaTypes: z.ZodOptional<z.ZodString>;
            NameStartsWith: z.ZodOptional<z.ZodString>;
            ParentId: z.ZodOptional<z.ZodString>;
            Recursive: z.ZodOptional<z.ZodBoolean>;
            SortOrder: z.ZodOptional<z.ZodEnum<["Ascending", "Descending"]>>;
            StartIndex: z.ZodOptional<z.ZodNumber>;
            Tags: z.ZodOptional<z.ZodString>;
            UserId: z.ZodOptional<z.ZodString>;
            Years: z.ZodOptional<z.ZodString>;
            SearchTerm: z.ZodOptional<z.ZodString>;
            SortBy: z.ZodOptional<z.ZodNativeEnum<{
                readonly NAME: "SortName";
            }>>;
        }, "strip", z.ZodTypeAny, {
            Limit?: number | undefined;
            UserId?: string | undefined;
            AlbumArtistIds?: string | undefined;
            ArtistIds?: string | undefined;
            ContributingArtistIds?: string | undefined;
            EnableImageTypes?: string | undefined;
            EnableTotalRecordCount?: boolean | undefined;
            EnableUserData?: boolean | undefined;
            EnableUserDataTypes?: boolean | undefined;
            ExcludeArtistIds?: string | undefined;
            ExcludeItemIds?: string | undefined;
            ExcludeItemTypes?: string | undefined;
            Fields?: readonly string[] | undefined;
            FolderId?: string | undefined;
            ImageTypeLimit?: number | undefined;
            IncludeArtists?: boolean | undefined;
            IncludeGenres?: boolean | undefined;
            IncludeItemTypes?: string | undefined;
            IncludeMedia?: boolean | undefined;
            IncludePeople?: boolean | undefined;
            IncludeStudios?: boolean | undefined;
            IsFavorite?: boolean | undefined;
            MediaTypes?: string | undefined;
            NameStartsWith?: string | undefined;
            ParentId?: string | undefined;
            Recursive?: boolean | undefined;
            SearchTerm?: string | undefined;
            SortBy?: "SortName" | undefined;
            SortOrder?: "Ascending" | "Descending" | undefined;
            StartIndex?: number | undefined;
            Tags?: string | undefined;
            Years?: string | undefined;
        }, {
            Limit?: number | undefined;
            UserId?: string | undefined;
            AlbumArtistIds?: string | undefined;
            ArtistIds?: string | undefined;
            ContributingArtistIds?: string | undefined;
            EnableImageTypes?: string | undefined;
            EnableTotalRecordCount?: boolean | undefined;
            EnableUserData?: boolean | undefined;
            EnableUserDataTypes?: boolean | undefined;
            ExcludeArtistIds?: string | undefined;
            ExcludeItemIds?: string | undefined;
            ExcludeItemTypes?: string | undefined;
            Fields?: readonly string[] | undefined;
            FolderId?: string | undefined;
            ImageTypeLimit?: number | undefined;
            IncludeArtists?: boolean | undefined;
            IncludeGenres?: boolean | undefined;
            IncludeItemTypes?: string | undefined;
            IncludeMedia?: boolean | undefined;
            IncludePeople?: boolean | undefined;
            IncludeStudios?: boolean | undefined;
            IsFavorite?: boolean | undefined;
            MediaTypes?: string | undefined;
            NameStartsWith?: string | undefined;
            ParentId?: string | undefined;
            Recursive?: boolean | undefined;
            SearchTerm?: string | undefined;
            SortBy?: "SortName" | undefined;
            SortOrder?: "Ascending" | "Descending" | undefined;
            StartIndex?: number | undefined;
            Tags?: string | undefined;
            Years?: string | undefined;
        }>;
        path: "musicgenres";
        responses: {
            200: z.ZodObject<{
                StartIndex: z.ZodNumber;
                TotalRecordCount: z.ZodNumber;
            } & {
                Items: z.ZodArray<z.ZodObject<{
                    BackdropImageTags: z.ZodArray<z.ZodAny, "many">;
                    ChannelId: z.ZodNull;
                    Id: z.ZodString;
                    ImageBlurHashes: z.ZodObject<{
                        Backdrop: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
                        Logo: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
                        Primary: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
                    }, "strip", z.ZodTypeAny, {
                        Backdrop?: Record<string, string> | undefined;
                        Logo?: Record<string, string> | undefined;
                        Primary?: Record<string, string> | undefined;
                    }, {
                        Backdrop?: Record<string, string> | undefined;
                        Logo?: Record<string, string> | undefined;
                        Primary?: Record<string, string> | undefined;
                    }>;
                    ImageTags: z.ZodObject<{
                        Logo: z.ZodOptional<z.ZodString>;
                        Primary: z.ZodOptional<z.ZodString>;
                    }, "strip", z.ZodTypeAny, {
                        Logo?: string | undefined;
                        Primary?: string | undefined;
                    }, {
                        Logo?: string | undefined;
                        Primary?: string | undefined;
                    }>;
                    LocationType: z.ZodString;
                    Name: z.ZodString;
                    ServerId: z.ZodString;
                    Type: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    Name: string;
                    Id: string;
                    ChannelId: null;
                    ImageBlurHashes: {
                        Backdrop?: Record<string, string> | undefined;
                        Logo?: Record<string, string> | undefined;
                        Primary?: Record<string, string> | undefined;
                    };
                    ImageTags: {
                        Logo?: string | undefined;
                        Primary?: string | undefined;
                    };
                    LocationType: string;
                    Type: string;
                    ServerId: string;
                    BackdropImageTags: any[];
                }, {
                    Name: string;
                    Id: string;
                    ChannelId: null;
                    ImageBlurHashes: {
                        Backdrop?: Record<string, string> | undefined;
                        Logo?: Record<string, string> | undefined;
                        Primary?: Record<string, string> | undefined;
                    };
                    ImageTags: {
                        Logo?: string | undefined;
                        Primary?: string | undefined;
                    };
                    LocationType: string;
                    Type: string;
                    ServerId: string;
                    BackdropImageTags: any[];
                }>, "many">;
            }, "strip", z.ZodTypeAny, {
                StartIndex: number;
                TotalRecordCount: number;
                Items: {
                    Name: string;
                    Id: string;
                    ChannelId: null;
                    ImageBlurHashes: {
                        Backdrop?: Record<string, string> | undefined;
                        Logo?: Record<string, string> | undefined;
                        Primary?: Record<string, string> | undefined;
                    };
                    ImageTags: {
                        Logo?: string | undefined;
                        Primary?: string | undefined;
                    };
                    LocationType: string;
                    Type: string;
                    ServerId: string;
                    BackdropImageTags: any[];
                }[];
            }, {
                StartIndex: number;
                TotalRecordCount: number;
                Items: {
                    Name: string;
                    Id: string;
                    ChannelId: null;
                    ImageBlurHashes: {
                        Backdrop?: Record<string, string> | undefined;
                        Logo?: Record<string, string> | undefined;
                        Primary?: Record<string, string> | undefined;
                    };
                    ImageTags: {
                        Logo?: string | undefined;
                        Primary?: string | undefined;
                    };
                    LocationType: string;
                    Type: string;
                    ServerId: string;
                    BackdropImageTags: any[];
                }[];
            }>;
            400: z.ZodObject<{
                errors: z.ZodObject<{
                    recursive: z.ZodArray<z.ZodString, "many">;
                }, "strip", z.ZodTypeAny, {
                    recursive: string[];
                }, {
                    recursive: string[];
                }>;
                status: z.ZodNumber;
                title: z.ZodString;
                traceId: z.ZodString;
                type: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                title: string;
                type: string;
                status: number;
                errors: {
                    recursive: string[];
                };
                traceId: string;
            }, {
                title: string;
                type: string;
                status: number;
                errors: {
                    recursive: string[];
                };
                traceId: string;
            }>;
        };
    };
    getInstantMix: {
        method: "GET";
        query: z.ZodObject<{
            Fields: z.ZodOptional<z.ZodReadonly<z.ZodArray<z.ZodString, "many">>>;
            Limit: z.ZodOptional<z.ZodNumber>;
            UserId: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            Limit?: number | undefined;
            UserId?: string | undefined;
            Fields?: readonly string[] | undefined;
        }, {
            Limit?: number | undefined;
            UserId?: string | undefined;
            Fields?: readonly string[] | undefined;
        }>;
        path: "items/:itemId/InstantMix";
        responses: {
            200: z.ZodObject<{
                StartIndex: z.ZodNumber;
                TotalRecordCount: z.ZodNumber;
            } & {
                Items: z.ZodArray<z.ZodObject<{
                    Album: z.ZodString;
                    AlbumArtist: z.ZodString;
                    AlbumArtists: z.ZodArray<z.ZodObject<{
                        Id: z.ZodString;
                        Name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        Name: string;
                        Id: string;
                    }, {
                        Name: string;
                        Id: string;
                    }>, "many">;
                    AlbumId: z.ZodOptional<z.ZodString>;
                    AlbumPrimaryImageTag: z.ZodString;
                    ArtistItems: z.ZodArray<z.ZodObject<{
                        Id: z.ZodString;
                        Name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        Name: string;
                        Id: string;
                    }, {
                        Name: string;
                        Id: string;
                    }>, "many">;
                    Artists: z.ZodArray<z.ZodString, "many">;
                    BackdropImageTags: z.ZodArray<z.ZodString, "many">;
                    ChannelId: z.ZodNull;
                    DateCreated: z.ZodString;
                    ExternalUrls: z.ZodArray<z.ZodObject<{
                        Name: z.ZodString;
                        Url: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        Name: string;
                        Url: string;
                    }, {
                        Name: string;
                        Url: string;
                    }>, "many">;
                    GenreItems: z.ZodArray<z.ZodObject<{
                        Id: z.ZodString;
                        Name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        Name: string;
                        Id: string;
                    }, {
                        Name: string;
                        Id: string;
                    }>, "many">;
                    Genres: z.ZodArray<z.ZodString, "many">;
                    Id: z.ZodString;
                    ImageBlurHashes: z.ZodObject<{
                        Backdrop: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
                        Logo: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
                        Primary: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
                    }, "strip", z.ZodTypeAny, {
                        Backdrop?: Record<string, string> | undefined;
                        Logo?: Record<string, string> | undefined;
                        Primary?: Record<string, string> | undefined;
                    }, {
                        Backdrop?: Record<string, string> | undefined;
                        Logo?: Record<string, string> | undefined;
                        Primary?: Record<string, string> | undefined;
                    }>;
                    ImageTags: z.ZodObject<{
                        Logo: z.ZodOptional<z.ZodString>;
                        Primary: z.ZodOptional<z.ZodString>;
                    }, "strip", z.ZodTypeAny, {
                        Logo?: string | undefined;
                        Primary?: string | undefined;
                    }, {
                        Logo?: string | undefined;
                        Primary?: string | undefined;
                    }>;
                    IndexNumber: z.ZodNumber;
                    IsFolder: z.ZodBoolean;
                    LocationType: z.ZodString;
                    LUFS: z.ZodOptional<z.ZodNumber>;
                    MediaSources: z.ZodArray<z.ZodObject<{
                        Bitrate: z.ZodNumber;
                        Container: z.ZodString;
                        DefaultAudioStreamIndex: z.ZodNumber;
                        ETag: z.ZodString;
                        Formats: z.ZodArray<z.ZodAny, "many">;
                        GenPtsInput: z.ZodBoolean;
                        Id: z.ZodString;
                        IgnoreDts: z.ZodBoolean;
                        IgnoreIndex: z.ZodBoolean;
                        IsInfiniteStream: z.ZodBoolean;
                        IsRemote: z.ZodBoolean;
                        MediaAttachments: z.ZodArray<z.ZodAny, "many">;
                        MediaStreams: z.ZodArray<z.ZodObject<{
                            AspectRatio: z.ZodOptional<z.ZodString>;
                            BitDepth: z.ZodOptional<z.ZodNumber>;
                            BitRate: z.ZodOptional<z.ZodNumber>;
                            ChannelLayout: z.ZodOptional<z.ZodString>;
                            Channels: z.ZodOptional<z.ZodNumber>;
                            Codec: z.ZodString;
                            CodecTimeBase: z.ZodString;
                            ColorSpace: z.ZodOptional<z.ZodString>;
                            Comment: z.ZodOptional<z.ZodString>;
                            DisplayTitle: z.ZodOptional<z.ZodString>;
                            Height: z.ZodOptional<z.ZodNumber>;
                            Index: z.ZodNumber;
                            IsDefault: z.ZodBoolean;
                            IsExternal: z.ZodBoolean;
                            IsForced: z.ZodBoolean;
                            IsInterlaced: z.ZodBoolean;
                            IsTextSubtitleStream: z.ZodBoolean;
                            Level: z.ZodNumber;
                            PixelFormat: z.ZodOptional<z.ZodString>;
                            Profile: z.ZodOptional<z.ZodString>;
                            RealFrameRate: z.ZodOptional<z.ZodNumber>;
                            RefFrames: z.ZodOptional<z.ZodNumber>;
                            SampleRate: z.ZodOptional<z.ZodNumber>;
                            SupportsExternalStream: z.ZodBoolean;
                            TimeBase: z.ZodString;
                            Type: z.ZodString;
                            Width: z.ZodOptional<z.ZodNumber>;
                        }, "strip", z.ZodTypeAny, {
                            Codec: string;
                            Level: number;
                            Type: string;
                            CodecTimeBase: string;
                            Index: number;
                            IsDefault: boolean;
                            IsExternal: boolean;
                            IsForced: boolean;
                            IsInterlaced: boolean;
                            IsTextSubtitleStream: boolean;
                            SupportsExternalStream: boolean;
                            TimeBase: string;
                            AspectRatio?: string | undefined;
                            BitDepth?: number | undefined;
                            BitRate?: number | undefined;
                            ChannelLayout?: string | undefined;
                            Channels?: number | undefined;
                            ColorSpace?: string | undefined;
                            Comment?: string | undefined;
                            DisplayTitle?: string | undefined;
                            Height?: number | undefined;
                            PixelFormat?: string | undefined;
                            Profile?: string | undefined;
                            RealFrameRate?: number | undefined;
                            RefFrames?: number | undefined;
                            SampleRate?: number | undefined;
                            Width?: number | undefined;
                        }, {
                            Codec: string;
                            Level: number;
                            Type: string;
                            CodecTimeBase: string;
                            Index: number;
                            IsDefault: boolean;
                            IsExternal: boolean;
                            IsForced: boolean;
                            IsInterlaced: boolean;
                            IsTextSubtitleStream: boolean;
                            SupportsExternalStream: boolean;
                            TimeBase: string;
                            AspectRatio?: string | undefined;
                            BitDepth?: number | undefined;
                            BitRate?: number | undefined;
                            ChannelLayout?: string | undefined;
                            Channels?: number | undefined;
                            ColorSpace?: string | undefined;
                            Comment?: string | undefined;
                            DisplayTitle?: string | undefined;
                            Height?: number | undefined;
                            PixelFormat?: string | undefined;
                            Profile?: string | undefined;
                            RealFrameRate?: number | undefined;
                            RefFrames?: number | undefined;
                            SampleRate?: number | undefined;
                            Width?: number | undefined;
                        }>, "many">;
                        Name: z.ZodString;
                        Path: z.ZodString;
                        Protocol: z.ZodString;
                        ReadAtNativeFramerate: z.ZodBoolean;
                        RequiredHttpHeaders: z.ZodAny;
                        RequiresClosing: z.ZodBoolean;
                        RequiresLooping: z.ZodBoolean;
                        RequiresOpening: z.ZodBoolean;
                        RunTimeTicks: z.ZodNumber;
                        Size: z.ZodNumber;
                        SupportsDirectPlay: z.ZodBoolean;
                        SupportsDirectStream: z.ZodBoolean;
                        SupportsProbing: z.ZodBoolean;
                        SupportsTranscoding: z.ZodBoolean;
                        Type: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        Name: string;
                        Bitrate: number;
                        Id: string;
                        Type: string;
                        RunTimeTicks: number;
                        Container: string;
                        DefaultAudioStreamIndex: number;
                        ETag: string;
                        Formats: any[];
                        GenPtsInput: boolean;
                        IgnoreDts: boolean;
                        IgnoreIndex: boolean;
                        IsInfiniteStream: boolean;
                        IsRemote: boolean;
                        MediaAttachments: any[];
                        MediaStreams: {
                            Codec: string;
                            Level: number;
                            Type: string;
                            CodecTimeBase: string;
                            Index: number;
                            IsDefault: boolean;
                            IsExternal: boolean;
                            IsForced: boolean;
                            IsInterlaced: boolean;
                            IsTextSubtitleStream: boolean;
                            SupportsExternalStream: boolean;
                            TimeBase: string;
                            AspectRatio?: string | undefined;
                            BitDepth?: number | undefined;
                            BitRate?: number | undefined;
                            ChannelLayout?: string | undefined;
                            Channels?: number | undefined;
                            ColorSpace?: string | undefined;
                            Comment?: string | undefined;
                            DisplayTitle?: string | undefined;
                            Height?: number | undefined;
                            PixelFormat?: string | undefined;
                            Profile?: string | undefined;
                            RealFrameRate?: number | undefined;
                            RefFrames?: number | undefined;
                            SampleRate?: number | undefined;
                            Width?: number | undefined;
                        }[];
                        Path: string;
                        Protocol: string;
                        ReadAtNativeFramerate: boolean;
                        RequiresClosing: boolean;
                        RequiresLooping: boolean;
                        RequiresOpening: boolean;
                        Size: number;
                        SupportsDirectPlay: boolean;
                        SupportsDirectStream: boolean;
                        SupportsProbing: boolean;
                        SupportsTranscoding: boolean;
                        RequiredHttpHeaders?: any;
                    }, {
                        Name: string;
                        Bitrate: number;
                        Id: string;
                        Type: string;
                        RunTimeTicks: number;
                        Container: string;
                        DefaultAudioStreamIndex: number;
                        ETag: string;
                        Formats: any[];
                        GenPtsInput: boolean;
                        IgnoreDts: boolean;
                        IgnoreIndex: boolean;
                        IsInfiniteStream: boolean;
                        IsRemote: boolean;
                        MediaAttachments: any[];
                        MediaStreams: {
                            Codec: string;
                            Level: number;
                            Type: string;
                            CodecTimeBase: string;
                            Index: number;
                            IsDefault: boolean;
                            IsExternal: boolean;
                            IsForced: boolean;
                            IsInterlaced: boolean;
                            IsTextSubtitleStream: boolean;
                            SupportsExternalStream: boolean;
                            TimeBase: string;
                            AspectRatio?: string | undefined;
                            BitDepth?: number | undefined;
                            BitRate?: number | undefined;
                            ChannelLayout?: string | undefined;
                            Channels?: number | undefined;
                            ColorSpace?: string | undefined;
                            Comment?: string | undefined;
                            DisplayTitle?: string | undefined;
                            Height?: number | undefined;
                            PixelFormat?: string | undefined;
                            Profile?: string | undefined;
                            RealFrameRate?: number | undefined;
                            RefFrames?: number | undefined;
                            SampleRate?: number | undefined;
                            Width?: number | undefined;
                        }[];
                        Path: string;
                        Protocol: string;
                        ReadAtNativeFramerate: boolean;
                        RequiresClosing: boolean;
                        RequiresLooping: boolean;
                        RequiresOpening: boolean;
                        Size: number;
                        SupportsDirectPlay: boolean;
                        SupportsDirectStream: boolean;
                        SupportsProbing: boolean;
                        SupportsTranscoding: boolean;
                        RequiredHttpHeaders?: any;
                    }>, "many">;
                    MediaType: z.ZodString;
                    Name: z.ZodString;
                    NormalizationGain: z.ZodOptional<z.ZodNumber>;
                    ParentId: z.ZodOptional<z.ZodString>;
                    ParentIndexNumber: z.ZodNumber;
                    People: z.ZodOptional<z.ZodArray<z.ZodObject<{
                        Id: z.ZodString;
                        Name: z.ZodString;
                        Type: z.ZodOptional<z.ZodString>;
                    }, "strip", z.ZodTypeAny, {
                        Name: string;
                        Id: string;
                        Type?: string | undefined;
                    }, {
                        Name: string;
                        Id: string;
                        Type?: string | undefined;
                    }>, "many">>;
                    PlaylistItemId: z.ZodOptional<z.ZodString>;
                    PremiereDate: z.ZodOptional<z.ZodString>;
                    ProductionYear: z.ZodNumber;
                    ProviderIds: z.ZodOptional<z.ZodObject<{
                        MusicBrainzAlbum: z.ZodOptional<z.ZodString>;
                        MusicBrainzAlbumArtist: z.ZodOptional<z.ZodString>;
                        MusicBrainzArtist: z.ZodOptional<z.ZodString>;
                        MusicBrainzRecording: z.ZodOptional<z.ZodString>;
                        MusicBrainzReleaseGroup: z.ZodOptional<z.ZodString>;
                        MusicBrainzTrack: z.ZodOptional<z.ZodString>;
                    }, "strip", z.ZodTypeAny, {
                        MusicBrainzAlbum?: string | undefined;
                        MusicBrainzAlbumArtist?: string | undefined;
                        MusicBrainzArtist?: string | undefined;
                        MusicBrainzRecording?: string | undefined;
                        MusicBrainzReleaseGroup?: string | undefined;
                        MusicBrainzTrack?: string | undefined;
                    }, {
                        MusicBrainzAlbum?: string | undefined;
                        MusicBrainzAlbumArtist?: string | undefined;
                        MusicBrainzArtist?: string | undefined;
                        MusicBrainzRecording?: string | undefined;
                        MusicBrainzReleaseGroup?: string | undefined;
                        MusicBrainzTrack?: string | undefined;
                    }>>;
                    RunTimeTicks: z.ZodNumber;
                    ServerId: z.ZodString;
                    SortName: z.ZodOptional<z.ZodString>;
                    Tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                    Type: z.ZodString;
                    UserData: z.ZodOptional<z.ZodObject<{
                        IsFavorite: z.ZodBoolean;
                        Key: z.ZodString;
                        PlaybackPositionTicks: z.ZodNumber;
                        PlayCount: z.ZodNumber;
                        Played: z.ZodBoolean;
                    }, "strip", z.ZodTypeAny, {
                        PlayCount: number;
                        IsFavorite: boolean;
                        Key: string;
                        PlaybackPositionTicks: number;
                        Played: boolean;
                    }, {
                        PlayCount: number;
                        IsFavorite: boolean;
                        Key: string;
                        PlaybackPositionTicks: number;
                        Played: boolean;
                    }>>;
                }, "strip", z.ZodTypeAny, {
                    Name: string;
                    Genres: string[];
                    Album: string;
                    MediaType: string;
                    Id: string;
                    AlbumArtist: string;
                    AlbumArtists: {
                        Name: string;
                        Id: string;
                    }[];
                    AlbumPrimaryImageTag: string;
                    ArtistItems: {
                        Name: string;
                        Id: string;
                    }[];
                    Artists: string[];
                    ChannelId: null;
                    DateCreated: string;
                    ExternalUrls: {
                        Name: string;
                        Url: string;
                    }[];
                    GenreItems: {
                        Name: string;
                        Id: string;
                    }[];
                    ImageBlurHashes: {
                        Backdrop?: Record<string, string> | undefined;
                        Logo?: Record<string, string> | undefined;
                        Primary?: Record<string, string> | undefined;
                    };
                    ImageTags: {
                        Logo?: string | undefined;
                        Primary?: string | undefined;
                    };
                    IsFolder: boolean;
                    LocationType: string;
                    Type: string;
                    ProductionYear: number;
                    RunTimeTicks: number;
                    ServerId: string;
                    BackdropImageTags: string[];
                    IndexNumber: number;
                    MediaSources: {
                        Name: string;
                        Bitrate: number;
                        Id: string;
                        Type: string;
                        RunTimeTicks: number;
                        Container: string;
                        DefaultAudioStreamIndex: number;
                        ETag: string;
                        Formats: any[];
                        GenPtsInput: boolean;
                        IgnoreDts: boolean;
                        IgnoreIndex: boolean;
                        IsInfiniteStream: boolean;
                        IsRemote: boolean;
                        MediaAttachments: any[];
                        MediaStreams: {
                            Codec: string;
                            Level: number;
                            Type: string;
                            CodecTimeBase: string;
                            Index: number;
                            IsDefault: boolean;
                            IsExternal: boolean;
                            IsForced: boolean;
                            IsInterlaced: boolean;
                            IsTextSubtitleStream: boolean;
                            SupportsExternalStream: boolean;
                            TimeBase: string;
                            AspectRatio?: string | undefined;
                            BitDepth?: number | undefined;
                            BitRate?: number | undefined;
                            ChannelLayout?: string | undefined;
                            Channels?: number | undefined;
                            ColorSpace?: string | undefined;
                            Comment?: string | undefined;
                            DisplayTitle?: string | undefined;
                            Height?: number | undefined;
                            PixelFormat?: string | undefined;
                            Profile?: string | undefined;
                            RealFrameRate?: number | undefined;
                            RefFrames?: number | undefined;
                            SampleRate?: number | undefined;
                            Width?: number | undefined;
                        }[];
                        Path: string;
                        Protocol: string;
                        ReadAtNativeFramerate: boolean;
                        RequiresClosing: boolean;
                        RequiresLooping: boolean;
                        RequiresOpening: boolean;
                        Size: number;
                        SupportsDirectPlay: boolean;
                        SupportsDirectStream: boolean;
                        SupportsProbing: boolean;
                        SupportsTranscoding: boolean;
                        RequiredHttpHeaders?: any;
                    }[];
                    ParentIndexNumber: number;
                    SortName?: string | undefined;
                    ParentId?: string | undefined;
                    Tags?: string[] | undefined;
                    PlaylistItemId?: string | undefined;
                    People?: {
                        Name: string;
                        Id: string;
                        Type?: string | undefined;
                    }[] | undefined;
                    PremiereDate?: string | undefined;
                    ProviderIds?: {
                        MusicBrainzAlbum?: string | undefined;
                        MusicBrainzAlbumArtist?: string | undefined;
                        MusicBrainzArtist?: string | undefined;
                        MusicBrainzRecording?: string | undefined;
                        MusicBrainzReleaseGroup?: string | undefined;
                        MusicBrainzTrack?: string | undefined;
                    } | undefined;
                    AlbumId?: string | undefined;
                    LUFS?: number | undefined;
                    NormalizationGain?: number | undefined;
                    UserData?: {
                        PlayCount: number;
                        IsFavorite: boolean;
                        Key: string;
                        PlaybackPositionTicks: number;
                        Played: boolean;
                    } | undefined;
                }, {
                    Name: string;
                    Genres: string[];
                    Album: string;
                    MediaType: string;
                    Id: string;
                    AlbumArtist: string;
                    AlbumArtists: {
                        Name: string;
                        Id: string;
                    }[];
                    AlbumPrimaryImageTag: string;
                    ArtistItems: {
                        Name: string;
                        Id: string;
                    }[];
                    Artists: string[];
                    ChannelId: null;
                    DateCreated: string;
                    ExternalUrls: {
                        Name: string;
                        Url: string;
                    }[];
                    GenreItems: {
                        Name: string;
                        Id: string;
                    }[];
                    ImageBlurHashes: {
                        Backdrop?: Record<string, string> | undefined;
                        Logo?: Record<string, string> | undefined;
                        Primary?: Record<string, string> | undefined;
                    };
                    ImageTags: {
                        Logo?: string | undefined;
                        Primary?: string | undefined;
                    };
                    IsFolder: boolean;
                    LocationType: string;
                    Type: string;
                    ProductionYear: number;
                    RunTimeTicks: number;
                    ServerId: string;
                    BackdropImageTags: string[];
                    IndexNumber: number;
                    MediaSources: {
                        Name: string;
                        Bitrate: number;
                        Id: string;
                        Type: string;
                        RunTimeTicks: number;
                        Container: string;
                        DefaultAudioStreamIndex: number;
                        ETag: string;
                        Formats: any[];
                        GenPtsInput: boolean;
                        IgnoreDts: boolean;
                        IgnoreIndex: boolean;
                        IsInfiniteStream: boolean;
                        IsRemote: boolean;
                        MediaAttachments: any[];
                        MediaStreams: {
                            Codec: string;
                            Level: number;
                            Type: string;
                            CodecTimeBase: string;
                            Index: number;
                            IsDefault: boolean;
                            IsExternal: boolean;
                            IsForced: boolean;
                            IsInterlaced: boolean;
                            IsTextSubtitleStream: boolean;
                            SupportsExternalStream: boolean;
                            TimeBase: string;
                            AspectRatio?: string | undefined;
                            BitDepth?: number | undefined;
                            BitRate?: number | undefined;
                            ChannelLayout?: string | undefined;
                            Channels?: number | undefined;
                            ColorSpace?: string | undefined;
                            Comment?: string | undefined;
                            DisplayTitle?: string | undefined;
                            Height?: number | undefined;
                            PixelFormat?: string | undefined;
                            Profile?: string | undefined;
                            RealFrameRate?: number | undefined;
                            RefFrames?: number | undefined;
                            SampleRate?: number | undefined;
                            Width?: number | undefined;
                        }[];
                        Path: string;
                        Protocol: string;
                        ReadAtNativeFramerate: boolean;
                        RequiresClosing: boolean;
                        RequiresLooping: boolean;
                        RequiresOpening: boolean;
                        Size: number;
                        SupportsDirectPlay: boolean;
                        SupportsDirectStream: boolean;
                        SupportsProbing: boolean;
                        SupportsTranscoding: boolean;
                        RequiredHttpHeaders?: any;
                    }[];
                    ParentIndexNumber: number;
                    SortName?: string | undefined;
                    ParentId?: string | undefined;
                    Tags?: string[] | undefined;
                    PlaylistItemId?: string | undefined;
                    People?: {
                        Name: string;
                        Id: string;
                        Type?: string | undefined;
                    }[] | undefined;
                    PremiereDate?: string | undefined;
                    ProviderIds?: {
                        MusicBrainzAlbum?: string | undefined;
                        MusicBrainzAlbumArtist?: string | undefined;
                        MusicBrainzArtist?: string | undefined;
                        MusicBrainzRecording?: string | undefined;
                        MusicBrainzReleaseGroup?: string | undefined;
                        MusicBrainzTrack?: string | undefined;
                    } | undefined;
                    AlbumId?: string | undefined;
                    LUFS?: number | undefined;
                    NormalizationGain?: number | undefined;
                    UserData?: {
                        PlayCount: number;
                        IsFavorite: boolean;
                        Key: string;
                        PlaybackPositionTicks: number;
                        Played: boolean;
                    } | undefined;
                }>, "many">;
            }, "strip", z.ZodTypeAny, {
                StartIndex: number;
                TotalRecordCount: number;
                Items: {
                    Name: string;
                    Genres: string[];
                    Album: string;
                    MediaType: string;
                    Id: string;
                    AlbumArtist: string;
                    AlbumArtists: {
                        Name: string;
                        Id: string;
                    }[];
                    AlbumPrimaryImageTag: string;
                    ArtistItems: {
                        Name: string;
                        Id: string;
                    }[];
                    Artists: string[];
                    ChannelId: null;
                    DateCreated: string;
                    ExternalUrls: {
                        Name: string;
                        Url: string;
                    }[];
                    GenreItems: {
                        Name: string;
                        Id: string;
                    }[];
                    ImageBlurHashes: {
                        Backdrop?: Record<string, string> | undefined;
                        Logo?: Record<string, string> | undefined;
                        Primary?: Record<string, string> | undefined;
                    };
                    ImageTags: {
                        Logo?: string | undefined;
                        Primary?: string | undefined;
                    };
                    IsFolder: boolean;
                    LocationType: string;
                    Type: string;
                    ProductionYear: number;
                    RunTimeTicks: number;
                    ServerId: string;
                    BackdropImageTags: string[];
                    IndexNumber: number;
                    MediaSources: {
                        Name: string;
                        Bitrate: number;
                        Id: string;
                        Type: string;
                        RunTimeTicks: number;
                        Container: string;
                        DefaultAudioStreamIndex: number;
                        ETag: string;
                        Formats: any[];
                        GenPtsInput: boolean;
                        IgnoreDts: boolean;
                        IgnoreIndex: boolean;
                        IsInfiniteStream: boolean;
                        IsRemote: boolean;
                        MediaAttachments: any[];
                        MediaStreams: {
                            Codec: string;
                            Level: number;
                            Type: string;
                            CodecTimeBase: string;
                            Index: number;
                            IsDefault: boolean;
                            IsExternal: boolean;
                            IsForced: boolean;
                            IsInterlaced: boolean;
                            IsTextSubtitleStream: boolean;
                            SupportsExternalStream: boolean;
                            TimeBase: string;
                            AspectRatio?: string | undefined;
                            BitDepth?: number | undefined;
                            BitRate?: number | undefined;
                            ChannelLayout?: string | undefined;
                            Channels?: number | undefined;
                            ColorSpace?: string | undefined;
                            Comment?: string | undefined;
                            DisplayTitle?: string | undefined;
                            Height?: number | undefined;
                            PixelFormat?: string | undefined;
                            Profile?: string | undefined;
                            RealFrameRate?: number | undefined;
                            RefFrames?: number | undefined;
                            SampleRate?: number | undefined;
                            Width?: number | undefined;
                        }[];
                        Path: string;
                        Protocol: string;
                        ReadAtNativeFramerate: boolean;
                        RequiresClosing: boolean;
                        RequiresLooping: boolean;
                        RequiresOpening: boolean;
                        Size: number;
                        SupportsDirectPlay: boolean;
                        SupportsDirectStream: boolean;
                        SupportsProbing: boolean;
                        SupportsTranscoding: boolean;
                        RequiredHttpHeaders?: any;
                    }[];
                    ParentIndexNumber: number;
                    SortName?: string | undefined;
                    ParentId?: string | undefined;
                    Tags?: string[] | undefined;
                    PlaylistItemId?: string | undefined;
                    People?: {
                        Name: string;
                        Id: string;
                        Type?: string | undefined;
                    }[] | undefined;
                    PremiereDate?: string | undefined;
                    ProviderIds?: {
                        MusicBrainzAlbum?: string | undefined;
                        MusicBrainzAlbumArtist?: string | undefined;
                        MusicBrainzArtist?: string | undefined;
                        MusicBrainzRecording?: string | undefined;
                        MusicBrainzReleaseGroup?: string | undefined;
                        MusicBrainzTrack?: string | undefined;
                    } | undefined;
                    AlbumId?: string | undefined;
                    LUFS?: number | undefined;
                    NormalizationGain?: number | undefined;
                    UserData?: {
                        PlayCount: number;
                        IsFavorite: boolean;
                        Key: string;
                        PlaybackPositionTicks: number;
                        Played: boolean;
                    } | undefined;
                }[];
            }, {
                StartIndex: number;
                TotalRecordCount: number;
                Items: {
                    Name: string;
                    Genres: string[];
                    Album: string;
                    MediaType: string;
                    Id: string;
                    AlbumArtist: string;
                    AlbumArtists: {
                        Name: string;
                        Id: string;
                    }[];
                    AlbumPrimaryImageTag: string;
                    ArtistItems: {
                        Name: string;
                        Id: string;
                    }[];
                    Artists: string[];
                    ChannelId: null;
                    DateCreated: string;
                    ExternalUrls: {
                        Name: string;
                        Url: string;
                    }[];
                    GenreItems: {
                        Name: string;
                        Id: string;
                    }[];
                    ImageBlurHashes: {
                        Backdrop?: Record<string, string> | undefined;
                        Logo?: Record<string, string> | undefined;
                        Primary?: Record<string, string> | undefined;
                    };
                    ImageTags: {
                        Logo?: string | undefined;
                        Primary?: string | undefined;
                    };
                    IsFolder: boolean;
                    LocationType: string;
                    Type: string;
                    ProductionYear: number;
                    RunTimeTicks: number;
                    ServerId: string;
                    BackdropImageTags: string[];
                    IndexNumber: number;
                    MediaSources: {
                        Name: string;
                        Bitrate: number;
                        Id: string;
                        Type: string;
                        RunTimeTicks: number;
                        Container: string;
                        DefaultAudioStreamIndex: number;
                        ETag: string;
                        Formats: any[];
                        GenPtsInput: boolean;
                        IgnoreDts: boolean;
                        IgnoreIndex: boolean;
                        IsInfiniteStream: boolean;
                        IsRemote: boolean;
                        MediaAttachments: any[];
                        MediaStreams: {
                            Codec: string;
                            Level: number;
                            Type: string;
                            CodecTimeBase: string;
                            Index: number;
                            IsDefault: boolean;
                            IsExternal: boolean;
                            IsForced: boolean;
                            IsInterlaced: boolean;
                            IsTextSubtitleStream: boolean;
                            SupportsExternalStream: boolean;
                            TimeBase: string;
                            AspectRatio?: string | undefined;
                            BitDepth?: number | undefined;
                            BitRate?: number | undefined;
                            ChannelLayout?: string | undefined;
                            Channels?: number | undefined;
                            ColorSpace?: string | undefined;
                            Comment?: string | undefined;
                            DisplayTitle?: string | undefined;
                            Height?: number | undefined;
                            PixelFormat?: string | undefined;
                            Profile?: string | undefined;
                            RealFrameRate?: number | undefined;
                            RefFrames?: number | undefined;
                            SampleRate?: number | undefined;
                            Width?: number | undefined;
                        }[];
                        Path: string;
                        Protocol: string;
                        ReadAtNativeFramerate: boolean;
                        RequiresClosing: boolean;
                        RequiresLooping: boolean;
                        RequiresOpening: boolean;
                        Size: number;
                        SupportsDirectPlay: boolean;
                        SupportsDirectStream: boolean;
                        SupportsProbing: boolean;
                        SupportsTranscoding: boolean;
                        RequiredHttpHeaders?: any;
                    }[];
                    ParentIndexNumber: number;
                    SortName?: string | undefined;
                    ParentId?: string | undefined;
                    Tags?: string[] | undefined;
                    PlaylistItemId?: string | undefined;
                    People?: {
                        Name: string;
                        Id: string;
                        Type?: string | undefined;
                    }[] | undefined;
                    PremiereDate?: string | undefined;
                    ProviderIds?: {
                        MusicBrainzAlbum?: string | undefined;
                        MusicBrainzAlbumArtist?: string | undefined;
                        MusicBrainzArtist?: string | undefined;
                        MusicBrainzRecording?: string | undefined;
                        MusicBrainzReleaseGroup?: string | undefined;
                        MusicBrainzTrack?: string | undefined;
                    } | undefined;
                    AlbumId?: string | undefined;
                    LUFS?: number | undefined;
                    NormalizationGain?: number | undefined;
                    UserData?: {
                        PlayCount: number;
                        IsFavorite: boolean;
                        Key: string;
                        PlaybackPositionTicks: number;
                        Played: boolean;
                    } | undefined;
                }[];
            }>;
            400: z.ZodObject<{
                errors: z.ZodObject<{
                    recursive: z.ZodArray<z.ZodString, "many">;
                }, "strip", z.ZodTypeAny, {
                    recursive: string[];
                }, {
                    recursive: string[];
                }>;
                status: z.ZodNumber;
                title: z.ZodString;
                traceId: z.ZodString;
                type: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                title: string;
                type: string;
                status: number;
                errors: {
                    recursive: string[];
                };
                traceId: string;
            }, {
                title: string;
                type: string;
                status: number;
                errors: {
                    recursive: string[];
                };
                traceId: string;
            }>;
        };
    };
    getMusicFolderList: {
        method: "GET";
        path: "users/:userId/items";
        responses: {
            200: z.ZodObject<{
                Items: z.ZodArray<z.ZodObject<{
                    BackdropImageTags: z.ZodArray<z.ZodString, "many">;
                    ChannelId: z.ZodNull;
                    CollectionType: z.ZodString;
                    Id: z.ZodString;
                    ImageBlurHashes: z.ZodObject<{
                        Backdrop: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
                        Logo: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
                        Primary: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
                    }, "strip", z.ZodTypeAny, {
                        Backdrop?: Record<string, string> | undefined;
                        Logo?: Record<string, string> | undefined;
                        Primary?: Record<string, string> | undefined;
                    }, {
                        Backdrop?: Record<string, string> | undefined;
                        Logo?: Record<string, string> | undefined;
                        Primary?: Record<string, string> | undefined;
                    }>;
                    ImageTags: z.ZodObject<{
                        Logo: z.ZodOptional<z.ZodString>;
                        Primary: z.ZodOptional<z.ZodString>;
                    }, "strip", z.ZodTypeAny, {
                        Logo?: string | undefined;
                        Primary?: string | undefined;
                    }, {
                        Logo?: string | undefined;
                        Primary?: string | undefined;
                    }>;
                    IsFolder: z.ZodBoolean;
                    LocationType: z.ZodString;
                    Name: z.ZodString;
                    ServerId: z.ZodString;
                    Type: z.ZodString;
                    UserData: z.ZodObject<{
                        IsFavorite: z.ZodBoolean;
                        Key: z.ZodString;
                        PlaybackPositionTicks: z.ZodNumber;
                        PlayCount: z.ZodNumber;
                        Played: z.ZodBoolean;
                    }, "strip", z.ZodTypeAny, {
                        PlayCount: number;
                        IsFavorite: boolean;
                        Key: string;
                        PlaybackPositionTicks: number;
                        Played: boolean;
                    }, {
                        PlayCount: number;
                        IsFavorite: boolean;
                        Key: string;
                        PlaybackPositionTicks: number;
                        Played: boolean;
                    }>;
                }, "strip", z.ZodTypeAny, {
                    Name: string;
                    Id: string;
                    ChannelId: null;
                    ImageBlurHashes: {
                        Backdrop?: Record<string, string> | undefined;
                        Logo?: Record<string, string> | undefined;
                        Primary?: Record<string, string> | undefined;
                    };
                    ImageTags: {
                        Logo?: string | undefined;
                        Primary?: string | undefined;
                    };
                    IsFolder: boolean;
                    LocationType: string;
                    Type: string;
                    ServerId: string;
                    BackdropImageTags: string[];
                    UserData: {
                        PlayCount: number;
                        IsFavorite: boolean;
                        Key: string;
                        PlaybackPositionTicks: number;
                        Played: boolean;
                    };
                    CollectionType: string;
                }, {
                    Name: string;
                    Id: string;
                    ChannelId: null;
                    ImageBlurHashes: {
                        Backdrop?: Record<string, string> | undefined;
                        Logo?: Record<string, string> | undefined;
                        Primary?: Record<string, string> | undefined;
                    };
                    ImageTags: {
                        Logo?: string | undefined;
                        Primary?: string | undefined;
                    };
                    IsFolder: boolean;
                    LocationType: string;
                    Type: string;
                    ServerId: string;
                    BackdropImageTags: string[];
                    UserData: {
                        PlayCount: number;
                        IsFavorite: boolean;
                        Key: string;
                        PlaybackPositionTicks: number;
                        Played: boolean;
                    };
                    CollectionType: string;
                }>, "many">;
            }, "strip", z.ZodTypeAny, {
                Items: {
                    Name: string;
                    Id: string;
                    ChannelId: null;
                    ImageBlurHashes: {
                        Backdrop?: Record<string, string> | undefined;
                        Logo?: Record<string, string> | undefined;
                        Primary?: Record<string, string> | undefined;
                    };
                    ImageTags: {
                        Logo?: string | undefined;
                        Primary?: string | undefined;
                    };
                    IsFolder: boolean;
                    LocationType: string;
                    Type: string;
                    ServerId: string;
                    BackdropImageTags: string[];
                    UserData: {
                        PlayCount: number;
                        IsFavorite: boolean;
                        Key: string;
                        PlaybackPositionTicks: number;
                        Played: boolean;
                    };
                    CollectionType: string;
                }[];
            }, {
                Items: {
                    Name: string;
                    Id: string;
                    ChannelId: null;
                    ImageBlurHashes: {
                        Backdrop?: Record<string, string> | undefined;
                        Logo?: Record<string, string> | undefined;
                        Primary?: Record<string, string> | undefined;
                    };
                    ImageTags: {
                        Logo?: string | undefined;
                        Primary?: string | undefined;
                    };
                    IsFolder: boolean;
                    LocationType: string;
                    Type: string;
                    ServerId: string;
                    BackdropImageTags: string[];
                    UserData: {
                        PlayCount: number;
                        IsFavorite: boolean;
                        Key: string;
                        PlaybackPositionTicks: number;
                        Played: boolean;
                    };
                    CollectionType: string;
                }[];
            }>;
            400: z.ZodObject<{
                errors: z.ZodObject<{
                    recursive: z.ZodArray<z.ZodString, "many">;
                }, "strip", z.ZodTypeAny, {
                    recursive: string[];
                }, {
                    recursive: string[];
                }>;
                status: z.ZodNumber;
                title: z.ZodString;
                traceId: z.ZodString;
                type: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                title: string;
                type: string;
                status: number;
                errors: {
                    recursive: string[];
                };
                traceId: string;
            }, {
                title: string;
                type: string;
                status: number;
                errors: {
                    recursive: string[];
                };
                traceId: string;
            }>;
        };
    };
    getPlaylistDetail: {
        method: "GET";
        query: z.ZodObject<{
            AlbumArtistIds: z.ZodOptional<z.ZodString>;
            ArtistIds: z.ZodOptional<z.ZodString>;
            ContributingArtistIds: z.ZodOptional<z.ZodString>;
            EnableImageTypes: z.ZodOptional<z.ZodString>;
            EnableTotalRecordCount: z.ZodOptional<z.ZodBoolean>;
            EnableUserData: z.ZodOptional<z.ZodBoolean>;
            EnableUserDataTypes: z.ZodOptional<z.ZodBoolean>;
            ExcludeArtistIds: z.ZodOptional<z.ZodString>;
            ExcludeItemIds: z.ZodOptional<z.ZodString>;
            ExcludeItemTypes: z.ZodOptional<z.ZodString>;
            Fields: z.ZodOptional<z.ZodReadonly<z.ZodArray<z.ZodString, "many">>>;
            FolderId: z.ZodOptional<z.ZodString>;
            ImageTypeLimit: z.ZodOptional<z.ZodNumber>;
            IncludeArtists: z.ZodOptional<z.ZodBoolean>;
            IncludeGenres: z.ZodOptional<z.ZodBoolean>;
            IncludeItemTypes: z.ZodOptional<z.ZodString>;
            IncludeMedia: z.ZodOptional<z.ZodBoolean>;
            IncludePeople: z.ZodOptional<z.ZodBoolean>;
            IncludeStudios: z.ZodOptional<z.ZodBoolean>;
            IsFavorite: z.ZodOptional<z.ZodBoolean>;
            Limit: z.ZodOptional<z.ZodNumber>;
            MediaTypes: z.ZodOptional<z.ZodString>;
            NameStartsWith: z.ZodOptional<z.ZodString>;
            ParentId: z.ZodOptional<z.ZodString>;
            Recursive: z.ZodOptional<z.ZodBoolean>;
            SearchTerm: z.ZodOptional<z.ZodString>;
            SortBy: z.ZodOptional<z.ZodString>;
            SortOrder: z.ZodOptional<z.ZodEnum<["Ascending", "Descending"]>>;
            StartIndex: z.ZodOptional<z.ZodNumber>;
            Tags: z.ZodOptional<z.ZodString>;
            UserId: z.ZodOptional<z.ZodString>;
            Years: z.ZodOptional<z.ZodString>;
        } & {
            Ids: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            Ids: string;
            Limit?: number | undefined;
            UserId?: string | undefined;
            AlbumArtistIds?: string | undefined;
            ArtistIds?: string | undefined;
            ContributingArtistIds?: string | undefined;
            EnableImageTypes?: string | undefined;
            EnableTotalRecordCount?: boolean | undefined;
            EnableUserData?: boolean | undefined;
            EnableUserDataTypes?: boolean | undefined;
            ExcludeArtistIds?: string | undefined;
            ExcludeItemIds?: string | undefined;
            ExcludeItemTypes?: string | undefined;
            Fields?: readonly string[] | undefined;
            FolderId?: string | undefined;
            ImageTypeLimit?: number | undefined;
            IncludeArtists?: boolean | undefined;
            IncludeGenres?: boolean | undefined;
            IncludeItemTypes?: string | undefined;
            IncludeMedia?: boolean | undefined;
            IncludePeople?: boolean | undefined;
            IncludeStudios?: boolean | undefined;
            IsFavorite?: boolean | undefined;
            MediaTypes?: string | undefined;
            NameStartsWith?: string | undefined;
            ParentId?: string | undefined;
            Recursive?: boolean | undefined;
            SearchTerm?: string | undefined;
            SortBy?: string | undefined;
            SortOrder?: "Ascending" | "Descending" | undefined;
            StartIndex?: number | undefined;
            Tags?: string | undefined;
            Years?: string | undefined;
        }, {
            Ids: string;
            Limit?: number | undefined;
            UserId?: string | undefined;
            AlbumArtistIds?: string | undefined;
            ArtistIds?: string | undefined;
            ContributingArtistIds?: string | undefined;
            EnableImageTypes?: string | undefined;
            EnableTotalRecordCount?: boolean | undefined;
            EnableUserData?: boolean | undefined;
            EnableUserDataTypes?: boolean | undefined;
            ExcludeArtistIds?: string | undefined;
            ExcludeItemIds?: string | undefined;
            ExcludeItemTypes?: string | undefined;
            Fields?: readonly string[] | undefined;
            FolderId?: string | undefined;
            ImageTypeLimit?: number | undefined;
            IncludeArtists?: boolean | undefined;
            IncludeGenres?: boolean | undefined;
            IncludeItemTypes?: string | undefined;
            IncludeMedia?: boolean | undefined;
            IncludePeople?: boolean | undefined;
            IncludeStudios?: boolean | undefined;
            IsFavorite?: boolean | undefined;
            MediaTypes?: string | undefined;
            NameStartsWith?: string | undefined;
            ParentId?: string | undefined;
            Recursive?: boolean | undefined;
            SearchTerm?: string | undefined;
            SortBy?: string | undefined;
            SortOrder?: "Ascending" | "Descending" | undefined;
            StartIndex?: number | undefined;
            Tags?: string | undefined;
            Years?: string | undefined;
        }>;
        path: "users/:userId/items/:id";
        responses: {
            200: z.ZodObject<{
                BackdropImageTags: z.ZodArray<z.ZodString, "many">;
                ChannelId: z.ZodNull;
                ChildCount: z.ZodOptional<z.ZodNumber>;
                DateCreated: z.ZodString;
                GenreItems: z.ZodArray<z.ZodObject<{
                    Id: z.ZodString;
                    Name: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    Name: string;
                    Id: string;
                }, {
                    Name: string;
                    Id: string;
                }>, "many">;
                Genres: z.ZodArray<z.ZodString, "many">;
                Id: z.ZodString;
                ImageBlurHashes: z.ZodObject<{
                    Backdrop: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
                    Logo: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
                    Primary: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
                }, "strip", z.ZodTypeAny, {
                    Backdrop?: Record<string, string> | undefined;
                    Logo?: Record<string, string> | undefined;
                    Primary?: Record<string, string> | undefined;
                }, {
                    Backdrop?: Record<string, string> | undefined;
                    Logo?: Record<string, string> | undefined;
                    Primary?: Record<string, string> | undefined;
                }>;
                ImageTags: z.ZodObject<{
                    Logo: z.ZodOptional<z.ZodString>;
                    Primary: z.ZodOptional<z.ZodString>;
                }, "strip", z.ZodTypeAny, {
                    Logo?: string | undefined;
                    Primary?: string | undefined;
                }, {
                    Logo?: string | undefined;
                    Primary?: string | undefined;
                }>;
                IsFolder: z.ZodBoolean;
                LocationType: z.ZodString;
                MediaType: z.ZodString;
                Name: z.ZodString;
                Overview: z.ZodOptional<z.ZodString>;
                RunTimeTicks: z.ZodNumber;
                ServerId: z.ZodString;
                Type: z.ZodString;
                UserData: z.ZodObject<{
                    IsFavorite: z.ZodBoolean;
                    Key: z.ZodString;
                    PlaybackPositionTicks: z.ZodNumber;
                    PlayCount: z.ZodNumber;
                    Played: z.ZodBoolean;
                }, "strip", z.ZodTypeAny, {
                    PlayCount: number;
                    IsFavorite: boolean;
                    Key: string;
                    PlaybackPositionTicks: number;
                    Played: boolean;
                }, {
                    PlayCount: number;
                    IsFavorite: boolean;
                    Key: string;
                    PlaybackPositionTicks: number;
                    Played: boolean;
                }>;
            }, "strip", z.ZodTypeAny, {
                Name: string;
                Genres: string[];
                MediaType: string;
                Id: string;
                ChannelId: null;
                DateCreated: string;
                GenreItems: {
                    Name: string;
                    Id: string;
                }[];
                ImageBlurHashes: {
                    Backdrop?: Record<string, string> | undefined;
                    Logo?: Record<string, string> | undefined;
                    Primary?: Record<string, string> | undefined;
                };
                ImageTags: {
                    Logo?: string | undefined;
                    Primary?: string | undefined;
                };
                IsFolder: boolean;
                LocationType: string;
                Type: string;
                RunTimeTicks: number;
                ServerId: string;
                BackdropImageTags: string[];
                UserData: {
                    PlayCount: number;
                    IsFavorite: boolean;
                    Key: string;
                    PlaybackPositionTicks: number;
                    Played: boolean;
                };
                ChildCount?: number | undefined;
                Overview?: string | undefined;
            }, {
                Name: string;
                Genres: string[];
                MediaType: string;
                Id: string;
                ChannelId: null;
                DateCreated: string;
                GenreItems: {
                    Name: string;
                    Id: string;
                }[];
                ImageBlurHashes: {
                    Backdrop?: Record<string, string> | undefined;
                    Logo?: Record<string, string> | undefined;
                    Primary?: Record<string, string> | undefined;
                };
                ImageTags: {
                    Logo?: string | undefined;
                    Primary?: string | undefined;
                };
                IsFolder: boolean;
                LocationType: string;
                Type: string;
                RunTimeTicks: number;
                ServerId: string;
                BackdropImageTags: string[];
                UserData: {
                    PlayCount: number;
                    IsFavorite: boolean;
                    Key: string;
                    PlaybackPositionTicks: number;
                    Played: boolean;
                };
                ChildCount?: number | undefined;
                Overview?: string | undefined;
            }>;
            400: z.ZodObject<{
                errors: z.ZodObject<{
                    recursive: z.ZodArray<z.ZodString, "many">;
                }, "strip", z.ZodTypeAny, {
                    recursive: string[];
                }, {
                    recursive: string[];
                }>;
                status: z.ZodNumber;
                title: z.ZodString;
                traceId: z.ZodString;
                type: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                title: string;
                type: string;
                status: number;
                errors: {
                    recursive: string[];
                };
                traceId: string;
            }, {
                title: string;
                type: string;
                status: number;
                errors: {
                    recursive: string[];
                };
                traceId: string;
            }>;
        };
    };
    getPlaylistList: {
        method: "GET";
        query: z.ZodObject<{} & {
            AlbumArtistIds: z.ZodOptional<z.ZodString>;
            ArtistIds: z.ZodOptional<z.ZodString>;
            ContributingArtistIds: z.ZodOptional<z.ZodString>;
            EnableImageTypes: z.ZodOptional<z.ZodString>;
            EnableTotalRecordCount: z.ZodOptional<z.ZodBoolean>;
            EnableUserData: z.ZodOptional<z.ZodBoolean>;
            EnableUserDataTypes: z.ZodOptional<z.ZodBoolean>;
            ExcludeArtistIds: z.ZodOptional<z.ZodString>;
            ExcludeItemIds: z.ZodOptional<z.ZodString>;
            ExcludeItemTypes: z.ZodOptional<z.ZodString>;
            Fields: z.ZodOptional<z.ZodReadonly<z.ZodArray<z.ZodString, "many">>>;
            FolderId: z.ZodOptional<z.ZodString>;
            ImageTypeLimit: z.ZodOptional<z.ZodNumber>;
            IncludeArtists: z.ZodOptional<z.ZodBoolean>;
            IncludeGenres: z.ZodOptional<z.ZodBoolean>;
            IncludeMedia: z.ZodOptional<z.ZodBoolean>;
            IncludePeople: z.ZodOptional<z.ZodBoolean>;
            IncludeStudios: z.ZodOptional<z.ZodBoolean>;
            IsFavorite: z.ZodOptional<z.ZodBoolean>;
            Limit: z.ZodOptional<z.ZodNumber>;
            MediaTypes: z.ZodOptional<z.ZodString>;
            NameStartsWith: z.ZodOptional<z.ZodString>;
            ParentId: z.ZodOptional<z.ZodString>;
            Recursive: z.ZodOptional<z.ZodBoolean>;
            SearchTerm: z.ZodOptional<z.ZodString>;
            SortOrder: z.ZodOptional<z.ZodEnum<["Ascending", "Descending"]>>;
            StartIndex: z.ZodOptional<z.ZodNumber>;
            Tags: z.ZodOptional<z.ZodString>;
            UserId: z.ZodOptional<z.ZodString>;
            Years: z.ZodOptional<z.ZodString>;
            IncludeItemTypes: z.ZodLiteral<"Playlist">;
            SortBy: z.ZodOptional<z.ZodNativeEnum<{
                readonly ALBUM_ARTIST: "AlbumArtist,SortName";
                readonly DURATION: "Runtime";
                readonly NAME: "SortName";
                readonly RECENTLY_ADDED: "DateCreated,SortName";
                readonly SONG_COUNT: "ChildCount";
            }>>;
        }, "strip", z.ZodTypeAny, {
            IncludeItemTypes: "Playlist";
            Limit?: number | undefined;
            UserId?: string | undefined;
            AlbumArtistIds?: string | undefined;
            ArtistIds?: string | undefined;
            ContributingArtistIds?: string | undefined;
            EnableImageTypes?: string | undefined;
            EnableTotalRecordCount?: boolean | undefined;
            EnableUserData?: boolean | undefined;
            EnableUserDataTypes?: boolean | undefined;
            ExcludeArtistIds?: string | undefined;
            ExcludeItemIds?: string | undefined;
            ExcludeItemTypes?: string | undefined;
            Fields?: readonly string[] | undefined;
            FolderId?: string | undefined;
            ImageTypeLimit?: number | undefined;
            IncludeArtists?: boolean | undefined;
            IncludeGenres?: boolean | undefined;
            IncludeMedia?: boolean | undefined;
            IncludePeople?: boolean | undefined;
            IncludeStudios?: boolean | undefined;
            IsFavorite?: boolean | undefined;
            MediaTypes?: string | undefined;
            NameStartsWith?: string | undefined;
            ParentId?: string | undefined;
            Recursive?: boolean | undefined;
            SearchTerm?: string | undefined;
            SortBy?: "DateCreated,SortName" | "AlbumArtist,SortName" | "SortName" | "Runtime" | "ChildCount" | undefined;
            SortOrder?: "Ascending" | "Descending" | undefined;
            StartIndex?: number | undefined;
            Tags?: string | undefined;
            Years?: string | undefined;
        }, {
            IncludeItemTypes: "Playlist";
            Limit?: number | undefined;
            UserId?: string | undefined;
            AlbumArtistIds?: string | undefined;
            ArtistIds?: string | undefined;
            ContributingArtistIds?: string | undefined;
            EnableImageTypes?: string | undefined;
            EnableTotalRecordCount?: boolean | undefined;
            EnableUserData?: boolean | undefined;
            EnableUserDataTypes?: boolean | undefined;
            ExcludeArtistIds?: string | undefined;
            ExcludeItemIds?: string | undefined;
            ExcludeItemTypes?: string | undefined;
            Fields?: readonly string[] | undefined;
            FolderId?: string | undefined;
            ImageTypeLimit?: number | undefined;
            IncludeArtists?: boolean | undefined;
            IncludeGenres?: boolean | undefined;
            IncludeMedia?: boolean | undefined;
            IncludePeople?: boolean | undefined;
            IncludeStudios?: boolean | undefined;
            IsFavorite?: boolean | undefined;
            MediaTypes?: string | undefined;
            NameStartsWith?: string | undefined;
            ParentId?: string | undefined;
            Recursive?: boolean | undefined;
            SearchTerm?: string | undefined;
            SortBy?: "DateCreated,SortName" | "AlbumArtist,SortName" | "SortName" | "Runtime" | "ChildCount" | undefined;
            SortOrder?: "Ascending" | "Descending" | undefined;
            StartIndex?: number | undefined;
            Tags?: string | undefined;
            Years?: string | undefined;
        }>;
        path: "users/:userId/items";
        responses: {
            200: z.ZodObject<{
                StartIndex: z.ZodNumber;
                TotalRecordCount: z.ZodNumber;
            } & {
                Items: z.ZodArray<z.ZodObject<{
                    BackdropImageTags: z.ZodArray<z.ZodString, "many">;
                    ChannelId: z.ZodNull;
                    ChildCount: z.ZodOptional<z.ZodNumber>;
                    DateCreated: z.ZodString;
                    GenreItems: z.ZodArray<z.ZodObject<{
                        Id: z.ZodString;
                        Name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        Name: string;
                        Id: string;
                    }, {
                        Name: string;
                        Id: string;
                    }>, "many">;
                    Genres: z.ZodArray<z.ZodString, "many">;
                    Id: z.ZodString;
                    ImageBlurHashes: z.ZodObject<{
                        Backdrop: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
                        Logo: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
                        Primary: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
                    }, "strip", z.ZodTypeAny, {
                        Backdrop?: Record<string, string> | undefined;
                        Logo?: Record<string, string> | undefined;
                        Primary?: Record<string, string> | undefined;
                    }, {
                        Backdrop?: Record<string, string> | undefined;
                        Logo?: Record<string, string> | undefined;
                        Primary?: Record<string, string> | undefined;
                    }>;
                    ImageTags: z.ZodObject<{
                        Logo: z.ZodOptional<z.ZodString>;
                        Primary: z.ZodOptional<z.ZodString>;
                    }, "strip", z.ZodTypeAny, {
                        Logo?: string | undefined;
                        Primary?: string | undefined;
                    }, {
                        Logo?: string | undefined;
                        Primary?: string | undefined;
                    }>;
                    IsFolder: z.ZodBoolean;
                    LocationType: z.ZodString;
                    MediaType: z.ZodString;
                    Name: z.ZodString;
                    Overview: z.ZodOptional<z.ZodString>;
                    RunTimeTicks: z.ZodNumber;
                    ServerId: z.ZodString;
                    Type: z.ZodString;
                    UserData: z.ZodObject<{
                        IsFavorite: z.ZodBoolean;
                        Key: z.ZodString;
                        PlaybackPositionTicks: z.ZodNumber;
                        PlayCount: z.ZodNumber;
                        Played: z.ZodBoolean;
                    }, "strip", z.ZodTypeAny, {
                        PlayCount: number;
                        IsFavorite: boolean;
                        Key: string;
                        PlaybackPositionTicks: number;
                        Played: boolean;
                    }, {
                        PlayCount: number;
                        IsFavorite: boolean;
                        Key: string;
                        PlaybackPositionTicks: number;
                        Played: boolean;
                    }>;
                }, "strip", z.ZodTypeAny, {
                    Name: string;
                    Genres: string[];
                    MediaType: string;
                    Id: string;
                    ChannelId: null;
                    DateCreated: string;
                    GenreItems: {
                        Name: string;
                        Id: string;
                    }[];
                    ImageBlurHashes: {
                        Backdrop?: Record<string, string> | undefined;
                        Logo?: Record<string, string> | undefined;
                        Primary?: Record<string, string> | undefined;
                    };
                    ImageTags: {
                        Logo?: string | undefined;
                        Primary?: string | undefined;
                    };
                    IsFolder: boolean;
                    LocationType: string;
                    Type: string;
                    RunTimeTicks: number;
                    ServerId: string;
                    BackdropImageTags: string[];
                    UserData: {
                        PlayCount: number;
                        IsFavorite: boolean;
                        Key: string;
                        PlaybackPositionTicks: number;
                        Played: boolean;
                    };
                    ChildCount?: number | undefined;
                    Overview?: string | undefined;
                }, {
                    Name: string;
                    Genres: string[];
                    MediaType: string;
                    Id: string;
                    ChannelId: null;
                    DateCreated: string;
                    GenreItems: {
                        Name: string;
                        Id: string;
                    }[];
                    ImageBlurHashes: {
                        Backdrop?: Record<string, string> | undefined;
                        Logo?: Record<string, string> | undefined;
                        Primary?: Record<string, string> | undefined;
                    };
                    ImageTags: {
                        Logo?: string | undefined;
                        Primary?: string | undefined;
                    };
                    IsFolder: boolean;
                    LocationType: string;
                    Type: string;
                    RunTimeTicks: number;
                    ServerId: string;
                    BackdropImageTags: string[];
                    UserData: {
                        PlayCount: number;
                        IsFavorite: boolean;
                        Key: string;
                        PlaybackPositionTicks: number;
                        Played: boolean;
                    };
                    ChildCount?: number | undefined;
                    Overview?: string | undefined;
                }>, "many">;
            }, "strip", z.ZodTypeAny, {
                StartIndex: number;
                TotalRecordCount: number;
                Items: {
                    Name: string;
                    Genres: string[];
                    MediaType: string;
                    Id: string;
                    ChannelId: null;
                    DateCreated: string;
                    GenreItems: {
                        Name: string;
                        Id: string;
                    }[];
                    ImageBlurHashes: {
                        Backdrop?: Record<string, string> | undefined;
                        Logo?: Record<string, string> | undefined;
                        Primary?: Record<string, string> | undefined;
                    };
                    ImageTags: {
                        Logo?: string | undefined;
                        Primary?: string | undefined;
                    };
                    IsFolder: boolean;
                    LocationType: string;
                    Type: string;
                    RunTimeTicks: number;
                    ServerId: string;
                    BackdropImageTags: string[];
                    UserData: {
                        PlayCount: number;
                        IsFavorite: boolean;
                        Key: string;
                        PlaybackPositionTicks: number;
                        Played: boolean;
                    };
                    ChildCount?: number | undefined;
                    Overview?: string | undefined;
                }[];
            }, {
                StartIndex: number;
                TotalRecordCount: number;
                Items: {
                    Name: string;
                    Genres: string[];
                    MediaType: string;
                    Id: string;
                    ChannelId: null;
                    DateCreated: string;
                    GenreItems: {
                        Name: string;
                        Id: string;
                    }[];
                    ImageBlurHashes: {
                        Backdrop?: Record<string, string> | undefined;
                        Logo?: Record<string, string> | undefined;
                        Primary?: Record<string, string> | undefined;
                    };
                    ImageTags: {
                        Logo?: string | undefined;
                        Primary?: string | undefined;
                    };
                    IsFolder: boolean;
                    LocationType: string;
                    Type: string;
                    RunTimeTicks: number;
                    ServerId: string;
                    BackdropImageTags: string[];
                    UserData: {
                        PlayCount: number;
                        IsFavorite: boolean;
                        Key: string;
                        PlaybackPositionTicks: number;
                        Played: boolean;
                    };
                    ChildCount?: number | undefined;
                    Overview?: string | undefined;
                }[];
            }>;
            400: z.ZodObject<{
                errors: z.ZodObject<{
                    recursive: z.ZodArray<z.ZodString, "many">;
                }, "strip", z.ZodTypeAny, {
                    recursive: string[];
                }, {
                    recursive: string[];
                }>;
                status: z.ZodNumber;
                title: z.ZodString;
                traceId: z.ZodString;
                type: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                title: string;
                type: string;
                status: number;
                errors: {
                    recursive: string[];
                };
                traceId: string;
            }, {
                title: string;
                type: string;
                status: number;
                errors: {
                    recursive: string[];
                };
                traceId: string;
            }>;
        };
    };
    getPlaylistSongList: {
        method: "GET";
        query: z.ZodObject<{} & {
            ContributingArtistIds: z.ZodOptional<z.ZodString>;
            EnableImageTypes: z.ZodOptional<z.ZodString>;
            EnableTotalRecordCount: z.ZodOptional<z.ZodBoolean>;
            EnableUserData: z.ZodOptional<z.ZodBoolean>;
            EnableUserDataTypes: z.ZodOptional<z.ZodBoolean>;
            ExcludeArtistIds: z.ZodOptional<z.ZodString>;
            ExcludeItemIds: z.ZodOptional<z.ZodString>;
            ExcludeItemTypes: z.ZodOptional<z.ZodString>;
            Fields: z.ZodOptional<z.ZodReadonly<z.ZodArray<z.ZodString, "many">>>;
            FolderId: z.ZodOptional<z.ZodString>;
            ImageTypeLimit: z.ZodOptional<z.ZodNumber>;
            IncludeArtists: z.ZodOptional<z.ZodBoolean>;
            IncludeGenres: z.ZodOptional<z.ZodBoolean>;
            IncludeItemTypes: z.ZodOptional<z.ZodString>;
            IncludeMedia: z.ZodOptional<z.ZodBoolean>;
            IncludePeople: z.ZodOptional<z.ZodBoolean>;
            IncludeStudios: z.ZodOptional<z.ZodBoolean>;
            Limit: z.ZodOptional<z.ZodNumber>;
            MediaTypes: z.ZodOptional<z.ZodString>;
            NameStartsWith: z.ZodOptional<z.ZodString>;
            ParentId: z.ZodOptional<z.ZodString>;
            Recursive: z.ZodOptional<z.ZodBoolean>;
            SortOrder: z.ZodOptional<z.ZodEnum<["Ascending", "Descending"]>>;
            StartIndex: z.ZodOptional<z.ZodNumber>;
            UserId: z.ZodOptional<z.ZodString>;
            AlbumArtistIds: z.ZodOptional<z.ZodString>;
            AlbumIds: z.ZodOptional<z.ZodString>;
            ArtistIds: z.ZodOptional<z.ZodString>;
            Filters: z.ZodOptional<z.ZodString>;
            GenreIds: z.ZodOptional<z.ZodString>;
            Genres: z.ZodOptional<z.ZodString>;
            IsFavorite: z.ZodOptional<z.ZodBoolean>;
            IsPlayed: z.ZodOptional<z.ZodBoolean>;
            SearchTerm: z.ZodOptional<z.ZodString>;
            SortBy: z.ZodOptional<z.ZodNativeEnum<{
                readonly ALBUM: "Album,SortName";
                readonly ALBUM_ARTIST: "AlbumArtist,Album,SortName";
                readonly ALBUM_DETAIL: "ParentIndexNumber,IndexNumber,SortName";
                readonly ARTIST: "Artist,Album,SortName";
                readonly COMMUNITY_RATING: "CommunityRating,SortName";
                readonly DURATION: "Runtime,AlbumArtist,Album,SortName";
                readonly NAME: "Name";
                readonly PLAY_COUNT: "PlayCount,SortName";
                readonly RANDOM: "Random,SortName";
                readonly RECENTLY_ADDED: "DateCreated,SortName";
                readonly RECENTLY_PLAYED: "DatePlayed,SortName";
                readonly RELEASE_DATE: "PremiereDate,AlbumArtist,Album,SortName";
            }>>;
            Tags: z.ZodOptional<z.ZodString>;
            Years: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            Limit?: number | undefined;
            Genres?: string | undefined;
            UserId?: string | undefined;
            AlbumArtistIds?: string | undefined;
            ArtistIds?: string | undefined;
            ContributingArtistIds?: string | undefined;
            EnableImageTypes?: string | undefined;
            EnableTotalRecordCount?: boolean | undefined;
            EnableUserData?: boolean | undefined;
            EnableUserDataTypes?: boolean | undefined;
            ExcludeArtistIds?: string | undefined;
            ExcludeItemIds?: string | undefined;
            ExcludeItemTypes?: string | undefined;
            Fields?: readonly string[] | undefined;
            FolderId?: string | undefined;
            ImageTypeLimit?: number | undefined;
            IncludeArtists?: boolean | undefined;
            IncludeGenres?: boolean | undefined;
            IncludeItemTypes?: string | undefined;
            IncludeMedia?: boolean | undefined;
            IncludePeople?: boolean | undefined;
            IncludeStudios?: boolean | undefined;
            IsFavorite?: boolean | undefined;
            MediaTypes?: string | undefined;
            NameStartsWith?: string | undefined;
            ParentId?: string | undefined;
            Recursive?: boolean | undefined;
            SearchTerm?: string | undefined;
            SortBy?: "Name" | "Album,SortName" | "Runtime,AlbumArtist,Album,SortName" | "Random,SortName" | "DateCreated,SortName" | "PremiereDate,AlbumArtist,Album,SortName" | "CommunityRating,SortName" | "AlbumArtist,Album,SortName" | "ParentIndexNumber,IndexNumber,SortName" | "Artist,Album,SortName" | "PlayCount,SortName" | "DatePlayed,SortName" | undefined;
            SortOrder?: "Ascending" | "Descending" | undefined;
            StartIndex?: number | undefined;
            Tags?: string | undefined;
            Years?: string | undefined;
            Filters?: string | undefined;
            GenreIds?: string | undefined;
            AlbumIds?: string | undefined;
            IsPlayed?: boolean | undefined;
        }, {
            Limit?: number | undefined;
            Genres?: string | undefined;
            UserId?: string | undefined;
            AlbumArtistIds?: string | undefined;
            ArtistIds?: string | undefined;
            ContributingArtistIds?: string | undefined;
            EnableImageTypes?: string | undefined;
            EnableTotalRecordCount?: boolean | undefined;
            EnableUserData?: boolean | undefined;
            EnableUserDataTypes?: boolean | undefined;
            ExcludeArtistIds?: string | undefined;
            ExcludeItemIds?: string | undefined;
            ExcludeItemTypes?: string | undefined;
            Fields?: readonly string[] | undefined;
            FolderId?: string | undefined;
            ImageTypeLimit?: number | undefined;
            IncludeArtists?: boolean | undefined;
            IncludeGenres?: boolean | undefined;
            IncludeItemTypes?: string | undefined;
            IncludeMedia?: boolean | undefined;
            IncludePeople?: boolean | undefined;
            IncludeStudios?: boolean | undefined;
            IsFavorite?: boolean | undefined;
            MediaTypes?: string | undefined;
            NameStartsWith?: string | undefined;
            ParentId?: string | undefined;
            Recursive?: boolean | undefined;
            SearchTerm?: string | undefined;
            SortBy?: "Name" | "Album,SortName" | "Runtime,AlbumArtist,Album,SortName" | "Random,SortName" | "DateCreated,SortName" | "PremiereDate,AlbumArtist,Album,SortName" | "CommunityRating,SortName" | "AlbumArtist,Album,SortName" | "ParentIndexNumber,IndexNumber,SortName" | "Artist,Album,SortName" | "PlayCount,SortName" | "DatePlayed,SortName" | undefined;
            SortOrder?: "Ascending" | "Descending" | undefined;
            StartIndex?: number | undefined;
            Tags?: string | undefined;
            Years?: string | undefined;
            Filters?: string | undefined;
            GenreIds?: string | undefined;
            AlbumIds?: string | undefined;
            IsPlayed?: boolean | undefined;
        }>;
        path: "playlists/:id/items";
        responses: {
            200: z.ZodObject<{
                StartIndex: z.ZodNumber;
                TotalRecordCount: z.ZodNumber;
            } & {
                Items: z.ZodArray<z.ZodObject<{
                    Album: z.ZodString;
                    AlbumArtist: z.ZodString;
                    AlbumArtists: z.ZodArray<z.ZodObject<{
                        Id: z.ZodString;
                        Name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        Name: string;
                        Id: string;
                    }, {
                        Name: string;
                        Id: string;
                    }>, "many">;
                    AlbumId: z.ZodOptional<z.ZodString>;
                    AlbumPrimaryImageTag: z.ZodString;
                    ArtistItems: z.ZodArray<z.ZodObject<{
                        Id: z.ZodString;
                        Name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        Name: string;
                        Id: string;
                    }, {
                        Name: string;
                        Id: string;
                    }>, "many">;
                    Artists: z.ZodArray<z.ZodString, "many">;
                    BackdropImageTags: z.ZodArray<z.ZodString, "many">;
                    ChannelId: z.ZodNull;
                    DateCreated: z.ZodString;
                    ExternalUrls: z.ZodArray<z.ZodObject<{
                        Name: z.ZodString;
                        Url: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        Name: string;
                        Url: string;
                    }, {
                        Name: string;
                        Url: string;
                    }>, "many">;
                    GenreItems: z.ZodArray<z.ZodObject<{
                        Id: z.ZodString;
                        Name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        Name: string;
                        Id: string;
                    }, {
                        Name: string;
                        Id: string;
                    }>, "many">;
                    Genres: z.ZodArray<z.ZodString, "many">;
                    Id: z.ZodString;
                    ImageBlurHashes: z.ZodObject<{
                        Backdrop: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
                        Logo: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
                        Primary: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
                    }, "strip", z.ZodTypeAny, {
                        Backdrop?: Record<string, string> | undefined;
                        Logo?: Record<string, string> | undefined;
                        Primary?: Record<string, string> | undefined;
                    }, {
                        Backdrop?: Record<string, string> | undefined;
                        Logo?: Record<string, string> | undefined;
                        Primary?: Record<string, string> | undefined;
                    }>;
                    ImageTags: z.ZodObject<{
                        Logo: z.ZodOptional<z.ZodString>;
                        Primary: z.ZodOptional<z.ZodString>;
                    }, "strip", z.ZodTypeAny, {
                        Logo?: string | undefined;
                        Primary?: string | undefined;
                    }, {
                        Logo?: string | undefined;
                        Primary?: string | undefined;
                    }>;
                    IndexNumber: z.ZodNumber;
                    IsFolder: z.ZodBoolean;
                    LocationType: z.ZodString;
                    LUFS: z.ZodOptional<z.ZodNumber>;
                    MediaSources: z.ZodArray<z.ZodObject<{
                        Bitrate: z.ZodNumber;
                        Container: z.ZodString;
                        DefaultAudioStreamIndex: z.ZodNumber;
                        ETag: z.ZodString;
                        Formats: z.ZodArray<z.ZodAny, "many">;
                        GenPtsInput: z.ZodBoolean;
                        Id: z.ZodString;
                        IgnoreDts: z.ZodBoolean;
                        IgnoreIndex: z.ZodBoolean;
                        IsInfiniteStream: z.ZodBoolean;
                        IsRemote: z.ZodBoolean;
                        MediaAttachments: z.ZodArray<z.ZodAny, "many">;
                        MediaStreams: z.ZodArray<z.ZodObject<{
                            AspectRatio: z.ZodOptional<z.ZodString>;
                            BitDepth: z.ZodOptional<z.ZodNumber>;
                            BitRate: z.ZodOptional<z.ZodNumber>;
                            ChannelLayout: z.ZodOptional<z.ZodString>;
                            Channels: z.ZodOptional<z.ZodNumber>;
                            Codec: z.ZodString;
                            CodecTimeBase: z.ZodString;
                            ColorSpace: z.ZodOptional<z.ZodString>;
                            Comment: z.ZodOptional<z.ZodString>;
                            DisplayTitle: z.ZodOptional<z.ZodString>;
                            Height: z.ZodOptional<z.ZodNumber>;
                            Index: z.ZodNumber;
                            IsDefault: z.ZodBoolean;
                            IsExternal: z.ZodBoolean;
                            IsForced: z.ZodBoolean;
                            IsInterlaced: z.ZodBoolean;
                            IsTextSubtitleStream: z.ZodBoolean;
                            Level: z.ZodNumber;
                            PixelFormat: z.ZodOptional<z.ZodString>;
                            Profile: z.ZodOptional<z.ZodString>;
                            RealFrameRate: z.ZodOptional<z.ZodNumber>;
                            RefFrames: z.ZodOptional<z.ZodNumber>;
                            SampleRate: z.ZodOptional<z.ZodNumber>;
                            SupportsExternalStream: z.ZodBoolean;
                            TimeBase: z.ZodString;
                            Type: z.ZodString;
                            Width: z.ZodOptional<z.ZodNumber>;
                        }, "strip", z.ZodTypeAny, {
                            Codec: string;
                            Level: number;
                            Type: string;
                            CodecTimeBase: string;
                            Index: number;
                            IsDefault: boolean;
                            IsExternal: boolean;
                            IsForced: boolean;
                            IsInterlaced: boolean;
                            IsTextSubtitleStream: boolean;
                            SupportsExternalStream: boolean;
                            TimeBase: string;
                            AspectRatio?: string | undefined;
                            BitDepth?: number | undefined;
                            BitRate?: number | undefined;
                            ChannelLayout?: string | undefined;
                            Channels?: number | undefined;
                            ColorSpace?: string | undefined;
                            Comment?: string | undefined;
                            DisplayTitle?: string | undefined;
                            Height?: number | undefined;
                            PixelFormat?: string | undefined;
                            Profile?: string | undefined;
                            RealFrameRate?: number | undefined;
                            RefFrames?: number | undefined;
                            SampleRate?: number | undefined;
                            Width?: number | undefined;
                        }, {
                            Codec: string;
                            Level: number;
                            Type: string;
                            CodecTimeBase: string;
                            Index: number;
                            IsDefault: boolean;
                            IsExternal: boolean;
                            IsForced: boolean;
                            IsInterlaced: boolean;
                            IsTextSubtitleStream: boolean;
                            SupportsExternalStream: boolean;
                            TimeBase: string;
                            AspectRatio?: string | undefined;
                            BitDepth?: number | undefined;
                            BitRate?: number | undefined;
                            ChannelLayout?: string | undefined;
                            Channels?: number | undefined;
                            ColorSpace?: string | undefined;
                            Comment?: string | undefined;
                            DisplayTitle?: string | undefined;
                            Height?: number | undefined;
                            PixelFormat?: string | undefined;
                            Profile?: string | undefined;
                            RealFrameRate?: number | undefined;
                            RefFrames?: number | undefined;
                            SampleRate?: number | undefined;
                            Width?: number | undefined;
                        }>, "many">;
                        Name: z.ZodString;
                        Path: z.ZodString;
                        Protocol: z.ZodString;
                        ReadAtNativeFramerate: z.ZodBoolean;
                        RequiredHttpHeaders: z.ZodAny;
                        RequiresClosing: z.ZodBoolean;
                        RequiresLooping: z.ZodBoolean;
                        RequiresOpening: z.ZodBoolean;
                        RunTimeTicks: z.ZodNumber;
                        Size: z.ZodNumber;
                        SupportsDirectPlay: z.ZodBoolean;
                        SupportsDirectStream: z.ZodBoolean;
                        SupportsProbing: z.ZodBoolean;
                        SupportsTranscoding: z.ZodBoolean;
                        Type: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        Name: string;
                        Bitrate: number;
                        Id: string;
                        Type: string;
                        RunTimeTicks: number;
                        Container: string;
                        DefaultAudioStreamIndex: number;
                        ETag: string;
                        Formats: any[];
                        GenPtsInput: boolean;
                        IgnoreDts: boolean;
                        IgnoreIndex: boolean;
                        IsInfiniteStream: boolean;
                        IsRemote: boolean;
                        MediaAttachments: any[];
                        MediaStreams: {
                            Codec: string;
                            Level: number;
                            Type: string;
                            CodecTimeBase: string;
                            Index: number;
                            IsDefault: boolean;
                            IsExternal: boolean;
                            IsForced: boolean;
                            IsInterlaced: boolean;
                            IsTextSubtitleStream: boolean;
                            SupportsExternalStream: boolean;
                            TimeBase: string;
                            AspectRatio?: string | undefined;
                            BitDepth?: number | undefined;
                            BitRate?: number | undefined;
                            ChannelLayout?: string | undefined;
                            Channels?: number | undefined;
                            ColorSpace?: string | undefined;
                            Comment?: string | undefined;
                            DisplayTitle?: string | undefined;
                            Height?: number | undefined;
                            PixelFormat?: string | undefined;
                            Profile?: string | undefined;
                            RealFrameRate?: number | undefined;
                            RefFrames?: number | undefined;
                            SampleRate?: number | undefined;
                            Width?: number | undefined;
                        }[];
                        Path: string;
                        Protocol: string;
                        ReadAtNativeFramerate: boolean;
                        RequiresClosing: boolean;
                        RequiresLooping: boolean;
                        RequiresOpening: boolean;
                        Size: number;
                        SupportsDirectPlay: boolean;
                        SupportsDirectStream: boolean;
                        SupportsProbing: boolean;
                        SupportsTranscoding: boolean;
                        RequiredHttpHeaders?: any;
                    }, {
                        Name: string;
                        Bitrate: number;
                        Id: string;
                        Type: string;
                        RunTimeTicks: number;
                        Container: string;
                        DefaultAudioStreamIndex: number;
                        ETag: string;
                        Formats: any[];
                        GenPtsInput: boolean;
                        IgnoreDts: boolean;
                        IgnoreIndex: boolean;
                        IsInfiniteStream: boolean;
                        IsRemote: boolean;
                        MediaAttachments: any[];
                        MediaStreams: {
                            Codec: string;
                            Level: number;
                            Type: string;
                            CodecTimeBase: string;
                            Index: number;
                            IsDefault: boolean;
                            IsExternal: boolean;
                            IsForced: boolean;
                            IsInterlaced: boolean;
                            IsTextSubtitleStream: boolean;
                            SupportsExternalStream: boolean;
                            TimeBase: string;
                            AspectRatio?: string | undefined;
                            BitDepth?: number | undefined;
                            BitRate?: number | undefined;
                            ChannelLayout?: string | undefined;
                            Channels?: number | undefined;
                            ColorSpace?: string | undefined;
                            Comment?: string | undefined;
                            DisplayTitle?: string | undefined;
                            Height?: number | undefined;
                            PixelFormat?: string | undefined;
                            Profile?: string | undefined;
                            RealFrameRate?: number | undefined;
                            RefFrames?: number | undefined;
                            SampleRate?: number | undefined;
                            Width?: number | undefined;
                        }[];
                        Path: string;
                        Protocol: string;
                        ReadAtNativeFramerate: boolean;
                        RequiresClosing: boolean;
                        RequiresLooping: boolean;
                        RequiresOpening: boolean;
                        Size: number;
                        SupportsDirectPlay: boolean;
                        SupportsDirectStream: boolean;
                        SupportsProbing: boolean;
                        SupportsTranscoding: boolean;
                        RequiredHttpHeaders?: any;
                    }>, "many">;
                    MediaType: z.ZodString;
                    Name: z.ZodString;
                    NormalizationGain: z.ZodOptional<z.ZodNumber>;
                    ParentId: z.ZodOptional<z.ZodString>;
                    ParentIndexNumber: z.ZodNumber;
                    People: z.ZodOptional<z.ZodArray<z.ZodObject<{
                        Id: z.ZodString;
                        Name: z.ZodString;
                        Type: z.ZodOptional<z.ZodString>;
                    }, "strip", z.ZodTypeAny, {
                        Name: string;
                        Id: string;
                        Type?: string | undefined;
                    }, {
                        Name: string;
                        Id: string;
                        Type?: string | undefined;
                    }>, "many">>;
                    PlaylistItemId: z.ZodOptional<z.ZodString>;
                    PremiereDate: z.ZodOptional<z.ZodString>;
                    ProductionYear: z.ZodNumber;
                    ProviderIds: z.ZodOptional<z.ZodObject<{
                        MusicBrainzAlbum: z.ZodOptional<z.ZodString>;
                        MusicBrainzAlbumArtist: z.ZodOptional<z.ZodString>;
                        MusicBrainzArtist: z.ZodOptional<z.ZodString>;
                        MusicBrainzRecording: z.ZodOptional<z.ZodString>;
                        MusicBrainzReleaseGroup: z.ZodOptional<z.ZodString>;
                        MusicBrainzTrack: z.ZodOptional<z.ZodString>;
                    }, "strip", z.ZodTypeAny, {
                        MusicBrainzAlbum?: string | undefined;
                        MusicBrainzAlbumArtist?: string | undefined;
                        MusicBrainzArtist?: string | undefined;
                        MusicBrainzRecording?: string | undefined;
                        MusicBrainzReleaseGroup?: string | undefined;
                        MusicBrainzTrack?: string | undefined;
                    }, {
                        MusicBrainzAlbum?: string | undefined;
                        MusicBrainzAlbumArtist?: string | undefined;
                        MusicBrainzArtist?: string | undefined;
                        MusicBrainzRecording?: string | undefined;
                        MusicBrainzReleaseGroup?: string | undefined;
                        MusicBrainzTrack?: string | undefined;
                    }>>;
                    RunTimeTicks: z.ZodNumber;
                    ServerId: z.ZodString;
                    SortName: z.ZodOptional<z.ZodString>;
                    Tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                    Type: z.ZodString;
                    UserData: z.ZodOptional<z.ZodObject<{
                        IsFavorite: z.ZodBoolean;
                        Key: z.ZodString;
                        PlaybackPositionTicks: z.ZodNumber;
                        PlayCount: z.ZodNumber;
                        Played: z.ZodBoolean;
                    }, "strip", z.ZodTypeAny, {
                        PlayCount: number;
                        IsFavorite: boolean;
                        Key: string;
                        PlaybackPositionTicks: number;
                        Played: boolean;
                    }, {
                        PlayCount: number;
                        IsFavorite: boolean;
                        Key: string;
                        PlaybackPositionTicks: number;
                        Played: boolean;
                    }>>;
                }, "strip", z.ZodTypeAny, {
                    Name: string;
                    Genres: string[];
                    Album: string;
                    MediaType: string;
                    Id: string;
                    AlbumArtist: string;
                    AlbumArtists: {
                        Name: string;
                        Id: string;
                    }[];
                    AlbumPrimaryImageTag: string;
                    ArtistItems: {
                        Name: string;
                        Id: string;
                    }[];
                    Artists: string[];
                    ChannelId: null;
                    DateCreated: string;
                    ExternalUrls: {
                        Name: string;
                        Url: string;
                    }[];
                    GenreItems: {
                        Name: string;
                        Id: string;
                    }[];
                    ImageBlurHashes: {
                        Backdrop?: Record<string, string> | undefined;
                        Logo?: Record<string, string> | undefined;
                        Primary?: Record<string, string> | undefined;
                    };
                    ImageTags: {
                        Logo?: string | undefined;
                        Primary?: string | undefined;
                    };
                    IsFolder: boolean;
                    LocationType: string;
                    Type: string;
                    ProductionYear: number;
                    RunTimeTicks: number;
                    ServerId: string;
                    BackdropImageTags: string[];
                    IndexNumber: number;
                    MediaSources: {
                        Name: string;
                        Bitrate: number;
                        Id: string;
                        Type: string;
                        RunTimeTicks: number;
                        Container: string;
                        DefaultAudioStreamIndex: number;
                        ETag: string;
                        Formats: any[];
                        GenPtsInput: boolean;
                        IgnoreDts: boolean;
                        IgnoreIndex: boolean;
                        IsInfiniteStream: boolean;
                        IsRemote: boolean;
                        MediaAttachments: any[];
                        MediaStreams: {
                            Codec: string;
                            Level: number;
                            Type: string;
                            CodecTimeBase: string;
                            Index: number;
                            IsDefault: boolean;
                            IsExternal: boolean;
                            IsForced: boolean;
                            IsInterlaced: boolean;
                            IsTextSubtitleStream: boolean;
                            SupportsExternalStream: boolean;
                            TimeBase: string;
                            AspectRatio?: string | undefined;
                            BitDepth?: number | undefined;
                            BitRate?: number | undefined;
                            ChannelLayout?: string | undefined;
                            Channels?: number | undefined;
                            ColorSpace?: string | undefined;
                            Comment?: string | undefined;
                            DisplayTitle?: string | undefined;
                            Height?: number | undefined;
                            PixelFormat?: string | undefined;
                            Profile?: string | undefined;
                            RealFrameRate?: number | undefined;
                            RefFrames?: number | undefined;
                            SampleRate?: number | undefined;
                            Width?: number | undefined;
                        }[];
                        Path: string;
                        Protocol: string;
                        ReadAtNativeFramerate: boolean;
                        RequiresClosing: boolean;
                        RequiresLooping: boolean;
                        RequiresOpening: boolean;
                        Size: number;
                        SupportsDirectPlay: boolean;
                        SupportsDirectStream: boolean;
                        SupportsProbing: boolean;
                        SupportsTranscoding: boolean;
                        RequiredHttpHeaders?: any;
                    }[];
                    ParentIndexNumber: number;
                    SortName?: string | undefined;
                    ParentId?: string | undefined;
                    Tags?: string[] | undefined;
                    PlaylistItemId?: string | undefined;
                    People?: {
                        Name: string;
                        Id: string;
                        Type?: string | undefined;
                    }[] | undefined;
                    PremiereDate?: string | undefined;
                    ProviderIds?: {
                        MusicBrainzAlbum?: string | undefined;
                        MusicBrainzAlbumArtist?: string | undefined;
                        MusicBrainzArtist?: string | undefined;
                        MusicBrainzRecording?: string | undefined;
                        MusicBrainzReleaseGroup?: string | undefined;
                        MusicBrainzTrack?: string | undefined;
                    } | undefined;
                    AlbumId?: string | undefined;
                    LUFS?: number | undefined;
                    NormalizationGain?: number | undefined;
                    UserData?: {
                        PlayCount: number;
                        IsFavorite: boolean;
                        Key: string;
                        PlaybackPositionTicks: number;
                        Played: boolean;
                    } | undefined;
                }, {
                    Name: string;
                    Genres: string[];
                    Album: string;
                    MediaType: string;
                    Id: string;
                    AlbumArtist: string;
                    AlbumArtists: {
                        Name: string;
                        Id: string;
                    }[];
                    AlbumPrimaryImageTag: string;
                    ArtistItems: {
                        Name: string;
                        Id: string;
                    }[];
                    Artists: string[];
                    ChannelId: null;
                    DateCreated: string;
                    ExternalUrls: {
                        Name: string;
                        Url: string;
                    }[];
                    GenreItems: {
                        Name: string;
                        Id: string;
                    }[];
                    ImageBlurHashes: {
                        Backdrop?: Record<string, string> | undefined;
                        Logo?: Record<string, string> | undefined;
                        Primary?: Record<string, string> | undefined;
                    };
                    ImageTags: {
                        Logo?: string | undefined;
                        Primary?: string | undefined;
                    };
                    IsFolder: boolean;
                    LocationType: string;
                    Type: string;
                    ProductionYear: number;
                    RunTimeTicks: number;
                    ServerId: string;
                    BackdropImageTags: string[];
                    IndexNumber: number;
                    MediaSources: {
                        Name: string;
                        Bitrate: number;
                        Id: string;
                        Type: string;
                        RunTimeTicks: number;
                        Container: string;
                        DefaultAudioStreamIndex: number;
                        ETag: string;
                        Formats: any[];
                        GenPtsInput: boolean;
                        IgnoreDts: boolean;
                        IgnoreIndex: boolean;
                        IsInfiniteStream: boolean;
                        IsRemote: boolean;
                        MediaAttachments: any[];
                        MediaStreams: {
                            Codec: string;
                            Level: number;
                            Type: string;
                            CodecTimeBase: string;
                            Index: number;
                            IsDefault: boolean;
                            IsExternal: boolean;
                            IsForced: boolean;
                            IsInterlaced: boolean;
                            IsTextSubtitleStream: boolean;
                            SupportsExternalStream: boolean;
                            TimeBase: string;
                            AspectRatio?: string | undefined;
                            BitDepth?: number | undefined;
                            BitRate?: number | undefined;
                            ChannelLayout?: string | undefined;
                            Channels?: number | undefined;
                            ColorSpace?: string | undefined;
                            Comment?: string | undefined;
                            DisplayTitle?: string | undefined;
                            Height?: number | undefined;
                            PixelFormat?: string | undefined;
                            Profile?: string | undefined;
                            RealFrameRate?: number | undefined;
                            RefFrames?: number | undefined;
                            SampleRate?: number | undefined;
                            Width?: number | undefined;
                        }[];
                        Path: string;
                        Protocol: string;
                        ReadAtNativeFramerate: boolean;
                        RequiresClosing: boolean;
                        RequiresLooping: boolean;
                        RequiresOpening: boolean;
                        Size: number;
                        SupportsDirectPlay: boolean;
                        SupportsDirectStream: boolean;
                        SupportsProbing: boolean;
                        SupportsTranscoding: boolean;
                        RequiredHttpHeaders?: any;
                    }[];
                    ParentIndexNumber: number;
                    SortName?: string | undefined;
                    ParentId?: string | undefined;
                    Tags?: string[] | undefined;
                    PlaylistItemId?: string | undefined;
                    People?: {
                        Name: string;
                        Id: string;
                        Type?: string | undefined;
                    }[] | undefined;
                    PremiereDate?: string | undefined;
                    ProviderIds?: {
                        MusicBrainzAlbum?: string | undefined;
                        MusicBrainzAlbumArtist?: string | undefined;
                        MusicBrainzArtist?: string | undefined;
                        MusicBrainzRecording?: string | undefined;
                        MusicBrainzReleaseGroup?: string | undefined;
                        MusicBrainzTrack?: string | undefined;
                    } | undefined;
                    AlbumId?: string | undefined;
                    LUFS?: number | undefined;
                    NormalizationGain?: number | undefined;
                    UserData?: {
                        PlayCount: number;
                        IsFavorite: boolean;
                        Key: string;
                        PlaybackPositionTicks: number;
                        Played: boolean;
                    } | undefined;
                }>, "many">;
            }, "strip", z.ZodTypeAny, {
                StartIndex: number;
                TotalRecordCount: number;
                Items: {
                    Name: string;
                    Genres: string[];
                    Album: string;
                    MediaType: string;
                    Id: string;
                    AlbumArtist: string;
                    AlbumArtists: {
                        Name: string;
                        Id: string;
                    }[];
                    AlbumPrimaryImageTag: string;
                    ArtistItems: {
                        Name: string;
                        Id: string;
                    }[];
                    Artists: string[];
                    ChannelId: null;
                    DateCreated: string;
                    ExternalUrls: {
                        Name: string;
                        Url: string;
                    }[];
                    GenreItems: {
                        Name: string;
                        Id: string;
                    }[];
                    ImageBlurHashes: {
                        Backdrop?: Record<string, string> | undefined;
                        Logo?: Record<string, string> | undefined;
                        Primary?: Record<string, string> | undefined;
                    };
                    ImageTags: {
                        Logo?: string | undefined;
                        Primary?: string | undefined;
                    };
                    IsFolder: boolean;
                    LocationType: string;
                    Type: string;
                    ProductionYear: number;
                    RunTimeTicks: number;
                    ServerId: string;
                    BackdropImageTags: string[];
                    IndexNumber: number;
                    MediaSources: {
                        Name: string;
                        Bitrate: number;
                        Id: string;
                        Type: string;
                        RunTimeTicks: number;
                        Container: string;
                        DefaultAudioStreamIndex: number;
                        ETag: string;
                        Formats: any[];
                        GenPtsInput: boolean;
                        IgnoreDts: boolean;
                        IgnoreIndex: boolean;
                        IsInfiniteStream: boolean;
                        IsRemote: boolean;
                        MediaAttachments: any[];
                        MediaStreams: {
                            Codec: string;
                            Level: number;
                            Type: string;
                            CodecTimeBase: string;
                            Index: number;
                            IsDefault: boolean;
                            IsExternal: boolean;
                            IsForced: boolean;
                            IsInterlaced: boolean;
                            IsTextSubtitleStream: boolean;
                            SupportsExternalStream: boolean;
                            TimeBase: string;
                            AspectRatio?: string | undefined;
                            BitDepth?: number | undefined;
                            BitRate?: number | undefined;
                            ChannelLayout?: string | undefined;
                            Channels?: number | undefined;
                            ColorSpace?: string | undefined;
                            Comment?: string | undefined;
                            DisplayTitle?: string | undefined;
                            Height?: number | undefined;
                            PixelFormat?: string | undefined;
                            Profile?: string | undefined;
                            RealFrameRate?: number | undefined;
                            RefFrames?: number | undefined;
                            SampleRate?: number | undefined;
                            Width?: number | undefined;
                        }[];
                        Path: string;
                        Protocol: string;
                        ReadAtNativeFramerate: boolean;
                        RequiresClosing: boolean;
                        RequiresLooping: boolean;
                        RequiresOpening: boolean;
                        Size: number;
                        SupportsDirectPlay: boolean;
                        SupportsDirectStream: boolean;
                        SupportsProbing: boolean;
                        SupportsTranscoding: boolean;
                        RequiredHttpHeaders?: any;
                    }[];
                    ParentIndexNumber: number;
                    SortName?: string | undefined;
                    ParentId?: string | undefined;
                    Tags?: string[] | undefined;
                    PlaylistItemId?: string | undefined;
                    People?: {
                        Name: string;
                        Id: string;
                        Type?: string | undefined;
                    }[] | undefined;
                    PremiereDate?: string | undefined;
                    ProviderIds?: {
                        MusicBrainzAlbum?: string | undefined;
                        MusicBrainzAlbumArtist?: string | undefined;
                        MusicBrainzArtist?: string | undefined;
                        MusicBrainzRecording?: string | undefined;
                        MusicBrainzReleaseGroup?: string | undefined;
                        MusicBrainzTrack?: string | undefined;
                    } | undefined;
                    AlbumId?: string | undefined;
                    LUFS?: number | undefined;
                    NormalizationGain?: number | undefined;
                    UserData?: {
                        PlayCount: number;
                        IsFavorite: boolean;
                        Key: string;
                        PlaybackPositionTicks: number;
                        Played: boolean;
                    } | undefined;
                }[];
            }, {
                StartIndex: number;
                TotalRecordCount: number;
                Items: {
                    Name: string;
                    Genres: string[];
                    Album: string;
                    MediaType: string;
                    Id: string;
                    AlbumArtist: string;
                    AlbumArtists: {
                        Name: string;
                        Id: string;
                    }[];
                    AlbumPrimaryImageTag: string;
                    ArtistItems: {
                        Name: string;
                        Id: string;
                    }[];
                    Artists: string[];
                    ChannelId: null;
                    DateCreated: string;
                    ExternalUrls: {
                        Name: string;
                        Url: string;
                    }[];
                    GenreItems: {
                        Name: string;
                        Id: string;
                    }[];
                    ImageBlurHashes: {
                        Backdrop?: Record<string, string> | undefined;
                        Logo?: Record<string, string> | undefined;
                        Primary?: Record<string, string> | undefined;
                    };
                    ImageTags: {
                        Logo?: string | undefined;
                        Primary?: string | undefined;
                    };
                    IsFolder: boolean;
                    LocationType: string;
                    Type: string;
                    ProductionYear: number;
                    RunTimeTicks: number;
                    ServerId: string;
                    BackdropImageTags: string[];
                    IndexNumber: number;
                    MediaSources: {
                        Name: string;
                        Bitrate: number;
                        Id: string;
                        Type: string;
                        RunTimeTicks: number;
                        Container: string;
                        DefaultAudioStreamIndex: number;
                        ETag: string;
                        Formats: any[];
                        GenPtsInput: boolean;
                        IgnoreDts: boolean;
                        IgnoreIndex: boolean;
                        IsInfiniteStream: boolean;
                        IsRemote: boolean;
                        MediaAttachments: any[];
                        MediaStreams: {
                            Codec: string;
                            Level: number;
                            Type: string;
                            CodecTimeBase: string;
                            Index: number;
                            IsDefault: boolean;
                            IsExternal: boolean;
                            IsForced: boolean;
                            IsInterlaced: boolean;
                            IsTextSubtitleStream: boolean;
                            SupportsExternalStream: boolean;
                            TimeBase: string;
                            AspectRatio?: string | undefined;
                            BitDepth?: number | undefined;
                            BitRate?: number | undefined;
                            ChannelLayout?: string | undefined;
                            Channels?: number | undefined;
                            ColorSpace?: string | undefined;
                            Comment?: string | undefined;
                            DisplayTitle?: string | undefined;
                            Height?: number | undefined;
                            PixelFormat?: string | undefined;
                            Profile?: string | undefined;
                            RealFrameRate?: number | undefined;
                            RefFrames?: number | undefined;
                            SampleRate?: number | undefined;
                            Width?: number | undefined;
                        }[];
                        Path: string;
                        Protocol: string;
                        ReadAtNativeFramerate: boolean;
                        RequiresClosing: boolean;
                        RequiresLooping: boolean;
                        RequiresOpening: boolean;
                        Size: number;
                        SupportsDirectPlay: boolean;
                        SupportsDirectStream: boolean;
                        SupportsProbing: boolean;
                        SupportsTranscoding: boolean;
                        RequiredHttpHeaders?: any;
                    }[];
                    ParentIndexNumber: number;
                    SortName?: string | undefined;
                    ParentId?: string | undefined;
                    Tags?: string[] | undefined;
                    PlaylistItemId?: string | undefined;
                    People?: {
                        Name: string;
                        Id: string;
                        Type?: string | undefined;
                    }[] | undefined;
                    PremiereDate?: string | undefined;
                    ProviderIds?: {
                        MusicBrainzAlbum?: string | undefined;
                        MusicBrainzAlbumArtist?: string | undefined;
                        MusicBrainzArtist?: string | undefined;
                        MusicBrainzRecording?: string | undefined;
                        MusicBrainzReleaseGroup?: string | undefined;
                        MusicBrainzTrack?: string | undefined;
                    } | undefined;
                    AlbumId?: string | undefined;
                    LUFS?: number | undefined;
                    NormalizationGain?: number | undefined;
                    UserData?: {
                        PlayCount: number;
                        IsFavorite: boolean;
                        Key: string;
                        PlaybackPositionTicks: number;
                        Played: boolean;
                    } | undefined;
                }[];
            }>;
            400: z.ZodObject<{
                errors: z.ZodObject<{
                    recursive: z.ZodArray<z.ZodString, "many">;
                }, "strip", z.ZodTypeAny, {
                    recursive: string[];
                }, {
                    recursive: string[];
                }>;
                status: z.ZodNumber;
                title: z.ZodString;
                traceId: z.ZodString;
                type: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                title: string;
                type: string;
                status: number;
                errors: {
                    recursive: string[];
                };
                traceId: string;
            }, {
                title: string;
                type: string;
                status: number;
                errors: {
                    recursive: string[];
                };
                traceId: string;
            }>;
        };
    };
    getPlayQueue: {
        method: "GET";
        query: z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
        path: "sessions";
        responses: {
            200: z.ZodArray<z.ZodObject<{
                AdditionalUsers: z.ZodArray<z.ZodAny, "many">;
                ApplicationVersion: z.ZodString;
                Capabilities: z.ZodObject<{
                    PlayableMediaTypes: z.ZodArray<z.ZodAny, "many">;
                    SupportedCommands: z.ZodArray<z.ZodAny, "many">;
                    SupportsContentUploading: z.ZodBoolean;
                    SupportsMediaControl: z.ZodBoolean;
                    SupportsPersistentIdentifier: z.ZodBoolean;
                    SupportsSync: z.ZodBoolean;
                }, "strip", z.ZodTypeAny, {
                    PlayableMediaTypes: any[];
                    SupportedCommands: any[];
                    SupportsContentUploading: boolean;
                    SupportsMediaControl: boolean;
                    SupportsPersistentIdentifier: boolean;
                    SupportsSync: boolean;
                }, {
                    PlayableMediaTypes: any[];
                    SupportedCommands: any[];
                    SupportsContentUploading: boolean;
                    SupportsMediaControl: boolean;
                    SupportsPersistentIdentifier: boolean;
                    SupportsSync: boolean;
                }>;
                Client: z.ZodString;
                DeviceId: z.ZodString;
                DeviceName: z.ZodString;
                HasCustomDeviceName: z.ZodBoolean;
                Id: z.ZodString;
                IsActive: z.ZodBoolean;
                LastActivityDate: z.ZodString;
                LastPlaybackCheckIn: z.ZodString;
                NowPlayingQueue: z.ZodArray<z.ZodAny, "many">;
                NowPlayingQueueFullItems: z.ZodArray<z.ZodAny, "many">;
                PlayableMediaTypes: z.ZodArray<z.ZodAny, "many">;
                PlayState: z.ZodObject<{
                    CanSeek: z.ZodBoolean;
                    IsMuted: z.ZodBoolean;
                    IsPaused: z.ZodBoolean;
                    PositionTicks: z.ZodOptional<z.ZodNumber>;
                    RepeatMode: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    IsPaused: boolean;
                    CanSeek: boolean;
                    IsMuted: boolean;
                    RepeatMode: string;
                    PositionTicks?: number | undefined;
                }, {
                    IsPaused: boolean;
                    CanSeek: boolean;
                    IsMuted: boolean;
                    RepeatMode: string;
                    PositionTicks?: number | undefined;
                }>;
                RemoteEndPoint: z.ZodString;
                ServerId: z.ZodString;
                SupportedCommands: z.ZodArray<z.ZodAny, "many">;
                SupportsMediaControl: z.ZodBoolean;
                SupportsRemoteControl: z.ZodBoolean;
                UserId: z.ZodString;
                UserName: z.ZodString;
            } & {
                PlaylistItemId: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                UserId: string;
                Id: string;
                NowPlayingQueue: any[];
                ServerId: string;
                AdditionalUsers: any[];
                ApplicationVersion: string;
                Capabilities: {
                    PlayableMediaTypes: any[];
                    SupportedCommands: any[];
                    SupportsContentUploading: boolean;
                    SupportsMediaControl: boolean;
                    SupportsPersistentIdentifier: boolean;
                    SupportsSync: boolean;
                };
                PlayableMediaTypes: any[];
                SupportedCommands: any[];
                SupportsMediaControl: boolean;
                Client: string;
                DeviceId: string;
                DeviceName: string;
                HasCustomDeviceName: boolean;
                IsActive: boolean;
                LastActivityDate: string;
                LastPlaybackCheckIn: string;
                NowPlayingQueueFullItems: any[];
                PlayState: {
                    IsPaused: boolean;
                    CanSeek: boolean;
                    IsMuted: boolean;
                    RepeatMode: string;
                    PositionTicks?: number | undefined;
                };
                RemoteEndPoint: string;
                SupportsRemoteControl: boolean;
                UserName: string;
                PlaylistItemId?: string | undefined;
            }, {
                UserId: string;
                Id: string;
                NowPlayingQueue: any[];
                ServerId: string;
                AdditionalUsers: any[];
                ApplicationVersion: string;
                Capabilities: {
                    PlayableMediaTypes: any[];
                    SupportedCommands: any[];
                    SupportsContentUploading: boolean;
                    SupportsMediaControl: boolean;
                    SupportsPersistentIdentifier: boolean;
                    SupportsSync: boolean;
                };
                PlayableMediaTypes: any[];
                SupportedCommands: any[];
                SupportsMediaControl: boolean;
                Client: string;
                DeviceId: string;
                DeviceName: string;
                HasCustomDeviceName: boolean;
                IsActive: boolean;
                LastActivityDate: string;
                LastPlaybackCheckIn: string;
                NowPlayingQueueFullItems: any[];
                PlayState: {
                    IsPaused: boolean;
                    CanSeek: boolean;
                    IsMuted: boolean;
                    RepeatMode: string;
                    PositionTicks?: number | undefined;
                };
                RemoteEndPoint: string;
                SupportsRemoteControl: boolean;
                UserName: string;
                PlaylistItemId?: string | undefined;
            }>, "many">;
            400: z.ZodObject<{
                errors: z.ZodObject<{
                    recursive: z.ZodArray<z.ZodString, "many">;
                }, "strip", z.ZodTypeAny, {
                    recursive: string[];
                }, {
                    recursive: string[];
                }>;
                status: z.ZodNumber;
                title: z.ZodString;
                traceId: z.ZodString;
                type: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                title: string;
                type: string;
                status: number;
                errors: {
                    recursive: string[];
                };
                traceId: string;
            }, {
                title: string;
                type: string;
                status: number;
                errors: {
                    recursive: string[];
                };
                traceId: string;
            }>;
        };
    };
    getServerInfo: {
        method: "GET";
        path: "system/info";
        responses: {
            200: z.ZodObject<{
                Version: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                Version: string;
            }, {
                Version: string;
            }>;
            400: z.ZodObject<{
                errors: z.ZodObject<{
                    recursive: z.ZodArray<z.ZodString, "many">;
                }, "strip", z.ZodTypeAny, {
                    recursive: string[];
                }, {
                    recursive: string[];
                }>;
                status: z.ZodNumber;
                title: z.ZodString;
                traceId: z.ZodString;
                type: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                title: string;
                type: string;
                status: number;
                errors: {
                    recursive: string[];
                };
                traceId: string;
            }, {
                title: string;
                type: string;
                status: number;
                errors: {
                    recursive: string[];
                };
                traceId: string;
            }>;
        };
    };
    getSimilarArtistList: {
        method: "GET";
        query: z.ZodObject<{
            AlbumArtistIds: z.ZodOptional<z.ZodString>;
            ArtistIds: z.ZodOptional<z.ZodString>;
            ContributingArtistIds: z.ZodOptional<z.ZodString>;
            EnableImageTypes: z.ZodOptional<z.ZodString>;
            EnableTotalRecordCount: z.ZodOptional<z.ZodBoolean>;
            EnableUserData: z.ZodOptional<z.ZodBoolean>;
            EnableUserDataTypes: z.ZodOptional<z.ZodBoolean>;
            ExcludeArtistIds: z.ZodOptional<z.ZodString>;
            ExcludeItemIds: z.ZodOptional<z.ZodString>;
            ExcludeItemTypes: z.ZodOptional<z.ZodString>;
            Fields: z.ZodOptional<z.ZodReadonly<z.ZodArray<z.ZodString, "many">>>;
            FolderId: z.ZodOptional<z.ZodString>;
            ImageTypeLimit: z.ZodOptional<z.ZodNumber>;
            IncludeArtists: z.ZodOptional<z.ZodBoolean>;
            IncludeGenres: z.ZodOptional<z.ZodBoolean>;
            IncludeItemTypes: z.ZodOptional<z.ZodString>;
            IncludeMedia: z.ZodOptional<z.ZodBoolean>;
            IncludePeople: z.ZodOptional<z.ZodBoolean>;
            IncludeStudios: z.ZodOptional<z.ZodBoolean>;
            IsFavorite: z.ZodOptional<z.ZodBoolean>;
            MediaTypes: z.ZodOptional<z.ZodString>;
            NameStartsWith: z.ZodOptional<z.ZodString>;
            ParentId: z.ZodOptional<z.ZodString>;
            Recursive: z.ZodOptional<z.ZodBoolean>;
            SearchTerm: z.ZodOptional<z.ZodString>;
            SortBy: z.ZodOptional<z.ZodString>;
            SortOrder: z.ZodOptional<z.ZodEnum<["Ascending", "Descending"]>>;
            StartIndex: z.ZodOptional<z.ZodNumber>;
            Tags: z.ZodOptional<z.ZodString>;
            UserId: z.ZodOptional<z.ZodString>;
            Years: z.ZodOptional<z.ZodString>;
        } & {
            Limit: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            Limit?: number | undefined;
            UserId?: string | undefined;
            AlbumArtistIds?: string | undefined;
            ArtistIds?: string | undefined;
            ContributingArtistIds?: string | undefined;
            EnableImageTypes?: string | undefined;
            EnableTotalRecordCount?: boolean | undefined;
            EnableUserData?: boolean | undefined;
            EnableUserDataTypes?: boolean | undefined;
            ExcludeArtistIds?: string | undefined;
            ExcludeItemIds?: string | undefined;
            ExcludeItemTypes?: string | undefined;
            Fields?: readonly string[] | undefined;
            FolderId?: string | undefined;
            ImageTypeLimit?: number | undefined;
            IncludeArtists?: boolean | undefined;
            IncludeGenres?: boolean | undefined;
            IncludeItemTypes?: string | undefined;
            IncludeMedia?: boolean | undefined;
            IncludePeople?: boolean | undefined;
            IncludeStudios?: boolean | undefined;
            IsFavorite?: boolean | undefined;
            MediaTypes?: string | undefined;
            NameStartsWith?: string | undefined;
            ParentId?: string | undefined;
            Recursive?: boolean | undefined;
            SearchTerm?: string | undefined;
            SortBy?: string | undefined;
            SortOrder?: "Ascending" | "Descending" | undefined;
            StartIndex?: number | undefined;
            Tags?: string | undefined;
            Years?: string | undefined;
        }, {
            Limit?: number | undefined;
            UserId?: string | undefined;
            AlbumArtistIds?: string | undefined;
            ArtistIds?: string | undefined;
            ContributingArtistIds?: string | undefined;
            EnableImageTypes?: string | undefined;
            EnableTotalRecordCount?: boolean | undefined;
            EnableUserData?: boolean | undefined;
            EnableUserDataTypes?: boolean | undefined;
            ExcludeArtistIds?: string | undefined;
            ExcludeItemIds?: string | undefined;
            ExcludeItemTypes?: string | undefined;
            Fields?: readonly string[] | undefined;
            FolderId?: string | undefined;
            ImageTypeLimit?: number | undefined;
            IncludeArtists?: boolean | undefined;
            IncludeGenres?: boolean | undefined;
            IncludeItemTypes?: string | undefined;
            IncludeMedia?: boolean | undefined;
            IncludePeople?: boolean | undefined;
            IncludeStudios?: boolean | undefined;
            IsFavorite?: boolean | undefined;
            MediaTypes?: string | undefined;
            NameStartsWith?: string | undefined;
            ParentId?: string | undefined;
            Recursive?: boolean | undefined;
            SearchTerm?: string | undefined;
            SortBy?: string | undefined;
            SortOrder?: "Ascending" | "Descending" | undefined;
            StartIndex?: number | undefined;
            Tags?: string | undefined;
            Years?: string | undefined;
        }>;
        path: "artists/:id/similar";
        responses: {
            200: z.ZodObject<{
                StartIndex: z.ZodNumber;
                TotalRecordCount: z.ZodNumber;
            } & {
                Items: z.ZodArray<z.ZodObject<{
                    AlbumCount: z.ZodOptional<z.ZodNumber>;
                    BackdropImageTags: z.ZodArray<z.ZodString, "many">;
                    ChannelId: z.ZodNull;
                    DateCreated: z.ZodString;
                    ExternalUrls: z.ZodArray<z.ZodObject<{
                        Name: z.ZodString;
                        Url: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        Name: string;
                        Url: string;
                    }, {
                        Name: string;
                        Url: string;
                    }>, "many">;
                    GenreItems: z.ZodArray<z.ZodObject<{
                        Id: z.ZodString;
                        Name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        Name: string;
                        Id: string;
                    }, {
                        Name: string;
                        Id: string;
                    }>, "many">;
                    Genres: z.ZodArray<z.ZodString, "many">;
                    Id: z.ZodString;
                    ImageBlurHashes: z.ZodObject<{
                        Backdrop: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
                        Logo: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
                        Primary: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
                    }, "strip", z.ZodTypeAny, {
                        Backdrop?: Record<string, string> | undefined;
                        Logo?: Record<string, string> | undefined;
                        Primary?: Record<string, string> | undefined;
                    }, {
                        Backdrop?: Record<string, string> | undefined;
                        Logo?: Record<string, string> | undefined;
                        Primary?: Record<string, string> | undefined;
                    }>;
                    ImageTags: z.ZodObject<{
                        Logo: z.ZodOptional<z.ZodString>;
                        Primary: z.ZodOptional<z.ZodString>;
                    }, "strip", z.ZodTypeAny, {
                        Logo?: string | undefined;
                        Primary?: string | undefined;
                    }, {
                        Logo?: string | undefined;
                        Primary?: string | undefined;
                    }>;
                    LocationType: z.ZodString;
                    Name: z.ZodString;
                    Overview: z.ZodString;
                    ProviderIds: z.ZodOptional<z.ZodObject<{
                        MusicBrainzAlbum: z.ZodOptional<z.ZodString>;
                        MusicBrainzAlbumArtist: z.ZodOptional<z.ZodString>;
                        MusicBrainzArtist: z.ZodOptional<z.ZodString>;
                        MusicBrainzRecording: z.ZodOptional<z.ZodString>;
                        MusicBrainzReleaseGroup: z.ZodOptional<z.ZodString>;
                        MusicBrainzTrack: z.ZodOptional<z.ZodString>;
                    }, "strip", z.ZodTypeAny, {
                        MusicBrainzAlbum?: string | undefined;
                        MusicBrainzAlbumArtist?: string | undefined;
                        MusicBrainzArtist?: string | undefined;
                        MusicBrainzRecording?: string | undefined;
                        MusicBrainzReleaseGroup?: string | undefined;
                        MusicBrainzTrack?: string | undefined;
                    }, {
                        MusicBrainzAlbum?: string | undefined;
                        MusicBrainzAlbumArtist?: string | undefined;
                        MusicBrainzArtist?: string | undefined;
                        MusicBrainzRecording?: string | undefined;
                        MusicBrainzReleaseGroup?: string | undefined;
                        MusicBrainzTrack?: string | undefined;
                    }>>;
                    RunTimeTicks: z.ZodNumber;
                    ServerId: z.ZodString;
                    SongCount: z.ZodOptional<z.ZodNumber>;
                    Type: z.ZodString;
                    UserData: z.ZodOptional<z.ZodObject<{
                        IsFavorite: z.ZodBoolean;
                        Key: z.ZodString;
                        PlaybackPositionTicks: z.ZodNumber;
                        PlayCount: z.ZodNumber;
                        Played: z.ZodBoolean;
                    }, "strip", z.ZodTypeAny, {
                        PlayCount: number;
                        IsFavorite: boolean;
                        Key: string;
                        PlaybackPositionTicks: number;
                        Played: boolean;
                    }, {
                        PlayCount: number;
                        IsFavorite: boolean;
                        Key: string;
                        PlaybackPositionTicks: number;
                        Played: boolean;
                    }>>;
                }, "strip", z.ZodTypeAny, {
                    Name: string;
                    Genres: string[];
                    Id: string;
                    ChannelId: null;
                    DateCreated: string;
                    ExternalUrls: {
                        Name: string;
                        Url: string;
                    }[];
                    GenreItems: {
                        Name: string;
                        Id: string;
                    }[];
                    ImageBlurHashes: {
                        Backdrop?: Record<string, string> | undefined;
                        Logo?: Record<string, string> | undefined;
                        Primary?: Record<string, string> | undefined;
                    };
                    ImageTags: {
                        Logo?: string | undefined;
                        Primary?: string | undefined;
                    };
                    LocationType: string;
                    Type: string;
                    RunTimeTicks: number;
                    ServerId: string;
                    BackdropImageTags: string[];
                    Overview: string;
                    ProviderIds?: {
                        MusicBrainzAlbum?: string | undefined;
                        MusicBrainzAlbumArtist?: string | undefined;
                        MusicBrainzArtist?: string | undefined;
                        MusicBrainzRecording?: string | undefined;
                        MusicBrainzReleaseGroup?: string | undefined;
                        MusicBrainzTrack?: string | undefined;
                    } | undefined;
                    UserData?: {
                        PlayCount: number;
                        IsFavorite: boolean;
                        Key: string;
                        PlaybackPositionTicks: number;
                        Played: boolean;
                    } | undefined;
                    AlbumCount?: number | undefined;
                    SongCount?: number | undefined;
                }, {
                    Name: string;
                    Genres: string[];
                    Id: string;
                    ChannelId: null;
                    DateCreated: string;
                    ExternalUrls: {
                        Name: string;
                        Url: string;
                    }[];
                    GenreItems: {
                        Name: string;
                        Id: string;
                    }[];
                    ImageBlurHashes: {
                        Backdrop?: Record<string, string> | undefined;
                        Logo?: Record<string, string> | undefined;
                        Primary?: Record<string, string> | undefined;
                    };
                    ImageTags: {
                        Logo?: string | undefined;
                        Primary?: string | undefined;
                    };
                    LocationType: string;
                    Type: string;
                    RunTimeTicks: number;
                    ServerId: string;
                    BackdropImageTags: string[];
                    Overview: string;
                    ProviderIds?: {
                        MusicBrainzAlbum?: string | undefined;
                        MusicBrainzAlbumArtist?: string | undefined;
                        MusicBrainzArtist?: string | undefined;
                        MusicBrainzRecording?: string | undefined;
                        MusicBrainzReleaseGroup?: string | undefined;
                        MusicBrainzTrack?: string | undefined;
                    } | undefined;
                    UserData?: {
                        PlayCount: number;
                        IsFavorite: boolean;
                        Key: string;
                        PlaybackPositionTicks: number;
                        Played: boolean;
                    } | undefined;
                    AlbumCount?: number | undefined;
                    SongCount?: number | undefined;
                }>, "many">;
            }, "strip", z.ZodTypeAny, {
                StartIndex: number;
                TotalRecordCount: number;
                Items: {
                    Name: string;
                    Genres: string[];
                    Id: string;
                    ChannelId: null;
                    DateCreated: string;
                    ExternalUrls: {
                        Name: string;
                        Url: string;
                    }[];
                    GenreItems: {
                        Name: string;
                        Id: string;
                    }[];
                    ImageBlurHashes: {
                        Backdrop?: Record<string, string> | undefined;
                        Logo?: Record<string, string> | undefined;
                        Primary?: Record<string, string> | undefined;
                    };
                    ImageTags: {
                        Logo?: string | undefined;
                        Primary?: string | undefined;
                    };
                    LocationType: string;
                    Type: string;
                    RunTimeTicks: number;
                    ServerId: string;
                    BackdropImageTags: string[];
                    Overview: string;
                    ProviderIds?: {
                        MusicBrainzAlbum?: string | undefined;
                        MusicBrainzAlbumArtist?: string | undefined;
                        MusicBrainzArtist?: string | undefined;
                        MusicBrainzRecording?: string | undefined;
                        MusicBrainzReleaseGroup?: string | undefined;
                        MusicBrainzTrack?: string | undefined;
                    } | undefined;
                    UserData?: {
                        PlayCount: number;
                        IsFavorite: boolean;
                        Key: string;
                        PlaybackPositionTicks: number;
                        Played: boolean;
                    } | undefined;
                    AlbumCount?: number | undefined;
                    SongCount?: number | undefined;
                }[];
            }, {
                StartIndex: number;
                TotalRecordCount: number;
                Items: {
                    Name: string;
                    Genres: string[];
                    Id: string;
                    ChannelId: null;
                    DateCreated: string;
                    ExternalUrls: {
                        Name: string;
                        Url: string;
                    }[];
                    GenreItems: {
                        Name: string;
                        Id: string;
                    }[];
                    ImageBlurHashes: {
                        Backdrop?: Record<string, string> | undefined;
                        Logo?: Record<string, string> | undefined;
                        Primary?: Record<string, string> | undefined;
                    };
                    ImageTags: {
                        Logo?: string | undefined;
                        Primary?: string | undefined;
                    };
                    LocationType: string;
                    Type: string;
                    RunTimeTicks: number;
                    ServerId: string;
                    BackdropImageTags: string[];
                    Overview: string;
                    ProviderIds?: {
                        MusicBrainzAlbum?: string | undefined;
                        MusicBrainzAlbumArtist?: string | undefined;
                        MusicBrainzArtist?: string | undefined;
                        MusicBrainzRecording?: string | undefined;
                        MusicBrainzReleaseGroup?: string | undefined;
                        MusicBrainzTrack?: string | undefined;
                    } | undefined;
                    UserData?: {
                        PlayCount: number;
                        IsFavorite: boolean;
                        Key: string;
                        PlaybackPositionTicks: number;
                        Played: boolean;
                    } | undefined;
                    AlbumCount?: number | undefined;
                    SongCount?: number | undefined;
                }[];
            }>;
            400: z.ZodObject<{
                errors: z.ZodObject<{
                    recursive: z.ZodArray<z.ZodString, "many">;
                }, "strip", z.ZodTypeAny, {
                    recursive: string[];
                }, {
                    recursive: string[];
                }>;
                status: z.ZodNumber;
                title: z.ZodString;
                traceId: z.ZodString;
                type: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                title: string;
                type: string;
                status: number;
                errors: {
                    recursive: string[];
                };
                traceId: string;
            }, {
                title: string;
                type: string;
                status: number;
                errors: {
                    recursive: string[];
                };
                traceId: string;
            }>;
        };
    };
    getSimilarSongs: {
        method: "GET";
        query: z.ZodObject<{
            Fields: z.ZodOptional<z.ZodReadonly<z.ZodArray<z.ZodString, "many">>>;
            Limit: z.ZodOptional<z.ZodNumber>;
            UserId: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            Limit?: number | undefined;
            UserId?: string | undefined;
            Fields?: readonly string[] | undefined;
        }, {
            Limit?: number | undefined;
            UserId?: string | undefined;
            Fields?: readonly string[] | undefined;
        }>;
        path: "items/:itemId/similar";
        responses: {
            200: z.ZodObject<{
                StartIndex: z.ZodNumber;
                TotalRecordCount: z.ZodNumber;
            } & {
                Items: z.ZodArray<z.ZodObject<{
                    Album: z.ZodString;
                    AlbumArtist: z.ZodString;
                    AlbumArtists: z.ZodArray<z.ZodObject<{
                        Id: z.ZodString;
                        Name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        Name: string;
                        Id: string;
                    }, {
                        Name: string;
                        Id: string;
                    }>, "many">;
                    AlbumId: z.ZodOptional<z.ZodString>;
                    AlbumPrimaryImageTag: z.ZodString;
                    ArtistItems: z.ZodArray<z.ZodObject<{
                        Id: z.ZodString;
                        Name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        Name: string;
                        Id: string;
                    }, {
                        Name: string;
                        Id: string;
                    }>, "many">;
                    Artists: z.ZodArray<z.ZodString, "many">;
                    BackdropImageTags: z.ZodArray<z.ZodString, "many">;
                    ChannelId: z.ZodNull;
                    DateCreated: z.ZodString;
                    ExternalUrls: z.ZodArray<z.ZodObject<{
                        Name: z.ZodString;
                        Url: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        Name: string;
                        Url: string;
                    }, {
                        Name: string;
                        Url: string;
                    }>, "many">;
                    GenreItems: z.ZodArray<z.ZodObject<{
                        Id: z.ZodString;
                        Name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        Name: string;
                        Id: string;
                    }, {
                        Name: string;
                        Id: string;
                    }>, "many">;
                    Genres: z.ZodArray<z.ZodString, "many">;
                    Id: z.ZodString;
                    ImageBlurHashes: z.ZodObject<{
                        Backdrop: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
                        Logo: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
                        Primary: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
                    }, "strip", z.ZodTypeAny, {
                        Backdrop?: Record<string, string> | undefined;
                        Logo?: Record<string, string> | undefined;
                        Primary?: Record<string, string> | undefined;
                    }, {
                        Backdrop?: Record<string, string> | undefined;
                        Logo?: Record<string, string> | undefined;
                        Primary?: Record<string, string> | undefined;
                    }>;
                    ImageTags: z.ZodObject<{
                        Logo: z.ZodOptional<z.ZodString>;
                        Primary: z.ZodOptional<z.ZodString>;
                    }, "strip", z.ZodTypeAny, {
                        Logo?: string | undefined;
                        Primary?: string | undefined;
                    }, {
                        Logo?: string | undefined;
                        Primary?: string | undefined;
                    }>;
                    IndexNumber: z.ZodNumber;
                    IsFolder: z.ZodBoolean;
                    LocationType: z.ZodString;
                    LUFS: z.ZodOptional<z.ZodNumber>;
                    MediaSources: z.ZodArray<z.ZodObject<{
                        Bitrate: z.ZodNumber;
                        Container: z.ZodString;
                        DefaultAudioStreamIndex: z.ZodNumber;
                        ETag: z.ZodString;
                        Formats: z.ZodArray<z.ZodAny, "many">;
                        GenPtsInput: z.ZodBoolean;
                        Id: z.ZodString;
                        IgnoreDts: z.ZodBoolean;
                        IgnoreIndex: z.ZodBoolean;
                        IsInfiniteStream: z.ZodBoolean;
                        IsRemote: z.ZodBoolean;
                        MediaAttachments: z.ZodArray<z.ZodAny, "many">;
                        MediaStreams: z.ZodArray<z.ZodObject<{
                            AspectRatio: z.ZodOptional<z.ZodString>;
                            BitDepth: z.ZodOptional<z.ZodNumber>;
                            BitRate: z.ZodOptional<z.ZodNumber>;
                            ChannelLayout: z.ZodOptional<z.ZodString>;
                            Channels: z.ZodOptional<z.ZodNumber>;
                            Codec: z.ZodString;
                            CodecTimeBase: z.ZodString;
                            ColorSpace: z.ZodOptional<z.ZodString>;
                            Comment: z.ZodOptional<z.ZodString>;
                            DisplayTitle: z.ZodOptional<z.ZodString>;
                            Height: z.ZodOptional<z.ZodNumber>;
                            Index: z.ZodNumber;
                            IsDefault: z.ZodBoolean;
                            IsExternal: z.ZodBoolean;
                            IsForced: z.ZodBoolean;
                            IsInterlaced: z.ZodBoolean;
                            IsTextSubtitleStream: z.ZodBoolean;
                            Level: z.ZodNumber;
                            PixelFormat: z.ZodOptional<z.ZodString>;
                            Profile: z.ZodOptional<z.ZodString>;
                            RealFrameRate: z.ZodOptional<z.ZodNumber>;
                            RefFrames: z.ZodOptional<z.ZodNumber>;
                            SampleRate: z.ZodOptional<z.ZodNumber>;
                            SupportsExternalStream: z.ZodBoolean;
                            TimeBase: z.ZodString;
                            Type: z.ZodString;
                            Width: z.ZodOptional<z.ZodNumber>;
                        }, "strip", z.ZodTypeAny, {
                            Codec: string;
                            Level: number;
                            Type: string;
                            CodecTimeBase: string;
                            Index: number;
                            IsDefault: boolean;
                            IsExternal: boolean;
                            IsForced: boolean;
                            IsInterlaced: boolean;
                            IsTextSubtitleStream: boolean;
                            SupportsExternalStream: boolean;
                            TimeBase: string;
                            AspectRatio?: string | undefined;
                            BitDepth?: number | undefined;
                            BitRate?: number | undefined;
                            ChannelLayout?: string | undefined;
                            Channels?: number | undefined;
                            ColorSpace?: string | undefined;
                            Comment?: string | undefined;
                            DisplayTitle?: string | undefined;
                            Height?: number | undefined;
                            PixelFormat?: string | undefined;
                            Profile?: string | undefined;
                            RealFrameRate?: number | undefined;
                            RefFrames?: number | undefined;
                            SampleRate?: number | undefined;
                            Width?: number | undefined;
                        }, {
                            Codec: string;
                            Level: number;
                            Type: string;
                            CodecTimeBase: string;
                            Index: number;
                            IsDefault: boolean;
                            IsExternal: boolean;
                            IsForced: boolean;
                            IsInterlaced: boolean;
                            IsTextSubtitleStream: boolean;
                            SupportsExternalStream: boolean;
                            TimeBase: string;
                            AspectRatio?: string | undefined;
                            BitDepth?: number | undefined;
                            BitRate?: number | undefined;
                            ChannelLayout?: string | undefined;
                            Channels?: number | undefined;
                            ColorSpace?: string | undefined;
                            Comment?: string | undefined;
                            DisplayTitle?: string | undefined;
                            Height?: number | undefined;
                            PixelFormat?: string | undefined;
                            Profile?: string | undefined;
                            RealFrameRate?: number | undefined;
                            RefFrames?: number | undefined;
                            SampleRate?: number | undefined;
                            Width?: number | undefined;
                        }>, "many">;
                        Name: z.ZodString;
                        Path: z.ZodString;
                        Protocol: z.ZodString;
                        ReadAtNativeFramerate: z.ZodBoolean;
                        RequiredHttpHeaders: z.ZodAny;
                        RequiresClosing: z.ZodBoolean;
                        RequiresLooping: z.ZodBoolean;
                        RequiresOpening: z.ZodBoolean;
                        RunTimeTicks: z.ZodNumber;
                        Size: z.ZodNumber;
                        SupportsDirectPlay: z.ZodBoolean;
                        SupportsDirectStream: z.ZodBoolean;
                        SupportsProbing: z.ZodBoolean;
                        SupportsTranscoding: z.ZodBoolean;
                        Type: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        Name: string;
                        Bitrate: number;
                        Id: string;
                        Type: string;
                        RunTimeTicks: number;
                        Container: string;
                        DefaultAudioStreamIndex: number;
                        ETag: string;
                        Formats: any[];
                        GenPtsInput: boolean;
                        IgnoreDts: boolean;
                        IgnoreIndex: boolean;
                        IsInfiniteStream: boolean;
                        IsRemote: boolean;
                        MediaAttachments: any[];
                        MediaStreams: {
                            Codec: string;
                            Level: number;
                            Type: string;
                            CodecTimeBase: string;
                            Index: number;
                            IsDefault: boolean;
                            IsExternal: boolean;
                            IsForced: boolean;
                            IsInterlaced: boolean;
                            IsTextSubtitleStream: boolean;
                            SupportsExternalStream: boolean;
                            TimeBase: string;
                            AspectRatio?: string | undefined;
                            BitDepth?: number | undefined;
                            BitRate?: number | undefined;
                            ChannelLayout?: string | undefined;
                            Channels?: number | undefined;
                            ColorSpace?: string | undefined;
                            Comment?: string | undefined;
                            DisplayTitle?: string | undefined;
                            Height?: number | undefined;
                            PixelFormat?: string | undefined;
                            Profile?: string | undefined;
                            RealFrameRate?: number | undefined;
                            RefFrames?: number | undefined;
                            SampleRate?: number | undefined;
                            Width?: number | undefined;
                        }[];
                        Path: string;
                        Protocol: string;
                        ReadAtNativeFramerate: boolean;
                        RequiresClosing: boolean;
                        RequiresLooping: boolean;
                        RequiresOpening: boolean;
                        Size: number;
                        SupportsDirectPlay: boolean;
                        SupportsDirectStream: boolean;
                        SupportsProbing: boolean;
                        SupportsTranscoding: boolean;
                        RequiredHttpHeaders?: any;
                    }, {
                        Name: string;
                        Bitrate: number;
                        Id: string;
                        Type: string;
                        RunTimeTicks: number;
                        Container: string;
                        DefaultAudioStreamIndex: number;
                        ETag: string;
                        Formats: any[];
                        GenPtsInput: boolean;
                        IgnoreDts: boolean;
                        IgnoreIndex: boolean;
                        IsInfiniteStream: boolean;
                        IsRemote: boolean;
                        MediaAttachments: any[];
                        MediaStreams: {
                            Codec: string;
                            Level: number;
                            Type: string;
                            CodecTimeBase: string;
                            Index: number;
                            IsDefault: boolean;
                            IsExternal: boolean;
                            IsForced: boolean;
                            IsInterlaced: boolean;
                            IsTextSubtitleStream: boolean;
                            SupportsExternalStream: boolean;
                            TimeBase: string;
                            AspectRatio?: string | undefined;
                            BitDepth?: number | undefined;
                            BitRate?: number | undefined;
                            ChannelLayout?: string | undefined;
                            Channels?: number | undefined;
                            ColorSpace?: string | undefined;
                            Comment?: string | undefined;
                            DisplayTitle?: string | undefined;
                            Height?: number | undefined;
                            PixelFormat?: string | undefined;
                            Profile?: string | undefined;
                            RealFrameRate?: number | undefined;
                            RefFrames?: number | undefined;
                            SampleRate?: number | undefined;
                            Width?: number | undefined;
                        }[];
                        Path: string;
                        Protocol: string;
                        ReadAtNativeFramerate: boolean;
                        RequiresClosing: boolean;
                        RequiresLooping: boolean;
                        RequiresOpening: boolean;
                        Size: number;
                        SupportsDirectPlay: boolean;
                        SupportsDirectStream: boolean;
                        SupportsProbing: boolean;
                        SupportsTranscoding: boolean;
                        RequiredHttpHeaders?: any;
                    }>, "many">;
                    MediaType: z.ZodString;
                    Name: z.ZodString;
                    NormalizationGain: z.ZodOptional<z.ZodNumber>;
                    ParentId: z.ZodOptional<z.ZodString>;
                    ParentIndexNumber: z.ZodNumber;
                    People: z.ZodOptional<z.ZodArray<z.ZodObject<{
                        Id: z.ZodString;
                        Name: z.ZodString;
                        Type: z.ZodOptional<z.ZodString>;
                    }, "strip", z.ZodTypeAny, {
                        Name: string;
                        Id: string;
                        Type?: string | undefined;
                    }, {
                        Name: string;
                        Id: string;
                        Type?: string | undefined;
                    }>, "many">>;
                    PlaylistItemId: z.ZodOptional<z.ZodString>;
                    PremiereDate: z.ZodOptional<z.ZodString>;
                    ProductionYear: z.ZodNumber;
                    ProviderIds: z.ZodOptional<z.ZodObject<{
                        MusicBrainzAlbum: z.ZodOptional<z.ZodString>;
                        MusicBrainzAlbumArtist: z.ZodOptional<z.ZodString>;
                        MusicBrainzArtist: z.ZodOptional<z.ZodString>;
                        MusicBrainzRecording: z.ZodOptional<z.ZodString>;
                        MusicBrainzReleaseGroup: z.ZodOptional<z.ZodString>;
                        MusicBrainzTrack: z.ZodOptional<z.ZodString>;
                    }, "strip", z.ZodTypeAny, {
                        MusicBrainzAlbum?: string | undefined;
                        MusicBrainzAlbumArtist?: string | undefined;
                        MusicBrainzArtist?: string | undefined;
                        MusicBrainzRecording?: string | undefined;
                        MusicBrainzReleaseGroup?: string | undefined;
                        MusicBrainzTrack?: string | undefined;
                    }, {
                        MusicBrainzAlbum?: string | undefined;
                        MusicBrainzAlbumArtist?: string | undefined;
                        MusicBrainzArtist?: string | undefined;
                        MusicBrainzRecording?: string | undefined;
                        MusicBrainzReleaseGroup?: string | undefined;
                        MusicBrainzTrack?: string | undefined;
                    }>>;
                    RunTimeTicks: z.ZodNumber;
                    ServerId: z.ZodString;
                    SortName: z.ZodOptional<z.ZodString>;
                    Tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                    Type: z.ZodString;
                    UserData: z.ZodOptional<z.ZodObject<{
                        IsFavorite: z.ZodBoolean;
                        Key: z.ZodString;
                        PlaybackPositionTicks: z.ZodNumber;
                        PlayCount: z.ZodNumber;
                        Played: z.ZodBoolean;
                    }, "strip", z.ZodTypeAny, {
                        PlayCount: number;
                        IsFavorite: boolean;
                        Key: string;
                        PlaybackPositionTicks: number;
                        Played: boolean;
                    }, {
                        PlayCount: number;
                        IsFavorite: boolean;
                        Key: string;
                        PlaybackPositionTicks: number;
                        Played: boolean;
                    }>>;
                }, "strip", z.ZodTypeAny, {
                    Name: string;
                    Genres: string[];
                    Album: string;
                    MediaType: string;
                    Id: string;
                    AlbumArtist: string;
                    AlbumArtists: {
                        Name: string;
                        Id: string;
                    }[];
                    AlbumPrimaryImageTag: string;
                    ArtistItems: {
                        Name: string;
                        Id: string;
                    }[];
                    Artists: string[];
                    ChannelId: null;
                    DateCreated: string;
                    ExternalUrls: {
                        Name: string;
                        Url: string;
                    }[];
                    GenreItems: {
                        Name: string;
                        Id: string;
                    }[];
                    ImageBlurHashes: {
                        Backdrop?: Record<string, string> | undefined;
                        Logo?: Record<string, string> | undefined;
                        Primary?: Record<string, string> | undefined;
                    };
                    ImageTags: {
                        Logo?: string | undefined;
                        Primary?: string | undefined;
                    };
                    IsFolder: boolean;
                    LocationType: string;
                    Type: string;
                    ProductionYear: number;
                    RunTimeTicks: number;
                    ServerId: string;
                    BackdropImageTags: string[];
                    IndexNumber: number;
                    MediaSources: {
                        Name: string;
                        Bitrate: number;
                        Id: string;
                        Type: string;
                        RunTimeTicks: number;
                        Container: string;
                        DefaultAudioStreamIndex: number;
                        ETag: string;
                        Formats: any[];
                        GenPtsInput: boolean;
                        IgnoreDts: boolean;
                        IgnoreIndex: boolean;
                        IsInfiniteStream: boolean;
                        IsRemote: boolean;
                        MediaAttachments: any[];
                        MediaStreams: {
                            Codec: string;
                            Level: number;
                            Type: string;
                            CodecTimeBase: string;
                            Index: number;
                            IsDefault: boolean;
                            IsExternal: boolean;
                            IsForced: boolean;
                            IsInterlaced: boolean;
                            IsTextSubtitleStream: boolean;
                            SupportsExternalStream: boolean;
                            TimeBase: string;
                            AspectRatio?: string | undefined;
                            BitDepth?: number | undefined;
                            BitRate?: number | undefined;
                            ChannelLayout?: string | undefined;
                            Channels?: number | undefined;
                            ColorSpace?: string | undefined;
                            Comment?: string | undefined;
                            DisplayTitle?: string | undefined;
                            Height?: number | undefined;
                            PixelFormat?: string | undefined;
                            Profile?: string | undefined;
                            RealFrameRate?: number | undefined;
                            RefFrames?: number | undefined;
                            SampleRate?: number | undefined;
                            Width?: number | undefined;
                        }[];
                        Path: string;
                        Protocol: string;
                        ReadAtNativeFramerate: boolean;
                        RequiresClosing: boolean;
                        RequiresLooping: boolean;
                        RequiresOpening: boolean;
                        Size: number;
                        SupportsDirectPlay: boolean;
                        SupportsDirectStream: boolean;
                        SupportsProbing: boolean;
                        SupportsTranscoding: boolean;
                        RequiredHttpHeaders?: any;
                    }[];
                    ParentIndexNumber: number;
                    SortName?: string | undefined;
                    ParentId?: string | undefined;
                    Tags?: string[] | undefined;
                    PlaylistItemId?: string | undefined;
                    People?: {
                        Name: string;
                        Id: string;
                        Type?: string | undefined;
                    }[] | undefined;
                    PremiereDate?: string | undefined;
                    ProviderIds?: {
                        MusicBrainzAlbum?: string | undefined;
                        MusicBrainzAlbumArtist?: string | undefined;
                        MusicBrainzArtist?: string | undefined;
                        MusicBrainzRecording?: string | undefined;
                        MusicBrainzReleaseGroup?: string | undefined;
                        MusicBrainzTrack?: string | undefined;
                    } | undefined;
                    AlbumId?: string | undefined;
                    LUFS?: number | undefined;
                    NormalizationGain?: number | undefined;
                    UserData?: {
                        PlayCount: number;
                        IsFavorite: boolean;
                        Key: string;
                        PlaybackPositionTicks: number;
                        Played: boolean;
                    } | undefined;
                }, {
                    Name: string;
                    Genres: string[];
                    Album: string;
                    MediaType: string;
                    Id: string;
                    AlbumArtist: string;
                    AlbumArtists: {
                        Name: string;
                        Id: string;
                    }[];
                    AlbumPrimaryImageTag: string;
                    ArtistItems: {
                        Name: string;
                        Id: string;
                    }[];
                    Artists: string[];
                    ChannelId: null;
                    DateCreated: string;
                    ExternalUrls: {
                        Name: string;
                        Url: string;
                    }[];
                    GenreItems: {
                        Name: string;
                        Id: string;
                    }[];
                    ImageBlurHashes: {
                        Backdrop?: Record<string, string> | undefined;
                        Logo?: Record<string, string> | undefined;
                        Primary?: Record<string, string> | undefined;
                    };
                    ImageTags: {
                        Logo?: string | undefined;
                        Primary?: string | undefined;
                    };
                    IsFolder: boolean;
                    LocationType: string;
                    Type: string;
                    ProductionYear: number;
                    RunTimeTicks: number;
                    ServerId: string;
                    BackdropImageTags: string[];
                    IndexNumber: number;
                    MediaSources: {
                        Name: string;
                        Bitrate: number;
                        Id: string;
                        Type: string;
                        RunTimeTicks: number;
                        Container: string;
                        DefaultAudioStreamIndex: number;
                        ETag: string;
                        Formats: any[];
                        GenPtsInput: boolean;
                        IgnoreDts: boolean;
                        IgnoreIndex: boolean;
                        IsInfiniteStream: boolean;
                        IsRemote: boolean;
                        MediaAttachments: any[];
                        MediaStreams: {
                            Codec: string;
                            Level: number;
                            Type: string;
                            CodecTimeBase: string;
                            Index: number;
                            IsDefault: boolean;
                            IsExternal: boolean;
                            IsForced: boolean;
                            IsInterlaced: boolean;
                            IsTextSubtitleStream: boolean;
                            SupportsExternalStream: boolean;
                            TimeBase: string;
                            AspectRatio?: string | undefined;
                            BitDepth?: number | undefined;
                            BitRate?: number | undefined;
                            ChannelLayout?: string | undefined;
                            Channels?: number | undefined;
                            ColorSpace?: string | undefined;
                            Comment?: string | undefined;
                            DisplayTitle?: string | undefined;
                            Height?: number | undefined;
                            PixelFormat?: string | undefined;
                            Profile?: string | undefined;
                            RealFrameRate?: number | undefined;
                            RefFrames?: number | undefined;
                            SampleRate?: number | undefined;
                            Width?: number | undefined;
                        }[];
                        Path: string;
                        Protocol: string;
                        ReadAtNativeFramerate: boolean;
                        RequiresClosing: boolean;
                        RequiresLooping: boolean;
                        RequiresOpening: boolean;
                        Size: number;
                        SupportsDirectPlay: boolean;
                        SupportsDirectStream: boolean;
                        SupportsProbing: boolean;
                        SupportsTranscoding: boolean;
                        RequiredHttpHeaders?: any;
                    }[];
                    ParentIndexNumber: number;
                    SortName?: string | undefined;
                    ParentId?: string | undefined;
                    Tags?: string[] | undefined;
                    PlaylistItemId?: string | undefined;
                    People?: {
                        Name: string;
                        Id: string;
                        Type?: string | undefined;
                    }[] | undefined;
                    PremiereDate?: string | undefined;
                    ProviderIds?: {
                        MusicBrainzAlbum?: string | undefined;
                        MusicBrainzAlbumArtist?: string | undefined;
                        MusicBrainzArtist?: string | undefined;
                        MusicBrainzRecording?: string | undefined;
                        MusicBrainzReleaseGroup?: string | undefined;
                        MusicBrainzTrack?: string | undefined;
                    } | undefined;
                    AlbumId?: string | undefined;
                    LUFS?: number | undefined;
                    NormalizationGain?: number | undefined;
                    UserData?: {
                        PlayCount: number;
                        IsFavorite: boolean;
                        Key: string;
                        PlaybackPositionTicks: number;
                        Played: boolean;
                    } | undefined;
                }>, "many">;
            }, "strip", z.ZodTypeAny, {
                StartIndex: number;
                TotalRecordCount: number;
                Items: {
                    Name: string;
                    Genres: string[];
                    Album: string;
                    MediaType: string;
                    Id: string;
                    AlbumArtist: string;
                    AlbumArtists: {
                        Name: string;
                        Id: string;
                    }[];
                    AlbumPrimaryImageTag: string;
                    ArtistItems: {
                        Name: string;
                        Id: string;
                    }[];
                    Artists: string[];
                    ChannelId: null;
                    DateCreated: string;
                    ExternalUrls: {
                        Name: string;
                        Url: string;
                    }[];
                    GenreItems: {
                        Name: string;
                        Id: string;
                    }[];
                    ImageBlurHashes: {
                        Backdrop?: Record<string, string> | undefined;
                        Logo?: Record<string, string> | undefined;
                        Primary?: Record<string, string> | undefined;
                    };
                    ImageTags: {
                        Logo?: string | undefined;
                        Primary?: string | undefined;
                    };
                    IsFolder: boolean;
                    LocationType: string;
                    Type: string;
                    ProductionYear: number;
                    RunTimeTicks: number;
                    ServerId: string;
                    BackdropImageTags: string[];
                    IndexNumber: number;
                    MediaSources: {
                        Name: string;
                        Bitrate: number;
                        Id: string;
                        Type: string;
                        RunTimeTicks: number;
                        Container: string;
                        DefaultAudioStreamIndex: number;
                        ETag: string;
                        Formats: any[];
                        GenPtsInput: boolean;
                        IgnoreDts: boolean;
                        IgnoreIndex: boolean;
                        IsInfiniteStream: boolean;
                        IsRemote: boolean;
                        MediaAttachments: any[];
                        MediaStreams: {
                            Codec: string;
                            Level: number;
                            Type: string;
                            CodecTimeBase: string;
                            Index: number;
                            IsDefault: boolean;
                            IsExternal: boolean;
                            IsForced: boolean;
                            IsInterlaced: boolean;
                            IsTextSubtitleStream: boolean;
                            SupportsExternalStream: boolean;
                            TimeBase: string;
                            AspectRatio?: string | undefined;
                            BitDepth?: number | undefined;
                            BitRate?: number | undefined;
                            ChannelLayout?: string | undefined;
                            Channels?: number | undefined;
                            ColorSpace?: string | undefined;
                            Comment?: string | undefined;
                            DisplayTitle?: string | undefined;
                            Height?: number | undefined;
                            PixelFormat?: string | undefined;
                            Profile?: string | undefined;
                            RealFrameRate?: number | undefined;
                            RefFrames?: number | undefined;
                            SampleRate?: number | undefined;
                            Width?: number | undefined;
                        }[];
                        Path: string;
                        Protocol: string;
                        ReadAtNativeFramerate: boolean;
                        RequiresClosing: boolean;
                        RequiresLooping: boolean;
                        RequiresOpening: boolean;
                        Size: number;
                        SupportsDirectPlay: boolean;
                        SupportsDirectStream: boolean;
                        SupportsProbing: boolean;
                        SupportsTranscoding: boolean;
                        RequiredHttpHeaders?: any;
                    }[];
                    ParentIndexNumber: number;
                    SortName?: string | undefined;
                    ParentId?: string | undefined;
                    Tags?: string[] | undefined;
                    PlaylistItemId?: string | undefined;
                    People?: {
                        Name: string;
                        Id: string;
                        Type?: string | undefined;
                    }[] | undefined;
                    PremiereDate?: string | undefined;
                    ProviderIds?: {
                        MusicBrainzAlbum?: string | undefined;
                        MusicBrainzAlbumArtist?: string | undefined;
                        MusicBrainzArtist?: string | undefined;
                        MusicBrainzRecording?: string | undefined;
                        MusicBrainzReleaseGroup?: string | undefined;
                        MusicBrainzTrack?: string | undefined;
                    } | undefined;
                    AlbumId?: string | undefined;
                    LUFS?: number | undefined;
                    NormalizationGain?: number | undefined;
                    UserData?: {
                        PlayCount: number;
                        IsFavorite: boolean;
                        Key: string;
                        PlaybackPositionTicks: number;
                        Played: boolean;
                    } | undefined;
                }[];
            }, {
                StartIndex: number;
                TotalRecordCount: number;
                Items: {
                    Name: string;
                    Genres: string[];
                    Album: string;
                    MediaType: string;
                    Id: string;
                    AlbumArtist: string;
                    AlbumArtists: {
                        Name: string;
                        Id: string;
                    }[];
                    AlbumPrimaryImageTag: string;
                    ArtistItems: {
                        Name: string;
                        Id: string;
                    }[];
                    Artists: string[];
                    ChannelId: null;
                    DateCreated: string;
                    ExternalUrls: {
                        Name: string;
                        Url: string;
                    }[];
                    GenreItems: {
                        Name: string;
                        Id: string;
                    }[];
                    ImageBlurHashes: {
                        Backdrop?: Record<string, string> | undefined;
                        Logo?: Record<string, string> | undefined;
                        Primary?: Record<string, string> | undefined;
                    };
                    ImageTags: {
                        Logo?: string | undefined;
                        Primary?: string | undefined;
                    };
                    IsFolder: boolean;
                    LocationType: string;
                    Type: string;
                    ProductionYear: number;
                    RunTimeTicks: number;
                    ServerId: string;
                    BackdropImageTags: string[];
                    IndexNumber: number;
                    MediaSources: {
                        Name: string;
                        Bitrate: number;
                        Id: string;
                        Type: string;
                        RunTimeTicks: number;
                        Container: string;
                        DefaultAudioStreamIndex: number;
                        ETag: string;
                        Formats: any[];
                        GenPtsInput: boolean;
                        IgnoreDts: boolean;
                        IgnoreIndex: boolean;
                        IsInfiniteStream: boolean;
                        IsRemote: boolean;
                        MediaAttachments: any[];
                        MediaStreams: {
                            Codec: string;
                            Level: number;
                            Type: string;
                            CodecTimeBase: string;
                            Index: number;
                            IsDefault: boolean;
                            IsExternal: boolean;
                            IsForced: boolean;
                            IsInterlaced: boolean;
                            IsTextSubtitleStream: boolean;
                            SupportsExternalStream: boolean;
                            TimeBase: string;
                            AspectRatio?: string | undefined;
                            BitDepth?: number | undefined;
                            BitRate?: number | undefined;
                            ChannelLayout?: string | undefined;
                            Channels?: number | undefined;
                            ColorSpace?: string | undefined;
                            Comment?: string | undefined;
                            DisplayTitle?: string | undefined;
                            Height?: number | undefined;
                            PixelFormat?: string | undefined;
                            Profile?: string | undefined;
                            RealFrameRate?: number | undefined;
                            RefFrames?: number | undefined;
                            SampleRate?: number | undefined;
                            Width?: number | undefined;
                        }[];
                        Path: string;
                        Protocol: string;
                        ReadAtNativeFramerate: boolean;
                        RequiresClosing: boolean;
                        RequiresLooping: boolean;
                        RequiresOpening: boolean;
                        Size: number;
                        SupportsDirectPlay: boolean;
                        SupportsDirectStream: boolean;
                        SupportsProbing: boolean;
                        SupportsTranscoding: boolean;
                        RequiredHttpHeaders?: any;
                    }[];
                    ParentIndexNumber: number;
                    SortName?: string | undefined;
                    ParentId?: string | undefined;
                    Tags?: string[] | undefined;
                    PlaylistItemId?: string | undefined;
                    People?: {
                        Name: string;
                        Id: string;
                        Type?: string | undefined;
                    }[] | undefined;
                    PremiereDate?: string | undefined;
                    ProviderIds?: {
                        MusicBrainzAlbum?: string | undefined;
                        MusicBrainzAlbumArtist?: string | undefined;
                        MusicBrainzArtist?: string | undefined;
                        MusicBrainzRecording?: string | undefined;
                        MusicBrainzReleaseGroup?: string | undefined;
                        MusicBrainzTrack?: string | undefined;
                    } | undefined;
                    AlbumId?: string | undefined;
                    LUFS?: number | undefined;
                    NormalizationGain?: number | undefined;
                    UserData?: {
                        PlayCount: number;
                        IsFavorite: boolean;
                        Key: string;
                        PlaybackPositionTicks: number;
                        Played: boolean;
                    } | undefined;
                }[];
            }>;
            400: z.ZodObject<{
                errors: z.ZodObject<{
                    recursive: z.ZodArray<z.ZodString, "many">;
                }, "strip", z.ZodTypeAny, {
                    recursive: string[];
                }, {
                    recursive: string[];
                }>;
                status: z.ZodNumber;
                title: z.ZodString;
                traceId: z.ZodString;
                type: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                title: string;
                type: string;
                status: number;
                errors: {
                    recursive: string[];
                };
                traceId: string;
            }, {
                title: string;
                type: string;
                status: number;
                errors: {
                    recursive: string[];
                };
                traceId: string;
            }>;
        };
    };
    getSongData: {
        method: "GET";
        query: z.ZodObject<{
            AlbumArtistIds: z.ZodOptional<z.ZodString>;
            ArtistIds: z.ZodOptional<z.ZodString>;
            ContributingArtistIds: z.ZodOptional<z.ZodString>;
            EnableImageTypes: z.ZodOptional<z.ZodString>;
            EnableTotalRecordCount: z.ZodOptional<z.ZodBoolean>;
            EnableUserData: z.ZodOptional<z.ZodBoolean>;
            EnableUserDataTypes: z.ZodOptional<z.ZodBoolean>;
            ExcludeArtistIds: z.ZodOptional<z.ZodString>;
            ExcludeItemIds: z.ZodOptional<z.ZodString>;
            ExcludeItemTypes: z.ZodOptional<z.ZodString>;
            Fields: z.ZodOptional<z.ZodReadonly<z.ZodArray<z.ZodString, "many">>>;
            FolderId: z.ZodOptional<z.ZodString>;
            ImageTypeLimit: z.ZodOptional<z.ZodNumber>;
            IncludeArtists: z.ZodOptional<z.ZodBoolean>;
            IncludeGenres: z.ZodOptional<z.ZodBoolean>;
            IncludeItemTypes: z.ZodOptional<z.ZodString>;
            IncludeMedia: z.ZodOptional<z.ZodBoolean>;
            IncludePeople: z.ZodOptional<z.ZodBoolean>;
            IncludeStudios: z.ZodOptional<z.ZodBoolean>;
            IsFavorite: z.ZodOptional<z.ZodBoolean>;
            Limit: z.ZodOptional<z.ZodNumber>;
            MediaTypes: z.ZodOptional<z.ZodString>;
            NameStartsWith: z.ZodOptional<z.ZodString>;
            ParentId: z.ZodOptional<z.ZodString>;
            Recursive: z.ZodOptional<z.ZodBoolean>;
            SearchTerm: z.ZodOptional<z.ZodString>;
            SortBy: z.ZodOptional<z.ZodString>;
            SortOrder: z.ZodOptional<z.ZodEnum<["Ascending", "Descending"]>>;
            StartIndex: z.ZodOptional<z.ZodNumber>;
            Tags: z.ZodOptional<z.ZodString>;
            UserId: z.ZodOptional<z.ZodString>;
            Years: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            Limit?: number | undefined;
            UserId?: string | undefined;
            AlbumArtistIds?: string | undefined;
            ArtistIds?: string | undefined;
            ContributingArtistIds?: string | undefined;
            EnableImageTypes?: string | undefined;
            EnableTotalRecordCount?: boolean | undefined;
            EnableUserData?: boolean | undefined;
            EnableUserDataTypes?: boolean | undefined;
            ExcludeArtistIds?: string | undefined;
            ExcludeItemIds?: string | undefined;
            ExcludeItemTypes?: string | undefined;
            Fields?: readonly string[] | undefined;
            FolderId?: string | undefined;
            ImageTypeLimit?: number | undefined;
            IncludeArtists?: boolean | undefined;
            IncludeGenres?: boolean | undefined;
            IncludeItemTypes?: string | undefined;
            IncludeMedia?: boolean | undefined;
            IncludePeople?: boolean | undefined;
            IncludeStudios?: boolean | undefined;
            IsFavorite?: boolean | undefined;
            MediaTypes?: string | undefined;
            NameStartsWith?: string | undefined;
            ParentId?: string | undefined;
            Recursive?: boolean | undefined;
            SearchTerm?: string | undefined;
            SortBy?: string | undefined;
            SortOrder?: "Ascending" | "Descending" | undefined;
            StartIndex?: number | undefined;
            Tags?: string | undefined;
            Years?: string | undefined;
        }, {
            Limit?: number | undefined;
            UserId?: string | undefined;
            AlbumArtistIds?: string | undefined;
            ArtistIds?: string | undefined;
            ContributingArtistIds?: string | undefined;
            EnableImageTypes?: string | undefined;
            EnableTotalRecordCount?: boolean | undefined;
            EnableUserData?: boolean | undefined;
            EnableUserDataTypes?: boolean | undefined;
            ExcludeArtistIds?: string | undefined;
            ExcludeItemIds?: string | undefined;
            ExcludeItemTypes?: string | undefined;
            Fields?: readonly string[] | undefined;
            FolderId?: string | undefined;
            ImageTypeLimit?: number | undefined;
            IncludeArtists?: boolean | undefined;
            IncludeGenres?: boolean | undefined;
            IncludeItemTypes?: string | undefined;
            IncludeMedia?: boolean | undefined;
            IncludePeople?: boolean | undefined;
            IncludeStudios?: boolean | undefined;
            IsFavorite?: boolean | undefined;
            MediaTypes?: string | undefined;
            NameStartsWith?: string | undefined;
            ParentId?: string | undefined;
            Recursive?: boolean | undefined;
            SearchTerm?: string | undefined;
            SortBy?: string | undefined;
            SortOrder?: "Ascending" | "Descending" | undefined;
            StartIndex?: number | undefined;
            Tags?: string | undefined;
            Years?: string | undefined;
        }>;
        path: "users/:userId/items/:id";
        responses: {
            200: z.ZodObject<{
                Album: z.ZodString;
                AlbumArtist: z.ZodString;
                AlbumArtists: z.ZodArray<z.ZodObject<{
                    Id: z.ZodString;
                    Name: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    Name: string;
                    Id: string;
                }, {
                    Name: string;
                    Id: string;
                }>, "many">;
                AlbumId: z.ZodOptional<z.ZodString>;
                AlbumPrimaryImageTag: z.ZodString;
                ArtistItems: z.ZodArray<z.ZodObject<{
                    Id: z.ZodString;
                    Name: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    Name: string;
                    Id: string;
                }, {
                    Name: string;
                    Id: string;
                }>, "many">;
                Artists: z.ZodArray<z.ZodString, "many">;
                BackdropImageTags: z.ZodArray<z.ZodString, "many">;
                ChannelId: z.ZodNull;
                DateCreated: z.ZodString;
                ExternalUrls: z.ZodArray<z.ZodObject<{
                    Name: z.ZodString;
                    Url: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    Name: string;
                    Url: string;
                }, {
                    Name: string;
                    Url: string;
                }>, "many">;
                GenreItems: z.ZodArray<z.ZodObject<{
                    Id: z.ZodString;
                    Name: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    Name: string;
                    Id: string;
                }, {
                    Name: string;
                    Id: string;
                }>, "many">;
                Genres: z.ZodArray<z.ZodString, "many">;
                Id: z.ZodString;
                ImageBlurHashes: z.ZodObject<{
                    Backdrop: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
                    Logo: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
                    Primary: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
                }, "strip", z.ZodTypeAny, {
                    Backdrop?: Record<string, string> | undefined;
                    Logo?: Record<string, string> | undefined;
                    Primary?: Record<string, string> | undefined;
                }, {
                    Backdrop?: Record<string, string> | undefined;
                    Logo?: Record<string, string> | undefined;
                    Primary?: Record<string, string> | undefined;
                }>;
                ImageTags: z.ZodObject<{
                    Logo: z.ZodOptional<z.ZodString>;
                    Primary: z.ZodOptional<z.ZodString>;
                }, "strip", z.ZodTypeAny, {
                    Logo?: string | undefined;
                    Primary?: string | undefined;
                }, {
                    Logo?: string | undefined;
                    Primary?: string | undefined;
                }>;
                IndexNumber: z.ZodNumber;
                IsFolder: z.ZodBoolean;
                LocationType: z.ZodString;
                LUFS: z.ZodOptional<z.ZodNumber>;
                MediaSources: z.ZodArray<z.ZodObject<{
                    Bitrate: z.ZodNumber;
                    Container: z.ZodString;
                    DefaultAudioStreamIndex: z.ZodNumber;
                    ETag: z.ZodString;
                    Formats: z.ZodArray<z.ZodAny, "many">;
                    GenPtsInput: z.ZodBoolean;
                    Id: z.ZodString;
                    IgnoreDts: z.ZodBoolean;
                    IgnoreIndex: z.ZodBoolean;
                    IsInfiniteStream: z.ZodBoolean;
                    IsRemote: z.ZodBoolean;
                    MediaAttachments: z.ZodArray<z.ZodAny, "many">;
                    MediaStreams: z.ZodArray<z.ZodObject<{
                        AspectRatio: z.ZodOptional<z.ZodString>;
                        BitDepth: z.ZodOptional<z.ZodNumber>;
                        BitRate: z.ZodOptional<z.ZodNumber>;
                        ChannelLayout: z.ZodOptional<z.ZodString>;
                        Channels: z.ZodOptional<z.ZodNumber>;
                        Codec: z.ZodString;
                        CodecTimeBase: z.ZodString;
                        ColorSpace: z.ZodOptional<z.ZodString>;
                        Comment: z.ZodOptional<z.ZodString>;
                        DisplayTitle: z.ZodOptional<z.ZodString>;
                        Height: z.ZodOptional<z.ZodNumber>;
                        Index: z.ZodNumber;
                        IsDefault: z.ZodBoolean;
                        IsExternal: z.ZodBoolean;
                        IsForced: z.ZodBoolean;
                        IsInterlaced: z.ZodBoolean;
                        IsTextSubtitleStream: z.ZodBoolean;
                        Level: z.ZodNumber;
                        PixelFormat: z.ZodOptional<z.ZodString>;
                        Profile: z.ZodOptional<z.ZodString>;
                        RealFrameRate: z.ZodOptional<z.ZodNumber>;
                        RefFrames: z.ZodOptional<z.ZodNumber>;
                        SampleRate: z.ZodOptional<z.ZodNumber>;
                        SupportsExternalStream: z.ZodBoolean;
                        TimeBase: z.ZodString;
                        Type: z.ZodString;
                        Width: z.ZodOptional<z.ZodNumber>;
                    }, "strip", z.ZodTypeAny, {
                        Codec: string;
                        Level: number;
                        Type: string;
                        CodecTimeBase: string;
                        Index: number;
                        IsDefault: boolean;
                        IsExternal: boolean;
                        IsForced: boolean;
                        IsInterlaced: boolean;
                        IsTextSubtitleStream: boolean;
                        SupportsExternalStream: boolean;
                        TimeBase: string;
                        AspectRatio?: string | undefined;
                        BitDepth?: number | undefined;
                        BitRate?: number | undefined;
                        ChannelLayout?: string | undefined;
                        Channels?: number | undefined;
                        ColorSpace?: string | undefined;
                        Comment?: string | undefined;
                        DisplayTitle?: string | undefined;
                        Height?: number | undefined;
                        PixelFormat?: string | undefined;
                        Profile?: string | undefined;
                        RealFrameRate?: number | undefined;
                        RefFrames?: number | undefined;
                        SampleRate?: number | undefined;
                        Width?: number | undefined;
                    }, {
                        Codec: string;
                        Level: number;
                        Type: string;
                        CodecTimeBase: string;
                        Index: number;
                        IsDefault: boolean;
                        IsExternal: boolean;
                        IsForced: boolean;
                        IsInterlaced: boolean;
                        IsTextSubtitleStream: boolean;
                        SupportsExternalStream: boolean;
                        TimeBase: string;
                        AspectRatio?: string | undefined;
                        BitDepth?: number | undefined;
                        BitRate?: number | undefined;
                        ChannelLayout?: string | undefined;
                        Channels?: number | undefined;
                        ColorSpace?: string | undefined;
                        Comment?: string | undefined;
                        DisplayTitle?: string | undefined;
                        Height?: number | undefined;
                        PixelFormat?: string | undefined;
                        Profile?: string | undefined;
                        RealFrameRate?: number | undefined;
                        RefFrames?: number | undefined;
                        SampleRate?: number | undefined;
                        Width?: number | undefined;
                    }>, "many">;
                    Name: z.ZodString;
                    Path: z.ZodString;
                    Protocol: z.ZodString;
                    ReadAtNativeFramerate: z.ZodBoolean;
                    RequiredHttpHeaders: z.ZodAny;
                    RequiresClosing: z.ZodBoolean;
                    RequiresLooping: z.ZodBoolean;
                    RequiresOpening: z.ZodBoolean;
                    RunTimeTicks: z.ZodNumber;
                    Size: z.ZodNumber;
                    SupportsDirectPlay: z.ZodBoolean;
                    SupportsDirectStream: z.ZodBoolean;
                    SupportsProbing: z.ZodBoolean;
                    SupportsTranscoding: z.ZodBoolean;
                    Type: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    Name: string;
                    Bitrate: number;
                    Id: string;
                    Type: string;
                    RunTimeTicks: number;
                    Container: string;
                    DefaultAudioStreamIndex: number;
                    ETag: string;
                    Formats: any[];
                    GenPtsInput: boolean;
                    IgnoreDts: boolean;
                    IgnoreIndex: boolean;
                    IsInfiniteStream: boolean;
                    IsRemote: boolean;
                    MediaAttachments: any[];
                    MediaStreams: {
                        Codec: string;
                        Level: number;
                        Type: string;
                        CodecTimeBase: string;
                        Index: number;
                        IsDefault: boolean;
                        IsExternal: boolean;
                        IsForced: boolean;
                        IsInterlaced: boolean;
                        IsTextSubtitleStream: boolean;
                        SupportsExternalStream: boolean;
                        TimeBase: string;
                        AspectRatio?: string | undefined;
                        BitDepth?: number | undefined;
                        BitRate?: number | undefined;
                        ChannelLayout?: string | undefined;
                        Channels?: number | undefined;
                        ColorSpace?: string | undefined;
                        Comment?: string | undefined;
                        DisplayTitle?: string | undefined;
                        Height?: number | undefined;
                        PixelFormat?: string | undefined;
                        Profile?: string | undefined;
                        RealFrameRate?: number | undefined;
                        RefFrames?: number | undefined;
                        SampleRate?: number | undefined;
                        Width?: number | undefined;
                    }[];
                    Path: string;
                    Protocol: string;
                    ReadAtNativeFramerate: boolean;
                    RequiresClosing: boolean;
                    RequiresLooping: boolean;
                    RequiresOpening: boolean;
                    Size: number;
                    SupportsDirectPlay: boolean;
                    SupportsDirectStream: boolean;
                    SupportsProbing: boolean;
                    SupportsTranscoding: boolean;
                    RequiredHttpHeaders?: any;
                }, {
                    Name: string;
                    Bitrate: number;
                    Id: string;
                    Type: string;
                    RunTimeTicks: number;
                    Container: string;
                    DefaultAudioStreamIndex: number;
                    ETag: string;
                    Formats: any[];
                    GenPtsInput: boolean;
                    IgnoreDts: boolean;
                    IgnoreIndex: boolean;
                    IsInfiniteStream: boolean;
                    IsRemote: boolean;
                    MediaAttachments: any[];
                    MediaStreams: {
                        Codec: string;
                        Level: number;
                        Type: string;
                        CodecTimeBase: string;
                        Index: number;
                        IsDefault: boolean;
                        IsExternal: boolean;
                        IsForced: boolean;
                        IsInterlaced: boolean;
                        IsTextSubtitleStream: boolean;
                        SupportsExternalStream: boolean;
                        TimeBase: string;
                        AspectRatio?: string | undefined;
                        BitDepth?: number | undefined;
                        BitRate?: number | undefined;
                        ChannelLayout?: string | undefined;
                        Channels?: number | undefined;
                        ColorSpace?: string | undefined;
                        Comment?: string | undefined;
                        DisplayTitle?: string | undefined;
                        Height?: number | undefined;
                        PixelFormat?: string | undefined;
                        Profile?: string | undefined;
                        RealFrameRate?: number | undefined;
                        RefFrames?: number | undefined;
                        SampleRate?: number | undefined;
                        Width?: number | undefined;
                    }[];
                    Path: string;
                    Protocol: string;
                    ReadAtNativeFramerate: boolean;
                    RequiresClosing: boolean;
                    RequiresLooping: boolean;
                    RequiresOpening: boolean;
                    Size: number;
                    SupportsDirectPlay: boolean;
                    SupportsDirectStream: boolean;
                    SupportsProbing: boolean;
                    SupportsTranscoding: boolean;
                    RequiredHttpHeaders?: any;
                }>, "many">;
                MediaType: z.ZodString;
                Name: z.ZodString;
                NormalizationGain: z.ZodOptional<z.ZodNumber>;
                ParentId: z.ZodOptional<z.ZodString>;
                ParentIndexNumber: z.ZodNumber;
                People: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    Id: z.ZodString;
                    Name: z.ZodString;
                    Type: z.ZodOptional<z.ZodString>;
                }, "strip", z.ZodTypeAny, {
                    Name: string;
                    Id: string;
                    Type?: string | undefined;
                }, {
                    Name: string;
                    Id: string;
                    Type?: string | undefined;
                }>, "many">>;
                PlaylistItemId: z.ZodOptional<z.ZodString>;
                PremiereDate: z.ZodOptional<z.ZodString>;
                ProductionYear: z.ZodNumber;
                ProviderIds: z.ZodOptional<z.ZodObject<{
                    MusicBrainzAlbum: z.ZodOptional<z.ZodString>;
                    MusicBrainzAlbumArtist: z.ZodOptional<z.ZodString>;
                    MusicBrainzArtist: z.ZodOptional<z.ZodString>;
                    MusicBrainzRecording: z.ZodOptional<z.ZodString>;
                    MusicBrainzReleaseGroup: z.ZodOptional<z.ZodString>;
                    MusicBrainzTrack: z.ZodOptional<z.ZodString>;
                }, "strip", z.ZodTypeAny, {
                    MusicBrainzAlbum?: string | undefined;
                    MusicBrainzAlbumArtist?: string | undefined;
                    MusicBrainzArtist?: string | undefined;
                    MusicBrainzRecording?: string | undefined;
                    MusicBrainzReleaseGroup?: string | undefined;
                    MusicBrainzTrack?: string | undefined;
                }, {
                    MusicBrainzAlbum?: string | undefined;
                    MusicBrainzAlbumArtist?: string | undefined;
                    MusicBrainzArtist?: string | undefined;
                    MusicBrainzRecording?: string | undefined;
                    MusicBrainzReleaseGroup?: string | undefined;
                    MusicBrainzTrack?: string | undefined;
                }>>;
                RunTimeTicks: z.ZodNumber;
                ServerId: z.ZodString;
                SortName: z.ZodOptional<z.ZodString>;
                Tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                Type: z.ZodString;
                UserData: z.ZodOptional<z.ZodObject<{
                    IsFavorite: z.ZodBoolean;
                    Key: z.ZodString;
                    PlaybackPositionTicks: z.ZodNumber;
                    PlayCount: z.ZodNumber;
                    Played: z.ZodBoolean;
                }, "strip", z.ZodTypeAny, {
                    PlayCount: number;
                    IsFavorite: boolean;
                    Key: string;
                    PlaybackPositionTicks: number;
                    Played: boolean;
                }, {
                    PlayCount: number;
                    IsFavorite: boolean;
                    Key: string;
                    PlaybackPositionTicks: number;
                    Played: boolean;
                }>>;
            }, "strip", z.ZodTypeAny, {
                Name: string;
                Genres: string[];
                Album: string;
                MediaType: string;
                Id: string;
                AlbumArtist: string;
                AlbumArtists: {
                    Name: string;
                    Id: string;
                }[];
                AlbumPrimaryImageTag: string;
                ArtistItems: {
                    Name: string;
                    Id: string;
                }[];
                Artists: string[];
                ChannelId: null;
                DateCreated: string;
                ExternalUrls: {
                    Name: string;
                    Url: string;
                }[];
                GenreItems: {
                    Name: string;
                    Id: string;
                }[];
                ImageBlurHashes: {
                    Backdrop?: Record<string, string> | undefined;
                    Logo?: Record<string, string> | undefined;
                    Primary?: Record<string, string> | undefined;
                };
                ImageTags: {
                    Logo?: string | undefined;
                    Primary?: string | undefined;
                };
                IsFolder: boolean;
                LocationType: string;
                Type: string;
                ProductionYear: number;
                RunTimeTicks: number;
                ServerId: string;
                BackdropImageTags: string[];
                IndexNumber: number;
                MediaSources: {
                    Name: string;
                    Bitrate: number;
                    Id: string;
                    Type: string;
                    RunTimeTicks: number;
                    Container: string;
                    DefaultAudioStreamIndex: number;
                    ETag: string;
                    Formats: any[];
                    GenPtsInput: boolean;
                    IgnoreDts: boolean;
                    IgnoreIndex: boolean;
                    IsInfiniteStream: boolean;
                    IsRemote: boolean;
                    MediaAttachments: any[];
                    MediaStreams: {
                        Codec: string;
                        Level: number;
                        Type: string;
                        CodecTimeBase: string;
                        Index: number;
                        IsDefault: boolean;
                        IsExternal: boolean;
                        IsForced: boolean;
                        IsInterlaced: boolean;
                        IsTextSubtitleStream: boolean;
                        SupportsExternalStream: boolean;
                        TimeBase: string;
                        AspectRatio?: string | undefined;
                        BitDepth?: number | undefined;
                        BitRate?: number | undefined;
                        ChannelLayout?: string | undefined;
                        Channels?: number | undefined;
                        ColorSpace?: string | undefined;
                        Comment?: string | undefined;
                        DisplayTitle?: string | undefined;
                        Height?: number | undefined;
                        PixelFormat?: string | undefined;
                        Profile?: string | undefined;
                        RealFrameRate?: number | undefined;
                        RefFrames?: number | undefined;
                        SampleRate?: number | undefined;
                        Width?: number | undefined;
                    }[];
                    Path: string;
                    Protocol: string;
                    ReadAtNativeFramerate: boolean;
                    RequiresClosing: boolean;
                    RequiresLooping: boolean;
                    RequiresOpening: boolean;
                    Size: number;
                    SupportsDirectPlay: boolean;
                    SupportsDirectStream: boolean;
                    SupportsProbing: boolean;
                    SupportsTranscoding: boolean;
                    RequiredHttpHeaders?: any;
                }[];
                ParentIndexNumber: number;
                SortName?: string | undefined;
                ParentId?: string | undefined;
                Tags?: string[] | undefined;
                PlaylistItemId?: string | undefined;
                People?: {
                    Name: string;
                    Id: string;
                    Type?: string | undefined;
                }[] | undefined;
                PremiereDate?: string | undefined;
                ProviderIds?: {
                    MusicBrainzAlbum?: string | undefined;
                    MusicBrainzAlbumArtist?: string | undefined;
                    MusicBrainzArtist?: string | undefined;
                    MusicBrainzRecording?: string | undefined;
                    MusicBrainzReleaseGroup?: string | undefined;
                    MusicBrainzTrack?: string | undefined;
                } | undefined;
                AlbumId?: string | undefined;
                LUFS?: number | undefined;
                NormalizationGain?: number | undefined;
                UserData?: {
                    PlayCount: number;
                    IsFavorite: boolean;
                    Key: string;
                    PlaybackPositionTicks: number;
                    Played: boolean;
                } | undefined;
            }, {
                Name: string;
                Genres: string[];
                Album: string;
                MediaType: string;
                Id: string;
                AlbumArtist: string;
                AlbumArtists: {
                    Name: string;
                    Id: string;
                }[];
                AlbumPrimaryImageTag: string;
                ArtistItems: {
                    Name: string;
                    Id: string;
                }[];
                Artists: string[];
                ChannelId: null;
                DateCreated: string;
                ExternalUrls: {
                    Name: string;
                    Url: string;
                }[];
                GenreItems: {
                    Name: string;
                    Id: string;
                }[];
                ImageBlurHashes: {
                    Backdrop?: Record<string, string> | undefined;
                    Logo?: Record<string, string> | undefined;
                    Primary?: Record<string, string> | undefined;
                };
                ImageTags: {
                    Logo?: string | undefined;
                    Primary?: string | undefined;
                };
                IsFolder: boolean;
                LocationType: string;
                Type: string;
                ProductionYear: number;
                RunTimeTicks: number;
                ServerId: string;
                BackdropImageTags: string[];
                IndexNumber: number;
                MediaSources: {
                    Name: string;
                    Bitrate: number;
                    Id: string;
                    Type: string;
                    RunTimeTicks: number;
                    Container: string;
                    DefaultAudioStreamIndex: number;
                    ETag: string;
                    Formats: any[];
                    GenPtsInput: boolean;
                    IgnoreDts: boolean;
                    IgnoreIndex: boolean;
                    IsInfiniteStream: boolean;
                    IsRemote: boolean;
                    MediaAttachments: any[];
                    MediaStreams: {
                        Codec: string;
                        Level: number;
                        Type: string;
                        CodecTimeBase: string;
                        Index: number;
                        IsDefault: boolean;
                        IsExternal: boolean;
                        IsForced: boolean;
                        IsInterlaced: boolean;
                        IsTextSubtitleStream: boolean;
                        SupportsExternalStream: boolean;
                        TimeBase: string;
                        AspectRatio?: string | undefined;
                        BitDepth?: number | undefined;
                        BitRate?: number | undefined;
                        ChannelLayout?: string | undefined;
                        Channels?: number | undefined;
                        ColorSpace?: string | undefined;
                        Comment?: string | undefined;
                        DisplayTitle?: string | undefined;
                        Height?: number | undefined;
                        PixelFormat?: string | undefined;
                        Profile?: string | undefined;
                        RealFrameRate?: number | undefined;
                        RefFrames?: number | undefined;
                        SampleRate?: number | undefined;
                        Width?: number | undefined;
                    }[];
                    Path: string;
                    Protocol: string;
                    ReadAtNativeFramerate: boolean;
                    RequiresClosing: boolean;
                    RequiresLooping: boolean;
                    RequiresOpening: boolean;
                    Size: number;
                    SupportsDirectPlay: boolean;
                    SupportsDirectStream: boolean;
                    SupportsProbing: boolean;
                    SupportsTranscoding: boolean;
                    RequiredHttpHeaders?: any;
                }[];
                ParentIndexNumber: number;
                SortName?: string | undefined;
                ParentId?: string | undefined;
                Tags?: string[] | undefined;
                PlaylistItemId?: string | undefined;
                People?: {
                    Name: string;
                    Id: string;
                    Type?: string | undefined;
                }[] | undefined;
                PremiereDate?: string | undefined;
                ProviderIds?: {
                    MusicBrainzAlbum?: string | undefined;
                    MusicBrainzAlbumArtist?: string | undefined;
                    MusicBrainzArtist?: string | undefined;
                    MusicBrainzRecording?: string | undefined;
                    MusicBrainzReleaseGroup?: string | undefined;
                    MusicBrainzTrack?: string | undefined;
                } | undefined;
                AlbumId?: string | undefined;
                LUFS?: number | undefined;
                NormalizationGain?: number | undefined;
                UserData?: {
                    PlayCount: number;
                    IsFavorite: boolean;
                    Key: string;
                    PlaybackPositionTicks: number;
                    Played: boolean;
                } | undefined;
            }>;
            400: z.ZodObject<{
                errors: z.ZodObject<{
                    recursive: z.ZodArray<z.ZodString, "many">;
                }, "strip", z.ZodTypeAny, {
                    recursive: string[];
                }, {
                    recursive: string[];
                }>;
                status: z.ZodNumber;
                title: z.ZodString;
                traceId: z.ZodString;
                type: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                title: string;
                type: string;
                status: number;
                errors: {
                    recursive: string[];
                };
                traceId: string;
            }, {
                title: string;
                type: string;
                status: number;
                errors: {
                    recursive: string[];
                };
                traceId: string;
            }>;
        };
    };
    getSongDetail: {
        method: "GET";
        path: "users/:userId/items/:id";
        responses: {
            200: z.ZodObject<{
                Album: z.ZodString;
                AlbumArtist: z.ZodString;
                AlbumArtists: z.ZodArray<z.ZodObject<{
                    Id: z.ZodString;
                    Name: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    Name: string;
                    Id: string;
                }, {
                    Name: string;
                    Id: string;
                }>, "many">;
                AlbumId: z.ZodOptional<z.ZodString>;
                AlbumPrimaryImageTag: z.ZodString;
                ArtistItems: z.ZodArray<z.ZodObject<{
                    Id: z.ZodString;
                    Name: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    Name: string;
                    Id: string;
                }, {
                    Name: string;
                    Id: string;
                }>, "many">;
                Artists: z.ZodArray<z.ZodString, "many">;
                BackdropImageTags: z.ZodArray<z.ZodString, "many">;
                ChannelId: z.ZodNull;
                DateCreated: z.ZodString;
                ExternalUrls: z.ZodArray<z.ZodObject<{
                    Name: z.ZodString;
                    Url: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    Name: string;
                    Url: string;
                }, {
                    Name: string;
                    Url: string;
                }>, "many">;
                GenreItems: z.ZodArray<z.ZodObject<{
                    Id: z.ZodString;
                    Name: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    Name: string;
                    Id: string;
                }, {
                    Name: string;
                    Id: string;
                }>, "many">;
                Genres: z.ZodArray<z.ZodString, "many">;
                Id: z.ZodString;
                ImageBlurHashes: z.ZodObject<{
                    Backdrop: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
                    Logo: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
                    Primary: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
                }, "strip", z.ZodTypeAny, {
                    Backdrop?: Record<string, string> | undefined;
                    Logo?: Record<string, string> | undefined;
                    Primary?: Record<string, string> | undefined;
                }, {
                    Backdrop?: Record<string, string> | undefined;
                    Logo?: Record<string, string> | undefined;
                    Primary?: Record<string, string> | undefined;
                }>;
                ImageTags: z.ZodObject<{
                    Logo: z.ZodOptional<z.ZodString>;
                    Primary: z.ZodOptional<z.ZodString>;
                }, "strip", z.ZodTypeAny, {
                    Logo?: string | undefined;
                    Primary?: string | undefined;
                }, {
                    Logo?: string | undefined;
                    Primary?: string | undefined;
                }>;
                IndexNumber: z.ZodNumber;
                IsFolder: z.ZodBoolean;
                LocationType: z.ZodString;
                LUFS: z.ZodOptional<z.ZodNumber>;
                MediaSources: z.ZodArray<z.ZodObject<{
                    Bitrate: z.ZodNumber;
                    Container: z.ZodString;
                    DefaultAudioStreamIndex: z.ZodNumber;
                    ETag: z.ZodString;
                    Formats: z.ZodArray<z.ZodAny, "many">;
                    GenPtsInput: z.ZodBoolean;
                    Id: z.ZodString;
                    IgnoreDts: z.ZodBoolean;
                    IgnoreIndex: z.ZodBoolean;
                    IsInfiniteStream: z.ZodBoolean;
                    IsRemote: z.ZodBoolean;
                    MediaAttachments: z.ZodArray<z.ZodAny, "many">;
                    MediaStreams: z.ZodArray<z.ZodObject<{
                        AspectRatio: z.ZodOptional<z.ZodString>;
                        BitDepth: z.ZodOptional<z.ZodNumber>;
                        BitRate: z.ZodOptional<z.ZodNumber>;
                        ChannelLayout: z.ZodOptional<z.ZodString>;
                        Channels: z.ZodOptional<z.ZodNumber>;
                        Codec: z.ZodString;
                        CodecTimeBase: z.ZodString;
                        ColorSpace: z.ZodOptional<z.ZodString>;
                        Comment: z.ZodOptional<z.ZodString>;
                        DisplayTitle: z.ZodOptional<z.ZodString>;
                        Height: z.ZodOptional<z.ZodNumber>;
                        Index: z.ZodNumber;
                        IsDefault: z.ZodBoolean;
                        IsExternal: z.ZodBoolean;
                        IsForced: z.ZodBoolean;
                        IsInterlaced: z.ZodBoolean;
                        IsTextSubtitleStream: z.ZodBoolean;
                        Level: z.ZodNumber;
                        PixelFormat: z.ZodOptional<z.ZodString>;
                        Profile: z.ZodOptional<z.ZodString>;
                        RealFrameRate: z.ZodOptional<z.ZodNumber>;
                        RefFrames: z.ZodOptional<z.ZodNumber>;
                        SampleRate: z.ZodOptional<z.ZodNumber>;
                        SupportsExternalStream: z.ZodBoolean;
                        TimeBase: z.ZodString;
                        Type: z.ZodString;
                        Width: z.ZodOptional<z.ZodNumber>;
                    }, "strip", z.ZodTypeAny, {
                        Codec: string;
                        Level: number;
                        Type: string;
                        CodecTimeBase: string;
                        Index: number;
                        IsDefault: boolean;
                        IsExternal: boolean;
                        IsForced: boolean;
                        IsInterlaced: boolean;
                        IsTextSubtitleStream: boolean;
                        SupportsExternalStream: boolean;
                        TimeBase: string;
                        AspectRatio?: string | undefined;
                        BitDepth?: number | undefined;
                        BitRate?: number | undefined;
                        ChannelLayout?: string | undefined;
                        Channels?: number | undefined;
                        ColorSpace?: string | undefined;
                        Comment?: string | undefined;
                        DisplayTitle?: string | undefined;
                        Height?: number | undefined;
                        PixelFormat?: string | undefined;
                        Profile?: string | undefined;
                        RealFrameRate?: number | undefined;
                        RefFrames?: number | undefined;
                        SampleRate?: number | undefined;
                        Width?: number | undefined;
                    }, {
                        Codec: string;
                        Level: number;
                        Type: string;
                        CodecTimeBase: string;
                        Index: number;
                        IsDefault: boolean;
                        IsExternal: boolean;
                        IsForced: boolean;
                        IsInterlaced: boolean;
                        IsTextSubtitleStream: boolean;
                        SupportsExternalStream: boolean;
                        TimeBase: string;
                        AspectRatio?: string | undefined;
                        BitDepth?: number | undefined;
                        BitRate?: number | undefined;
                        ChannelLayout?: string | undefined;
                        Channels?: number | undefined;
                        ColorSpace?: string | undefined;
                        Comment?: string | undefined;
                        DisplayTitle?: string | undefined;
                        Height?: number | undefined;
                        PixelFormat?: string | undefined;
                        Profile?: string | undefined;
                        RealFrameRate?: number | undefined;
                        RefFrames?: number | undefined;
                        SampleRate?: number | undefined;
                        Width?: number | undefined;
                    }>, "many">;
                    Name: z.ZodString;
                    Path: z.ZodString;
                    Protocol: z.ZodString;
                    ReadAtNativeFramerate: z.ZodBoolean;
                    RequiredHttpHeaders: z.ZodAny;
                    RequiresClosing: z.ZodBoolean;
                    RequiresLooping: z.ZodBoolean;
                    RequiresOpening: z.ZodBoolean;
                    RunTimeTicks: z.ZodNumber;
                    Size: z.ZodNumber;
                    SupportsDirectPlay: z.ZodBoolean;
                    SupportsDirectStream: z.ZodBoolean;
                    SupportsProbing: z.ZodBoolean;
                    SupportsTranscoding: z.ZodBoolean;
                    Type: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    Name: string;
                    Bitrate: number;
                    Id: string;
                    Type: string;
                    RunTimeTicks: number;
                    Container: string;
                    DefaultAudioStreamIndex: number;
                    ETag: string;
                    Formats: any[];
                    GenPtsInput: boolean;
                    IgnoreDts: boolean;
                    IgnoreIndex: boolean;
                    IsInfiniteStream: boolean;
                    IsRemote: boolean;
                    MediaAttachments: any[];
                    MediaStreams: {
                        Codec: string;
                        Level: number;
                        Type: string;
                        CodecTimeBase: string;
                        Index: number;
                        IsDefault: boolean;
                        IsExternal: boolean;
                        IsForced: boolean;
                        IsInterlaced: boolean;
                        IsTextSubtitleStream: boolean;
                        SupportsExternalStream: boolean;
                        TimeBase: string;
                        AspectRatio?: string | undefined;
                        BitDepth?: number | undefined;
                        BitRate?: number | undefined;
                        ChannelLayout?: string | undefined;
                        Channels?: number | undefined;
                        ColorSpace?: string | undefined;
                        Comment?: string | undefined;
                        DisplayTitle?: string | undefined;
                        Height?: number | undefined;
                        PixelFormat?: string | undefined;
                        Profile?: string | undefined;
                        RealFrameRate?: number | undefined;
                        RefFrames?: number | undefined;
                        SampleRate?: number | undefined;
                        Width?: number | undefined;
                    }[];
                    Path: string;
                    Protocol: string;
                    ReadAtNativeFramerate: boolean;
                    RequiresClosing: boolean;
                    RequiresLooping: boolean;
                    RequiresOpening: boolean;
                    Size: number;
                    SupportsDirectPlay: boolean;
                    SupportsDirectStream: boolean;
                    SupportsProbing: boolean;
                    SupportsTranscoding: boolean;
                    RequiredHttpHeaders?: any;
                }, {
                    Name: string;
                    Bitrate: number;
                    Id: string;
                    Type: string;
                    RunTimeTicks: number;
                    Container: string;
                    DefaultAudioStreamIndex: number;
                    ETag: string;
                    Formats: any[];
                    GenPtsInput: boolean;
                    IgnoreDts: boolean;
                    IgnoreIndex: boolean;
                    IsInfiniteStream: boolean;
                    IsRemote: boolean;
                    MediaAttachments: any[];
                    MediaStreams: {
                        Codec: string;
                        Level: number;
                        Type: string;
                        CodecTimeBase: string;
                        Index: number;
                        IsDefault: boolean;
                        IsExternal: boolean;
                        IsForced: boolean;
                        IsInterlaced: boolean;
                        IsTextSubtitleStream: boolean;
                        SupportsExternalStream: boolean;
                        TimeBase: string;
                        AspectRatio?: string | undefined;
                        BitDepth?: number | undefined;
                        BitRate?: number | undefined;
                        ChannelLayout?: string | undefined;
                        Channels?: number | undefined;
                        ColorSpace?: string | undefined;
                        Comment?: string | undefined;
                        DisplayTitle?: string | undefined;
                        Height?: number | undefined;
                        PixelFormat?: string | undefined;
                        Profile?: string | undefined;
                        RealFrameRate?: number | undefined;
                        RefFrames?: number | undefined;
                        SampleRate?: number | undefined;
                        Width?: number | undefined;
                    }[];
                    Path: string;
                    Protocol: string;
                    ReadAtNativeFramerate: boolean;
                    RequiresClosing: boolean;
                    RequiresLooping: boolean;
                    RequiresOpening: boolean;
                    Size: number;
                    SupportsDirectPlay: boolean;
                    SupportsDirectStream: boolean;
                    SupportsProbing: boolean;
                    SupportsTranscoding: boolean;
                    RequiredHttpHeaders?: any;
                }>, "many">;
                MediaType: z.ZodString;
                Name: z.ZodString;
                NormalizationGain: z.ZodOptional<z.ZodNumber>;
                ParentId: z.ZodOptional<z.ZodString>;
                ParentIndexNumber: z.ZodNumber;
                People: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    Id: z.ZodString;
                    Name: z.ZodString;
                    Type: z.ZodOptional<z.ZodString>;
                }, "strip", z.ZodTypeAny, {
                    Name: string;
                    Id: string;
                    Type?: string | undefined;
                }, {
                    Name: string;
                    Id: string;
                    Type?: string | undefined;
                }>, "many">>;
                PlaylistItemId: z.ZodOptional<z.ZodString>;
                PremiereDate: z.ZodOptional<z.ZodString>;
                ProductionYear: z.ZodNumber;
                ProviderIds: z.ZodOptional<z.ZodObject<{
                    MusicBrainzAlbum: z.ZodOptional<z.ZodString>;
                    MusicBrainzAlbumArtist: z.ZodOptional<z.ZodString>;
                    MusicBrainzArtist: z.ZodOptional<z.ZodString>;
                    MusicBrainzRecording: z.ZodOptional<z.ZodString>;
                    MusicBrainzReleaseGroup: z.ZodOptional<z.ZodString>;
                    MusicBrainzTrack: z.ZodOptional<z.ZodString>;
                }, "strip", z.ZodTypeAny, {
                    MusicBrainzAlbum?: string | undefined;
                    MusicBrainzAlbumArtist?: string | undefined;
                    MusicBrainzArtist?: string | undefined;
                    MusicBrainzRecording?: string | undefined;
                    MusicBrainzReleaseGroup?: string | undefined;
                    MusicBrainzTrack?: string | undefined;
                }, {
                    MusicBrainzAlbum?: string | undefined;
                    MusicBrainzAlbumArtist?: string | undefined;
                    MusicBrainzArtist?: string | undefined;
                    MusicBrainzRecording?: string | undefined;
                    MusicBrainzReleaseGroup?: string | undefined;
                    MusicBrainzTrack?: string | undefined;
                }>>;
                RunTimeTicks: z.ZodNumber;
                ServerId: z.ZodString;
                SortName: z.ZodOptional<z.ZodString>;
                Tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                Type: z.ZodString;
                UserData: z.ZodOptional<z.ZodObject<{
                    IsFavorite: z.ZodBoolean;
                    Key: z.ZodString;
                    PlaybackPositionTicks: z.ZodNumber;
                    PlayCount: z.ZodNumber;
                    Played: z.ZodBoolean;
                }, "strip", z.ZodTypeAny, {
                    PlayCount: number;
                    IsFavorite: boolean;
                    Key: string;
                    PlaybackPositionTicks: number;
                    Played: boolean;
                }, {
                    PlayCount: number;
                    IsFavorite: boolean;
                    Key: string;
                    PlaybackPositionTicks: number;
                    Played: boolean;
                }>>;
            }, "strip", z.ZodTypeAny, {
                Name: string;
                Genres: string[];
                Album: string;
                MediaType: string;
                Id: string;
                AlbumArtist: string;
                AlbumArtists: {
                    Name: string;
                    Id: string;
                }[];
                AlbumPrimaryImageTag: string;
                ArtistItems: {
                    Name: string;
                    Id: string;
                }[];
                Artists: string[];
                ChannelId: null;
                DateCreated: string;
                ExternalUrls: {
                    Name: string;
                    Url: string;
                }[];
                GenreItems: {
                    Name: string;
                    Id: string;
                }[];
                ImageBlurHashes: {
                    Backdrop?: Record<string, string> | undefined;
                    Logo?: Record<string, string> | undefined;
                    Primary?: Record<string, string> | undefined;
                };
                ImageTags: {
                    Logo?: string | undefined;
                    Primary?: string | undefined;
                };
                IsFolder: boolean;
                LocationType: string;
                Type: string;
                ProductionYear: number;
                RunTimeTicks: number;
                ServerId: string;
                BackdropImageTags: string[];
                IndexNumber: number;
                MediaSources: {
                    Name: string;
                    Bitrate: number;
                    Id: string;
                    Type: string;
                    RunTimeTicks: number;
                    Container: string;
                    DefaultAudioStreamIndex: number;
                    ETag: string;
                    Formats: any[];
                    GenPtsInput: boolean;
                    IgnoreDts: boolean;
                    IgnoreIndex: boolean;
                    IsInfiniteStream: boolean;
                    IsRemote: boolean;
                    MediaAttachments: any[];
                    MediaStreams: {
                        Codec: string;
                        Level: number;
                        Type: string;
                        CodecTimeBase: string;
                        Index: number;
                        IsDefault: boolean;
                        IsExternal: boolean;
                        IsForced: boolean;
                        IsInterlaced: boolean;
                        IsTextSubtitleStream: boolean;
                        SupportsExternalStream: boolean;
                        TimeBase: string;
                        AspectRatio?: string | undefined;
                        BitDepth?: number | undefined;
                        BitRate?: number | undefined;
                        ChannelLayout?: string | undefined;
                        Channels?: number | undefined;
                        ColorSpace?: string | undefined;
                        Comment?: string | undefined;
                        DisplayTitle?: string | undefined;
                        Height?: number | undefined;
                        PixelFormat?: string | undefined;
                        Profile?: string | undefined;
                        RealFrameRate?: number | undefined;
                        RefFrames?: number | undefined;
                        SampleRate?: number | undefined;
                        Width?: number | undefined;
                    }[];
                    Path: string;
                    Protocol: string;
                    ReadAtNativeFramerate: boolean;
                    RequiresClosing: boolean;
                    RequiresLooping: boolean;
                    RequiresOpening: boolean;
                    Size: number;
                    SupportsDirectPlay: boolean;
                    SupportsDirectStream: boolean;
                    SupportsProbing: boolean;
                    SupportsTranscoding: boolean;
                    RequiredHttpHeaders?: any;
                }[];
                ParentIndexNumber: number;
                SortName?: string | undefined;
                ParentId?: string | undefined;
                Tags?: string[] | undefined;
                PlaylistItemId?: string | undefined;
                People?: {
                    Name: string;
                    Id: string;
                    Type?: string | undefined;
                }[] | undefined;
                PremiereDate?: string | undefined;
                ProviderIds?: {
                    MusicBrainzAlbum?: string | undefined;
                    MusicBrainzAlbumArtist?: string | undefined;
                    MusicBrainzArtist?: string | undefined;
                    MusicBrainzRecording?: string | undefined;
                    MusicBrainzReleaseGroup?: string | undefined;
                    MusicBrainzTrack?: string | undefined;
                } | undefined;
                AlbumId?: string | undefined;
                LUFS?: number | undefined;
                NormalizationGain?: number | undefined;
                UserData?: {
                    PlayCount: number;
                    IsFavorite: boolean;
                    Key: string;
                    PlaybackPositionTicks: number;
                    Played: boolean;
                } | undefined;
            }, {
                Name: string;
                Genres: string[];
                Album: string;
                MediaType: string;
                Id: string;
                AlbumArtist: string;
                AlbumArtists: {
                    Name: string;
                    Id: string;
                }[];
                AlbumPrimaryImageTag: string;
                ArtistItems: {
                    Name: string;
                    Id: string;
                }[];
                Artists: string[];
                ChannelId: null;
                DateCreated: string;
                ExternalUrls: {
                    Name: string;
                    Url: string;
                }[];
                GenreItems: {
                    Name: string;
                    Id: string;
                }[];
                ImageBlurHashes: {
                    Backdrop?: Record<string, string> | undefined;
                    Logo?: Record<string, string> | undefined;
                    Primary?: Record<string, string> | undefined;
                };
                ImageTags: {
                    Logo?: string | undefined;
                    Primary?: string | undefined;
                };
                IsFolder: boolean;
                LocationType: string;
                Type: string;
                ProductionYear: number;
                RunTimeTicks: number;
                ServerId: string;
                BackdropImageTags: string[];
                IndexNumber: number;
                MediaSources: {
                    Name: string;
                    Bitrate: number;
                    Id: string;
                    Type: string;
                    RunTimeTicks: number;
                    Container: string;
                    DefaultAudioStreamIndex: number;
                    ETag: string;
                    Formats: any[];
                    GenPtsInput: boolean;
                    IgnoreDts: boolean;
                    IgnoreIndex: boolean;
                    IsInfiniteStream: boolean;
                    IsRemote: boolean;
                    MediaAttachments: any[];
                    MediaStreams: {
                        Codec: string;
                        Level: number;
                        Type: string;
                        CodecTimeBase: string;
                        Index: number;
                        IsDefault: boolean;
                        IsExternal: boolean;
                        IsForced: boolean;
                        IsInterlaced: boolean;
                        IsTextSubtitleStream: boolean;
                        SupportsExternalStream: boolean;
                        TimeBase: string;
                        AspectRatio?: string | undefined;
                        BitDepth?: number | undefined;
                        BitRate?: number | undefined;
                        ChannelLayout?: string | undefined;
                        Channels?: number | undefined;
                        ColorSpace?: string | undefined;
                        Comment?: string | undefined;
                        DisplayTitle?: string | undefined;
                        Height?: number | undefined;
                        PixelFormat?: string | undefined;
                        Profile?: string | undefined;
                        RealFrameRate?: number | undefined;
                        RefFrames?: number | undefined;
                        SampleRate?: number | undefined;
                        Width?: number | undefined;
                    }[];
                    Path: string;
                    Protocol: string;
                    ReadAtNativeFramerate: boolean;
                    RequiresClosing: boolean;
                    RequiresLooping: boolean;
                    RequiresOpening: boolean;
                    Size: number;
                    SupportsDirectPlay: boolean;
                    SupportsDirectStream: boolean;
                    SupportsProbing: boolean;
                    SupportsTranscoding: boolean;
                    RequiredHttpHeaders?: any;
                }[];
                ParentIndexNumber: number;
                SortName?: string | undefined;
                ParentId?: string | undefined;
                Tags?: string[] | undefined;
                PlaylistItemId?: string | undefined;
                People?: {
                    Name: string;
                    Id: string;
                    Type?: string | undefined;
                }[] | undefined;
                PremiereDate?: string | undefined;
                ProviderIds?: {
                    MusicBrainzAlbum?: string | undefined;
                    MusicBrainzAlbumArtist?: string | undefined;
                    MusicBrainzArtist?: string | undefined;
                    MusicBrainzRecording?: string | undefined;
                    MusicBrainzReleaseGroup?: string | undefined;
                    MusicBrainzTrack?: string | undefined;
                } | undefined;
                AlbumId?: string | undefined;
                LUFS?: number | undefined;
                NormalizationGain?: number | undefined;
                UserData?: {
                    PlayCount: number;
                    IsFavorite: boolean;
                    Key: string;
                    PlaybackPositionTicks: number;
                    Played: boolean;
                } | undefined;
            }>;
            400: z.ZodObject<{
                errors: z.ZodObject<{
                    recursive: z.ZodArray<z.ZodString, "many">;
                }, "strip", z.ZodTypeAny, {
                    recursive: string[];
                }, {
                    recursive: string[];
                }>;
                status: z.ZodNumber;
                title: z.ZodString;
                traceId: z.ZodString;
                type: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                title: string;
                type: string;
                status: number;
                errors: {
                    recursive: string[];
                };
                traceId: string;
            }, {
                title: string;
                type: string;
                status: number;
                errors: {
                    recursive: string[];
                };
                traceId: string;
            }>;
        };
    };
    getSongList: {
        method: "GET";
        query: z.ZodObject<{} & {
            ContributingArtistIds: z.ZodOptional<z.ZodString>;
            EnableImageTypes: z.ZodOptional<z.ZodString>;
            EnableTotalRecordCount: z.ZodOptional<z.ZodBoolean>;
            EnableUserData: z.ZodOptional<z.ZodBoolean>;
            EnableUserDataTypes: z.ZodOptional<z.ZodBoolean>;
            ExcludeArtistIds: z.ZodOptional<z.ZodString>;
            ExcludeItemIds: z.ZodOptional<z.ZodString>;
            ExcludeItemTypes: z.ZodOptional<z.ZodString>;
            Fields: z.ZodOptional<z.ZodReadonly<z.ZodArray<z.ZodString, "many">>>;
            FolderId: z.ZodOptional<z.ZodString>;
            ImageTypeLimit: z.ZodOptional<z.ZodNumber>;
            IncludeArtists: z.ZodOptional<z.ZodBoolean>;
            IncludeGenres: z.ZodOptional<z.ZodBoolean>;
            IncludeItemTypes: z.ZodOptional<z.ZodString>;
            IncludeMedia: z.ZodOptional<z.ZodBoolean>;
            IncludePeople: z.ZodOptional<z.ZodBoolean>;
            IncludeStudios: z.ZodOptional<z.ZodBoolean>;
            Limit: z.ZodOptional<z.ZodNumber>;
            MediaTypes: z.ZodOptional<z.ZodString>;
            NameStartsWith: z.ZodOptional<z.ZodString>;
            ParentId: z.ZodOptional<z.ZodString>;
            Recursive: z.ZodOptional<z.ZodBoolean>;
            SortOrder: z.ZodOptional<z.ZodEnum<["Ascending", "Descending"]>>;
            StartIndex: z.ZodOptional<z.ZodNumber>;
            UserId: z.ZodOptional<z.ZodString>;
            AlbumArtistIds: z.ZodOptional<z.ZodString>;
            AlbumIds: z.ZodOptional<z.ZodString>;
            ArtistIds: z.ZodOptional<z.ZodString>;
            Filters: z.ZodOptional<z.ZodString>;
            GenreIds: z.ZodOptional<z.ZodString>;
            Genres: z.ZodOptional<z.ZodString>;
            IsFavorite: z.ZodOptional<z.ZodBoolean>;
            IsPlayed: z.ZodOptional<z.ZodBoolean>;
            SearchTerm: z.ZodOptional<z.ZodString>;
            SortBy: z.ZodOptional<z.ZodNativeEnum<{
                readonly ALBUM: "Album,SortName";
                readonly ALBUM_ARTIST: "AlbumArtist,Album,SortName";
                readonly ALBUM_DETAIL: "ParentIndexNumber,IndexNumber,SortName";
                readonly ARTIST: "Artist,Album,SortName";
                readonly COMMUNITY_RATING: "CommunityRating,SortName";
                readonly DURATION: "Runtime,AlbumArtist,Album,SortName";
                readonly NAME: "Name";
                readonly PLAY_COUNT: "PlayCount,SortName";
                readonly RANDOM: "Random,SortName";
                readonly RECENTLY_ADDED: "DateCreated,SortName";
                readonly RECENTLY_PLAYED: "DatePlayed,SortName";
                readonly RELEASE_DATE: "PremiereDate,AlbumArtist,Album,SortName";
            }>>;
            Tags: z.ZodOptional<z.ZodString>;
            Years: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            Limit?: number | undefined;
            Genres?: string | undefined;
            UserId?: string | undefined;
            AlbumArtistIds?: string | undefined;
            ArtistIds?: string | undefined;
            ContributingArtistIds?: string | undefined;
            EnableImageTypes?: string | undefined;
            EnableTotalRecordCount?: boolean | undefined;
            EnableUserData?: boolean | undefined;
            EnableUserDataTypes?: boolean | undefined;
            ExcludeArtistIds?: string | undefined;
            ExcludeItemIds?: string | undefined;
            ExcludeItemTypes?: string | undefined;
            Fields?: readonly string[] | undefined;
            FolderId?: string | undefined;
            ImageTypeLimit?: number | undefined;
            IncludeArtists?: boolean | undefined;
            IncludeGenres?: boolean | undefined;
            IncludeItemTypes?: string | undefined;
            IncludeMedia?: boolean | undefined;
            IncludePeople?: boolean | undefined;
            IncludeStudios?: boolean | undefined;
            IsFavorite?: boolean | undefined;
            MediaTypes?: string | undefined;
            NameStartsWith?: string | undefined;
            ParentId?: string | undefined;
            Recursive?: boolean | undefined;
            SearchTerm?: string | undefined;
            SortBy?: "Name" | "Album,SortName" | "Runtime,AlbumArtist,Album,SortName" | "Random,SortName" | "DateCreated,SortName" | "PremiereDate,AlbumArtist,Album,SortName" | "CommunityRating,SortName" | "AlbumArtist,Album,SortName" | "ParentIndexNumber,IndexNumber,SortName" | "Artist,Album,SortName" | "PlayCount,SortName" | "DatePlayed,SortName" | undefined;
            SortOrder?: "Ascending" | "Descending" | undefined;
            StartIndex?: number | undefined;
            Tags?: string | undefined;
            Years?: string | undefined;
            Filters?: string | undefined;
            GenreIds?: string | undefined;
            AlbumIds?: string | undefined;
            IsPlayed?: boolean | undefined;
        }, {
            Limit?: number | undefined;
            Genres?: string | undefined;
            UserId?: string | undefined;
            AlbumArtistIds?: string | undefined;
            ArtistIds?: string | undefined;
            ContributingArtistIds?: string | undefined;
            EnableImageTypes?: string | undefined;
            EnableTotalRecordCount?: boolean | undefined;
            EnableUserData?: boolean | undefined;
            EnableUserDataTypes?: boolean | undefined;
            ExcludeArtistIds?: string | undefined;
            ExcludeItemIds?: string | undefined;
            ExcludeItemTypes?: string | undefined;
            Fields?: readonly string[] | undefined;
            FolderId?: string | undefined;
            ImageTypeLimit?: number | undefined;
            IncludeArtists?: boolean | undefined;
            IncludeGenres?: boolean | undefined;
            IncludeItemTypes?: string | undefined;
            IncludeMedia?: boolean | undefined;
            IncludePeople?: boolean | undefined;
            IncludeStudios?: boolean | undefined;
            IsFavorite?: boolean | undefined;
            MediaTypes?: string | undefined;
            NameStartsWith?: string | undefined;
            ParentId?: string | undefined;
            Recursive?: boolean | undefined;
            SearchTerm?: string | undefined;
            SortBy?: "Name" | "Album,SortName" | "Runtime,AlbumArtist,Album,SortName" | "Random,SortName" | "DateCreated,SortName" | "PremiereDate,AlbumArtist,Album,SortName" | "CommunityRating,SortName" | "AlbumArtist,Album,SortName" | "ParentIndexNumber,IndexNumber,SortName" | "Artist,Album,SortName" | "PlayCount,SortName" | "DatePlayed,SortName" | undefined;
            SortOrder?: "Ascending" | "Descending" | undefined;
            StartIndex?: number | undefined;
            Tags?: string | undefined;
            Years?: string | undefined;
            Filters?: string | undefined;
            GenreIds?: string | undefined;
            AlbumIds?: string | undefined;
            IsPlayed?: boolean | undefined;
        }>;
        path: "users/:userId/items";
        responses: {
            200: z.ZodObject<{
                StartIndex: z.ZodNumber;
                TotalRecordCount: z.ZodNumber;
            } & {
                Items: z.ZodArray<z.ZodObject<{
                    Album: z.ZodString;
                    AlbumArtist: z.ZodString;
                    AlbumArtists: z.ZodArray<z.ZodObject<{
                        Id: z.ZodString;
                        Name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        Name: string;
                        Id: string;
                    }, {
                        Name: string;
                        Id: string;
                    }>, "many">;
                    AlbumId: z.ZodOptional<z.ZodString>;
                    AlbumPrimaryImageTag: z.ZodString;
                    ArtistItems: z.ZodArray<z.ZodObject<{
                        Id: z.ZodString;
                        Name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        Name: string;
                        Id: string;
                    }, {
                        Name: string;
                        Id: string;
                    }>, "many">;
                    Artists: z.ZodArray<z.ZodString, "many">;
                    BackdropImageTags: z.ZodArray<z.ZodString, "many">;
                    ChannelId: z.ZodNull;
                    DateCreated: z.ZodString;
                    ExternalUrls: z.ZodArray<z.ZodObject<{
                        Name: z.ZodString;
                        Url: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        Name: string;
                        Url: string;
                    }, {
                        Name: string;
                        Url: string;
                    }>, "many">;
                    GenreItems: z.ZodArray<z.ZodObject<{
                        Id: z.ZodString;
                        Name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        Name: string;
                        Id: string;
                    }, {
                        Name: string;
                        Id: string;
                    }>, "many">;
                    Genres: z.ZodArray<z.ZodString, "many">;
                    Id: z.ZodString;
                    ImageBlurHashes: z.ZodObject<{
                        Backdrop: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
                        Logo: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
                        Primary: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
                    }, "strip", z.ZodTypeAny, {
                        Backdrop?: Record<string, string> | undefined;
                        Logo?: Record<string, string> | undefined;
                        Primary?: Record<string, string> | undefined;
                    }, {
                        Backdrop?: Record<string, string> | undefined;
                        Logo?: Record<string, string> | undefined;
                        Primary?: Record<string, string> | undefined;
                    }>;
                    ImageTags: z.ZodObject<{
                        Logo: z.ZodOptional<z.ZodString>;
                        Primary: z.ZodOptional<z.ZodString>;
                    }, "strip", z.ZodTypeAny, {
                        Logo?: string | undefined;
                        Primary?: string | undefined;
                    }, {
                        Logo?: string | undefined;
                        Primary?: string | undefined;
                    }>;
                    IndexNumber: z.ZodNumber;
                    IsFolder: z.ZodBoolean;
                    LocationType: z.ZodString;
                    LUFS: z.ZodOptional<z.ZodNumber>;
                    MediaSources: z.ZodArray<z.ZodObject<{
                        Bitrate: z.ZodNumber;
                        Container: z.ZodString;
                        DefaultAudioStreamIndex: z.ZodNumber;
                        ETag: z.ZodString;
                        Formats: z.ZodArray<z.ZodAny, "many">;
                        GenPtsInput: z.ZodBoolean;
                        Id: z.ZodString;
                        IgnoreDts: z.ZodBoolean;
                        IgnoreIndex: z.ZodBoolean;
                        IsInfiniteStream: z.ZodBoolean;
                        IsRemote: z.ZodBoolean;
                        MediaAttachments: z.ZodArray<z.ZodAny, "many">;
                        MediaStreams: z.ZodArray<z.ZodObject<{
                            AspectRatio: z.ZodOptional<z.ZodString>;
                            BitDepth: z.ZodOptional<z.ZodNumber>;
                            BitRate: z.ZodOptional<z.ZodNumber>;
                            ChannelLayout: z.ZodOptional<z.ZodString>;
                            Channels: z.ZodOptional<z.ZodNumber>;
                            Codec: z.ZodString;
                            CodecTimeBase: z.ZodString;
                            ColorSpace: z.ZodOptional<z.ZodString>;
                            Comment: z.ZodOptional<z.ZodString>;
                            DisplayTitle: z.ZodOptional<z.ZodString>;
                            Height: z.ZodOptional<z.ZodNumber>;
                            Index: z.ZodNumber;
                            IsDefault: z.ZodBoolean;
                            IsExternal: z.ZodBoolean;
                            IsForced: z.ZodBoolean;
                            IsInterlaced: z.ZodBoolean;
                            IsTextSubtitleStream: z.ZodBoolean;
                            Level: z.ZodNumber;
                            PixelFormat: z.ZodOptional<z.ZodString>;
                            Profile: z.ZodOptional<z.ZodString>;
                            RealFrameRate: z.ZodOptional<z.ZodNumber>;
                            RefFrames: z.ZodOptional<z.ZodNumber>;
                            SampleRate: z.ZodOptional<z.ZodNumber>;
                            SupportsExternalStream: z.ZodBoolean;
                            TimeBase: z.ZodString;
                            Type: z.ZodString;
                            Width: z.ZodOptional<z.ZodNumber>;
                        }, "strip", z.ZodTypeAny, {
                            Codec: string;
                            Level: number;
                            Type: string;
                            CodecTimeBase: string;
                            Index: number;
                            IsDefault: boolean;
                            IsExternal: boolean;
                            IsForced: boolean;
                            IsInterlaced: boolean;
                            IsTextSubtitleStream: boolean;
                            SupportsExternalStream: boolean;
                            TimeBase: string;
                            AspectRatio?: string | undefined;
                            BitDepth?: number | undefined;
                            BitRate?: number | undefined;
                            ChannelLayout?: string | undefined;
                            Channels?: number | undefined;
                            ColorSpace?: string | undefined;
                            Comment?: string | undefined;
                            DisplayTitle?: string | undefined;
                            Height?: number | undefined;
                            PixelFormat?: string | undefined;
                            Profile?: string | undefined;
                            RealFrameRate?: number | undefined;
                            RefFrames?: number | undefined;
                            SampleRate?: number | undefined;
                            Width?: number | undefined;
                        }, {
                            Codec: string;
                            Level: number;
                            Type: string;
                            CodecTimeBase: string;
                            Index: number;
                            IsDefault: boolean;
                            IsExternal: boolean;
                            IsForced: boolean;
                            IsInterlaced: boolean;
                            IsTextSubtitleStream: boolean;
                            SupportsExternalStream: boolean;
                            TimeBase: string;
                            AspectRatio?: string | undefined;
                            BitDepth?: number | undefined;
                            BitRate?: number | undefined;
                            ChannelLayout?: string | undefined;
                            Channels?: number | undefined;
                            ColorSpace?: string | undefined;
                            Comment?: string | undefined;
                            DisplayTitle?: string | undefined;
                            Height?: number | undefined;
                            PixelFormat?: string | undefined;
                            Profile?: string | undefined;
                            RealFrameRate?: number | undefined;
                            RefFrames?: number | undefined;
                            SampleRate?: number | undefined;
                            Width?: number | undefined;
                        }>, "many">;
                        Name: z.ZodString;
                        Path: z.ZodString;
                        Protocol: z.ZodString;
                        ReadAtNativeFramerate: z.ZodBoolean;
                        RequiredHttpHeaders: z.ZodAny;
                        RequiresClosing: z.ZodBoolean;
                        RequiresLooping: z.ZodBoolean;
                        RequiresOpening: z.ZodBoolean;
                        RunTimeTicks: z.ZodNumber;
                        Size: z.ZodNumber;
                        SupportsDirectPlay: z.ZodBoolean;
                        SupportsDirectStream: z.ZodBoolean;
                        SupportsProbing: z.ZodBoolean;
                        SupportsTranscoding: z.ZodBoolean;
                        Type: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        Name: string;
                        Bitrate: number;
                        Id: string;
                        Type: string;
                        RunTimeTicks: number;
                        Container: string;
                        DefaultAudioStreamIndex: number;
                        ETag: string;
                        Formats: any[];
                        GenPtsInput: boolean;
                        IgnoreDts: boolean;
                        IgnoreIndex: boolean;
                        IsInfiniteStream: boolean;
                        IsRemote: boolean;
                        MediaAttachments: any[];
                        MediaStreams: {
                            Codec: string;
                            Level: number;
                            Type: string;
                            CodecTimeBase: string;
                            Index: number;
                            IsDefault: boolean;
                            IsExternal: boolean;
                            IsForced: boolean;
                            IsInterlaced: boolean;
                            IsTextSubtitleStream: boolean;
                            SupportsExternalStream: boolean;
                            TimeBase: string;
                            AspectRatio?: string | undefined;
                            BitDepth?: number | undefined;
                            BitRate?: number | undefined;
                            ChannelLayout?: string | undefined;
                            Channels?: number | undefined;
                            ColorSpace?: string | undefined;
                            Comment?: string | undefined;
                            DisplayTitle?: string | undefined;
                            Height?: number | undefined;
                            PixelFormat?: string | undefined;
                            Profile?: string | undefined;
                            RealFrameRate?: number | undefined;
                            RefFrames?: number | undefined;
                            SampleRate?: number | undefined;
                            Width?: number | undefined;
                        }[];
                        Path: string;
                        Protocol: string;
                        ReadAtNativeFramerate: boolean;
                        RequiresClosing: boolean;
                        RequiresLooping: boolean;
                        RequiresOpening: boolean;
                        Size: number;
                        SupportsDirectPlay: boolean;
                        SupportsDirectStream: boolean;
                        SupportsProbing: boolean;
                        SupportsTranscoding: boolean;
                        RequiredHttpHeaders?: any;
                    }, {
                        Name: string;
                        Bitrate: number;
                        Id: string;
                        Type: string;
                        RunTimeTicks: number;
                        Container: string;
                        DefaultAudioStreamIndex: number;
                        ETag: string;
                        Formats: any[];
                        GenPtsInput: boolean;
                        IgnoreDts: boolean;
                        IgnoreIndex: boolean;
                        IsInfiniteStream: boolean;
                        IsRemote: boolean;
                        MediaAttachments: any[];
                        MediaStreams: {
                            Codec: string;
                            Level: number;
                            Type: string;
                            CodecTimeBase: string;
                            Index: number;
                            IsDefault: boolean;
                            IsExternal: boolean;
                            IsForced: boolean;
                            IsInterlaced: boolean;
                            IsTextSubtitleStream: boolean;
                            SupportsExternalStream: boolean;
                            TimeBase: string;
                            AspectRatio?: string | undefined;
                            BitDepth?: number | undefined;
                            BitRate?: number | undefined;
                            ChannelLayout?: string | undefined;
                            Channels?: number | undefined;
                            ColorSpace?: string | undefined;
                            Comment?: string | undefined;
                            DisplayTitle?: string | undefined;
                            Height?: number | undefined;
                            PixelFormat?: string | undefined;
                            Profile?: string | undefined;
                            RealFrameRate?: number | undefined;
                            RefFrames?: number | undefined;
                            SampleRate?: number | undefined;
                            Width?: number | undefined;
                        }[];
                        Path: string;
                        Protocol: string;
                        ReadAtNativeFramerate: boolean;
                        RequiresClosing: boolean;
                        RequiresLooping: boolean;
                        RequiresOpening: boolean;
                        Size: number;
                        SupportsDirectPlay: boolean;
                        SupportsDirectStream: boolean;
                        SupportsProbing: boolean;
                        SupportsTranscoding: boolean;
                        RequiredHttpHeaders?: any;
                    }>, "many">;
                    MediaType: z.ZodString;
                    Name: z.ZodString;
                    NormalizationGain: z.ZodOptional<z.ZodNumber>;
                    ParentId: z.ZodOptional<z.ZodString>;
                    ParentIndexNumber: z.ZodNumber;
                    People: z.ZodOptional<z.ZodArray<z.ZodObject<{
                        Id: z.ZodString;
                        Name: z.ZodString;
                        Type: z.ZodOptional<z.ZodString>;
                    }, "strip", z.ZodTypeAny, {
                        Name: string;
                        Id: string;
                        Type?: string | undefined;
                    }, {
                        Name: string;
                        Id: string;
                        Type?: string | undefined;
                    }>, "many">>;
                    PlaylistItemId: z.ZodOptional<z.ZodString>;
                    PremiereDate: z.ZodOptional<z.ZodString>;
                    ProductionYear: z.ZodNumber;
                    ProviderIds: z.ZodOptional<z.ZodObject<{
                        MusicBrainzAlbum: z.ZodOptional<z.ZodString>;
                        MusicBrainzAlbumArtist: z.ZodOptional<z.ZodString>;
                        MusicBrainzArtist: z.ZodOptional<z.ZodString>;
                        MusicBrainzRecording: z.ZodOptional<z.ZodString>;
                        MusicBrainzReleaseGroup: z.ZodOptional<z.ZodString>;
                        MusicBrainzTrack: z.ZodOptional<z.ZodString>;
                    }, "strip", z.ZodTypeAny, {
                        MusicBrainzAlbum?: string | undefined;
                        MusicBrainzAlbumArtist?: string | undefined;
                        MusicBrainzArtist?: string | undefined;
                        MusicBrainzRecording?: string | undefined;
                        MusicBrainzReleaseGroup?: string | undefined;
                        MusicBrainzTrack?: string | undefined;
                    }, {
                        MusicBrainzAlbum?: string | undefined;
                        MusicBrainzAlbumArtist?: string | undefined;
                        MusicBrainzArtist?: string | undefined;
                        MusicBrainzRecording?: string | undefined;
                        MusicBrainzReleaseGroup?: string | undefined;
                        MusicBrainzTrack?: string | undefined;
                    }>>;
                    RunTimeTicks: z.ZodNumber;
                    ServerId: z.ZodString;
                    SortName: z.ZodOptional<z.ZodString>;
                    Tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                    Type: z.ZodString;
                    UserData: z.ZodOptional<z.ZodObject<{
                        IsFavorite: z.ZodBoolean;
                        Key: z.ZodString;
                        PlaybackPositionTicks: z.ZodNumber;
                        PlayCount: z.ZodNumber;
                        Played: z.ZodBoolean;
                    }, "strip", z.ZodTypeAny, {
                        PlayCount: number;
                        IsFavorite: boolean;
                        Key: string;
                        PlaybackPositionTicks: number;
                        Played: boolean;
                    }, {
                        PlayCount: number;
                        IsFavorite: boolean;
                        Key: string;
                        PlaybackPositionTicks: number;
                        Played: boolean;
                    }>>;
                }, "strip", z.ZodTypeAny, {
                    Name: string;
                    Genres: string[];
                    Album: string;
                    MediaType: string;
                    Id: string;
                    AlbumArtist: string;
                    AlbumArtists: {
                        Name: string;
                        Id: string;
                    }[];
                    AlbumPrimaryImageTag: string;
                    ArtistItems: {
                        Name: string;
                        Id: string;
                    }[];
                    Artists: string[];
                    ChannelId: null;
                    DateCreated: string;
                    ExternalUrls: {
                        Name: string;
                        Url: string;
                    }[];
                    GenreItems: {
                        Name: string;
                        Id: string;
                    }[];
                    ImageBlurHashes: {
                        Backdrop?: Record<string, string> | undefined;
                        Logo?: Record<string, string> | undefined;
                        Primary?: Record<string, string> | undefined;
                    };
                    ImageTags: {
                        Logo?: string | undefined;
                        Primary?: string | undefined;
                    };
                    IsFolder: boolean;
                    LocationType: string;
                    Type: string;
                    ProductionYear: number;
                    RunTimeTicks: number;
                    ServerId: string;
                    BackdropImageTags: string[];
                    IndexNumber: number;
                    MediaSources: {
                        Name: string;
                        Bitrate: number;
                        Id: string;
                        Type: string;
                        RunTimeTicks: number;
                        Container: string;
                        DefaultAudioStreamIndex: number;
                        ETag: string;
                        Formats: any[];
                        GenPtsInput: boolean;
                        IgnoreDts: boolean;
                        IgnoreIndex: boolean;
                        IsInfiniteStream: boolean;
                        IsRemote: boolean;
                        MediaAttachments: any[];
                        MediaStreams: {
                            Codec: string;
                            Level: number;
                            Type: string;
                            CodecTimeBase: string;
                            Index: number;
                            IsDefault: boolean;
                            IsExternal: boolean;
                            IsForced: boolean;
                            IsInterlaced: boolean;
                            IsTextSubtitleStream: boolean;
                            SupportsExternalStream: boolean;
                            TimeBase: string;
                            AspectRatio?: string | undefined;
                            BitDepth?: number | undefined;
                            BitRate?: number | undefined;
                            ChannelLayout?: string | undefined;
                            Channels?: number | undefined;
                            ColorSpace?: string | undefined;
                            Comment?: string | undefined;
                            DisplayTitle?: string | undefined;
                            Height?: number | undefined;
                            PixelFormat?: string | undefined;
                            Profile?: string | undefined;
                            RealFrameRate?: number | undefined;
                            RefFrames?: number | undefined;
                            SampleRate?: number | undefined;
                            Width?: number | undefined;
                        }[];
                        Path: string;
                        Protocol: string;
                        ReadAtNativeFramerate: boolean;
                        RequiresClosing: boolean;
                        RequiresLooping: boolean;
                        RequiresOpening: boolean;
                        Size: number;
                        SupportsDirectPlay: boolean;
                        SupportsDirectStream: boolean;
                        SupportsProbing: boolean;
                        SupportsTranscoding: boolean;
                        RequiredHttpHeaders?: any;
                    }[];
                    ParentIndexNumber: number;
                    SortName?: string | undefined;
                    ParentId?: string | undefined;
                    Tags?: string[] | undefined;
                    PlaylistItemId?: string | undefined;
                    People?: {
                        Name: string;
                        Id: string;
                        Type?: string | undefined;
                    }[] | undefined;
                    PremiereDate?: string | undefined;
                    ProviderIds?: {
                        MusicBrainzAlbum?: string | undefined;
                        MusicBrainzAlbumArtist?: string | undefined;
                        MusicBrainzArtist?: string | undefined;
                        MusicBrainzRecording?: string | undefined;
                        MusicBrainzReleaseGroup?: string | undefined;
                        MusicBrainzTrack?: string | undefined;
                    } | undefined;
                    AlbumId?: string | undefined;
                    LUFS?: number | undefined;
                    NormalizationGain?: number | undefined;
                    UserData?: {
                        PlayCount: number;
                        IsFavorite: boolean;
                        Key: string;
                        PlaybackPositionTicks: number;
                        Played: boolean;
                    } | undefined;
                }, {
                    Name: string;
                    Genres: string[];
                    Album: string;
                    MediaType: string;
                    Id: string;
                    AlbumArtist: string;
                    AlbumArtists: {
                        Name: string;
                        Id: string;
                    }[];
                    AlbumPrimaryImageTag: string;
                    ArtistItems: {
                        Name: string;
                        Id: string;
                    }[];
                    Artists: string[];
                    ChannelId: null;
                    DateCreated: string;
                    ExternalUrls: {
                        Name: string;
                        Url: string;
                    }[];
                    GenreItems: {
                        Name: string;
                        Id: string;
                    }[];
                    ImageBlurHashes: {
                        Backdrop?: Record<string, string> | undefined;
                        Logo?: Record<string, string> | undefined;
                        Primary?: Record<string, string> | undefined;
                    };
                    ImageTags: {
                        Logo?: string | undefined;
                        Primary?: string | undefined;
                    };
                    IsFolder: boolean;
                    LocationType: string;
                    Type: string;
                    ProductionYear: number;
                    RunTimeTicks: number;
                    ServerId: string;
                    BackdropImageTags: string[];
                    IndexNumber: number;
                    MediaSources: {
                        Name: string;
                        Bitrate: number;
                        Id: string;
                        Type: string;
                        RunTimeTicks: number;
                        Container: string;
                        DefaultAudioStreamIndex: number;
                        ETag: string;
                        Formats: any[];
                        GenPtsInput: boolean;
                        IgnoreDts: boolean;
                        IgnoreIndex: boolean;
                        IsInfiniteStream: boolean;
                        IsRemote: boolean;
                        MediaAttachments: any[];
                        MediaStreams: {
                            Codec: string;
                            Level: number;
                            Type: string;
                            CodecTimeBase: string;
                            Index: number;
                            IsDefault: boolean;
                            IsExternal: boolean;
                            IsForced: boolean;
                            IsInterlaced: boolean;
                            IsTextSubtitleStream: boolean;
                            SupportsExternalStream: boolean;
                            TimeBase: string;
                            AspectRatio?: string | undefined;
                            BitDepth?: number | undefined;
                            BitRate?: number | undefined;
                            ChannelLayout?: string | undefined;
                            Channels?: number | undefined;
                            ColorSpace?: string | undefined;
                            Comment?: string | undefined;
                            DisplayTitle?: string | undefined;
                            Height?: number | undefined;
                            PixelFormat?: string | undefined;
                            Profile?: string | undefined;
                            RealFrameRate?: number | undefined;
                            RefFrames?: number | undefined;
                            SampleRate?: number | undefined;
                            Width?: number | undefined;
                        }[];
                        Path: string;
                        Protocol: string;
                        ReadAtNativeFramerate: boolean;
                        RequiresClosing: boolean;
                        RequiresLooping: boolean;
                        RequiresOpening: boolean;
                        Size: number;
                        SupportsDirectPlay: boolean;
                        SupportsDirectStream: boolean;
                        SupportsProbing: boolean;
                        SupportsTranscoding: boolean;
                        RequiredHttpHeaders?: any;
                    }[];
                    ParentIndexNumber: number;
                    SortName?: string | undefined;
                    ParentId?: string | undefined;
                    Tags?: string[] | undefined;
                    PlaylistItemId?: string | undefined;
                    People?: {
                        Name: string;
                        Id: string;
                        Type?: string | undefined;
                    }[] | undefined;
                    PremiereDate?: string | undefined;
                    ProviderIds?: {
                        MusicBrainzAlbum?: string | undefined;
                        MusicBrainzAlbumArtist?: string | undefined;
                        MusicBrainzArtist?: string | undefined;
                        MusicBrainzRecording?: string | undefined;
                        MusicBrainzReleaseGroup?: string | undefined;
                        MusicBrainzTrack?: string | undefined;
                    } | undefined;
                    AlbumId?: string | undefined;
                    LUFS?: number | undefined;
                    NormalizationGain?: number | undefined;
                    UserData?: {
                        PlayCount: number;
                        IsFavorite: boolean;
                        Key: string;
                        PlaybackPositionTicks: number;
                        Played: boolean;
                    } | undefined;
                }>, "many">;
            }, "strip", z.ZodTypeAny, {
                StartIndex: number;
                TotalRecordCount: number;
                Items: {
                    Name: string;
                    Genres: string[];
                    Album: string;
                    MediaType: string;
                    Id: string;
                    AlbumArtist: string;
                    AlbumArtists: {
                        Name: string;
                        Id: string;
                    }[];
                    AlbumPrimaryImageTag: string;
                    ArtistItems: {
                        Name: string;
                        Id: string;
                    }[];
                    Artists: string[];
                    ChannelId: null;
                    DateCreated: string;
                    ExternalUrls: {
                        Name: string;
                        Url: string;
                    }[];
                    GenreItems: {
                        Name: string;
                        Id: string;
                    }[];
                    ImageBlurHashes: {
                        Backdrop?: Record<string, string> | undefined;
                        Logo?: Record<string, string> | undefined;
                        Primary?: Record<string, string> | undefined;
                    };
                    ImageTags: {
                        Logo?: string | undefined;
                        Primary?: string | undefined;
                    };
                    IsFolder: boolean;
                    LocationType: string;
                    Type: string;
                    ProductionYear: number;
                    RunTimeTicks: number;
                    ServerId: string;
                    BackdropImageTags: string[];
                    IndexNumber: number;
                    MediaSources: {
                        Name: string;
                        Bitrate: number;
                        Id: string;
                        Type: string;
                        RunTimeTicks: number;
                        Container: string;
                        DefaultAudioStreamIndex: number;
                        ETag: string;
                        Formats: any[];
                        GenPtsInput: boolean;
                        IgnoreDts: boolean;
                        IgnoreIndex: boolean;
                        IsInfiniteStream: boolean;
                        IsRemote: boolean;
                        MediaAttachments: any[];
                        MediaStreams: {
                            Codec: string;
                            Level: number;
                            Type: string;
                            CodecTimeBase: string;
                            Index: number;
                            IsDefault: boolean;
                            IsExternal: boolean;
                            IsForced: boolean;
                            IsInterlaced: boolean;
                            IsTextSubtitleStream: boolean;
                            SupportsExternalStream: boolean;
                            TimeBase: string;
                            AspectRatio?: string | undefined;
                            BitDepth?: number | undefined;
                            BitRate?: number | undefined;
                            ChannelLayout?: string | undefined;
                            Channels?: number | undefined;
                            ColorSpace?: string | undefined;
                            Comment?: string | undefined;
                            DisplayTitle?: string | undefined;
                            Height?: number | undefined;
                            PixelFormat?: string | undefined;
                            Profile?: string | undefined;
                            RealFrameRate?: number | undefined;
                            RefFrames?: number | undefined;
                            SampleRate?: number | undefined;
                            Width?: number | undefined;
                        }[];
                        Path: string;
                        Protocol: string;
                        ReadAtNativeFramerate: boolean;
                        RequiresClosing: boolean;
                        RequiresLooping: boolean;
                        RequiresOpening: boolean;
                        Size: number;
                        SupportsDirectPlay: boolean;
                        SupportsDirectStream: boolean;
                        SupportsProbing: boolean;
                        SupportsTranscoding: boolean;
                        RequiredHttpHeaders?: any;
                    }[];
                    ParentIndexNumber: number;
                    SortName?: string | undefined;
                    ParentId?: string | undefined;
                    Tags?: string[] | undefined;
                    PlaylistItemId?: string | undefined;
                    People?: {
                        Name: string;
                        Id: string;
                        Type?: string | undefined;
                    }[] | undefined;
                    PremiereDate?: string | undefined;
                    ProviderIds?: {
                        MusicBrainzAlbum?: string | undefined;
                        MusicBrainzAlbumArtist?: string | undefined;
                        MusicBrainzArtist?: string | undefined;
                        MusicBrainzRecording?: string | undefined;
                        MusicBrainzReleaseGroup?: string | undefined;
                        MusicBrainzTrack?: string | undefined;
                    } | undefined;
                    AlbumId?: string | undefined;
                    LUFS?: number | undefined;
                    NormalizationGain?: number | undefined;
                    UserData?: {
                        PlayCount: number;
                        IsFavorite: boolean;
                        Key: string;
                        PlaybackPositionTicks: number;
                        Played: boolean;
                    } | undefined;
                }[];
            }, {
                StartIndex: number;
                TotalRecordCount: number;
                Items: {
                    Name: string;
                    Genres: string[];
                    Album: string;
                    MediaType: string;
                    Id: string;
                    AlbumArtist: string;
                    AlbumArtists: {
                        Name: string;
                        Id: string;
                    }[];
                    AlbumPrimaryImageTag: string;
                    ArtistItems: {
                        Name: string;
                        Id: string;
                    }[];
                    Artists: string[];
                    ChannelId: null;
                    DateCreated: string;
                    ExternalUrls: {
                        Name: string;
                        Url: string;
                    }[];
                    GenreItems: {
                        Name: string;
                        Id: string;
                    }[];
                    ImageBlurHashes: {
                        Backdrop?: Record<string, string> | undefined;
                        Logo?: Record<string, string> | undefined;
                        Primary?: Record<string, string> | undefined;
                    };
                    ImageTags: {
                        Logo?: string | undefined;
                        Primary?: string | undefined;
                    };
                    IsFolder: boolean;
                    LocationType: string;
                    Type: string;
                    ProductionYear: number;
                    RunTimeTicks: number;
                    ServerId: string;
                    BackdropImageTags: string[];
                    IndexNumber: number;
                    MediaSources: {
                        Name: string;
                        Bitrate: number;
                        Id: string;
                        Type: string;
                        RunTimeTicks: number;
                        Container: string;
                        DefaultAudioStreamIndex: number;
                        ETag: string;
                        Formats: any[];
                        GenPtsInput: boolean;
                        IgnoreDts: boolean;
                        IgnoreIndex: boolean;
                        IsInfiniteStream: boolean;
                        IsRemote: boolean;
                        MediaAttachments: any[];
                        MediaStreams: {
                            Codec: string;
                            Level: number;
                            Type: string;
                            CodecTimeBase: string;
                            Index: number;
                            IsDefault: boolean;
                            IsExternal: boolean;
                            IsForced: boolean;
                            IsInterlaced: boolean;
                            IsTextSubtitleStream: boolean;
                            SupportsExternalStream: boolean;
                            TimeBase: string;
                            AspectRatio?: string | undefined;
                            BitDepth?: number | undefined;
                            BitRate?: number | undefined;
                            ChannelLayout?: string | undefined;
                            Channels?: number | undefined;
                            ColorSpace?: string | undefined;
                            Comment?: string | undefined;
                            DisplayTitle?: string | undefined;
                            Height?: number | undefined;
                            PixelFormat?: string | undefined;
                            Profile?: string | undefined;
                            RealFrameRate?: number | undefined;
                            RefFrames?: number | undefined;
                            SampleRate?: number | undefined;
                            Width?: number | undefined;
                        }[];
                        Path: string;
                        Protocol: string;
                        ReadAtNativeFramerate: boolean;
                        RequiresClosing: boolean;
                        RequiresLooping: boolean;
                        RequiresOpening: boolean;
                        Size: number;
                        SupportsDirectPlay: boolean;
                        SupportsDirectStream: boolean;
                        SupportsProbing: boolean;
                        SupportsTranscoding: boolean;
                        RequiredHttpHeaders?: any;
                    }[];
                    ParentIndexNumber: number;
                    SortName?: string | undefined;
                    ParentId?: string | undefined;
                    Tags?: string[] | undefined;
                    PlaylistItemId?: string | undefined;
                    People?: {
                        Name: string;
                        Id: string;
                        Type?: string | undefined;
                    }[] | undefined;
                    PremiereDate?: string | undefined;
                    ProviderIds?: {
                        MusicBrainzAlbum?: string | undefined;
                        MusicBrainzAlbumArtist?: string | undefined;
                        MusicBrainzArtist?: string | undefined;
                        MusicBrainzRecording?: string | undefined;
                        MusicBrainzReleaseGroup?: string | undefined;
                        MusicBrainzTrack?: string | undefined;
                    } | undefined;
                    AlbumId?: string | undefined;
                    LUFS?: number | undefined;
                    NormalizationGain?: number | undefined;
                    UserData?: {
                        PlayCount: number;
                        IsFavorite: boolean;
                        Key: string;
                        PlaybackPositionTicks: number;
                        Played: boolean;
                    } | undefined;
                }[];
            }>;
            400: z.ZodObject<{
                errors: z.ZodObject<{
                    recursive: z.ZodArray<z.ZodString, "many">;
                }, "strip", z.ZodTypeAny, {
                    recursive: string[];
                }, {
                    recursive: string[];
                }>;
                status: z.ZodNumber;
                title: z.ZodString;
                traceId: z.ZodString;
                type: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                title: string;
                type: string;
                status: number;
                errors: {
                    recursive: string[];
                };
                traceId: string;
            }, {
                title: string;
                type: string;
                status: number;
                errors: {
                    recursive: string[];
                };
                traceId: string;
            }>;
        };
    };
    getSongLyrics: {
        method: "GET";
        path: "audio/:id/Lyrics";
        responses: {
            200: z.ZodObject<{
                Lyrics: z.ZodArray<z.ZodObject<{
                    Start: z.ZodOptional<z.ZodNumber>;
                    Text: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    Text: string;
                    Start?: number | undefined;
                }, {
                    Text: string;
                    Start?: number | undefined;
                }>, "many">;
            }, "strip", z.ZodTypeAny, {
                Lyrics: {
                    Text: string;
                    Start?: number | undefined;
                }[];
            }, {
                Lyrics: {
                    Text: string;
                    Start?: number | undefined;
                }[];
            }>;
            404: z.ZodObject<{
                errors: z.ZodObject<{
                    recursive: z.ZodArray<z.ZodString, "many">;
                }, "strip", z.ZodTypeAny, {
                    recursive: string[];
                }, {
                    recursive: string[];
                }>;
                status: z.ZodNumber;
                title: z.ZodString;
                traceId: z.ZodString;
                type: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                title: string;
                type: string;
                status: number;
                errors: {
                    recursive: string[];
                };
                traceId: string;
            }, {
                title: string;
                type: string;
                status: number;
                errors: {
                    recursive: string[];
                };
                traceId: string;
            }>;
        };
    };
    getStudioList: {
        method: "GET";
        query: z.ZodObject<{} & {
            AlbumArtistIds: z.ZodOptional<z.ZodString>;
            ArtistIds: z.ZodOptional<z.ZodString>;
            ContributingArtistIds: z.ZodOptional<z.ZodString>;
            EnableImageTypes: z.ZodOptional<z.ZodString>;
            EnableTotalRecordCount: z.ZodOptional<z.ZodBoolean>;
            EnableUserData: z.ZodOptional<z.ZodBoolean>;
            EnableUserDataTypes: z.ZodOptional<z.ZodBoolean>;
            ExcludeArtistIds: z.ZodOptional<z.ZodString>;
            ExcludeItemIds: z.ZodOptional<z.ZodString>;
            ExcludeItemTypes: z.ZodOptional<z.ZodString>;
            Fields: z.ZodOptional<z.ZodReadonly<z.ZodArray<z.ZodString, "many">>>;
            FolderId: z.ZodOptional<z.ZodString>;
            ImageTypeLimit: z.ZodOptional<z.ZodNumber>;
            IncludeArtists: z.ZodOptional<z.ZodBoolean>;
            IncludeGenres: z.ZodOptional<z.ZodBoolean>;
            IncludeItemTypes: z.ZodOptional<z.ZodString>;
            IncludeMedia: z.ZodOptional<z.ZodBoolean>;
            IncludePeople: z.ZodOptional<z.ZodBoolean>;
            IncludeStudios: z.ZodOptional<z.ZodBoolean>;
            IsFavorite: z.ZodOptional<z.ZodBoolean>;
            Limit: z.ZodOptional<z.ZodNumber>;
            MediaTypes: z.ZodOptional<z.ZodString>;
            NameStartsWith: z.ZodOptional<z.ZodString>;
            ParentId: z.ZodOptional<z.ZodString>;
            Recursive: z.ZodOptional<z.ZodBoolean>;
            SearchTerm: z.ZodOptional<z.ZodString>;
            SortBy: z.ZodOptional<z.ZodString>;
            SortOrder: z.ZodOptional<z.ZodEnum<["Ascending", "Descending"]>>;
            StartIndex: z.ZodOptional<z.ZodNumber>;
            Tags: z.ZodOptional<z.ZodString>;
            UserId: z.ZodOptional<z.ZodString>;
            Years: z.ZodOptional<z.ZodString>;
            NameStartsWithOrGreater: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            Limit?: number | undefined;
            UserId?: string | undefined;
            AlbumArtistIds?: string | undefined;
            ArtistIds?: string | undefined;
            ContributingArtistIds?: string | undefined;
            EnableImageTypes?: string | undefined;
            EnableTotalRecordCount?: boolean | undefined;
            EnableUserData?: boolean | undefined;
            EnableUserDataTypes?: boolean | undefined;
            ExcludeArtistIds?: string | undefined;
            ExcludeItemIds?: string | undefined;
            ExcludeItemTypes?: string | undefined;
            Fields?: readonly string[] | undefined;
            FolderId?: string | undefined;
            ImageTypeLimit?: number | undefined;
            IncludeArtists?: boolean | undefined;
            IncludeGenres?: boolean | undefined;
            IncludeItemTypes?: string | undefined;
            IncludeMedia?: boolean | undefined;
            IncludePeople?: boolean | undefined;
            IncludeStudios?: boolean | undefined;
            IsFavorite?: boolean | undefined;
            MediaTypes?: string | undefined;
            NameStartsWith?: string | undefined;
            ParentId?: string | undefined;
            Recursive?: boolean | undefined;
            SearchTerm?: string | undefined;
            SortBy?: string | undefined;
            SortOrder?: "Ascending" | "Descending" | undefined;
            StartIndex?: number | undefined;
            Tags?: string | undefined;
            Years?: string | undefined;
            NameStartsWithOrGreater?: string | undefined;
        }, {
            Limit?: number | undefined;
            UserId?: string | undefined;
            AlbumArtistIds?: string | undefined;
            ArtistIds?: string | undefined;
            ContributingArtistIds?: string | undefined;
            EnableImageTypes?: string | undefined;
            EnableTotalRecordCount?: boolean | undefined;
            EnableUserData?: boolean | undefined;
            EnableUserDataTypes?: boolean | undefined;
            ExcludeArtistIds?: string | undefined;
            ExcludeItemIds?: string | undefined;
            ExcludeItemTypes?: string | undefined;
            Fields?: readonly string[] | undefined;
            FolderId?: string | undefined;
            ImageTypeLimit?: number | undefined;
            IncludeArtists?: boolean | undefined;
            IncludeGenres?: boolean | undefined;
            IncludeItemTypes?: string | undefined;
            IncludeMedia?: boolean | undefined;
            IncludePeople?: boolean | undefined;
            IncludeStudios?: boolean | undefined;
            IsFavorite?: boolean | undefined;
            MediaTypes?: string | undefined;
            NameStartsWith?: string | undefined;
            ParentId?: string | undefined;
            Recursive?: boolean | undefined;
            SearchTerm?: string | undefined;
            SortBy?: string | undefined;
            SortOrder?: "Ascending" | "Descending" | undefined;
            StartIndex?: number | undefined;
            Tags?: string | undefined;
            Years?: string | undefined;
            NameStartsWithOrGreater?: string | undefined;
        }>;
        path: "studios";
        responses: {
            200: z.ZodObject<{
                Items: z.ZodArray<z.ZodObject<{
                    Id: z.ZodString;
                    Name: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    Name: string;
                    Id: string;
                }, {
                    Name: string;
                    Id: string;
                }>, "many">;
            }, "strip", z.ZodTypeAny, {
                Items: {
                    Name: string;
                    Id: string;
                }[];
            }, {
                Items: {
                    Name: string;
                    Id: string;
                }[];
            }>;
            400: z.ZodObject<{
                errors: z.ZodObject<{
                    recursive: z.ZodArray<z.ZodString, "many">;
                }, "strip", z.ZodTypeAny, {
                    recursive: string[];
                }, {
                    recursive: string[];
                }>;
                status: z.ZodNumber;
                title: z.ZodString;
                traceId: z.ZodString;
                type: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                title: string;
                type: string;
                status: number;
                errors: {
                    recursive: string[];
                };
                traceId: string;
            }, {
                title: string;
                type: string;
                status: number;
                errors: {
                    recursive: string[];
                };
                traceId: string;
            }>;
        };
    };
    getTopSongsList: {
        method: "GET";
        query: z.ZodObject<{} & {
            ContributingArtistIds: z.ZodOptional<z.ZodString>;
            EnableImageTypes: z.ZodOptional<z.ZodString>;
            EnableTotalRecordCount: z.ZodOptional<z.ZodBoolean>;
            EnableUserData: z.ZodOptional<z.ZodBoolean>;
            EnableUserDataTypes: z.ZodOptional<z.ZodBoolean>;
            ExcludeArtistIds: z.ZodOptional<z.ZodString>;
            ExcludeItemIds: z.ZodOptional<z.ZodString>;
            ExcludeItemTypes: z.ZodOptional<z.ZodString>;
            Fields: z.ZodOptional<z.ZodReadonly<z.ZodArray<z.ZodString, "many">>>;
            FolderId: z.ZodOptional<z.ZodString>;
            ImageTypeLimit: z.ZodOptional<z.ZodNumber>;
            IncludeArtists: z.ZodOptional<z.ZodBoolean>;
            IncludeGenres: z.ZodOptional<z.ZodBoolean>;
            IncludeItemTypes: z.ZodOptional<z.ZodString>;
            IncludeMedia: z.ZodOptional<z.ZodBoolean>;
            IncludePeople: z.ZodOptional<z.ZodBoolean>;
            IncludeStudios: z.ZodOptional<z.ZodBoolean>;
            Limit: z.ZodOptional<z.ZodNumber>;
            MediaTypes: z.ZodOptional<z.ZodString>;
            NameStartsWith: z.ZodOptional<z.ZodString>;
            ParentId: z.ZodOptional<z.ZodString>;
            Recursive: z.ZodOptional<z.ZodBoolean>;
            SortOrder: z.ZodOptional<z.ZodEnum<["Ascending", "Descending"]>>;
            StartIndex: z.ZodOptional<z.ZodNumber>;
            UserId: z.ZodOptional<z.ZodString>;
            AlbumArtistIds: z.ZodOptional<z.ZodString>;
            AlbumIds: z.ZodOptional<z.ZodString>;
            ArtistIds: z.ZodOptional<z.ZodString>;
            Filters: z.ZodOptional<z.ZodString>;
            GenreIds: z.ZodOptional<z.ZodString>;
            Genres: z.ZodOptional<z.ZodString>;
            IsFavorite: z.ZodOptional<z.ZodBoolean>;
            IsPlayed: z.ZodOptional<z.ZodBoolean>;
            SearchTerm: z.ZodOptional<z.ZodString>;
            SortBy: z.ZodOptional<z.ZodNativeEnum<{
                readonly ALBUM: "Album,SortName";
                readonly ALBUM_ARTIST: "AlbumArtist,Album,SortName";
                readonly ALBUM_DETAIL: "ParentIndexNumber,IndexNumber,SortName";
                readonly ARTIST: "Artist,Album,SortName";
                readonly COMMUNITY_RATING: "CommunityRating,SortName";
                readonly DURATION: "Runtime,AlbumArtist,Album,SortName";
                readonly NAME: "Name";
                readonly PLAY_COUNT: "PlayCount,SortName";
                readonly RANDOM: "Random,SortName";
                readonly RECENTLY_ADDED: "DateCreated,SortName";
                readonly RECENTLY_PLAYED: "DatePlayed,SortName";
                readonly RELEASE_DATE: "PremiereDate,AlbumArtist,Album,SortName";
            }>>;
            Tags: z.ZodOptional<z.ZodString>;
            Years: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            Limit?: number | undefined;
            Genres?: string | undefined;
            UserId?: string | undefined;
            AlbumArtistIds?: string | undefined;
            ArtistIds?: string | undefined;
            ContributingArtistIds?: string | undefined;
            EnableImageTypes?: string | undefined;
            EnableTotalRecordCount?: boolean | undefined;
            EnableUserData?: boolean | undefined;
            EnableUserDataTypes?: boolean | undefined;
            ExcludeArtistIds?: string | undefined;
            ExcludeItemIds?: string | undefined;
            ExcludeItemTypes?: string | undefined;
            Fields?: readonly string[] | undefined;
            FolderId?: string | undefined;
            ImageTypeLimit?: number | undefined;
            IncludeArtists?: boolean | undefined;
            IncludeGenres?: boolean | undefined;
            IncludeItemTypes?: string | undefined;
            IncludeMedia?: boolean | undefined;
            IncludePeople?: boolean | undefined;
            IncludeStudios?: boolean | undefined;
            IsFavorite?: boolean | undefined;
            MediaTypes?: string | undefined;
            NameStartsWith?: string | undefined;
            ParentId?: string | undefined;
            Recursive?: boolean | undefined;
            SearchTerm?: string | undefined;
            SortBy?: "Name" | "Album,SortName" | "Runtime,AlbumArtist,Album,SortName" | "Random,SortName" | "DateCreated,SortName" | "PremiereDate,AlbumArtist,Album,SortName" | "CommunityRating,SortName" | "AlbumArtist,Album,SortName" | "ParentIndexNumber,IndexNumber,SortName" | "Artist,Album,SortName" | "PlayCount,SortName" | "DatePlayed,SortName" | undefined;
            SortOrder?: "Ascending" | "Descending" | undefined;
            StartIndex?: number | undefined;
            Tags?: string | undefined;
            Years?: string | undefined;
            Filters?: string | undefined;
            GenreIds?: string | undefined;
            AlbumIds?: string | undefined;
            IsPlayed?: boolean | undefined;
        }, {
            Limit?: number | undefined;
            Genres?: string | undefined;
            UserId?: string | undefined;
            AlbumArtistIds?: string | undefined;
            ArtistIds?: string | undefined;
            ContributingArtistIds?: string | undefined;
            EnableImageTypes?: string | undefined;
            EnableTotalRecordCount?: boolean | undefined;
            EnableUserData?: boolean | undefined;
            EnableUserDataTypes?: boolean | undefined;
            ExcludeArtistIds?: string | undefined;
            ExcludeItemIds?: string | undefined;
            ExcludeItemTypes?: string | undefined;
            Fields?: readonly string[] | undefined;
            FolderId?: string | undefined;
            ImageTypeLimit?: number | undefined;
            IncludeArtists?: boolean | undefined;
            IncludeGenres?: boolean | undefined;
            IncludeItemTypes?: string | undefined;
            IncludeMedia?: boolean | undefined;
            IncludePeople?: boolean | undefined;
            IncludeStudios?: boolean | undefined;
            IsFavorite?: boolean | undefined;
            MediaTypes?: string | undefined;
            NameStartsWith?: string | undefined;
            ParentId?: string | undefined;
            Recursive?: boolean | undefined;
            SearchTerm?: string | undefined;
            SortBy?: "Name" | "Album,SortName" | "Runtime,AlbumArtist,Album,SortName" | "Random,SortName" | "DateCreated,SortName" | "PremiereDate,AlbumArtist,Album,SortName" | "CommunityRating,SortName" | "AlbumArtist,Album,SortName" | "ParentIndexNumber,IndexNumber,SortName" | "Artist,Album,SortName" | "PlayCount,SortName" | "DatePlayed,SortName" | undefined;
            SortOrder?: "Ascending" | "Descending" | undefined;
            StartIndex?: number | undefined;
            Tags?: string | undefined;
            Years?: string | undefined;
            Filters?: string | undefined;
            GenreIds?: string | undefined;
            AlbumIds?: string | undefined;
            IsPlayed?: boolean | undefined;
        }>;
        path: "users/:userId/items";
        responses: {
            200: z.ZodObject<{
                StartIndex: z.ZodNumber;
                TotalRecordCount: z.ZodNumber;
            } & {
                Items: z.ZodArray<z.ZodObject<{
                    Album: z.ZodString;
                    AlbumArtist: z.ZodString;
                    AlbumArtists: z.ZodArray<z.ZodObject<{
                        Id: z.ZodString;
                        Name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        Name: string;
                        Id: string;
                    }, {
                        Name: string;
                        Id: string;
                    }>, "many">;
                    AlbumId: z.ZodOptional<z.ZodString>;
                    AlbumPrimaryImageTag: z.ZodString;
                    ArtistItems: z.ZodArray<z.ZodObject<{
                        Id: z.ZodString;
                        Name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        Name: string;
                        Id: string;
                    }, {
                        Name: string;
                        Id: string;
                    }>, "many">;
                    Artists: z.ZodArray<z.ZodString, "many">;
                    BackdropImageTags: z.ZodArray<z.ZodString, "many">;
                    ChannelId: z.ZodNull;
                    DateCreated: z.ZodString;
                    ExternalUrls: z.ZodArray<z.ZodObject<{
                        Name: z.ZodString;
                        Url: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        Name: string;
                        Url: string;
                    }, {
                        Name: string;
                        Url: string;
                    }>, "many">;
                    GenreItems: z.ZodArray<z.ZodObject<{
                        Id: z.ZodString;
                        Name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        Name: string;
                        Id: string;
                    }, {
                        Name: string;
                        Id: string;
                    }>, "many">;
                    Genres: z.ZodArray<z.ZodString, "many">;
                    Id: z.ZodString;
                    ImageBlurHashes: z.ZodObject<{
                        Backdrop: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
                        Logo: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
                        Primary: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
                    }, "strip", z.ZodTypeAny, {
                        Backdrop?: Record<string, string> | undefined;
                        Logo?: Record<string, string> | undefined;
                        Primary?: Record<string, string> | undefined;
                    }, {
                        Backdrop?: Record<string, string> | undefined;
                        Logo?: Record<string, string> | undefined;
                        Primary?: Record<string, string> | undefined;
                    }>;
                    ImageTags: z.ZodObject<{
                        Logo: z.ZodOptional<z.ZodString>;
                        Primary: z.ZodOptional<z.ZodString>;
                    }, "strip", z.ZodTypeAny, {
                        Logo?: string | undefined;
                        Primary?: string | undefined;
                    }, {
                        Logo?: string | undefined;
                        Primary?: string | undefined;
                    }>;
                    IndexNumber: z.ZodNumber;
                    IsFolder: z.ZodBoolean;
                    LocationType: z.ZodString;
                    LUFS: z.ZodOptional<z.ZodNumber>;
                    MediaSources: z.ZodArray<z.ZodObject<{
                        Bitrate: z.ZodNumber;
                        Container: z.ZodString;
                        DefaultAudioStreamIndex: z.ZodNumber;
                        ETag: z.ZodString;
                        Formats: z.ZodArray<z.ZodAny, "many">;
                        GenPtsInput: z.ZodBoolean;
                        Id: z.ZodString;
                        IgnoreDts: z.ZodBoolean;
                        IgnoreIndex: z.ZodBoolean;
                        IsInfiniteStream: z.ZodBoolean;
                        IsRemote: z.ZodBoolean;
                        MediaAttachments: z.ZodArray<z.ZodAny, "many">;
                        MediaStreams: z.ZodArray<z.ZodObject<{
                            AspectRatio: z.ZodOptional<z.ZodString>;
                            BitDepth: z.ZodOptional<z.ZodNumber>;
                            BitRate: z.ZodOptional<z.ZodNumber>;
                            ChannelLayout: z.ZodOptional<z.ZodString>;
                            Channels: z.ZodOptional<z.ZodNumber>;
                            Codec: z.ZodString;
                            CodecTimeBase: z.ZodString;
                            ColorSpace: z.ZodOptional<z.ZodString>;
                            Comment: z.ZodOptional<z.ZodString>;
                            DisplayTitle: z.ZodOptional<z.ZodString>;
                            Height: z.ZodOptional<z.ZodNumber>;
                            Index: z.ZodNumber;
                            IsDefault: z.ZodBoolean;
                            IsExternal: z.ZodBoolean;
                            IsForced: z.ZodBoolean;
                            IsInterlaced: z.ZodBoolean;
                            IsTextSubtitleStream: z.ZodBoolean;
                            Level: z.ZodNumber;
                            PixelFormat: z.ZodOptional<z.ZodString>;
                            Profile: z.ZodOptional<z.ZodString>;
                            RealFrameRate: z.ZodOptional<z.ZodNumber>;
                            RefFrames: z.ZodOptional<z.ZodNumber>;
                            SampleRate: z.ZodOptional<z.ZodNumber>;
                            SupportsExternalStream: z.ZodBoolean;
                            TimeBase: z.ZodString;
                            Type: z.ZodString;
                            Width: z.ZodOptional<z.ZodNumber>;
                        }, "strip", z.ZodTypeAny, {
                            Codec: string;
                            Level: number;
                            Type: string;
                            CodecTimeBase: string;
                            Index: number;
                            IsDefault: boolean;
                            IsExternal: boolean;
                            IsForced: boolean;
                            IsInterlaced: boolean;
                            IsTextSubtitleStream: boolean;
                            SupportsExternalStream: boolean;
                            TimeBase: string;
                            AspectRatio?: string | undefined;
                            BitDepth?: number | undefined;
                            BitRate?: number | undefined;
                            ChannelLayout?: string | undefined;
                            Channels?: number | undefined;
                            ColorSpace?: string | undefined;
                            Comment?: string | undefined;
                            DisplayTitle?: string | undefined;
                            Height?: number | undefined;
                            PixelFormat?: string | undefined;
                            Profile?: string | undefined;
                            RealFrameRate?: number | undefined;
                            RefFrames?: number | undefined;
                            SampleRate?: number | undefined;
                            Width?: number | undefined;
                        }, {
                            Codec: string;
                            Level: number;
                            Type: string;
                            CodecTimeBase: string;
                            Index: number;
                            IsDefault: boolean;
                            IsExternal: boolean;
                            IsForced: boolean;
                            IsInterlaced: boolean;
                            IsTextSubtitleStream: boolean;
                            SupportsExternalStream: boolean;
                            TimeBase: string;
                            AspectRatio?: string | undefined;
                            BitDepth?: number | undefined;
                            BitRate?: number | undefined;
                            ChannelLayout?: string | undefined;
                            Channels?: number | undefined;
                            ColorSpace?: string | undefined;
                            Comment?: string | undefined;
                            DisplayTitle?: string | undefined;
                            Height?: number | undefined;
                            PixelFormat?: string | undefined;
                            Profile?: string | undefined;
                            RealFrameRate?: number | undefined;
                            RefFrames?: number | undefined;
                            SampleRate?: number | undefined;
                            Width?: number | undefined;
                        }>, "many">;
                        Name: z.ZodString;
                        Path: z.ZodString;
                        Protocol: z.ZodString;
                        ReadAtNativeFramerate: z.ZodBoolean;
                        RequiredHttpHeaders: z.ZodAny;
                        RequiresClosing: z.ZodBoolean;
                        RequiresLooping: z.ZodBoolean;
                        RequiresOpening: z.ZodBoolean;
                        RunTimeTicks: z.ZodNumber;
                        Size: z.ZodNumber;
                        SupportsDirectPlay: z.ZodBoolean;
                        SupportsDirectStream: z.ZodBoolean;
                        SupportsProbing: z.ZodBoolean;
                        SupportsTranscoding: z.ZodBoolean;
                        Type: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        Name: string;
                        Bitrate: number;
                        Id: string;
                        Type: string;
                        RunTimeTicks: number;
                        Container: string;
                        DefaultAudioStreamIndex: number;
                        ETag: string;
                        Formats: any[];
                        GenPtsInput: boolean;
                        IgnoreDts: boolean;
                        IgnoreIndex: boolean;
                        IsInfiniteStream: boolean;
                        IsRemote: boolean;
                        MediaAttachments: any[];
                        MediaStreams: {
                            Codec: string;
                            Level: number;
                            Type: string;
                            CodecTimeBase: string;
                            Index: number;
                            IsDefault: boolean;
                            IsExternal: boolean;
                            IsForced: boolean;
                            IsInterlaced: boolean;
                            IsTextSubtitleStream: boolean;
                            SupportsExternalStream: boolean;
                            TimeBase: string;
                            AspectRatio?: string | undefined;
                            BitDepth?: number | undefined;
                            BitRate?: number | undefined;
                            ChannelLayout?: string | undefined;
                            Channels?: number | undefined;
                            ColorSpace?: string | undefined;
                            Comment?: string | undefined;
                            DisplayTitle?: string | undefined;
                            Height?: number | undefined;
                            PixelFormat?: string | undefined;
                            Profile?: string | undefined;
                            RealFrameRate?: number | undefined;
                            RefFrames?: number | undefined;
                            SampleRate?: number | undefined;
                            Width?: number | undefined;
                        }[];
                        Path: string;
                        Protocol: string;
                        ReadAtNativeFramerate: boolean;
                        RequiresClosing: boolean;
                        RequiresLooping: boolean;
                        RequiresOpening: boolean;
                        Size: number;
                        SupportsDirectPlay: boolean;
                        SupportsDirectStream: boolean;
                        SupportsProbing: boolean;
                        SupportsTranscoding: boolean;
                        RequiredHttpHeaders?: any;
                    }, {
                        Name: string;
                        Bitrate: number;
                        Id: string;
                        Type: string;
                        RunTimeTicks: number;
                        Container: string;
                        DefaultAudioStreamIndex: number;
                        ETag: string;
                        Formats: any[];
                        GenPtsInput: boolean;
                        IgnoreDts: boolean;
                        IgnoreIndex: boolean;
                        IsInfiniteStream: boolean;
                        IsRemote: boolean;
                        MediaAttachments: any[];
                        MediaStreams: {
                            Codec: string;
                            Level: number;
                            Type: string;
                            CodecTimeBase: string;
                            Index: number;
                            IsDefault: boolean;
                            IsExternal: boolean;
                            IsForced: boolean;
                            IsInterlaced: boolean;
                            IsTextSubtitleStream: boolean;
                            SupportsExternalStream: boolean;
                            TimeBase: string;
                            AspectRatio?: string | undefined;
                            BitDepth?: number | undefined;
                            BitRate?: number | undefined;
                            ChannelLayout?: string | undefined;
                            Channels?: number | undefined;
                            ColorSpace?: string | undefined;
                            Comment?: string | undefined;
                            DisplayTitle?: string | undefined;
                            Height?: number | undefined;
                            PixelFormat?: string | undefined;
                            Profile?: string | undefined;
                            RealFrameRate?: number | undefined;
                            RefFrames?: number | undefined;
                            SampleRate?: number | undefined;
                            Width?: number | undefined;
                        }[];
                        Path: string;
                        Protocol: string;
                        ReadAtNativeFramerate: boolean;
                        RequiresClosing: boolean;
                        RequiresLooping: boolean;
                        RequiresOpening: boolean;
                        Size: number;
                        SupportsDirectPlay: boolean;
                        SupportsDirectStream: boolean;
                        SupportsProbing: boolean;
                        SupportsTranscoding: boolean;
                        RequiredHttpHeaders?: any;
                    }>, "many">;
                    MediaType: z.ZodString;
                    Name: z.ZodString;
                    NormalizationGain: z.ZodOptional<z.ZodNumber>;
                    ParentId: z.ZodOptional<z.ZodString>;
                    ParentIndexNumber: z.ZodNumber;
                    People: z.ZodOptional<z.ZodArray<z.ZodObject<{
                        Id: z.ZodString;
                        Name: z.ZodString;
                        Type: z.ZodOptional<z.ZodString>;
                    }, "strip", z.ZodTypeAny, {
                        Name: string;
                        Id: string;
                        Type?: string | undefined;
                    }, {
                        Name: string;
                        Id: string;
                        Type?: string | undefined;
                    }>, "many">>;
                    PlaylistItemId: z.ZodOptional<z.ZodString>;
                    PremiereDate: z.ZodOptional<z.ZodString>;
                    ProductionYear: z.ZodNumber;
                    ProviderIds: z.ZodOptional<z.ZodObject<{
                        MusicBrainzAlbum: z.ZodOptional<z.ZodString>;
                        MusicBrainzAlbumArtist: z.ZodOptional<z.ZodString>;
                        MusicBrainzArtist: z.ZodOptional<z.ZodString>;
                        MusicBrainzRecording: z.ZodOptional<z.ZodString>;
                        MusicBrainzReleaseGroup: z.ZodOptional<z.ZodString>;
                        MusicBrainzTrack: z.ZodOptional<z.ZodString>;
                    }, "strip", z.ZodTypeAny, {
                        MusicBrainzAlbum?: string | undefined;
                        MusicBrainzAlbumArtist?: string | undefined;
                        MusicBrainzArtist?: string | undefined;
                        MusicBrainzRecording?: string | undefined;
                        MusicBrainzReleaseGroup?: string | undefined;
                        MusicBrainzTrack?: string | undefined;
                    }, {
                        MusicBrainzAlbum?: string | undefined;
                        MusicBrainzAlbumArtist?: string | undefined;
                        MusicBrainzArtist?: string | undefined;
                        MusicBrainzRecording?: string | undefined;
                        MusicBrainzReleaseGroup?: string | undefined;
                        MusicBrainzTrack?: string | undefined;
                    }>>;
                    RunTimeTicks: z.ZodNumber;
                    ServerId: z.ZodString;
                    SortName: z.ZodOptional<z.ZodString>;
                    Tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                    Type: z.ZodString;
                    UserData: z.ZodOptional<z.ZodObject<{
                        IsFavorite: z.ZodBoolean;
                        Key: z.ZodString;
                        PlaybackPositionTicks: z.ZodNumber;
                        PlayCount: z.ZodNumber;
                        Played: z.ZodBoolean;
                    }, "strip", z.ZodTypeAny, {
                        PlayCount: number;
                        IsFavorite: boolean;
                        Key: string;
                        PlaybackPositionTicks: number;
                        Played: boolean;
                    }, {
                        PlayCount: number;
                        IsFavorite: boolean;
                        Key: string;
                        PlaybackPositionTicks: number;
                        Played: boolean;
                    }>>;
                }, "strip", z.ZodTypeAny, {
                    Name: string;
                    Genres: string[];
                    Album: string;
                    MediaType: string;
                    Id: string;
                    AlbumArtist: string;
                    AlbumArtists: {
                        Name: string;
                        Id: string;
                    }[];
                    AlbumPrimaryImageTag: string;
                    ArtistItems: {
                        Name: string;
                        Id: string;
                    }[];
                    Artists: string[];
                    ChannelId: null;
                    DateCreated: string;
                    ExternalUrls: {
                        Name: string;
                        Url: string;
                    }[];
                    GenreItems: {
                        Name: string;
                        Id: string;
                    }[];
                    ImageBlurHashes: {
                        Backdrop?: Record<string, string> | undefined;
                        Logo?: Record<string, string> | undefined;
                        Primary?: Record<string, string> | undefined;
                    };
                    ImageTags: {
                        Logo?: string | undefined;
                        Primary?: string | undefined;
                    };
                    IsFolder: boolean;
                    LocationType: string;
                    Type: string;
                    ProductionYear: number;
                    RunTimeTicks: number;
                    ServerId: string;
                    BackdropImageTags: string[];
                    IndexNumber: number;
                    MediaSources: {
                        Name: string;
                        Bitrate: number;
                        Id: string;
                        Type: string;
                        RunTimeTicks: number;
                        Container: string;
                        DefaultAudioStreamIndex: number;
                        ETag: string;
                        Formats: any[];
                        GenPtsInput: boolean;
                        IgnoreDts: boolean;
                        IgnoreIndex: boolean;
                        IsInfiniteStream: boolean;
                        IsRemote: boolean;
                        MediaAttachments: any[];
                        MediaStreams: {
                            Codec: string;
                            Level: number;
                            Type: string;
                            CodecTimeBase: string;
                            Index: number;
                            IsDefault: boolean;
                            IsExternal: boolean;
                            IsForced: boolean;
                            IsInterlaced: boolean;
                            IsTextSubtitleStream: boolean;
                            SupportsExternalStream: boolean;
                            TimeBase: string;
                            AspectRatio?: string | undefined;
                            BitDepth?: number | undefined;
                            BitRate?: number | undefined;
                            ChannelLayout?: string | undefined;
                            Channels?: number | undefined;
                            ColorSpace?: string | undefined;
                            Comment?: string | undefined;
                            DisplayTitle?: string | undefined;
                            Height?: number | undefined;
                            PixelFormat?: string | undefined;
                            Profile?: string | undefined;
                            RealFrameRate?: number | undefined;
                            RefFrames?: number | undefined;
                            SampleRate?: number | undefined;
                            Width?: number | undefined;
                        }[];
                        Path: string;
                        Protocol: string;
                        ReadAtNativeFramerate: boolean;
                        RequiresClosing: boolean;
                        RequiresLooping: boolean;
                        RequiresOpening: boolean;
                        Size: number;
                        SupportsDirectPlay: boolean;
                        SupportsDirectStream: boolean;
                        SupportsProbing: boolean;
                        SupportsTranscoding: boolean;
                        RequiredHttpHeaders?: any;
                    }[];
                    ParentIndexNumber: number;
                    SortName?: string | undefined;
                    ParentId?: string | undefined;
                    Tags?: string[] | undefined;
                    PlaylistItemId?: string | undefined;
                    People?: {
                        Name: string;
                        Id: string;
                        Type?: string | undefined;
                    }[] | undefined;
                    PremiereDate?: string | undefined;
                    ProviderIds?: {
                        MusicBrainzAlbum?: string | undefined;
                        MusicBrainzAlbumArtist?: string | undefined;
                        MusicBrainzArtist?: string | undefined;
                        MusicBrainzRecording?: string | undefined;
                        MusicBrainzReleaseGroup?: string | undefined;
                        MusicBrainzTrack?: string | undefined;
                    } | undefined;
                    AlbumId?: string | undefined;
                    LUFS?: number | undefined;
                    NormalizationGain?: number | undefined;
                    UserData?: {
                        PlayCount: number;
                        IsFavorite: boolean;
                        Key: string;
                        PlaybackPositionTicks: number;
                        Played: boolean;
                    } | undefined;
                }, {
                    Name: string;
                    Genres: string[];
                    Album: string;
                    MediaType: string;
                    Id: string;
                    AlbumArtist: string;
                    AlbumArtists: {
                        Name: string;
                        Id: string;
                    }[];
                    AlbumPrimaryImageTag: string;
                    ArtistItems: {
                        Name: string;
                        Id: string;
                    }[];
                    Artists: string[];
                    ChannelId: null;
                    DateCreated: string;
                    ExternalUrls: {
                        Name: string;
                        Url: string;
                    }[];
                    GenreItems: {
                        Name: string;
                        Id: string;
                    }[];
                    ImageBlurHashes: {
                        Backdrop?: Record<string, string> | undefined;
                        Logo?: Record<string, string> | undefined;
                        Primary?: Record<string, string> | undefined;
                    };
                    ImageTags: {
                        Logo?: string | undefined;
                        Primary?: string | undefined;
                    };
                    IsFolder: boolean;
                    LocationType: string;
                    Type: string;
                    ProductionYear: number;
                    RunTimeTicks: number;
                    ServerId: string;
                    BackdropImageTags: string[];
                    IndexNumber: number;
                    MediaSources: {
                        Name: string;
                        Bitrate: number;
                        Id: string;
                        Type: string;
                        RunTimeTicks: number;
                        Container: string;
                        DefaultAudioStreamIndex: number;
                        ETag: string;
                        Formats: any[];
                        GenPtsInput: boolean;
                        IgnoreDts: boolean;
                        IgnoreIndex: boolean;
                        IsInfiniteStream: boolean;
                        IsRemote: boolean;
                        MediaAttachments: any[];
                        MediaStreams: {
                            Codec: string;
                            Level: number;
                            Type: string;
                            CodecTimeBase: string;
                            Index: number;
                            IsDefault: boolean;
                            IsExternal: boolean;
                            IsForced: boolean;
                            IsInterlaced: boolean;
                            IsTextSubtitleStream: boolean;
                            SupportsExternalStream: boolean;
                            TimeBase: string;
                            AspectRatio?: string | undefined;
                            BitDepth?: number | undefined;
                            BitRate?: number | undefined;
                            ChannelLayout?: string | undefined;
                            Channels?: number | undefined;
                            ColorSpace?: string | undefined;
                            Comment?: string | undefined;
                            DisplayTitle?: string | undefined;
                            Height?: number | undefined;
                            PixelFormat?: string | undefined;
                            Profile?: string | undefined;
                            RealFrameRate?: number | undefined;
                            RefFrames?: number | undefined;
                            SampleRate?: number | undefined;
                            Width?: number | undefined;
                        }[];
                        Path: string;
                        Protocol: string;
                        ReadAtNativeFramerate: boolean;
                        RequiresClosing: boolean;
                        RequiresLooping: boolean;
                        RequiresOpening: boolean;
                        Size: number;
                        SupportsDirectPlay: boolean;
                        SupportsDirectStream: boolean;
                        SupportsProbing: boolean;
                        SupportsTranscoding: boolean;
                        RequiredHttpHeaders?: any;
                    }[];
                    ParentIndexNumber: number;
                    SortName?: string | undefined;
                    ParentId?: string | undefined;
                    Tags?: string[] | undefined;
                    PlaylistItemId?: string | undefined;
                    People?: {
                        Name: string;
                        Id: string;
                        Type?: string | undefined;
                    }[] | undefined;
                    PremiereDate?: string | undefined;
                    ProviderIds?: {
                        MusicBrainzAlbum?: string | undefined;
                        MusicBrainzAlbumArtist?: string | undefined;
                        MusicBrainzArtist?: string | undefined;
                        MusicBrainzRecording?: string | undefined;
                        MusicBrainzReleaseGroup?: string | undefined;
                        MusicBrainzTrack?: string | undefined;
                    } | undefined;
                    AlbumId?: string | undefined;
                    LUFS?: number | undefined;
                    NormalizationGain?: number | undefined;
                    UserData?: {
                        PlayCount: number;
                        IsFavorite: boolean;
                        Key: string;
                        PlaybackPositionTicks: number;
                        Played: boolean;
                    } | undefined;
                }>, "many">;
            }, "strip", z.ZodTypeAny, {
                StartIndex: number;
                TotalRecordCount: number;
                Items: {
                    Name: string;
                    Genres: string[];
                    Album: string;
                    MediaType: string;
                    Id: string;
                    AlbumArtist: string;
                    AlbumArtists: {
                        Name: string;
                        Id: string;
                    }[];
                    AlbumPrimaryImageTag: string;
                    ArtistItems: {
                        Name: string;
                        Id: string;
                    }[];
                    Artists: string[];
                    ChannelId: null;
                    DateCreated: string;
                    ExternalUrls: {
                        Name: string;
                        Url: string;
                    }[];
                    GenreItems: {
                        Name: string;
                        Id: string;
                    }[];
                    ImageBlurHashes: {
                        Backdrop?: Record<string, string> | undefined;
                        Logo?: Record<string, string> | undefined;
                        Primary?: Record<string, string> | undefined;
                    };
                    ImageTags: {
                        Logo?: string | undefined;
                        Primary?: string | undefined;
                    };
                    IsFolder: boolean;
                    LocationType: string;
                    Type: string;
                    ProductionYear: number;
                    RunTimeTicks: number;
                    ServerId: string;
                    BackdropImageTags: string[];
                    IndexNumber: number;
                    MediaSources: {
                        Name: string;
                        Bitrate: number;
                        Id: string;
                        Type: string;
                        RunTimeTicks: number;
                        Container: string;
                        DefaultAudioStreamIndex: number;
                        ETag: string;
                        Formats: any[];
                        GenPtsInput: boolean;
                        IgnoreDts: boolean;
                        IgnoreIndex: boolean;
                        IsInfiniteStream: boolean;
                        IsRemote: boolean;
                        MediaAttachments: any[];
                        MediaStreams: {
                            Codec: string;
                            Level: number;
                            Type: string;
                            CodecTimeBase: string;
                            Index: number;
                            IsDefault: boolean;
                            IsExternal: boolean;
                            IsForced: boolean;
                            IsInterlaced: boolean;
                            IsTextSubtitleStream: boolean;
                            SupportsExternalStream: boolean;
                            TimeBase: string;
                            AspectRatio?: string | undefined;
                            BitDepth?: number | undefined;
                            BitRate?: number | undefined;
                            ChannelLayout?: string | undefined;
                            Channels?: number | undefined;
                            ColorSpace?: string | undefined;
                            Comment?: string | undefined;
                            DisplayTitle?: string | undefined;
                            Height?: number | undefined;
                            PixelFormat?: string | undefined;
                            Profile?: string | undefined;
                            RealFrameRate?: number | undefined;
                            RefFrames?: number | undefined;
                            SampleRate?: number | undefined;
                            Width?: number | undefined;
                        }[];
                        Path: string;
                        Protocol: string;
                        ReadAtNativeFramerate: boolean;
                        RequiresClosing: boolean;
                        RequiresLooping: boolean;
                        RequiresOpening: boolean;
                        Size: number;
                        SupportsDirectPlay: boolean;
                        SupportsDirectStream: boolean;
                        SupportsProbing: boolean;
                        SupportsTranscoding: boolean;
                        RequiredHttpHeaders?: any;
                    }[];
                    ParentIndexNumber: number;
                    SortName?: string | undefined;
                    ParentId?: string | undefined;
                    Tags?: string[] | undefined;
                    PlaylistItemId?: string | undefined;
                    People?: {
                        Name: string;
                        Id: string;
                        Type?: string | undefined;
                    }[] | undefined;
                    PremiereDate?: string | undefined;
                    ProviderIds?: {
                        MusicBrainzAlbum?: string | undefined;
                        MusicBrainzAlbumArtist?: string | undefined;
                        MusicBrainzArtist?: string | undefined;
                        MusicBrainzRecording?: string | undefined;
                        MusicBrainzReleaseGroup?: string | undefined;
                        MusicBrainzTrack?: string | undefined;
                    } | undefined;
                    AlbumId?: string | undefined;
                    LUFS?: number | undefined;
                    NormalizationGain?: number | undefined;
                    UserData?: {
                        PlayCount: number;
                        IsFavorite: boolean;
                        Key: string;
                        PlaybackPositionTicks: number;
                        Played: boolean;
                    } | undefined;
                }[];
            }, {
                StartIndex: number;
                TotalRecordCount: number;
                Items: {
                    Name: string;
                    Genres: string[];
                    Album: string;
                    MediaType: string;
                    Id: string;
                    AlbumArtist: string;
                    AlbumArtists: {
                        Name: string;
                        Id: string;
                    }[];
                    AlbumPrimaryImageTag: string;
                    ArtistItems: {
                        Name: string;
                        Id: string;
                    }[];
                    Artists: string[];
                    ChannelId: null;
                    DateCreated: string;
                    ExternalUrls: {
                        Name: string;
                        Url: string;
                    }[];
                    GenreItems: {
                        Name: string;
                        Id: string;
                    }[];
                    ImageBlurHashes: {
                        Backdrop?: Record<string, string> | undefined;
                        Logo?: Record<string, string> | undefined;
                        Primary?: Record<string, string> | undefined;
                    };
                    ImageTags: {
                        Logo?: string | undefined;
                        Primary?: string | undefined;
                    };
                    IsFolder: boolean;
                    LocationType: string;
                    Type: string;
                    ProductionYear: number;
                    RunTimeTicks: number;
                    ServerId: string;
                    BackdropImageTags: string[];
                    IndexNumber: number;
                    MediaSources: {
                        Name: string;
                        Bitrate: number;
                        Id: string;
                        Type: string;
                        RunTimeTicks: number;
                        Container: string;
                        DefaultAudioStreamIndex: number;
                        ETag: string;
                        Formats: any[];
                        GenPtsInput: boolean;
                        IgnoreDts: boolean;
                        IgnoreIndex: boolean;
                        IsInfiniteStream: boolean;
                        IsRemote: boolean;
                        MediaAttachments: any[];
                        MediaStreams: {
                            Codec: string;
                            Level: number;
                            Type: string;
                            CodecTimeBase: string;
                            Index: number;
                            IsDefault: boolean;
                            IsExternal: boolean;
                            IsForced: boolean;
                            IsInterlaced: boolean;
                            IsTextSubtitleStream: boolean;
                            SupportsExternalStream: boolean;
                            TimeBase: string;
                            AspectRatio?: string | undefined;
                            BitDepth?: number | undefined;
                            BitRate?: number | undefined;
                            ChannelLayout?: string | undefined;
                            Channels?: number | undefined;
                            ColorSpace?: string | undefined;
                            Comment?: string | undefined;
                            DisplayTitle?: string | undefined;
                            Height?: number | undefined;
                            PixelFormat?: string | undefined;
                            Profile?: string | undefined;
                            RealFrameRate?: number | undefined;
                            RefFrames?: number | undefined;
                            SampleRate?: number | undefined;
                            Width?: number | undefined;
                        }[];
                        Path: string;
                        Protocol: string;
                        ReadAtNativeFramerate: boolean;
                        RequiresClosing: boolean;
                        RequiresLooping: boolean;
                        RequiresOpening: boolean;
                        Size: number;
                        SupportsDirectPlay: boolean;
                        SupportsDirectStream: boolean;
                        SupportsProbing: boolean;
                        SupportsTranscoding: boolean;
                        RequiredHttpHeaders?: any;
                    }[];
                    ParentIndexNumber: number;
                    SortName?: string | undefined;
                    ParentId?: string | undefined;
                    Tags?: string[] | undefined;
                    PlaylistItemId?: string | undefined;
                    People?: {
                        Name: string;
                        Id: string;
                        Type?: string | undefined;
                    }[] | undefined;
                    PremiereDate?: string | undefined;
                    ProviderIds?: {
                        MusicBrainzAlbum?: string | undefined;
                        MusicBrainzAlbumArtist?: string | undefined;
                        MusicBrainzArtist?: string | undefined;
                        MusicBrainzRecording?: string | undefined;
                        MusicBrainzReleaseGroup?: string | undefined;
                        MusicBrainzTrack?: string | undefined;
                    } | undefined;
                    AlbumId?: string | undefined;
                    LUFS?: number | undefined;
                    NormalizationGain?: number | undefined;
                    UserData?: {
                        PlayCount: number;
                        IsFavorite: boolean;
                        Key: string;
                        PlaybackPositionTicks: number;
                        Played: boolean;
                    } | undefined;
                }[];
            }>;
            400: z.ZodObject<{
                errors: z.ZodObject<{
                    recursive: z.ZodArray<z.ZodString, "many">;
                }, "strip", z.ZodTypeAny, {
                    recursive: string[];
                }, {
                    recursive: string[];
                }>;
                status: z.ZodNumber;
                title: z.ZodString;
                traceId: z.ZodString;
                type: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                title: string;
                type: string;
                status: number;
                errors: {
                    recursive: string[];
                };
                traceId: string;
            }, {
                title: string;
                type: string;
                status: number;
                errors: {
                    recursive: string[];
                };
                traceId: string;
            }>;
        };
    };
    getUser: {
        method: "GET";
        path: "users/:id";
        responses: {
            200: z.ZodObject<{
                Configuration: z.ZodObject<{
                    DisplayCollectionsView: z.ZodBoolean;
                    DisplayMissingEpisodes: z.ZodBoolean;
                    EnableLocalPassword: z.ZodBoolean;
                    EnableNextEpisodeAutoPlay: z.ZodBoolean;
                    GroupedFolders: z.ZodArray<z.ZodAny, "many">;
                    HidePlayedInLatest: z.ZodBoolean;
                    LatestItemsExcludes: z.ZodArray<z.ZodAny, "many">;
                    MyMediaExcludes: z.ZodArray<z.ZodAny, "many">;
                    OrderedViews: z.ZodArray<z.ZodAny, "many">;
                    PlayDefaultAudioTrack: z.ZodBoolean;
                    RememberAudioSelections: z.ZodBoolean;
                    RememberSubtitleSelections: z.ZodBoolean;
                    SubtitleLanguagePreference: z.ZodString;
                    SubtitleMode: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    DisplayCollectionsView: boolean;
                    DisplayMissingEpisodes: boolean;
                    EnableLocalPassword: boolean;
                    EnableNextEpisodeAutoPlay: boolean;
                    GroupedFolders: any[];
                    HidePlayedInLatest: boolean;
                    LatestItemsExcludes: any[];
                    MyMediaExcludes: any[];
                    OrderedViews: any[];
                    PlayDefaultAudioTrack: boolean;
                    RememberAudioSelections: boolean;
                    RememberSubtitleSelections: boolean;
                    SubtitleLanguagePreference: string;
                    SubtitleMode: string;
                }, {
                    DisplayCollectionsView: boolean;
                    DisplayMissingEpisodes: boolean;
                    EnableLocalPassword: boolean;
                    EnableNextEpisodeAutoPlay: boolean;
                    GroupedFolders: any[];
                    HidePlayedInLatest: boolean;
                    LatestItemsExcludes: any[];
                    MyMediaExcludes: any[];
                    OrderedViews: any[];
                    PlayDefaultAudioTrack: boolean;
                    RememberAudioSelections: boolean;
                    RememberSubtitleSelections: boolean;
                    SubtitleLanguagePreference: string;
                    SubtitleMode: string;
                }>;
                EnableAutoLogin: z.ZodBoolean;
                HasConfiguredEasyPassword: z.ZodBoolean;
                HasConfiguredPassword: z.ZodBoolean;
                HasPassword: z.ZodBoolean;
                Id: z.ZodString;
                LastActivityDate: z.ZodString;
                LastLoginDate: z.ZodString;
                Name: z.ZodString;
                Policy: z.ZodObject<{
                    AccessSchedules: z.ZodArray<z.ZodAny, "many">;
                    AuthenticationProviderId: z.ZodString;
                    BlockedChannels: z.ZodArray<z.ZodAny, "many">;
                    BlockedMediaFolders: z.ZodArray<z.ZodAny, "many">;
                    BlockedTags: z.ZodArray<z.ZodAny, "many">;
                    BlockUnratedItems: z.ZodArray<z.ZodAny, "many">;
                    EnableAllChannels: z.ZodBoolean;
                    EnableAllDevices: z.ZodBoolean;
                    EnableAllFolders: z.ZodBoolean;
                    EnableAudioPlaybackTranscoding: z.ZodBoolean;
                    EnableContentDeletion: z.ZodBoolean;
                    EnableContentDeletionFromFolders: z.ZodArray<z.ZodAny, "many">;
                    EnableContentDownloading: z.ZodBoolean;
                    EnabledChannels: z.ZodArray<z.ZodAny, "many">;
                    EnabledDevices: z.ZodArray<z.ZodAny, "many">;
                    EnabledFolders: z.ZodArray<z.ZodAny, "many">;
                    EnableLiveTvAccess: z.ZodBoolean;
                    EnableLiveTvManagement: z.ZodBoolean;
                    EnableMediaConversion: z.ZodBoolean;
                    EnableMediaPlayback: z.ZodBoolean;
                    EnablePlaybackRemuxing: z.ZodBoolean;
                    EnablePublicSharing: z.ZodBoolean;
                    EnableRemoteAccess: z.ZodBoolean;
                    EnableRemoteControlOfOtherUsers: z.ZodBoolean;
                    EnableSharedDeviceControl: z.ZodBoolean;
                    EnableSyncTranscoding: z.ZodBoolean;
                    EnableUserPreferenceAccess: z.ZodBoolean;
                    EnableVideoPlaybackTranscoding: z.ZodBoolean;
                    ForceRemoteSourceTranscoding: z.ZodBoolean;
                    InvalidLoginAttemptCount: z.ZodNumber;
                    IsAdministrator: z.ZodBoolean;
                    IsDisabled: z.ZodBoolean;
                    IsHidden: z.ZodBoolean;
                    LoginAttemptsBeforeLockout: z.ZodNumber;
                    MaxActiveSessions: z.ZodNumber;
                    PasswordResetProviderId: z.ZodString;
                    RemoteClientBitrateLimit: z.ZodNumber;
                    SyncPlayAccess: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    AccessSchedules: any[];
                    AuthenticationProviderId: string;
                    BlockedChannels: any[];
                    BlockedMediaFolders: any[];
                    BlockedTags: any[];
                    BlockUnratedItems: any[];
                    EnableAllChannels: boolean;
                    EnableAllDevices: boolean;
                    EnableAllFolders: boolean;
                    EnableAudioPlaybackTranscoding: boolean;
                    EnableContentDeletion: boolean;
                    EnableContentDeletionFromFolders: any[];
                    EnableContentDownloading: boolean;
                    EnabledChannels: any[];
                    EnabledDevices: any[];
                    EnabledFolders: any[];
                    EnableLiveTvAccess: boolean;
                    EnableLiveTvManagement: boolean;
                    EnableMediaConversion: boolean;
                    EnableMediaPlayback: boolean;
                    EnablePlaybackRemuxing: boolean;
                    EnablePublicSharing: boolean;
                    EnableRemoteAccess: boolean;
                    EnableRemoteControlOfOtherUsers: boolean;
                    EnableSharedDeviceControl: boolean;
                    EnableSyncTranscoding: boolean;
                    EnableUserPreferenceAccess: boolean;
                    EnableVideoPlaybackTranscoding: boolean;
                    ForceRemoteSourceTranscoding: boolean;
                    InvalidLoginAttemptCount: number;
                    IsAdministrator: boolean;
                    IsDisabled: boolean;
                    IsHidden: boolean;
                    LoginAttemptsBeforeLockout: number;
                    MaxActiveSessions: number;
                    PasswordResetProviderId: string;
                    RemoteClientBitrateLimit: number;
                    SyncPlayAccess: string;
                }, {
                    AccessSchedules: any[];
                    AuthenticationProviderId: string;
                    BlockedChannels: any[];
                    BlockedMediaFolders: any[];
                    BlockedTags: any[];
                    BlockUnratedItems: any[];
                    EnableAllChannels: boolean;
                    EnableAllDevices: boolean;
                    EnableAllFolders: boolean;
                    EnableAudioPlaybackTranscoding: boolean;
                    EnableContentDeletion: boolean;
                    EnableContentDeletionFromFolders: any[];
                    EnableContentDownloading: boolean;
                    EnabledChannels: any[];
                    EnabledDevices: any[];
                    EnabledFolders: any[];
                    EnableLiveTvAccess: boolean;
                    EnableLiveTvManagement: boolean;
                    EnableMediaConversion: boolean;
                    EnableMediaPlayback: boolean;
                    EnablePlaybackRemuxing: boolean;
                    EnablePublicSharing: boolean;
                    EnableRemoteAccess: boolean;
                    EnableRemoteControlOfOtherUsers: boolean;
                    EnableSharedDeviceControl: boolean;
                    EnableSyncTranscoding: boolean;
                    EnableUserPreferenceAccess: boolean;
                    EnableVideoPlaybackTranscoding: boolean;
                    ForceRemoteSourceTranscoding: boolean;
                    InvalidLoginAttemptCount: number;
                    IsAdministrator: boolean;
                    IsDisabled: boolean;
                    IsHidden: boolean;
                    LoginAttemptsBeforeLockout: number;
                    MaxActiveSessions: number;
                    PasswordResetProviderId: string;
                    RemoteClientBitrateLimit: number;
                    SyncPlayAccess: string;
                }>;
                ServerId: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                Name: string;
                Id: string;
                ServerId: string;
                LastActivityDate: string;
                Configuration: {
                    DisplayCollectionsView: boolean;
                    DisplayMissingEpisodes: boolean;
                    EnableLocalPassword: boolean;
                    EnableNextEpisodeAutoPlay: boolean;
                    GroupedFolders: any[];
                    HidePlayedInLatest: boolean;
                    LatestItemsExcludes: any[];
                    MyMediaExcludes: any[];
                    OrderedViews: any[];
                    PlayDefaultAudioTrack: boolean;
                    RememberAudioSelections: boolean;
                    RememberSubtitleSelections: boolean;
                    SubtitleLanguagePreference: string;
                    SubtitleMode: string;
                };
                EnableAutoLogin: boolean;
                HasConfiguredEasyPassword: boolean;
                HasConfiguredPassword: boolean;
                HasPassword: boolean;
                LastLoginDate: string;
                Policy: {
                    AccessSchedules: any[];
                    AuthenticationProviderId: string;
                    BlockedChannels: any[];
                    BlockedMediaFolders: any[];
                    BlockedTags: any[];
                    BlockUnratedItems: any[];
                    EnableAllChannels: boolean;
                    EnableAllDevices: boolean;
                    EnableAllFolders: boolean;
                    EnableAudioPlaybackTranscoding: boolean;
                    EnableContentDeletion: boolean;
                    EnableContentDeletionFromFolders: any[];
                    EnableContentDownloading: boolean;
                    EnabledChannels: any[];
                    EnabledDevices: any[];
                    EnabledFolders: any[];
                    EnableLiveTvAccess: boolean;
                    EnableLiveTvManagement: boolean;
                    EnableMediaConversion: boolean;
                    EnableMediaPlayback: boolean;
                    EnablePlaybackRemuxing: boolean;
                    EnablePublicSharing: boolean;
                    EnableRemoteAccess: boolean;
                    EnableRemoteControlOfOtherUsers: boolean;
                    EnableSharedDeviceControl: boolean;
                    EnableSyncTranscoding: boolean;
                    EnableUserPreferenceAccess: boolean;
                    EnableVideoPlaybackTranscoding: boolean;
                    ForceRemoteSourceTranscoding: boolean;
                    InvalidLoginAttemptCount: number;
                    IsAdministrator: boolean;
                    IsDisabled: boolean;
                    IsHidden: boolean;
                    LoginAttemptsBeforeLockout: number;
                    MaxActiveSessions: number;
                    PasswordResetProviderId: string;
                    RemoteClientBitrateLimit: number;
                    SyncPlayAccess: string;
                };
            }, {
                Name: string;
                Id: string;
                ServerId: string;
                LastActivityDate: string;
                Configuration: {
                    DisplayCollectionsView: boolean;
                    DisplayMissingEpisodes: boolean;
                    EnableLocalPassword: boolean;
                    EnableNextEpisodeAutoPlay: boolean;
                    GroupedFolders: any[];
                    HidePlayedInLatest: boolean;
                    LatestItemsExcludes: any[];
                    MyMediaExcludes: any[];
                    OrderedViews: any[];
                    PlayDefaultAudioTrack: boolean;
                    RememberAudioSelections: boolean;
                    RememberSubtitleSelections: boolean;
                    SubtitleLanguagePreference: string;
                    SubtitleMode: string;
                };
                EnableAutoLogin: boolean;
                HasConfiguredEasyPassword: boolean;
                HasConfiguredPassword: boolean;
                HasPassword: boolean;
                LastLoginDate: string;
                Policy: {
                    AccessSchedules: any[];
                    AuthenticationProviderId: string;
                    BlockedChannels: any[];
                    BlockedMediaFolders: any[];
                    BlockedTags: any[];
                    BlockUnratedItems: any[];
                    EnableAllChannels: boolean;
                    EnableAllDevices: boolean;
                    EnableAllFolders: boolean;
                    EnableAudioPlaybackTranscoding: boolean;
                    EnableContentDeletion: boolean;
                    EnableContentDeletionFromFolders: any[];
                    EnableContentDownloading: boolean;
                    EnabledChannels: any[];
                    EnabledDevices: any[];
                    EnabledFolders: any[];
                    EnableLiveTvAccess: boolean;
                    EnableLiveTvManagement: boolean;
                    EnableMediaConversion: boolean;
                    EnableMediaPlayback: boolean;
                    EnablePlaybackRemuxing: boolean;
                    EnablePublicSharing: boolean;
                    EnableRemoteAccess: boolean;
                    EnableRemoteControlOfOtherUsers: boolean;
                    EnableSharedDeviceControl: boolean;
                    EnableSyncTranscoding: boolean;
                    EnableUserPreferenceAccess: boolean;
                    EnableVideoPlaybackTranscoding: boolean;
                    ForceRemoteSourceTranscoding: boolean;
                    InvalidLoginAttemptCount: number;
                    IsAdministrator: boolean;
                    IsDisabled: boolean;
                    IsHidden: boolean;
                    LoginAttemptsBeforeLockout: number;
                    MaxActiveSessions: number;
                    PasswordResetProviderId: string;
                    RemoteClientBitrateLimit: number;
                    SyncPlayAccess: string;
                };
            }>;
            400: z.ZodObject<{
                errors: z.ZodObject<{
                    recursive: z.ZodArray<z.ZodString, "many">;
                }, "strip", z.ZodTypeAny, {
                    recursive: string[];
                }, {
                    recursive: string[];
                }>;
                status: z.ZodNumber;
                title: z.ZodString;
                traceId: z.ZodString;
                type: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                title: string;
                type: string;
                status: number;
                errors: {
                    recursive: string[];
                };
                traceId: string;
            }, {
                title: string;
                type: string;
                status: number;
                errors: {
                    recursive: string[];
                };
                traceId: string;
            }>;
        };
    };
    movePlaylistItem: {
        method: "POST";
        body: null;
        path: "playlists/:playlistId/items/:itemId/move/:newIdx";
        responses: {
            200: z.ZodNull;
            400: z.ZodObject<{
                errors: z.ZodObject<{
                    recursive: z.ZodArray<z.ZodString, "many">;
                }, "strip", z.ZodTypeAny, {
                    recursive: string[];
                }, {
                    recursive: string[];
                }>;
                status: z.ZodNumber;
                title: z.ZodString;
                traceId: z.ZodString;
                type: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                title: string;
                type: string;
                status: number;
                errors: {
                    recursive: string[];
                };
                traceId: string;
            }, {
                title: string;
                type: string;
                status: number;
                errors: {
                    recursive: string[];
                };
                traceId: string;
            }>;
        };
    };
    removeFavorite: {
        method: "DELETE";
        body: z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
        path: "users/:userId/favoriteitems/:id";
        responses: {
            200: z.ZodObject<{
                IsFavorite: z.ZodBoolean;
                ItemId: z.ZodString;
                Key: z.ZodString;
                LastPlayedDate: z.ZodString;
                Likes: z.ZodBoolean;
                PlaybackPositionTicks: z.ZodNumber;
                PlayCount: z.ZodNumber;
                Played: z.ZodBoolean;
                PlayedPercentage: z.ZodNumber;
                Rating: z.ZodNumber;
                UnplayedItemCount: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                PlayCount: number;
                IsFavorite: boolean;
                ItemId: string;
                Key: string;
                PlaybackPositionTicks: number;
                Played: boolean;
                LastPlayedDate: string;
                Likes: boolean;
                PlayedPercentage: number;
                Rating: number;
                UnplayedItemCount: number;
            }, {
                PlayCount: number;
                IsFavorite: boolean;
                ItemId: string;
                Key: string;
                PlaybackPositionTicks: number;
                Played: boolean;
                LastPlayedDate: string;
                Likes: boolean;
                PlayedPercentage: number;
                Rating: number;
                UnplayedItemCount: number;
            }>;
            400: z.ZodObject<{
                errors: z.ZodObject<{
                    recursive: z.ZodArray<z.ZodString, "many">;
                }, "strip", z.ZodTypeAny, {
                    recursive: string[];
                }, {
                    recursive: string[];
                }>;
                status: z.ZodNumber;
                title: z.ZodString;
                traceId: z.ZodString;
                type: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                title: string;
                type: string;
                status: number;
                errors: {
                    recursive: string[];
                };
                traceId: string;
            }, {
                title: string;
                type: string;
                status: number;
                errors: {
                    recursive: string[];
                };
                traceId: string;
            }>;
        };
    };
    removeFromPlaylist: {
        method: "DELETE";
        body: null;
        query: z.ZodObject<{
            EntryIds: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            EntryIds: string;
        }, {
            EntryIds: string;
        }>;
        path: "playlists/:id/items";
        responses: {
            200: z.ZodNull;
            400: z.ZodObject<{
                errors: z.ZodObject<{
                    recursive: z.ZodArray<z.ZodString, "many">;
                }, "strip", z.ZodTypeAny, {
                    recursive: string[];
                }, {
                    recursive: string[];
                }>;
                status: z.ZodNumber;
                title: z.ZodString;
                traceId: z.ZodString;
                type: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                title: string;
                type: string;
                status: number;
                errors: {
                    recursive: string[];
                };
                traceId: string;
            }, {
                title: string;
                type: string;
                status: number;
                errors: {
                    recursive: string[];
                };
                traceId: string;
            }>;
        };
    };
    savePlayQueue: {
        method: "POST";
        body: z.ZodObject<{
            EventName: z.ZodOptional<z.ZodString>;
            IsPaused: z.ZodOptional<z.ZodBoolean>;
            ItemId: z.ZodString;
            PositionTicks: z.ZodOptional<z.ZodNumber>;
        } & {
            NowPlayingQueue: z.ZodArray<z.ZodObject<{
                Id: z.ZodString;
                PlaylistItemId: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                Id: string;
                PlaylistItemId?: string | undefined;
            }, {
                Id: string;
                PlaylistItemId?: string | undefined;
            }>, "many">;
            PlaylistItemId: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            ItemId: string;
            NowPlayingQueue: {
                Id: string;
                PlaylistItemId?: string | undefined;
            }[];
            EventName?: string | undefined;
            IsPaused?: boolean | undefined;
            PositionTicks?: number | undefined;
            PlaylistItemId?: string | undefined;
        }, {
            ItemId: string;
            NowPlayingQueue: {
                Id: string;
                PlaylistItemId?: string | undefined;
            }[];
            EventName?: string | undefined;
            IsPaused?: boolean | undefined;
            PositionTicks?: number | undefined;
            PlaylistItemId?: string | undefined;
        }>;
        path: "sessions/playing";
        responses: {
            200: z.ZodAny;
            400: z.ZodObject<{
                errors: z.ZodObject<{
                    recursive: z.ZodArray<z.ZodString, "many">;
                }, "strip", z.ZodTypeAny, {
                    recursive: string[];
                }, {
                    recursive: string[];
                }>;
                status: z.ZodNumber;
                title: z.ZodString;
                traceId: z.ZodString;
                type: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                title: string;
                type: string;
                status: number;
                errors: {
                    recursive: string[];
                };
                traceId: string;
            }, {
                title: string;
                type: string;
                status: number;
                errors: {
                    recursive: string[];
                };
                traceId: string;
            }>;
        };
    };
    scrobblePlaying: {
        method: "POST";
        body: z.ZodObject<{
            EventName: z.ZodOptional<z.ZodString>;
            IsPaused: z.ZodOptional<z.ZodBoolean>;
            ItemId: z.ZodString;
            PositionTicks: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            ItemId: string;
            EventName?: string | undefined;
            IsPaused?: boolean | undefined;
            PositionTicks?: number | undefined;
        }, {
            ItemId: string;
            EventName?: string | undefined;
            IsPaused?: boolean | undefined;
            PositionTicks?: number | undefined;
        }>;
        path: "sessions/playing";
        responses: {
            200: z.ZodAny;
            400: z.ZodObject<{
                errors: z.ZodObject<{
                    recursive: z.ZodArray<z.ZodString, "many">;
                }, "strip", z.ZodTypeAny, {
                    recursive: string[];
                }, {
                    recursive: string[];
                }>;
                status: z.ZodNumber;
                title: z.ZodString;
                traceId: z.ZodString;
                type: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                title: string;
                type: string;
                status: number;
                errors: {
                    recursive: string[];
                };
                traceId: string;
            }, {
                title: string;
                type: string;
                status: number;
                errors: {
                    recursive: string[];
                };
                traceId: string;
            }>;
        };
    };
    scrobbleProgress: {
        method: "POST";
        body: z.ZodObject<{
            EventName: z.ZodOptional<z.ZodString>;
            IsPaused: z.ZodOptional<z.ZodBoolean>;
            ItemId: z.ZodString;
            PositionTicks: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            ItemId: string;
            EventName?: string | undefined;
            IsPaused?: boolean | undefined;
            PositionTicks?: number | undefined;
        }, {
            ItemId: string;
            EventName?: string | undefined;
            IsPaused?: boolean | undefined;
            PositionTicks?: number | undefined;
        }>;
        path: "sessions/playing/progress";
        responses: {
            200: z.ZodAny;
            400: z.ZodObject<{
                errors: z.ZodObject<{
                    recursive: z.ZodArray<z.ZodString, "many">;
                }, "strip", z.ZodTypeAny, {
                    recursive: string[];
                }, {
                    recursive: string[];
                }>;
                status: z.ZodNumber;
                title: z.ZodString;
                traceId: z.ZodString;
                type: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                title: string;
                type: string;
                status: number;
                errors: {
                    recursive: string[];
                };
                traceId: string;
            }, {
                title: string;
                type: string;
                status: number;
                errors: {
                    recursive: string[];
                };
                traceId: string;
            }>;
        };
    };
    scrobbleStopped: {
        method: "POST";
        body: z.ZodObject<{
            EventName: z.ZodOptional<z.ZodString>;
            IsPaused: z.ZodOptional<z.ZodBoolean>;
            ItemId: z.ZodString;
            PositionTicks: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            ItemId: string;
            EventName?: string | undefined;
            IsPaused?: boolean | undefined;
            PositionTicks?: number | undefined;
        }, {
            ItemId: string;
            EventName?: string | undefined;
            IsPaused?: boolean | undefined;
            PositionTicks?: number | undefined;
        }>;
        path: "sessions/playing/stopped";
        responses: {
            200: z.ZodAny;
            400: z.ZodObject<{
                errors: z.ZodObject<{
                    recursive: z.ZodArray<z.ZodString, "many">;
                }, "strip", z.ZodTypeAny, {
                    recursive: string[];
                }, {
                    recursive: string[];
                }>;
                status: z.ZodNumber;
                title: z.ZodString;
                traceId: z.ZodString;
                type: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                title: string;
                type: string;
                status: number;
                errors: {
                    recursive: string[];
                };
                traceId: string;
            }, {
                title: string;
                type: string;
                status: number;
                errors: {
                    recursive: string[];
                };
                traceId: string;
            }>;
        };
    };
    search: {
        method: "GET";
        query: z.ZodObject<{} & {
            AlbumArtistIds: z.ZodOptional<z.ZodString>;
            ArtistIds: z.ZodOptional<z.ZodString>;
            ContributingArtistIds: z.ZodOptional<z.ZodString>;
            EnableImageTypes: z.ZodOptional<z.ZodString>;
            EnableTotalRecordCount: z.ZodOptional<z.ZodBoolean>;
            EnableUserData: z.ZodOptional<z.ZodBoolean>;
            EnableUserDataTypes: z.ZodOptional<z.ZodBoolean>;
            ExcludeArtistIds: z.ZodOptional<z.ZodString>;
            ExcludeItemIds: z.ZodOptional<z.ZodString>;
            ExcludeItemTypes: z.ZodOptional<z.ZodString>;
            Fields: z.ZodOptional<z.ZodReadonly<z.ZodArray<z.ZodString, "many">>>;
            FolderId: z.ZodOptional<z.ZodString>;
            ImageTypeLimit: z.ZodOptional<z.ZodNumber>;
            IncludeArtists: z.ZodOptional<z.ZodBoolean>;
            IncludeGenres: z.ZodOptional<z.ZodBoolean>;
            IncludeItemTypes: z.ZodOptional<z.ZodString>;
            IncludeMedia: z.ZodOptional<z.ZodBoolean>;
            IncludePeople: z.ZodOptional<z.ZodBoolean>;
            IncludeStudios: z.ZodOptional<z.ZodBoolean>;
            IsFavorite: z.ZodOptional<z.ZodBoolean>;
            Limit: z.ZodOptional<z.ZodNumber>;
            MediaTypes: z.ZodOptional<z.ZodString>;
            NameStartsWith: z.ZodOptional<z.ZodString>;
            ParentId: z.ZodOptional<z.ZodString>;
            Recursive: z.ZodOptional<z.ZodBoolean>;
            SearchTerm: z.ZodOptional<z.ZodString>;
            SortBy: z.ZodOptional<z.ZodString>;
            SortOrder: z.ZodOptional<z.ZodEnum<["Ascending", "Descending"]>>;
            StartIndex: z.ZodOptional<z.ZodNumber>;
            Tags: z.ZodOptional<z.ZodString>;
            UserId: z.ZodOptional<z.ZodString>;
            Years: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            Limit?: number | undefined;
            UserId?: string | undefined;
            AlbumArtistIds?: string | undefined;
            ArtistIds?: string | undefined;
            ContributingArtistIds?: string | undefined;
            EnableImageTypes?: string | undefined;
            EnableTotalRecordCount?: boolean | undefined;
            EnableUserData?: boolean | undefined;
            EnableUserDataTypes?: boolean | undefined;
            ExcludeArtistIds?: string | undefined;
            ExcludeItemIds?: string | undefined;
            ExcludeItemTypes?: string | undefined;
            Fields?: readonly string[] | undefined;
            FolderId?: string | undefined;
            ImageTypeLimit?: number | undefined;
            IncludeArtists?: boolean | undefined;
            IncludeGenres?: boolean | undefined;
            IncludeItemTypes?: string | undefined;
            IncludeMedia?: boolean | undefined;
            IncludePeople?: boolean | undefined;
            IncludeStudios?: boolean | undefined;
            IsFavorite?: boolean | undefined;
            MediaTypes?: string | undefined;
            NameStartsWith?: string | undefined;
            ParentId?: string | undefined;
            Recursive?: boolean | undefined;
            SearchTerm?: string | undefined;
            SortBy?: string | undefined;
            SortOrder?: "Ascending" | "Descending" | undefined;
            StartIndex?: number | undefined;
            Tags?: string | undefined;
            Years?: string | undefined;
        }, {
            Limit?: number | undefined;
            UserId?: string | undefined;
            AlbumArtistIds?: string | undefined;
            ArtistIds?: string | undefined;
            ContributingArtistIds?: string | undefined;
            EnableImageTypes?: string | undefined;
            EnableTotalRecordCount?: boolean | undefined;
            EnableUserData?: boolean | undefined;
            EnableUserDataTypes?: boolean | undefined;
            ExcludeArtistIds?: string | undefined;
            ExcludeItemIds?: string | undefined;
            ExcludeItemTypes?: string | undefined;
            Fields?: readonly string[] | undefined;
            FolderId?: string | undefined;
            ImageTypeLimit?: number | undefined;
            IncludeArtists?: boolean | undefined;
            IncludeGenres?: boolean | undefined;
            IncludeItemTypes?: string | undefined;
            IncludeMedia?: boolean | undefined;
            IncludePeople?: boolean | undefined;
            IncludeStudios?: boolean | undefined;
            IsFavorite?: boolean | undefined;
            MediaTypes?: string | undefined;
            NameStartsWith?: string | undefined;
            ParentId?: string | undefined;
            Recursive?: boolean | undefined;
            SearchTerm?: string | undefined;
            SortBy?: string | undefined;
            SortOrder?: "Ascending" | "Descending" | undefined;
            StartIndex?: number | undefined;
            Tags?: string | undefined;
            Years?: string | undefined;
        }>;
        path: "users/:userId/items";
        responses: {
            200: z.ZodAny;
            400: z.ZodObject<{
                errors: z.ZodObject<{
                    recursive: z.ZodArray<z.ZodString, "many">;
                }, "strip", z.ZodTypeAny, {
                    recursive: string[];
                }, {
                    recursive: string[];
                }>;
                status: z.ZodNumber;
                title: z.ZodString;
                traceId: z.ZodString;
                type: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                title: string;
                type: string;
                status: number;
                errors: {
                    recursive: string[];
                };
                traceId: string;
            }, {
                title: string;
                type: string;
                status: number;
                errors: {
                    recursive: string[];
                };
                traceId: string;
            }>;
        };
    };
    updatePlaylist: {
        method: "POST";
        body: z.ZodObject<{
            Ids: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            IsPublic: z.ZodOptional<z.ZodBoolean>;
            Name: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            Name?: string | undefined;
            Ids?: string[] | undefined;
            IsPublic?: boolean | undefined;
        }, {
            Name?: string | undefined;
            Ids?: string[] | undefined;
            IsPublic?: boolean | undefined;
        }>;
        path: "playlists/:id";
        responses: {
            200: z.ZodNull;
            400: z.ZodObject<{
                errors: z.ZodObject<{
                    recursive: z.ZodArray<z.ZodString, "many">;
                }, "strip", z.ZodTypeAny, {
                    recursive: string[];
                }, {
                    recursive: string[];
                }>;
                status: z.ZodNumber;
                title: z.ZodString;
                traceId: z.ZodString;
                type: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                title: string;
                type: string;
                status: number;
                errors: {
                    recursive: string[];
                };
                traceId: string;
            }, {
                title: string;
                type: string;
                status: number;
                errors: {
                    recursive: string[];
                };
                traceId: string;
            }>;
        };
    };
};
export declare const createAuthHeader: () => string;
export declare const jfApiClient: (args: {
    server: null | ServerListItemWithCredential;
    signal?: AbortSignal;
    url?: string;
}) => {
    addToPlaylist: (args: {
        cache?: RequestCache | undefined;
        params: {
            id: string;
        };
        body: null;
        query: {
            Ids: string;
            UserId: string;
        };
        fetchOptions?: import("@ts-rest/core").FetchOptions | undefined;
        extraHeaders?: Record<string, string | undefined> | undefined;
        overrideClientOptions?: Partial<import("@ts-rest/core").OverrideableClientArgs> | undefined;
    }) => Promise<{
        status: 400;
        body: {
            title: string;
            type: string;
            status: number;
            errors: {
                recursive: string[];
            };
            traceId: string;
        };
        headers: Headers;
    } | {
        status: 204;
        body: {
            Added: number;
        };
        headers: Headers;
    } | {
        status: 404 | 401 | 403 | 200 | 300 | 100 | 500 | 101 | 102 | 201 | 202 | 203 | 205 | 206 | 207 | 301 | 302 | 303 | 304 | 305 | 307 | 308 | 402 | 405 | 406 | 407 | 408 | 409 | 410 | 411 | 412 | 413 | 414 | 415 | 416 | 417 | 418 | 419 | 420 | 421 | 422 | 423 | 424 | 428 | 429 | 431 | 451 | 501 | 502 | 503 | 504 | 505 | 507 | 511;
        body: unknown;
        headers: Headers;
    }>;
    authenticate: (args: {
        cache?: RequestCache | undefined;
        body: {
            Pw: string;
            Username: string;
        };
        fetchOptions?: import("@ts-rest/core").FetchOptions | undefined;
        extraHeaders?: Record<string, string | undefined> | undefined;
        overrideClientOptions?: Partial<import("@ts-rest/core").OverrideableClientArgs> | undefined;
    }) => Promise<{
        status: 200;
        body: {
            ServerId: string;
            AccessToken: string;
            SessionInfo: {
                UserId: string;
                Id: string;
                NowPlayingQueue: any[];
                ServerId: string;
                AdditionalUsers: any[];
                ApplicationVersion: string;
                Capabilities: {
                    PlayableMediaTypes: any[];
                    SupportedCommands: any[];
                    SupportsContentUploading: boolean;
                    SupportsMediaControl: boolean;
                    SupportsPersistentIdentifier: boolean;
                    SupportsSync: boolean;
                };
                PlayableMediaTypes: any[];
                SupportedCommands: any[];
                SupportsMediaControl: boolean;
                Client: string;
                DeviceId: string;
                DeviceName: string;
                HasCustomDeviceName: boolean;
                IsActive: boolean;
                LastActivityDate: string;
                LastPlaybackCheckIn: string;
                NowPlayingQueueFullItems: any[];
                PlayState: {
                    IsPaused: boolean;
                    CanSeek: boolean;
                    IsMuted: boolean;
                    RepeatMode: string;
                    PositionTicks?: number | undefined;
                };
                RemoteEndPoint: string;
                SupportsRemoteControl: boolean;
                UserName: string;
            };
            User: {
                Name: string;
                Id: string;
                ServerId: string;
                LastActivityDate: string;
                Configuration: {
                    DisplayCollectionsView: boolean;
                    DisplayMissingEpisodes: boolean;
                    EnableLocalPassword: boolean;
                    EnableNextEpisodeAutoPlay: boolean;
                    GroupedFolders: any[];
                    HidePlayedInLatest: boolean;
                    LatestItemsExcludes: any[];
                    MyMediaExcludes: any[];
                    OrderedViews: any[];
                    PlayDefaultAudioTrack: boolean;
                    RememberAudioSelections: boolean;
                    RememberSubtitleSelections: boolean;
                    SubtitleLanguagePreference: string;
                    SubtitleMode: string;
                };
                EnableAutoLogin: boolean;
                HasConfiguredEasyPassword: boolean;
                HasConfiguredPassword: boolean;
                HasPassword: boolean;
                LastLoginDate: string;
                Policy: {
                    AccessSchedules: any[];
                    AuthenticationProviderId: string;
                    BlockedChannels: any[];
                    BlockedMediaFolders: any[];
                    BlockedTags: any[];
                    BlockUnratedItems: any[];
                    EnableAllChannels: boolean;
                    EnableAllDevices: boolean;
                    EnableAllFolders: boolean;
                    EnableAudioPlaybackTranscoding: boolean;
                    EnableContentDeletion: boolean;
                    EnableContentDeletionFromFolders: any[];
                    EnableContentDownloading: boolean;
                    EnabledChannels: any[];
                    EnabledDevices: any[];
                    EnabledFolders: any[];
                    EnableLiveTvAccess: boolean;
                    EnableLiveTvManagement: boolean;
                    EnableMediaConversion: boolean;
                    EnableMediaPlayback: boolean;
                    EnablePlaybackRemuxing: boolean;
                    EnablePublicSharing: boolean;
                    EnableRemoteAccess: boolean;
                    EnableRemoteControlOfOtherUsers: boolean;
                    EnableSharedDeviceControl: boolean;
                    EnableSyncTranscoding: boolean;
                    EnableUserPreferenceAccess: boolean;
                    EnableVideoPlaybackTranscoding: boolean;
                    ForceRemoteSourceTranscoding: boolean;
                    InvalidLoginAttemptCount: number;
                    IsAdministrator: boolean;
                    IsDisabled: boolean;
                    IsHidden: boolean;
                    LoginAttemptsBeforeLockout: number;
                    MaxActiveSessions: number;
                    PasswordResetProviderId: string;
                    RemoteClientBitrateLimit: number;
                    SyncPlayAccess: string;
                };
            };
        };
        headers: Headers;
    } | {
        status: 400;
        body: {
            title: string;
            type: string;
            status: number;
            errors: {
                recursive: string[];
            };
            traceId: string;
        };
        headers: Headers;
    } | {
        status: 404 | 401 | 403 | 300 | 100 | 500 | 204 | 101 | 102 | 201 | 202 | 203 | 205 | 206 | 207 | 301 | 302 | 303 | 304 | 305 | 307 | 308 | 402 | 405 | 406 | 407 | 408 | 409 | 410 | 411 | 412 | 413 | 414 | 415 | 416 | 417 | 418 | 419 | 420 | 421 | 422 | 423 | 424 | 428 | 429 | 431 | 451 | 501 | 502 | 503 | 504 | 505 | 507 | 511;
        body: unknown;
        headers: Headers;
    }>;
    createFavorite: (args: {
        cache?: RequestCache | undefined;
        params: {
            userId: string;
            id: string;
        };
        fetchOptions?: import("@ts-rest/core").FetchOptions | undefined;
        extraHeaders?: Record<string, string | undefined> | undefined;
        overrideClientOptions?: Partial<import("@ts-rest/core").OverrideableClientArgs> | undefined;
        body?: {} | undefined;
    }) => Promise<{
        status: 200;
        body: {
            PlayCount: number;
            IsFavorite: boolean;
            ItemId: string;
            Key: string;
            PlaybackPositionTicks: number;
            Played: boolean;
            LastPlayedDate: string;
            Likes: boolean;
            PlayedPercentage: number;
            Rating: number;
            UnplayedItemCount: number;
        };
        headers: Headers;
    } | {
        status: 400;
        body: {
            title: string;
            type: string;
            status: number;
            errors: {
                recursive: string[];
            };
            traceId: string;
        };
        headers: Headers;
    } | {
        status: 404 | 401 | 403 | 300 | 100 | 500 | 204 | 101 | 102 | 201 | 202 | 203 | 205 | 206 | 207 | 301 | 302 | 303 | 304 | 305 | 307 | 308 | 402 | 405 | 406 | 407 | 408 | 409 | 410 | 411 | 412 | 413 | 414 | 415 | 416 | 417 | 418 | 419 | 420 | 421 | 422 | 423 | 424 | 428 | 429 | 431 | 451 | 501 | 502 | 503 | 504 | 505 | 507 | 511;
        body: unknown;
        headers: Headers;
    }>;
    createPlaylist: (args: {
        cache?: RequestCache | undefined;
        body: {
            Name: string;
            UserId: string;
            MediaType: "Audio";
            IsPublic?: boolean | undefined;
        };
        fetchOptions?: import("@ts-rest/core").FetchOptions | undefined;
        extraHeaders?: Record<string, string | undefined> | undefined;
        overrideClientOptions?: Partial<import("@ts-rest/core").OverrideableClientArgs> | undefined;
    }) => Promise<{
        status: 200;
        body: {
            Id: string;
        };
        headers: Headers;
    } | {
        status: 400;
        body: {
            title: string;
            type: string;
            status: number;
            errors: {
                recursive: string[];
            };
            traceId: string;
        };
        headers: Headers;
    } | {
        status: 404 | 401 | 403 | 300 | 100 | 500 | 204 | 101 | 102 | 201 | 202 | 203 | 205 | 206 | 207 | 301 | 302 | 303 | 304 | 305 | 307 | 308 | 402 | 405 | 406 | 407 | 408 | 409 | 410 | 411 | 412 | 413 | 414 | 415 | 416 | 417 | 418 | 419 | 420 | 421 | 422 | 423 | 424 | 428 | 429 | 431 | 451 | 501 | 502 | 503 | 504 | 505 | 507 | 511;
        body: unknown;
        headers: Headers;
    }>;
    deletePlaylist: (args: {
        cache?: RequestCache | undefined;
        params: {
            id: string;
        };
        fetchOptions?: import("@ts-rest/core").FetchOptions | undefined;
        extraHeaders?: Record<string, string | undefined> | undefined;
        overrideClientOptions?: Partial<import("@ts-rest/core").OverrideableClientArgs> | undefined;
    }) => Promise<{
        status: 400;
        body: {
            title: string;
            type: string;
            status: number;
            errors: {
                recursive: string[];
            };
            traceId: string;
        };
        headers: Headers;
    } | {
        status: 204;
        body: null;
        headers: Headers;
    } | {
        status: 404 | 401 | 403 | 200 | 300 | 100 | 500 | 101 | 102 | 201 | 202 | 203 | 205 | 206 | 207 | 301 | 302 | 303 | 304 | 305 | 307 | 308 | 402 | 405 | 406 | 407 | 408 | 409 | 410 | 411 | 412 | 413 | 414 | 415 | 416 | 417 | 418 | 419 | 420 | 421 | 422 | 423 | 424 | 428 | 429 | 431 | 451 | 501 | 502 | 503 | 504 | 505 | 507 | 511;
        body: unknown;
        headers: Headers;
    }>;
    getAlbumArtistDetail: (args: {
        cache?: RequestCache | undefined;
        params: {
            userId: string;
            id: string;
        };
        fetchOptions?: import("@ts-rest/core").FetchOptions | undefined;
        extraHeaders?: Record<string, string | undefined> | undefined;
        overrideClientOptions?: Partial<import("@ts-rest/core").OverrideableClientArgs> | undefined;
        query?: {
            Limit?: number | undefined;
            UserId?: string | undefined;
            AlbumArtistIds?: string | undefined;
            ArtistIds?: string | undefined;
            ContributingArtistIds?: string | undefined;
            EnableImageTypes?: string | undefined;
            EnableTotalRecordCount?: boolean | undefined;
            EnableUserData?: boolean | undefined;
            EnableUserDataTypes?: boolean | undefined;
            ExcludeArtistIds?: string | undefined;
            ExcludeItemIds?: string | undefined;
            ExcludeItemTypes?: string | undefined;
            Fields?: readonly string[] | undefined;
            FolderId?: string | undefined;
            ImageTypeLimit?: number | undefined;
            IncludeArtists?: boolean | undefined;
            IncludeGenres?: boolean | undefined;
            IncludeItemTypes?: string | undefined;
            IncludeMedia?: boolean | undefined;
            IncludePeople?: boolean | undefined;
            IncludeStudios?: boolean | undefined;
            IsFavorite?: boolean | undefined;
            MediaTypes?: string | undefined;
            NameStartsWith?: string | undefined;
            ParentId?: string | undefined;
            Recursive?: boolean | undefined;
            SearchTerm?: string | undefined;
            SortBy?: string | undefined;
            SortOrder?: "Ascending" | "Descending" | undefined;
            StartIndex?: number | undefined;
            Tags?: string | undefined;
            Years?: string | undefined;
        } | undefined;
    }) => Promise<{
        status: 200;
        body: {
            Name: string;
            Genres: string[];
            Id: string;
            ChannelId: null;
            DateCreated: string;
            ExternalUrls: {
                Name: string;
                Url: string;
            }[];
            GenreItems: {
                Name: string;
                Id: string;
            }[];
            ImageBlurHashes: {
                Backdrop?: Record<string, string> | undefined;
                Logo?: Record<string, string> | undefined;
                Primary?: Record<string, string> | undefined;
            };
            ImageTags: {
                Logo?: string | undefined;
                Primary?: string | undefined;
            };
            LocationType: string;
            Type: string;
            RunTimeTicks: number;
            ServerId: string;
            BackdropImageTags: string[];
            Overview: string;
            ProviderIds?: {
                MusicBrainzAlbum?: string | undefined;
                MusicBrainzAlbumArtist?: string | undefined;
                MusicBrainzArtist?: string | undefined;
                MusicBrainzRecording?: string | undefined;
                MusicBrainzReleaseGroup?: string | undefined;
                MusicBrainzTrack?: string | undefined;
            } | undefined;
            UserData?: {
                PlayCount: number;
                IsFavorite: boolean;
                Key: string;
                PlaybackPositionTicks: number;
                Played: boolean;
            } | undefined;
            AlbumCount?: number | undefined;
            SongCount?: number | undefined;
        };
        headers: Headers;
    } | {
        status: 400;
        body: {
            title: string;
            type: string;
            status: number;
            errors: {
                recursive: string[];
            };
            traceId: string;
        };
        headers: Headers;
    } | {
        status: 404 | 401 | 403 | 300 | 100 | 500 | 204 | 101 | 102 | 201 | 202 | 203 | 205 | 206 | 207 | 301 | 302 | 303 | 304 | 305 | 307 | 308 | 402 | 405 | 406 | 407 | 408 | 409 | 410 | 411 | 412 | 413 | 414 | 415 | 416 | 417 | 418 | 419 | 420 | 421 | 422 | 423 | 424 | 428 | 429 | 431 | 451 | 501 | 502 | 503 | 504 | 505 | 507 | 511;
        body: unknown;
        headers: Headers;
    }>;
    getAlbumArtistList: (args?: {
        cache?: RequestCache | undefined;
        fetchOptions?: import("@ts-rest/core").FetchOptions | undefined;
        extraHeaders?: Record<string, string | undefined> | undefined;
        overrideClientOptions?: Partial<import("@ts-rest/core").OverrideableClientArgs> | undefined;
        query?: {
            Limit?: number | undefined;
            Genres?: string | undefined;
            UserId?: string | undefined;
            AlbumArtistIds?: string | undefined;
            ArtistIds?: string | undefined;
            ContributingArtistIds?: string | undefined;
            EnableImageTypes?: string | undefined;
            EnableTotalRecordCount?: boolean | undefined;
            EnableUserData?: boolean | undefined;
            EnableUserDataTypes?: boolean | undefined;
            ExcludeArtistIds?: string | undefined;
            ExcludeItemIds?: string | undefined;
            ExcludeItemTypes?: string | undefined;
            Fields?: readonly string[] | undefined;
            FolderId?: string | undefined;
            ImageTypeLimit?: number | undefined;
            IncludeArtists?: boolean | undefined;
            IncludeGenres?: boolean | undefined;
            IncludeItemTypes?: string | undefined;
            IncludeMedia?: boolean | undefined;
            IncludePeople?: boolean | undefined;
            IncludeStudios?: boolean | undefined;
            IsFavorite?: boolean | undefined;
            MediaTypes?: string | undefined;
            NameStartsWith?: string | undefined;
            ParentId?: string | undefined;
            Recursive?: boolean | undefined;
            SearchTerm?: string | undefined;
            SortBy?: "Album,SortName" | "Runtime,AlbumArtist,Album,SortName" | "SortName,Name" | "Random,SortName" | "DateCreated,SortName" | "PremiereDate,AlbumArtist,Album,SortName" | undefined;
            SortOrder?: "Ascending" | "Descending" | undefined;
            StartIndex?: number | undefined;
            Tags?: string | undefined;
            Years?: string | undefined;
            Filters?: string | undefined;
        } | undefined;
    } | undefined) => Promise<{
        status: 200;
        body: {
            StartIndex: number;
            TotalRecordCount: number;
            Items: {
                Name: string;
                Genres: string[];
                Id: string;
                ChannelId: null;
                DateCreated: string;
                ExternalUrls: {
                    Name: string;
                    Url: string;
                }[];
                GenreItems: {
                    Name: string;
                    Id: string;
                }[];
                ImageBlurHashes: {
                    Backdrop?: Record<string, string> | undefined;
                    Logo?: Record<string, string> | undefined;
                    Primary?: Record<string, string> | undefined;
                };
                ImageTags: {
                    Logo?: string | undefined;
                    Primary?: string | undefined;
                };
                LocationType: string;
                Type: string;
                RunTimeTicks: number;
                ServerId: string;
                BackdropImageTags: string[];
                Overview: string;
                ProviderIds?: {
                    MusicBrainzAlbum?: string | undefined;
                    MusicBrainzAlbumArtist?: string | undefined;
                    MusicBrainzArtist?: string | undefined;
                    MusicBrainzRecording?: string | undefined;
                    MusicBrainzReleaseGroup?: string | undefined;
                    MusicBrainzTrack?: string | undefined;
                } | undefined;
                UserData?: {
                    PlayCount: number;
                    IsFavorite: boolean;
                    Key: string;
                    PlaybackPositionTicks: number;
                    Played: boolean;
                } | undefined;
                AlbumCount?: number | undefined;
                SongCount?: number | undefined;
            }[];
        };
        headers: Headers;
    } | {
        status: 400;
        body: {
            title: string;
            type: string;
            status: number;
            errors: {
                recursive: string[];
            };
            traceId: string;
        };
        headers: Headers;
    } | {
        status: 404 | 401 | 403 | 300 | 100 | 500 | 204 | 101 | 102 | 201 | 202 | 203 | 205 | 206 | 207 | 301 | 302 | 303 | 304 | 305 | 307 | 308 | 402 | 405 | 406 | 407 | 408 | 409 | 410 | 411 | 412 | 413 | 414 | 415 | 416 | 417 | 418 | 419 | 420 | 421 | 422 | 423 | 424 | 428 | 429 | 431 | 451 | 501 | 502 | 503 | 504 | 505 | 507 | 511;
        body: unknown;
        headers: Headers;
    }>;
    getAlbumDetail: (args: {
        cache?: RequestCache | undefined;
        params: {
            userId: string;
            id: string;
        };
        fetchOptions?: import("@ts-rest/core").FetchOptions | undefined;
        extraHeaders?: Record<string, string | undefined> | undefined;
        overrideClientOptions?: Partial<import("@ts-rest/core").OverrideableClientArgs> | undefined;
        query?: {
            Limit?: number | undefined;
            UserId?: string | undefined;
            AlbumArtistIds?: string | undefined;
            ArtistIds?: string | undefined;
            ContributingArtistIds?: string | undefined;
            EnableImageTypes?: string | undefined;
            EnableTotalRecordCount?: boolean | undefined;
            EnableUserData?: boolean | undefined;
            EnableUserDataTypes?: boolean | undefined;
            ExcludeArtistIds?: string | undefined;
            ExcludeItemIds?: string | undefined;
            ExcludeItemTypes?: string | undefined;
            Fields?: readonly string[] | undefined;
            FolderId?: string | undefined;
            ImageTypeLimit?: number | undefined;
            IncludeArtists?: boolean | undefined;
            IncludeGenres?: boolean | undefined;
            IncludeItemTypes?: string | undefined;
            IncludeMedia?: boolean | undefined;
            IncludePeople?: boolean | undefined;
            IncludeStudios?: boolean | undefined;
            IsFavorite?: boolean | undefined;
            MediaTypes?: string | undefined;
            NameStartsWith?: string | undefined;
            ParentId?: string | undefined;
            Recursive?: boolean | undefined;
            SearchTerm?: string | undefined;
            SortBy?: string | undefined;
            SortOrder?: "Ascending" | "Descending" | undefined;
            StartIndex?: number | undefined;
            Tags?: string | undefined;
            Years?: string | undefined;
        } | undefined;
    }) => Promise<{
        status: 200;
        body: {
            Name: string;
            Genres: string[];
            Id: string;
            AlbumArtist: string;
            AlbumArtists: {
                Name: string;
                Id: string;
            }[];
            AlbumPrimaryImageTag: string;
            ArtistItems: {
                Name: string;
                Id: string;
            }[];
            Artists: string[];
            ChannelId: null;
            DateCreated: string;
            ExternalUrls: {
                Name: string;
                Url: string;
            }[];
            GenreItems: {
                Name: string;
                Id: string;
            }[];
            ImageBlurHashes: {
                Backdrop?: Record<string, string> | undefined;
                Logo?: Record<string, string> | undefined;
                Primary?: Record<string, string> | undefined;
            };
            ImageTags: {
                Logo?: string | undefined;
                Primary?: string | undefined;
            };
            IsFolder: boolean;
            LocationType: string;
            ParentLogoImageTag: string;
            ParentLogoItemId: string;
            Type: string;
            ProductionYear: number;
            RunTimeTicks: number;
            ServerId: string;
            Studios: {
                Name: string;
                Id: string;
            }[];
            SortName?: string | undefined;
            ChildCount?: number | undefined;
            Tags?: string[] | undefined;
            DateLastMediaAdded?: string | undefined;
            People?: {
                Name: string;
                Id: string;
                Type?: string | undefined;
            }[] | undefined;
            PremiereDate?: string | undefined;
            ProviderIds?: {
                MusicBrainzAlbum?: string | undefined;
                MusicBrainzAlbumArtist?: string | undefined;
                MusicBrainzArtist?: string | undefined;
                MusicBrainzRecording?: string | undefined;
                MusicBrainzReleaseGroup?: string | undefined;
                MusicBrainzTrack?: string | undefined;
            } | undefined;
            UserData?: {
                PlayCount: number;
                IsFavorite: boolean;
                Key: string;
                PlaybackPositionTicks: number;
                Played: boolean;
            } | undefined;
            Songs?: {
                Name: string;
                Genres: string[];
                Album: string;
                MediaType: string;
                Id: string;
                AlbumArtist: string;
                AlbumArtists: {
                    Name: string;
                    Id: string;
                }[];
                AlbumPrimaryImageTag: string;
                ArtistItems: {
                    Name: string;
                    Id: string;
                }[];
                Artists: string[];
                ChannelId: null;
                DateCreated: string;
                ExternalUrls: {
                    Name: string;
                    Url: string;
                }[];
                GenreItems: {
                    Name: string;
                    Id: string;
                }[];
                ImageBlurHashes: {
                    Backdrop?: Record<string, string> | undefined;
                    Logo?: Record<string, string> | undefined;
                    Primary?: Record<string, string> | undefined;
                };
                ImageTags: {
                    Logo?: string | undefined;
                    Primary?: string | undefined;
                };
                IsFolder: boolean;
                LocationType: string;
                Type: string;
                ProductionYear: number;
                RunTimeTicks: number;
                ServerId: string;
                BackdropImageTags: string[];
                IndexNumber: number;
                MediaSources: {
                    Name: string;
                    Bitrate: number;
                    Id: string;
                    Type: string;
                    RunTimeTicks: number;
                    Container: string;
                    DefaultAudioStreamIndex: number;
                    ETag: string;
                    Formats: any[];
                    GenPtsInput: boolean;
                    IgnoreDts: boolean;
                    IgnoreIndex: boolean;
                    IsInfiniteStream: boolean;
                    IsRemote: boolean;
                    MediaAttachments: any[];
                    MediaStreams: {
                        Codec: string;
                        Level: number;
                        Type: string;
                        CodecTimeBase: string;
                        Index: number;
                        IsDefault: boolean;
                        IsExternal: boolean;
                        IsForced: boolean;
                        IsInterlaced: boolean;
                        IsTextSubtitleStream: boolean;
                        SupportsExternalStream: boolean;
                        TimeBase: string;
                        AspectRatio?: string | undefined;
                        BitDepth?: number | undefined;
                        BitRate?: number | undefined;
                        ChannelLayout?: string | undefined;
                        Channels?: number | undefined;
                        ColorSpace?: string | undefined;
                        Comment?: string | undefined;
                        DisplayTitle?: string | undefined;
                        Height?: number | undefined;
                        PixelFormat?: string | undefined;
                        Profile?: string | undefined;
                        RealFrameRate?: number | undefined;
                        RefFrames?: number | undefined;
                        SampleRate?: number | undefined;
                        Width?: number | undefined;
                    }[];
                    Path: string;
                    Protocol: string;
                    ReadAtNativeFramerate: boolean;
                    RequiresClosing: boolean;
                    RequiresLooping: boolean;
                    RequiresOpening: boolean;
                    Size: number;
                    SupportsDirectPlay: boolean;
                    SupportsDirectStream: boolean;
                    SupportsProbing: boolean;
                    SupportsTranscoding: boolean;
                    RequiredHttpHeaders?: any;
                }[];
                ParentIndexNumber: number;
                SortName?: string | undefined;
                ParentId?: string | undefined;
                Tags?: string[] | undefined;
                PlaylistItemId?: string | undefined;
                People?: {
                    Name: string;
                    Id: string;
                    Type?: string | undefined;
                }[] | undefined;
                PremiereDate?: string | undefined;
                ProviderIds?: {
                    MusicBrainzAlbum?: string | undefined;
                    MusicBrainzAlbumArtist?: string | undefined;
                    MusicBrainzArtist?: string | undefined;
                    MusicBrainzRecording?: string | undefined;
                    MusicBrainzReleaseGroup?: string | undefined;
                    MusicBrainzTrack?: string | undefined;
                } | undefined;
                AlbumId?: string | undefined;
                LUFS?: number | undefined;
                NormalizationGain?: number | undefined;
                UserData?: {
                    PlayCount: number;
                    IsFavorite: boolean;
                    Key: string;
                    PlaybackPositionTicks: number;
                    Played: boolean;
                } | undefined;
            }[] | undefined;
        };
        headers: Headers;
    } | {
        status: 400;
        body: {
            title: string;
            type: string;
            status: number;
            errors: {
                recursive: string[];
            };
            traceId: string;
        };
        headers: Headers;
    } | {
        status: 404 | 401 | 403 | 300 | 100 | 500 | 204 | 101 | 102 | 201 | 202 | 203 | 205 | 206 | 207 | 301 | 302 | 303 | 304 | 305 | 307 | 308 | 402 | 405 | 406 | 407 | 408 | 409 | 410 | 411 | 412 | 413 | 414 | 415 | 416 | 417 | 418 | 419 | 420 | 421 | 422 | 423 | 424 | 428 | 429 | 431 | 451 | 501 | 502 | 503 | 504 | 505 | 507 | 511;
        body: unknown;
        headers: Headers;
    }>;
    getAlbumList: (args: {
        cache?: RequestCache | undefined;
        params: {
            userId: string;
        };
        query: {
            IncludeItemTypes: "MusicAlbum";
            Limit?: number | undefined;
            Genres?: string | undefined;
            UserId?: string | undefined;
            AlbumArtistIds?: string | undefined;
            ArtistIds?: string | undefined;
            ContributingArtistIds?: string | undefined;
            EnableImageTypes?: string | undefined;
            EnableTotalRecordCount?: boolean | undefined;
            EnableUserData?: boolean | undefined;
            EnableUserDataTypes?: boolean | undefined;
            ExcludeArtistIds?: string | undefined;
            ExcludeItemIds?: string | undefined;
            ExcludeItemTypes?: string | undefined;
            Fields?: readonly string[] | undefined;
            FolderId?: string | undefined;
            ImageTypeLimit?: number | undefined;
            IncludeArtists?: boolean | undefined;
            IncludeGenres?: boolean | undefined;
            IncludeMedia?: boolean | undefined;
            IncludePeople?: boolean | undefined;
            IncludeStudios?: boolean | undefined;
            IsFavorite?: boolean | undefined;
            MediaTypes?: string | undefined;
            NameStartsWith?: string | undefined;
            ParentId?: string | undefined;
            Recursive?: boolean | undefined;
            SearchTerm?: string | undefined;
            SortBy?: "Random,SortName" | "DateCreated,SortName" | "AlbumArtist,SortName" | "CommunityRating,SortName" | "CriticRating,SortName" | "SortName" | "PlayCount" | "ProductionYear,PremiereDate,SortName" | undefined;
            SortOrder?: "Ascending" | "Descending" | undefined;
            StartIndex?: number | undefined;
            Tags?: string | undefined;
            Years?: string | undefined;
            Filters?: string | undefined;
            GenreIds?: string | undefined;
        };
        fetchOptions?: import("@ts-rest/core").FetchOptions | undefined;
        extraHeaders?: Record<string, string | undefined> | undefined;
        overrideClientOptions?: Partial<import("@ts-rest/core").OverrideableClientArgs> | undefined;
    }) => Promise<{
        status: 200;
        body: {
            StartIndex: number;
            TotalRecordCount: number;
            Items: {
                Name: string;
                Genres: string[];
                Id: string;
                AlbumArtist: string;
                AlbumArtists: {
                    Name: string;
                    Id: string;
                }[];
                AlbumPrimaryImageTag: string;
                ArtistItems: {
                    Name: string;
                    Id: string;
                }[];
                Artists: string[];
                ChannelId: null;
                DateCreated: string;
                ExternalUrls: {
                    Name: string;
                    Url: string;
                }[];
                GenreItems: {
                    Name: string;
                    Id: string;
                }[];
                ImageBlurHashes: {
                    Backdrop?: Record<string, string> | undefined;
                    Logo?: Record<string, string> | undefined;
                    Primary?: Record<string, string> | undefined;
                };
                ImageTags: {
                    Logo?: string | undefined;
                    Primary?: string | undefined;
                };
                IsFolder: boolean;
                LocationType: string;
                ParentLogoImageTag: string;
                ParentLogoItemId: string;
                Type: string;
                ProductionYear: number;
                RunTimeTicks: number;
                ServerId: string;
                Studios: {
                    Name: string;
                    Id: string;
                }[];
                SortName?: string | undefined;
                ChildCount?: number | undefined;
                Tags?: string[] | undefined;
                DateLastMediaAdded?: string | undefined;
                People?: {
                    Name: string;
                    Id: string;
                    Type?: string | undefined;
                }[] | undefined;
                PremiereDate?: string | undefined;
                ProviderIds?: {
                    MusicBrainzAlbum?: string | undefined;
                    MusicBrainzAlbumArtist?: string | undefined;
                    MusicBrainzArtist?: string | undefined;
                    MusicBrainzRecording?: string | undefined;
                    MusicBrainzReleaseGroup?: string | undefined;
                    MusicBrainzTrack?: string | undefined;
                } | undefined;
                UserData?: {
                    PlayCount: number;
                    IsFavorite: boolean;
                    Key: string;
                    PlaybackPositionTicks: number;
                    Played: boolean;
                } | undefined;
                Songs?: {
                    Name: string;
                    Genres: string[];
                    Album: string;
                    MediaType: string;
                    Id: string;
                    AlbumArtist: string;
                    AlbumArtists: {
                        Name: string;
                        Id: string;
                    }[];
                    AlbumPrimaryImageTag: string;
                    ArtistItems: {
                        Name: string;
                        Id: string;
                    }[];
                    Artists: string[];
                    ChannelId: null;
                    DateCreated: string;
                    ExternalUrls: {
                        Name: string;
                        Url: string;
                    }[];
                    GenreItems: {
                        Name: string;
                        Id: string;
                    }[];
                    ImageBlurHashes: {
                        Backdrop?: Record<string, string> | undefined;
                        Logo?: Record<string, string> | undefined;
                        Primary?: Record<string, string> | undefined;
                    };
                    ImageTags: {
                        Logo?: string | undefined;
                        Primary?: string | undefined;
                    };
                    IsFolder: boolean;
                    LocationType: string;
                    Type: string;
                    ProductionYear: number;
                    RunTimeTicks: number;
                    ServerId: string;
                    BackdropImageTags: string[];
                    IndexNumber: number;
                    MediaSources: {
                        Name: string;
                        Bitrate: number;
                        Id: string;
                        Type: string;
                        RunTimeTicks: number;
                        Container: string;
                        DefaultAudioStreamIndex: number;
                        ETag: string;
                        Formats: any[];
                        GenPtsInput: boolean;
                        IgnoreDts: boolean;
                        IgnoreIndex: boolean;
                        IsInfiniteStream: boolean;
                        IsRemote: boolean;
                        MediaAttachments: any[];
                        MediaStreams: {
                            Codec: string;
                            Level: number;
                            Type: string;
                            CodecTimeBase: string;
                            Index: number;
                            IsDefault: boolean;
                            IsExternal: boolean;
                            IsForced: boolean;
                            IsInterlaced: boolean;
                            IsTextSubtitleStream: boolean;
                            SupportsExternalStream: boolean;
                            TimeBase: string;
                            AspectRatio?: string | undefined;
                            BitDepth?: number | undefined;
                            BitRate?: number | undefined;
                            ChannelLayout?: string | undefined;
                            Channels?: number | undefined;
                            ColorSpace?: string | undefined;
                            Comment?: string | undefined;
                            DisplayTitle?: string | undefined;
                            Height?: number | undefined;
                            PixelFormat?: string | undefined;
                            Profile?: string | undefined;
                            RealFrameRate?: number | undefined;
                            RefFrames?: number | undefined;
                            SampleRate?: number | undefined;
                            Width?: number | undefined;
                        }[];
                        Path: string;
                        Protocol: string;
                        ReadAtNativeFramerate: boolean;
                        RequiresClosing: boolean;
                        RequiresLooping: boolean;
                        RequiresOpening: boolean;
                        Size: number;
                        SupportsDirectPlay: boolean;
                        SupportsDirectStream: boolean;
                        SupportsProbing: boolean;
                        SupportsTranscoding: boolean;
                        RequiredHttpHeaders?: any;
                    }[];
                    ParentIndexNumber: number;
                    SortName?: string | undefined;
                    ParentId?: string | undefined;
                    Tags?: string[] | undefined;
                    PlaylistItemId?: string | undefined;
                    People?: {
                        Name: string;
                        Id: string;
                        Type?: string | undefined;
                    }[] | undefined;
                    PremiereDate?: string | undefined;
                    ProviderIds?: {
                        MusicBrainzAlbum?: string | undefined;
                        MusicBrainzAlbumArtist?: string | undefined;
                        MusicBrainzArtist?: string | undefined;
                        MusicBrainzRecording?: string | undefined;
                        MusicBrainzReleaseGroup?: string | undefined;
                        MusicBrainzTrack?: string | undefined;
                    } | undefined;
                    AlbumId?: string | undefined;
                    LUFS?: number | undefined;
                    NormalizationGain?: number | undefined;
                    UserData?: {
                        PlayCount: number;
                        IsFavorite: boolean;
                        Key: string;
                        PlaybackPositionTicks: number;
                        Played: boolean;
                    } | undefined;
                }[] | undefined;
            }[];
        };
        headers: Headers;
    } | {
        status: 400;
        body: {
            title: string;
            type: string;
            status: number;
            errors: {
                recursive: string[];
            };
            traceId: string;
        };
        headers: Headers;
    } | {
        status: 404 | 401 | 403 | 300 | 100 | 500 | 204 | 101 | 102 | 201 | 202 | 203 | 205 | 206 | 207 | 301 | 302 | 303 | 304 | 305 | 307 | 308 | 402 | 405 | 406 | 407 | 408 | 409 | 410 | 411 | 412 | 413 | 414 | 415 | 416 | 417 | 418 | 419 | 420 | 421 | 422 | 423 | 424 | 428 | 429 | 431 | 451 | 501 | 502 | 503 | 504 | 505 | 507 | 511;
        body: unknown;
        headers: Headers;
    }>;
    getArtistList: (args?: {
        cache?: RequestCache | undefined;
        fetchOptions?: import("@ts-rest/core").FetchOptions | undefined;
        extraHeaders?: Record<string, string | undefined> | undefined;
        overrideClientOptions?: Partial<import("@ts-rest/core").OverrideableClientArgs> | undefined;
        query?: {
            Limit?: number | undefined;
            Genres?: string | undefined;
            UserId?: string | undefined;
            AlbumArtistIds?: string | undefined;
            ArtistIds?: string | undefined;
            ContributingArtistIds?: string | undefined;
            EnableImageTypes?: string | undefined;
            EnableTotalRecordCount?: boolean | undefined;
            EnableUserData?: boolean | undefined;
            EnableUserDataTypes?: boolean | undefined;
            ExcludeArtistIds?: string | undefined;
            ExcludeItemIds?: string | undefined;
            ExcludeItemTypes?: string | undefined;
            Fields?: readonly string[] | undefined;
            FolderId?: string | undefined;
            ImageTypeLimit?: number | undefined;
            IncludeArtists?: boolean | undefined;
            IncludeGenres?: boolean | undefined;
            IncludeItemTypes?: string | undefined;
            IncludeMedia?: boolean | undefined;
            IncludePeople?: boolean | undefined;
            IncludeStudios?: boolean | undefined;
            IsFavorite?: boolean | undefined;
            MediaTypes?: string | undefined;
            NameStartsWith?: string | undefined;
            ParentId?: string | undefined;
            Recursive?: boolean | undefined;
            SearchTerm?: string | undefined;
            SortBy?: "Album,SortName" | "Runtime,AlbumArtist,Album,SortName" | "SortName,Name" | "Random,SortName" | "DateCreated,SortName" | "PremiereDate,AlbumArtist,Album,SortName" | undefined;
            SortOrder?: "Ascending" | "Descending" | undefined;
            StartIndex?: number | undefined;
            Tags?: string | undefined;
            Years?: string | undefined;
            Filters?: string | undefined;
        } | undefined;
    } | undefined) => Promise<{
        status: 200;
        body: {
            StartIndex: number;
            TotalRecordCount: number;
            Items: {
                Name: string;
                Genres: string[];
                Id: string;
                ChannelId: null;
                DateCreated: string;
                ExternalUrls: {
                    Name: string;
                    Url: string;
                }[];
                GenreItems: {
                    Name: string;
                    Id: string;
                }[];
                ImageBlurHashes: {
                    Backdrop?: Record<string, string> | undefined;
                    Logo?: Record<string, string> | undefined;
                    Primary?: Record<string, string> | undefined;
                };
                ImageTags: {
                    Logo?: string | undefined;
                    Primary?: string | undefined;
                };
                LocationType: string;
                Type: string;
                RunTimeTicks: number;
                ServerId: string;
                BackdropImageTags: string[];
                Overview: string;
                ProviderIds?: {
                    MusicBrainzAlbum?: string | undefined;
                    MusicBrainzAlbumArtist?: string | undefined;
                    MusicBrainzArtist?: string | undefined;
                    MusicBrainzRecording?: string | undefined;
                    MusicBrainzReleaseGroup?: string | undefined;
                    MusicBrainzTrack?: string | undefined;
                } | undefined;
                UserData?: {
                    PlayCount: number;
                    IsFavorite: boolean;
                    Key: string;
                    PlaybackPositionTicks: number;
                    Played: boolean;
                } | undefined;
                AlbumCount?: number | undefined;
                SongCount?: number | undefined;
            }[];
        };
        headers: Headers;
    } | {
        status: 400;
        body: {
            title: string;
            type: string;
            status: number;
            errors: {
                recursive: string[];
            };
            traceId: string;
        };
        headers: Headers;
    } | {
        status: 404 | 401 | 403 | 300 | 100 | 500 | 204 | 101 | 102 | 201 | 202 | 203 | 205 | 206 | 207 | 301 | 302 | 303 | 304 | 305 | 307 | 308 | 402 | 405 | 406 | 407 | 408 | 409 | 410 | 411 | 412 | 413 | 414 | 415 | 416 | 417 | 418 | 419 | 420 | 421 | 422 | 423 | 424 | 428 | 429 | 431 | 451 | 501 | 502 | 503 | 504 | 505 | 507 | 511;
        body: unknown;
        headers: Headers;
    }>;
    getFilterList: (args?: {
        cache?: RequestCache | undefined;
        fetchOptions?: import("@ts-rest/core").FetchOptions | undefined;
        extraHeaders?: Record<string, string | undefined> | undefined;
        overrideClientOptions?: Partial<import("@ts-rest/core").OverrideableClientArgs> | undefined;
        query?: {
            UserId?: string | undefined;
            IncludeItemTypes?: string | undefined;
            ParentId?: string | undefined;
        } | undefined;
    } | undefined) => Promise<{
        status: 200;
        body: {
            Genres?: string[] | undefined;
            Tags?: string[] | undefined;
            Years?: number[] | undefined;
        };
        headers: Headers;
    } | {
        status: 400;
        body: {
            title: string;
            type: string;
            status: number;
            errors: {
                recursive: string[];
            };
            traceId: string;
        };
        headers: Headers;
    } | {
        status: 404 | 401 | 403 | 300 | 100 | 500 | 204 | 101 | 102 | 201 | 202 | 203 | 205 | 206 | 207 | 301 | 302 | 303 | 304 | 305 | 307 | 308 | 402 | 405 | 406 | 407 | 408 | 409 | 410 | 411 | 412 | 413 | 414 | 415 | 416 | 417 | 418 | 419 | 420 | 421 | 422 | 423 | 424 | 428 | 429 | 431 | 451 | 501 | 502 | 503 | 504 | 505 | 507 | 511;
        body: unknown;
        headers: Headers;
    }>;
    getFolder: (args: {
        cache?: RequestCache | undefined;
        params: {
            userId: string;
        };
        fetchOptions?: import("@ts-rest/core").FetchOptions | undefined;
        extraHeaders?: Record<string, string | undefined> | undefined;
        overrideClientOptions?: Partial<import("@ts-rest/core").OverrideableClientArgs> | undefined;
        query?: {
            Fields?: readonly string[] | undefined;
            ParentId?: string | undefined;
            SortBy?: string | undefined;
            SortOrder?: "Ascending" | "Descending" | undefined;
        } | undefined;
    }) => Promise<{
        status: 200;
        body: {
            StartIndex: number;
            TotalRecordCount: number;
            Items: {
                Name: string;
                MediaType: string;
                Id: string;
                ChannelId: null;
                ImageBlurHashes: {
                    Backdrop?: Record<string, string> | undefined;
                    Logo?: Record<string, string> | undefined;
                    Primary?: Record<string, string> | undefined;
                };
                ImageTags: {
                    Logo?: string | undefined;
                    Primary?: string | undefined;
                };
                IsFolder: boolean;
                LocationType: string;
                Type: string;
                ServerId: string;
                BackdropImageTags: string[];
                CollectionType: string;
                ParentId?: string | undefined;
                UserData?: {
                    PlayCount: number;
                    IsFavorite: boolean;
                    Key: string;
                    PlaybackPositionTicks: number;
                    Played: boolean;
                } | undefined;
            }[];
        };
        headers: Headers;
    } | {
        status: 400;
        body: {
            title: string;
            type: string;
            status: number;
            errors: {
                recursive: string[];
            };
            traceId: string;
        };
        headers: Headers;
    } | {
        status: 404 | 401 | 403 | 300 | 100 | 500 | 204 | 101 | 102 | 201 | 202 | 203 | 205 | 206 | 207 | 301 | 302 | 303 | 304 | 305 | 307 | 308 | 402 | 405 | 406 | 407 | 408 | 409 | 410 | 411 | 412 | 413 | 414 | 415 | 416 | 417 | 418 | 419 | 420 | 421 | 422 | 423 | 424 | 428 | 429 | 431 | 451 | 501 | 502 | 503 | 504 | 505 | 507 | 511;
        body: unknown;
        headers: Headers;
    }>;
    getGenreList: (args?: {
        cache?: RequestCache | undefined;
        fetchOptions?: import("@ts-rest/core").FetchOptions | undefined;
        extraHeaders?: Record<string, string | undefined> | undefined;
        overrideClientOptions?: Partial<import("@ts-rest/core").OverrideableClientArgs> | undefined;
        query?: {
            Limit?: number | undefined;
            UserId?: string | undefined;
            AlbumArtistIds?: string | undefined;
            ArtistIds?: string | undefined;
            ContributingArtistIds?: string | undefined;
            EnableImageTypes?: string | undefined;
            EnableTotalRecordCount?: boolean | undefined;
            EnableUserData?: boolean | undefined;
            EnableUserDataTypes?: boolean | undefined;
            ExcludeArtistIds?: string | undefined;
            ExcludeItemIds?: string | undefined;
            ExcludeItemTypes?: string | undefined;
            Fields?: readonly string[] | undefined;
            FolderId?: string | undefined;
            ImageTypeLimit?: number | undefined;
            IncludeArtists?: boolean | undefined;
            IncludeGenres?: boolean | undefined;
            IncludeItemTypes?: string | undefined;
            IncludeMedia?: boolean | undefined;
            IncludePeople?: boolean | undefined;
            IncludeStudios?: boolean | undefined;
            IsFavorite?: boolean | undefined;
            MediaTypes?: string | undefined;
            NameStartsWith?: string | undefined;
            ParentId?: string | undefined;
            Recursive?: boolean | undefined;
            SearchTerm?: string | undefined;
            SortBy?: "SortName" | undefined;
            SortOrder?: "Ascending" | "Descending" | undefined;
            StartIndex?: number | undefined;
            Tags?: string | undefined;
            Years?: string | undefined;
        } | undefined;
    } | undefined) => Promise<{
        status: 200;
        body: {
            StartIndex: number;
            TotalRecordCount: number;
            Items: {
                Name: string;
                Id: string;
                ChannelId: null;
                ImageBlurHashes: {
                    Backdrop?: Record<string, string> | undefined;
                    Logo?: Record<string, string> | undefined;
                    Primary?: Record<string, string> | undefined;
                };
                ImageTags: {
                    Logo?: string | undefined;
                    Primary?: string | undefined;
                };
                LocationType: string;
                Type: string;
                ServerId: string;
                BackdropImageTags: any[];
            }[];
        };
        headers: Headers;
    } | {
        status: 400;
        body: {
            title: string;
            type: string;
            status: number;
            errors: {
                recursive: string[];
            };
            traceId: string;
        };
        headers: Headers;
    } | {
        status: 404 | 401 | 403 | 300 | 100 | 500 | 204 | 101 | 102 | 201 | 202 | 203 | 205 | 206 | 207 | 301 | 302 | 303 | 304 | 305 | 307 | 308 | 402 | 405 | 406 | 407 | 408 | 409 | 410 | 411 | 412 | 413 | 414 | 415 | 416 | 417 | 418 | 419 | 420 | 421 | 422 | 423 | 424 | 428 | 429 | 431 | 451 | 501 | 502 | 503 | 504 | 505 | 507 | 511;
        body: unknown;
        headers: Headers;
    }>;
    getInstantMix: (args: {
        cache?: RequestCache | undefined;
        params: {
            itemId: string;
        };
        fetchOptions?: import("@ts-rest/core").FetchOptions | undefined;
        extraHeaders?: Record<string, string | undefined> | undefined;
        overrideClientOptions?: Partial<import("@ts-rest/core").OverrideableClientArgs> | undefined;
        query?: {
            Limit?: number | undefined;
            UserId?: string | undefined;
            Fields?: readonly string[] | undefined;
        } | undefined;
    }) => Promise<{
        status: 200;
        body: {
            StartIndex: number;
            TotalRecordCount: number;
            Items: {
                Name: string;
                Genres: string[];
                Album: string;
                MediaType: string;
                Id: string;
                AlbumArtist: string;
                AlbumArtists: {
                    Name: string;
                    Id: string;
                }[];
                AlbumPrimaryImageTag: string;
                ArtistItems: {
                    Name: string;
                    Id: string;
                }[];
                Artists: string[];
                ChannelId: null;
                DateCreated: string;
                ExternalUrls: {
                    Name: string;
                    Url: string;
                }[];
                GenreItems: {
                    Name: string;
                    Id: string;
                }[];
                ImageBlurHashes: {
                    Backdrop?: Record<string, string> | undefined;
                    Logo?: Record<string, string> | undefined;
                    Primary?: Record<string, string> | undefined;
                };
                ImageTags: {
                    Logo?: string | undefined;
                    Primary?: string | undefined;
                };
                IsFolder: boolean;
                LocationType: string;
                Type: string;
                ProductionYear: number;
                RunTimeTicks: number;
                ServerId: string;
                BackdropImageTags: string[];
                IndexNumber: number;
                MediaSources: {
                    Name: string;
                    Bitrate: number;
                    Id: string;
                    Type: string;
                    RunTimeTicks: number;
                    Container: string;
                    DefaultAudioStreamIndex: number;
                    ETag: string;
                    Formats: any[];
                    GenPtsInput: boolean;
                    IgnoreDts: boolean;
                    IgnoreIndex: boolean;
                    IsInfiniteStream: boolean;
                    IsRemote: boolean;
                    MediaAttachments: any[];
                    MediaStreams: {
                        Codec: string;
                        Level: number;
                        Type: string;
                        CodecTimeBase: string;
                        Index: number;
                        IsDefault: boolean;
                        IsExternal: boolean;
                        IsForced: boolean;
                        IsInterlaced: boolean;
                        IsTextSubtitleStream: boolean;
                        SupportsExternalStream: boolean;
                        TimeBase: string;
                        AspectRatio?: string | undefined;
                        BitDepth?: number | undefined;
                        BitRate?: number | undefined;
                        ChannelLayout?: string | undefined;
                        Channels?: number | undefined;
                        ColorSpace?: string | undefined;
                        Comment?: string | undefined;
                        DisplayTitle?: string | undefined;
                        Height?: number | undefined;
                        PixelFormat?: string | undefined;
                        Profile?: string | undefined;
                        RealFrameRate?: number | undefined;
                        RefFrames?: number | undefined;
                        SampleRate?: number | undefined;
                        Width?: number | undefined;
                    }[];
                    Path: string;
                    Protocol: string;
                    ReadAtNativeFramerate: boolean;
                    RequiresClosing: boolean;
                    RequiresLooping: boolean;
                    RequiresOpening: boolean;
                    Size: number;
                    SupportsDirectPlay: boolean;
                    SupportsDirectStream: boolean;
                    SupportsProbing: boolean;
                    SupportsTranscoding: boolean;
                    RequiredHttpHeaders?: any;
                }[];
                ParentIndexNumber: number;
                SortName?: string | undefined;
                ParentId?: string | undefined;
                Tags?: string[] | undefined;
                PlaylistItemId?: string | undefined;
                People?: {
                    Name: string;
                    Id: string;
                    Type?: string | undefined;
                }[] | undefined;
                PremiereDate?: string | undefined;
                ProviderIds?: {
                    MusicBrainzAlbum?: string | undefined;
                    MusicBrainzAlbumArtist?: string | undefined;
                    MusicBrainzArtist?: string | undefined;
                    MusicBrainzRecording?: string | undefined;
                    MusicBrainzReleaseGroup?: string | undefined;
                    MusicBrainzTrack?: string | undefined;
                } | undefined;
                AlbumId?: string | undefined;
                LUFS?: number | undefined;
                NormalizationGain?: number | undefined;
                UserData?: {
                    PlayCount: number;
                    IsFavorite: boolean;
                    Key: string;
                    PlaybackPositionTicks: number;
                    Played: boolean;
                } | undefined;
            }[];
        };
        headers: Headers;
    } | {
        status: 400;
        body: {
            title: string;
            type: string;
            status: number;
            errors: {
                recursive: string[];
            };
            traceId: string;
        };
        headers: Headers;
    } | {
        status: 404 | 401 | 403 | 300 | 100 | 500 | 204 | 101 | 102 | 201 | 202 | 203 | 205 | 206 | 207 | 301 | 302 | 303 | 304 | 305 | 307 | 308 | 402 | 405 | 406 | 407 | 408 | 409 | 410 | 411 | 412 | 413 | 414 | 415 | 416 | 417 | 418 | 419 | 420 | 421 | 422 | 423 | 424 | 428 | 429 | 431 | 451 | 501 | 502 | 503 | 504 | 505 | 507 | 511;
        body: unknown;
        headers: Headers;
    }>;
    getMusicFolderList: (args: {
        cache?: RequestCache | undefined;
        params: {
            userId: string;
        };
        fetchOptions?: import("@ts-rest/core").FetchOptions | undefined;
        extraHeaders?: Record<string, string | undefined> | undefined;
        overrideClientOptions?: Partial<import("@ts-rest/core").OverrideableClientArgs> | undefined;
    }) => Promise<{
        status: 200;
        body: {
            Items: {
                Name: string;
                Id: string;
                ChannelId: null;
                ImageBlurHashes: {
                    Backdrop?: Record<string, string> | undefined;
                    Logo?: Record<string, string> | undefined;
                    Primary?: Record<string, string> | undefined;
                };
                ImageTags: {
                    Logo?: string | undefined;
                    Primary?: string | undefined;
                };
                IsFolder: boolean;
                LocationType: string;
                Type: string;
                ServerId: string;
                BackdropImageTags: string[];
                UserData: {
                    PlayCount: number;
                    IsFavorite: boolean;
                    Key: string;
                    PlaybackPositionTicks: number;
                    Played: boolean;
                };
                CollectionType: string;
            }[];
        };
        headers: Headers;
    } | {
        status: 400;
        body: {
            title: string;
            type: string;
            status: number;
            errors: {
                recursive: string[];
            };
            traceId: string;
        };
        headers: Headers;
    } | {
        status: 404 | 401 | 403 | 300 | 100 | 500 | 204 | 101 | 102 | 201 | 202 | 203 | 205 | 206 | 207 | 301 | 302 | 303 | 304 | 305 | 307 | 308 | 402 | 405 | 406 | 407 | 408 | 409 | 410 | 411 | 412 | 413 | 414 | 415 | 416 | 417 | 418 | 419 | 420 | 421 | 422 | 423 | 424 | 428 | 429 | 431 | 451 | 501 | 502 | 503 | 504 | 505 | 507 | 511;
        body: unknown;
        headers: Headers;
    }>;
    getPlaylistDetail: (args: {
        cache?: RequestCache | undefined;
        params: {
            userId: string;
            id: string;
        };
        query: {
            Ids: string;
            Limit?: number | undefined;
            UserId?: string | undefined;
            AlbumArtistIds?: string | undefined;
            ArtistIds?: string | undefined;
            ContributingArtistIds?: string | undefined;
            EnableImageTypes?: string | undefined;
            EnableTotalRecordCount?: boolean | undefined;
            EnableUserData?: boolean | undefined;
            EnableUserDataTypes?: boolean | undefined;
            ExcludeArtistIds?: string | undefined;
            ExcludeItemIds?: string | undefined;
            ExcludeItemTypes?: string | undefined;
            Fields?: readonly string[] | undefined;
            FolderId?: string | undefined;
            ImageTypeLimit?: number | undefined;
            IncludeArtists?: boolean | undefined;
            IncludeGenres?: boolean | undefined;
            IncludeItemTypes?: string | undefined;
            IncludeMedia?: boolean | undefined;
            IncludePeople?: boolean | undefined;
            IncludeStudios?: boolean | undefined;
            IsFavorite?: boolean | undefined;
            MediaTypes?: string | undefined;
            NameStartsWith?: string | undefined;
            ParentId?: string | undefined;
            Recursive?: boolean | undefined;
            SearchTerm?: string | undefined;
            SortBy?: string | undefined;
            SortOrder?: "Ascending" | "Descending" | undefined;
            StartIndex?: number | undefined;
            Tags?: string | undefined;
            Years?: string | undefined;
        };
        fetchOptions?: import("@ts-rest/core").FetchOptions | undefined;
        extraHeaders?: Record<string, string | undefined> | undefined;
        overrideClientOptions?: Partial<import("@ts-rest/core").OverrideableClientArgs> | undefined;
    }) => Promise<{
        status: 200;
        body: {
            Name: string;
            Genres: string[];
            MediaType: string;
            Id: string;
            ChannelId: null;
            DateCreated: string;
            GenreItems: {
                Name: string;
                Id: string;
            }[];
            ImageBlurHashes: {
                Backdrop?: Record<string, string> | undefined;
                Logo?: Record<string, string> | undefined;
                Primary?: Record<string, string> | undefined;
            };
            ImageTags: {
                Logo?: string | undefined;
                Primary?: string | undefined;
            };
            IsFolder: boolean;
            LocationType: string;
            Type: string;
            RunTimeTicks: number;
            ServerId: string;
            BackdropImageTags: string[];
            UserData: {
                PlayCount: number;
                IsFavorite: boolean;
                Key: string;
                PlaybackPositionTicks: number;
                Played: boolean;
            };
            ChildCount?: number | undefined;
            Overview?: string | undefined;
        };
        headers: Headers;
    } | {
        status: 400;
        body: {
            title: string;
            type: string;
            status: number;
            errors: {
                recursive: string[];
            };
            traceId: string;
        };
        headers: Headers;
    } | {
        status: 404 | 401 | 403 | 300 | 100 | 500 | 204 | 101 | 102 | 201 | 202 | 203 | 205 | 206 | 207 | 301 | 302 | 303 | 304 | 305 | 307 | 308 | 402 | 405 | 406 | 407 | 408 | 409 | 410 | 411 | 412 | 413 | 414 | 415 | 416 | 417 | 418 | 419 | 420 | 421 | 422 | 423 | 424 | 428 | 429 | 431 | 451 | 501 | 502 | 503 | 504 | 505 | 507 | 511;
        body: unknown;
        headers: Headers;
    }>;
    getPlaylistList: (args: {
        cache?: RequestCache | undefined;
        params: {
            userId: string;
        };
        query: {
            IncludeItemTypes: "Playlist";
            Limit?: number | undefined;
            UserId?: string | undefined;
            AlbumArtistIds?: string | undefined;
            ArtistIds?: string | undefined;
            ContributingArtistIds?: string | undefined;
            EnableImageTypes?: string | undefined;
            EnableTotalRecordCount?: boolean | undefined;
            EnableUserData?: boolean | undefined;
            EnableUserDataTypes?: boolean | undefined;
            ExcludeArtistIds?: string | undefined;
            ExcludeItemIds?: string | undefined;
            ExcludeItemTypes?: string | undefined;
            Fields?: readonly string[] | undefined;
            FolderId?: string | undefined;
            ImageTypeLimit?: number | undefined;
            IncludeArtists?: boolean | undefined;
            IncludeGenres?: boolean | undefined;
            IncludeMedia?: boolean | undefined;
            IncludePeople?: boolean | undefined;
            IncludeStudios?: boolean | undefined;
            IsFavorite?: boolean | undefined;
            MediaTypes?: string | undefined;
            NameStartsWith?: string | undefined;
            ParentId?: string | undefined;
            Recursive?: boolean | undefined;
            SearchTerm?: string | undefined;
            SortBy?: "DateCreated,SortName" | "AlbumArtist,SortName" | "SortName" | "Runtime" | "ChildCount" | undefined;
            SortOrder?: "Ascending" | "Descending" | undefined;
            StartIndex?: number | undefined;
            Tags?: string | undefined;
            Years?: string | undefined;
        };
        fetchOptions?: import("@ts-rest/core").FetchOptions | undefined;
        extraHeaders?: Record<string, string | undefined> | undefined;
        overrideClientOptions?: Partial<import("@ts-rest/core").OverrideableClientArgs> | undefined;
    }) => Promise<{
        status: 200;
        body: {
            StartIndex: number;
            TotalRecordCount: number;
            Items: {
                Name: string;
                Genres: string[];
                MediaType: string;
                Id: string;
                ChannelId: null;
                DateCreated: string;
                GenreItems: {
                    Name: string;
                    Id: string;
                }[];
                ImageBlurHashes: {
                    Backdrop?: Record<string, string> | undefined;
                    Logo?: Record<string, string> | undefined;
                    Primary?: Record<string, string> | undefined;
                };
                ImageTags: {
                    Logo?: string | undefined;
                    Primary?: string | undefined;
                };
                IsFolder: boolean;
                LocationType: string;
                Type: string;
                RunTimeTicks: number;
                ServerId: string;
                BackdropImageTags: string[];
                UserData: {
                    PlayCount: number;
                    IsFavorite: boolean;
                    Key: string;
                    PlaybackPositionTicks: number;
                    Played: boolean;
                };
                ChildCount?: number | undefined;
                Overview?: string | undefined;
            }[];
        };
        headers: Headers;
    } | {
        status: 400;
        body: {
            title: string;
            type: string;
            status: number;
            errors: {
                recursive: string[];
            };
            traceId: string;
        };
        headers: Headers;
    } | {
        status: 404 | 401 | 403 | 300 | 100 | 500 | 204 | 101 | 102 | 201 | 202 | 203 | 205 | 206 | 207 | 301 | 302 | 303 | 304 | 305 | 307 | 308 | 402 | 405 | 406 | 407 | 408 | 409 | 410 | 411 | 412 | 413 | 414 | 415 | 416 | 417 | 418 | 419 | 420 | 421 | 422 | 423 | 424 | 428 | 429 | 431 | 451 | 501 | 502 | 503 | 504 | 505 | 507 | 511;
        body: unknown;
        headers: Headers;
    }>;
    getPlaylistSongList: (args: {
        cache?: RequestCache | undefined;
        params: {
            id: string;
        };
        fetchOptions?: import("@ts-rest/core").FetchOptions | undefined;
        extraHeaders?: Record<string, string | undefined> | undefined;
        overrideClientOptions?: Partial<import("@ts-rest/core").OverrideableClientArgs> | undefined;
        query?: {
            Limit?: number | undefined;
            Genres?: string | undefined;
            UserId?: string | undefined;
            AlbumArtistIds?: string | undefined;
            ArtistIds?: string | undefined;
            ContributingArtistIds?: string | undefined;
            EnableImageTypes?: string | undefined;
            EnableTotalRecordCount?: boolean | undefined;
            EnableUserData?: boolean | undefined;
            EnableUserDataTypes?: boolean | undefined;
            ExcludeArtistIds?: string | undefined;
            ExcludeItemIds?: string | undefined;
            ExcludeItemTypes?: string | undefined;
            Fields?: readonly string[] | undefined;
            FolderId?: string | undefined;
            ImageTypeLimit?: number | undefined;
            IncludeArtists?: boolean | undefined;
            IncludeGenres?: boolean | undefined;
            IncludeItemTypes?: string | undefined;
            IncludeMedia?: boolean | undefined;
            IncludePeople?: boolean | undefined;
            IncludeStudios?: boolean | undefined;
            IsFavorite?: boolean | undefined;
            MediaTypes?: string | undefined;
            NameStartsWith?: string | undefined;
            ParentId?: string | undefined;
            Recursive?: boolean | undefined;
            SearchTerm?: string | undefined;
            SortBy?: "Name" | "Album,SortName" | "Runtime,AlbumArtist,Album,SortName" | "Random,SortName" | "DateCreated,SortName" | "PremiereDate,AlbumArtist,Album,SortName" | "CommunityRating,SortName" | "AlbumArtist,Album,SortName" | "ParentIndexNumber,IndexNumber,SortName" | "Artist,Album,SortName" | "PlayCount,SortName" | "DatePlayed,SortName" | undefined;
            SortOrder?: "Ascending" | "Descending" | undefined;
            StartIndex?: number | undefined;
            Tags?: string | undefined;
            Years?: string | undefined;
            Filters?: string | undefined;
            GenreIds?: string | undefined;
            AlbumIds?: string | undefined;
            IsPlayed?: boolean | undefined;
        } | undefined;
    }) => Promise<{
        status: 200;
        body: {
            StartIndex: number;
            TotalRecordCount: number;
            Items: {
                Name: string;
                Genres: string[];
                Album: string;
                MediaType: string;
                Id: string;
                AlbumArtist: string;
                AlbumArtists: {
                    Name: string;
                    Id: string;
                }[];
                AlbumPrimaryImageTag: string;
                ArtistItems: {
                    Name: string;
                    Id: string;
                }[];
                Artists: string[];
                ChannelId: null;
                DateCreated: string;
                ExternalUrls: {
                    Name: string;
                    Url: string;
                }[];
                GenreItems: {
                    Name: string;
                    Id: string;
                }[];
                ImageBlurHashes: {
                    Backdrop?: Record<string, string> | undefined;
                    Logo?: Record<string, string> | undefined;
                    Primary?: Record<string, string> | undefined;
                };
                ImageTags: {
                    Logo?: string | undefined;
                    Primary?: string | undefined;
                };
                IsFolder: boolean;
                LocationType: string;
                Type: string;
                ProductionYear: number;
                RunTimeTicks: number;
                ServerId: string;
                BackdropImageTags: string[];
                IndexNumber: number;
                MediaSources: {
                    Name: string;
                    Bitrate: number;
                    Id: string;
                    Type: string;
                    RunTimeTicks: number;
                    Container: string;
                    DefaultAudioStreamIndex: number;
                    ETag: string;
                    Formats: any[];
                    GenPtsInput: boolean;
                    IgnoreDts: boolean;
                    IgnoreIndex: boolean;
                    IsInfiniteStream: boolean;
                    IsRemote: boolean;
                    MediaAttachments: any[];
                    MediaStreams: {
                        Codec: string;
                        Level: number;
                        Type: string;
                        CodecTimeBase: string;
                        Index: number;
                        IsDefault: boolean;
                        IsExternal: boolean;
                        IsForced: boolean;
                        IsInterlaced: boolean;
                        IsTextSubtitleStream: boolean;
                        SupportsExternalStream: boolean;
                        TimeBase: string;
                        AspectRatio?: string | undefined;
                        BitDepth?: number | undefined;
                        BitRate?: number | undefined;
                        ChannelLayout?: string | undefined;
                        Channels?: number | undefined;
                        ColorSpace?: string | undefined;
                        Comment?: string | undefined;
                        DisplayTitle?: string | undefined;
                        Height?: number | undefined;
                        PixelFormat?: string | undefined;
                        Profile?: string | undefined;
                        RealFrameRate?: number | undefined;
                        RefFrames?: number | undefined;
                        SampleRate?: number | undefined;
                        Width?: number | undefined;
                    }[];
                    Path: string;
                    Protocol: string;
                    ReadAtNativeFramerate: boolean;
                    RequiresClosing: boolean;
                    RequiresLooping: boolean;
                    RequiresOpening: boolean;
                    Size: number;
                    SupportsDirectPlay: boolean;
                    SupportsDirectStream: boolean;
                    SupportsProbing: boolean;
                    SupportsTranscoding: boolean;
                    RequiredHttpHeaders?: any;
                }[];
                ParentIndexNumber: number;
                SortName?: string | undefined;
                ParentId?: string | undefined;
                Tags?: string[] | undefined;
                PlaylistItemId?: string | undefined;
                People?: {
                    Name: string;
                    Id: string;
                    Type?: string | undefined;
                }[] | undefined;
                PremiereDate?: string | undefined;
                ProviderIds?: {
                    MusicBrainzAlbum?: string | undefined;
                    MusicBrainzAlbumArtist?: string | undefined;
                    MusicBrainzArtist?: string | undefined;
                    MusicBrainzRecording?: string | undefined;
                    MusicBrainzReleaseGroup?: string | undefined;
                    MusicBrainzTrack?: string | undefined;
                } | undefined;
                AlbumId?: string | undefined;
                LUFS?: number | undefined;
                NormalizationGain?: number | undefined;
                UserData?: {
                    PlayCount: number;
                    IsFavorite: boolean;
                    Key: string;
                    PlaybackPositionTicks: number;
                    Played: boolean;
                } | undefined;
            }[];
        };
        headers: Headers;
    } | {
        status: 400;
        body: {
            title: string;
            type: string;
            status: number;
            errors: {
                recursive: string[];
            };
            traceId: string;
        };
        headers: Headers;
    } | {
        status: 404 | 401 | 403 | 300 | 100 | 500 | 204 | 101 | 102 | 201 | 202 | 203 | 205 | 206 | 207 | 301 | 302 | 303 | 304 | 305 | 307 | 308 | 402 | 405 | 406 | 407 | 408 | 409 | 410 | 411 | 412 | 413 | 414 | 415 | 416 | 417 | 418 | 419 | 420 | 421 | 422 | 423 | 424 | 428 | 429 | 431 | 451 | 501 | 502 | 503 | 504 | 505 | 507 | 511;
        body: unknown;
        headers: Headers;
    }>;
    getPlayQueue: (args?: {
        cache?: RequestCache | undefined;
        fetchOptions?: import("@ts-rest/core").FetchOptions | undefined;
        extraHeaders?: Record<string, string | undefined> | undefined;
        overrideClientOptions?: Partial<import("@ts-rest/core").OverrideableClientArgs> | undefined;
        query?: {} | undefined;
    } | undefined) => Promise<{
        status: 200;
        body: {
            UserId: string;
            Id: string;
            NowPlayingQueue: any[];
            ServerId: string;
            AdditionalUsers: any[];
            ApplicationVersion: string;
            Capabilities: {
                PlayableMediaTypes: any[];
                SupportedCommands: any[];
                SupportsContentUploading: boolean;
                SupportsMediaControl: boolean;
                SupportsPersistentIdentifier: boolean;
                SupportsSync: boolean;
            };
            PlayableMediaTypes: any[];
            SupportedCommands: any[];
            SupportsMediaControl: boolean;
            Client: string;
            DeviceId: string;
            DeviceName: string;
            HasCustomDeviceName: boolean;
            IsActive: boolean;
            LastActivityDate: string;
            LastPlaybackCheckIn: string;
            NowPlayingQueueFullItems: any[];
            PlayState: {
                IsPaused: boolean;
                CanSeek: boolean;
                IsMuted: boolean;
                RepeatMode: string;
                PositionTicks?: number | undefined;
            };
            RemoteEndPoint: string;
            SupportsRemoteControl: boolean;
            UserName: string;
            PlaylistItemId?: string | undefined;
        }[];
        headers: Headers;
    } | {
        status: 400;
        body: {
            title: string;
            type: string;
            status: number;
            errors: {
                recursive: string[];
            };
            traceId: string;
        };
        headers: Headers;
    } | {
        status: 404 | 401 | 403 | 300 | 100 | 500 | 204 | 101 | 102 | 201 | 202 | 203 | 205 | 206 | 207 | 301 | 302 | 303 | 304 | 305 | 307 | 308 | 402 | 405 | 406 | 407 | 408 | 409 | 410 | 411 | 412 | 413 | 414 | 415 | 416 | 417 | 418 | 419 | 420 | 421 | 422 | 423 | 424 | 428 | 429 | 431 | 451 | 501 | 502 | 503 | 504 | 505 | 507 | 511;
        body: unknown;
        headers: Headers;
    }>;
    getServerInfo: (args?: {
        cache?: RequestCache | undefined;
        fetchOptions?: import("@ts-rest/core").FetchOptions | undefined;
        extraHeaders?: Record<string, string | undefined> | undefined;
        overrideClientOptions?: Partial<import("@ts-rest/core").OverrideableClientArgs> | undefined;
    } | undefined) => Promise<{
        status: 200;
        body: {
            Version: string;
        };
        headers: Headers;
    } | {
        status: 400;
        body: {
            title: string;
            type: string;
            status: number;
            errors: {
                recursive: string[];
            };
            traceId: string;
        };
        headers: Headers;
    } | {
        status: 404 | 401 | 403 | 300 | 100 | 500 | 204 | 101 | 102 | 201 | 202 | 203 | 205 | 206 | 207 | 301 | 302 | 303 | 304 | 305 | 307 | 308 | 402 | 405 | 406 | 407 | 408 | 409 | 410 | 411 | 412 | 413 | 414 | 415 | 416 | 417 | 418 | 419 | 420 | 421 | 422 | 423 | 424 | 428 | 429 | 431 | 451 | 501 | 502 | 503 | 504 | 505 | 507 | 511;
        body: unknown;
        headers: Headers;
    }>;
    getSimilarArtistList: (args: {
        cache?: RequestCache | undefined;
        params: {
            id: string;
        };
        fetchOptions?: import("@ts-rest/core").FetchOptions | undefined;
        extraHeaders?: Record<string, string | undefined> | undefined;
        overrideClientOptions?: Partial<import("@ts-rest/core").OverrideableClientArgs> | undefined;
        query?: {
            Limit?: number | undefined;
            UserId?: string | undefined;
            AlbumArtistIds?: string | undefined;
            ArtistIds?: string | undefined;
            ContributingArtistIds?: string | undefined;
            EnableImageTypes?: string | undefined;
            EnableTotalRecordCount?: boolean | undefined;
            EnableUserData?: boolean | undefined;
            EnableUserDataTypes?: boolean | undefined;
            ExcludeArtistIds?: string | undefined;
            ExcludeItemIds?: string | undefined;
            ExcludeItemTypes?: string | undefined;
            Fields?: readonly string[] | undefined;
            FolderId?: string | undefined;
            ImageTypeLimit?: number | undefined;
            IncludeArtists?: boolean | undefined;
            IncludeGenres?: boolean | undefined;
            IncludeItemTypes?: string | undefined;
            IncludeMedia?: boolean | undefined;
            IncludePeople?: boolean | undefined;
            IncludeStudios?: boolean | undefined;
            IsFavorite?: boolean | undefined;
            MediaTypes?: string | undefined;
            NameStartsWith?: string | undefined;
            ParentId?: string | undefined;
            Recursive?: boolean | undefined;
            SearchTerm?: string | undefined;
            SortBy?: string | undefined;
            SortOrder?: "Ascending" | "Descending" | undefined;
            StartIndex?: number | undefined;
            Tags?: string | undefined;
            Years?: string | undefined;
        } | undefined;
    }) => Promise<{
        status: 200;
        body: {
            StartIndex: number;
            TotalRecordCount: number;
            Items: {
                Name: string;
                Genres: string[];
                Id: string;
                ChannelId: null;
                DateCreated: string;
                ExternalUrls: {
                    Name: string;
                    Url: string;
                }[];
                GenreItems: {
                    Name: string;
                    Id: string;
                }[];
                ImageBlurHashes: {
                    Backdrop?: Record<string, string> | undefined;
                    Logo?: Record<string, string> | undefined;
                    Primary?: Record<string, string> | undefined;
                };
                ImageTags: {
                    Logo?: string | undefined;
                    Primary?: string | undefined;
                };
                LocationType: string;
                Type: string;
                RunTimeTicks: number;
                ServerId: string;
                BackdropImageTags: string[];
                Overview: string;
                ProviderIds?: {
                    MusicBrainzAlbum?: string | undefined;
                    MusicBrainzAlbumArtist?: string | undefined;
                    MusicBrainzArtist?: string | undefined;
                    MusicBrainzRecording?: string | undefined;
                    MusicBrainzReleaseGroup?: string | undefined;
                    MusicBrainzTrack?: string | undefined;
                } | undefined;
                UserData?: {
                    PlayCount: number;
                    IsFavorite: boolean;
                    Key: string;
                    PlaybackPositionTicks: number;
                    Played: boolean;
                } | undefined;
                AlbumCount?: number | undefined;
                SongCount?: number | undefined;
            }[];
        };
        headers: Headers;
    } | {
        status: 400;
        body: {
            title: string;
            type: string;
            status: number;
            errors: {
                recursive: string[];
            };
            traceId: string;
        };
        headers: Headers;
    } | {
        status: 404 | 401 | 403 | 300 | 100 | 500 | 204 | 101 | 102 | 201 | 202 | 203 | 205 | 206 | 207 | 301 | 302 | 303 | 304 | 305 | 307 | 308 | 402 | 405 | 406 | 407 | 408 | 409 | 410 | 411 | 412 | 413 | 414 | 415 | 416 | 417 | 418 | 419 | 420 | 421 | 422 | 423 | 424 | 428 | 429 | 431 | 451 | 501 | 502 | 503 | 504 | 505 | 507 | 511;
        body: unknown;
        headers: Headers;
    }>;
    getSimilarSongs: (args: {
        cache?: RequestCache | undefined;
        params: {
            itemId: string;
        };
        fetchOptions?: import("@ts-rest/core").FetchOptions | undefined;
        extraHeaders?: Record<string, string | undefined> | undefined;
        overrideClientOptions?: Partial<import("@ts-rest/core").OverrideableClientArgs> | undefined;
        query?: {
            Limit?: number | undefined;
            UserId?: string | undefined;
            Fields?: readonly string[] | undefined;
        } | undefined;
    }) => Promise<{
        status: 200;
        body: {
            StartIndex: number;
            TotalRecordCount: number;
            Items: {
                Name: string;
                Genres: string[];
                Album: string;
                MediaType: string;
                Id: string;
                AlbumArtist: string;
                AlbumArtists: {
                    Name: string;
                    Id: string;
                }[];
                AlbumPrimaryImageTag: string;
                ArtistItems: {
                    Name: string;
                    Id: string;
                }[];
                Artists: string[];
                ChannelId: null;
                DateCreated: string;
                ExternalUrls: {
                    Name: string;
                    Url: string;
                }[];
                GenreItems: {
                    Name: string;
                    Id: string;
                }[];
                ImageBlurHashes: {
                    Backdrop?: Record<string, string> | undefined;
                    Logo?: Record<string, string> | undefined;
                    Primary?: Record<string, string> | undefined;
                };
                ImageTags: {
                    Logo?: string | undefined;
                    Primary?: string | undefined;
                };
                IsFolder: boolean;
                LocationType: string;
                Type: string;
                ProductionYear: number;
                RunTimeTicks: number;
                ServerId: string;
                BackdropImageTags: string[];
                IndexNumber: number;
                MediaSources: {
                    Name: string;
                    Bitrate: number;
                    Id: string;
                    Type: string;
                    RunTimeTicks: number;
                    Container: string;
                    DefaultAudioStreamIndex: number;
                    ETag: string;
                    Formats: any[];
                    GenPtsInput: boolean;
                    IgnoreDts: boolean;
                    IgnoreIndex: boolean;
                    IsInfiniteStream: boolean;
                    IsRemote: boolean;
                    MediaAttachments: any[];
                    MediaStreams: {
                        Codec: string;
                        Level: number;
                        Type: string;
                        CodecTimeBase: string;
                        Index: number;
                        IsDefault: boolean;
                        IsExternal: boolean;
                        IsForced: boolean;
                        IsInterlaced: boolean;
                        IsTextSubtitleStream: boolean;
                        SupportsExternalStream: boolean;
                        TimeBase: string;
                        AspectRatio?: string | undefined;
                        BitDepth?: number | undefined;
                        BitRate?: number | undefined;
                        ChannelLayout?: string | undefined;
                        Channels?: number | undefined;
                        ColorSpace?: string | undefined;
                        Comment?: string | undefined;
                        DisplayTitle?: string | undefined;
                        Height?: number | undefined;
                        PixelFormat?: string | undefined;
                        Profile?: string | undefined;
                        RealFrameRate?: number | undefined;
                        RefFrames?: number | undefined;
                        SampleRate?: number | undefined;
                        Width?: number | undefined;
                    }[];
                    Path: string;
                    Protocol: string;
                    ReadAtNativeFramerate: boolean;
                    RequiresClosing: boolean;
                    RequiresLooping: boolean;
                    RequiresOpening: boolean;
                    Size: number;
                    SupportsDirectPlay: boolean;
                    SupportsDirectStream: boolean;
                    SupportsProbing: boolean;
                    SupportsTranscoding: boolean;
                    RequiredHttpHeaders?: any;
                }[];
                ParentIndexNumber: number;
                SortName?: string | undefined;
                ParentId?: string | undefined;
                Tags?: string[] | undefined;
                PlaylistItemId?: string | undefined;
                People?: {
                    Name: string;
                    Id: string;
                    Type?: string | undefined;
                }[] | undefined;
                PremiereDate?: string | undefined;
                ProviderIds?: {
                    MusicBrainzAlbum?: string | undefined;
                    MusicBrainzAlbumArtist?: string | undefined;
                    MusicBrainzArtist?: string | undefined;
                    MusicBrainzRecording?: string | undefined;
                    MusicBrainzReleaseGroup?: string | undefined;
                    MusicBrainzTrack?: string | undefined;
                } | undefined;
                AlbumId?: string | undefined;
                LUFS?: number | undefined;
                NormalizationGain?: number | undefined;
                UserData?: {
                    PlayCount: number;
                    IsFavorite: boolean;
                    Key: string;
                    PlaybackPositionTicks: number;
                    Played: boolean;
                } | undefined;
            }[];
        };
        headers: Headers;
    } | {
        status: 400;
        body: {
            title: string;
            type: string;
            status: number;
            errors: {
                recursive: string[];
            };
            traceId: string;
        };
        headers: Headers;
    } | {
        status: 404 | 401 | 403 | 300 | 100 | 500 | 204 | 101 | 102 | 201 | 202 | 203 | 205 | 206 | 207 | 301 | 302 | 303 | 304 | 305 | 307 | 308 | 402 | 405 | 406 | 407 | 408 | 409 | 410 | 411 | 412 | 413 | 414 | 415 | 416 | 417 | 418 | 419 | 420 | 421 | 422 | 423 | 424 | 428 | 429 | 431 | 451 | 501 | 502 | 503 | 504 | 505 | 507 | 511;
        body: unknown;
        headers: Headers;
    }>;
    getSongData: (args: {
        cache?: RequestCache | undefined;
        params: {
            userId: string;
            id: string;
        };
        fetchOptions?: import("@ts-rest/core").FetchOptions | undefined;
        extraHeaders?: Record<string, string | undefined> | undefined;
        overrideClientOptions?: Partial<import("@ts-rest/core").OverrideableClientArgs> | undefined;
        query?: {
            Limit?: number | undefined;
            UserId?: string | undefined;
            AlbumArtistIds?: string | undefined;
            ArtistIds?: string | undefined;
            ContributingArtistIds?: string | undefined;
            EnableImageTypes?: string | undefined;
            EnableTotalRecordCount?: boolean | undefined;
            EnableUserData?: boolean | undefined;
            EnableUserDataTypes?: boolean | undefined;
            ExcludeArtistIds?: string | undefined;
            ExcludeItemIds?: string | undefined;
            ExcludeItemTypes?: string | undefined;
            Fields?: readonly string[] | undefined;
            FolderId?: string | undefined;
            ImageTypeLimit?: number | undefined;
            IncludeArtists?: boolean | undefined;
            IncludeGenres?: boolean | undefined;
            IncludeItemTypes?: string | undefined;
            IncludeMedia?: boolean | undefined;
            IncludePeople?: boolean | undefined;
            IncludeStudios?: boolean | undefined;
            IsFavorite?: boolean | undefined;
            MediaTypes?: string | undefined;
            NameStartsWith?: string | undefined;
            ParentId?: string | undefined;
            Recursive?: boolean | undefined;
            SearchTerm?: string | undefined;
            SortBy?: string | undefined;
            SortOrder?: "Ascending" | "Descending" | undefined;
            StartIndex?: number | undefined;
            Tags?: string | undefined;
            Years?: string | undefined;
        } | undefined;
    }) => Promise<{
        status: 200;
        body: {
            Name: string;
            Genres: string[];
            Album: string;
            MediaType: string;
            Id: string;
            AlbumArtist: string;
            AlbumArtists: {
                Name: string;
                Id: string;
            }[];
            AlbumPrimaryImageTag: string;
            ArtistItems: {
                Name: string;
                Id: string;
            }[];
            Artists: string[];
            ChannelId: null;
            DateCreated: string;
            ExternalUrls: {
                Name: string;
                Url: string;
            }[];
            GenreItems: {
                Name: string;
                Id: string;
            }[];
            ImageBlurHashes: {
                Backdrop?: Record<string, string> | undefined;
                Logo?: Record<string, string> | undefined;
                Primary?: Record<string, string> | undefined;
            };
            ImageTags: {
                Logo?: string | undefined;
                Primary?: string | undefined;
            };
            IsFolder: boolean;
            LocationType: string;
            Type: string;
            ProductionYear: number;
            RunTimeTicks: number;
            ServerId: string;
            BackdropImageTags: string[];
            IndexNumber: number;
            MediaSources: {
                Name: string;
                Bitrate: number;
                Id: string;
                Type: string;
                RunTimeTicks: number;
                Container: string;
                DefaultAudioStreamIndex: number;
                ETag: string;
                Formats: any[];
                GenPtsInput: boolean;
                IgnoreDts: boolean;
                IgnoreIndex: boolean;
                IsInfiniteStream: boolean;
                IsRemote: boolean;
                MediaAttachments: any[];
                MediaStreams: {
                    Codec: string;
                    Level: number;
                    Type: string;
                    CodecTimeBase: string;
                    Index: number;
                    IsDefault: boolean;
                    IsExternal: boolean;
                    IsForced: boolean;
                    IsInterlaced: boolean;
                    IsTextSubtitleStream: boolean;
                    SupportsExternalStream: boolean;
                    TimeBase: string;
                    AspectRatio?: string | undefined;
                    BitDepth?: number | undefined;
                    BitRate?: number | undefined;
                    ChannelLayout?: string | undefined;
                    Channels?: number | undefined;
                    ColorSpace?: string | undefined;
                    Comment?: string | undefined;
                    DisplayTitle?: string | undefined;
                    Height?: number | undefined;
                    PixelFormat?: string | undefined;
                    Profile?: string | undefined;
                    RealFrameRate?: number | undefined;
                    RefFrames?: number | undefined;
                    SampleRate?: number | undefined;
                    Width?: number | undefined;
                }[];
                Path: string;
                Protocol: string;
                ReadAtNativeFramerate: boolean;
                RequiresClosing: boolean;
                RequiresLooping: boolean;
                RequiresOpening: boolean;
                Size: number;
                SupportsDirectPlay: boolean;
                SupportsDirectStream: boolean;
                SupportsProbing: boolean;
                SupportsTranscoding: boolean;
                RequiredHttpHeaders?: any;
            }[];
            ParentIndexNumber: number;
            SortName?: string | undefined;
            ParentId?: string | undefined;
            Tags?: string[] | undefined;
            PlaylistItemId?: string | undefined;
            People?: {
                Name: string;
                Id: string;
                Type?: string | undefined;
            }[] | undefined;
            PremiereDate?: string | undefined;
            ProviderIds?: {
                MusicBrainzAlbum?: string | undefined;
                MusicBrainzAlbumArtist?: string | undefined;
                MusicBrainzArtist?: string | undefined;
                MusicBrainzRecording?: string | undefined;
                MusicBrainzReleaseGroup?: string | undefined;
                MusicBrainzTrack?: string | undefined;
            } | undefined;
            AlbumId?: string | undefined;
            LUFS?: number | undefined;
            NormalizationGain?: number | undefined;
            UserData?: {
                PlayCount: number;
                IsFavorite: boolean;
                Key: string;
                PlaybackPositionTicks: number;
                Played: boolean;
            } | undefined;
        };
        headers: Headers;
    } | {
        status: 400;
        body: {
            title: string;
            type: string;
            status: number;
            errors: {
                recursive: string[];
            };
            traceId: string;
        };
        headers: Headers;
    } | {
        status: 404 | 401 | 403 | 300 | 100 | 500 | 204 | 101 | 102 | 201 | 202 | 203 | 205 | 206 | 207 | 301 | 302 | 303 | 304 | 305 | 307 | 308 | 402 | 405 | 406 | 407 | 408 | 409 | 410 | 411 | 412 | 413 | 414 | 415 | 416 | 417 | 418 | 419 | 420 | 421 | 422 | 423 | 424 | 428 | 429 | 431 | 451 | 501 | 502 | 503 | 504 | 505 | 507 | 511;
        body: unknown;
        headers: Headers;
    }>;
    getSongDetail: (args: {
        cache?: RequestCache | undefined;
        params: {
            userId: string;
            id: string;
        };
        fetchOptions?: import("@ts-rest/core").FetchOptions | undefined;
        extraHeaders?: Record<string, string | undefined> | undefined;
        overrideClientOptions?: Partial<import("@ts-rest/core").OverrideableClientArgs> | undefined;
    }) => Promise<{
        status: 200;
        body: {
            Name: string;
            Genres: string[];
            Album: string;
            MediaType: string;
            Id: string;
            AlbumArtist: string;
            AlbumArtists: {
                Name: string;
                Id: string;
            }[];
            AlbumPrimaryImageTag: string;
            ArtistItems: {
                Name: string;
                Id: string;
            }[];
            Artists: string[];
            ChannelId: null;
            DateCreated: string;
            ExternalUrls: {
                Name: string;
                Url: string;
            }[];
            GenreItems: {
                Name: string;
                Id: string;
            }[];
            ImageBlurHashes: {
                Backdrop?: Record<string, string> | undefined;
                Logo?: Record<string, string> | undefined;
                Primary?: Record<string, string> | undefined;
            };
            ImageTags: {
                Logo?: string | undefined;
                Primary?: string | undefined;
            };
            IsFolder: boolean;
            LocationType: string;
            Type: string;
            ProductionYear: number;
            RunTimeTicks: number;
            ServerId: string;
            BackdropImageTags: string[];
            IndexNumber: number;
            MediaSources: {
                Name: string;
                Bitrate: number;
                Id: string;
                Type: string;
                RunTimeTicks: number;
                Container: string;
                DefaultAudioStreamIndex: number;
                ETag: string;
                Formats: any[];
                GenPtsInput: boolean;
                IgnoreDts: boolean;
                IgnoreIndex: boolean;
                IsInfiniteStream: boolean;
                IsRemote: boolean;
                MediaAttachments: any[];
                MediaStreams: {
                    Codec: string;
                    Level: number;
                    Type: string;
                    CodecTimeBase: string;
                    Index: number;
                    IsDefault: boolean;
                    IsExternal: boolean;
                    IsForced: boolean;
                    IsInterlaced: boolean;
                    IsTextSubtitleStream: boolean;
                    SupportsExternalStream: boolean;
                    TimeBase: string;
                    AspectRatio?: string | undefined;
                    BitDepth?: number | undefined;
                    BitRate?: number | undefined;
                    ChannelLayout?: string | undefined;
                    Channels?: number | undefined;
                    ColorSpace?: string | undefined;
                    Comment?: string | undefined;
                    DisplayTitle?: string | undefined;
                    Height?: number | undefined;
                    PixelFormat?: string | undefined;
                    Profile?: string | undefined;
                    RealFrameRate?: number | undefined;
                    RefFrames?: number | undefined;
                    SampleRate?: number | undefined;
                    Width?: number | undefined;
                }[];
                Path: string;
                Protocol: string;
                ReadAtNativeFramerate: boolean;
                RequiresClosing: boolean;
                RequiresLooping: boolean;
                RequiresOpening: boolean;
                Size: number;
                SupportsDirectPlay: boolean;
                SupportsDirectStream: boolean;
                SupportsProbing: boolean;
                SupportsTranscoding: boolean;
                RequiredHttpHeaders?: any;
            }[];
            ParentIndexNumber: number;
            SortName?: string | undefined;
            ParentId?: string | undefined;
            Tags?: string[] | undefined;
            PlaylistItemId?: string | undefined;
            People?: {
                Name: string;
                Id: string;
                Type?: string | undefined;
            }[] | undefined;
            PremiereDate?: string | undefined;
            ProviderIds?: {
                MusicBrainzAlbum?: string | undefined;
                MusicBrainzAlbumArtist?: string | undefined;
                MusicBrainzArtist?: string | undefined;
                MusicBrainzRecording?: string | undefined;
                MusicBrainzReleaseGroup?: string | undefined;
                MusicBrainzTrack?: string | undefined;
            } | undefined;
            AlbumId?: string | undefined;
            LUFS?: number | undefined;
            NormalizationGain?: number | undefined;
            UserData?: {
                PlayCount: number;
                IsFavorite: boolean;
                Key: string;
                PlaybackPositionTicks: number;
                Played: boolean;
            } | undefined;
        };
        headers: Headers;
    } | {
        status: 400;
        body: {
            title: string;
            type: string;
            status: number;
            errors: {
                recursive: string[];
            };
            traceId: string;
        };
        headers: Headers;
    } | {
        status: 404 | 401 | 403 | 300 | 100 | 500 | 204 | 101 | 102 | 201 | 202 | 203 | 205 | 206 | 207 | 301 | 302 | 303 | 304 | 305 | 307 | 308 | 402 | 405 | 406 | 407 | 408 | 409 | 410 | 411 | 412 | 413 | 414 | 415 | 416 | 417 | 418 | 419 | 420 | 421 | 422 | 423 | 424 | 428 | 429 | 431 | 451 | 501 | 502 | 503 | 504 | 505 | 507 | 511;
        body: unknown;
        headers: Headers;
    }>;
    getSongList: (args: {
        cache?: RequestCache | undefined;
        params: {
            userId: string;
        };
        fetchOptions?: import("@ts-rest/core").FetchOptions | undefined;
        extraHeaders?: Record<string, string | undefined> | undefined;
        overrideClientOptions?: Partial<import("@ts-rest/core").OverrideableClientArgs> | undefined;
        query?: {
            Limit?: number | undefined;
            Genres?: string | undefined;
            UserId?: string | undefined;
            AlbumArtistIds?: string | undefined;
            ArtistIds?: string | undefined;
            ContributingArtistIds?: string | undefined;
            EnableImageTypes?: string | undefined;
            EnableTotalRecordCount?: boolean | undefined;
            EnableUserData?: boolean | undefined;
            EnableUserDataTypes?: boolean | undefined;
            ExcludeArtistIds?: string | undefined;
            ExcludeItemIds?: string | undefined;
            ExcludeItemTypes?: string | undefined;
            Fields?: readonly string[] | undefined;
            FolderId?: string | undefined;
            ImageTypeLimit?: number | undefined;
            IncludeArtists?: boolean | undefined;
            IncludeGenres?: boolean | undefined;
            IncludeItemTypes?: string | undefined;
            IncludeMedia?: boolean | undefined;
            IncludePeople?: boolean | undefined;
            IncludeStudios?: boolean | undefined;
            IsFavorite?: boolean | undefined;
            MediaTypes?: string | undefined;
            NameStartsWith?: string | undefined;
            ParentId?: string | undefined;
            Recursive?: boolean | undefined;
            SearchTerm?: string | undefined;
            SortBy?: "Name" | "Album,SortName" | "Runtime,AlbumArtist,Album,SortName" | "Random,SortName" | "DateCreated,SortName" | "PremiereDate,AlbumArtist,Album,SortName" | "CommunityRating,SortName" | "AlbumArtist,Album,SortName" | "ParentIndexNumber,IndexNumber,SortName" | "Artist,Album,SortName" | "PlayCount,SortName" | "DatePlayed,SortName" | undefined;
            SortOrder?: "Ascending" | "Descending" | undefined;
            StartIndex?: number | undefined;
            Tags?: string | undefined;
            Years?: string | undefined;
            Filters?: string | undefined;
            GenreIds?: string | undefined;
            AlbumIds?: string | undefined;
            IsPlayed?: boolean | undefined;
        } | undefined;
    }) => Promise<{
        status: 200;
        body: {
            StartIndex: number;
            TotalRecordCount: number;
            Items: {
                Name: string;
                Genres: string[];
                Album: string;
                MediaType: string;
                Id: string;
                AlbumArtist: string;
                AlbumArtists: {
                    Name: string;
                    Id: string;
                }[];
                AlbumPrimaryImageTag: string;
                ArtistItems: {
                    Name: string;
                    Id: string;
                }[];
                Artists: string[];
                ChannelId: null;
                DateCreated: string;
                ExternalUrls: {
                    Name: string;
                    Url: string;
                }[];
                GenreItems: {
                    Name: string;
                    Id: string;
                }[];
                ImageBlurHashes: {
                    Backdrop?: Record<string, string> | undefined;
                    Logo?: Record<string, string> | undefined;
                    Primary?: Record<string, string> | undefined;
                };
                ImageTags: {
                    Logo?: string | undefined;
                    Primary?: string | undefined;
                };
                IsFolder: boolean;
                LocationType: string;
                Type: string;
                ProductionYear: number;
                RunTimeTicks: number;
                ServerId: string;
                BackdropImageTags: string[];
                IndexNumber: number;
                MediaSources: {
                    Name: string;
                    Bitrate: number;
                    Id: string;
                    Type: string;
                    RunTimeTicks: number;
                    Container: string;
                    DefaultAudioStreamIndex: number;
                    ETag: string;
                    Formats: any[];
                    GenPtsInput: boolean;
                    IgnoreDts: boolean;
                    IgnoreIndex: boolean;
                    IsInfiniteStream: boolean;
                    IsRemote: boolean;
                    MediaAttachments: any[];
                    MediaStreams: {
                        Codec: string;
                        Level: number;
                        Type: string;
                        CodecTimeBase: string;
                        Index: number;
                        IsDefault: boolean;
                        IsExternal: boolean;
                        IsForced: boolean;
                        IsInterlaced: boolean;
                        IsTextSubtitleStream: boolean;
                        SupportsExternalStream: boolean;
                        TimeBase: string;
                        AspectRatio?: string | undefined;
                        BitDepth?: number | undefined;
                        BitRate?: number | undefined;
                        ChannelLayout?: string | undefined;
                        Channels?: number | undefined;
                        ColorSpace?: string | undefined;
                        Comment?: string | undefined;
                        DisplayTitle?: string | undefined;
                        Height?: number | undefined;
                        PixelFormat?: string | undefined;
                        Profile?: string | undefined;
                        RealFrameRate?: number | undefined;
                        RefFrames?: number | undefined;
                        SampleRate?: number | undefined;
                        Width?: number | undefined;
                    }[];
                    Path: string;
                    Protocol: string;
                    ReadAtNativeFramerate: boolean;
                    RequiresClosing: boolean;
                    RequiresLooping: boolean;
                    RequiresOpening: boolean;
                    Size: number;
                    SupportsDirectPlay: boolean;
                    SupportsDirectStream: boolean;
                    SupportsProbing: boolean;
                    SupportsTranscoding: boolean;
                    RequiredHttpHeaders?: any;
                }[];
                ParentIndexNumber: number;
                SortName?: string | undefined;
                ParentId?: string | undefined;
                Tags?: string[] | undefined;
                PlaylistItemId?: string | undefined;
                People?: {
                    Name: string;
                    Id: string;
                    Type?: string | undefined;
                }[] | undefined;
                PremiereDate?: string | undefined;
                ProviderIds?: {
                    MusicBrainzAlbum?: string | undefined;
                    MusicBrainzAlbumArtist?: string | undefined;
                    MusicBrainzArtist?: string | undefined;
                    MusicBrainzRecording?: string | undefined;
                    MusicBrainzReleaseGroup?: string | undefined;
                    MusicBrainzTrack?: string | undefined;
                } | undefined;
                AlbumId?: string | undefined;
                LUFS?: number | undefined;
                NormalizationGain?: number | undefined;
                UserData?: {
                    PlayCount: number;
                    IsFavorite: boolean;
                    Key: string;
                    PlaybackPositionTicks: number;
                    Played: boolean;
                } | undefined;
            }[];
        };
        headers: Headers;
    } | {
        status: 400;
        body: {
            title: string;
            type: string;
            status: number;
            errors: {
                recursive: string[];
            };
            traceId: string;
        };
        headers: Headers;
    } | {
        status: 404 | 401 | 403 | 300 | 100 | 500 | 204 | 101 | 102 | 201 | 202 | 203 | 205 | 206 | 207 | 301 | 302 | 303 | 304 | 305 | 307 | 308 | 402 | 405 | 406 | 407 | 408 | 409 | 410 | 411 | 412 | 413 | 414 | 415 | 416 | 417 | 418 | 419 | 420 | 421 | 422 | 423 | 424 | 428 | 429 | 431 | 451 | 501 | 502 | 503 | 504 | 505 | 507 | 511;
        body: unknown;
        headers: Headers;
    }>;
    getSongLyrics: (args: {
        cache?: RequestCache | undefined;
        params: {
            id: string;
        };
        fetchOptions?: import("@ts-rest/core").FetchOptions | undefined;
        extraHeaders?: Record<string, string | undefined> | undefined;
        overrideClientOptions?: Partial<import("@ts-rest/core").OverrideableClientArgs> | undefined;
    }) => Promise<{
        status: 404;
        body: {
            title: string;
            type: string;
            status: number;
            errors: {
                recursive: string[];
            };
            traceId: string;
        };
        headers: Headers;
    } | {
        status: 200;
        body: {
            Lyrics: {
                Text: string;
                Start?: number | undefined;
            }[];
        };
        headers: Headers;
    } | {
        status: 401 | 403 | 300 | 100 | 500 | 400 | 204 | 101 | 102 | 201 | 202 | 203 | 205 | 206 | 207 | 301 | 302 | 303 | 304 | 305 | 307 | 308 | 402 | 405 | 406 | 407 | 408 | 409 | 410 | 411 | 412 | 413 | 414 | 415 | 416 | 417 | 418 | 419 | 420 | 421 | 422 | 423 | 424 | 428 | 429 | 431 | 451 | 501 | 502 | 503 | 504 | 505 | 507 | 511;
        body: unknown;
        headers: Headers;
    }>;
    getStudioList: (args?: {
        cache?: RequestCache | undefined;
        fetchOptions?: import("@ts-rest/core").FetchOptions | undefined;
        extraHeaders?: Record<string, string | undefined> | undefined;
        overrideClientOptions?: Partial<import("@ts-rest/core").OverrideableClientArgs> | undefined;
        query?: {
            Limit?: number | undefined;
            UserId?: string | undefined;
            AlbumArtistIds?: string | undefined;
            ArtistIds?: string | undefined;
            ContributingArtistIds?: string | undefined;
            EnableImageTypes?: string | undefined;
            EnableTotalRecordCount?: boolean | undefined;
            EnableUserData?: boolean | undefined;
            EnableUserDataTypes?: boolean | undefined;
            ExcludeArtistIds?: string | undefined;
            ExcludeItemIds?: string | undefined;
            ExcludeItemTypes?: string | undefined;
            Fields?: readonly string[] | undefined;
            FolderId?: string | undefined;
            ImageTypeLimit?: number | undefined;
            IncludeArtists?: boolean | undefined;
            IncludeGenres?: boolean | undefined;
            IncludeItemTypes?: string | undefined;
            IncludeMedia?: boolean | undefined;
            IncludePeople?: boolean | undefined;
            IncludeStudios?: boolean | undefined;
            IsFavorite?: boolean | undefined;
            MediaTypes?: string | undefined;
            NameStartsWith?: string | undefined;
            ParentId?: string | undefined;
            Recursive?: boolean | undefined;
            SearchTerm?: string | undefined;
            SortBy?: string | undefined;
            SortOrder?: "Ascending" | "Descending" | undefined;
            StartIndex?: number | undefined;
            Tags?: string | undefined;
            Years?: string | undefined;
            NameStartsWithOrGreater?: string | undefined;
        } | undefined;
    } | undefined) => Promise<{
        status: 200;
        body: {
            Items: {
                Name: string;
                Id: string;
            }[];
        };
        headers: Headers;
    } | {
        status: 400;
        body: {
            title: string;
            type: string;
            status: number;
            errors: {
                recursive: string[];
            };
            traceId: string;
        };
        headers: Headers;
    } | {
        status: 404 | 401 | 403 | 300 | 100 | 500 | 204 | 101 | 102 | 201 | 202 | 203 | 205 | 206 | 207 | 301 | 302 | 303 | 304 | 305 | 307 | 308 | 402 | 405 | 406 | 407 | 408 | 409 | 410 | 411 | 412 | 413 | 414 | 415 | 416 | 417 | 418 | 419 | 420 | 421 | 422 | 423 | 424 | 428 | 429 | 431 | 451 | 501 | 502 | 503 | 504 | 505 | 507 | 511;
        body: unknown;
        headers: Headers;
    }>;
    getTopSongsList: (args: {
        cache?: RequestCache | undefined;
        params: {
            userId: string;
        };
        fetchOptions?: import("@ts-rest/core").FetchOptions | undefined;
        extraHeaders?: Record<string, string | undefined> | undefined;
        overrideClientOptions?: Partial<import("@ts-rest/core").OverrideableClientArgs> | undefined;
        query?: {
            Limit?: number | undefined;
            Genres?: string | undefined;
            UserId?: string | undefined;
            AlbumArtistIds?: string | undefined;
            ArtistIds?: string | undefined;
            ContributingArtistIds?: string | undefined;
            EnableImageTypes?: string | undefined;
            EnableTotalRecordCount?: boolean | undefined;
            EnableUserData?: boolean | undefined;
            EnableUserDataTypes?: boolean | undefined;
            ExcludeArtistIds?: string | undefined;
            ExcludeItemIds?: string | undefined;
            ExcludeItemTypes?: string | undefined;
            Fields?: readonly string[] | undefined;
            FolderId?: string | undefined;
            ImageTypeLimit?: number | undefined;
            IncludeArtists?: boolean | undefined;
            IncludeGenres?: boolean | undefined;
            IncludeItemTypes?: string | undefined;
            IncludeMedia?: boolean | undefined;
            IncludePeople?: boolean | undefined;
            IncludeStudios?: boolean | undefined;
            IsFavorite?: boolean | undefined;
            MediaTypes?: string | undefined;
            NameStartsWith?: string | undefined;
            ParentId?: string | undefined;
            Recursive?: boolean | undefined;
            SearchTerm?: string | undefined;
            SortBy?: "Name" | "Album,SortName" | "Runtime,AlbumArtist,Album,SortName" | "Random,SortName" | "DateCreated,SortName" | "PremiereDate,AlbumArtist,Album,SortName" | "CommunityRating,SortName" | "AlbumArtist,Album,SortName" | "ParentIndexNumber,IndexNumber,SortName" | "Artist,Album,SortName" | "PlayCount,SortName" | "DatePlayed,SortName" | undefined;
            SortOrder?: "Ascending" | "Descending" | undefined;
            StartIndex?: number | undefined;
            Tags?: string | undefined;
            Years?: string | undefined;
            Filters?: string | undefined;
            GenreIds?: string | undefined;
            AlbumIds?: string | undefined;
            IsPlayed?: boolean | undefined;
        } | undefined;
    }) => Promise<{
        status: 200;
        body: {
            StartIndex: number;
            TotalRecordCount: number;
            Items: {
                Name: string;
                Genres: string[];
                Album: string;
                MediaType: string;
                Id: string;
                AlbumArtist: string;
                AlbumArtists: {
                    Name: string;
                    Id: string;
                }[];
                AlbumPrimaryImageTag: string;
                ArtistItems: {
                    Name: string;
                    Id: string;
                }[];
                Artists: string[];
                ChannelId: null;
                DateCreated: string;
                ExternalUrls: {
                    Name: string;
                    Url: string;
                }[];
                GenreItems: {
                    Name: string;
                    Id: string;
                }[];
                ImageBlurHashes: {
                    Backdrop?: Record<string, string> | undefined;
                    Logo?: Record<string, string> | undefined;
                    Primary?: Record<string, string> | undefined;
                };
                ImageTags: {
                    Logo?: string | undefined;
                    Primary?: string | undefined;
                };
                IsFolder: boolean;
                LocationType: string;
                Type: string;
                ProductionYear: number;
                RunTimeTicks: number;
                ServerId: string;
                BackdropImageTags: string[];
                IndexNumber: number;
                MediaSources: {
                    Name: string;
                    Bitrate: number;
                    Id: string;
                    Type: string;
                    RunTimeTicks: number;
                    Container: string;
                    DefaultAudioStreamIndex: number;
                    ETag: string;
                    Formats: any[];
                    GenPtsInput: boolean;
                    IgnoreDts: boolean;
                    IgnoreIndex: boolean;
                    IsInfiniteStream: boolean;
                    IsRemote: boolean;
                    MediaAttachments: any[];
                    MediaStreams: {
                        Codec: string;
                        Level: number;
                        Type: string;
                        CodecTimeBase: string;
                        Index: number;
                        IsDefault: boolean;
                        IsExternal: boolean;
                        IsForced: boolean;
                        IsInterlaced: boolean;
                        IsTextSubtitleStream: boolean;
                        SupportsExternalStream: boolean;
                        TimeBase: string;
                        AspectRatio?: string | undefined;
                        BitDepth?: number | undefined;
                        BitRate?: number | undefined;
                        ChannelLayout?: string | undefined;
                        Channels?: number | undefined;
                        ColorSpace?: string | undefined;
                        Comment?: string | undefined;
                        DisplayTitle?: string | undefined;
                        Height?: number | undefined;
                        PixelFormat?: string | undefined;
                        Profile?: string | undefined;
                        RealFrameRate?: number | undefined;
                        RefFrames?: number | undefined;
                        SampleRate?: number | undefined;
                        Width?: number | undefined;
                    }[];
                    Path: string;
                    Protocol: string;
                    ReadAtNativeFramerate: boolean;
                    RequiresClosing: boolean;
                    RequiresLooping: boolean;
                    RequiresOpening: boolean;
                    Size: number;
                    SupportsDirectPlay: boolean;
                    SupportsDirectStream: boolean;
                    SupportsProbing: boolean;
                    SupportsTranscoding: boolean;
                    RequiredHttpHeaders?: any;
                }[];
                ParentIndexNumber: number;
                SortName?: string | undefined;
                ParentId?: string | undefined;
                Tags?: string[] | undefined;
                PlaylistItemId?: string | undefined;
                People?: {
                    Name: string;
                    Id: string;
                    Type?: string | undefined;
                }[] | undefined;
                PremiereDate?: string | undefined;
                ProviderIds?: {
                    MusicBrainzAlbum?: string | undefined;
                    MusicBrainzAlbumArtist?: string | undefined;
                    MusicBrainzArtist?: string | undefined;
                    MusicBrainzRecording?: string | undefined;
                    MusicBrainzReleaseGroup?: string | undefined;
                    MusicBrainzTrack?: string | undefined;
                } | undefined;
                AlbumId?: string | undefined;
                LUFS?: number | undefined;
                NormalizationGain?: number | undefined;
                UserData?: {
                    PlayCount: number;
                    IsFavorite: boolean;
                    Key: string;
                    PlaybackPositionTicks: number;
                    Played: boolean;
                } | undefined;
            }[];
        };
        headers: Headers;
    } | {
        status: 400;
        body: {
            title: string;
            type: string;
            status: number;
            errors: {
                recursive: string[];
            };
            traceId: string;
        };
        headers: Headers;
    } | {
        status: 404 | 401 | 403 | 300 | 100 | 500 | 204 | 101 | 102 | 201 | 202 | 203 | 205 | 206 | 207 | 301 | 302 | 303 | 304 | 305 | 307 | 308 | 402 | 405 | 406 | 407 | 408 | 409 | 410 | 411 | 412 | 413 | 414 | 415 | 416 | 417 | 418 | 419 | 420 | 421 | 422 | 423 | 424 | 428 | 429 | 431 | 451 | 501 | 502 | 503 | 504 | 505 | 507 | 511;
        body: unknown;
        headers: Headers;
    }>;
    getUser: (args: {
        cache?: RequestCache | undefined;
        params: {
            id: string;
        };
        fetchOptions?: import("@ts-rest/core").FetchOptions | undefined;
        extraHeaders?: Record<string, string | undefined> | undefined;
        overrideClientOptions?: Partial<import("@ts-rest/core").OverrideableClientArgs> | undefined;
    }) => Promise<{
        status: 200;
        body: {
            Name: string;
            Id: string;
            ServerId: string;
            LastActivityDate: string;
            Configuration: {
                DisplayCollectionsView: boolean;
                DisplayMissingEpisodes: boolean;
                EnableLocalPassword: boolean;
                EnableNextEpisodeAutoPlay: boolean;
                GroupedFolders: any[];
                HidePlayedInLatest: boolean;
                LatestItemsExcludes: any[];
                MyMediaExcludes: any[];
                OrderedViews: any[];
                PlayDefaultAudioTrack: boolean;
                RememberAudioSelections: boolean;
                RememberSubtitleSelections: boolean;
                SubtitleLanguagePreference: string;
                SubtitleMode: string;
            };
            EnableAutoLogin: boolean;
            HasConfiguredEasyPassword: boolean;
            HasConfiguredPassword: boolean;
            HasPassword: boolean;
            LastLoginDate: string;
            Policy: {
                AccessSchedules: any[];
                AuthenticationProviderId: string;
                BlockedChannels: any[];
                BlockedMediaFolders: any[];
                BlockedTags: any[];
                BlockUnratedItems: any[];
                EnableAllChannels: boolean;
                EnableAllDevices: boolean;
                EnableAllFolders: boolean;
                EnableAudioPlaybackTranscoding: boolean;
                EnableContentDeletion: boolean;
                EnableContentDeletionFromFolders: any[];
                EnableContentDownloading: boolean;
                EnabledChannels: any[];
                EnabledDevices: any[];
                EnabledFolders: any[];
                EnableLiveTvAccess: boolean;
                EnableLiveTvManagement: boolean;
                EnableMediaConversion: boolean;
                EnableMediaPlayback: boolean;
                EnablePlaybackRemuxing: boolean;
                EnablePublicSharing: boolean;
                EnableRemoteAccess: boolean;
                EnableRemoteControlOfOtherUsers: boolean;
                EnableSharedDeviceControl: boolean;
                EnableSyncTranscoding: boolean;
                EnableUserPreferenceAccess: boolean;
                EnableVideoPlaybackTranscoding: boolean;
                ForceRemoteSourceTranscoding: boolean;
                InvalidLoginAttemptCount: number;
                IsAdministrator: boolean;
                IsDisabled: boolean;
                IsHidden: boolean;
                LoginAttemptsBeforeLockout: number;
                MaxActiveSessions: number;
                PasswordResetProviderId: string;
                RemoteClientBitrateLimit: number;
                SyncPlayAccess: string;
            };
        };
        headers: Headers;
    } | {
        status: 400;
        body: {
            title: string;
            type: string;
            status: number;
            errors: {
                recursive: string[];
            };
            traceId: string;
        };
        headers: Headers;
    } | {
        status: 404 | 401 | 403 | 300 | 100 | 500 | 204 | 101 | 102 | 201 | 202 | 203 | 205 | 206 | 207 | 301 | 302 | 303 | 304 | 305 | 307 | 308 | 402 | 405 | 406 | 407 | 408 | 409 | 410 | 411 | 412 | 413 | 414 | 415 | 416 | 417 | 418 | 419 | 420 | 421 | 422 | 423 | 424 | 428 | 429 | 431 | 451 | 501 | 502 | 503 | 504 | 505 | 507 | 511;
        body: unknown;
        headers: Headers;
    }>;
    movePlaylistItem: (args: {
        cache?: RequestCache | undefined;
        params: {
            playlistId: string;
            itemId: string;
            newIdx: string;
        };
        fetchOptions?: import("@ts-rest/core").FetchOptions | undefined;
        extraHeaders?: Record<string, string | undefined> | undefined;
        overrideClientOptions?: Partial<import("@ts-rest/core").OverrideableClientArgs> | undefined;
    }) => Promise<{
        status: 200;
        body: null;
        headers: Headers;
    } | {
        status: 400;
        body: {
            title: string;
            type: string;
            status: number;
            errors: {
                recursive: string[];
            };
            traceId: string;
        };
        headers: Headers;
    } | {
        status: 404 | 401 | 403 | 300 | 100 | 500 | 204 | 101 | 102 | 201 | 202 | 203 | 205 | 206 | 207 | 301 | 302 | 303 | 304 | 305 | 307 | 308 | 402 | 405 | 406 | 407 | 408 | 409 | 410 | 411 | 412 | 413 | 414 | 415 | 416 | 417 | 418 | 419 | 420 | 421 | 422 | 423 | 424 | 428 | 429 | 431 | 451 | 501 | 502 | 503 | 504 | 505 | 507 | 511;
        body: unknown;
        headers: Headers;
    }>;
    removeFavorite: (args: {
        cache?: RequestCache | undefined;
        params: {
            userId: string;
            id: string;
        };
        fetchOptions?: import("@ts-rest/core").FetchOptions | undefined;
        extraHeaders?: Record<string, string | undefined> | undefined;
        overrideClientOptions?: Partial<import("@ts-rest/core").OverrideableClientArgs> | undefined;
        body?: {} | undefined;
    }) => Promise<{
        status: 200;
        body: {
            PlayCount: number;
            IsFavorite: boolean;
            ItemId: string;
            Key: string;
            PlaybackPositionTicks: number;
            Played: boolean;
            LastPlayedDate: string;
            Likes: boolean;
            PlayedPercentage: number;
            Rating: number;
            UnplayedItemCount: number;
        };
        headers: Headers;
    } | {
        status: 400;
        body: {
            title: string;
            type: string;
            status: number;
            errors: {
                recursive: string[];
            };
            traceId: string;
        };
        headers: Headers;
    } | {
        status: 404 | 401 | 403 | 300 | 100 | 500 | 204 | 101 | 102 | 201 | 202 | 203 | 205 | 206 | 207 | 301 | 302 | 303 | 304 | 305 | 307 | 308 | 402 | 405 | 406 | 407 | 408 | 409 | 410 | 411 | 412 | 413 | 414 | 415 | 416 | 417 | 418 | 419 | 420 | 421 | 422 | 423 | 424 | 428 | 429 | 431 | 451 | 501 | 502 | 503 | 504 | 505 | 507 | 511;
        body: unknown;
        headers: Headers;
    }>;
    removeFromPlaylist: (args: {
        cache?: RequestCache | undefined;
        params: {
            id: string;
        };
        query: {
            EntryIds: string;
        };
        fetchOptions?: import("@ts-rest/core").FetchOptions | undefined;
        extraHeaders?: Record<string, string | undefined> | undefined;
        overrideClientOptions?: Partial<import("@ts-rest/core").OverrideableClientArgs> | undefined;
    }) => Promise<{
        status: 200;
        body: null;
        headers: Headers;
    } | {
        status: 400;
        body: {
            title: string;
            type: string;
            status: number;
            errors: {
                recursive: string[];
            };
            traceId: string;
        };
        headers: Headers;
    } | {
        status: 404 | 401 | 403 | 300 | 100 | 500 | 204 | 101 | 102 | 201 | 202 | 203 | 205 | 206 | 207 | 301 | 302 | 303 | 304 | 305 | 307 | 308 | 402 | 405 | 406 | 407 | 408 | 409 | 410 | 411 | 412 | 413 | 414 | 415 | 416 | 417 | 418 | 419 | 420 | 421 | 422 | 423 | 424 | 428 | 429 | 431 | 451 | 501 | 502 | 503 | 504 | 505 | 507 | 511;
        body: unknown;
        headers: Headers;
    }>;
    savePlayQueue: (args: {
        cache?: RequestCache | undefined;
        body: {
            ItemId: string;
            NowPlayingQueue: {
                Id: string;
                PlaylistItemId?: string | undefined;
            }[];
            EventName?: string | undefined;
            IsPaused?: boolean | undefined;
            PositionTicks?: number | undefined;
            PlaylistItemId?: string | undefined;
        };
        fetchOptions?: import("@ts-rest/core").FetchOptions | undefined;
        extraHeaders?: Record<string, string | undefined> | undefined;
        overrideClientOptions?: Partial<import("@ts-rest/core").OverrideableClientArgs> | undefined;
    }) => Promise<{
        status: 200;
        body: any;
        headers: Headers;
    } | {
        status: 400;
        body: {
            title: string;
            type: string;
            status: number;
            errors: {
                recursive: string[];
            };
            traceId: string;
        };
        headers: Headers;
    } | {
        status: 404 | 401 | 403 | 300 | 100 | 500 | 204 | 101 | 102 | 201 | 202 | 203 | 205 | 206 | 207 | 301 | 302 | 303 | 304 | 305 | 307 | 308 | 402 | 405 | 406 | 407 | 408 | 409 | 410 | 411 | 412 | 413 | 414 | 415 | 416 | 417 | 418 | 419 | 420 | 421 | 422 | 423 | 424 | 428 | 429 | 431 | 451 | 501 | 502 | 503 | 504 | 505 | 507 | 511;
        body: unknown;
        headers: Headers;
    }>;
    scrobblePlaying: (args: {
        cache?: RequestCache | undefined;
        body: {
            ItemId: string;
            EventName?: string | undefined;
            IsPaused?: boolean | undefined;
            PositionTicks?: number | undefined;
        };
        fetchOptions?: import("@ts-rest/core").FetchOptions | undefined;
        extraHeaders?: Record<string, string | undefined> | undefined;
        overrideClientOptions?: Partial<import("@ts-rest/core").OverrideableClientArgs> | undefined;
    }) => Promise<{
        status: 200;
        body: any;
        headers: Headers;
    } | {
        status: 400;
        body: {
            title: string;
            type: string;
            status: number;
            errors: {
                recursive: string[];
            };
            traceId: string;
        };
        headers: Headers;
    } | {
        status: 404 | 401 | 403 | 300 | 100 | 500 | 204 | 101 | 102 | 201 | 202 | 203 | 205 | 206 | 207 | 301 | 302 | 303 | 304 | 305 | 307 | 308 | 402 | 405 | 406 | 407 | 408 | 409 | 410 | 411 | 412 | 413 | 414 | 415 | 416 | 417 | 418 | 419 | 420 | 421 | 422 | 423 | 424 | 428 | 429 | 431 | 451 | 501 | 502 | 503 | 504 | 505 | 507 | 511;
        body: unknown;
        headers: Headers;
    }>;
    scrobbleProgress: (args: {
        cache?: RequestCache | undefined;
        body: {
            ItemId: string;
            EventName?: string | undefined;
            IsPaused?: boolean | undefined;
            PositionTicks?: number | undefined;
        };
        fetchOptions?: import("@ts-rest/core").FetchOptions | undefined;
        extraHeaders?: Record<string, string | undefined> | undefined;
        overrideClientOptions?: Partial<import("@ts-rest/core").OverrideableClientArgs> | undefined;
    }) => Promise<{
        status: 200;
        body: any;
        headers: Headers;
    } | {
        status: 400;
        body: {
            title: string;
            type: string;
            status: number;
            errors: {
                recursive: string[];
            };
            traceId: string;
        };
        headers: Headers;
    } | {
        status: 404 | 401 | 403 | 300 | 100 | 500 | 204 | 101 | 102 | 201 | 202 | 203 | 205 | 206 | 207 | 301 | 302 | 303 | 304 | 305 | 307 | 308 | 402 | 405 | 406 | 407 | 408 | 409 | 410 | 411 | 412 | 413 | 414 | 415 | 416 | 417 | 418 | 419 | 420 | 421 | 422 | 423 | 424 | 428 | 429 | 431 | 451 | 501 | 502 | 503 | 504 | 505 | 507 | 511;
        body: unknown;
        headers: Headers;
    }>;
    scrobbleStopped: (args: {
        cache?: RequestCache | undefined;
        body: {
            ItemId: string;
            EventName?: string | undefined;
            IsPaused?: boolean | undefined;
            PositionTicks?: number | undefined;
        };
        fetchOptions?: import("@ts-rest/core").FetchOptions | undefined;
        extraHeaders?: Record<string, string | undefined> | undefined;
        overrideClientOptions?: Partial<import("@ts-rest/core").OverrideableClientArgs> | undefined;
    }) => Promise<{
        status: 200;
        body: any;
        headers: Headers;
    } | {
        status: 400;
        body: {
            title: string;
            type: string;
            status: number;
            errors: {
                recursive: string[];
            };
            traceId: string;
        };
        headers: Headers;
    } | {
        status: 404 | 401 | 403 | 300 | 100 | 500 | 204 | 101 | 102 | 201 | 202 | 203 | 205 | 206 | 207 | 301 | 302 | 303 | 304 | 305 | 307 | 308 | 402 | 405 | 406 | 407 | 408 | 409 | 410 | 411 | 412 | 413 | 414 | 415 | 416 | 417 | 418 | 419 | 420 | 421 | 422 | 423 | 424 | 428 | 429 | 431 | 451 | 501 | 502 | 503 | 504 | 505 | 507 | 511;
        body: unknown;
        headers: Headers;
    }>;
    search: (args: {
        cache?: RequestCache | undefined;
        params: {
            userId: string;
        };
        fetchOptions?: import("@ts-rest/core").FetchOptions | undefined;
        extraHeaders?: Record<string, string | undefined> | undefined;
        overrideClientOptions?: Partial<import("@ts-rest/core").OverrideableClientArgs> | undefined;
        query?: {
            Limit?: number | undefined;
            UserId?: string | undefined;
            AlbumArtistIds?: string | undefined;
            ArtistIds?: string | undefined;
            ContributingArtistIds?: string | undefined;
            EnableImageTypes?: string | undefined;
            EnableTotalRecordCount?: boolean | undefined;
            EnableUserData?: boolean | undefined;
            EnableUserDataTypes?: boolean | undefined;
            ExcludeArtistIds?: string | undefined;
            ExcludeItemIds?: string | undefined;
            ExcludeItemTypes?: string | undefined;
            Fields?: readonly string[] | undefined;
            FolderId?: string | undefined;
            ImageTypeLimit?: number | undefined;
            IncludeArtists?: boolean | undefined;
            IncludeGenres?: boolean | undefined;
            IncludeItemTypes?: string | undefined;
            IncludeMedia?: boolean | undefined;
            IncludePeople?: boolean | undefined;
            IncludeStudios?: boolean | undefined;
            IsFavorite?: boolean | undefined;
            MediaTypes?: string | undefined;
            NameStartsWith?: string | undefined;
            ParentId?: string | undefined;
            Recursive?: boolean | undefined;
            SearchTerm?: string | undefined;
            SortBy?: string | undefined;
            SortOrder?: "Ascending" | "Descending" | undefined;
            StartIndex?: number | undefined;
            Tags?: string | undefined;
            Years?: string | undefined;
        } | undefined;
    }) => Promise<{
        status: 200;
        body: any;
        headers: Headers;
    } | {
        status: 400;
        body: {
            title: string;
            type: string;
            status: number;
            errors: {
                recursive: string[];
            };
            traceId: string;
        };
        headers: Headers;
    } | {
        status: 404 | 401 | 403 | 300 | 100 | 500 | 204 | 101 | 102 | 201 | 202 | 203 | 205 | 206 | 207 | 301 | 302 | 303 | 304 | 305 | 307 | 308 | 402 | 405 | 406 | 407 | 408 | 409 | 410 | 411 | 412 | 413 | 414 | 415 | 416 | 417 | 418 | 419 | 420 | 421 | 422 | 423 | 424 | 428 | 429 | 431 | 451 | 501 | 502 | 503 | 504 | 505 | 507 | 511;
        body: unknown;
        headers: Headers;
    }>;
    updatePlaylist: (args: {
        cache?: RequestCache | undefined;
        params: {
            id: string;
        };
        fetchOptions?: import("@ts-rest/core").FetchOptions | undefined;
        extraHeaders?: Record<string, string | undefined> | undefined;
        overrideClientOptions?: Partial<import("@ts-rest/core").OverrideableClientArgs> | undefined;
        body?: {
            Name?: string | undefined;
            Ids?: string[] | undefined;
            IsPublic?: boolean | undefined;
        } | undefined;
    }) => Promise<{
        status: 200;
        body: null;
        headers: Headers;
    } | {
        status: 400;
        body: {
            title: string;
            type: string;
            status: number;
            errors: {
                recursive: string[];
            };
            traceId: string;
        };
        headers: Headers;
    } | {
        status: 404 | 401 | 403 | 300 | 100 | 500 | 204 | 101 | 102 | 201 | 202 | 203 | 205 | 206 | 207 | 301 | 302 | 303 | 304 | 305 | 307 | 308 | 402 | 405 | 406 | 407 | 408 | 409 | 410 | 411 | 412 | 413 | 414 | 415 | 416 | 417 | 418 | 419 | 420 | 421 | 422 | 423 | 424 | 428 | 429 | 431 | 451 | 501 | 502 | 503 | 504 | 505 | 507 | 511;
        body: unknown;
        headers: Headers;
    }>;
};
