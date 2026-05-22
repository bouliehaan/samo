import { memo } from 'react';
import { Pressable, ScrollView, Text } from 'react-native';

import { styles } from '../theme/styles';
import { type LibraryFilter } from '../types/library-tab';

export const LibraryFilterPills = memo(({
    activeFilter,
    filters,
    onChange,
}: {
    activeFilter: LibraryFilter;
    filters: Array<{ id: LibraryFilter; label: string }>;
    onChange: (filter: LibraryFilter) => void;
}) => {
    return (
        <ScrollView
            contentContainerStyle={styles.libraryFilterPills}
            horizontal
            showsHorizontalScrollIndicator={false}
        >
            {filters.map((filter) => {
                const isActive = filter.id === activeFilter;

                return (
                    <Pressable
                        accessibilityRole="button"
                        key={filter.id}
                        onPress={() => onChange(filter.id)}
                        style={[
                            styles.libraryFilterPill,
                            isActive && styles.libraryFilterPillActive,
                        ]}
                    >
                        <Text
                            style={[
                                styles.libraryFilterPillText,
                                isActive && styles.libraryFilterPillTextActive,
                            ]}
                        >
                            {filter.label}
                        </Text>
                    </Pressable>
                );
            })}
        </ScrollView>
    );
});

LibraryFilterPills.displayName = 'LibraryFilterPills';
