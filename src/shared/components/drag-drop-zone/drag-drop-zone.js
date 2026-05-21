import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import clsx from 'clsx';
import { t } from 'i18next';
import { useCallback, useRef, useState } from 'react';
import styles from './drag-drop-zone.module.css';
import { Flex } from '/@/shared/components/flex/flex';
import { Icon } from '/@/shared/components/icon/icon';
import { Text } from '/@/shared/components/text/text';
import { isNativeFileDrag, pickFirstImageFile } from '/@/shared/utils/image-drop';
const DragDropZoneText = ({ icon, onItemSelected, validateItem }) => {
    const zoneFileInput = useRef(null);
    const [error, setError] = useState('');
    const processItem = useCallback((itemContents) => {
        const { error: validationError, isValid } = validateItem
            ? validateItem(itemContents)
            : { isValid: true };
        if (validationError || !isValid) {
            setError(validationError);
            return;
        }
        onItemSelected(itemContents);
    }, [onItemSelected, validateItem]);
    const onItemDropped = useCallback((event) => {
        event.preventDefault();
        const items = event.dataTransfer.items;
        if (items.length > 1) {
            setError(t('dragDropZone.error_oneFileOnly'));
            return;
        }
        const file = items[0].getAsFile();
        if (!file) {
            return;
        }
        file.text()
            .then((value) => processItem(value.toString()))
            .catch((err) => {
            const error = err;
            setError(t('dragDropZone.error_readingFile', {
                errorMessage: error.message,
            }));
        });
    }, [processItem]);
    const onDragOver = useCallback((event) => {
        event.stopPropagation();
        event.preventDefault();
    }, []);
    const onZoneClick = useCallback(() => {
        zoneFileInput.current?.click();
    }, []);
    const onZoneInputChange = useCallback((event) => {
        const { files } = event.target;
        if (!files || files.length > 1) {
            setError(t('dragDropZone.error_oneFileOnly'));
            return;
        }
        const reader = new FileReader();
        reader.addEventListener('load', (event) => {
            const contents = event.target?.result;
            if (!contents) {
                return;
            }
            processItem(contents.toString());
        });
        reader.readAsText(files[0]);
    }, [processItem]);
    const hasErrored = error.length > 0;
    const borderColour = hasErrored ? 'red' : 'grey';
    return (_jsxs(Flex, { align: "center", bd: `2px dashed ${borderColour}`, bdrs: 'sm', direction: "column", gap: 'sm', justify: "center", onClick: onZoneClick, onDragOver: onDragOver, onDrop: onItemDropped, p: "sm", style: { cursor: 'pointer' }, children: [_jsx(Icon, { icon: icon, size: "3xl" }), _jsx(Text, { children: t('dragDropZone.mainText').toString() }), hasErrored ? (_jsx(Text, { c: "red", ta: "center", children: error })) : null, _jsx("input", { onChange: onZoneInputChange, ref: (self) => {
                    zoneFileInput.current = self;
                }, style: { display: 'none' }, type: "file" })] }));
};
const DragDropZoneFile = (props) => {
    const { accept = 'image/*', children, className, mode, onFileSelected, ...divProps } = props;
    void mode;
    const fileDragDepth = useRef(0);
    const [fileDragOver, setFileDragOver] = useState(false);
    const resolveFile = useCallback((dataTransfer) => {
        if (accept === 'image/*') {
            return pickFirstImageFile(dataTransfer.files);
        }
        const first = dataTransfer.files?.item(0);
        return first ?? null;
    }, [accept]);
    const handleDragEnter = useCallback((e) => {
        if (!isNativeFileDrag(e))
            return;
        e.preventDefault();
        e.stopPropagation();
        fileDragDepth.current += 1;
        setFileDragOver(true);
    }, []);
    const handleDragLeave = useCallback((e) => {
        if (!isNativeFileDrag(e))
            return;
        e.preventDefault();
        e.stopPropagation();
        fileDragDepth.current -= 1;
        if (fileDragDepth.current <= 0) {
            fileDragDepth.current = 0;
            setFileDragOver(false);
        }
    }, []);
    const handleDragOver = useCallback((e) => {
        if (!isNativeFileDrag(e))
            return;
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'copy';
    }, []);
    const handleDrop = useCallback((e) => {
        if (!isNativeFileDrag(e))
            return;
        e.preventDefault();
        e.stopPropagation();
        fileDragDepth.current = 0;
        setFileDragOver(false);
        const file = resolveFile(e.dataTransfer);
        if (file)
            void onFileSelected(file);
    }, [onFileSelected, resolveFile]);
    return (_jsx("div", { ...divProps, className: clsx(className, {
            [styles.fileTargetDragOver]: fileDragOver,
        }), onDragEnter: handleDragEnter, onDragLeave: handleDragLeave, onDragOver: handleDragOver, onDrop: handleDrop, children: children }));
};
export const DragDropZone = (props) => {
    if (props.mode === 'file') {
        return _jsx(DragDropZoneFile, { ...props });
    }
    return _jsx(DragDropZoneText, { ...props });
};
