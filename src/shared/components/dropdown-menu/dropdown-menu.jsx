import { Menu as MantineMenu } from '@mantine/core';
import clsx from 'clsx';
import styles from './dropdown-menu.module.css';
import { createPolymorphicComponent } from '/@/shared/utils/create-polymorphic-component';
const getTransition = (position) => {
    if (position?.includes('top')) {
        return 'fade-up';
    }
    if (position?.includes('bottom')) {
        return 'fade-down';
    }
    if (position?.includes('left')) {
        return 'fade-left';
    }
    if (position?.includes('right')) {
        return 'fade-right';
    }
    return 'fade';
};
export const DropdownMenu = ({ children, ...props }) => {
    return (<MantineMenu classNames={{
            dropdown: styles['menu-dropdown'],
            itemSection: styles['menu-item-section'],
        }} offset={10} transitionProps={{
            transition: getTransition(props.position),
        }} withinPortal {...props}>
            {children}
        </MantineMenu>);
};
const MenuLabel = ({ children, ...props }) => {
    return (<MantineMenu.Label className={styles['menu-label']} {...props}>
            {children}
        </MantineMenu.Label>);
};
const pMenuItem = ({ children, isDanger, isSelected, ...props }) => {
    return (<MantineMenu.Item className={clsx(styles['menu-item'], {
            [styles.selected]: isSelected,
        })} {...props}>
            <span className={clsx(styles['menu-item-label'], {
            [styles['menu-item-label-danger']]: isDanger,
            [styles['menu-item-label-normal']]: !isDanger,
        })}>
                {children}
            </span>
        </MantineMenu.Item>);
};
const MenuDropdown = ({ children, ...props }) => {
    return (<MantineMenu.Dropdown className={styles['menu-dropdown']} {...props}>
            {children}
        </MantineMenu.Dropdown>);
};
const MenuItem = createPolymorphicComponent(pMenuItem);
const MenuDivider = ({ ...props }) => {
    return <MantineMenu.Divider className={styles['menu-divider']} {...props}/>;
};
DropdownMenu.Label = MenuLabel;
DropdownMenu.Item = MenuItem;
DropdownMenu.Target = MantineMenu.Target;
DropdownMenu.Dropdown = MenuDropdown;
DropdownMenu.Divider = MenuDivider;
