import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router';
import { AnimatedPage } from '/@/renderer/features/shared/components/animated-page';
import { PageErrorBoundary } from '/@/renderer/features/shared/components/page-error-boundary';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
import { Center } from '/@/shared/components/center/center';
import { Group } from '/@/shared/components/group/group';
import { Icon } from '/@/shared/components/icon/icon';
import { Stack } from '/@/shared/components/stack/stack';
import { Text } from '/@/shared/components/text/text';
const InvalidRoute = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    return (_jsx(AnimatedPage, { children: _jsx(Center, { style: { height: '100%', width: '100%' }, children: _jsxs(Stack, { children: [_jsxs(Group, { justify: "center", wrap: "nowrap", children: [_jsx(Icon, { color: "warn", icon: "error" }), _jsx(Text, { size: "xl", children: t('error.apiRouteError', { postProcess: 'sentenceCase' }) })] }), _jsx(Text, { children: location.pathname }), _jsx(ActionIcon, { icon: "arrowLeftS", onClick: () => navigate(-1), variant: "filled" })] }) }) }));
};
const InvalidRouteWithBoundary = () => {
    return (_jsx(PageErrorBoundary, { children: _jsx(InvalidRoute, {}) }));
};
export default InvalidRouteWithBoundary;
