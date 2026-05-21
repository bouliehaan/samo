import { MouseEvent } from 'react';
import { InternetRadioStation, ServerListItem } from '/@/shared/types/domain-types';
interface EditRadioStationFormProps {
    onCancel: () => void;
    station: InternetRadioStation;
}
export declare const EditRadioStationForm: ({ onCancel, station }: EditRadioStationFormProps) => import("react/jsx-runtime").JSX.Element;
export declare const openEditRadioStationModal: (station: InternetRadioStation, server: null | ServerListItem, e?: MouseEvent<HTMLButtonElement>) => void;
export {};
