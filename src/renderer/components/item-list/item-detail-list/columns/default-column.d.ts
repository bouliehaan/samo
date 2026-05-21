import { ItemDetailListCellProps } from './types';
interface DefaultColumnProps extends ItemDetailListCellProps {
    columnId: string;
}
export declare const DefaultColumn: ({ columnId, song }: DefaultColumnProps) => string | import("react/jsx-runtime").JSX.Element;
export {};
