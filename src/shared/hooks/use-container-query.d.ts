interface UseContainerQueryProps {
    '2xl'?: number;
    '3xl'?: number;
    lg?: number;
    md?: number;
    sm?: number;
    xl?: number;
}
export declare const useContainerQuery: (props?: UseContainerQueryProps) => {
    height: number;
    is2xl: boolean;
    is3xl: boolean;
    isLg: boolean;
    isMd: boolean;
    isSm: boolean;
    isXl: boolean;
    isXs: boolean;
    ref: import("react").RefObject<any>;
    width: number;
};
export {};
