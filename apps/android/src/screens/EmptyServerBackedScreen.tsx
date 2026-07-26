import {
    Text,
    View,
} from 'react-native';

import { PAGE_TOP_INSET } from '../theme/layout';
import { styles } from '../theme/styles';

export const EmptyServerBackedScreen = ({ tabTitle }: { tabTitle: string }) => {
    return (
        // The tab scenes no longer pad their containers for the status bar —
        // this panel clears it itself, on the shared page-top line.
        <View style={[styles.section, { marginTop: PAGE_TOP_INSET }]}>
            <Text style={styles.sectionTitle}>{tabTitle}</Text>
            <Text style={styles.mutedText}>
                Connect a server to load real {tabTitle.toLowerCase()} content.
            </Text>
        </View>
    );
};
