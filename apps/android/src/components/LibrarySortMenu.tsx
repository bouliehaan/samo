import { Pressable, Text, View } from 'react-native';

import { CheckGlyph } from './Glyphs';
import { MotionSheet } from './MotionSheet';
import { triggerImpact } from '../services/haptics';
import { styles } from '../theme/styles';
import { colors } from '../theme/tokens';
import { LIBRARY_SORTS, type LibrarySort } from '../types/library-tab';

export const LibrarySortMenu = ({
    activeSort,
    onClose,
    onSelect,
    visible,
}: {
    activeSort: LibrarySort;
    onClose: () => void;
    onSelect: (sort: LibrarySort) => void;
    visible: boolean;
}) => {
    return (
        <MotionSheet
            backdropStyle={styles.mediaContextBackdrop}
            onRequestClose={onClose}
            sheetStyle={styles.mediaContextSheet}
            variant="bottom"
            visible={visible}
        >
            <View style={styles.librarySortMenuHeader}>
                <Text style={styles.mediaContextEyebrow}>Sort By</Text>
            </View>
            <View style={styles.mediaContextDivider} />
            <View style={styles.mediaContextActions}>
                {LIBRARY_SORTS.map((sort, index) => {
                    const isActive = sort.id === activeSort;

                    return (
                        <Pressable
                            accessibilityRole="button"
                            android_ripple={{
                                borderless: false,
                                color: 'rgba(255, 255, 255, 0.06)',
                            }}
                            key={sort.id}
                            onPress={() => {
                                triggerImpact('light');
                                onSelect(sort.id);
                            }}
                            style={[
                                styles.mediaContextActionRow,
                                index === LIBRARY_SORTS.length - 1 &&
                                    styles.mediaContextActionRowLast,
                            ]}
                        >
                            <View style={styles.mediaContextActionIcon}>
                                {isActive ? <CheckGlyph color={colors.accent} /> : null}
                            </View>
                            <Text
                                numberOfLines={1}
                                style={[
                                    styles.mediaContextActionLabel,
                                    isActive && styles.librarySortMenuLabelActive,
                                ]}
                            >
                                {sort.label}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>
        </MotionSheet>
    );
};
