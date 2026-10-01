import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { generatePath, useNavigate } from 'react-router';

import styles from './home-hero-strip.module.css';

import { fetchSamoHomeHeroes, type HomeHero } from '/@/renderer/api/samo/samo-controller';
import {
    loadSamoAudiobookLibraryItem,
    loadSamoPodcastLibraryItem,
    samoPodcastEpisodeToAbsEpisode,
} from '/@/renderer/api/samo/samo-long-form';
import { ItemImage } from '/@/renderer/components/item-image/item-image';
import { ContextMenuController } from '/@/renderer/features/context-menu/context-menu-controller';
import { usePlayer } from '/@/renderer/features/player/context/player-context';
import {
    PlayTextButton,
    WideShuffleButton,
} from '/@/renderer/features/shared/components/play-button';
import { usePlayButtonClick } from '/@/renderer/features/shared/hooks/use-play-button-click';
import { AppRoute } from '/@/renderer/router/routes';
import {
    getServerById,
    recordRecentAlbum,
    recordRecentPlaylist,
    recordRecentPodcast,
    useCurrentServerId,
} from '/@/renderer/store';
import { useAudiobookActions } from '/@/renderer/store/audiobook.store';
import { usePodcastActions } from '/@/renderer/store/podcast.store';
import { Text } from '/@/shared/components/text/text';
import { toast } from '/@/shared/components/toast/toast';
import { LibraryItem } from '/@/shared/types/domain-types';
import { Play } from '/@/shared/types/types';

const readHeroHistory = (serverId: string | undefined): string[] => {
    try {
        const history: unknown = JSON.parse(
            localStorage.getItem(`home-hero-history:${serverId}`) ?? '[]',
        );
        return Array.isArray(history)
            ? history.filter((key): key is string => typeof key === 'string').slice(0, 8)
            : [];
    } catch {
        return [];
    }
};

export const HomeHeroStrip = () => {
    const serverId = useCurrentServerId();
    const server = getServerById(serverId);
    const accountKey = `${serverId}:${server?.userId ?? server?.username}`;
    const [session, setSession] = useState(() => crypto.randomUUID());
    const visit = useMemo(
        () => ({ seen: readHeroHistory(accountKey), session }),
        [accountKey, session],
    );
    useEffect(() => {
        let hiddenAt: null | number = document.hidden ? Date.now() : null;
        const onVisibility = () => {
            if (document.hidden) hiddenAt = Date.now();
            else {
                if (hiddenAt !== null && Date.now() - hiddenAt >= 30_000)
                    setSession(crypto.randomUUID());
                hiddenAt = null;
            }
        };
        document.addEventListener('visibilitychange', onVisibility);
        return () => document.removeEventListener('visibilitychange', onVisibility);
    }, []);
    const heroesQuery = useQuery({
        enabled: Boolean(serverId),
        placeholderData: (previous, query) =>
            query?.queryKey[2] === accountKey ? previous : undefined,
        queryFn: async ({ signal }) => {
            const server = getServerById(serverId);
            return server ? fetchSamoHomeHeroes(server, signal, visit) : [];
        },
        queryKey: ['home', 'heroes', accountKey, session],
        refetchInterval: 60_000,
        staleTime: 60_000,
    });
    const hero = heroesQuery.data?.[0];
    useEffect(() => {
        if (!hero) return;
        const target = `${hero.target.type}:${hero.target.id}`;
        try {
            localStorage.setItem(
                `home-hero-history:${accountKey}`,
                JSON.stringify(
                    [target, ...readHeroHistory(accountKey).filter((key) => key !== target)].slice(
                        0,
                        8,
                    ),
                ),
            );
        } catch {
            /* History is optional. */
        }
    }, [hero, accountKey]);
    return hero ? (
        <section className={styles.section}>
            <HeroCard hero={hero} />
            <button
                className={styles.anotherPick}
                disabled={heroesQuery.isFetching}
                onClick={() => setSession(crypto.randomUUID())}
                type="button"
            >
                Another pick
            </button>
        </section>
    ) : null;
};

const HeroCard = ({ hero }: { hero: HomeHero }) => {
    const navigate = useNavigate();
    const player = usePlayer();
    const serverId = useCurrentServerId();
    const { play: playPodcast } = usePodcastActions();
    const { play: playAudiobook } = useAudiobookActions();
    const { album, audiobookId, episode, playlist } = hero;

    const open = () => {
        if (playlist) {
            navigate(generatePath(AppRoute.PLAYLISTS_DETAIL_SONGS, { playlistId: playlist.id }));
        } else if (album) {
            navigate(generatePath(AppRoute.LIBRARY_ALBUMS_DETAIL, { albumId: album.id }));
        } else if (audiobookId) {
            navigate(generatePath(AppRoute.AUDIOBOOKS_DETAIL, { itemId: audiobookId }));
        } else if (episode?.podcastId) {
            navigate(generatePath(AppRoute.PODCASTS_DETAIL, { itemId: episode.podcastId }));
        }
    };

    const play = async (playType: Play) => {
        if (album) {
            recordRecentAlbum(album);
            player.addToQueueByFetch(album._serverId, [album.id], LibraryItem.ALBUM, playType);
            return;
        }
        if (audiobookId) {
            const server = getServerById(serverId);
            if (!server) return;
            try {
                const book = await loadSamoAudiobookLibraryItem(server, audiobookId);
                await playAudiobook(server, book);
            } catch (error) {
                toast.error({
                    message: error instanceof Error ? error.message : 'Could not resume this book.',
                });
            }
            return;
        }
        if (playlist) {
            recordRecentPlaylist(playlist);
            player.addToQueueByFetch(
                playlist._serverId,
                [playlist.id],
                LibraryItem.PLAYLIST,
                playType,
            );
            return;
        }
        const samoServer = getServerById(serverId);
        if (!episode?.podcastId || !samoServer) {
            return;
        }
        // The same path the podcast feed's cards take: the show, then the
        // episode inside it, so progress and the player's show context come
        // along.
        try {
            const showItem = await loadSamoPodcastLibraryItem(samoServer, episode.podcastId);
            const absEpisode = samoPodcastEpisodeToAbsEpisode(episode);
            const resolved =
                showItem.media?.episodes?.find((candidate) => candidate.id === absEpisode.id) ??
                absEpisode;
            recordRecentPodcast(showItem, samoServer.id);
            await playPodcast(samoServer, showItem, resolved);
        } catch (error) {
            toast.error({
                message: error instanceof Error ? error.message : 'Could not play this episode.',
            });
        }
    };

    // Both stop propagation themselves, so a press on Play never also opens
    // the target through the card underneath.
    const playNow = usePlayButtonClick({ onClick: () => void play(Play.NOW) });
    const shuffle = usePlayButtonClick({ onClick: () => void play(Play.SHUFFLE) });

    const openContextMenu = (event: React.MouseEvent) => {
        if (!playlist) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        ContextMenuController.call({
            cmd: {
                items: [playlist],
                type: LibraryItem.PLAYLIST,
            },
            event,
        });
    };

    return (
        <div
            className={styles.hero}
            onClick={open}
            onContextMenu={openContextMenu}
            onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    open();
                }
            }}
            role="button"
            tabIndex={0}
        >
            <div aria-hidden className={styles.backdrop}>
                {hero.sleeves.map((sleeve, index) => (
                    <ItemImage
                        alt=""
                        enableViewport={false}
                        id={sleeve.imageId}
                        imageContainerProps={{ className: styles.backdropCover }}
                        itemType={LibraryItem.SONG}
                        key={sleeve.imageId ?? sleeve.imageUrl ?? index}
                        serverId={serverId}
                        src={sleeve.imageUrl}
                        type="table"
                    />
                ))}
            </div>
            <div aria-hidden className={styles.scrim} />
            <div className={styles.copy}>
                <Text className={styles.eyebrow} size="xs">
                    {hero.eyebrow}
                </Text>
                <h2 className={styles.title}>{hero.title}</h2>
                {hero.subtitle ? (
                    <Text className={styles.subtitle} size="md">
                        {hero.subtitle}
                    </Text>
                ) : null}
                {hero.meta ? (
                    <Text isMuted size="sm">
                        {hero.meta}
                    </Text>
                ) : null}
                <div className={styles.actions}>
                    {hero.action === 'shuffle' ? (
                        <WideShuffleButton {...shuffle.handlers} {...shuffle.props} />
                    ) : (
                        <PlayTextButton {...playNow.handlers} {...playNow.props} />
                    )}
                </div>
            </div>
            {hero.sleeves.length > 0 && (
                <div aria-hidden className={styles.stack}>
                    {hero.sleeves.map((sleeve, index) => (
                        <div
                            className={styles.stackCover}
                            key={sleeve.imageId ?? sleeve.imageUrl ?? index}
                        >
                            <ItemImage
                                alt=""
                                enableViewport={false}
                                id={sleeve.imageId}
                                imageContainerProps={{ className: styles.stackImage }}
                                itemType={LibraryItem.SONG}
                                serverId={serverId}
                                src={sleeve.imageUrl}
                                type="itemCard"
                            />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
