import { ActivityIndicator, Pressable, TextInput, View } from 'react-native';

import { ClearGlyph, SearchGlyph } from './Glyphs';
import { styles } from '../theme/styles';
import { colors } from '../theme/tokens';

export const InlineSearchBar = ({
    elevated,
    isLoading,
    onChange,
    onClear,
    onSubmit,
    placeholder,
    showSubmitButton,
    textTone = 'light',
    value,
}: {
    elevated?: boolean;
    isLoading?: boolean;
    onChange: (value: string) => void;
    onClear: () => void;
    onSubmit?: () => void;
    placeholder: string;
    showSubmitButton?: boolean;
    textTone?: 'dark' | 'light';
    value: string;
}) => {
    const isDarkTone = textTone === 'dark' && !elevated;
    const iconColor = isDarkTone ? '#111111' : colors.muted;
    const textColor = isDarkTone ? '#111111' : colors.text;
    const canSubmit = Boolean(showSubmitButton && onSubmit && value.trim() && !isLoading);

    return (
        <View style={[styles.inlineSearchBar, elevated && styles.inlineSearchBarElevated]}>
            <SearchGlyph color={iconColor} />
            <TextInput
                autoCapitalize="none"
                onChangeText={onChange}
                onSubmitEditing={onSubmit}
                placeholder={placeholder}
                placeholderTextColor={isDarkTone ? '#5f5f5f' : 'rgba(255,255,255,0.4)'}
                returnKeyType={onSubmit ? 'search' : 'default'}
                style={[styles.inlineSearchInput, isDarkTone && styles.inlineSearchInputDark]}
                value={value}
            />
            {isLoading ? (
                <ActivityIndicator color={colors.accent} size="small" />
            ) : value.length > 0 ? (
                <Pressable
                    accessibilityLabel="Clear search"
                    accessibilityRole="button"
                    onPress={onClear}
                    style={styles.inlineSearchIconButton}
                >
                    <ClearGlyph color={textColor} />
                </Pressable>
            ) : null}
            {canSubmit ? (
                <Pressable
                    accessibilityLabel="Search"
                    accessibilityRole="button"
                    onPress={onSubmit}
                    style={styles.inlineSearchSubmit}
                >
                    <SearchGlyph color={colors.background} />
                </Pressable>
            ) : null}
        </View>
    );
};
