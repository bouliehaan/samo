import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { AppShell, Flex, Grid, Image } from '@mantine/core';
import samoLogoUrl from '../../../build/samologo.svg?url';
import { ImageButton } from '/@/remote/components/buttons/image-button';
import { ReconnectButton } from '/@/remote/components/buttons/reconnect-button';
import { ThemeButton } from '/@/remote/components/buttons/theme-button';
import { RemoteContainer } from '/@/remote/components/remote-container';
import { useConnected } from '/@/remote/store';
import { Center } from '/@/shared/components/center/center';
import { Group } from '/@/shared/components/group/group';
import { Spinner } from '/@/shared/components/spinner/spinner';
export const Shell = () => {
    const connected = useConnected();
    return (_jsxs(AppShell, { h: "100vh", padding: "md", w: "100vw", children: [_jsx(AppShell.Header, { style: { background: 'var(--theme-colors-surface)' }, children: _jsxs(Grid, { px: "md", py: "sm", children: [_jsx(Grid.Col, { span: 4, children: _jsx(Flex, { align: "center", direction: "row", h: "100%", justify: "flex-start", style: {
                                    justifySelf: 'flex-start',
                                }, children: _jsx(Image, { fit: "contain", height: 32, src: samoLogoUrl, width: 32 }) }) }), _jsx(Grid.Col, { span: 8, children: _jsxs(Group, { gap: "sm", justify: "flex-end", wrap: "nowrap", children: [_jsx(ReconnectButton, {}), _jsx(ImageButton, {}), _jsx(ThemeButton, {})] }) })] }) }), _jsx(AppShell.Main, { pt: "60px", children: connected ? (_jsx(RemoteContainer, {})) : (_jsx(Center, { h: "100vh", w: "100vw", children: _jsx(Spinner, {}) })) })] }));
};
