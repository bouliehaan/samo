import { Group } from '@mantine/core';
import { Link } from 'react-router';

import styles from './home-sections.module.css';

import { Button } from '/@/shared/components/button/button';
import { TextTitle } from '/@/shared/components/text-title/text-title';

export const HomeSectionTitle = ({ title, to }: { title: string; to?: string }) => (
    <Group className={styles.sectionTitle} gap="xs" justify="space-between" w="100%">
        <TextTitle fw={700} isNoSelect order={2}>
            {title}
        </TextTitle>
        {to ? (
            <Button component={Link} size="compact-sm" to={to} variant="subtle">
                View all
            </Button>
        ) : null}
    </Group>
);
