import react from '@vitejs/plugin-react';
/** React Compiler is enabled for all renderer builds (F7). Manual useMemo/useCallback are redundant unless wrapping expensive work or cross-boundary object identity. */
export function createReactPlugin() {
    return react({
        babel: {
            plugins: ['babel-plugin-react-compiler'],
        },
    });
}
