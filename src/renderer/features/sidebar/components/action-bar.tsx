import { useNavigate } from 'react-router';

import samoLogoUrl from '../../../../../samo_logo_white.svg?url';
import styles from './action-bar.module.css';

import { AppMenu } from '/@/renderer/features/titlebar/components/app-menu';
import { Button } from '/@/shared/components/button/button';
import { DropdownMenu } from '/@/shared/components/dropdown-menu/dropdown-menu';
import { Group } from '/@/shared/components/group/group';
import { Icon } from '/@/shared/components/icon/icon';

export const ActionBar = () => {
    return (
        <div className={styles.container}>
            <Group gap="sm" grow px="md" w="100%" wrap="nowrap">
                <DropdownMenu position="bottom-start">
                    <DropdownMenu.Target>
                        <Button p="0">
                            <img alt="Samo" className={styles.logo} src={samoLogoUrl} />
                        </Button>
                    </DropdownMenu.Target>
                    <DropdownMenu.Dropdown>
                        <AppMenu />
                    </DropdownMenu.Dropdown>
                </DropdownMenu>
                <NavigateButtons />
            </Group>
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
