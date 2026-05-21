import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import isElectron from 'is-electron';
import { useTranslation } from 'react-i18next';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
import { CopyButton } from '/@/shared/components/copy-button/copy-button';
import { Group } from '/@/shared/components/group/group';
import { Icon } from '/@/shared/components/icon/icon';
import { Text } from '/@/shared/components/text/text';
import { toast } from '/@/shared/components/toast/toast';
import { Tooltip } from '/@/shared/components/tooltip/tooltip';
const util = isElectron() ? window.api.utils : null;
export const SongPath = ({ path }) => {
    const { t } = useTranslation();
    if (!path)
        return null;
    return (_jsxs(Group, { children: [_jsx(CopyButton, { timeout: 2000, value: path, children: ({ copied, copy }) => (_jsx(Tooltip, { label: t(copied ? 'page.itemDetail.copiedPath' : 'page.itemDetail.copyPath', {
                        postProcess: 'sentenceCase',
                    }), withinPortal: true, children: _jsx(ActionIcon, { onClick: copy, variant: "transparent", children: copied ? _jsx(Icon, { icon: "check" }) : _jsx(Icon, { icon: "clipboardCopy" }) }) })) }), util && (_jsx(Tooltip, { label: t('page.itemDetail.openFile', { postProcess: 'sentenceCase' }), withinPortal: true, children: _jsx(ActionIcon, { icon: "externalLink", onClick: () => {
                        util.openItem(path).catch((error) => {
                            toast.error({
                                message: error.message,
                                title: t('error.openError', {
                                    postProcess: 'sentenceCase',
                                }),
                            });
                        });
                    }, variant: "transparent" }) })), _jsx(Text, { style: { userSelect: 'all' }, children: path })] }));
};
