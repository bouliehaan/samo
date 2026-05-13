import {
    MobileHomeItemType,
    type MobileHomeSection,
    MobileHomeSectionId,
    MobileSearchItemType,
    type MobileSearchSection,
} from '@samo/core/mobile';
import {
    SAMO_LISTEN_SECTIONS,
    SAMO_MOBILE_TABS,
    type SamoMobileTabId,
} from '@samo/core/navigation';
import { type ServerAuthenticationResult, ServerType } from '@samo/core/server';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

import { type AndroidHomeContentState, loadAndroidHomeContent } from './src/services/home-content';
import {
    getPersistedServerAuthKey,
    loadPersistedServerAuths,
    savePersistedServerAuths,
} from './src/services/persisted-server';
import { type AndroidSearchState, loadAndroidSearchResults } from './src/services/search-content';
import { type AndroidAuthState, authenticateServer } from './src/services/server-auth';
import { colors, spacing } from './src/theme/tokens';

const SERVER_TYPES = [ServerType.NAVIDROME, ServerType.SUBSONIC, ServerType.AUDIOBOOKSHELF];

const getTabTitle = (activeTab: SamoMobileTabId) => {
    return SAMO_MOBILE_TABS.find((tab) => tab.id === activeTab)?.label ?? 'Samo';
};

const upsertServerConnection = (
    connections: ServerAuthenticationResult[],
    authentication: ServerAuthenticationResult,
) => {
    const authenticationKey = getPersistedServerAuthKey(authentication);

    return [
        ...connections.filter(
            (connection) => getPersistedServerAuthKey(connection) !== authenticationKey,
        ),
        authentication,
    ];
};

const getContentItemKey = (item: { id: string; source?: { id: string }; type: string }) => {
    return `${item.source?.id ?? 'server'}:${item.type}:${item.id}`;
};

interface ContentBackedScreenProps {
    emptyTitle: string;
    homeContentState: AndroidHomeContentState;
    sectionIds: MobileHomeSectionId[];
}

interface HomeScreenProps {
    authState: AndroidAuthState;
    canConnect: boolean;
    homeContentState: AndroidHomeContentState;
    onConnect: () => void;
    onDisconnect: (authentication: ServerAuthenticationResult) => void;
    onPasswordChange: (value: string) => void;
    onServerTypeChange: (value: ServerType) => void;
    onServerUrlChange: (value: string) => void;
    onUsernameChange: (value: string) => void;
    password: string;
    serverConnections: ServerAuthenticationResult[];
    serverType: ServerType;
    serverUrl: string;
    username: string;
}

interface SearchScreenProps {
    hasServerConnections: boolean;
    onSearch: (query: string) => void;
    searchState: AndroidSearchState;
}

export default function App() {
    const [activeTab, setActiveTab] = useState<SamoMobileTabId>('home');
    const [authState, setAuthState] = useState<AndroidAuthState>({ status: 'idle' });
    const [homeContentState, setHomeContentState] = useState<AndroidHomeContentState>({
        status: 'idle',
    });
    const [password, setPassword] = useState('');
    const [serverConnections, setServerConnections] = useState<ServerAuthenticationResult[]>([]);
    const [serverType, setServerType] = useState<ServerType>(ServerType.NAVIDROME);
    const [serverUrl, setServerUrl] = useState('');
    const [searchState, setSearchState] = useState<AndroidSearchState>({ status: 'idle' });
    const [username, setUsername] = useState('');

    const canConnect =
        serverUrl.trim().length > 0 && username.trim().length > 0 && password.length > 0;
    const title = useMemo(() => getTabTitle(activeTab), [activeTab]);

    useEffect(() => {
        let isMounted = true;

        const restoreServers = async () => {
            const persistedAuths = await loadPersistedServerAuths();

            if (!isMounted || persistedAuths.length === 0) {
                return;
            }

            setServerConnections(persistedAuths);
            setHomeContentState({ status: 'loading' });

            const nextHomeContentState = await loadAndroidHomeContent(persistedAuths);

            if (isMounted) {
                setHomeContentState(nextHomeContentState);
            }
        };

        void restoreServers();

        return () => {
            isMounted = false;
        };
    }, []);

    const handleConnect = async () => {
        if (!canConnect || authState.status === 'loading') return;

        setAuthState({ message: 'Connecting to server', status: 'loading' });
        setHomeContentState({ status: 'idle' });

        const nextAuthState = await authenticateServer({
            password,
            type: serverType,
            url: serverUrl,
            username,
        });

        setAuthState(nextAuthState);

        if (nextAuthState.status === 'connected') {
            const nextConnections = upsertServerConnection(serverConnections, nextAuthState.result);

            setServerConnections(nextConnections);
            setPassword('');
            setSearchState({ status: 'idle' });
            await savePersistedServerAuths(nextConnections);
            setHomeContentState({ status: 'loading' });
            setHomeContentState(await loadAndroidHomeContent(nextConnections));
        }
    };

    const handleDisconnect = async (authentication: ServerAuthenticationResult) => {
        const disconnectKey = getPersistedServerAuthKey(authentication);
        const nextConnections = serverConnections.filter(
            (connection) => getPersistedServerAuthKey(connection) !== disconnectKey,
        );

        setServerConnections(nextConnections);
        setSearchState({ status: 'idle' });
        setAuthState({ status: 'idle' });
        await savePersistedServerAuths(nextConnections);
        setHomeContentState(
            nextConnections.length > 0
                ? { status: 'loading' }
                : {
                      status: 'idle',
                  },
        );

        if (nextConnections.length > 0) {
            setHomeContentState(await loadAndroidHomeContent(nextConnections));
        }
    };

    const handleSearch = async (query: string) => {
        if (serverConnections.length === 0) {
            return;
        }

        const trimmedQuery = query.trim();
        if (!trimmedQuery) {
            setSearchState({ status: 'idle' });
            return;
        }

        setSearchState({ query: trimmedQuery, status: 'loading' });
        setSearchState(await loadAndroidSearchResults(serverConnections, trimmedQuery));
    };

    return (
        <View style={styles.safeArea}>
            <StatusBar style="light" />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.keyboardView}
            >
                <View style={styles.root}>
                    <ScrollView contentContainerStyle={styles.content}>
                        <Text style={styles.brand}>Samo</Text>
                        <Text style={styles.title}>{title}</Text>
                        {activeTab === 'home' ? (
                            <HomeScreen
                                authState={authState}
                                canConnect={canConnect}
                                homeContentState={homeContentState}
                                onConnect={handleConnect}
                                onDisconnect={handleDisconnect}
                                onPasswordChange={setPassword}
                                onServerTypeChange={setServerType}
                                onServerUrlChange={setServerUrl}
                                onUsernameChange={setUsername}
                                password={password}
                                serverConnections={serverConnections}
                                serverType={serverType}
                                serverUrl={serverUrl}
                                username={username}
                            />
                        ) : activeTab === 'listen' ? (
                            <ListenScreen homeContentState={homeContentState} />
                        ) : activeTab === 'playlists' ? (
                            <ContentBackedScreen
                                emptyTitle="Playlists"
                                homeContentState={homeContentState}
                                sectionIds={[MobileHomeSectionId.PLAYLISTS]}
                            />
                        ) : activeTab === 'library' ? (
                            <ContentBackedScreen
                                emptyTitle="Library"
                                homeContentState={homeContentState}
                                sectionIds={[
                                    MobileHomeSectionId.RECENTLY_ADDED,
                                    MobileHomeSectionId.AUDIOBOOKS,
                                    MobileHomeSectionId.PODCASTS,
                                ]}
                            />
                        ) : activeTab === 'search' ? (
                            <SearchScreen
                                hasServerConnections={serverConnections.length > 0}
                                onSearch={handleSearch}
                                searchState={searchState}
                            />
                        ) : (
                            <EmptyServerBackedScreen tabTitle={title} />
                        )}
                    </ScrollView>
                    <View style={styles.tabBar}>
                        {SAMO_MOBILE_TABS.map((tab) => {
                            const isActive = tab.id === activeTab;
                            return (
                                <Pressable
                                    accessibilityRole="button"
                                    key={tab.id}
                                    onPress={() => setActiveTab(tab.id)}
                                    style={[styles.tabButton, isActive && styles.tabButtonActive]}
                                >
                                    <Text
                                        style={[styles.tabLabel, isActive && styles.tabLabelActive]}
                                    >
                                        {tab.label}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
}

const HomeScreen = ({
    authState,
    canConnect,
    homeContentState,
    onConnect,
    onDisconnect,
    onPasswordChange,
    onServerTypeChange,
    onServerUrlChange,
    onUsernameChange,
    password,
    serverConnections,
    serverType,
    serverUrl,
    username,
}: HomeScreenProps) => {
    return (
        <>
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Server</Text>
                <View style={styles.segmentedControl}>
                    {SERVER_TYPES.map((type) => {
                        const isSelected = type === serverType;
                        return (
                            <Pressable
                                accessibilityRole="button"
                                key={type}
                                onPress={() => onServerTypeChange(type)}
                                style={[styles.segment, isSelected && styles.segmentActive]}
                            >
                                <Text
                                    style={[
                                        styles.segmentLabel,
                                        isSelected && styles.segmentLabelActive,
                                    ]}
                                >
                                    {type}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>
                <TextInput
                    autoCapitalize="none"
                    inputMode="url"
                    onChangeText={onServerUrlChange}
                    placeholder="Server URL"
                    placeholderTextColor={colors.muted}
                    style={styles.input}
                    value={serverUrl}
                />
                <TextInput
                    autoCapitalize="none"
                    onChangeText={onUsernameChange}
                    placeholder="Username"
                    placeholderTextColor={colors.muted}
                    style={styles.input}
                    value={username}
                />
                <TextInput
                    onChangeText={onPasswordChange}
                    placeholder="Password"
                    placeholderTextColor={colors.muted}
                    secureTextEntry
                    style={styles.input}
                    value={password}
                />
                <Pressable
                    accessibilityRole="button"
                    disabled={!canConnect || authState.status === 'loading'}
                    onPress={onConnect}
                    style={[
                        styles.primaryButton,
                        (!canConnect || authState.status === 'loading') && styles.disabledButton,
                    ]}
                >
                    {authState.status === 'loading' ? (
                        <ActivityIndicator color={colors.background} />
                    ) : (
                        <Text style={styles.primaryButtonText}>Connect</Text>
                    )}
                </Pressable>
                <AuthStatus
                    authState={authState}
                    onDisconnect={onDisconnect}
                    serverConnections={serverConnections}
                />
            </View>
            <HomeContentStatus homeContentState={homeContentState} />
        </>
    );
};

const AuthStatus = ({
    authState,
    onDisconnect,
    serverConnections,
}: {
    authState: AndroidAuthState;
    onDisconnect: (authentication: ServerAuthenticationResult) => void;
    serverConnections: ServerAuthenticationResult[];
}) => {
    const hasMessage = authState.status === 'error' || authState.status === 'loading';

    if (serverConnections.length === 0) {
        return (
            <>
                {hasMessage ? (
                    <Text
                        style={authState.status === 'error' ? styles.errorText : styles.mutedText}
                    >
                        {authState.message}
                    </Text>
                ) : null}
                <Text style={styles.mutedText}>No server connected.</Text>
            </>
        );
    }

    return (
        <>
            {hasMessage ? (
                <Text style={authState.status === 'error' ? styles.errorText : styles.mutedText}>
                    {authState.message}
                </Text>
            ) : null}
            <View style={styles.connectedServers}>
                {serverConnections.map((connection) => (
                    <View key={getPersistedServerAuthKey(connection)} style={styles.statusPanel}>
                        <Text style={styles.statusTitle}>{connection.title}</Text>
                        <Text style={styles.mutedText}>{connection.details}</Text>
                        <Pressable
                            accessibilityRole="button"
                            onPress={() => onDisconnect(connection)}
                            style={styles.secondaryButton}
                        >
                            <Text style={styles.secondaryButtonText}>Disconnect</Text>
                        </Pressable>
                    </View>
                ))}
            </View>
        </>
    );
};

const SearchScreen = ({ hasServerConnections, onSearch, searchState }: SearchScreenProps) => {
    const [query, setQuery] = useState(searchState.status === 'loaded' ? searchState.query : '');

    if (!hasServerConnections) {
        return <EmptyServerBackedScreen tabTitle="Search" />;
    }

    return (
        <>
            <View style={styles.section}>
                <TextInput
                    autoCapitalize="none"
                    onChangeText={setQuery}
                    onSubmitEditing={() => onSearch(query)}
                    placeholder="Search music, audiobooks, podcasts, and radio"
                    placeholderTextColor={colors.muted}
                    returnKeyType="search"
                    style={styles.input}
                    value={query}
                />
                <Pressable
                    accessibilityRole="button"
                    disabled={!query.trim() || searchState.status === 'loading'}
                    onPress={() => onSearch(query)}
                    style={[
                        styles.primaryButton,
                        (!query.trim() || searchState.status === 'loading') &&
                            styles.disabledButton,
                    ]}
                >
                    {searchState.status === 'loading' ? (
                        <ActivityIndicator color={colors.background} />
                    ) : (
                        <Text style={styles.primaryButtonText}>Search</Text>
                    )}
                </Pressable>
            </View>
            <SearchResults searchState={searchState} />
        </>
    );
};

const SearchResults = ({ searchState }: { searchState: AndroidSearchState }) => {
    if (searchState.status === 'idle' || searchState.status === 'loading') {
        return null;
    }

    if (searchState.status === 'error') {
        return (
            <View style={styles.section}>
                <Text style={styles.errorText}>{searchState.message}</Text>
            </View>
        );
    }

    if (searchState.results.sections.length === 0) {
        return (
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>No Results</Text>
                <Text style={styles.mutedText}>
                    No server-backed results for {searchState.query}.
                </Text>
            </View>
        );
    }

    return <SearchSections sections={searchState.results.sections} />;
};

const SearchSections = ({ sections }: { sections: MobileSearchSection[] }) => {
    return (
        <>
            {sections.map((section) => (
                <View key={section.id} style={styles.homeSection}>
                    <Text style={styles.sectionTitle}>{section.title}</Text>
                    {section.items.map((item) => (
                        <View key={getContentItemKey(item)} style={styles.searchRow}>
                            {item.artworkUrl ? (
                                <Image
                                    source={{ uri: item.artworkUrl }}
                                    style={[
                                        styles.searchArtwork,
                                        (item.type === MobileSearchItemType.ARTIST ||
                                            item.type === MobileSearchItemType.RADIO) &&
                                            styles.searchArtworkRound,
                                    ]}
                                />
                            ) : (
                                <View
                                    style={[
                                        styles.searchArtworkFallback,
                                        (item.type === MobileSearchItemType.ARTIST ||
                                            item.type === MobileSearchItemType.RADIO) &&
                                            styles.searchArtworkRound,
                                    ]}
                                >
                                    <Text style={styles.searchArtworkLetter}>
                                        {item.title.slice(0, 1)}
                                    </Text>
                                </View>
                            )}
                            <View style={styles.searchRowText}>
                                <Text numberOfLines={1} style={styles.searchTitle}>
                                    {item.title}
                                </Text>
                                <Text numberOfLines={1} style={styles.mediaSubtitle}>
                                    {[item.type, item.subtitle, item.source?.title]
                                        .filter(Boolean)
                                        .join(' - ')}
                                </Text>
                            </View>
                        </View>
                    ))}
                </View>
            ))}
        </>
    );
};

const HomeContentStatus = ({ homeContentState }: { homeContentState: AndroidHomeContentState }) => {
    if (homeContentState.status === 'idle') {
        return null;
    }

    if (homeContentState.status === 'loading') {
        return (
            <View style={styles.section}>
                <ActivityIndicator color={colors.accent} />
            </View>
        );
    }

    if (homeContentState.status === 'error') {
        return (
            <View style={styles.section}>
                <Text style={styles.errorText}>{homeContentState.message}</Text>
            </View>
        );
    }

    if (homeContentState.content.sections.length === 0) {
        return (
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Home</Text>
                <Text style={styles.mutedText}>No server-backed Home content returned.</Text>
            </View>
        );
    }

    return (
        <>
            <ContentSections sections={homeContentState.content.sections} />
            {homeContentState.content.errors.length > 0 ? (
                <View style={styles.section}>
                    <Text style={styles.mutedText}>Some server sections could not be loaded.</Text>
                </View>
            ) : null}
        </>
    );
};

const getSectionsById = (
    homeContentState: AndroidHomeContentState,
    sectionIds: MobileHomeSectionId[],
) => {
    if (homeContentState.status !== 'loaded') {
        return [];
    }

    return sectionIds.flatMap((sectionId) => {
        const section = homeContentState.content.sections.find(
            (candidate) => candidate.id === sectionId,
        );
        return section ? [section] : [];
    });
};

const ContentBackedScreen = ({
    emptyTitle,
    homeContentState,
    sectionIds,
}: ContentBackedScreenProps) => {
    if (homeContentState.status === 'idle') {
        return <EmptyServerBackedScreen tabTitle={emptyTitle} />;
    }

    if (homeContentState.status === 'loading') {
        return (
            <View style={styles.section}>
                <ActivityIndicator color={colors.accent} />
            </View>
        );
    }

    if (homeContentState.status === 'error') {
        return (
            <View style={styles.section}>
                <Text style={styles.errorText}>{homeContentState.message}</Text>
            </View>
        );
    }

    const sections = getSectionsById(homeContentState, sectionIds);

    if (sections.length === 0) {
        return (
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>{emptyTitle}</Text>
                <Text style={styles.mutedText}>No server-backed content returned.</Text>
            </View>
        );
    }

    return <ContentSections sections={sections} />;
};

const ContentSections = ({ sections }: { sections: MobileHomeSection[] }) => {
    return (
        <>
            {sections.map((section) => (
                <View key={section.id} style={styles.homeSection}>
                    <Text style={styles.sectionTitle}>{section.title}</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {section.items.map((item) => (
                            <View key={getContentItemKey(item)} style={styles.mediaTile}>
                                {item.artworkUrl ? (
                                    <Image
                                        source={{ uri: item.artworkUrl }}
                                        style={[
                                            styles.mediaArtwork,
                                            item.type === MobileHomeItemType.RADIO &&
                                                styles.mediaArtworkRadio,
                                        ]}
                                    />
                                ) : (
                                    <View
                                        style={[
                                            styles.mediaArtworkFallback,
                                            item.type === MobileHomeItemType.RADIO &&
                                                styles.mediaArtworkRadio,
                                        ]}
                                    >
                                        <Text style={styles.mediaArtworkLetter}>
                                            {item.title.slice(0, 1)}
                                        </Text>
                                    </View>
                                )}
                                <Text numberOfLines={2} style={styles.mediaTitle}>
                                    {item.title}
                                </Text>
                                {item.subtitle ? (
                                    <Text numberOfLines={1} style={styles.mediaSubtitle}>
                                        {item.subtitle}
                                    </Text>
                                ) : null}
                            </View>
                        ))}
                    </ScrollView>
                </View>
            ))}
        </>
    );
};

const ListenScreen = ({ homeContentState }: { homeContentState: AndroidHomeContentState }) => {
    const listenSectionIds = SAMO_LISTEN_SECTIONS.map((section) => {
        if (section.id === 'audiobooks') {
            return MobileHomeSectionId.AUDIOBOOKS;
        }

        if (section.id === 'podcasts') {
            return MobileHomeSectionId.PODCASTS;
        }

        return MobileHomeSectionId.RADIO;
    });

    return (
        <ContentBackedScreen
            emptyTitle="Listen"
            homeContentState={homeContentState}
            sectionIds={listenSectionIds}
        />
    );
};

const EmptyServerBackedScreen = ({ tabTitle }: { tabTitle: string }) => {
    return (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>{tabTitle}</Text>
            <Text style={styles.mutedText}>
                Connect a server to load real {tabTitle.toLowerCase()} content.
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    brand: {
        color: colors.accent,
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: 0,
        marginBottom: spacing.xs,
    },
    connectedServers: {
        gap: spacing.sm,
        marginTop: spacing.md,
    },
    content: {
        padding: spacing.lg,
        paddingBottom: 112,
    },
    disabledButton: {
        opacity: 0.45,
    },
    errorText: {
        color: '#ffb1a3',
        fontSize: 14,
        marginTop: spacing.sm,
    },
    homeSection: {
        marginTop: spacing.xl,
    },
    input: {
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderRadius: 8,
        borderWidth: 1,
        color: colors.text,
        fontSize: 16,
        marginTop: spacing.sm,
        paddingHorizontal: spacing.md,
        paddingVertical: 13,
    },
    keyboardView: {
        flex: 1,
    },
    mediaArtwork: {
        aspectRatio: 1,
        backgroundColor: colors.surface,
        borderRadius: 8,
        height: 112,
        marginBottom: spacing.sm,
        width: 112,
    },
    mediaArtworkFallback: {
        alignItems: 'center',
        aspectRatio: 1,
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderRadius: 8,
        borderWidth: 1,
        height: 112,
        justifyContent: 'center',
        marginBottom: spacing.sm,
        width: 112,
    },
    mediaArtworkLetter: {
        color: colors.accent,
        fontSize: 30,
        fontWeight: '900',
    },
    mediaArtworkRadio: {
        borderRadius: 56,
    },
    mediaSubtitle: {
        color: colors.muted,
        fontSize: 12,
        lineHeight: 16,
    },
    mediaTile: {
        marginRight: spacing.md,
        width: 112,
    },
    mediaTitle: {
        color: colors.text,
        fontSize: 13,
        fontWeight: '800',
        lineHeight: 17,
        marginBottom: 2,
    },
    mutedText: {
        color: colors.muted,
        fontSize: 14,
        lineHeight: 20,
    },
    primaryButton: {
        alignItems: 'center',
        backgroundColor: colors.accent,
        borderRadius: 8,
        height: 48,
        justifyContent: 'center',
        marginTop: spacing.md,
    },
    primaryButtonText: {
        color: colors.background,
        fontSize: 16,
        fontWeight: '800',
    },
    root: {
        backgroundColor: colors.background,
        flex: 1,
    },
    row: {
        borderColor: colors.border,
        borderTopWidth: 1,
        paddingVertical: spacing.md,
    },
    rowTitle: {
        color: colors.text,
        fontSize: 17,
        fontWeight: '700',
        marginBottom: 4,
    },
    safeArea: {
        backgroundColor: colors.background,
        flex: 1,
        paddingTop: Platform.OS === 'android' ? 24 : 0,
    },
    searchArtwork: {
        backgroundColor: colors.surface,
        borderRadius: 8,
        height: 52,
        width: 52,
    },
    searchArtworkFallback: {
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderRadius: 8,
        borderWidth: 1,
        height: 52,
        justifyContent: 'center',
        width: 52,
    },
    searchArtworkLetter: {
        color: colors.accent,
        fontSize: 20,
        fontWeight: '900',
    },
    searchArtworkRound: {
        borderRadius: 26,
    },
    searchRow: {
        alignItems: 'center',
        borderColor: colors.border,
        borderTopWidth: 1,
        flexDirection: 'row',
        gap: spacing.sm,
        paddingVertical: spacing.sm,
    },
    searchRowText: {
        flex: 1,
    },
    searchTitle: {
        color: colors.text,
        fontSize: 15,
        fontWeight: '800',
        marginBottom: 2,
    },
    secondaryButton: {
        alignItems: 'center',
        borderColor: colors.border,
        borderRadius: 8,
        borderWidth: 1,
        height: 40,
        justifyContent: 'center',
        marginTop: spacing.md,
    },
    secondaryButtonText: {
        color: colors.text,
        fontSize: 14,
        fontWeight: '800',
    },
    section: {
        backgroundColor: colors.panel,
        borderColor: colors.border,
        borderRadius: 8,
        borderWidth: 1,
        marginTop: spacing.lg,
        padding: spacing.md,
    },
    sectionTitle: {
        color: colors.text,
        fontSize: 20,
        fontWeight: '800',
        marginBottom: spacing.sm,
    },
    segment: {
        alignItems: 'center',
        borderRadius: 7,
        flex: 1,
        justifyContent: 'center',
        minHeight: 38,
        paddingHorizontal: spacing.xs,
    },
    segmentActive: {
        backgroundColor: colors.accentSoft,
    },
    segmentedControl: {
        backgroundColor: colors.background,
        borderColor: colors.border,
        borderRadius: 8,
        borderWidth: 1,
        flexDirection: 'row',
        gap: 4,
        padding: 4,
    },
    segmentLabel: {
        color: colors.muted,
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'capitalize',
    },
    segmentLabelActive: {
        color: colors.accent,
    },
    statusPanel: {
        backgroundColor: colors.accentSoft,
        borderColor: 'rgba(214, 178, 94, 0.26)',
        borderRadius: 8,
        borderWidth: 1,
        padding: spacing.md,
    },
    statusTitle: {
        color: colors.text,
        fontSize: 16,
        fontWeight: '800',
        marginBottom: 4,
    },
    tabBar: {
        backgroundColor: '#120f0a',
        borderColor: colors.border,
        borderTopWidth: 1,
        bottom: 0,
        flexDirection: 'row',
        gap: 4,
        left: 0,
        paddingBottom: 10,
        paddingHorizontal: spacing.xs,
        paddingTop: spacing.xs,
        position: 'absolute',
        right: 0,
    },
    tabButton: {
        alignItems: 'center',
        borderRadius: 8,
        flex: 1,
        justifyContent: 'center',
        minHeight: 48,
        paddingHorizontal: 2,
    },
    tabButtonActive: {
        backgroundColor: colors.surface,
    },
    tabLabel: {
        color: colors.muted,
        fontSize: 11,
        fontWeight: '700',
    },
    tabLabelActive: {
        color: colors.accent,
    },
    title: {
        color: colors.text,
        fontSize: 34,
        fontWeight: '900',
        letterSpacing: 0,
    },
});
