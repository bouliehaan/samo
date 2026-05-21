import { useSuspenseQuery } from '@tanstack/react-query';
import { Folder } from '/@/shared/types/domain-types';
export declare const FolderListContent: () => import("react/jsx-runtime").JSX.Element;
export declare const FolderListInnerContent: () => import("react/jsx-runtime").JSX.Element;
interface FolderListViewProps {
    folderQuery: ReturnType<typeof useSuspenseQuery<Folder>>;
}
export declare const FolderListView: ({ folderQuery }: FolderListViewProps) => import("react/jsx-runtime").JSX.Element | null;
export {};
