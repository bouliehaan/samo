import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ErrorBoundary } from 'react-error-boundary';
import { useTranslation } from 'react-i18next';
import { ServerSelector } from '/@/renderer/features/sidebar/components/server-selector';
import { Box } from '/@/shared/components/box/box';
import { Button } from '/@/shared/components/button/button';
import { Center } from '/@/shared/components/center/center';
import { Code } from '/@/shared/components/code/code';
import { Group } from '/@/shared/components/group/group';
import { Icon } from '/@/shared/components/icon/icon';
import { Stack } from '/@/shared/components/stack/stack';
import { TextTitle } from '/@/shared/components/text-title/text-title';
import { Text } from '/@/shared/components/text/text';
import { LogCategory, logFn } from '/@/renderer/utils/logger';
const RouterErrorFallback = ({ error, resetErrorBoundary }) => {
    const { t } = useTranslation();
    const handleRefresh = () => {
        window.location.reload();
    };
    return (_jsxs(Box, { style: {
            backgroundColor: 'var(--theme-colors-background)',
            height: '100vh',
            width: '100vw',
        }, children: [_jsx(Box, { style: {
                    padding: 'var(--theme-spacing-md)',
                    position: 'absolute',
                    right: 0,
                    top: 0,
                    zIndex: 1000,
                }, children: _jsx(ServerSelector, {}) }), _jsx(Center, { h: "100vh", p: "md", w: "100%", children: _jsxs(Stack, { maw: "800px", children: [_jsxs(Group, { gap: "xs", children: [_jsx(Icon, { fill: "error", icon: "error", size: "lg" }), _jsx(TextTitle, { fw: 700, order: 3, children: t('error.genericError', { postProcess: 'sentenceCase' }) })] }), _jsx(Text, { style: { wordBreak: 'break-word' }, children: error?.message || t('error.genericError', { postProcess: 'sentenceCase' }) }), process.env.NODE_ENV === 'development' && error?.stack && (_jsx(Code, { p: "md", style: {
                                backgroundColor: 'var(--theme-colors-surface)',
                                fontFamily: 'monospace',
                                maxHeight: '300px',
                                overflow: 'auto',
                                wordBreak: 'break-word',
                            }, children: error.stack })), _jsxs(Group, { grow: true, children: [_jsx(Button, { onClick: resetErrorBoundary, size: "md", variant: "default", children: t('common.reload', { postProcess: 'sentenceCase' }) }), _jsx(Button, { onClick: handleRefresh, size: "md", variant: "filled", children: t('common.refresh', { postProcess: 'sentenceCase' }) })] })] }) })] }));
};
export const RouterErrorBoundary = ({ children }) => {
    return (_jsx(ErrorBoundary, { FallbackComponent: RouterErrorFallback, onError: (error, errorInfo) => {
            if (process.env.NODE_ENV === 'development') {
                logFn.error('Root error boundary caught an error', {
                    category: LogCategory.GENERAL,
                    meta: { error, errorInfo },
                });
            }
        }, onReset: () => { }, children: children }));
};
