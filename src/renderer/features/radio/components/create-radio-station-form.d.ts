import { MouseEvent } from 'react';
import { ServerListItem } from '/@/shared/types/domain-types';
interface CreateRadioStationFormProps {
    onCancel: () => void;
}
export declare const CreateRadioStationForm: ({ onCancel }: CreateRadioStationFormProps) => import("react/jsx-runtime").JSX.Element;
export declare const openCreateRadioStationModal: (server: null | ServerListItem, e?: MouseEvent<HTMLButtonElement>) => void;
export {};
