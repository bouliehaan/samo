import { memo, useMemo } from 'react';
import { ScrollView } from 'react-native';
import { ServerType } from '@samo/core/server';
import { getMobileContentSource } from '@samo/core/mobile';

import { AddServerScreen } from '../screens/AddServerScreen';
import { DownloadsScreen } from '../screens/DownloadsScreen';
import { InitialSyncScreen } from '../screens/InitialSyncScreen';
import { ManageServersScreen } from '../screens/ManageServersScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { useScrollContentBottomInset } from '../hooks/use-scroll-content-bottom-inset';
import {
    canConnectWith,
    connectServer,
    disconnectServer,
} from '../services/server-session';
import { syncWithServer } from '../services/server-sync';
import {
    setActiveUtilityScreen,
    useAppNavigationSelector,
} from '../state/app-navigation';
import {
    setPassword,
    setServerUrl,
    setUsername,
    useAuthSessionSelector,
} from '../state/auth-session';
import {
    setArtworkCacheLimit,
    setDownloadsOfflineMode,
    useDownloadsSelector,
} from '../state/downloads-state';
import { styles } from '../theme/styles';
import { addDefaultHttpScheme, DEFAULT_SERVER_URL } from '../utils/auth-url';

// Every handler below only touches module-level store setters/services, so
// they are plain module functions — stable forever, no useCallback.
const handleOpenManageServers = () => setActiveUtilityScreen('manage-servers');
const handleOpenDownloads = () => setActiveUtilityScreen('downloads');
const handleInitialSyncComplete = () => setActiveUtilityScreen(null);
const handleConnect = () => void connectServer();
const normalizeServerUrlDraft = () =>
    setServerUrl((current) =>
        current.trim().length === 0 ? DEFAULT_SERVER_URL : addDefaultHttpScheme(current),
    );
const handleOpenAddServer = () => {
    normalizeServerUrlDraft();
    setActiveUtilityScreen('add-server');
};

/**
 * Owns the rendering of all utility screens (Settings, Manage Servers,
 * Downloads, Add Server, Initial Sync). Subscribes to the navigation, auth,
 * and downloads stores itself, so opening/typing in these screens re-renders
 * this host only — App.tsx never hears about it.
 */
export const UtilityScreenHost = memo(function UtilityScreenHost() {
    const activeUtilityScreen = useAppNavigationSelector(
        (state) => state.activeUtilityScreen,
    );
    const authState = useAuthSessionSelector((state) => state.authState);
    const password = useAuthSessionSelector((state) => state.password);
    const serverConnection = useAuthSessionSelector((state) => state.serverConnection);
    const serverHealthByKey = useAuthSessionSelector((state) => state.serverHealthByKey);
    const serverUrl = useAuthSessionSelector((state) => state.serverUrl);
    const username = useAuthSessionSelector((state) => state.username);
    const artworkCacheLimitBytes = useDownloadsSelector(
        (state) => state.artworkCacheLimitBytes,
    );
    const isOfflineMode = useDownloadsSelector((state) => state.isOfflineMode);
    const scrollBottomInset = useScrollContentBottomInset();

    const canConnect = canConnectWith({ password, serverUrl, username });

    const catalogSources = useMemo(
        () =>
            serverConnection?.type === ServerType.SAMO
                ? [
                      {
                          id: getMobileContentSource(serverConnection).id,
                          title: serverConnection.title,
                      },
                  ]
                : [],
        [serverConnection],
    );

    const content =
        activeUtilityScreen === 'settings' ? (
            <SettingsScreen
                artworkCacheLimitBytes={artworkCacheLimitBytes}
                catalogSources={catalogSources}
                isOfflineMode={isOfflineMode}
                onOpenDownloads={handleOpenDownloads}
                onOpenManageServers={handleOpenManageServers}
                onSetArtworkCacheLimit={setArtworkCacheLimit}
                onSyncWithServer={syncWithServer}
                onToggleOfflineMode={setDownloadsOfflineMode}
                serverCount={serverConnection ? 1 : 0}
            />
        ) : activeUtilityScreen === 'manage-servers' ? (
            <ManageServersScreen
                authState={authState}
                onAddServer={handleOpenAddServer}
                onDisconnect={disconnectServer}
                serverConnection={serverConnection}
                serverHealthByKey={serverHealthByKey}
            />
        ) : activeUtilityScreen === 'downloads' ? (
            <DownloadsScreen serverConnection={serverConnection} />
        ) : activeUtilityScreen === 'add-server' ? (
            <AddServerScreen
                authState={authState}
                canConnect={canConnect}
                hasServerConnection={!!serverConnection}
                onBack={handleOpenManageServers}
                onConnect={handleConnect}
                onPasswordChange={setPassword}
                onServerUrlBlur={normalizeServerUrlDraft}
                onServerUrlChange={setServerUrl}
                onUsernameChange={setUsername}
                password={password}
                serverUrl={serverUrl}
                username={username}
            />
        ) : activeUtilityScreen === 'initial-sync' ? (
            <InitialSyncScreen
                onComplete={handleInitialSyncComplete}
                serverConnection={serverConnection}
            />
        ) : null;

    if (!content) {
        return null;
    }

    return (
        <ScrollView
            contentContainerStyle={[
                styles.content,
                styles.utilityScrollContent,
                { paddingBottom: scrollBottomInset },
            ]}
            keyboardShouldPersistTaps="handled"
            style={[styles.navOverlay, styles.tabUtilityScene]}
        >
            {content}
        </ScrollView>
    );
});
