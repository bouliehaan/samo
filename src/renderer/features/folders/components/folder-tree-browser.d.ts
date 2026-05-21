import { type UseQueryResult } from '@tanstack/react-query';
import { Folder } from '/@/shared/types/domain-types';
interface FolderTreeBrowserProps {
    fetchFolder: (folderId: string) => Promise<Folder>;
    rootFolderQuery: UseQueryResult<Folder, Error>;
}
export declare const FolderTreeBrowser: ({ fetchFolder, rootFolderQuery }: FolderTreeBrowserProps) => import("react/jsx-runtime").JSX.Element;
export {};
