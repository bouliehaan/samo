import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useTranslation } from 'react-i18next';
import { useRouteError } from 'react-router';
import styles from './error-fallback.module.css';
import { Button } from '/@/shared/components/button/button';
import { Center } from '/@/shared/components/center/center';
import { Group } from '/@/shared/components/group/group';
import { Icon } from '/@/shared/components/icon/icon';
import { Stack } from '/@/shared/components/stack/stack';
import { Text } from '/@/shared/components/text/text';
export const ErrorFallback = ({ resetErrorBoundary }) => {
    const error = useRouteError();
    const { t } = useTranslation();
    return (_jsx("div", { className: styles.container, children: _jsx(Center, { style: { height: '100vh' }, children: _jsxs(Stack, { style: { maxWidth: '50%' }, children: [_jsxs(Group, { gap: "xs", children: [_jsx(Icon, { fill: "error", icon: "error", size: "lg" }), _jsx(Text, { size: "lg", children: t('error.genericError') })] }), _jsx(Text, { children: error?.message }), _jsx(Button, { onClick: resetErrorBoundary, variant: "filled", children: t('common.reload') })] }) }) }));
};
