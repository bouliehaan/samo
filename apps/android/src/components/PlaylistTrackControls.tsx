import { Pressable, Text, View } from 'react-native';

import { styles } from '../theme/styles';
import { type PlaylistTrackFilter, type PlaylistTrackSort } from '../utils/media-detail';

export const PlaylistTrackControls = ({
    filter,
    onFilterChange,
    onSortChange,
    onToggleSortDirection,
    showHiFiFilter,
    sort,
    sortAsc,
}: {
    filter: PlaylistTrackFilter;
    onFilterChange: (next: PlaylistTrackFilter) => void;
    onSortChange: (next: PlaylistTrackSort) => void;
    onToggleSortDirection: () => void;
    showHiFiFilter: boolean;
    sort: PlaylistTrackSort;
    sortAsc: boolean;
}) => {
    const filters: Array<{ id: PlaylistTrackFilter; label: string }> = [
        { id: 'all', label: 'All' },
        ...(showHiFiFilter ? [{ id: 'hifi' as const, label: 'Hi-Fi' }] : []),
    ];
    const sorts: Array<{ id: PlaylistTrackSort; label: string }> = [
        { id: 'order', label: 'Order Added' },
        { id: 'title', label: 'Title' },
        { id: 'artist', label: 'Artist' },
    ];
    return (
        <View style={styles.playlistControlsBlock}>
            {filters.length > 1 ? (
                <View style={styles.playlistControlGroup}>
                    <Text style={styles.playlistControlLabel}>Filter</Text>
                    <View style={styles.playlistControlPillRow}>
                        {filters.map(({ id, label }) => {
                            const isActive = filter === id;
                            return (
                                <Pressable
                                    key={id}
                                    onPress={() => onFilterChange(id)}
                                    style={[
                                        styles.playlistControlPill,
                                        isActive && styles.playlistControlPillActive,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.playlistControlPillText,
                                            isActive && styles.playlistControlPillTextActive,
                                        ]}
                                    >
                                        {label}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>
                </View>
            ) : null}
            <View style={styles.playlistControlGroup}>
                <Text style={styles.playlistControlLabel}>Sort</Text>
                <View style={styles.playlistControlPillRow}>
                    {sorts.map(({ id, label }) => {
                        const isActive = sort === id;
                        return (
                            <Pressable
                                key={id}
                                onPress={() => onSortChange(id)}
                                style={[
                                    styles.playlistControlPill,
                                    isActive && styles.playlistControlPillActive,
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.playlistControlPillText,
                                        isActive && styles.playlistControlPillTextActive,
                                    ]}
                                >
                                    {label}
                                </Text>
                            </Pressable>
                        );
                    })}
                    <Pressable
                        accessibilityLabel={
                            sortAsc ? 'Sort ascending — tap to descend' : 'Sort descending — tap to ascend'
                        }
                        onPress={onToggleSortDirection}
                        style={[
                            styles.playlistControlPill,
                            styles.playlistControlDirectionPill,
                        ]}
                    >
                        <Text style={styles.playlistControlPillText}>{sortAsc ? '↑' : '↓'}</Text>
                    </Pressable>
                </View>
            </View>
        </View>
    );
};
