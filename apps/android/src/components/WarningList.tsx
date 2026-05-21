import { Text, View } from 'react-native';

import { styles } from '../theme/styles';

export const WarningList = ({
    errors,
    title,
}: {
    errors: Array<{ message: string }>;
    title: string;
}) => {
    if (errors.length === 0) {
        return null;
    }

    return (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>{title}</Text>
            {errors.map((error, index) => (
                <Text key={`${error.message}-${index}`} style={styles.mutedText}>
                    {error.message}
                </Text>
            ))}
        </View>
    );
};
