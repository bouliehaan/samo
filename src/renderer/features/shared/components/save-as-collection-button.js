import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { nanoid } from 'nanoid';
import { useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import styles from './save-as-collection-button.module.css';
import { useListContext } from '/@/renderer/context/list-context';
import { useCollections, useSettingsStoreActions } from '/@/renderer/store';
import { getFilterQueryStringFromSearchParams } from '/@/renderer/utils/query-params';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
import { Button } from '/@/shared/components/button/button';
import { Group } from '/@/shared/components/group/group';
import { Popover } from '/@/shared/components/popover/popover';
import { ScrollArea } from '/@/shared/components/scroll-area/scroll-area';
import { Stack } from '/@/shared/components/stack/stack';
import { TextInput } from '/@/shared/components/text-input/text-input';
import { Text } from '/@/shared/components/text/text';
import { useDisclosure } from '/@/shared/hooks/use-disclosure';
import { useForm } from '/@/shared/hooks/use-form';
export const SaveAsCollectionButton = ({ fullWidth, itemType }) => {
    const { t } = useTranslation();
    const [searchParams] = useSearchParams();
    const { customFilters } = useListContext();
    const collections = useCollections();
    const { addCollection, updateCollection } = useSettingsStoreActions();
    const [isOpen, handlers] = useDisclosure(false);
    const formRef = useRef(null);
    const sameTypeCollections = useMemo(() => collections?.filter((c) => c.type === itemType) ?? [], [collections, itemType]);
    const form = useForm({
        initialValues: {
            name: '',
        },
    });
    const handleOpen = useCallback(() => {
        form.setValues({ name: '' });
        handlers.open();
    }, [form, handlers]);
    const handleOverrideExisting = useCallback((collection) => {
        const filterQueryString = getFilterQueryStringFromSearchParams(searchParams, customFilters);
        updateCollection(collection.id, { filterQueryString });
        handlers.close();
    }, [customFilters, handlers, searchParams, updateCollection]);
    const handleSubmit = form.onSubmit((values) => {
        const trimmed = values.name.trim();
        if (!trimmed)
            return;
        const filterQueryString = getFilterQueryStringFromSearchParams(searchParams, customFilters);
        addCollection({
            filterQueryString,
            id: nanoid(),
            name: trimmed,
            type: itemType,
        });
        handlers.close();
    });
    const handleFormKeyDown = useCallback((e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            formRef.current?.requestSubmit();
        }
    }, []);
    return (_jsxs(Popover, { onClose: handlers.close, opened: isOpen, width: "target", children: [_jsx(Popover.Target, { children: fullWidth ? (_jsx(Button, { fullWidth: true, onClick: handleOpen, variant: "default", children: t('page.collections.saveAsCollection', {
                        postProcess: 'sentenceCase',
                    }) })) : (_jsx(ActionIcon, { icon: "folder", iconProps: { size: 'lg' }, onClick: handleOpen, tooltip: {
                        label: t('page.collections.saveAsCollection', {
                            postProcess: 'sentenceCase',
                        }),
                    }, variant: "subtle" })) }), _jsx(Popover.Dropdown, { children: _jsx("form", { onKeyDown: handleFormKeyDown, onSubmit: handleSubmit, ref: formRef, children: _jsxs(Stack, { gap: "sm", children: [_jsx(Text, { fw: 500, size: "sm", ta: "center", children: t('page.collections.overrideExisting', {
                                    postProcess: 'sentenceCase',
                                }) }), _jsx("div", { className: styles.list, children: _jsx(ScrollArea, { children: _jsx(Stack, { gap: 0, children: sameTypeCollections.map((collection) => (_jsx(Button, { className: styles.row, onClick: () => handleOverrideExisting(collection), type: "button", variant: "subtle", children: _jsx(Text, { className: styles['row-name'], size: "sm", children: collection.name }) }, collection.id))) }) }) }), _jsx(TextInput, { autoFocus: true, maxLength: 128, ...form.getInputProps('name') }), _jsxs(Group, { gap: "xs", justify: "flex-end", children: [_jsx(Button, { onClick: handlers.close, type: "button", variant: "subtle", children: t('common.cancel', { postProcess: 'sentenceCase' }) }), _jsx(Button, { type: "submit", variant: "filled", children: t('common.save', { postProcess: 'sentenceCase' }) })] })] }) }) })] }));
};
