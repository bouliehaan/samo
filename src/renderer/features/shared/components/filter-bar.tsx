import clsx from 'clsx';

import styles from './filter-bar.module.css';

export const FilterBar = ({
    children,
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
    return (
        <div className={clsx(styles.filterBar, className)} {...props}>
            {children}
        </div>
    );
};
