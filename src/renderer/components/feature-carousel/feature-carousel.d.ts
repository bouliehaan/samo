import { Album } from '/@/shared/types/domain-types';
interface FeatureCarouselProps {
    data: Album[] | undefined;
    onNearEnd?: () => void;
}
export declare const FeatureCarousel: ({ data, onNearEnd }: FeatureCarouselProps) => import("react/jsx-runtime").JSX.Element | null;
export {};
