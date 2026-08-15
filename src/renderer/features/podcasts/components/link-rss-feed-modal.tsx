import { closeAllModals, openModal } from '@mantine/modals';
import { attachSamoPodcastShowFeed } from '@samo/core/server';
import { QueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { samoFetch } from '/@/renderer/api/samo/samo-fetch';
import { longFormKeys } from '/@/renderer/features/long-form/api/long-form-queries';
import { Button } from '/@/shared/components/button/button';
import { Group } from '/@/shared/components/group/group';
import { Stack } from '/@/shared/components/stack/stack';
import { TextInput } from '/@/shared/components/text-input/text-input';
import { Text } from '/@/shared/components/text/text';
import { toast } from '/@/shared/components/toast/toast';
import { ServerListItemWithCredential } from '/@/shared/types/domain-types';

interface LinkRssFeedFormProps {
    queryClient: QueryClient;
    server: ServerListItemWithCredential;
    showId: string;
}

const LinkRssFeedForm = ({ queryClient, server, showId }: LinkRssFeedFormProps) => {
    const { t } = useTranslation();
    const [feedUrl, setFeedUrl] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        const url = feedUrl.trim();
        if (!url) return;

        setIsSubmitting(true);
        try {
            await attachSamoPodcastShowFeed(samoFetch, server, showId, { url });
            toast.success({
                message: t('action.rssFeedLinked'),
            });
            await queryClient.invalidateQueries({
                queryKey: longFormKeys.podcastDetail(server.id, showId),
            });
            closeAllModals();
        } catch (error) {
            toast.error({
                message:
                    error instanceof Error
                        ? error.message
                        : t('error.rssFeedLinkFailed', { postProcess: 'sentenceCase' }),
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Stack gap="md">
            <Text isMuted size="sm">
                {t('action.rssFeedHelp', { postProcess: 'sentenceCase' })}
            </Text>
            <TextInput
                onChange={(event) => setFeedUrl(event.currentTarget.value)}
                placeholder="https://feeds.example.com/podcast.xml"
                value={feedUrl}
            />
            <Group gap="sm" justify="flex-end">
                <Button onClick={() => closeAllModals()} variant="subtle">
                    {t('common.cancel', { postProcess: 'sentenceCase' })}
                </Button>
                <Button
                    disabled={!feedUrl.trim() || isSubmitting}
                    loading={isSubmitting}
                    onClick={() => void handleSubmit()}
                    variant="filled"
                >
                    {t('action.linkRssFeed', { postProcess: 'sentenceCase' })}
                </Button>
            </Group>
        </Stack>
    );
};

/**
 * Linking an RSS feed is a rare, corrective action on a show whose dates are
 * wrong — it used to sit as a permanent form on every podcast page, which is
 * clutter on the ~99% of visits that are just "play an episode". It now lives
 * behind the show's context menu.
 */
export const openLinkRssFeedModal = (args: {
    queryClient: QueryClient;
    server: ServerListItemWithCredential;
    showId: string;
    title: string;
}) => {
    openModal({
        children: (
            <LinkRssFeedForm
                queryClient={args.queryClient}
                server={args.server}
                showId={args.showId}
            />
        ),
        title: args.title,
    });
};
