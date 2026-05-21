import { createPolymorphicComponent, Title as MantineHeader } from '@mantine/core';
import clsx from 'clsx';
import styles from './text-title.module.css';
const _TextTitle = ({ children, className, isLink, isMuted, isNoSelect, overflow, weight, ...rest }) => {
    return (<MantineHeader className={clsx(styles.root, {
            [styles.link]: isLink,
            [styles.muted]: isMuted,
            [styles.noSelect]: isNoSelect,
            [styles.overflowHidden]: overflow === 'hidden' && !rest.lineClamp,
        }, className)} fw={weight} {...rest}>
            {children}
        </MantineHeader>);
};
export const TextTitle = createPolymorphicComponent(_TextTitle);
