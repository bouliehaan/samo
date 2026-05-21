import { Dispatch } from 'react';
import { CommandPalettePages } from '/@/renderer/features/search/components/command';
interface HomeCommandsProps {
    handleClose: () => void;
    pages: CommandPalettePages[];
    query: string;
    setPages: Dispatch<CommandPalettePages[]>;
    setQuery: Dispatch<string>;
}
export declare const HomeCommands: ({ handleClose, pages, query, setPages, setQuery, }: HomeCommandsProps) => import("react/jsx-runtime").JSX.Element;
export {};
