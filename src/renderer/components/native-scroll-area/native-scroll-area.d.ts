import { CSSProperties, ReactNode } from 'react';
import { PageHeaderProps } from '/@/renderer/components/page-header/page-header';
interface NativeScrollAreaProps {
    children: ReactNode;
    debugScrollPosition?: boolean;
    noHeader?: boolean;
    pageHeaderProps?: PageHeaderProps & {
        offset: number;
        target?: any;
    };
    scrollBarOffset?: string;
    scrollHideDelay?: number;
    style?: CSSProperties;
}
export declare const NativeScrollArea: import("react").NamedExoticComponent<NativeScrollAreaProps & import("react").RefAttributes<HTMLDivElement>>;
export {};
