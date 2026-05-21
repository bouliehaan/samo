import { jsx as _jsx } from "react/jsx-runtime";
import { CiImageOff, CiImageOn } from 'react-icons/ci';
import { useShowImage, useToggleShowImage } from '/@/remote/store';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
export const ImageButton = () => {
    const showImage = useShowImage();
    const toggleImage = useToggleShowImage();
    return (_jsx(ActionIcon, { onClick: () => toggleImage(), tooltip: {
            label: showImage ? 'Hide Image' : 'Show Image',
        }, variant: "default", children: showImage ? _jsx(CiImageOff, { size: 30 }) : _jsx(CiImageOn, { size: 30 }) }));
};
