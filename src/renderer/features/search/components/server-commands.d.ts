import { Dispatch } from 'react';
import { CommandPalettePages } from '/@/renderer/features/search/components/command';
interface ServerCommandsProps {
    handleClose: () => void;
    setPages: (pages: CommandPalettePages[]) => void;
    setQuery: Dispatch<string>;
}
export declare const ServerCommands: ({ handleClose, setPages, setQuery }: ServerCommandsProps) => import("react/jsx-runtime").JSX.Element;
export {};
