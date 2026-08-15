import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { LongFormMediaKind } from './long-form-card';
import { LongFormGrid, LongFormGridDescriptor, useFilteredLongFormItems } from './long-form-grid';
import styles from './long-form-library-page.module.css';

import { AnimatedPage } from '/@/renderer/features/shared/components/animated-page';
import { GridPageSkeleton } from '/@/renderer/features/shared/components/page-skeletons/page-skeletons';
import { LongFormLibraryItem } from '/@/shared/api/long-form-types';
import { TextInput } from '/@/shared/components/text-input/text-input';
import { TextTitle } from '/@/shared/components/text-title/text-title';
import { Text } from '/@/shared/components/text/text';
import { ServerListItemWithCredential } from '/@/shared/types/domain-types';

interface LongFormLibraryPageProps {
    describe: (item: LongFormLibraryItem) => LongFormGridDescriptor;
    emptyLabel: string;
    isLoading: boolean;
    items: LongFormLibraryItem[];
    kind: LongFormMediaKind;
    noServerLabel: string;
    onOpen: (item: LongFormLibraryItem) => void;
    searchPlaceholder: string;
    server: null | ServerListItemWithCredential | undefined;
    title: string;
    toSearchText: (item: LongFormLibraryItem) => string;
}

/**
 * Page shell shared by the Audiobooks and Podcasts library routes. Those two
 * routes were near-identical copies of each other — same cover component, same
 * card, same filter, same layout, duplicated in full — so a fix or a polish
 * pass had to be made twice and, in practice, drifted.
 */
export const LongFormLibraryPage = ({
    describe,
    emptyLabel,
    isLoading,
    items,
    kind,
    noServerLabel,
    onOpen,
    searchPlaceholder,
    server,
    title,
    toSearchText,
}: LongFormLibraryPageProps) => {
    const { t } = useTranslation();
    const [searchQuery, setSearchQuery] = useState('');
    const filteredItems = useFilteredLongFormItems(items, searchQuery, toSearchText);

    const renderBody = () => {
        if (!server) {
            return <Text isMuted>{noServerLabel}</Text>;
        }

        if (isLoading) {
            return <GridPageSkeleton />;
        }

        if (!items.length) {
            return <Text isMuted>{emptyLabel}</Text>;
        }

        return (
            <>
                <TextInput
                    aria-label={searchPlaceholder}
                    onChange={(event) => setSearchQuery(event.currentTarget.value)}
                    placeholder={searchPlaceholder}
                    value={searchQuery}
                />
                {!filteredItems.length ? (
                    <Text isMuted>{t('common.noResults', { postProcess: 'sentenceCase' })}</Text>
                ) : (
                    <LongFormGrid
                        describe={describe}
                        items={filteredItems}
                        kind={kind}
                        onOpen={onOpen}
                        server={server}
                    />
                )}
            </>
        );
    };

    return (
        <AnimatedPage>
            <div className={styles.page}>
                <TextTitle fw={700} order={1}>
                    {title}
                </TextTitle>
                {renderBody()}
            </div>
        </AnimatedPage>
    );
};
