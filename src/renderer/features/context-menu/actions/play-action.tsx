import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import {
    type QueuePlayProps,
    useQueuePlay,
} from '/@/renderer/features/context-menu/actions/use-queue-play';
import { usePlayButtonBehavior } from '/@/renderer/store';
import { ContextMenu } from '/@/shared/components/context-menu/context-menu';
import { Play } from '/@/shared/types/types';

/** Starting playback now. Queueing for later is {@link AddToQueueAction}. */
export const PlayAction = ({ allowShuffle = true, ...props }: QueuePlayProps) => {
    const { t } = useTranslation();
    const handlePlay = useQueuePlay(props);
    const playButtonBehavior = usePlayButtonBehavior();

    const handlePlayNow = useCallback(() => {
        handlePlay(Play.NOW);
    }, [handlePlay]);

    const handlePlayShuffled = useCallback(() => {
        handlePlay(Play.SHUFFLE);
    }, [handlePlay]);

    const defaultPlayAction = useCallback(() => {
        handlePlay(playButtonBehavior);
    }, [handlePlay, playButtonBehavior]);

    if (props.ids.length === 0) return null;

    return (
        <ContextMenu.Submenu>
            <ContextMenu.SubmenuTarget>
                <ContextMenu.Item
                    leftIcon="mediaPlay"
                    onSelect={defaultPlayAction}
                    rightIcon="arrowRightS"
                >
                    {t('player.play', { postProcess: 'sentenceCase' })}
                </ContextMenu.Item>
            </ContextMenu.SubmenuTarget>
            <ContextMenu.SubmenuContent>
                <ContextMenu.Item leftIcon="mediaPlay" onSelect={handlePlayNow}>
                    {t('player.play', { postProcess: 'sentenceCase' })}
                </ContextMenu.Item>
                {allowShuffle ? (
                    <ContextMenu.Item leftIcon="mediaShuffle" onSelect={handlePlayShuffled}>
                        {t('player.shuffle', { postProcess: 'sentenceCase' })}
                    </ContextMenu.Item>
                ) : null}
            </ContextMenu.SubmenuContent>
        </ContextMenu.Submenu>
    );
};
