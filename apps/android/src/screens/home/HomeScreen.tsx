import { memo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useVisibleHomeContentState } from '../../hooks/use-visible-home-content';
import { useVisibleRecentItems } from '../../hooks/use-visible-recent-items';
import { PAGE_TOP_INSET } from '../../theme/layout';
import { styles } from '../../theme/styles';
import { type HomeFilter, type HomeScreenProps } from '../../types/home';
import { HomeContent } from './HomeContent';

export const HomeScreen = memo(({
    onManageServers,
    onPrefetchItem,
    onSelectItem,
    onViewAll,
    serverConnection,
}: HomeScreenProps) => {
    const visibleHomeContentState = useVisibleHomeContentState();
    const visibleRecentItems = useVisibleRecentItems();

    const [homeFilter, setHomeFilter] = useState<HomeFilter>('all');

    if (!serverConnection) {
        return (
            <View style={[styles.section, styles.homeSceneRoot, { marginTop: PAGE_TOP_INSET }]}>
                <Text style={styles.sectionTitle}>Connect Your Library</Text>
                <Text style={styles.mutedText}>
                    Connect your server to load your real library.
                </Text>
                <Pressable
                    accessibilityRole="button"
                    onPress={onManageServers}
                    style={styles.primaryButton}
                >
                    <Text style={styles.primaryButtonText}>Manage Servers</Text>
                </Pressable>
            </View>
        );
    }

    return (
        <HomeContent
            activeFilter={homeFilter}
            homeContentState={visibleHomeContentState}
            onFilterChange={setHomeFilter}
            onPrefetchItem={onPrefetchItem}
            onSelectItem={onSelectItem}
            onViewAll={onViewAll}
            recentItems={visibleRecentItems}
            serverConnection={serverConnection}
        />
    );
});

HomeScreen.displayName = 'HomeScreen';
