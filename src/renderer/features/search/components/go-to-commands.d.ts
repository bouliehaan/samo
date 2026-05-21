import { Dispatch } from 'react';
import { CommandPalettePages } from '/@/renderer/features/search/components/command';
interface GoToCommandsProps {
    handleClose: () => void;
    setPages: (pages: CommandPalettePages[]) => void;
    setQuery: Dispatch<string>;
}
export declare const GoToCommands: ({ handleClose, setPages, setQuery }: GoToCommandsProps) => import("react/jsx-runtime").JSX.Element;
export {};
