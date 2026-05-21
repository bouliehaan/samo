import { AppRoute } from '/@/renderer/router/routes';
import { SavedCollection } from '/@/shared/types/domain-types';
export declare const getCollectionTo: (collection: SavedCollection) => {
    pathname: AppRoute;
    search: string;
};
export declare const SidebarCollectionList: () => import("react/jsx-runtime").JSX.Element | null;
