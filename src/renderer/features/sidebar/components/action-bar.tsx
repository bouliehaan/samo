import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { generatePath, useNavigate } from 'react-router';

import styles from './action-bar.module.css';

import { AppMenu } from '/@/renderer/features/titlebar/components/app-menu';
import { AppRoute } from '/@/renderer/router/routes';
import { Button } from '/@/shared/components/button/button';
import { DropdownMenu } from '/@/shared/components/dropdown-menu/dropdown-menu';
import { Grid } from '/@/shared/components/grid/grid';
import { Group } from '/@/shared/components/group/group';
import { Icon } from '/@/shared/components/icon/icon';
import { TextInput } from '/@/shared/components/text-input/text-input';
import { LibraryItem } from '/@/shared/types/domain-types';

export const ActionBar = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [searchValue, setSearchValue] = useState('');

    const goToSearch = (value: string) => {
        const searchPath = generatePath(AppRoute.SEARCH, { itemType: LibraryItem.SONG });
        const query = value.trim();

        if (!query) {
            return;
        }

        navigate(`${searchPath}?query=${encodeURIComponent(query)}`);
    };

    const handleSearchChange = (value: string) => {
        setSearchValue(value);
        goToSearch(value);
    };

    const handleSearchFocus = () => {
        goToSearch(searchValue);
    };

    return (
        <div className={styles.container}>
            <Grid
                display="flex"
                gutter="sm"
                style={{ padding: '0 var(--theme-spacing-md)' }}
                w="100%"
            >
                <Grid.Col span={7}>
                    <TextInput
                        leftSection={<Icon icon="search" />}
                        onChange={(event) => handleSearchChange(event.currentTarget.value)}
                        onClick={handleSearchFocus}
                        onFocus={handleSearchFocus}
                        onKeyDown={(event) => {
                            event.stopPropagation();
                        }}
                        placeholder={t('common.search', { postProcess: 'titleCase' })}
                        value={searchValue}
                    />
                </Grid.Col>
                <Grid.Col span={5}>
                    <Group gap="sm" grow wrap="nowrap">
                        <DropdownMenu position="bottom-start">
                            <DropdownMenu.Target>
                                <Button p="0">
                                    <Icon icon="menu" size="lg" />
                                </Button>
                            </DropdownMenu.Target>
                            <DropdownMenu.Dropdown>
                                <AppMenu />
                            </DropdownMenu.Dropdown>
                        </DropdownMenu>
                        <NavigateButtons />
                    </Group>
                </Grid.Col>
            </Grid>
        </div>
    );
};

const NavigateButtons = () => {
    const navigate = useNavigate();

    return (
        <>
            <Button onClick={() => navigate(-1)} p="0">
                <Icon icon="arrowLeftS" size="lg" />
            </Button>
            <Button onClick={() => navigate(1)} p="0">
                <Icon icon="arrowRightS" size="lg" />
            </Button>
        </>
    );
};
