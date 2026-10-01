import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

import styles from './radio-list-header-filters.module.css';

import { openCreateRadioStationModal } from '/@/renderer/features/radio/components/create-radio-station-form';
import { useCurrentServer, usePermissions } from '/@/renderer/store';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';

export type RadioFilter = 'all' | 'channels' | 'favorites' | 'internet';

const filters: { id: RadioFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'favorites', label: 'Favorites' },
    { id: 'channels', label: 'samo channels' },
    { id: 'internet', label: 'Internet radio' },
];

export const RadioListHeaderFilters = ({
    filter,
    onChange,
}: {
    filter: RadioFilter;
    onChange: (filter: RadioFilter) => void;
}) => {
    const { t } = useTranslation();
    const server = useCurrentServer();
    const permissions = usePermissions();

    return (
        <div className={styles.toolbar}>
            <div aria-label="Filter radio stations" className={styles.filters} role="group">
                {filters.map(({ id, label }) => (
                    <button
                        aria-pressed={filter === id}
                        className={clsx(styles.pill, filter === id && styles.active)}
                        key={id}
                        onClick={() => onChange(id)}
                        type="button"
                    >
                        {label}
                    </button>
                ))}
            </div>
            {permissions.radio.create && (
                <ActionIcon
                    aria-label="Add radio station"
                    icon="plus"
                    onClick={(event) => openCreateRadioStationModal(server, event)}
                    tooltip={{
                        label: t('action.createRadioStation', { postProcess: 'sentenceCase' }),
                    }}
                    variant="subtle"
                />
            )}
        </div>
    );
};
