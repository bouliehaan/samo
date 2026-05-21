import { Modal, Pressable, Text, View } from 'react-native';

import { CheckGlyph } from './Glyphs';
import { triggerImpact } from '../services/haptics';
import { styles } from '../theme/styles';
import { colors } from '../theme/tokens';
import { LIBRARY_SCOPES, type LibraryScope } from '../types/library-tab';

export const LibraryScopeMenu = ({
    activeScope,
    onClose,
    onSelect,
    visible,
}: {
    activeScope: LibraryScope;
    onClose: () => void;
    onSelect: (scope: LibraryScope) => void;
    visible: boolean;
}) => {
    return (
        <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
            <Pressable onPress={onClose} style={styles.mediaContextBackdrop}>
                <Pressable
                    onPress={(event) => event.stopPropagation()}
                    style={styles.mediaContextSheet}
                >
                    <View style={styles.librarySortMenuHeader}>
                        <Text style={styles.mediaContextEyebrow}>Library</Text>
                    </View>
                    <View style={styles.mediaContextDivider} />
                    <View style={styles.mediaContextActions}>
                        {LIBRARY_SCOPES.map((scope, index) => {
                            const isActive = scope.id === activeScope;

                            return (
                                <Pressable
                                    accessibilityRole="button"
                                    android_ripple={{
                                        borderless: false,
                                        color: 'rgba(255, 255, 255, 0.06)',
                                    }}
                                    key={scope.id}
                                    onPress={() => {
                                        triggerImpact('light');
                                        onSelect(scope.id);
                                    }}
                                    style={[
                                        styles.mediaContextActionRow,
                                        index === LIBRARY_SCOPES.length - 1 &&
                                            styles.mediaContextActionRowLast,
                                    ]}
                                >
                                    <View style={styles.mediaContextActionIcon}>
                                        {isActive ? (
                                            <CheckGlyph color={colors.accent} />
                                        ) : null}
                                    </View>
                                    <Text
                                        numberOfLines={1}
                                        style={[
                                            styles.mediaContextActionLabel,
                                            isActive && styles.librarySortMenuLabelActive,
                                        ]}
                                    >
                                        {scope.label}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
};
