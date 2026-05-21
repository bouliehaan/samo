import { LoadingOverlay as MantineLoadingOverlay, } from '@mantine/core';
import { Spinner } from '/@/shared/components/spinner/spinner';
export const LoadingOverlay = ({ ...props }) => {
    return (<MantineLoadingOverlay loaderProps={{ children: <Spinner /> }} overlayProps={{
            color: 'var(--theme-colors-background)',
            opacity: 0.5,
        }} styles={{
            root: {
                zIndex: 150,
            },
        }} transitionProps={{
            duration: 0.5,
            transition: 'fade',
        }} {...props}/>);
};
