import { Image as ExpoImage } from 'expo-image';
import { useEffect, useState } from 'react';
import {
    type ImageStyle,
    type StyleProp,
    Text,
    View,
    type ViewStyle,
} from 'react-native';

import { styles } from '../theme/styles';

/**
 * Artwork tile backed by expo-image so cover art decodes and recycles like a
 * native app. List/grid covers opt into disk cache too so returning from a
 * detail page does not have to refetch visible album art over LAN.
 */
export const ArtworkImage = ({
    fallbackStyle,
    letter,
    onLoad,
    style,
    uri,
}: {
    fallbackStyle?: StyleProp<ViewStyle>;
    letter: string;
    onLoad?: () => void;
    style: StyleProp<ImageStyle>;
    uri?: string;
}) => {
    const [errored, setErrored] = useState(false);

    useEffect(() => {
        setErrored(false);
    }, [uri]);

    if (!uri || errored) {
        return (
            <View
                style={[
                    style as StyleProp<ViewStyle>,
                    styles.artworkImageFallback,
                    fallbackStyle,
                ]}
            >
                <Text style={styles.mediaArtworkLetter}>{letter}</Text>
            </View>
        );
    }

    return (
        <ExpoImage
            allowDownscaling
            cachePolicy="memory-disk"
            contentFit="cover"
            onError={() => setErrored(true)}
            onLoad={onLoad}
            recyclingKey={uri}
            source={uri}
            style={style as StyleProp<ImageStyle>}
            transition={120}
        />
    );
};
