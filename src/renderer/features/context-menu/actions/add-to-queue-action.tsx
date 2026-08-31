import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import {
    type QueuePlayProps,
    useQueuePlay,
} from '/@/renderer/features/context-menu/actions/use-queue-play';
import { ContextMenu } from '/@/shared/components/context-menu/context-menu';
import { Play } from '/@/shared/types/types';

/**
 * Queueing lived inside the Play submenu as "next"/"last", which is not a name anyone
 * looks for — the menu had no line that said "add to queue" at all. It is its own
 * top-level entry now: clicking it queues at the end, and the submenu carries the
 * positions for anyone who wants one.
 */
export const AddToQueueAction = ({ allowShuffle = true, ...props }: QueuePlayProps) => {
    const { t } = useTranslation();
    const handlePlay = useQueuePlay(props);

    const handleAddLast = useCallback(() => {
        handlePlay(Play.LAST);
    }, [handlePlay]);

    const handleAddNext = useCallback(() => {
        handlePlay(Play.NEXT);
    }, [handlePlay]);

    const handleAddLastShuffled = useCallback(() => {
        handlePlay(Play.LAST_SHUFFLE);
    }, [handlePlay]);

    const handleAddNextShuffled = useCallback(() => {
        handlePlay(Play.NEXT_SHUFFLE);
    }, [handlePlay]);

    if (props.ids.length === 0) return null;

    return (
        <ContextMenu.Submenu>
            <ContextMenu.SubmenuTarget>
                <ContextMenu.Item leftIcon="queue" onSelect={handleAddLast} rightIcon="arrowRightS">
                    {t('player.addToQueue', { postProcess: 'sentenceCase' })}
                </ContextMenu.Item>
            </ContextMenu.SubmenuTarget>
            <ContextMenu.SubmenuContent>
                <ContextMenu.Item leftIcon="mediaPlayNext" onSelect={handleAddNext}>
                    {t('player.addNext', { postProcess: 'sentenceCase' })}
                </ContextMenu.Item>
                <ContextMenu.Item leftIcon="mediaPlayLast" onSelect={handleAddLast}>
                    {t('player.addLast', { postProcess: 'sentenceCase' })}
                </ContextMenu.Item>
                {allowShuffle ? (
                    <>
                        <ContextMenu.Divider />
                        <ContextMenu.Item leftIcon="mediaPlayNext" onSelect={handleAddNextShuffled}>
                            {t('player.addNextShuffled', { postProcess: 'sentenceCase' })}
                        </ContextMenu.Item>
                        <ContextMenu.Item leftIcon="mediaPlayLast" onSelect={handleAddLastShuffled}>
                            {t('player.addLastShuffled', { postProcess: 'sentenceCase' })}
                        </ContextMenu.Item>
                    </>
                ) : null}
            </ContextMenu.SubmenuContent>
        </ContextMenu.Submenu>
    );
};
