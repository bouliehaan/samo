import { AppTheme } from '/@/shared/themes/app-theme-types';
export declare const THEME_DATA: {
    label: string;
    type: string;
    value: AppTheme;
}[];
export declare const useAppTheme: (overrideTheme?: AppTheme) => {
    mode: "dark" | "light";
    theme: {
        focusRing?: "never" | "auto" | "always" | undefined;
        scale?: number | undefined;
        fontSmoothing?: boolean | undefined;
        white?: string | undefined;
        black?: string | undefined;
        colors?: {
            [x: string & {}]: import("@mantine/core").MantineColorsTuple | undefined;
            dark?: import("@mantine/core").MantineColorsTuple | undefined;
            blue?: import("@mantine/core").MantineColorsTuple | undefined;
            cyan?: import("@mantine/core").MantineColorsTuple | undefined;
            gray?: import("@mantine/core").MantineColorsTuple | undefined;
            green?: import("@mantine/core").MantineColorsTuple | undefined;
            indigo?: import("@mantine/core").MantineColorsTuple | undefined;
            lime?: import("@mantine/core").MantineColorsTuple | undefined;
            orange?: import("@mantine/core").MantineColorsTuple | undefined;
            pink?: import("@mantine/core").MantineColorsTuple | undefined;
            red?: import("@mantine/core").MantineColorsTuple | undefined;
            teal?: import("@mantine/core").MantineColorsTuple | undefined;
            violet?: import("@mantine/core").MantineColorsTuple | undefined;
            yellow?: import("@mantine/core").MantineColorsTuple | undefined;
            grape?: import("@mantine/core").MantineColorsTuple | undefined;
        } | undefined;
        primaryShade?: import("@mantine/core").MantineColorShade | {
            light?: import("@mantine/core").MantineColorShade | undefined;
            dark?: import("@mantine/core").MantineColorShade | undefined;
        } | undefined;
        primaryColor?: string | undefined;
        variantColorResolver?: import("@mantine/core").VariantColorsResolver | undefined;
        autoContrast?: boolean | undefined;
        luminanceThreshold?: number | undefined;
        fontFamily?: string | undefined;
        fontFamilyMonospace?: string | undefined;
        headings?: {
            fontFamily?: string | undefined;
            fontWeight?: string | undefined;
            textWrap?: "balance" | "nowrap" | "wrap" | "stable" | "pretty" | undefined;
            sizes?: {
                h1?: {
                    fontSize?: string | undefined;
                    fontWeight?: string | undefined;
                    lineHeight?: string | undefined;
                } | undefined;
                h2?: {
                    fontSize?: string | undefined;
                    fontWeight?: string | undefined;
                    lineHeight?: string | undefined;
                } | undefined;
                h3?: {
                    fontSize?: string | undefined;
                    fontWeight?: string | undefined;
                    lineHeight?: string | undefined;
                } | undefined;
                h4?: {
                    fontSize?: string | undefined;
                    fontWeight?: string | undefined;
                    lineHeight?: string | undefined;
                } | undefined;
                h5?: {
                    fontSize?: string | undefined;
                    fontWeight?: string | undefined;
                    lineHeight?: string | undefined;
                } | undefined;
                h6?: {
                    fontSize?: string | undefined;
                    fontWeight?: string | undefined;
                    lineHeight?: string | undefined;
                } | undefined;
            } | undefined;
        } | undefined;
        radius?: {
            [x: string & {}]: string | undefined;
            lg?: string | undefined;
            md?: string | undefined;
            sm?: string | undefined;
            xl?: string | undefined;
            xs?: string | undefined;
        } | undefined;
        defaultRadius?: import("@mantine/core").MantineRadius | undefined;
        spacing?: {
            [x: number]: string | undefined;
            [x: string & {}]: string | undefined;
            lg?: string | undefined;
            md?: string | undefined;
            sm?: string | undefined;
            xl?: string | undefined;
            xs?: string | undefined;
        } | undefined;
        fontSizes?: {
            [x: string & {}]: string | undefined;
            lg?: string | undefined;
            md?: string | undefined;
            sm?: string | undefined;
            xl?: string | undefined;
            xs?: string | undefined;
        } | undefined;
        lineHeights?: {
            [x: string & {}]: string | undefined;
            lg?: string | undefined;
            md?: string | undefined;
            sm?: string | undefined;
            xl?: string | undefined;
            xs?: string | undefined;
        } | undefined;
        breakpoints?: {
            [x: string & {}]: string | undefined;
            lg?: string | undefined;
            md?: string | undefined;
            sm?: string | undefined;
            xl?: string | undefined;
            xs?: string | undefined;
        } | undefined;
        shadows?: {
            [x: string & {}]: string | undefined;
            lg?: string | undefined;
            md?: string | undefined;
            sm?: string | undefined;
            xl?: string | undefined;
            xs?: string | undefined;
        } | undefined;
        respectReducedMotion?: boolean | undefined;
        cursorType?: "default" | "pointer" | undefined;
        defaultGradient?: {
            from?: string | undefined;
            to?: string | undefined;
            deg?: number | undefined;
        } | undefined;
        activeClassName?: string | undefined;
        focusClassName?: string | undefined;
        components?: {
            [x: string]: {
                classNames?: any;
                styles?: any;
                vars?: any;
                defaultProps?: any;
            } | undefined;
        } | undefined;
        other?: {
            [x: string]: any;
        } | undefined;
    };
};
export declare const useSetColorScheme: () => {
    setColorScheme: (value: import("@mantine/core").MantineColorScheme) => void;
};
export declare const useColorScheme: () => "dark" | "light";
export declare const useAppThemeColors: () => {
    color: {
        [k: string]: string;
    };
    theme: {
        [k: string]: string;
    };
};
