import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { AnimatePresence, motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import styles from './selection-dialog.module.css';
import i18n from '/@/i18n/i18n';
import { useItemListStateSubscription, } from '/@/renderer/components/item-list/helpers/item-list-state';
import { ContextMenuController } from '/@/renderer/features/context-menu/context-menu-controller';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
import { animationProps } from '/@/shared/components/animations/animation-props';
import { Group } from '/@/shared/components/group/group';
import { HoverCard } from '/@/shared/components/hover-card/hover-card';
import { Icon } from '/@/shared/components/icon/icon';
import { Kbd } from '/@/shared/components/kbd/kbd';
import { Table } from '/@/shared/components/table/table';
import { Text } from '/@/shared/components/text/text';
const controls = [
    {
        control1: _jsx(Kbd, { children: "CTRL" }),
        control2: _jsx(Kbd, { children: "A" }),
        label: i18n.t('action.selectAll', { postProcess: 'sentenceCase' }),
    },
    {
        control1: _jsx(Kbd, { children: "CTRL" }),
        control2: _jsx(Icon, { fill: "default", icon: "mouseLeftClick" }),
        label: i18n.t('action.addOrRemoveFromSelection', { postProcess: 'sentenceCase' }),
    },
    {
        control1: _jsx(Kbd, { children: "SHIFT" }),
        control2: _jsx(Icon, { fill: "default", icon: "mouseLeftClick" }),
        label: i18n.t('action.selectRangeOfItems', { postProcess: 'sentenceCase' }),
    },
];
export const SelectionDialog = ({ internalState }) => {
    const { t } = useTranslation();
    const isListExpanded = useItemListStateSubscription(internalState, (state) => state ? state.expanded.size > 0 : false);
    const selectedCount = useItemListStateSubscription(internalState, (state) => state ? state.selected.size : 0);
    const handleClearSelection = () => {
        internalState.clearSelected();
    };
    const handleOpenMoreActions = (event) => {
        event.preventDefault();
        event.stopPropagation();
        const selectedItems = internalState.getSelected();
        if (selectedItems.length === 0) {
            return;
        }
        ContextMenuController.call({
            cmd: { items: selectedItems, type: selectedItems[0]._itemType },
            event,
        });
    };
    const isOpen = selectedCount > 0;
    return (_jsx(AnimatePresence, { initial: false, mode: "sync", children: isOpen && (_jsx(motion.div, { ...animationProps.fadeIn, className: styles.selectionIndicator, style: { bottom: isListExpanded ? '320px' : '1rem' }, children: _jsxs(Group, { gap: "xl", justify: "space-between", children: [_jsxs(Group, { gap: "sm", children: [_jsxs(HoverCard, { offset: 20, position: "top", children: [_jsx(HoverCard.Target, { children: _jsx("span", { className: styles.infoIcon, children: _jsx(Icon, { icon: "keyboard" }) }) }), _jsx(HoverCard.Dropdown, { children: _jsx(Table, { children: _jsx(Table.Tbody, { children: controls.map((control) => (_jsxs(Table.Tr, { children: [_jsx(Table.Td, { ta: "start", children: control.control1 }), _jsx(Table.Td, { children: "+" }), _jsx(Table.Td, { ta: "center", children: control.control2 }), _jsx(Table.Td, { children: _jsx(Text, { size: "xs", children: control.label }) })] }, control.label))) }) }) })] }), _jsx(Text, { fw: 500, isNoSelect: true, size: "sm", children: t('common.countSelected', { count: selectedCount }) })] }), _jsxs(Group, { gap: "xs", children: [_jsx(ActionIcon, { icon: "x", iconProps: { size: 'xl' }, onClick: handleClearSelection, size: "xs", variant: "subtle" }), _jsx(ActionIcon, { icon: "ellipsisHorizontal", iconProps: { size: 'xl' }, onClick: handleOpenMoreActions, size: "xs", variant: "subtle" })] })] }) })) }));
};
