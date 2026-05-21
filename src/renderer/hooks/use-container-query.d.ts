interface UseContainerQueryProps {
    '2xl'?: number;
    '3xl'?: number;
    '4xl'?: number;
    '5xl'?: number;
    lg?: number;
    md?: number;
    sm?: number;
    xl?: number;
    xs?: number;
}
export declare const useContainerQuery: (props?: UseContainerQueryProps) => {
    height: number;
    is2xl: boolean;
    is3xl: boolean;
    is4xl: boolean;
    is5xl: boolean;
    isCalculated: boolean;
    isLg: boolean;
    isMd: boolean;
    isSm: boolean;
    isXl: boolean;
    isXs: boolean;
    ref: import("react").RefObject<any>;
    width: number;
};
export {};
