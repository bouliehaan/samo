/* eslint-disable @typescript-eslint/no-require-imports */
// babel-preset-expo auto-attaches `react-native-worklets/plugin` when
// react-native-worklets is installed alongside react-native-reanimated. Adding
// it here manually would run the plugin twice and break module bootstrap with
// "TypeError: property is not writable" on first launch.
module.exports = function (api) {
    api.cache(true);
    return {
        presets: ['babel-preset-expo'],
    };
};
