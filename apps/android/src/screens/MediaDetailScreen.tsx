import {
    type MobileMediaDetail,
    MobileMediaDetailType,
    type MobileMediaTrack,
} from '@samo/core/mobile';
import { type ServerAuthenticationResult } from '@samo/core/server';
import { memo, useRef } from 'react';
import { Text, View } from 'react-native';

import {
    type AndroidMediaDetailState,
    buildMediaDetailShell,
} from '../services/media-detail';
import { type AndroidRecentContentSourceItem } from '../services/recent-content';
import { styles } from '../theme/styles';
import { MediaDetailLoaded } from './MediaDetailLoaded';
import { MediaDetailLoadingView } from './MediaDetailLoadingView';

export const MediaDetailContent = memo(({
    mediaDetailKey,
    mediaDetailState,
    onBack,
    onPlayTrack,
    onReloadDetail,
    onSelectItem,
    onShufflePlay,
    serverConnection,
}: {
    mediaDetailKey: string | null;
    mediaDetailState: AndroidMediaDetailState;
    onBack: () => void;
    onPlayTrack: (
        detail: MobileMediaDetail,
        track: MobileMediaTrack,
        index: number,
        queueTracks?: MobileMediaTrack[],
    ) => void;
    onReloadDetail?: () => Promise<void>;
    onSelectItem: (item: AndroidRecentContentSourceItem) => void;
    onShufflePlay: (detail: MobileMediaDetail, tracks?: MobileMediaTrack[]) => void;
    serverConnection: ServerAuthenticationResult | null;
}) => {
    const openingArtworkUrlRef = useRef<string | undefined>(undefined);
    // The cover the skeleton showed (the tapped item's art). Carried into the
    // loaded hero so it resolves to the SAME canonical artwork key and reuses the
    // warm cache entry instead of re-fetching detail.artworkUrl — that re-fetch is
    // the "cached art deloads then reloads" flash on the skeleton→content swap.
    const openingArtworkImageIdRef = useRef<string | undefined>(undefined);
    const activeDetailKeyRef = useRef<string | null>(null);

    if (mediaDetailKey !== activeDetailKeyRef.current) {
        activeDetailKeyRef.current = mediaDetailKey;
        openingArtworkUrlRef.current = undefined;
        openingArtworkImageIdRef.current = undefined;
    }
    const title =
        mediaDetailState.status === 'loaded'
            ? mediaDetailState.detail.title
            : mediaDetailState.status === 'idle'
              ? 'Media'
              : mediaDetailState.itemTitle;

    if (mediaDetailState.status === 'loading') {
        openingArtworkUrlRef.current = mediaDetailState.itemArtworkUrl;
        openingArtworkImageIdRef.current = mediaDetailState.itemArtworkImageId;
    }

    // While loading, build a shell detail so MediaDetailLoaded can render its REAL
    // list + hero in a loading state. Rendering the SAME component (and therefore
    // the SAME hero ExpoImage) across loading→loaded is what makes the cover
    // PERSIST instead of unmounting and re-decoding — the skeleton→detail flash.
    // Artists fall back to the standalone skeleton: their detail is a different
    // ScrollView layout with its own section skeletons, not this track list.
    const shellDetail =
        mediaDetailState.status === 'loading' ? buildMediaDetailShell(mediaDetailState) : null;
    const unifiedDetail =
        mediaDetailState.status === 'loaded'
            ? mediaDetailState.detail
            : shellDetail && shellDetail.type !== MobileMediaDetailType.ARTIST
              ? shellDetail
              : null;

    return (
        <>
            {unifiedDetail ? (
                <MediaDetailLoaded
                    detail={unifiedDetail}
                    entranceKey={mediaDetailKey}
                    fallbackArtworkImageId={openingArtworkImageIdRef.current}
                    fallbackArtworkUrl={openingArtworkUrlRef.current}
                    isAwaitingDetail={mediaDetailState.status !== 'loaded'}
                    onBack={onBack}
                    onPlayTrack={onPlayTrack}
                    onReloadDetail={onReloadDetail}
                    onSelectItem={onSelectItem}
                    onShufflePlay={onShufflePlay}
                    serverConnection={serverConnection}
                />
            ) : mediaDetailState.status === 'loading' ? (
                <MediaDetailLoadingView
                    artworkImageId={mediaDetailState.itemArtworkImageId}
                    artworkUrl={mediaDetailState.itemArtworkUrl}
                    contentSource={mediaDetailState.itemSource}
                    itemType={mediaDetailState.itemType}
                    serverConnection={serverConnection}
                    title={title}
                />
            ) : mediaDetailState.status === 'error' ? (
                <View style={[styles.mediaDetailScreen, styles.content]}>
                    <Text style={styles.sectionTitle}>{title}</Text>
                    <Text style={styles.errorText}>{mediaDetailState.message}</Text>
                </View>
            ) : null}
        </>
    );
});

MediaDetailContent.displayName = 'MediaDetailContent';
