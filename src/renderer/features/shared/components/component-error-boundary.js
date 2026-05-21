import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ErrorBoundary } from 'react-error-boundary';
import { useTranslation } from 'react-i18next';
import { Box } from '/@/shared/components/box/box';
import { Button } from '/@/shared/components/button/button';
import { Center } from '/@/shared/components/center/center';
import { Group } from '/@/shared/components/group/group';
import { Icon } from '/@/shared/components/icon/icon';
import { Stack } from '/@/shared/components/stack/stack';
import { TextTitle } from '/@/shared/components/text-title/text-title';
const ComponentErrorFallback = ({ resetErrorBoundary }) => {
    const { t } = useTranslation();
    return (_jsx(Box, { h: "100%", pos: "relative", w: "100%", children: _jsx(Center, { h: "100%", p: "md", w: "100%", children: _jsxs(Stack, { maw: "800px", children: [_jsxs(Group, { gap: "xs", children: [_jsx(Icon, { fill: "error", icon: "error", size: "lg" }), _jsx(TextTitle, { fw: 600, order: 4, children: t('error.genericError', { postProcess: 'sentenceCase' }) })] }), _jsx(Group, { grow: true, children: _jsx(Button, { onClick: resetErrorBoundary, size: "xs", variant: "default", children: t('common.reload', { postProcess: 'sentenceCase' }) }) })] }) }) }));
};
export const ComponentErrorBoundary = ({ children }) => {
    return _jsx(ErrorBoundary, { FallbackComponent: ComponentErrorFallback, children: children });
};
