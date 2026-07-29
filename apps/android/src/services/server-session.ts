import {
    reconcileServerAuthentication,
    type ServerAuthenticationResult,
    ServerConnectionHealthStatus,
    ServerType,
} from '@samo/core/server';

import { closeMediaDetail, setActiveUtilityScreen, setHomeContentState, setSearchState } from '../state/app-navigation';
import {
    getAuthSession,
    setAuthState,
    setBootResolved,
    setOnboardingActive,
    setPassword,
    setServerConnection,
    setServerHealthByKey,
    setServerUrl,
    setUsername,
} from '../state/auth-session';
import { whenNetworkHydrated } from '../state/network-state';
import { isOfflineNow, setServerReachability } from '../state/network-state';
import { addDefaultHttpScheme, DEFAULT_SERVER_URL, hasServerUrlTarget } from '../utils/auth-url';
import { cancelCatalogArtworkPrefetch } from './artwork-prefetch';
import { refreshActiveEndpoint } from './endpoint-selection';
import { loadHomeForConnection } from './home-flow';
import {
    ensureEndpointProfileForConnection,
    forgetEndpointProfile,
    loadEndpointProfiles,
} from './server-endpoints';
import { syncCatalogAuthMirror, triggerCatalogSyncNow } from './headless-catalog-sync';
import {
    getPersistedServerAuthKey,
    loadPersistedServerAuth,
    loadPersistedServerAuthsWithMeta,
    savePersistedServerAuths,
} from './persisted-server';
import { authenticateServer } from './server-auth';
import {
    checkAndroidServerConnection,
    createCheckingServerHealthMap,
    createConnectedServerHealthStatus,
} from './server-health';

/**
 * Value-equality for two authentications, used to avoid pointlessly swapping
 * `serverConnection` to a fresh object on restore. The streaming-relevant
 * identity is `url`/`username`/`credential` (the token) plus `type`/`kind`; the
 * rest is descriptive. A changed `credential` is NOT equal, so a genuinely
 * refreshed token always swaps in (streaming never uses a stale one) — we only
 * collapse identity when nothing that matters changed, which is the common
 * "saved session still valid" restore. Keeping the same reference there stops a
 * new object from rotating every resolved artwork URL and remounting Home.
 */
const isSameAuthentication = (
    a: ServerAuthenticationResult | null,
    b: ServerAuthenticationResult | null,
): boolean => {
    if (a === b) {
        return true;
    }
    if (!a || !b) {
        return false;
    }
    return (
        a.url === b.url &&
        a.username === b.username &&
        a.credential === b.credential &&
        a.type === b.type &&
        a.kind === b.kind &&
        a.title === b.title &&
        a.details === b.details &&
        a.userId === b.userId &&
        a.isAdmin === b.isAdmin &&
        a.serverVersion === b.serverVersion
    );
};

/** True when the login form holds a plausibly-submittable target. Derived at
 *  call/render time from the auth store — no hook needed. */
export const canConnectWith = (state: {
    password: string;
    serverUrl: string;
    username: string;
}): boolean =>
    hasServerUrlTarget(state.serverUrl) &&
    state.username.trim().length > 0 &&
    state.password.length > 0;

let restoreStarted = false;

/**
 * Boot-time saved-session restore (offline-first: show the cached session
 * immediately, verify in the background). Runs once per JS lifetime — App
 * kicks it from a mount effect.
 */
export const restoreServersOnce = (): void => {
    if (restoreStarted) {
        return;
    }
    restoreStarted = true;

    const restoreServers = async () => {
        // Both are fast local reads, and both have to land BEFORE anything
        // decides to touch the network: without the offline preference a
        // forced-offline launch still fires a full boot's worth of requests,
        // and without the endpoint profile the first request goes to whichever
        // address happened to be saved rather than the one that works here.
        await Promise.all([whenNetworkHydrated(), loadEndpointProfiles()]);

        const persisted = await loadPersistedServerAuthsWithMeta();
        const persistedAuth = persisted.authentication ?? null;

        if (persisted.discardedCount > 0) {
            setAuthState({
                message:
                    persistedAuth !== null
                        ? `Ignored ${persisted.discardedCount} invalid saved server session.`
                        : 'Saved server session was invalid. Please reconnect.',
                status: 'error',
            });
        }

        if (persisted.discardedCount > 0 || persisted.migratedLegacySingle) {
            await savePersistedServerAuths(persistedAuth ? [persistedAuth] : []);
        }

        // No saved server → straight into the first-run onboarding flow.
        // `bootResolved` lifts the splash; `onboardingActive` mounts the
        // welcome → discover → connect → sync experience.
        if (!persistedAuth) {
            setOnboardingActive(true);
            setBootResolved(true);
            return;
        }

        void syncCatalogAuthMirror([persistedAuth]);

        // Show the app immediately with the cached session (offline-first):
        // lift the splash now and verify the session in the background.
        setServerConnection(persistedAuth);
        setServerHealthByKey(createCheckingServerHealthMap(persistedAuth));
        setBootResolved(true);

        // WHICH address before WHETHER the session is valid. Health-checking
        // the saved address first would report a perfectly good server as
        // unreachable whenever the device has moved networks since the last
        // launch — the exact case dual addresses exist to handle — and would do
        // it slowly, since the wrong address times out rather than refusing.
        await refreshActiveEndpoint({ force: true });

        // Offline: there is nothing to verify against, and the saved session is
        // the right thing to keep. This used to run the check anyway and then
        // paint "Saved server session needs attention" over a launch whose only
        // problem was being in a tunnel.
        if (isOfflineNow()) {
            void loadHomeForConnection(getAuthSession().serverConnection);
            return;
        }

        // Re-read: endpoint selection may have moved the connection onto the
        // server's other address, and health-checking the one we just left
        // would undo it.
        const activeAuth = getAuthSession().serverConnection ?? persistedAuth;
        const serverHealth = await checkAndroidServerConnection(activeAuth);

        const isAuthorized = serverHealth.authentication !== null;
        const healthStatus =
            serverHealth.statuses[getPersistedServerAuthKey(activeAuth)]?.status;

        // A genuinely expired/revoked session (401) is the one case where we
        // must NOT keep the user on a home page backed by dead credentials —
        // drop the connection and route into onboarding to reconnect. A mere
        // network blip (UNREACHABLE) keeps the cached session so offline use
        // and flaky Wi-Fi don't force a needless re-login.
        if (!isAuthorized) {
            setServerConnection(null);
            setServerHealthByKey(serverHealth.statuses);
            setAuthState({
                message: 'Your saved session expired. Please reconnect.',
                status: 'error',
            });
            await savePersistedServerAuths([]);
            setOnboardingActive(true);
            return;
        }

        // Reuse the reference we set from disk (line above) when the health
        // check came back value-equal — a brand-new object here rotates every
        // resolved artwork token and remounts the whole Home page (the
        // cold-boot "deload then reload" flash). Only a genuinely changed
        // credential swaps in.
        const nextConnection = isSameAuthentication(activeAuth, serverHealth.authentication)
            ? activeAuth
            : serverHealth.authentication;
        setServerConnection(nextConnection);
        setServerHealthByKey(serverHealth.statuses);

        // An unreachable server is now a NETWORK fact, reported as one — the
        // app drops into offline mode and says so in the status chip. It is not
        // an auth error, and dressing it up as "your saved session needs
        // attention" sent people to re-login over a dropped Wi-Fi.
        if (healthStatus === ServerConnectionHealthStatus.UNREACHABLE) {
            setServerReachability('unreachable');
        } else if (healthStatus !== ServerConnectionHealthStatus.HEALTHY) {
            setAuthState({
                message: `Saved server session needs attention.`,
                status: 'error',
            });
        }

        await savePersistedServerAuths(
            serverHealth.authentication ? [serverHealth.authentication] : [],
        );
        void loadHomeForConnection(serverHealth.authentication);
    };

    void restoreServers().finally(() => {
        // Whatever happens, never leave the user stuck behind the splash.
        setBootResolved(true);
    });
};

export const connectServer = async (): Promise<void> => {
    const { authState, password, serverUrl, username } = getAuthSession();
    if (!canConnectWith({ password, serverUrl, username }) || authState.status === 'loading') {
        return;
    }

    const normalizedServerUrl = addDefaultHttpScheme(serverUrl);
    setServerUrl(normalizedServerUrl);
    setAuthState({ message: 'Connecting to server', status: 'loading' });
    setHomeContentState({ status: 'idle' });

    const nextAuthState = await authenticateServer(
        {
            password,
            type: ServerType.SAMO,
            url: normalizedServerUrl,
            username: username.trim(),
        },
        (message) => setAuthState({ message, status: 'loading' }),
    );

    setAuthState(nextAuthState);

    if (nextAuthState.status === 'connected') {
        // Carry the existing key forward when this is a server the device
        // already knows. Without it, the first login after a server starts
        // issuing identities would re-key the connection and strand the
        // catalog mirror, downloads and progress already on disk.
        const previousConnection = await loadPersistedServerAuth();
        const nextConnection = reconcileServerAuthentication(
            nextAuthState.result,
            previousConnection,
        );
        const nextConnectionKey = getPersistedServerAuthKey(nextConnection);

        setServerConnection(nextConnection);
        setServerHealthByKey((current) => ({
            ...current,
            [nextConnectionKey]: createConnectedServerHealthStatus(nextConnection),
        }));
        // A successful login is proof of reachability — record it so the app
        // doesn't sit in offline mode until the next probe round, and file the
        // address that worked into its local/remote slot so network settings
        // opens pre-filled rather than empty.
        setServerReachability('reachable');
        await ensureEndpointProfileForConnection(nextConnection);
        closeMediaDetail();
        setPassword('');
        setServerUrl(DEFAULT_SERVER_URL);
        setUsername('');
        setSearchState({ status: 'idle' });
        setActiveUtilityScreen('initial-sync');
        await savePersistedServerAuths([nextConnection]);
        await loadHomeForConnection(nextConnection);

        // Kick off the on-device library mirror for the just-added source.
        // The Kotlin engine runs it (savePersistedServerAuths above already
        // pushed the auth mirror it reads); progress streams into the
        // Settings "Local library" panel and the post-sync bridge warms
        // the cover-art cache when it finishes.
        void triggerCatalogSyncNow();
    }
};

export const disconnectServer = async (
    authentication: ServerAuthenticationResult,
): Promise<void> => {
    const removedConnectionKey = getPersistedServerAuthKey(authentication);

    // Stop warming cover art for a server the user is leaving. A full-library
    // warm runs for minutes, so without this a disconnect kept downloading from
    // the old host — and kept holding its credentials to do it.
    cancelCatalogArtworkPrefetch();
    // The addresses go with the server. Leaving them behind would mean the next
    // connection to a DIFFERENT server at the same connection key inherited
    // somebody else's endpoints to probe.
    await forgetEndpointProfile(authentication);
    setServerReachability('unknown', null);
    setServerConnection(null);
    setServerHealthByKey((current) => {
        const nextHealthByKey = { ...current };
        delete nextHealthByKey[removedConnectionKey];
        return nextHealthByKey;
    });
    closeMediaDetail();
    setSearchState({ status: 'idle' });
    setAuthState({ status: 'idle' });
    await savePersistedServerAuths([]);
    await loadHomeForConnection(null);
    // No server left → bring the user back into the onboarding flow to
    // connect another rather than stranding them on an empty home.
    setActiveUtilityScreen(null);
    setOnboardingActive(true);
};
