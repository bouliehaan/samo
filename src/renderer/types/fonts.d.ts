import { z } from 'zod';
export type Font = {
    label: string;
    value: string;
};
export declare const FONT_OPTIONS: Font[];
export declare const FontValueSchema: z.ZodEnum<[string, ...string[]]>;
