import React from 'react';
interface SettingsOptionProps {
    control: React.ReactNode;
    description?: React.ReactNode | string;
    note?: string;
    title: React.ReactNode | string;
}
export declare const SettingsOptions: React.MemoExoticComponent<({ control, description, note, title }: SettingsOptionProps) => import("react/jsx-runtime").JSX.Element>;
export {};
