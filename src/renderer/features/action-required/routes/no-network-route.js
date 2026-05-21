import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { PageHeader } from '/@/renderer/components/page-header/page-header';
import { AnimatedPage } from '/@/renderer/features/shared/components/animated-page';
import { PageErrorBoundary } from '/@/renderer/features/shared/components/page-error-boundary';
import { AppRoute } from '/@/renderer/router/routes';
import { Button } from '/@/shared/components/button/button';
import { Center } from '/@/shared/components/center/center';
import { Icon } from '/@/shared/components/icon/icon';
import { Stack } from '/@/shared/components/stack/stack';
import { Text } from '/@/shared/components/text/text';
const NoNetworkRoute = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const handleRetry = () => {
        // Navigate to home which will trigger authentication again
        navigate(AppRoute.HOME);
    };
    return (_jsxs(AnimatedPage, { children: [_jsx(PageHeader, {}), _jsx(Center, { style: { height: '100%' }, children: _jsxs(Stack, { align: "center", gap: "xl", style: { maxWidth: '50%', textAlign: 'center' }, children: [_jsx(Icon, { icon: "wifiOff", size: "4rem" }), _jsxs(Stack, { gap: "md", children: [_jsx(Text, { size: "xl", weight: 600, children: t('error.noNetwork', { postProcess: 'sentenceCase' }) }), _jsx(Text, { c: "dimmed", size: "sm", children: t('error.noNetworkDescription', {
                                        postProcess: 'sentenceCase',
                                    }) })] }), _jsx(Button, { leftSection: _jsx(Icon, { icon: "refresh" }), onClick: handleRetry, variant: "filled", children: t('common.retry', { postProcess: 'sentenceCase' }) })] }) })] }));
};
const NoNetworkRouteWithBoundary = () => {
    return (_jsx(PageErrorBoundary, { children: _jsx(NoNetworkRoute, {}) }));
};
export default NoNetworkRouteWithBoundary;
