import { z } from 'zod';
export const FONT_OPTIONS = [
    { label: 'Inter', value: 'Inter' },
    { label: 'Poppins', value: 'Poppins' },
];
export const FontValueSchema = z.enum(FONT_OPTIONS.map((option) => option.value));
