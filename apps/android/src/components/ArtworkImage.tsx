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
 * native app without turning browse sessions into unbounded disk-cache writes.
 * List/grid covers use memory cache only; fullscreen/current artwork can still
 * opt into disk because it is one image at a time instead of hundreds of tiles.
 */
export const ArtworkImage = ({
    fallbackStyle,
    letter,
    style,
    uri,
}: {
    fallbackStyle?: StyleProp<ViewStyle>;
    letter: string;
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
            cachePolicy="memory"
            contentFit="cover"
            onError={() => setErrored(true)}
            recyclingKey={uri}
            source={uri}
            style={style as StyleProp<ImageStyle>}
            transition={120}
        />
    );
};
