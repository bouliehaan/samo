import { jsxs as _jsxs, jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { useCurrentServer } from '/@/renderer/store';
import { Text } from '/@/shared/components/text/text';
export const ServerCredentialRequired = () => {
    const currentServer = useCurrentServer();
    return (_jsxs(_Fragment, { children: [_jsxs(Text, { children: ["The selected server '", currentServer?.name, "' requires an additional login to access."] }), _jsx(Text, { children: "Add your credentials in the 'manage servers' menu or switch to a different server." })] }));
};
