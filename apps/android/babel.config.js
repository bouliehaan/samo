// Worklets runs in BUNDLE MODE, and that is why the plugin is attached by hand
// here instead of being left to `babel-preset-expo`.
//
// Default (non-bundle) mode ships every worklet to the UI runtime as a SOURCE
// STRING and `eval`s it there once per worklet hash, caching the result for the
// life of the process (react-native-worklets/src/memory/valueUnpacker.native.ts).
// Each `eval` makes Hermes build a compiler Context, and that Context owns the
// arena the compiled bytecode's strings point into — so it is never freed. Its
// allocator's slab is 256KB and even a trivial worklet takes several. Measured
// on the V60: 647 live 256KB arenas holding ~1-3KB each = ~168MB, about a
// quarter of the app's entire PSS, growing permanently with every new animated
// surface visited. Bundle mode emits worklets as real modules instead
// (`require('react-native-worklets/.worklets/<hash>.js')`), so the UI runtime
// loads them from the same precompiled bytecode and nothing is ever `eval`d.
//
// `babel-preset-expo` auto-attaches `react-native-worklets/plugin` with NO
// options, so `bundleMode` cannot be passed through it — the auto-attach has to
// be switched off and the plugin listed here. Two traps:
//   - BOTH `worklets: false` and `reanimated: false` are required. The preset
//     gates on `worklets !== false && reanimated !== false` and its `else if`
//     falls through to the legacy `react-native-reanimated/plugin`, so turning
//     off only `worklets` silently swaps in the wrong plugin.
//   - Attaching the plugin here while the preset still auto-attaches runs it
//     TWICE and breaks module bootstrap with "TypeError: property is not
//     writable" on first launch. That is what the flags above prevent; do not
//     add the plugin without also disabling both.
//
// Metro needs the matching half — see `getBundleModeMetroConfig` in metro.config.js.
module.exports = function (api) {
    api.cache(true);
    return {
        plugins: [['react-native-worklets/plugin', { bundleMode: true }]],
        presets: [['babel-preset-expo', { reanimated: false, worklets: false }]],
    };
};
