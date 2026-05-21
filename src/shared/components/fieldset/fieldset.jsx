import { Fieldset as MantineFieldset } from '@mantine/core';
import { forwardRef } from 'react';
import styles from './fieldset.module.css';
export const Fieldset = forwardRef(({ children, ...props }, ref) => {
    return (<MantineFieldset classNames={{ root: styles.root }} {...props} ref={ref}>
                {children}
            </MantineFieldset>);
});
Fieldset.displayName = 'Fieldset';
