import { Image as ExpoImage, type ImageSource } from 'expo-image';
import { useEffect, useMemo, useState } from 'react';
import {
    type ImageStyle,
    type StyleProp,
    Text,
    View,
    type ViewStyle,
} from 'react-native';

import { type MobileContentSource } from '@samo/core/mobile';
import {
    ensureSamoStreamToken,
    findServerAuthenticationForSource,
    getCachedSamoStreamToken,
    ServerType,
    type ServerAuthenticationResult,
} from '@samo/core/server';

import { useServerConnections } from '../contexts/server-connections';
import { styles } from '../theme/styles';
import { colors } from '../theme/tokens';
import { resolveSamoItemArtworkSourceForDisplay } from '../utils/samo-artwork-url';

/**
 * Artwork tile backed by expo-image so cover art decodes and recycles like a
 * native app. List/grid covers opt into disk cache too so returning from a
 * detail page does not have to refetch visible album art over LAN.
 */
export const ArtworkImage = ({
    artworkImageId,
    contentSource,
    fallbackStyle,
    letter,
    onLoad,
    serverConnections,
    source,
    style,
    uri,
}: {
    artworkImageId?: string;
    contentSource?: Pick<MobileContentSource, 'id' | 'type' | 'url'>;
    fallbackStyle?: StyleProp<ViewStyle>;
    letter: string;
    onLoad?: () => void;
    serverConnections?: ServerAuthenticationResult[];
    source?: ImageSource | string;
    style: StyleProp<ImageStyle>;
    uri?: string;
}) => {
    const [errored, setErrored] = useState(false);
    const [streamTokenRevision, setStreamTokenRevision] = useState(0);
    const contextConnections = useServerConnections();
    const resolvedConnections = serverConnections ?? contextConnections;
    const resolvedSource = useMemo((): ImageSource | string | undefined => {
        if (source) {
            return source;
        }

        if (contentSource && resolvedConnections.length > 0) {
            const fromItem = resolveSamoItemArtworkSourceForDisplay(
                { artworkImageId, artworkUrl: uri, source: contentSource },
                resolvedConnections,
            );
            if (fromItem) {
                return fromItem;
            }
        }

        return uri;
    }, [
        artworkImageId,
        contentSource,
        resolvedConnections,
        source,
        streamTokenRevision,
        uri,
    ]);
    const recyclingKey =
        typeof resolvedSource === 'string'
            ? resolvedSource
            : resolvedSource && 'uri' in resolvedSource
              ? resolvedSource.uri
              : undefined;

    useEffect(() => {
        setErrored(false);
    }, [recyclingKey]);

    useEffect(() => {
        if (!contentSource || resolvedConnections.length === 0) {
            return;
        }

        const auth = findServerAuthenticationForSource(resolvedConnections, contentSource);
        if (!auth || auth.type !== ServerType.SAMO || getCachedSamoStreamToken(auth)) {
            return;
        }

        let cancelled = false;
        void ensureSamoStreamToken(auth)
            .then(() => {
                if (!cancelled) {
                    setStreamTokenRevision((current) => current + 1);
                }
            })
            .catch(() => undefined);

        return () => {
            cancelled = true;
        };
    }, [contentSource, recyclingKey, resolvedConnections]);

    if (!resolvedSource || errored) {
        return (
            <View
                style={[
                    style as StyleProp<ViewStyle>,
                    styles.artworkImageFallback,
                    fallbackStyle,
                ]}
            >
                <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700' }}>
                    {letter}
                </Text>
            </View>
        );
    }

    return (
        <ExpoImage
            cachePolicy="memory-disk"
            contentFit="cover"
            onError={() => setErrored(true)}
            onLoad={onLoad}
            recyclingKey={recyclingKey}
            source={resolvedSource}
            style={style}
            transition={0}
        />
    );
};
