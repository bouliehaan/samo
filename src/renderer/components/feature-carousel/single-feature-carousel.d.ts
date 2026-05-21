import { Album } from '/@/shared/types/domain-types';
interface SingleFeatureCarouselProps {
    data: Album[] | undefined;
    onNearEnd?: () => void;
}
export declare const SingleFeatureCarousel: ({ data, onNearEnd }: SingleFeatureCarouselProps) => import("react/jsx-runtime").JSX.Element | null;
export {};
