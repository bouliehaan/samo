import { Stack } from '@mantine/core';

import { AnimatedPage } from '/@/renderer/features/shared/components/animated-page';
import { PageErrorBoundary } from '/@/renderer/features/shared/components/page-error-boundary';
import { Text } from '/@/shared/components/text/text';

const PodcastsRoute = () => {
    return (
        <AnimatedPage>
            <Stack gap="md" p="2rem">
                <Text fw={700} size="xl">
                    Podcasts
                </Text>
                <Text isMuted>Audiobookshelf podcast browsing coming next.</Text>
            </Stack>
        </AnimatedPage>
    );
};

const PodcastsRouteWithBoundary = () => {
    return (
        <PageErrorBoundary>
            <PodcastsRoute />
        </PageErrorBoundary>
    );
};

export default PodcastsRouteWithBoundary;
