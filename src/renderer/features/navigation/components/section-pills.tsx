import clsx from 'clsx';
import { memo, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router';

import styles from './section-pills.module.css';

import {
    activeNavSectionId,
    availableNavSections,
} from '/@/renderer/features/navigation/utils/sections';
import { useCurrentServerId, useLongFormMediaServer } from '/@/renderer/store';

/**
 * The app's sections, as one row of pills in the header.
 *
 * They live beside the search field rather than above the page: top-level
 * navigation belongs to the window chrome, not to whatever page happens to be
 * open, and putting it there costs the content area no height at all. Detail
 * pages keep their parent section lit rather than clearing the row — an album
 * is somewhere inside Music, and pretending otherwise loses your place.
 *
 * The left rail is a different job (recent items, filtered) and keeps its own
 * chips. These pills say WHERE you are; those say WHAT the rail is showing.
 */
export const SectionPills = memo(() => {
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const musicServerId = useCurrentServerId();
    const longFormServer = useLongFormMediaServer();

    const sections = useMemo(
        () =>
            availableNavSections({
                hasLongFormServer: Boolean(longFormServer),
                hasMusicServer: Boolean(musicServerId),
            }),
        [longFormServer, musicServerId],
    );

    const activeId = activeNavSectionId(pathname, sections);

    // Nothing to navigate to before a server is connected.
    if (sections.length === 0) {
        return null;
    }

    return (
        <nav aria-label="Sections" className={styles.pills}>
            {sections.map((section) => {
                const isActive = section.id === activeId;

                return (
                    <button
                        aria-current={isActive ? 'page' : undefined}
                        className={clsx(styles.pill, isActive && styles.pillActive)}
                        key={section.id}
                        onClick={() => navigate(section.paths[0])}
                        type="button"
                    >
                        {section.label}
                    </button>
                );
            })}
        </nav>
    );
});

SectionPills.displayName = 'SectionPills';
