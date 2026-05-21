import { ReactNode } from 'react';
export type SettingOption = {
    control: ReactNode;
    description: ReactNode | string;
    isHidden?: boolean;
    note?: string;
    title: string;
};
interface SettingsSectionProps {
    extra?: ReactNode;
    options: SettingOption[];
    title?: ReactNode;
}
export declare const SettingsSection: ({ extra, options, title }: SettingsSectionProps) => import("react/jsx-runtime").JSX.Element;
export {};
