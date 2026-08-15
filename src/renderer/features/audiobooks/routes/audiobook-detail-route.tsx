import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';

import styles from './audiobook-detail-route.module.css';

import { useLongFormMediaServer } from '/@/renderer/api/samo/samo-long-form';
import { NativeScrollArea } from '/@/renderer/components/native-scroll-area/native-scroll-area';
import { AudiobookChapterList } from '/@/renderer/features/audiobooks/components/audiobook-chapter-list';
import { AudiobookDetailHeader } from '/@/renderer/features/audiobooks/components/audiobook-detail-header';
import { longFormQueries } from '/@/renderer/features/long-form/api/long-form-queries';
import { usePlayer } from '/@/renderer/features/player/context/player-context';
import { AnimatedPage } from '/@/renderer/features/shared/components/animated-page';
import {
    LibraryBackgroundImage,
    LibraryBackgroundOverlay,
} from '/@/renderer/features/shared/components/library-background-overlay';
import { LibraryContainer } from '/@/renderer/features/shared/components/library-container';
import { LibraryHeaderBar } from '/@/renderer/features/shared/components/library-header-bar';
import { PageErrorBoundary } from '/@/renderer/features/shared/components/page-error-boundary';
import { DetailPageSkeleton } from '/@/renderer/features/shared/components/page-skeletons/page-skeletons';
import { useFastAverageColor } from '/@/renderer/hooks';
import { useAlbumBackground } from '/@/renderer/store';
import { resolveDetailResumePosition } from '/@/renderer/store/audiobook-resume-math';
import {
    useAudiobookActions,
    useAudiobookItem,
    useAudiobookPosition,
} from '/@/renderer/store/audiobook.store';
import { Spoiler } from '/@/shared/components/spoiler/spoiler';
import { Stack } from '/@/shared/components/stack/stack';
import { Text } from '/@/shared/components/text/text';

const AUDIOBOOK_DETAIL_BG_FALLBACK = 'var(--theme-colors-foreground-muted)';

const AudiobookDetailRoute = () => {
    const { t } = useTranslation();
    const { itemId } = useParams() as { itemId: string };
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const headerRef = useRef<HTMLDivElement>(null);
    const { albumBackground, albumBackgroundBlur } = useAlbumBackground();

    const server = useLongFormMediaServer();
    const { play: playAudiobook } = useAudiobookActions();
    const { mediaSeekToTimestamp } = usePlayer();

    const detailQuery = useQuery(longFormQueries.audiobookDetail(server, itemId));
    const item = detailQuery.data;

    // The playing book and this page are only the same thing sometimes — the
    // chapter highlight and the live playhead must not leak across books.
    const playingItem = useAudiobookItem();
    const livePosition = useAudiobookPosition();
    const isActiveBook = playingItem?.id === itemId;

    const coverUrl = item?.media?.metadata?.imageUrl;
    const duration = item?.media?.duration ?? 0;

    const { background: backgroundColor } = useFastAverageColor({
        id: itemId,
        src: coverUrl,
        srcLoaded: Boolean(coverUrl),
    });

    const background = backgroundColor ?? AUDIOBOOK_DETAIL_BG_FALLBACK;

    const resumePosition = useMemo(
        () =>
            resolveDetailResumePosition({
                duration,
                isActiveBook,
                livePosition,
                serverIsFinished: item?.mediaProgress?.isFinished,
                serverPosition: item?.mediaProgress?.currentTime,
            }),
        [duration, isActiveBook, item, livePosition],
    );

    const handlePlay = useCallback(
        (startSeconds?: number) => {
            if (!server || !item) return;
            void playAudiobook(server, item, startSeconds);
        },
        [item, playAudiobook, server],
    );

    const handleChapterSelect = useCallback(
        (startSeconds: number) => {
            if (!server || !item) return;
            // Already the active book: a seek is instant and keeps the session.
            // Otherwise the start point rides along with the play request so the
            // right file is opened up front instead of loading then jumping.
            if (isActiveBook) {
                mediaSeekToTimestamp(startSeconds);
                return;
            }
            void playAudiobook(server, item, startSeconds);
        },
        [isActiveBook, item, mediaSeekToTimestamp, playAudiobook, server],
    );

    if (!server) {
        return (
            <AnimatedPage>
                <Stack className={styles.emptyState} gap="sm">
                    <Text isMuted>
                        {t('error.noServerForAudiobooks', { postProcess: 'sentenceCase' })}
                    </Text>
                </Stack>
            </AnimatedPage>
        );
    }

    if (detailQuery.isLoading) {
        return <DetailPageSkeleton />;
    }

    if (!item) {
        return (
            <AnimatedPage>
                <Stack className={styles.emptyState} gap="sm">
                    <Text isMuted>
                        {t('error.audiobookNotFound', { postProcess: 'sentenceCase' })}
                    </Text>
                </Stack>
            </AnimatedPage>
        );
    }

    const description = item.media?.metadata?.description;

    return (
        <AnimatedPage key={`audiobook-detail-${itemId}`}>
            <NativeScrollArea
                pageHeaderProps={{
                    backgroundColor: background,
                    children: (
                        <LibraryHeaderBar>
                            <LibraryHeaderBar.Title>
                                {item.media?.metadata?.title || item.name}
                            </LibraryHeaderBar.Title>
                        </LibraryHeaderBar>
                    ),
                    offset: 200,
                    target: headerRef,
                }}
                ref={scrollAreaRef}
            >
                {albumBackground ? (
                    <LibraryBackgroundImage
                        blur={albumBackgroundBlur}
                        headerRef={headerRef}
                        imageUrl={coverUrl ?? ''}
                    />
                ) : (
                    <LibraryBackgroundOverlay backgroundColor={background} headerRef={headerRef} />
                )}
                <LibraryContainer>
                    <AudiobookDetailHeader
                        coverUrl={coverUrl}
                        item={item}
                        onPlay={handlePlay}
                        ref={headerRef}
                        resumePosition={resumePosition}
                    />
                    <Stack className={styles.content} gap="xl">
                        {description ? (
                            <Spoiler
                                hideLabel={t('common.showLess', { postProcess: 'sentenceCase' })}
                                maxHeight={100}
                                showLabel={t('common.showMore', { postProcess: 'sentenceCase' })}
                            >
                                <Text isMuted>{description}</Text>
                            </Spoiler>
                        ) : null}
                        <AudiobookChapterList
                            activePosition={isActiveBook ? livePosition : undefined}
                            chapters={item.media?.chapters ?? []}
                            duration={duration}
                            onSelect={handleChapterSelect}
                        />
                    </Stack>
                </LibraryContainer>
            </NativeScrollArea>
        </AnimatedPage>
    );
};

const AudiobookDetailRouteWithBoundary = () => {
    return (
        <PageErrorBoundary>
            <AudiobookDetailRoute />
        </PageErrorBoundary>
    );
};

export default AudiobookDetailRouteWithBoundary;
