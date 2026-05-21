interface LibraryBackgroundOverlayProps {
    backgroundColor?: string;
    headerRef: React.RefObject<HTMLDivElement | null>;
    opacity?: number;
}
export declare const LibraryBackgroundOverlay: ({ backgroundColor, headerRef, opacity, }: LibraryBackgroundOverlayProps) => import("react/jsx-runtime").JSX.Element;
interface BackgroundOverlayProps {
    backgroundColor?: string;
    direction?: string;
    height?: number | string;
    opacity?: number;
}
export declare const BackgroundOverlay: ({ backgroundColor, direction, height, opacity, }: BackgroundOverlayProps) => import("react/jsx-runtime").JSX.Element;
interface LibraryBackgroundProps {
    blur?: number;
    headerRef: React.RefObject<HTMLDivElement | null>;
    imageUrl: null | string;
}
export declare const LibraryBackgroundImage: ({ blur, headerRef, imageUrl }: LibraryBackgroundProps) => import("react/jsx-runtime").JSX.Element;
export {};
