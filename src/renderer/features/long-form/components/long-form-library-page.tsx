import { type ReactNode, useState } from 'react';
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
    /** Label above the grid, separating it from the shelves. */
    gridLabel: string;
    isLoading: boolean;
    items: LongFormLibraryItem[];
    kind: LongFormMediaKind;
    noServerLabel: string;
    onOpen: (item: LongFormLibraryItem) => void;
    searchPlaceholder: string;
    /** Shelves above the grid — continue listening, what's new, recents. */
    sections?: ReactNode;
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
/**
 * Page shell shared by the Audiobooks and Podcasts library routes.
 *
 * Shelves first, then the whole catalog — the same shape the phone uses,
 * because "carry on with what I was listening to" is a different task from
 * "find that one book", and a wall of covers only answers the second. Searching
 * hides the shelves: once you are looking for something specific, three rows of
 * things you were not looking for are in the way.
 */
export const LongFormLibraryPage = ({
    describe,
    emptyLabel,
    gridLabel,
    isLoading,
    items,
    kind,
    noServerLabel,
    onOpen,
    searchPlaceholder,
    sections,
    server,
    title,
    toSearchText,
}: LongFormLibraryPageProps) => {
    const { t } = useTranslation();
    const [searchQuery, setSearchQuery] = useState('');
    const filteredItems = useFilteredLongFormItems(items, searchQuery, toSearchText);
    const isSearching = searchQuery.trim().length > 0;

    if (!server) {
        return (
            <AnimatedPage>
                <div className={styles.page}>
                    <TextTitle fw={700} order={1}>
                        {title}
                    </TextTitle>
                    <Text isMuted>{noServerLabel}</Text>
                </div>
            </AnimatedPage>
        );
    }

    if (isLoading) {
        return (
            <AnimatedPage>
                <div className={styles.page}>
                    <TextTitle fw={700} order={1}>
                        {title}
                    </TextTitle>
                    <GridPageSkeleton />
                </div>
            </AnimatedPage>
        );
    }

    if (!items.length) {
        return (
            <AnimatedPage>
                <div className={styles.page}>
                    <TextTitle fw={700} order={1}>
                        {title}
                    </TextTitle>
                    <Text isMuted>{emptyLabel}</Text>
                </div>
            </AnimatedPage>
        );
    }

    return (
        <AnimatedPage>
            <div className={styles.page}>
                <div className={styles.header}>
                    <TextTitle fw={700} order={1}>
                        {title}
                    </TextTitle>
                    <TextInput
                        aria-label={searchPlaceholder}
                        className={styles.search}
                        onChange={(event) => setSearchQuery(event.currentTarget.value)}
                        placeholder={searchPlaceholder}
                        value={searchQuery}
                    />
                </div>

                {isSearching ? null : sections}

                {!filteredItems.length ? (
                    <Text isMuted>{t('common.noResults', { postProcess: 'sentenceCase' })}</Text>
                ) : (
                    <>
                        {isSearching ? null : (
                            <TextTitle fw={700} isNoSelect order={2}>
                                {gridLabel}
                            </TextTitle>
                        )}
                        <div className={styles.grid}>
                            <LongFormGrid
                                describe={describe}
                                items={filteredItems}
                                kind={kind}
                                onOpen={onOpen}
                                server={server}
                            />
                        </div>
                    </>
                )}
            </div>
        </AnimatedPage>
    );
};
