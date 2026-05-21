import {
    Text,
    View,
} from 'react-native';

import { styles } from '../theme/styles';

export const EmptyServerBackedScreen = ({ tabTitle }: { tabTitle: string }) => {
    return (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>{tabTitle}</Text>
            <Text style={styles.mutedText}>
                Connect a server to load real {tabTitle.toLowerCase()} content.
            </Text>
        </View>
    );
};
