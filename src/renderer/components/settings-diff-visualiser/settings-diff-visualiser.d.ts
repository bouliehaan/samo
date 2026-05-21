import { SettingsState } from '/@/renderer/store';
interface DiffVisualiserProps {
    newSettings: Omit<SettingsState, 'actions'>;
    originalSettings: Omit<SettingsState, 'actions'>;
}
export declare const DiffVisualiser: ({ newSettings, originalSettings }: DiffVisualiserProps) => import("react/jsx-runtime").JSX.Element;
export {};
