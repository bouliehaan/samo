import { RandomSongListQuery } from '/@/shared/types/domain-types';
interface ShuffleAllSlice extends RandomSongListQuery {
    actions: {
        setStore: (data: Partial<ShuffleAllSlice>) => void;
    };
    enableMaxYear: boolean;
    enableMinYear: boolean;
}
export declare const useShuffleAllStoreActions: () => {
    setStore: (data: Partial<ShuffleAllSlice>) => void;
};
export declare const ShuffleAllContextModal: () => import("react/jsx-runtime").JSX.Element;
export declare const openShuffleAllModal: () => Promise<void>;
export {};
